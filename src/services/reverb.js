// src/services/reverb.js
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { API_URL } from "../constants/config";

let echo = null;
let initPromise = null;

export async function ensureReverb() {
  if (echo) return echo;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // dynamic import so cycle can't happen at module load time
    const { default: AsyncStorage } = await import(
      "@react-native-async-storage/async-storage"
    );
    const token = await AsyncStorage.getItem("token");

    window.Pusher = Pusher;

    echo = new Echo({
      broadcaster: "reverb",
      key: process.env.EXPO_PUBLIC_REVERB_APP_KEY,
      wsHost: process.env.EXPO_PUBLIC_REVERB_HOST,
      wsPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 8080),
      wssPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 443),
      forceTLS: (process.env.EXPO_PUBLIC_REVERB_SCHEME ?? "https") === "https",
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    });

    return echo;
  })();

  return initPromise;
}

export async function subscribeToConversation(conversationId, handler) {
  const e = await ensureReverb();
  const channelName = `conversation.${conversationId}`;

  // Clean up any prior listener to avoid duplicates
  try { e.leave(channelName); } catch {}

  const channel = e.private(channelName);
  channel.listen(".message.sent", (payload) => handler(payload));
  return channel;
}

export function unsubscribeFromConversation(conversationId) {
  if (!echo) return;
  try { echo.leave(`conversation.${conversationId}`); } catch {}
}

export function getReverbSocketId() {
  try {
    return echo?.socketId?.() ?? echo?.connector?.pusher?.connection?.socket_id ?? null;
  } catch {
    return null;
  }
}