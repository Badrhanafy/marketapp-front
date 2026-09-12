import { getToken } from "./storage";

let socket = null;
let socketId = null;
const listeners = {};

const REVERB_KEY = process.env.EXPO_PUBLIC_REVERB_APP_KEY;
const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST;
const REVERB_PORT = process.env.EXPO_PUBLIC_REVERB_PORT;

export function connectReverb() {
  return new Promise((resolve, reject) => {
    const url =
      `ws://${REVERB_HOST}:${REVERB_PORT}/app/${REVERB_KEY}` +
      `?protocol=7&client=js&version=8.0&flash=false`;

    console.log("🔵 Connecting:", url);

    socket = new WebSocket(url);

    socket.onopen = () => {
      console.log("🟡 WebSocket OPEN");
    };

    socket.onmessage = async (message) => {
      try {
        const data = JSON.parse(message.data);

        console.log("📩 REVERB:", data);

        // Reverb/Pusher connection established
        if (data.event === "pusher:connection_established") {
          const connectionData = JSON.parse(data.data);

          socketId = connectionData.socket_id;

          console.log("🟢 REVERB CONNECTED:", socketId);

          resolve(socketId);
        }

        // Private channel subscription success
        if (data.event === "pusher_internal:subscription_succeeded") {
          console.log("🟢 CHANNEL SUBSCRIBED");
        }

        // Laravel event
        if (data.event && !data.event.startsWith("pusher:")) {
          const channel = data.channel;

          if (listeners[channel]) {
            listeners[channel].forEach((callback) => {
              callback(data);
            });
          }
        }
      } catch (error) {
        console.log("🔴 REVERB MESSAGE ERROR:", error);
      }
    };

    socket.onerror = (error) => {
      console.log("🔴 REVERB ERROR:", error);
      reject(error);
    };

    socket.onclose = (event) => {
      console.log("🔴 REVERB CLOSED:", event);
      socket = null;
    };
  });
}


export async function subscribePrivate(channel) {
  if (!socket || !socketId) {
    throw new Error("Reverb is not connected");
  }

  const token = await getToken();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/broadcasting/auth`,
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        socket_id: socketId,
        channel_name: channel,
      }),
    }
  );

  const auth = await response.json();

  console.log("🔐 AUTH:", auth);

  if (!response.ok) {
    throw new Error(
      auth.message || "Broadcasting authentication failed"
    );
  }

  socket.send(
    JSON.stringify({
      event: "pusher:subscribe",
      data: {
        auth: auth.auth,
        channel: channel,
      },
    })
  );

  console.log("📡 SUBSCRIBE:", channel);
}


export function listen(channel, callback) {
  if (!listeners[channel]) {
    listeners[channel] = [];
  }

  listeners[channel].push(callback);

  return () => {
    listeners[channel] = listeners[channel].filter(
      (item) => item !== callback
    );
  };
}


export function disconnectReverb() {
  if (socket) {
    socket.close();
    socket = null;
    socketId = null;
  }
}