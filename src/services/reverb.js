import { getToken } from "../storage/token";

const REVERB_HOST = "192.168.8.5";
const REVERB_PORT = 8080;
const REVERB_APP_KEY = "stobweevbd4exnufy5dr";
const API_URL = "http://192.168.8.5:8000";

let socket = null;
let socketId = null;
let currentUserId = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let shouldReconnect = false;

let notificationCallback = null;

// conversationId => callback
const conversationCallbacks = new Map();

// conversationId => channel name
const subscribedConversations = new Map();

// --------------------------------------------------
// CHANNELS
// --------------------------------------------------

const getNotificationChannel = (userId) =>
  `private-App.Models.User.${userId}`;

const getConversationChannel = (conversationId) =>
  `private-conversation.${conversationId}`;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const send = (payload) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.log("⚠️ WebSocket not ready");
    return false;
  }

  socket.send(JSON.stringify(payload));
  return true;
};

// --------------------------------------------------
// AUTH PRIVATE CHANNEL
// --------------------------------------------------

const authenticateChannel = async (channelName) => {
  try {
    const token = await getToken();

    if (!token) {
      console.log("❌ No auth token for channel:", channelName);
      return false;
    }

    if (!socketId) {
      console.log("❌ No socket ID for channel:", channelName);
      return false;
    }

    console.log("🔐 Authenticating channel:", channelName);

    const response = await fetch(`${API_URL}/broadcasting/auth`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        socket_id: socketId,
        channel_name: channelName,
      }),
    });

    console.log(
      "🔐 Broadcast auth status:",
      response.status,
      channelName
    );

    const text = await response.text();

    console.log(
      "🔐 Broadcast auth response:",
      text
    );

    if (!response.ok) {
      console.log(
        "❌ Broadcast authentication failed:",
        channelName
      );

      return false;
    }

    const authData = safeJsonParse(text);

    send({
      event: "pusher:subscribe",
      data: {
        auth: authData.auth,
        channel: channelName,
      },
    });

    console.log(
      "📡 Subscription request sent:",
      channelName
    );

    return true;
  } catch (error) {
    console.log(
      "❌ Channel authentication error:",
      channelName,
      error
    );

    return false;
  }
};

// --------------------------------------------------
// NOTIFICATION
// --------------------------------------------------

const emitNotification = (data) => {
  if (typeof notificationCallback === "function") {
    try {
      notificationCallback(data);
    } catch (error) {
      console.log("❌ Notification callback error:", error);
    }
  }
};

// --------------------------------------------------
// CHAT
// --------------------------------------------------

const emitConversationMessage = (conversationId, data) => {
  const callback = conversationCallbacks.get(
    String(conversationId)
  );

  if (!callback) {
    console.log(
      "⚠️ No chat callback for conversation:",
      conversationId
    );
    return;
  }

  try {
    callback(data);
  } catch (error) {
    console.log("❌ Chat callback error:", error);
  }
};

// --------------------------------------------------
// SUBSCRIBE CHAT
// --------------------------------------------------

export const subscribeToConversation = async (
  conversationId,
  onMessage
) => {
  if (!conversationId) {
    console.log("❌ Invalid conversation ID");
    return false;
  }

  const id = String(conversationId);

  if (typeof onMessage !== "function") {
    console.log("❌ Chat callback is not a function");
    return false;
  }

  conversationCallbacks.set(id, onMessage);

  const channelName = getConversationChannel(id);

  // Already subscribed
  if (subscribedConversations.has(id)) {
    console.log(
      "✅ Already subscribed:",
      channelName
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
      "⏳ Chat subscription queued:",
      channelName
    );

    return false;
  }

  console.log(
    "💬 Subscribing to conversation:",
    channelName
  );

  const success = await authenticateChannel(channelName);

  if (success) {
    subscribedConversations.set(id, channelName);
  }

  return success;
};

// --------------------------------------------------
// UNSUBSCRIBE CHAT
// --------------------------------------------------

export const unsubscribeFromConversation = (
  conversationId
) => {
  if (!conversationId) return;

  const id = String(conversationId);

  const channelName =
    subscribedConversations.get(id);

  if (channelName && socket?.readyState === WebSocket.OPEN) {
    send({
      event: "pusher:unsubscribe",
      data: {
        channel: channelName,
      },
    });

    console.log(
      "📴 Unsubscribed:",
      channelName
    );
  }

  subscribedConversations.delete(id);
  conversationCallbacks.delete(id);
};

// --------------------------------------------------
// CONNECT
// --------------------------------------------------

export const connectReverb = async (
  userId,
  onNotification
) => {
  if (!userId) {
    console.log(
      "⚠️ connectReverb ignored: userId is missing"
    );

    return;
  }

  currentUserId = String(userId);
  notificationCallback = onNotification;

  shouldReconnect = true;

  // Already connected
  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {
    console.log(
      "✅ Reverb already connected for user:",
      currentUserId
    );

    return;
  }

  if (socket) {
    try {
      socket.close();
    } catch {}
  }

  const token = await getToken();

  if (!token) {
    console.log(
      "❌ Cannot connect Reverb: no token"
    );

    return;
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔌 Connecting Reverb...");
  console.log(
    `🌐 WebSocket: ws://${REVERB_HOST}:${REVERB_PORT}/app/${REVERB_APP_KEY}`
  );
  console.log(
    "📡 Notification Channel:",
    getNotificationChannel(currentUserId)
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");

  socket = new WebSocket(
    `ws://${REVERB_HOST}:${REVERB_PORT}/app/${REVERB_APP_KEY}`
  );

  socket.onopen = () => {
    reconnectAttempts = 0;

    console.log(
      "✅ Reverb WebSocket connected"
    );
  };

  socket.onmessage = async (event) => {
    try {
      console.log(
        "📩 RAW REVERB:",
        event.data
      );

      const payload = JSON.parse(event.data);

      const eventName = payload.event;
      const channel = payload.channel;
      const data = safeJsonParse(payload.data);

      console.log(
        "📩 REVERB EVENT:",
        eventName,
        data
      );

      // --------------------------------------------
      // CONNECTION
      // --------------------------------------------

      if (
        eventName ===
        "pusher:connection_established"
      ) {
        socketId = data.socket_id;

        console.log(
          "✅ CONNECTION ESTABLISHED:",
          data
        );

        // Notification channel
        const notificationChannel =
          getNotificationChannel(currentUserId);

        await authenticateChannel(
          notificationChannel
        );

        // Restore chat channels
        for (
          const conversationId of
          conversationCallbacks.keys()
        ) {
          const chatChannel =
            getConversationChannel(
              conversationId
            );

          console.log(
            "🔄 Restoring chat subscription:",
            chatChannel
          );

          const success =
            await authenticateChannel(
              chatChannel
            );

          if (success) {
            subscribedConversations.set(
              conversationId,
              chatChannel
            );
          }
        }

        return;
      }

      // --------------------------------------------
      // PING
      // --------------------------------------------

      if (eventName === "pusher:ping") {
        send({
          event: "pusher:pong",
          data: {},
        });

        console.log(
          "💓 Reverb ping → pong"
        );

        return;
      }

      // --------------------------------------------
      // SUBSCRIPTION SUCCESS
      // --------------------------------------------

      if (
        eventName ===
        "pusher_internal:subscription_succeeded"
      ) {
        console.log(
          "✅ PRIVATE CHANNEL SUBSCRIBED:",
          channel
        );

        return;
      }

      // --------------------------------------------
      // ERROR
      // --------------------------------------------

      if (eventName === "pusher:error") {
        console.log(
          "❌ Reverb Pusher error:",
          data
        );

        return;
      }

      // --------------------------------------------
      // CHAT MESSAGE
      // --------------------------------------------

      if (eventName === "message.sent") {
        console.log(
          "💬 MESSAGE.SENT RECEIVED:",
          data
        );

        if (!channel) {
          console.log(
            "⚠️ message.sent without channel"
          );

          return;
        }

        const match =
          channel.match(
            /^private-conversation\.(\d+)$/
          );

        if (!match) {
          console.log(
            "⚠️ Not a conversation channel:",
            channel
          );

          return;
        }

        const conversationId = match[1];

        emitConversationMessage(
          conversationId,
          data
        );

        return;
      }

      // --------------------------------------------
      // NOTIFICATIONS
      // --------------------------------------------

      if (
        eventName ===
        "Illuminate\\Notifications\\Events\\BroadcastNotificationCreated"
      ) {
        emitNotification(data);
        return;
      }

      // fallback notification events
      if (
        eventName?.includes("Notification")
      ) {
        emitNotification(data);
      }
    } catch (error) {
      console.log(
        "❌ Reverb message parsing error:",
        error
      );
    }
  };

  socket.onerror = (error) => {
    console.log(
      "❌ Reverb WebSocket error:",
      error
    );
  };

  socket.onclose = () => {
    console.log(
      "🔌 Reverb WebSocket closed"
    );

    socketId = null;

    subscribedConversations.clear();

    if (!shouldReconnect) {
      return;
    }

    if (reconnectTimer) {
      return;
    }

    reconnectAttempts++;

    const delay = Math.min(
      3000 * reconnectAttempts,
      15000
    );

    console.log(
      `🔄 Reconnecting in ${delay}ms...`
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
};

// --------------------------------------------------
// DISCONNECT
// --------------------------------------------------

export const disconnectReverb = () => {
  console.log(
    "🔌 Disconnecting Reverb..."
  );

  shouldReconnect = false;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  notificationCallback = null;
  currentUserId = null;
  socketId = null;

  conversationCallbacks.clear();
  subscribedConversations.clear();

  if (socket) {
    try {
      socket.close();
    } catch {}
  }

  socket = null;

  console.log(
    "✅ Reverb disconnected completely"
  );
};

// --------------------------------------------------
// STATUS
// --------------------------------------------------

export const isReverbConnected = () => {
  return (
    socket &&
    socket.readyState === WebSocket.OPEN
  );
};

export const getReverbSocketId = () => {
  return socketId;
};

export const getSubscribedConversations = () => {
  return Array.from(
    subscribedConversations.keys()
  );
};