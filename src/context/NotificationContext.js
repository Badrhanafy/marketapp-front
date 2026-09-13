
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { useAudioPlayer } from "expo-audio";

import { useAuth } from "./AuthContext";

import {
  connectReverb,
  disconnectReverb,
} from "../services/reverb";

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../api/notifications";

const NotificationContext = createContext(null);

const normalizeNotification = (
  notification,
  isApiNotification = false
) => {
  const data = isApiNotification
    ? notification?.data || {}
    : notification || {};

  const user = data.user || {};
  const product = data.product || {};

  return {
    id: notification?.id || data.id,

    type:
      data.type ||
      notification?.type ||
      "notification",

    title:
      data.title ||
      "New notification",

    message:
      data.message ||
      "",

    user: {
      id:
        user.id ||
        data.user_id ||
        null,

      name:
        user.name ||
        null,

      email:
        user.email ||
        null,

      phone:
        user.phone ||
        null,

      city:
        user.city ||
        null,

      avatar:
        user.avatar ||
        null,
    },

    product: {
      id:
        product.id ||
        data.product_id ||
        null,

      name:
        product.name ||
        null,

      price:
        product.price ?? null,

      city:
        product.city ||
        null,

      image:
        product.image ||
        null,
    },

    product_id:
      data.product_id ||
      product.id ||
      null,

    user_id:
      data.user_id ||
      user.id ||
      null,

    created_at:
      notification?.created_at ||
      data.created_at ||
      new Date().toISOString(),

    updated_at:
      notification?.updated_at ||
      data.updated_at ||
      null,

    read_at:
      notification?.read_at ||
      null,
  };
};

export const NotificationProvider = ({
  children,
}) => {
  const { user, token } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] =
    useState(null);

  const notificationPlayer = useAudioPlayer(
    require("../../assets/sounds/likenotification.mp3")
  );

  const playNotificationSound = useCallback(() => {
    try {
      notificationPlayer.seekTo(0);
      notificationPlayer.play();

      console.log("🔊 Notification sound played");
    } catch (error) {
      console.log(
        "❌ Notification sound error:",
        error?.message || error
      );
    }
  }, [notificationPlayer]);

  const loadNotifications = useCallback(async () => {
    try {
      console.log("🔔 Loading notifications...");

      const response = await getNotifications();

      console.log(
        "🔔 Notifications API:",
        response
      );

      if (!response?.status) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const rawNotifications =
        response.notifications?.data || [];

      const normalizedNotifications =
        rawNotifications.map((notification) =>
          normalizeNotification(
            notification,
            true
          )
        );

      setNotifications(
        normalizedNotifications
      );

      setUnreadCount(
        response.unread_count || 0
      );

      console.log(
        "🔔 Notifications loaded:",
        normalizedNotifications.length
      );

      console.log(
        "🔴 Unread count:",
        response.unread_count || 0
      );
    } catch (error) {
      console.log(
        "❌ Notifications API error:",
        error?.response?.data ||
          error?.message ||
          error
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user?.id || !token) {
      console.log(
        "🔌 NotificationContext: no authenticated user"
      );

      setNotifications([]);
      setUnreadCount(0);
      setLatestNotification(null);

      disconnectReverb();

      return;
    }

    console.log(
      "🔔 NotificationContext: connecting Reverb for user:",
      user.id
    );

    loadNotifications();

    connectReverb(
      user.id,
      (rawNotification) => {
        console.log(
          "🔔 NotificationContext received:",
          rawNotification
        );

        const notification =
          normalizeNotification(
            rawNotification,
            false
          );

        console.log(
          "🔔 Normalized notification:",
          notification
        );

        setLatestNotification(notification);

        setNotifications((previous) => {
          const exists = previous.some(
            (item) =>
              item.id === notification.id
          );

          if (exists) {
            return previous;
          }

          return [
            {
              ...notification,
              read_at: null,
            },
            ...previous,
          ];
        });

        setUnreadCount(
          (previous) => previous + 1
        );

        playNotificationSound();
      }
    );

    return () => {
      console.log(
        "🔌 NotificationContext: disconnecting Reverb"
      );

      disconnectReverb();
    };
  }, [
    user?.id,
    token,
    loadNotifications,
    playNotificationSound,
  ]);

  const markAsRead = async (
    notificationId
  ) => {
    try {
      await markNotificationAsRead(
        notificationId
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                read_at:
                  new Date().toISOString(),
              }
            : notification
        )
      );

      setUnreadCount((previous) =>
        previous > 0 ? previous - 1 : 0
      );

      console.log(
        "✅ Notification marked as read:",
        notificationId
      );
    } catch (error) {
      console.log(
        "❌ Mark notification as read error:",
        error?.response?.data ||
          error?.message ||
          error
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read_at:
            notification.read_at ||
            new Date().toISOString(),
        }))
      );

      setUnreadCount(0);

      console.log(
        "✅ All notifications marked as read"
      );
    } catch (error) {
      console.log(
        "❌ Mark all notifications error:",
        error?.response?.data ||
          error?.message ||
          error
      );
    }
  };

  const deleteNotificationById = async (
    notificationId
  ) => {
    try {
      const notification =
        notifications.find(
          (item) =>
            item.id === notificationId
        );

      await deleteNotification(
        notificationId
      );

      setNotifications((previous) =>
        previous.filter(
          (item) =>
            item.id !== notificationId
        )
      );

      if (
        notification &&
        !notification.read_at
      ) {
        setUnreadCount((previous) =>
          previous > 0 ? previous - 1 : 0
        );
      }

      console.log(
        "🗑️ Notification deleted:",
        notificationId
      );
    } catch (error) {
      console.log(
        "❌ Delete notification error:",
        error?.response?.data ||
          error?.message ||
          error
      );
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    setLatestNotification(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        latestNotification,
        unreadCount,

        loadNotifications,
        refresh,

        markAsRead,
        markAllAsRead,

        deleteNotification:
          deleteNotificationById,

        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context =
    useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }

  return context;
};

