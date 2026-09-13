
import { getToken } from "../storage/token";

const REVERB_HOST = "192.168.8.5";
const REVERB_PORT = 8080;
const REVERB_APP_KEY = "stobweevbd4exnufy5dr";

const API_URL = "http://192.168.8.5:8000";

const WS_OPEN = 1;

let socket = null;
let currentUserId = null;
let notificationCallback = null;

let reconnectTimer = null;
let shouldReconnect = false;
let reconnecting = false;

const getChannelName = (userId) => {
  return `private-App.Models.User.${userId}`;
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

const authenticateChannel = async (ws, socketId, channelName, token) => {
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

    if (ws.readyState !== WS_OPEN) {
      console.log("⚠️ WebSocket closed before subscription");
      return false;
    }

    ws.send(
      JSON.stringify({
        event: "pusher:subscribe",
        data: {
          auth: authData.auth,
          channel: channelName,
        },
      })
    );

    console.log("📡 Subscription request sent:", channelName);

    return true;
  } catch (error) {
    console.log(
      "❌ Channel authentication error:",
      error?.message || error
    );

    return false;
  }
};

const handleNotification = (data) => {
  let notification = safeJsonParse(data);

  if (!notification || typeof notification !== "object") {
    console.log("⚠️ Invalid notification payload");
    return;
  }

  console.log("🔔 BROADCAST NOTIFICATION RECEIVED:", notification);

  if (typeof notificationCallback === "function") {
    notificationCallback(notification);
  }
};

export const connectReverb = async (userId, onNotification) => {
  if (!userId) {
    console.log("❌ Reverb: userId missing");
    return;
  }

  notificationCallback = onNotification;
  shouldReconnect = true;
  currentUserId = userId;

  if (
    socket &&
    socket.readyState === WS_OPEN &&
    currentUserId === userId
  ) {
    console.log("⚡ Reverb already connected");
    return;
  }

  if (socket) {
    try {
      socket.close();
    } catch {}
    socket = null;
  }

  clearReconnectTimer();

  const token = await getToken();

  if (!token) {
    console.log("❌ Reverb: token missing");
    return;
  }

  const channelName = getChannelName(userId);

  const wsUrl =
    `ws://${REVERB_HOST}:${REVERB_PORT}` +
    `/app/${REVERB_APP_KEY}`;

  console.log("🔌 Connecting Reverb...");
  console.log("🌐 WebSocket:", wsUrl);
  console.log("📡 Channel:", channelName);

  const ws = new WebSocket(wsUrl);

  socket = ws;

  ws.onopen = () => {
    console.log("✅ Reverb WebSocket connected");
  };

  ws.onmessage = async (event) => {
    try {
      const message = safeJsonParse(event?.data);

      if (!message || typeof message !== "object") {
        console.log("⚠️ Invalid Reverb message");
        return;
      }

      console.log("📩 RAW REVERB:", event?.data);
      console.log(
        "📩 REVERB EVENT:",
        message.event,
        message.data
      );

      if (message.event === "pusher:connection_established") {
        const connectionData = safeJsonParse(message.data);

        if (!connectionData?.socket_id) {
          console.log("❌ Missing Reverb socket_id");
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

        if (ws.readyState === WS_OPEN) {
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
        console.log("✅ PRIVATE CHANNEL SUBSCRIBED!");
        return;
      }

      if (
        message.event ===
        "Illuminate\\Notifications\\Events\\BroadcastNotificationCreated"
      ) {
        handleNotification(message.data);
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

        handleNotification(message.data);
      }
    } catch (error) {
      console.log(
        "❌ Reverb message error:",
        error?.message || error
      );
    }
  };

  ws.onerror = (error) => {
    console.log("❌ Reverb WebSocket error:", error);
  };

  ws.onclose = (event) => {
    console.log(
      "🔌 Reverb disconnected:",
      event?.code,
      event?.reason
    );

    if (socket === ws) {
      socket = null;
    }

    if (
      shouldReconnect &&
      currentUserId === userId &&
      !reconnecting
    ) {
      reconnecting = true;

      clearReconnectTimer();

      console.log(
        "🔄 Reverb reconnecting in 3 seconds..."
      );

      reconnectTimer = setTimeout(() => {
        reconnecting = false;

        connectReverb(
          userId,
          notificationCallback
        );
      }, 3000);
    }
  };
};

export const disconnectReverb = () => {
  console.log("🔌 Disconnecting Reverb...");

  shouldReconnect = false;
  reconnecting = false;

  clearReconnectTimer();

  if (socket) {
    try {
      socket.close();
    } catch {}
  }

  socket = null;
  currentUserId = null;
  notificationCallback = null;
};

export const isReverbConnected = () => {
  return socket?.readyState === WS_OPEN;
};

