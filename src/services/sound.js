import {
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";

const newMessageSource = require("../../assets/sounds/newmessage.mp3");
const notificationSource = require("../../assets/sounds/likenotification.mp3");

let newMessagePlayer = null;
let notificationPlayer = null;
let initialized = false;

export const initSound = async () => {
  if (initialized) {
    return;
  }

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    });

    newMessagePlayer = createAudioPlayer(newMessageSource);
    notificationPlayer = createAudioPlayer(notificationSource);

    newMessagePlayer.volume = 1.0;
    notificationPlayer.volume = 1.0;

    initialized = true;

    console.log("🔊 SOUND SYSTEM READY");
    console.log("🎵 New message player:", !!newMessagePlayer);
    console.log("❤️ Like notification player:", !!notificationPlayer);
  } catch (error) {
    console.log(
      "❌ SOUND INIT ERROR:",
      error?.message || error
    );
  }
};

export const playNewMessageSound = async () => {
  try {
    if (!initialized) {
      await initSound();
    }

    if (!newMessagePlayer) {
      console.log("❌ New message player missing");
      return;
    }

    console.log("🔊 PLAY NEW MESSAGE");

    await newMessagePlayer.seekTo(0);

    newMessagePlayer.volume = 1.0;

    newMessagePlayer.play();
  } catch (error) {
    console.log(
      "❌ NEW MESSAGE SOUND ERROR:",
      error?.message || error
    );
  }
};

export const playNotificationSound = async () => {
  try {
    if (!initialized) {
      await initSound();
    }

    if (!notificationPlayer) {
      console.log("❌ Notification player missing");
      return;
    }

    console.log("🔊 PLAY LIKE NOTIFICATION");

    await notificationPlayer.seekTo(0);

    notificationPlayer.volume = 1.0;

    notificationPlayer.play();
  } catch (error) {
    console.log(
      "❌ LIKE NOTIFICATION SOUND ERROR:",
      error?.message || error
    );
  }
};