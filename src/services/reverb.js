
import { getToken } from "../storage/token";
import { playNewMessageSound } from "./sound";
import { API_URL } from "../constants/config";

// =====================================================
// CONFIG
// =====================================================

const REVERB_HOST =
  process.env.EXPO_PUBLIC_REVERB_HOST || "192.168.110.124";

const REVERB_PORT = Number(
  process.env.EXPO_PUBLIC_REVERB_PORT || 8080
);

const REVERB_APP_KEY =
  process.env.EXPO_PUBLIC_REVERB_APP_KEY ||
  "stobweevbd4exnufy5dr";

const RECONNECT_BASE_DELAY = 2000;
const RECONNECT_MAX_DELAY = 15000;
const AUTH_TIMEOUT = 10000;

// API_URL خاصها تكون بحال:
// http://192.168.110.124:8000/api
const BROADCAST_AUTH_URL =
  `${API_URL.replace(/\/+$/, "")}/broadcasting/auth`;

// =====================================================
// SOCKET STATE
// =====================================================

let socket = null;
let socketId = null;
let currentUserId = null;

let shouldReconnect = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let connectGeneration = 0;

let notificationCallback = null;
let notificationSubscribed = false;

// =====================================================
// CHANNEL STATE
// =====================================================

const conversationCallbacks = new Map();
const subscribedConversations = new Map();
const pendingSubscriptions = new Map();

const notificationChannel = (userId) =>
  `private-App.Models.User.${userId}`;

const conversationChannel = (conversationId) =>
  `private-conversation.${conversationId}`;

// =====================================================
// HELPERS
// =====================================================

const isSocketOpen = (ws = socket) =>
  Boolean(
    ws &&
      ws.readyState === WebSocket.OPEN
  );

const parseData = (data) => {
  if (typeof data !== "string") {
    return data;
  }

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

const send = (payload, ws = socket) => {
  if (!isSocketOpen(ws)) {
    console.log("⚠️ Reverb socket is not open");
    return false;
  }

  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.log(
      "❌ Reverb send failed:",
      error?.message || error
    );
    return false;
  }
};

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const resetChannelState = () => {
  subscribedConversations.clear();
  pendingSubscriptions.clear();
  notificationSubscribed = false;
};

const isCurrentSocket = (ws, generation) =>
  socket === ws &&
  connectGeneration === generation;

// =====================================================
// CHANNEL AUTHENTICATION
// =====================================================

const authenticateChannel = async (
  channelName,
  ws = socket,
  expectedSocketId = socketId,
  generation = connectGeneration
) => {
  const key = `${expectedSocketId}:${channelName}`;

  if (pendingSubscriptions.has(key)) {
    return pendingSubscriptions.get(key);
  }

  const authPromise = (async () => {
    try {
      if (
        !expectedSocketId ||
        !isSocketOpen(ws) ||
        !isCurrentSocket(ws, generation)
      ) {
        console.log(
          "⏳ Cannot authenticate channel; socket is not ready:",
          channelName
        );
        return false;
      }

      const token = await getToken();

      if (!token) {
        console.log(
          "❌ No token available for channel auth"
        );
        return false;
      }

      // Token retrieval might have taken time.
      if (
        !isCurrentSocket(ws, generation) ||
        !isSocketOpen(ws) ||
        expectedSocketId !== socketId
      ) {
        return false;
      }

      console.log("🔐 Channel auth:", channelName);
      console.log("🌐 Auth URL:", BROADCAST_AUTH_URL);

      const controller =
        typeof AbortController !== "undefined"
          ? new AbortController()
          : null;

      const timeout = controller
        ? setTimeout(
            () => controller.abort(),
            AUTH_TIMEOUT
          )
        : null;

      let response;

      try {
        response = await fetch(
          BROADCAST_AUTH_URL,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              socket_id: expectedSocketId,
              channel_name: channelName,
            }),
            ...(controller
              ? { signal: controller.signal }
              : {}),
          }
        );
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }

      const responseText = await response.text();

      console.log(
        "🔐 Auth HTTP status:",
        response.status,
        channelName
      );

      if (!response.ok) {
        console.log(
          "❌ Channel auth rejected:",
          responseText
        );
        return false;
      }

      const authResponse = parseData(responseText);

      if (
        !authResponse ||
        typeof authResponse.auth !== "string"
      ) {
        console.log(
          "❌ Invalid broadcasting auth response:",
          responseText
        );
        return false;
      }

      // Do not send a stale subscription if the socket
      // disconnected while HTTP auth was in progress.
      if (
        !isCurrentSocket(ws, generation) ||
        !isSocketOpen(ws) ||
        expectedSocketId !== socketId
      ) {
        return false;
      }

      const sent = send(
        {
          event: "pusher:subscribe",
          data: {
            auth: authResponse.auth,
            channel: channelName,
          },
        },
        ws
      );

      if (!sent) {
        return false;
      }

      console.log(
        "📡 Subscribe request sent:",
        channelName
      );

      return true;
    } catch (error) {
      console.log(
        "❌ Channel auth error:",
        channelName,
        error?.name === "AbortError"
          ? "Authentication request timed out"
          : error?.message || error
      );

      return false;
    }
  })();

  pendingSubscriptions.set(key, authPromise);

  try {
    return await authPromise;
  } finally {
    if (pendingSubscriptions.get(key) === authPromise) {
      pendingSubscriptions.delete(key);
    }
  }
};

// =====================================================
// SUBSCRIBE HELPERS
// =====================================================

const subscribeToNotifications = async (
  ws = socket,
  generation = connectGeneration
) => {
  if (!currentUserId) {
    return false;
  }

  if (notificationSubscribed) {
    return true;
  }

  const channel = notificationChannel(currentUserId);

  const success = await authenticateChannel(
    channel,
    ws,
    socketId,
    generation
  );

  if (
    success &&
    isCurrentSocket(ws, generation)
  ) {
    // This means the subscribe request was sent.
    // The actual subscription is confirmed by the
    // pusher_internal:subscription_succeeded event.
    return true;
  }

  return false;
};

const restoreConversationSubscriptions = async (
  ws = socket,
  generation = connectGeneration
) => {
  const ids = Array.from(
    conversationCallbacks.keys()
  );

  for (const id of ids) {
    if (
      !isCurrentSocket(ws, generation) ||
      !isSocketOpen(ws)
    ) {
      return;
    }

    const channel = conversationChannel(id);

    const success = await authenticateChannel(
      channel,
      ws,
      socketId,
      generation
    );

    if (
      success &&
      isCurrentSocket(ws, generation)
    ) {
      console.log(
        "📡 Conversation subscription requested:",
        channel
      );
    }
  }
};

// =====================================================
// SUBSCRIBE TO CONVERSATION
// =====================================================

export const subscribeToConversation = async (
  conversationId,
  callback
) => {
  if (
    conversationId === null ||
    conversationId === undefined ||
    String(conversationId).trim() === ""
  ) {
    console.log("⚠️ Invalid conversation ID");
    return false;
  }

  if (typeof callback !== "function") {
    console.log(
      "⚠️ Conversation callback must be a function"
    );
    return false;
  }

  const id = String(conversationId);

  // Always use the latest screen callback.
  conversationCallbacks.set(id, callback);

  const channel = conversationChannel(id);

  if (subscribedConversations.has(id)) {
    console.log(
      "✅ Already subscribed:",
      channel
    );
    return true;
  }

  if (
    !isSocketOpen() ||
    !socketId
  ) {
    console.log(
      "⏳ Conversation queued until Reverb is ready:",
      channel
    );
    return false;
  }

  const success = await authenticateChannel(channel);

  if (success) {
    // This records the request, not the server's
    // confirmation. Confirmation comes from the event.
    console.log(
      "📡 Conversation subscribe request sent:",
      channel
    );
  }

  return success;
};

// =====================================================
// UNSUBSCRIBE FROM CONVERSATION
// =====================================================

export const unsubscribeFromConversation = (
  conversationId
) => {
  if (
    conversationId === null ||
    conversationId === undefined
  ) {
    return;
  }

  const id = String(conversationId);
  const channel = conversationChannel(id);

  if (
    isSocketOpen() &&
    subscribedConversations.has(id)
  ) {
    send({
      event: "pusher:unsubscribe",
      data: { channel },
    });
  }

  conversationCallbacks.delete(id);
  subscribedConversations.delete(id);

  console.log(
    "🚪 Conversation unsubscribed:",
    channel
  );
};

// =====================================================
// RECONNECT
// =====================================================

const scheduleReconnect = () => {
  if (
    !shouldReconnect ||
    reconnectTimer ||
    !currentUserId
  ) {
    return;
  }

  reconnectAttempts += 1;

  const exponentialDelay =
    RECONNECT_BASE_DELAY *
    Math.pow(2, reconnectAttempts - 1);

  const delay = Math.min(
    exponentialDelay,
    RECONNECT_MAX_DELAY
  );

  console.log(
    `🔄 Reverb reconnect scheduled in ${delay}ms`
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (shouldReconnect && currentUserId) {
      connectReverb(
        currentUserId,
        notificationCallback
      );
    }
  }, delay);
};

// =====================================================
// CONNECT
// =====================================================

export const connectReverb = async (
  userId,
  onNotification
) => {
  if (
    userId === null ||
    userId === undefined ||
    String(userId).trim() === ""
  ) {
    console.log("⚠️ Cannot connect without user ID");
    return;
  }

  currentUserId = String(userId);
  notificationCallback =
    typeof onNotification === "function"
      ? onNotification
      : notificationCallback;

  shouldReconnect = true;

  if (
    socket &&
    (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    )
  ) {
    console.log(
      "✅ Reverb socket already active"
    );
    return;
  }

  clearReconnectTimer();

  const generation = ++connectGeneration;

  let token;

  try {
    token = await getToken();
  } catch (error) {
    console.log(
      "❌ Failed to read auth token:",
      error?.message || error
    );
    scheduleReconnect();
    return;
  }

  if (!shouldReconnect || generation !== connectGeneration) {
    return;
  }

  if (!token) {
    console.log(
      "❌ No auth token; Reverb connection cancelled"
    );
    return;
  }

  resetChannelState();
  socketId = null;

  const url =
    `ws://${REVERB_HOST}:${REVERB_PORT}/app/${REVERB_APP_KEY}` +
    `?protocol=7&client=js&version=8.4.0&flash=false`;

  console.log("🔌 Connecting to Reverb:", url);
  console.log("🌐 Broadcasting auth URL:", BROADCAST_AUTH_URL);

  let ws;

  try {
    ws = new WebSocket(url);
  } catch (error) {
    console.log(
      "❌ WebSocket creation failed:",
      error?.message || error
    );
    scheduleReconnect();
    return;
  }

  socket = ws;

  ws.onopen = () => {
    if (!isCurrentSocket(ws, generation)) {
      return;
    }

    console.log("✅ Reverb WebSocket connected");
  };

  ws.onmessage = async (event) => {
    if (!isCurrentSocket(ws, generation)) {
      return;
    }

    try {
      const payload = JSON.parse(event.data);

      const eventName = payload?.event;
      const channel = payload?.channel;
      const data = parseData(payload?.data);

      if (eventName === "pusher:connection_established") {
        socketId = data?.socket_id;

        if (!socketId) {
          console.log(
            "❌ Connection established without socket ID"
          );
          return;
        }

        reconnectAttempts = 0;

        console.log("✅ Reverb socket ID:", socketId);

        // Authenticated user notification channel.
        await subscribeToNotifications(ws, generation);

        // Restore any conversations registered by screens.
        await restoreConversationSubscriptions(
          ws,
          generation
        );

        return;
      }

      if (eventName === "pusher:ping") {
        send(
          {
            event: "pusher:pong",
            data: {},
          },
          ws
        );
        return;
      }

      if (
        eventName ===
        "pusher_internal:subscription_succeeded"
      ) {
        if (channel === notificationChannel(currentUserId)) {
          notificationSubscribed = true;
          console.log(
            "✅ Notifications channel subscribed:",
            channel
          );
        }

        const match = channel?.match(
          /^private-conversation\.(\d+)$/
        );

        if (match) {
          subscribedConversations.set(match[1], channel);
          console.log(
            "✅ Conversation channel subscribed:",
            channel
          );
        }

        return;
      }

      if (
        eventName ===
        "pusher_internal:subscription_count"
      ) {
        return;
      }

      if (eventName === "pusher:error") {
        console.log("❌ Reverb protocol error:", data);
        return;
      }

      // -------------------------------------------------
      // CHAT MESSAGE
      // -------------------------------------------------

      if (eventName === "message.sent") {
        console.log("🔥 message.sent received:", channel);

        const match = channel?.match(
          /^private-conversation\.(\d+)$/
        );

        if (!match) {
          console.log(
            "⚠️ message.sent arrived on unexpected channel:",
            channel
          );
          return;
        }

        const conversationId = match[1];
        const message = data?.message ?? data;

        if (!message || typeof message !== "object") {
          console.log(
            "⚠️ message.sent payload does not contain a message object"
          );
          return;
        }

        const senderId =
          message.sender_id ??
          message.sender?.id ??
          message.user_id;

        const incoming =
          senderId !== null &&
          senderId !== undefined &&
          String(senderId) !== String(currentUserId);

        if (incoming) {
          console.log("🔊 Incoming message sound");
          try {
            Promise.resolve(
              playNewMessageSound()
            ).catch((error) => {
              console.log(
                "⚠️ Message sound failed:",
                error?.message || error
              );
            });
          } catch (error) {
            console.log(
              "⚠️ Message sound error:",
              error?.message || error
            );
          }
        }

        const callback =
          conversationCallbacks.get(conversationId);

        if (typeof callback === "function") {
          callback(data);
        } else {
          console.log(
            "ℹ️ No active callback for conversation:",
            conversationId
          );
        }

        return;
      }

      // -------------------------------------------------
      // BROADCAST NOTIFICATIONS
      // -------------------------------------------------

      const isBroadcastNotification =
        eventName ===
          "Illuminate\\Notifications\\Events\\BroadcastNotificationCreated" ||
        eventName ===
          "Illuminate\\Notifications\\Events\\BroadcastNotificationCreated ";

      if (isBroadcastNotification) {
        console.log(
          "❤️ Broadcast notification received:",
          data
        );

        if (typeof notificationCallback === "function") {
          notificationCallback(data);
        }

        return;
      }

      // Helpful diagnostics for unexpected events.
      if (eventName && !eventName.startsWith("pusher:")) {
        console.log(
          "ℹ️ Reverb event:",
          eventName,
          channel || ""
        );
      }
    } catch (error) {
      console.log(
        "❌ Reverb message handler error:",
        error?.message || error
      );
    }
  };

  ws.onerror = (error) => {
    if (!isCurrentSocket(ws, generation)) {
      return;
    }

    console.log("❌ Reverb WebSocket error:", error);
  };

  ws.onclose = (event) => {
    console.log(
      "🔌 Reverb WebSocket closed:",
      event?.code,
      event?.reason || ""
    );

    if (!isCurrentSocket(ws, generation)) {
      return;
    }

    socket = null;
    socketId = null;

    resetChannelState();

    scheduleReconnect();
  };
};

// =====================================================
// DISCONNECT
// =====================================================

export const disconnectReverb = () => {
  shouldReconnect = false;

  clearReconnectTimer();

  // Invalidate pending connection callbacks.
  connectGeneration += 1;

  socketId = null;
  currentUserId = null;
  notificationCallback = null;

  conversationCallbacks.clear();
  resetChannelState();

  const oldSocket = socket;
  socket = null;

  if (oldSocket) {
    oldSocket.onopen = null;
    oldSocket.onmessage = null;
    oldSocket.onerror = null;
    oldSocket.onclose = null;

    try {
      oldSocket.close();
    } catch (error) {
      console.log(
        "⚠️ Error closing Reverb socket:",
        error?.message || error
      );
    }
  }

  console.log("✅ Reverb disconnected");
};

// =====================================================
// GETTERS
// =====================================================

export const getReverbSocketId = () => socketId;

export const isReverbConnected = () =>
  isSocketOpen();

export const getSubscribedConversations = () =>
  Array.from(subscribedConversations.keys());
