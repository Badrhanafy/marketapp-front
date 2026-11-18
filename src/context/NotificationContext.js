import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { useAuth } from "./AuthContext";
import api from "../api/client";

import {
  connectReverb,
  disconnectReverb,
  setRealtimeMessageCallback,
  subscribeToConversationNotifications,
} from "../services/reverb";

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../api/notifications";

import {
  initSound,
  playNotificationSound,
  playNewMessageSound,
} from "../services/sound";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [latestMessage, setLatestMessage] = useState(null);
  const [latestNotification, setLatestNotification] = useState(null);

  const mountedRef = useRef(true);
  const appActiveRef = useRef(AppState.currentState === "active");

  /*
  |--------------------------------------------------------------------------
  | Prevent duplicate realtime sounds
  |--------------------------------------------------------------------------
  */

  const playedNotificationIds = useRef(new Set());
  const handledMessageIds = useRef(new Set());

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      appActiveRef.current = state === "active";
    });

    return () => subscription.remove();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Normalize notification
  |--------------------------------------------------------------------------
  */

  const normalizeNotification = useCallback((raw) => {
    if (!raw) return null;

    const data = raw.data || raw;

    return {
      ...raw,

      id: raw.id ?? data.id ?? null,

      type:
        raw.type ??
        data.type ??
        "notification",

      title:
        raw.title ??
        data.title ??
        "Notification",

      message:
        raw.message ??
        data.message ??
        data.body ??
        "",

      user_id:
        raw.user_id ??
        data.user_id ??
        data.liker_id ??
        data.sender_id ??
        null,

      product_id:
        raw.product_id ??
        data.product_id ??
        null,

      product:
        raw.product ??
        data.product ??
        null,

      liker:
        raw.liker ??
        data.liker ??
        data.user ??
        data.sender ??
        null,

      created_at:
        raw.created_at ??
        data.created_at ??
        new Date().toISOString(),

      read_at:
        raw.read_at ??
        data.read_at ??
        null,

      data,
    };
  }, []);

  const handleRealtimeMessage = useCallback(
    (conversationId, rawMessage) => {
      if (!mountedRef.current) return;

      const nestedMessage =
        rawMessage?.data?.message ??
        (typeof rawMessage?.message === "object"
          ? rawMessage.message
          : null);
      const message = nestedMessage || rawMessage?.data || rawMessage;
      if (!message || typeof message !== "object") return;

      const senderId =
        message.sender_id ?? message.sender?.id ?? message.user_id;
      if (
        user?.id &&
        senderId !== null &&
        senderId !== undefined &&
        String(senderId) === String(user.id)
      ) {
        return;
      }

      const messageId = message.id ?? message.message_id;
      const dedupeKey = messageId
        ? `${conversationId}:${messageId}`
        : null;

      if (dedupeKey && handledMessageIds.current.has(dedupeKey)) return;
      if (dedupeKey) {
        handledMessageIds.current.add(dedupeKey);
        if (handledMessageIds.current.size > 200) {
          const oldest = handledMessageIds.current.values().next().value;
          if (oldest) handledMessageIds.current.delete(oldest);
        }
      }

      const sender =
        message.sender?.name ||
        message.user?.name ||
        message.sender_name ||
        "New message";
      const preview =
        message.message || message.body || message.content || "You received a message";

      if (appActiveRef.current) {
        setLatestNotification(null);
        setLatestMessage({
          id: dedupeKey || `${conversationId}:${Date.now()}`,
          conversationId: String(conversationId),
          sender,
          preview: String(preview),
        });
        playNewMessageSound();
      }
    },
    [user]
  );

  const loadConversationSubscriptions = useCallback(async () => {
    const response = await api.get("/conversations");
    const body = response?.data;
    const conversations = Array.isArray(body?.conversations)
      ? body.conversations
      : Array.isArray(body?.conversations?.data)
        ? body.conversations.data
        : Array.isArray(body?.data?.conversations)
          ? body.data.conversations
          : Array.isArray(body?.data?.data)
            ? body.data.data
            : Array.isArray(body?.data)
              ? body.data
              : [];

    conversations.forEach((conversation) => {
      if (conversation?.id !== null && conversation?.id !== undefined) {
        subscribeToConversationNotifications(conversation.id);
      }
    });
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Load notifications
  |--------------------------------------------------------------------------
  */

const loadNotifications = useCallback(async () => {
  if (!token || !user?.id) return;

  try {
    setLoading(true);
    console.log("🔔 Loading notifications...");

    const response = await getNotifications();

    if (!mountedRef.current) return;

    // Axios response body
    const body = response?.data ?? response;

    // Laravel controller: { notifications: { data: [...] }, unread_count: n }
    const pagination = body?.notifications;

    const items = Array.isArray(pagination)
      ? pagination
      : Array.isArray(pagination?.data)
        ? pagination.data
        : Array.isArray(body?.data)
          ? body.data
          : [];

    const normalized = items
      .map(normalizeNotification)
      .filter(Boolean);

    const unread =
      body?.unread_count ??
      normalized.filter((item) => !item.read_at).length;

    setNotifications(normalized);
    setUnreadCount(Number(unread) || 0);

    console.log("✅ Notifications loaded:", normalized.length);
    console.log("🔔 Unread count:", unread);
    console.log(
      "🔎 First notification:",
      JSON.stringify(normalized[0] ?? null)
    );
  } catch (error) {
    console.log(
      "❌ Load notifications error:",
      error?.response?.status,
      error?.response?.data || error?.message || error
    );
  } finally {
    if (mountedRef.current) {
      setLoading(false);
    }
  }
}, [token, user?.id, normalizeNotification]);

  /*
  |--------------------------------------------------------------------------
  | Realtime notification
  |--------------------------------------------------------------------------
  */

  const handleRealtimeNotification = useCallback(
    (rawNotification) => {
      if (!mountedRef.current) return;

      console.log(
        "📩 REALTIME NOTIFICATION:",
        JSON.stringify(rawNotification)
      );

      const notification =
        normalizeNotification(rawNotification);

      if (!notification) {
        console.log("⚠️ Invalid notification");
        return;
      }

      /*
       * Ignore duplicated event
       */

      const notificationId = notification.id
        ? String(notification.id)
        : null;

      if (
        notificationId &&
        playedNotificationIds.current.has(notificationId)
      ) {
        console.log(
          "🔇 Notification already handled:",
          notificationId
        );
        return;
      }

      if (notificationId) {
        playedNotificationIds.current.add(notificationId);

        /*
         * Prevent Set from growing forever
         */
        if (playedNotificationIds.current.size > 200) {
          const first =
            playedNotificationIds.current.values().next().value;

          if (first) {
            playedNotificationIds.current.delete(first);
          }
        }
      }

      /*
       * Determine notification type
       */

      const type = String(
        notification.type || ""
      ).toLowerCase();

      const isMessageNotification =
        type === "message" ||
        type === "chat_message" ||
        type === "new_message" ||
        type.includes("message");

      const conversationId =
        notification.conversation_id ??
        notification.data?.conversation_id ??
        notification.data?.conversation?.id;
      const messageId =
        notification.message_id ??
        notification.data?.message_id ??
        notification.data?.message?.id;
      const messageKey =
        conversationId && messageId
          ? `${conversationId}:${messageId}`
          : null;

      /*
       * Ignore notification generated by current user
       */

      const currentUserId = user?.id;

      const senderId =
        notification.user_id ??
        notification.liker?.id ??
        notification.data?.user_id ??
        notification.data?.sender_id ??
        null;

      if (
        currentUserId &&
        senderId &&
        String(currentUserId) === String(senderId)
      ) {
        console.log(
          "🔇 Own notification ignored:",
          senderId
        );

        return;
      }

      /*
       * Add notification immediately
       */

      setNotifications((prev) => {
        const exists = notificationId
          ? prev.some(
              (item) =>
                String(item.id) === notificationId
            )
          : false;

        if (exists) {
          console.log(
            "⚠️ Notification already in list:",
            notificationId
          );

          return prev;
        }

        return [
          notification,
          ...prev,
        ];
      });

      /*
       * Increase unread count
       */

      setUnreadCount((prev) => prev + 1);

      let messageWasAlreadyHandled = false;
      if (isMessageNotification) {
        if (conversationId) {
          subscribeToConversationNotifications(conversationId);
        }

        messageWasAlreadyHandled =
          messageKey && handledMessageIds.current.has(messageKey);
        if (!messageWasAlreadyHandled && messageKey) {
          handledMessageIds.current.add(messageKey);
          if (handledMessageIds.current.size > 200) {
            const oldest = handledMessageIds.current.values().next().value;
            if (oldest) handledMessageIds.current.delete(oldest);
          }
        }

        if (!messageWasAlreadyHandled && appActiveRef.current) {
          const messageData = notification.data?.message;
          setLatestNotification(null);
          setLatestMessage({
            id: messageKey || notificationId || `message:${Date.now()}`,
            conversationId: conversationId ? String(conversationId) : null,
            sender:
              notification.liker?.name ||
              notification.data?.sender?.name ||
              notification.title ||
              "New message",
            preview: String(
              messageData?.message ||
              notification.message ||
              "You received a new message"
            ),
          });
        }
      } else if (appActiveRef.current) {
        setLatestMessage(null);
        setLatestNotification({
          id: notificationId || `notification:${Date.now()}`,
          title: String(notification.title || "New notification"),
          message: String(notification.message || ""),
        });
      }

      if (appActiveRef.current) {
        if (isMessageNotification) {
          if (!messageWasAlreadyHandled) playNewMessageSound();
        } else {
          playNotificationSound();
        }
      }
    },
    [
      normalizeNotification,
      user?.id,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Mark notification as read
  |--------------------------------------------------------------------------
  */

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;

      try {
        await markNotificationAsRead(notificationId);

        if (!mountedRef.current) return;

        setNotifications((prev) =>
          prev.map((notification) => {
            if (
              String(notification.id) !==
              String(notificationId)
            ) {
              return notification;
            }

            return {
              ...notification,
              read_at:
                notification.read_at ??
                new Date().toISOString(),
            };
          })
        );

        setUnreadCount((prev) =>
          Math.max(0, prev - 1)
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
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | Mark all notifications as read
  |--------------------------------------------------------------------------
  */

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();

      if (!mountedRef.current) return;

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read_at:
            notification.read_at ??
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
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Delete notification
  |--------------------------------------------------------------------------
  */

  const removeNotification = useCallback(
    async (notificationId) => {
      if (!notificationId) return;

      try {
        await deleteNotification(notificationId);

        if (!mountedRef.current) return;

        setNotifications((prev) =>
          prev.filter(
            (notification) =>
              String(notification.id) !==
              String(notificationId)
          )
        );

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
    },
    []
  );

  const dismissLatestMessage = useCallback(() => setLatestMessage(null), []);
  const dismissLatestNotification = useCallback(
    () => setLatestNotification(null),
    []
  );

  /*
  |--------------------------------------------------------------------------
  | Initialize sound + notifications + Reverb
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current = true;

    /*
     * Initialize audio once
     */
    initSound();

    /*
     * Not authenticated yet
     */
    if (!user?.id || !token) {
      console.log(
        "🔕 NotificationContext waiting for authentication..."
      );

      setNotifications([]);
      setUnreadCount(0);
      setLatestMessage(null);
      setLatestNotification(null);

      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;
    setRealtimeMessageCallback(handleRealtimeMessage);

    const startRealtime = async () => {
      try {
        console.log(
          "🔔 Starting NotificationContext for user:",
          user.id
        );

        /*
         * Load existing notifications
         */
        await loadNotifications();

        if (cancelled || !mountedRef.current) {
          return;
        }

        try {
          await loadConversationSubscriptions();
        } catch (error) {
          console.error(
            "❌ Failed to subscribe to app-wide conversations:",
            error?.response?.data || error?.message || error
          );
        }

        if (cancelled || !mountedRef.current) {
          return;
        }

        /*
         * Connect Reverb
         */
        console.log(
          "📡 Connecting Reverb notification channel..."
        );

        connectReverb(
          user.id,
          handleRealtimeNotification
        );

        console.log(
          "✅ Notification Reverb initialized"
        );
      } catch (error) {
        console.log(
          "❌ Notification realtime startup error:",
          error?.message || error
        );
      }
    };

    startRealtime();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      setRealtimeMessageCallback(null);

      console.log(
        "🔌 NotificationContext cleanup"
      );

      disconnectReverb();
    };
  }, [
    user?.id,
    token,
    loadNotifications,
    loadConversationSubscriptions,
    handleRealtimeNotification,
    handleRealtimeMessage,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Context value
  |--------------------------------------------------------------------------
  */

  const value = {
    notifications,
    unreadCount,
    loading,
    latestMessage,
    latestNotification,
    dismissLatestMessage,
    dismissLatestNotification,

    loadNotifications,

    markAsRead,
    markAllAsRead,

    deleteNotification:
      removeNotification,

    refreshNotifications:
      loadNotifications,

    playNotificationSound,
    playNewMessageSound,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/*
|--------------------------------------------------------------------------
| Hook
|--------------------------------------------------------------------------
*/

export function useNotifications() {
  const context =
    useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }

  return context;
}

export default NotificationContext;