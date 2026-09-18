
import { getToken } from "../storage/token";
import { playNewMessageSound } from "./sound";

const REVERB_HOST = "192.168.8.5";
const REVERB_PORT = 8080;
const REVERB_APP_KEY = "stobweevbd4exnufy5dr";

const API_URL = "http://192.168.8.5:8000";

// =====================================================
// SOCKET STATE
// =====================================================

let socket = null;
let socketId = null;

let currentUserId = null;

let shouldReconnect = false;
let reconnectTimer = null;
let reconnectAttempts = 0;

let notificationCallback = null;

// =====================================================
// CHANNEL STATE
// =====================================================

const conversationCallbacks = new Map();
const subscribedConversations = new Map();

const notificationChannel = (userId) =>
  `private-App.Models.User.${userId}`;

const conversationChannel = (conversationId) =>
  `private-conversation.${conversationId}`;

// =====================================================
// HELPERS
// =====================================================

const parseData = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

const send = (payload) => {
  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {
    console.log(
      "⚠️ Reverb socket is not ready"
    );

    return false;
  }

  socket.send(
    JSON.stringify(payload)
  );

  return true;
};

// =====================================================
// CHANNEL AUTH
// =====================================================

const authenticateChannel = async (
  channelName
) => {
  try {
    const token = await getToken();

    if (!token) {
      console.log(
        "❌ No token for channel auth"
      );

      return false;
    }

    if (!socketId) {
      console.log(
        "❌ No socket ID for channel auth"
      );

      return false;
    }

    console.log(
      "🔐 Authenticating:",
      channelName
    );

    const response = await fetch(
      `${API_URL}/broadcasting/auth`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          socket_id: socketId,
          channel_name: channelName,
        }),
      }
    );

    const text = await response.text();

    console.log(
      "🔐 Auth status:",
      response.status,
      channelName
    );

    console.log(
      "🔐 Auth response:",
      text
    );

    if (!response.ok) {
      return false;
    }

    const auth = parseData(text);

    if (!auth?.auth) {
      console.log(
        "❌ Auth response has no auth"
      );

      return false;
    }

    const sent = send({
      event: "pusher:subscribe",

      data: {
        auth: auth.auth,
        channel: channelName,
      },
    });

    if (!sent) {
      console.log(
        "❌ Failed to send subscription:",
        channelName
      );

      return false;
    }

    console.log(
      "📡 Subscribe sent:",
      channelName
    );

    return true;
  } catch (error) {
    console.log(
      "❌ Channel auth error:",
      error?.message || error
    );

    return false;
  }
};

// =====================================================
// SUBSCRIBE CONVERSATION
// =====================================================

export const subscribeToConversation = async (
  conversationId,
  callback
) => {
  if (!conversationId) {
    return false;
  }

  if (typeof callback !== "function") {
    return false;
  }

  const id = String(conversationId);

  // Always keep the newest callback
  conversationCallbacks.set(
    id,
    callback
  );

  const channel = conversationChannel(id);

  // Already subscribed
  if (subscribedConversations.has(id)) {
    console.log(
      "✅ Already subscribed:",
      channel
    );

    return true;
  }

  // Socket not ready yet
  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN ||
    !socketId
  ) {
    console.log(
      "⏳ Waiting for Reverb before subscribing:",
      channel
    );

    return false;
  }

  const success =
    await authenticateChannel(channel);

  if (success) {
    subscribedConversations.set(
      id,
      channel
    );
  }

  return success;
};

// =====================================================
// UNSUBSCRIBE CONVERSATION
// =====================================================

export const unsubscribeFromConversation = (
  conversationId
) => {
  if (!conversationId) {
    return;
  }

  const id = String(conversationId);

  const channel =
    subscribedConversations.get(id);

  if (
    channel &&
    socket?.readyState === WebSocket.OPEN
  ) {
    send({
      event: "pusher:unsubscribe",

      data: {
        channel,
      },
    });
  }

  subscribedConversations.delete(id);
  conversationCallbacks.delete(id);

  console.log(
    "🚪 Conversation unsubscribed:",
    channel
  );
};

// =====================================================
// RECONNECT
// =====================================================

const reconnect = () => {
  if (!shouldReconnect) {
    return;
  }

  if (reconnectTimer) {
    return;
  }

  reconnectAttempts += 1;

  const delay = Math.min(
    3000 * reconnectAttempts,
    15000
  );

  console.log(
    `🔄 Reconnect in ${delay}ms`
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (
      shouldReconnect &&
      currentUserId
    ) {
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
  if (!userId) {
    return;
  }

  currentUserId = String(userId);

  notificationCallback =
    onNotification;

  shouldReconnect = true;

  // ===================================================
  // IMPORTANT:
  // Do NOT create another socket while the existing
  // socket is OPEN or CONNECTING.
  // ===================================================

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

  const token = await getToken();

  if (!token) {
    console.log(
      "❌ No auth token"
    );

    return;
  }

  const url =
    `ws://${REVERB_HOST}:${REVERB_PORT}/app/${REVERB_APP_KEY}`;

  console.log(
    "🔌 Connecting:",
    url
  );

  const ws = new WebSocket(url);

  socket = ws;

  ws.onopen = () => {
    reconnectAttempts = 0;

    console.log(
      "✅ Reverb connected"
    );
  };

  ws.onmessage = async (event) => {
    try {
      console.log(
        "📩 RAW REVERB:",
        event.data
      );

      const payload =
        JSON.parse(event.data);

      const eventName =
        payload.event;

      const channel =
        payload.channel;

      const data =
        parseData(payload.data);

      // =================================================
      // CONNECTION
      // =================================================

      if (
        eventName ===
        "pusher:connection_established"
      ) {
        socketId =
          data.socket_id;

        console.log(
          "✅ Socket ID:",
          socketId
        );

        // -----------------------------------------------
        // Notification channel
        // -----------------------------------------------

        await authenticateChannel(
          notificationChannel(
            currentUserId
          )
        );

        // -----------------------------------------------
        // Restore conversation channels
        // -----------------------------------------------

        const conversationIds =
          Array.from(
            conversationCallbacks.keys()
          );

        subscribedConversations.clear();

        for (
          const id of conversationIds
        ) {
          const success =
            await authenticateChannel(
              conversationChannel(id)
            );

          if (success) {
            subscribedConversations.set(
              id,
              conversationChannel(id)
            );
          }
        }

        return;
      }

      // =================================================
      // PING
      // =================================================

      if (
        eventName ===
        "pusher:ping"
      ) {
        send({
          event: "pusher:pong",
          data: {},
        });

        return;
      }

      // =================================================
      // SUBSCRIPTION
      // =================================================

      if (
        eventName ===
        "pusher_internal:subscription_succeeded"
      ) {
        console.log(
          "✅ CHANNEL SUBSCRIBED:",
          channel
        );

        return;
      }

      // =================================================
      // ERROR
      // =================================================

      if (
        eventName ===
        "pusher:error"
      ) {
        console.log(
          "❌ REVERB ERROR:",
          data
        );

        return;
      }

      // =================================================
      // CHAT MESSAGE
      // =================================================

      if (
        eventName ===
        "message.sent"
      ) {
        console.log(
          "🔥 MESSAGE.SENT:",
          data
        );

        if (!channel) {
          return;
        }

        const match =
          channel.match(
            /^private-conversation\.(\d+)$/
          );

        if (!match) {
          console.log(
            "⚠️ Invalid chat channel:",
            channel
          );

          return;
        }

        const conversationId =
          match[1];

        const message =
          data?.message;

        if (!message) {
          console.log(
            "⚠️ message.sent has no message"
          );

          return;
        }

        // ===============================================
        // 🔊 INCOMING MESSAGE SOUND
        // ===============================================

        const senderId =
          String(message.sender_id);

        const myUserId =
          String(currentUserId);

        const isIncomingMessage =
          senderId !== myUserId;

        console.log(
          "👤 Message sender:",
          senderId
        );

        console.log(
          "👤 Current user:",
          myUserId
        );

        console.log(
          "📥 Incoming message:",
          isIncomingMessage
        );

        if (isIncomingMessage) {
          console.log(
            "🔊 INCOMING MESSAGE → PLAY SOUND"
          );

          // Don't await.
          // Realtime callback should not be blocked
          // by audio playback.
          playNewMessageSound();
        } else {
          console.log(
            "🔇 Own message → NO SOUND"
          );
        }

        // ===============================================
        // SEND MESSAGE TO CHAT CALLBACK
        // ===============================================

        const callback =
          conversationCallbacks.get(
            conversationId
          );

        if (
          typeof callback ===
          "function"
        ) {
          callback(data);
        }

        return;
      }

      // =================================================
      // LIKE / OTHER NOTIFICATIONS
      // =================================================

      if (
        eventName ===
        "Illuminate\\Notifications\\Events\\BroadcastNotificationCreated"
      ) {
        console.log(
          "❤️ BROADCAST NOTIFICATION:",
          data
        );

        if (
          typeof notificationCallback ===
          "function"
        ) {
          notificationCallback(data);
        }

        return;
      }
    } catch (error) {
      console.log(
        "❌ Reverb parsing error:",
        error?.message || error
      );
    }
  };

  ws.onerror = (error) => {
    console.log(
      "❌ Reverb WebSocket error:",
      error
    );
  };

  ws.onclose = () => {
    console.log(
      "🔌 Reverb closed"
    );

    // Only clear global socket if this is
    // still the active socket.
    if (socket === ws) {
      socket = null;
      socketId = null;

      subscribedConversations.clear();
    }

    reconnect();
  };
};

// =====================================================
// DISCONNECT
// =====================================================

export const disconnectReverb = () => {
  shouldReconnect = false;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);

    reconnectTimer = null;
  }

  socketId = null;
  currentUserId = null;

  notificationCallback = null;

  conversationCallbacks.clear();
  subscribedConversations.clear();

  if (socket) {
    try {
      socket.close();
    } catch {}
  }

  socket = null;

  console.log(
    "✅ Reverb disconnected"
  );
};

// =====================================================
// GETTERS
// =====================================================

export const getReverbSocketId = () => {
  return socketId;
};

export const isReverbConnected = () => {
  return (
    socket?.readyState ===
    WebSocket.OPEN
  );
};

export const getSubscribedConversations = () => {
  return Array.from(
    subscribedConversations.keys()
  );
};
