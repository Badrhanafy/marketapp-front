import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  Platform,
  useWindowDimensions,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

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

import { API_URL } from "../../constants/config";

const MEDIA_URL = API_URL.replace(/\/api\/?$/, "");

/* =========================================================
   THEME
========================================================= */

const COLORS = {
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceSoft: "#eef7f4",
  surfaceHover: "#e4f5f0",
  border: "#edf5f2",
  borderStrong: "#e1eee9",

  accent: "#146a63",
  accentDark: "#0c3b3a",

  text: "#16302c",
  textMuted: "#6f8781",
  textDim: "#9bb0ab",

  newMessage: "#146a63",
};

/* =========================================================
   RESPONSIVE
========================================================= */

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const hScale = width / BASE_WIDTH;
    const vScale = height / BASE_HEIGHT;

    const sx = (n) =>
      clamp(n * hScale, n * 0.85, n * 1.35);

    const sy = (n) =>
      clamp(n * vScale, n * 0.9, n * 1.3);

    const fs = (n) =>
      clamp(n * hScale, n * 0.92, n * 1.25);

    return {
      width,
      height,
      sx,
      sy,
      fs,
      isSmall: width < 360,
      isLarge: width > 414,
      isTablet: width >= 600,
    };
  }, [width, height]);
};

/* =========================================================
   SCREEN
========================================================= */

const ChatListScreen = ({ navigation }) => {
  const { user, token } = useAuth();

  const insets = useSafeAreaInsets();
  const rs = useResponsive();

  /* =====================================================
     TOKENS
  ===================================================== */

  const tokens = useMemo(() => {
    const {
      sx,
      sy,
      fs,
      isLarge,
      isTablet,
    } = rs;

    return {
      // Header
      headerMinHeight: sy(72),
      headerPaddingH: sx(16),
      backButtonSize: sx(42),
      backButtonRadius: sx(21),
      backButtonMarginRight: sx(11),
      backIconSize: sx(23),
      headerTitleSize: fs(20),
      headerSubtitleSize: fs(11),
      chatIconSize: sx(42),
      chatIconRadius: sx(21),
      chatIconGlyph: sx(22),

      // List
      listPaddingV: sy(8),
      listPaddingH:
        isLarge || isTablet ? sx(24) : sx(16),

      // Row
      rowMinHeight: sy(82),
      rowPaddingH: sx(16),
      rowPaddingV: sy(10),

      // Avatar
      avatarSize: sx(58),
      avatarRadius: sx(18),
      avatarMarginRight: sx(12),
      avatarTextSize: fs(19),

      // New message indicator
      newDotSize: sx(11),

      // Content
      userNameSize: fs(15),
      timeSize: fs(10),
      productNameSize: fs(11),
      lastMessageSize: fs(13),
      contentMarginRight: sx(8),

      // Chevron
      chevronSize: sx(20),
      checkIconSize: sx(14),

      // Empty
      emptyIconSize: sx(78),
      emptyIconRadius: sx(39),
      emptyIconGlyph: sx(38),
      emptyTitleSize: fs(18),
      emptyTextSize: fs(13),
      emptyTextLineHeight: fs(20),

      // Loading
      loadingTextSize: fs(13),

      // Error
      errorIconSize: sx(42),
      errorTitleSize: fs(18),
      errorMessageSize: fs(13),
      retryPadH: sx(25),
      retryPadV: sy(12),
      retryRadius: sx(22),
      retryTextSize: fs(14),
    };
  }, [rs]);

  /* =====================================================
     STATE
  ===================================================== */

  const [conversations, setConversations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /*
   * IDs of conversations that currently have
   * a new message indicator.
   */
  const [newMessageConversations, setNewMessageConversations] =
    useState(new Set());

  const subscriptionsRef = useRef(new Map());
  const loadingRef = useRef(false);

  /* =====================================================
     MEDIA
  ===================================================== */

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

  /* =====================================================
     OTHER USER
  ===================================================== */

  const getOtherUser = useCallback(
    (conversation) => {
      if (!conversation || !user?.id) {
        return null;
      }

      const currentUserId = Number(user.id);

      if (
        Number(conversation.buyer_id) === currentUserId
      ) {
        return conversation.seller || null;
      }

      if (
        Number(conversation.seller_id) === currentUserId
      ) {
        return conversation.buyer || null;
      }

      return null;
    },
    [user?.id]
  );

  /* =====================================================
     LAST MESSAGE
  ===================================================== */

  const getLastMessageObject = useCallback(
    (conversation) => {
      return (
        conversation?.lastMessage ||
        conversation?.last_message ||
        null
      );
    },
    []
  );

  const getLastMessage = useCallback(
    (conversation) => {
      const message =
        getLastMessageObject(conversation);

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
    [getLastMessageObject]
  );

  const getLastMessageDate = useCallback(
    (conversation) => {
      const message =
        getLastMessageObject(conversation);

      return (
        message?.created_at ||
        conversation?.last_message_at ||
        conversation?.updated_at ||
        null
      );
    },
    [getLastMessageObject]
  );

  const getLastMessageProduct = useCallback(
    (conversation) => {
      const message =
        getLastMessageObject(conversation);

      return message?.product || null;
    },
    [getLastMessageObject]
  );

  /* =====================================================
     PRODUCT IMAGE
  ===================================================== */

  const getProductImage = useCallback(
    (conversation) => {
      const product =
        getLastMessageProduct(conversation);

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
    [
      getLastMessageProduct,
      normalizeMediaUrl,
    ]
  );

  /* =====================================================
     TIME
  ===================================================== */

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

      const oneDay =
        24 * 60 * 60 * 1000;

      if (
        diff >= 0 &&
        diff < 7 * oneDay
      ) {
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

  /* =====================================================
     SORT
  ===================================================== */

  const sortConversations = useCallback(
    (items) => {
      return [...items].sort((a, b) => {
        const dateA = new Date(
          getLastMessageDate(a) || 0
        ).getTime();

        const dateB = new Date(
          getLastMessageDate(b) || 0
        ).getTime();

        return dateB - dateA;
      });
    },
    [getLastMessageDate]
  );

  /* =====================================================
     LOAD CONVERSATIONS
  ===================================================== */

  const loadConversations = useCallback(
    async (isRefresh = false) => {
      if (!token || !user?.id) {
        setLoading(false);
        return;
      }

      if (
        loadingRef.current &&
        !isRefresh
      ) {
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

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json?.message ||
              "Failed to load conversations."
          );
        }

        const data =
          json?.conversations ||
          json?.data ||
          [];

        const normalized =
          Array.isArray(data)
            ? sortConversations(data)
            : [];

        setConversations(normalized);

        /*
         * IMPORTANT:
         *
         * We intentionally DO NOT use:
         * unread_count
         * unread_messages_count
         * message.count
         *
         * The indicator is controlled locally.
         */
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

  /* =====================================================
     REALTIME MESSAGE
  ===================================================== */

  const handleRealtimeMessage = useCallback(
    (conversationId, payload) => {
      const realtimeMessage =
        payload?.message ||
        payload?.data?.message ||
        payload?.data ||
        payload;

      if (!realtimeMessage) {
        return;
      }

      const incomingConversationId =
        Number(
          realtimeMessage.conversation_id ??
            conversationId
        );

      const senderId = Number(
        realtimeMessage.sender_id ??
          realtimeMessage.sender?.id
      );

      const currentUserId =
        Number(user?.id);

      /*
       * Message from ME:
       *
       * update last message,
       * but DON'T show new message indicator.
       */
      const isMine =
        senderId === currentUserId;

      setConversations((current) => {
        const index =
          current.findIndex(
            (conversation) =>
              Number(conversation.id) ===
              incomingConversationId
          );

        if (index === -1) {
          setTimeout(() => {
            loadConversations();
          }, 0);

          return current;
        }

        const oldConversation =
          current[index];

        const oldLastMessage =
          getLastMessageObject(
            oldConversation
          );

        const updatedLastMessage = {
          ...(oldLastMessage || {}),
          ...realtimeMessage,
        };

        if (
          Object.prototype.hasOwnProperty.call(
            realtimeMessage,
            "product"
          )
        ) {
          updatedLastMessage.product =
            realtimeMessage.product;
        }

        const updatedConversation = {
          ...oldConversation,

          lastMessage:
            updatedLastMessage,

          last_message:
            updatedLastMessage,

          last_message_at:
            realtimeMessage.created_at ||
            oldConversation.last_message_at,

          updated_at:
            realtimeMessage.created_at ||
            oldConversation.updated_at,
        };

        const next = [...current];

        next.splice(index, 1);
        next.unshift(updatedConversation);

        return next;
      });

      /*
       * ONLY incoming messages create
       * the green "new message" indicator.
       */
      if (!isMine) {
        setNewMessageConversations(
          (current) => {
            const next = new Set(current);

            next.add(
              String(incomingConversationId)
            );

            return next;
          }
        );
      }
    },
    [
      user?.id,
      loadConversations,
      getLastMessageObject,
    ]
  );

  /* =====================================================
     SUBSCRIBE
  ===================================================== */

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

          const key =
            String(conversationId);

          if (
            subscriptionsRef.current.has(
              key
            )
          ) {
            return;
          }

          try {
            const result =
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
              result || true
            );
          } catch (err) {
            console.error(
              `❌ Reverb subscription failed: conversation.${conversationId}`,
              err
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

  /* =====================================================
     EFFECTS
  ===================================================== */

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    subscribeToAllConversations();
  }, [subscribeToAllConversations]);

  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(
        (_, conversationId) => {
          try {
            unsubscribeFromConversation(
              conversationId
            );
          } catch (err) {
            console.log(
              "❌ Reverb unsubscribe error:",
              err
            );
          }
        }
      );

      subscriptionsRef.current.clear();
    };
  }, []);

  /* =====================================================
     OPEN CHAT
  ===================================================== */

  const openConversation = useCallback(
    (conversation) => {
      /*
       * Remove indicator BEFORE opening.
       */
      setNewMessageConversations(
        (current) => {
          const next = new Set(current);

          next.delete(
            String(conversation.id)
          );

          return next;
        }
      );

      const otherUser =
        getOtherUser(conversation);

      const lastMessage =
        getLastMessageObject(
          conversation
        );

      const product =
        lastMessage?.product || null;

      navigation.navigate("Chat", {
        conversationId:
          conversation.id,

        otherUser,

        sellerId:
          conversation?.seller_id ??
          null,

        product,

        productId:
          product?.id ?? null,
      });
    },
    [
      getOtherUser,
      getLastMessageObject,
      navigation,
    ]
  );

  /* =====================================================
     RENDER ITEM
  ===================================================== */

  const renderConversation =
    useCallback(
      ({ item }) => {
        const otherUser =
          getOtherUser(item);

        const lastMessage =
          getLastMessage(item);

        const lastMessageDate =
          getLastMessageDate(item);

        const lastMessageObject =
          getLastMessageObject(item);

        const product =
          getLastMessageProduct(item);

        const productImage =
          getProductImage(item);

        const hasNewMessage =
          newMessageConversations.has(
            String(item.id)
          );

        const senderId = Number(
          lastMessageObject?.sender_id ??
            lastMessageObject?.sender?.id
        );

        const currentUserId =
          Number(user?.id);

        const lastMessageIsMine =
          Boolean(
            lastMessageObject &&
              senderId ===
                currentUserId
          );

        const avatar =
          productImage ||
          normalizeMediaUrl(
            otherUser?.avatar
          );

        return (
          <Pressable
            onPress={() =>
              openConversation(item)
            }
            android_ripple={{
              color:
                "rgba(20,106,99,0.08)",
            }}
            style={({ pressed }) => [
              styles.conversationItem,

              {
                minHeight:
                  tokens.rowMinHeight,

                paddingHorizontal:
                  tokens.rowPaddingH,

                paddingVertical:
                  tokens.rowPaddingV,
              },

              hasNewMessage &&
                styles.conversationNew,

              pressed &&
              Platform.OS === "ios"
                ? {
                    backgroundColor:
                      COLORS.surfaceHover,
                  }
                : null,
            ]}
          >
            {/* =========================================
                AVATAR
            ========================================= */}

            <View
              style={[
                styles.avatarWrap,
                {
                  width:
                    tokens.avatarSize,

                  height:
                    tokens.avatarSize,

                  marginRight:
                    tokens.avatarMarginRight,
                },
              ]}
            >
              {avatar ? (
                <Image
                  source={{
                    uri: avatar,
                  }}
                  style={{
                    width:
                      tokens.avatarSize,

                    height:
                      tokens.avatarSize,

                    borderRadius:
                      tokens.avatarRadius,

                    backgroundColor:
                      COLORS.surfaceHover,
                  }}
                />
              ) : (
                <View
                  style={{
                    width:
                      tokens.avatarSize,

                    height:
                      tokens.avatarSize,

                    borderRadius:
                      tokens.avatarRadius,

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    backgroundColor:
                      COLORS.accent,
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.bg,

                      fontSize:
                        tokens.avatarTextSize,

                      fontWeight:
                        "800",
                    }}
                  >
                    {(otherUser?.name ||
                      "?")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              {/* NEW MESSAGE DOT */}

              {hasNewMessage && (
                <View
                  style={[
                    styles.newMessageDot,
                    {
                      width:
                        tokens.newDotSize,

                      height:
                        tokens.newDotSize,

                      borderRadius:
                        tokens.newDotSize /
                        2,
                    },
                  ]}
                />
              )}
            </View>

            {/* =========================================
                CONTENT
            ========================================= */}

            <View
              style={[
                styles.conversationContent,
                {
                  marginRight:
                    tokens.contentMarginRight,
                },
              ]}
            >
              <View
                style={
                  styles.topRow
                }
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.userName,

                    {
                      fontSize:
                        tokens.userNameSize,
                    },

                    hasNewMessage &&
                      styles.userNameNew,
                  ]}
                >
                  {otherUser?.name ||
                    "Unknown user"}
                </Text>

                <Text
                  style={[
                    styles.time,

                    {
                      fontSize:
                        tokens.timeSize,
                    },

                    hasNewMessage &&
                      styles.timeNew,
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
                  style={[
                    styles.productName,

                    {
                      fontSize:
                        tokens.productNameSize,
                    },
                  ]}
                >
                  {product.name}
                </Text>
              )}

              <View
                style={
                  styles.messageRow
                }
              >
                {lastMessageIsMine && (
                  <CheckCheck
                    size={
                      tokens.checkIconSize
                    }
                    color={
                      COLORS.textDim
                    }
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

                    {
                      fontSize:
                        tokens.lastMessageSize,
                    },

                    hasNewMessage &&
                      styles.lastMessageNew,
                  ]}
                >
                  {lastMessage}
                </Text>
              </View>
            </View>

            {/* =========================================
                RIGHT SIDE
            ========================================= */}

            {hasNewMessage ? (
              <View
                style={[
                  styles.newMessageBadge,
                  {
                    width:
                      tokens.newDotSize +
                      10,

                    height:
                      tokens.newDotSize +
                      10,

                    borderRadius:
                      (tokens.newDotSize +
                        10) /
                      2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.innerNewDot,
                    {
                      width:
                        tokens.newDotSize -
                        1,

                      height:
                        tokens.newDotSize -
                        1,

                      borderRadius:
                        (tokens.newDotSize -
                          1) /
                        2,
                    },
                  ]}
                />
              </View>
            ) : (
              <ChevronRight
                size={
                  tokens.chevronSize
                }
                color={
                  COLORS.textDim
                }
              />
            )}
          </Pressable>
        );
      },
      [
        getOtherUser,
        getLastMessage,
        getLastMessageDate,
        getLastMessageObject,
        getLastMessageProduct,
        getProductImage,
        normalizeMediaUrl,
        user?.id,
        formatTime,
        openConversation,
        newMessageConversations,
        tokens,
      ]
    );

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop:
              insets.top,

            paddingBottom:
              insets.bottom,
          },
        ]}
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={
              COLORS.accent
            }
          />

          <Text
            style={[
              styles.loadingText,
              {
                fontSize:
                  tokens.loadingTextSize,
              },
            ]}
          >
            Loading chats...
          </Text>
        </View>
      </View>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (
    error &&
    conversations.length === 0
  ) {
    return (
      <View
        style={
          styles.container
        }
      >
        <View
          style={[
            styles.header,
            {
              paddingTop:
                insets.top,

              paddingHorizontal:
                tokens.headerPaddingH,

              minHeight:
                insets.top +
                tokens.headerMinHeight,
            },
          ]}
        >
          <Pressable
            onPress={() =>
              navigation.goBack()
            }
            style={[
              styles.backButton,
              {
                width:
                  tokens.backButtonSize,

                height:
                  tokens.backButtonSize,

                borderRadius:
                  tokens.backButtonRadius,

                marginRight:
                  tokens.backButtonMarginRight,
              },
            ]}
            hitSlop={8}
          >
            <ArrowLeft
              size={
                tokens.backIconSize
              }
              color={
                COLORS.accent
              }
            />
          </Pressable>

          <Text
            style={[
              styles.headerTitle,
              {
                fontSize:
                  tokens.headerTitleSize,
              },
            ]}
          >
            Chats
          </Text>

          <View
            style={{
              width:
                tokens.backButtonSize,

              height:
                tokens.backButtonSize,
            }}
          />
        </View>

        <View
          style={[
            styles.errorContainer,
            {
              paddingBottom:
                insets.bottom,
            },
          ]}
        >
          <RefreshCw
            size={
              tokens.errorIconSize
            }
            color={
              COLORS.accent
            }
          />

          <Text
            style={[
              styles.errorTitle,
              {
                fontSize:
                  tokens.errorTitleSize,
              },
            ]}
          >
            Couldn't load chats
          </Text>

          <Text
            style={[
              styles.errorMessage,
              {
                fontSize:
                  tokens.errorMessageSize,
              },
            ]}
          >
            {error}
          </Text>

          <Pressable
            style={[
              styles.retryButton,
              {
                paddingHorizontal:
                  tokens.retryPadH,

                paddingVertical:
                  tokens.retryPadV,

                borderRadius:
                  tokens.retryRadius,
              },
            ]}
            onPress={() =>
              loadConversations()
            }
          >
            <Text
              style={[
                styles.retryText,
                {
                  fontSize:
                    tokens.retryTextSize,
                },
              ]}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* =====================================================
     MAIN
  ===================================================== */

  return (
    <View
      style={
        styles.container
      }
    >
      {/* HEADER */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top,

            paddingHorizontal:
              tokens.headerPaddingH,

            minHeight:
              insets.top +
              tokens.headerMinHeight,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            navigation.goBack()
          }
          style={[
            styles.backButton,
            {
              width:
                tokens.backButtonSize,

              height:
                tokens.backButtonSize,

              borderRadius:
                tokens.backButtonRadius,

              marginRight:
                tokens.backButtonMarginRight,
            },
          ]}
          hitSlop={8}
        >
          <ArrowLeft
            size={
              tokens.backIconSize
            }
            color={
              COLORS.accent
            }
          />
        </Pressable>

        <View
          style={
            styles.titleContainer
          }
        >
          <Text
            style={[
              styles.headerTitle,
              {
                fontSize:
                  tokens.headerTitleSize,
              },
            ]}
          >
            Chats
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                fontSize:
                  tokens.headerSubtitleSize,
              },
            ]}
          >
            {conversations.length}{" "}
            conversation
            {conversations.length !==
            1
              ? "s"
              : ""}
          </Text>
        </View>

        <View
          style={[
            styles.chatIcon,
            {
              width:
                tokens.chatIconSize,

              height:
                tokens.chatIconSize,

              borderRadius:
                tokens.chatIconRadius,
            },
          ]}
        >
          <MessageCircle
            size={
              tokens.chatIconGlyph
            }
            color={
              COLORS.accent
            }
          />
        </View>
      </View>

      {/* LIST */}

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
        contentContainerStyle={[
          conversations.length === 0
            ? styles.emptyList
            : {
                paddingVertical:
                  tokens.listPaddingV,
              },

          {
            paddingBottom:
              insets.bottom +
              tokens.listPaddingV,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              loadConversations(
                true
              )
            }
            tintColor={
              COLORS.accent
            }
            colors={[
              COLORS.accent,
            ]}
            progressBackgroundColor={
              COLORS.surface
            }
          />
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyContainer,
              {
                paddingBottom:
                  insets.bottom,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                {
                  width:
                    tokens.emptyIconSize,

                  height:
                    tokens.emptyIconSize,

                  borderRadius:
                    tokens.emptyIconRadius,
                },
              ]}
            >
              <MessageCircle
                size={
                  tokens.emptyIconGlyph
                }
                color={
                  COLORS.accent
                }
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                {
                  fontSize:
                    tokens.emptyTitleSize,
                },
              ]}
            >
              No conversations
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  fontSize:
                    tokens.emptyTextSize,

                  lineHeight:
                    tokens.emptyTextLineHeight,
                },
              ]}
            >
              When you contact a
              seller or someone
              contacts you, your
              conversations will
              appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default ChatListScreen;

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",

    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.borderStrong,

    backgroundColor:
      COLORS.surface,
  },

  backButton: {
    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      COLORS.surfaceHover,
  },

  titleContainer: {
    flex: 1,
  },

  headerTitle: {
    color: COLORS.text,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: COLORS.textMuted,
    marginTop: 2,
  },

  chatIcon: {
    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      COLORS.surfaceHover,
  },

  /* CONVERSATION */

  conversationItem: {
    flexDirection: "row",
    alignItems: "center",

    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  conversationNew: {
    backgroundColor:
      "rgba(20,106,99,0.045)",
  },

  /* AVATAR */

  avatarWrap: {
    position: "relative",
  },

  newMessageDot: {
    position: "absolute",

    right: -2,
    top: -2,

    backgroundColor:
      COLORS.newMessage,

    borderWidth: 2,
    borderColor:
      COLORS.bg,
  },

  /* CONTENT */

  conversationContent: {
    flex: 1,
    minWidth: 0,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  userName: {
    flex: 1,

    color: COLORS.text,
    fontWeight: "700",

    marginRight: 8,
  },

  userNameNew: {
    fontWeight: "900",
  },

  time: {
    color: COLORS.textMuted,
  },

  timeNew: {
    color: COLORS.accent,
    fontWeight: "800",
  },

  productName: {
    color: COLORS.accent,
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
    color: COLORS.textMuted,
  },

  lastMessageNew: {
    color: COLORS.text,
    fontWeight: "700",
  },

  /* RIGHT SIDE */

  newMessageBadge: {
    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(20,106,99,0.10)",

    marginLeft: 8,
  },

  innerNewDot: {
    backgroundColor:
      COLORS.newMessage,
  },

  /* EMPTY */

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
    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      COLORS.surfaceSoft,

    marginBottom: 18,
  },

  emptyTitle: {
    color: COLORS.text,
    fontWeight: "800",
  },

  emptyText: {
    color: COLORS.textMuted,

    textAlign: "center",

    marginTop: 8,
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
  },

  /* ERROR */

  errorContainer: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 30,
  },

  errorTitle: {
    color: COLORS.text,
    fontWeight: "800",

    marginTop: 15,
  },

  errorMessage: {
    color: COLORS.textMuted,

    textAlign: "center",

    marginTop: 8,
  },

  retryButton: {
    marginTop: 20,

    backgroundColor:
      COLORS.accent,
  },

  retryText: {
    color: COLORS.bg,
    fontWeight: "800",
  },
});