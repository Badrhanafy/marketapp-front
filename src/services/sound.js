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
  if (initialized) return;

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    });

    newMessagePlayer =
      createAudioPlayer(newMessageSource);

    notificationPlayer =
      createAudioPlayer(notificationSource);

    newMessagePlayer.volume = 1;
    notificationPlayer.volume = 1;

    initialized = true;

    console.log("🔊 Sound system initialized");
  } catch (error) {
    console.log(
      "❌ Sound init error:",
      error?.message || error
    );
  }
};

export const playNewMessageSound = async () => {
  try {
    if (!initialized) {
      await initSound();
    }

    if (!newMessagePlayer) return;

    console.log(
      "🔊 Playing NEW MESSAGE sound..."
    );

    await newMessagePlayer.seekTo(0);

    newMessagePlayer.volume = 1;

    newMessagePlayer.play();

    console.log(
      "✅ NEW MESSAGE sound play() called"
    );
  } catch (error) {
    console.log(
      "❌ New message sound error:",
      error?.message || error
    );
  }
};

export const playNotificationSound = async () => {
  try {
    if (!initialized) {
      await initSound();
    }

    if (!notificationPlayer) return;

    console.log(
      "🔊 Playing NOTIFICATION sound..."
    );

    await notificationPlayer.seekTo(0);

    notificationPlayer.volume = 1;

    notificationPlayer.play();

    console.log(
      "✅ Notification sound play() called"
    );
  } catch (error) {
    console.log(
      "❌ Notification sound error:",
      error?.message || error
    );
  }
};