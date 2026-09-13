import { getToken } from "../storage/token";

const REVERB_HOST = "192.168.8.5";
const REVERB_PORT = 8080;
const REVERB_APP_KEY = "stobweevbd4exnufy5dr";
const API_URL = "http://192.168.8.5:8000";

const WS_OPEN = 1;
const RECONNECT_DELAY = 3000;

let socket = null;
let currentUserId = null;
let notificationCallback = null;

let reconnectTimer = null;
let shouldReconnect = false;
let reconnecting = false;
let connectionId = 0;

const getChannelName = (userId) => {
  return `private-App.Models.User.${userId}`;
};

const getWebSocketUrl = () => {
  return `ws://${REVERB_HOST}:${REVERB_PORT}/app/${REVERB_APP_KEY}`;
};

const safeJsonParse = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const isSocketOpen = (ws) => {
  return ws && ws.readyState === WS_OPEN;
};

const authenticateChannel = async (
  ws,
  socketId,
  channelName,
  token
) => {
  try {
    console.log("🔐 Authenticating private channel...");

    const response = await fetch(`${API_URL}/broadcasting/auth`, {
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
    });

    const text = await response.text();

    console.log("🔐 Broadcast auth status:", response.status);
    console.log("🔐 Broadcast auth response:", text);

    if (!response.ok) {
      console.log("❌ Broadcast auth failed");
      return false;
    }

    const authData = safeJsonParse(text);

    if (!authData?.auth) {
      console.log("❌ Broadcast auth response has no auth");
      return false;
    }

    if (!isSocketOpen(ws)) {
      console.log(
        "⚠️ WebSocket closed before subscription"
      );
      return false;
    }

    const subscribeMessage = {
      event: "pusher:subscribe",
      data: {
        auth: authData.auth,
        channel: channelName,
      },
    };

    ws.send(JSON.stringify(subscribeMessage));

    console.log(
      "📡 Subscription request sent:",
      channelName
    );

    return true;
  } catch (error) {
    console.log(
      "❌ Channel authentication error:",
      error?.message || error
    );

    return false;
  }
};

const emitNotification = (data) => {
  const notification = safeJsonParse(data);

  if (
    !notification ||
    typeof notification !== "object" ||
    Array.isArray(notification)
  ) {
    console.log(
      "⚠️ Invalid notification payload:",
      notification
    );
    return;
  }

  console.log(
    "🔔 BROADCAST NOTIFICATION RECEIVED:",
    notification
  );

  if (typeof notificationCallback === "function") {
    notificationCallback(notification);
  }
};

const scheduleReconnect = (userId) => {
  if (!shouldReconnect) {
    return;
  }

  if (currentUserId !== userId) {
    return;
  }

  if (reconnectTimer) {
    return;
  }

  console.log(
    `🔄 Reverb reconnecting in ${RECONNECT_DELAY / 1000} seconds...`
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    reconnecting = false;

    if (!shouldReconnect || currentUserId !== userId) {
      return;
    }

    await connectReverb(userId, notificationCallback);
  }, RECONNECT_DELAY);
};

export const connectReverb = async (
  userId,
  onNotification
) => {
  if (!userId) {
    console.log("❌ Reverb: userId missing");
    return;
  }

  currentUserId = userId;
  notificationCallback = onNotification;
  shouldReconnect = true;

  if (isSocketOpen(socket)) {
    console.log("⚡ Reverb already connected");
    return;
  }

  clearReconnectTimer();

  const token = await getToken();

  if (!token) {
    console.log("❌ Reverb: token missing");
    return;
  }

  if (socket) {
    try {
      socket.close();
    } catch {}

    socket = null;
  }

  const channelName = getChannelName(userId);
  const wsUrl = getWebSocketUrl();

  const myConnectionId = ++connectionId;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔌 Connecting Reverb...");
  console.log("🌐 WebSocket:", wsUrl);
  console.log("📡 Channel:", channelName);
  console.log("🆔 Connection ID:", myConnectionId);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const ws = new WebSocket(wsUrl);

  socket = ws;

  ws.onopen = () => {
    if (socket !== ws) {
      return;
    }

    reconnecting = false;

    console.log("✅ Reverb WebSocket connected");
  };

  ws.onmessage = async (event) => {
    if (socket !== ws) {
      return;
    }

    try {
      const message = safeJsonParse(event?.data);

      if (
        !message ||
        typeof message !== "object" ||
        Array.isArray(message)
      ) {
        console.log("⚠️ Invalid Reverb message");
        return;
      }

      console.log("📩 RAW REVERB:", event?.data);

      console.log(
        "📩 REVERB EVENT:",
        message.event,
        message.data
      );

      if (
        message.event ===
        "pusher:connection_established"
      ) {
        const connectionData = safeJsonParse(
          message.data
        );

        if (!connectionData?.socket_id) {
          console.log(
            "❌ Missing Reverb socket_id"
          );
          return;
        }

        console.log(
          "✅ CONNECTION ESTABLISHED:",
          connectionData
        );

        await authenticateChannel(
          ws,
          connectionData.socket_id,
          channelName,
          token
        );

        return;
      }

      if (message.event === "pusher:ping") {
        console.log("💓 Reverb ping → pong");

        if (isSocketOpen(ws)) {
          ws.send(
            JSON.stringify({
              event: "pusher:pong",
              data: {},
            })
          );
        }

        return;
      }

      if (message.event === "pusher:error") {
        console.log(
          "🚨 REVERB ERROR:",
          safeJsonParse(message.data)
        );

        return;
      }

      if (
        message.event ===
        "pusher_internal:subscription_succeeded"
      ) {
        console.log(
          "✅ PRIVATE CHANNEL SUBSCRIBED!"
        );

        return;
      }

      if (
        message.event ===
        "Illuminate\\Notifications\\Events\\BroadcastNotificationCreated"
      ) {
        emitNotification(message.data);
        return;
      }

      if (
        typeof message.event === "string" &&
        message.event.includes("Notification")
      ) {
        console.log(
          "🔔 Notification-like event:",
          message.event
        );

        emitNotification(message.data);
      }
    } catch (error) {
      console.log(
        "❌ Reverb message error:",
        error?.message || error
      );
    }
  };

  ws.onerror = (error) => {
    if (socket !== ws) {
      return;
    }

    console.log(
      "❌ Reverb WebSocket error:",
      error
    );
  };

  ws.onclose = (event) => {
    if (socket === ws) {
      socket = null;
    }

    reconnecting = false;

    console.log(
      "🔌 Reverb disconnected:",
      event?.code,
      event?.reason || "No reason"
    );

    if (
      shouldReconnect &&
      currentUserId === userId
    ) {
      scheduleReconnect(userId);
    }
  };
};

export const disconnectReverb = () => {
  console.log("🔌 Disconnecting Reverb...");

  shouldReconnect = false;
  reconnecting = false;

  clearReconnectTimer();

  connectionId++;

  const oldSocket = socket;

  socket = null;
  currentUserId = null;
  notificationCallback = null;

  if (oldSocket) {
    try {
      oldSocket.close();
    } catch {}
  }

  console.log("✅ Reverb disconnected completely");
};

export const isReverbConnected = () => {
  return isSocketOpen(socket);
};