import {
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";

// =====================================================
// SOUND SOURCES  (static ES imports — Metro resolves
// the mp3 files at bundle time and returns an asset id)
// =====================================================

import NEW_MESSAGE_SOUND from "../../assets/sounds/newmessage.mp3";
import LIKE_NOTIFICATION_SOUND from "../../assets/sounds/likenotification.mp3";

// =====================================================
// PLAYERS
// =====================================================

let newMessagePlayer = null;
let likeNotificationPlayer = null;

let initialized = false;
let initializing = null;

// =====================================================
// INTERNAL HELPER — play a player safely from the start
// =====================================================

const restartAndPlay = async (player, label) => {
  if (!player) {
    console.log(`❌ ${label} PLAYER NOT READY`);
    return;
  }

  try {
    // If it's currently playing, stop it first so seekTo(0)
    // reliably restarts the sound instead of being ignored.
    if (player.playing) {
      player.pause();
    }

    player.volume = 1;

    // Restart from the beginning
    await player.seekTo(0);

    player.play();

    console.log(`✅ ${label} SOUND PLAY CALLED`);
  } catch (error) {
    console.log(
      `❌ ${label} SOUND ERROR:`,
      error?.message || error
    );
  }
};

// =====================================================
// INIT
// =====================================================

export const initSound = async () => {
  // Already ready
  if (initialized) {
    return true;
  }

  // Prevent multiple simultaneous initialization calls
  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    try {
      console.log("🔊 INITIALIZING SOUND SYSTEM...");

      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "mixWithOthers",
      });

      // -------------------------------------------------
      // newMessagePlayer       → newmessage.mp3
      // likeNotificationPlayer → likenotification.mp3
      // -------------------------------------------------

      newMessagePlayer = createAudioPlayer(NEW_MESSAGE_SOUND);
      likeNotificationPlayer = createAudioPlayer(
        LIKE_NOTIFICATION_SOUND
      );

      newMessagePlayer.volume = 1;
      likeNotificationPlayer.volume = 1;

      newMessagePlayer.loop = false;
      likeNotificationPlayer.loop = false;

      initialized = true;

      console.log("✅ SOUND SYSTEM READY");
      console.log("💬 New message player:", !!newMessagePlayer);
      console.log(
        "❤️ Like notification player:",
        !!likeNotificationPlayer
      );

      return true;
    } catch (error) {
      console.log(
        "❌ SOUND INIT ERROR:",
        error?.message || error
      );

      initialized = false;

      newMessagePlayer = null;
      likeNotificationPlayer = null;

      return false;
    } finally {
      initializing = null;
    }
  })();

  return initializing;
};

// =====================================================
// PLAY NEW MESSAGE
// =====================================================

export const playNewMessageSound = async () => {
  console.log("💬 PLAY NEW MESSAGE SOUND");

  const ready = await initSound();

  if (!ready) {
    console.log("❌ SOUND SYSTEM NOT READY");
    return;
  }

  await restartAndPlay(newMessagePlayer, "NEW MESSAGE");
};

// =====================================================
// PLAY LIKE NOTIFICATION
// =====================================================

export const playNotificationSound = async () => {
  console.log("❤️ PLAY LIKE NOTIFICATION SOUND");

  const ready = await initSound();

  if (!ready) {
    console.log("❌ SOUND SYSTEM NOT READY");
    return;
  }

  await restartAndPlay(likeNotificationPlayer, "LIKE NOTIFICATION");
};

// =====================================================
// OPTIONAL: STOP ALL SOUNDS
// =====================================================

export const stopAllSounds = async () => {
  try {
    if (newMessagePlayer) {
      newMessagePlayer.pause();
      await newMessagePlayer.seekTo(0);
    }

    if (likeNotificationPlayer) {
      likeNotificationPlayer.pause();
      await likeNotificationPlayer.seekTo(0);
    }

    console.log("🔇 ALL SOUNDS STOPPED");
  } catch (error) {
    console.log(
      "❌ STOP SOUND ERROR:",
      error?.message || error
    );
  }
};

// =====================================================
// OPTIONAL: RELEASE PLAYERS
// =====================================================

export const releaseSound = () => {
  try {
    if (newMessagePlayer) {
      newMessagePlayer.remove();
      newMessagePlayer = null;
    }

    if (likeNotificationPlayer) {
      likeNotificationPlayer.remove();
      likeNotificationPlayer = null;
    }

    initialized = false;

    console.log("🧹 SOUND SYSTEM RELEASED");
  } catch (error) {
    console.log(
      "❌ SOUND RELEASE ERROR:",
      error?.message || error
    );
  }
};