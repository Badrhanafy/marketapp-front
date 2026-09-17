
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  RefreshCw,
  CheckCheck,
} from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";

import {
  subscribeToConversation,
  unsubscribeFromConversation,
} from "../../services/reverb";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://192.168.8.5:8000/api";

const MEDIA_URL = API_URL.replace(/\/api\/?$/, "");

const ChatListScreen = ({ navigation }) => {
  const { user, token } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Keep track of active Reverb subscriptions
  const subscriptionsRef = useRef(new Map());

  // Prevent duplicate loads
  const loadingRef = useRef(false);

  // =========================================================
  // MEDIA URL
  // =========================================================

  const normalizeMediaUrl = useCallback((value) => {
    if (!value || typeof value !== "string") {
      return null;
    }

    if (
      value.startsWith("http://") ||
      value.startsWith("https://")
    ) {
      return value;
    }

    const cleanPath = value.replace(/^\/+/, "");

    if (cleanPath.startsWith("storage/")) {
      return `${MEDIA_URL}/${cleanPath}`;
    }

    return `${MEDIA_URL}/storage/${cleanPath}`;
  }, []);

  // =========================================================
  // PRODUCT IMAGE
  // =========================================================

  const getProductImage = useCallback(
    (conversation) => {
      const product =
        conversation?.product ||
        conversation?.product_item ||
        conversation?.item ||
        null;

      if (!product) {
        return null;
      }

      const media =
        product.media ||
        product.product_media ||
        product.productMedia ||
        [];

      if (Array.isArray(media) && media.length > 0) {
        const sorted = [...media].sort(
          (a, b) =>
            Number(a?.order ?? 0) -
            Number(b?.order ?? 0)
        );

        const first = sorted[0];

        return normalizeMediaUrl(
          first?.path ||
            first?.url ||
            first?.image ||
            first?.src
        );
      }

      return normalizeMediaUrl(
        product.image ||
          product.image_url ||
          product.thumbnail ||
          product.photo
      );
    },
    [normalizeMediaUrl]
  );

  // =========================================================
  // OTHER USER
  // =========================================================

  const getOtherUser = useCallback(
    (conversation) => {
      if (!conversation || !user?.id) {
        return null;
      }

      if (conversation.other_user) {
        return conversation.other_user;
      }

      const currentUserId = Number(user.id);

      if (
        Number(conversation.buyer_id) ===
        currentUserId
      ) {
        return conversation.seller || null;
      }

      if (
        Number(conversation.seller_id) ===
        currentUserId
      ) {
        return conversation.buyer || null;
      }

      return null;
    },
    [user?.id]
  );

  // =========================================================
  // LAST MESSAGE
  // =========================================================

  const getLastMessage = useCallback(
    (conversation) => {
      const message =
        conversation?.last_message;

      if (!message) {
        return "No messages yet";
      }

      if (typeof message === "string") {
        return message;
      }

      return (
        message.message ||
        message.body ||
        "No messages yet"
      );
    },
    []
  );

  // =========================================================
  // LAST MESSAGE DATE
  // =========================================================

  const getLastMessageDate = useCallback(
    (conversation) => {
      return (
        conversation?.last_message?.created_at ||
        conversation?.last_message_at ||
        conversation?.updated_at ||
        null
      );
    },
    []
  );

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = useCallback((dateString) => {
    if (!dateString) {
      return "";
    }

    try {
      const date = new Date(dateString);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      const now = new Date();

      const sameDay =
        date.toDateString() ===
        now.toDateString();

      if (sameDay) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      const diff =
        now.getTime() - date.getTime();

      const oneDay = 24 * 60 * 60 * 1000;

      if (diff < 7 * oneDay) {
        return date.toLocaleDateString([], {
          weekday: "short",
        });
      }

      return date.toLocaleDateString([], {
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return "";
    }
  }, []);

  // =========================================================
  // SORT CONVERSATIONS
  // =========================================================

  const sortConversations = useCallback(
    (items) => {
      return [...items].sort((a, b) => {
        const dateA = new Date(
          getLastMessageDate(a) ||
            a?.updated_at ||
            0
        ).getTime();

        const dateB = new Date(
          getLastMessageDate(b) ||
            b?.updated_at ||
            0
        ).getTime();

        return dateB - dateA;
      });
    },
    [getLastMessageDate]
  );

  // =========================================================
  // LOAD CONVERSATIONS
  // =========================================================

  const loadConversations = useCallback(
    async (isRefresh = false) => {
      if (!token || !user?.id) {
        setLoading(false);
        return;
      }

      if (loadingRef.current && !isRefresh) {
        return;
      }

      try {
        loadingRef.current = true;

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        console.log(
          "💬 Loading conversations for user:",
          user.id
        );

        const response = await fetch(
          `${API_URL}/conversations`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const json = await response.json();

        console.log(
          "💬 Conversations response:",
          json
        );

        if (!response.ok) {
          throw new Error(
            json?.message ||
              "Failed to load conversations."
          );
        }

        const data =
          json?.data ||
          json?.conversations ||
          [];

        const normalized = Array.isArray(data)
          ? sortConversations(data)
          : [];

        setConversations(normalized);
      } catch (err) {
        console.error(
          "❌ ChatList error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load conversations."
        );
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      token,
      user?.id,
      sortConversations,
    ]
  );

  // =========================================================
  // UPDATE CONVERSATION FROM REAL-TIME MESSAGE
  // =========================================================

  const handleRealtimeMessage = useCallback(
    (conversationId, payload) => {
      console.log(
        "📩 ChatList realtime event:",
        conversationId,
        payload
      );

      const realtimeMessage =
        payload?.message ||
        payload?.data ||
        payload;

      if (!realtimeMessage) {
        return;
      }

      setConversations((current) => {
        const index = current.findIndex(
          (conversation) =>
            Number(conversation.id) ===
            Number(conversationId)
        );

        // Conversation is not currently in list.
        // Reload from API so product/seller data
        // are also available.
        if (index === -1) {
          loadConversations();
          return current;
        }

        const oldConversation =
          current[index];

        const updatedConversation = {
          ...oldConversation,

          last_message: {
            ...(oldConversation.last_message ||
              {}),
            ...realtimeMessage,
            message:
              realtimeMessage.message ||
              realtimeMessage.body ||
              oldConversation?.last_message
                ?.message ||
              "",
          },

          last_message_at:
            realtimeMessage.created_at ||
            oldConversation.last_message_at,

          updated_at:
            realtimeMessage.created_at ||
            oldConversation.updated_at,
        };

        /*
         * Only increment unread when the message
         * comes from another user.
         */
        const senderId = Number(
          realtimeMessage.sender_id ??
            realtimeMessage.sender?.id
        );

        const currentUserId = Number(
          user?.id
        );

        const isMine =
          senderId === currentUserId;

        if (!isMine) {
          const oldUnread = Number(
            oldConversation.unread_count || 0
          );

          updatedConversation.unread_count =
            oldUnread + 1;
        }

        const next = [...current];

        next.splice(index, 1);

        next.unshift(
          updatedConversation
        );

        return next;
      });
    },
    [user?.id, loadConversations]
  );

  // =========================================================
  // SUBSCRIBE TO ALL CONVERSATIONS
  // =========================================================

  const subscribeToAllConversations =
    useCallback(() => {
      if (
        !token ||
        !user?.id ||
        !conversations.length
      ) {
        return;
      }

      conversations.forEach(
        (conversation) => {
          const conversationId =
            conversation?.id;

          if (!conversationId) {
            return;
          }

          const key = String(
            conversationId
          );

          // Already subscribed
          if (
            subscriptionsRef.current.has(
              key
            )
          ) {
            return;
          }

          console.log(
            `📡 ChatList subscribing → conversation.${conversationId}`
          );

          try {
            const subscription =
              subscribeToConversation(
                conversationId,
                (payload) => {
                  handleRealtimeMessage(
                    conversationId,
                    payload
                  );
                }
              );

            subscriptionsRef.current.set(
              key,
              subscription || true
            );

            console.log(
              `✅ ChatList subscribed → conversation.${conversationId}`
            );
          } catch (error) {
            console.log(
              `❌ ChatList subscribe error → conversation.${conversationId}`,
              error
            );
          }
        }
      );
    }, [
      token,
      user?.id,
      conversations,
      handleRealtimeMessage,
    ]);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // =========================================================
  // REAL-TIME SUBSCRIPTIONS
  // =========================================================

  useEffect(() => {
    subscribeToAllConversations();
  }, [
    subscribeToAllConversations,
  ]);

  // =========================================================
  // CLEANUP REVERB
  // =========================================================

  useEffect(() => {
    return () => {
      console.log(
        "📡 ChatList cleanup subscriptions"
      );

      subscriptionsRef.current.forEach(
        (_, conversationId) => {
          try {
            unsubscribeFromConversation(
              conversationId
            );
          } catch (error) {
            console.log(
              "Reverb unsubscribe error:",
              error
            );
          }
        }
      );

      subscriptionsRef.current.clear();
    };
  }, []);

  // =========================================================
  // OPEN CHAT
  // =========================================================

  const openConversation = useCallback(
    (conversation) => {
      const otherUser =
        getOtherUser(conversation);

      const sellerId = Number(
        conversation?.seller_id ??
          otherUser?.id ??
          0
      );

      const product =
        conversation?.product ||
        conversation?.product_item ||
        conversation?.item ||
        null;

      console.log(
        "💬 Opening chat:",
        {
          conversationId:
            conversation?.id,
          productId: product?.id,
          sellerId,
          otherUserId:
            otherUser?.id,
        }
      );

      navigation.navigate("Chat", {
        conversationId:
          conversation.id,

        // Full product
        product,

        // Seller ID
        sellerId,

        // Other participant
        otherUser,

        // Useful fallback
        productId: product?.id ?? null,
      });
    },
    [getOtherUser, navigation]
  );

  // =========================================================
  // MARK LOCAL CONVERSATION AS READ
  // =========================================================

  const markConversationReadLocally =
    useCallback((conversationId) => {
      setConversations((current) =>
        current.map((conversation) =>
          Number(conversation.id) ===
          Number(conversationId)
            ? {
                ...conversation,
                unread_count: 0,
              }
            : conversation
        )
      );
    }, []);

  // =========================================================
  // RENDER
  // =========================================================

  const renderConversation =
    useCallback(
      ({ item }) => {
        const otherUser =
          getOtherUser(item);

        const lastMessage =
          getLastMessage(item);

        const lastMessageDate =
          getLastMessageDate(item);

        const product =
          item?.product ||
          item?.product_item ||
          item?.item ||
          null;

        const productImage =
          getProductImage(item);

        const unreadCount = Number(
          item?.unread_count || 0
        );

        const senderId = Number(
          item?.last_message?.sender_id ??
            item?.last_message?.sender?.id
        );

        const currentUserId = Number(
          user?.id
        );

        const lastMessageIsMine =
          senderId === currentUserId;

        return (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              markConversationReadLocally(
                item.id
              );

              openConversation(item);
            }}
            style={[
              styles.conversationItem,
              unreadCount > 0 &&
                styles.conversationUnread,
            ]}
          >
            {/* Product / User Avatar */}

            <View style={styles.avatarWrap}>
              {productImage ? (
                <Image
                  source={{
                    uri: productImage,
                  }}
                  style={styles.productAvatar}
                />
              ) : otherUser?.avatar ? (
                <Image
                  source={{
                    uri: normalizeMediaUrl(
                      otherUser.avatar
                    ),
                  }}
                  style={styles.productAvatar}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {(
                      otherUser?.name ||
                      "?"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              {unreadCount > 0 && (
                <View
                  style={styles.unreadDot}
                />
              )}
            </View>

            {/* Content */}

            <View
              style={
                styles.conversationContent
              }
            >
              <View style={styles.topRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.userName,
                    unreadCount > 0 &&
                      styles.userNameUnread,
                  ]}
                >
                  {otherUser?.name ||
                    "Unknown user"}
                </Text>

                <Text
                  style={[
                    styles.time,
                    unreadCount > 0 &&
                      styles.timeUnread,
                  ]}
                >
                  {formatTime(
                    lastMessageDate
                  )}
                </Text>
              </View>

              {product?.name && (
                <Text
                  numberOfLines={1}
                  style={styles.productName}
                >
                  {product.name}
                </Text>
              )}

              <View
                style={styles.messageRow}
              >
                {lastMessageIsMine && (
                  <CheckCheck
                    size={14}
                    color="#666666"
                    strokeWidth={2.5}
                    style={
                      styles.checkIcon
                    }
                  />
                )}

                <Text
                  numberOfLines={1}
                  style={[
                    styles.lastMessage,
                    unreadCount > 0 &&
                      styles.lastMessageUnread,
                  ]}
                >
                  {lastMessage}
                </Text>
              </View>
            </View>

            {/* Unread badge */}

            {unreadCount > 0 ? (
              <View
                style={styles.unreadBadge}
              >
                <Text
                  style={
                    styles.unreadBadgeText
                  }
                >
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </Text>
              </View>
            ) : (
              <ChevronRight
                size={20}
                color="#555555"
              />
            )}
          </TouchableOpacity>
        );
      },
      [
        getOtherUser,
        getLastMessage,
        getLastMessageDate,
        getProductImage,
        normalizeMediaUrl,
        user?.id,
        formatTime,
        openConversation,
        markConversationReadLocally,
      ]
    );

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.loadingContainer}
        >
          <ActivityIndicator
            size="large"
            color="#b8e601"
          />

          <Text
            style={styles.loadingText}
          >
            Loading chats...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (
    error &&
    conversations.length === 0
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <ArrowLeft
              size={23}
              color="#ffffff"
            />
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
          >
            Chats
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </View>

        <View
          style={styles.errorContainer}
        >
          <RefreshCw
            size={42}
            color="#b8e601"
          />

          <Text
            style={styles.errorTitle}
          >
            Couldn't load chats
          </Text>

          <Text
            style={styles.errorMessage}
          >
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() =>
              loadConversations()
            }
          >
            <Text
              style={styles.retryText}
            >
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      {/* Header */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() =>
            navigation.goBack()
          }
        >
          <ArrowLeft
            size={23}
            color="#ffffff"
          />
        </TouchableOpacity>

        <View
          style={styles.titleContainer}
        >
          <Text
            style={styles.headerTitle}
          >
            Chats
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            {conversations.length}{" "}
            conversation
            {conversations.length !== 1
              ? "s"
              : ""}
          </Text>
        </View>

        <View style={styles.chatIcon}>
          <MessageCircle
            size={22}
            color="#b8e601"
          />
        </View>
      </View>

      {/* List */}

      <FlatList
        data={conversations}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={
          renderConversation
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          conversations.length === 0
            ? styles.emptyList
            : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadConversations(true)
            }
            tintColor="#b8e601"
          />
        }
        ListEmptyComponent={
          <View
            style={styles.emptyContainer}
          >
            <View
              style={styles.emptyIcon}
            >
              <MessageCircle
                size={38}
                color="#b8e601"
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No conversations
            </Text>

            <Text
              style={styles.emptyText}
            >
              When you contact a seller
              or someone contacts you,
              your conversations will
              appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
    backgroundColor: "#080808",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151515",
    marginRight: 11,
  },

  titleContainer: {
    flex: 1,
  },

  headerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#666666",
    fontSize: 11,
    marginTop: 2,
  },

  headerSpacer: {
    width: 42,
  },

  chatIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
  },

  list: {
    paddingVertical: 8,
  },

  conversationItem: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#121212",
  },

  conversationUnread: {
    backgroundColor: "rgba(184,230,1,0.035)",
  },

  avatarWrap: {
    width: 58,
    height: 58,
    marginRight: 12,
    position: "relative",
  },

  productAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#151515",
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b8e601",
  },

  avatarText: {
    color: "#050505",
    fontSize: 19,
    fontWeight: "800",
  },

  unreadDot: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#b8e601",
    borderWidth: 2,
    borderColor: "#050505",
  },

  conversationContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  userName: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 8,
  },

  userNameUnread: {
    fontWeight: "900",
  },

  time: {
    color: "#666666",
    fontSize: 10,
  },

  timeUnread: {
    color: "#b8e601",
    fontWeight: "800",
  },

  productName: {
    color: "#b8e601",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    minWidth: 0,
  },

  checkIcon: {
    marginRight: 4,
  },

  lastMessage: {
    flex: 1,
    color: "#777777",
    fontSize: 13,
  },

  lastMessageUnread: {
    color: "#d0d0d0",
    fontWeight: "700",
  },

  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b8e601",
  },

  unreadBadgeText: {
    color: "#050505",
    fontSize: 10,
    fontWeight: "900",
  },

  emptyList: {
    flexGrow: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    marginBottom: 18,
  },

  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    color: "#666666",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#777777",
    fontSize: 13,
    marginTop: 12,
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  errorTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 15,
  },

  errorMessage: {
    color: "#777777",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },

  retryButton: {
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "#b8e601",
  },

  retryText: {
    color: "#050505",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default ChatListScreen;
