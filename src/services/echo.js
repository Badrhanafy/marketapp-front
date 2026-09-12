import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";

global.Pusher = Pusher;

const echo = new Echo({
  broadcaster: "reverb",
  key: process.env.EXPO_PUBLIC_REVERB_APP_KEY,

  wsHost: process.env.EXPO_PUBLIC_REVERB_HOST,
  wsPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT),
  wssPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT),

  forceTLS: false,
  enabledTransports: ["ws"],
});

echo.connector.pusher.connection.bind("connected", () => {
  console.log("🟢 REVERB CONNECTED");
});

echo.connector.pusher.connection.bind("error", (error) => {
  console.log("🔴 REVERB ERROR:", error);
});

export default echo;