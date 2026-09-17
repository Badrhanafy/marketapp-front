import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { BlurView } from "expo-blur";

import {
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  Send,
} from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { media_URL } from "../../constants/config";
import { getUser } from "../../api/auth";

import {
  subscribeToConversation,
  unsubscribeFromConversation,
  getReverbSocketId,
} from "../../services/reverb";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://192.168.8.5:8000/api";



// ============================================================
// HELPERS
// ============================================================

const idOf = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

const sameId = (a, b) => {
  if (a === null || a === undefined) return false;
  if (b === null || b === undefined) return false;

  return String(a) === String(b);
};


// ------------------------------------------------------------
// MEDIA URL NORMALIZER
// media_URL === "http://192.168.8.5:8000/"
// ------------------------------------------------------------

const normalizeMediaUrl = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  let cleanPath = trimmed.replace(/^\/+/, "");

  cleanPath = cleanPath.replace(
    /^storage\/+/i,
    ""
  );

  return `${media_URL}storage/${cleanPath}`;
};


// ------------------------------------------------------------
// PRODUCT IMAGE
// First image of product.media[] sorted by order
// ------------------------------------------------------------

const getProductImage = (conversation) => {
  if (!conversation) {
    return null;
  }

  const product =
    conversation.product ??
    conversation.product_item ??
    conversation.item ??
    null;

  if (!product) {
    return null;
  }

  const mediaList =
    product.media ??
    product.product_media ??
    product.productMedia ??
    product.media_items ??
    [];

  if (Array.isArray(mediaList) && mediaList.length > 0) {
    const sorted = [...mediaList].sort(
      (a, b) =>
        Number(
          a?.order ??
            a?.position ??
            a?.sort ??
            0
        ) -
        Number(
          b?.order ??
            b?.position ??
            b?.sort ??
            0
        )
    );

    for (const item of sorted) {
      const path =
        typeof item === "string"
          ? item
          : item?.path ??
            item?.url ??
            item?.image ??
            item?.image_url ??
            item?.src ??
            null;

      const url = normalizeMediaUrl(path);

      if (url) {
        return url;
      }
    }
  }

  const directImage =
    product.image ??
    product.image_url ??
    product.thumbnail ??
    product.photo ??
    null;

  return normalizeMediaUrl(directImage);
};


// ------------------------------------------------------------
// PRODUCT INFO (for dropdown)
// ------------------------------------------------------------

const getProductInfo = (conversation) => {
  if (!conversation) {
    return null;
  }

  const product =
    conversation.product ??
    conversation.product_item ??
    conversation.item ??
    null;

  if (!product) {
    return null;
  }

  const rawPrice =
    product.price ??
    product.amount ??
    product.unit_price ??
    null;

  let formattedPrice = null;

  if (rawPrice !== null && rawPrice !== undefined) {
    const asNumber = Number(rawPrice);

    formattedPrice = Number.isNaN(asNumber)
      ? String(rawPrice)
      : asNumber.toLocaleString();
  }

  return {
    id: product.id ?? null,

    name:
      product.name ??
      product.title ??
      "Product",

    price: formattedPrice,

    currency:
      product.currency ??
      product.currency_code ??
      "MAD",

    description:
      product.description ??
      product.short_description ??
      null,

    condition:
      product.condition ??
      product.state ??
      null,

    category:
      product.category?.name ??
      (typeof product.category === "string"
        ? product.category
        : null),

    image: getProductImage(conversation),
  };
};


// IMPORTANT:
// sender_id comes ONLY from sender_id or sender.id.
const normalizeMessage = (
  raw,
  fallbackSenderId = null
) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id =
    raw.id ??
    raw.message_id ??
    raw.messageId ??
    null;

  if (id === null || id === undefined) {
    return null;
  }

  const senderId =
    raw.sender_id ??
    raw.sender?.id ??
    fallbackSenderId ??
    null;

  const message =
    typeof raw.message === "string"
      ? raw.message
      : typeof raw.body === "string"
      ? raw.body
      : "";

  return {
    id,

    conversation_id:
      raw.conversation_id ??
      raw.conversation?.id ??
      null,

    sender_id: senderId,

    message,

    read_at: raw.read_at ?? null,

    created_at:
      raw.created_at ??
      new Date().toISOString(),

    updated_at:
      raw.updated_at ?? null,

    sender:
      raw.sender
        ? {
            id:
              raw.sender.id ??
              senderId ??
              null,

            name:
              raw.sender.name ?? "",

            avatar:
              raw.sender.avatar ?? null,
          }
        : null,
  };
};


const extractMessages = (json) => {
  const list =
    json?.messages ??
    json?.data?.messages ??
    json?.data ??
    [];

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((item) => normalizeMessage(item))
    .filter(Boolean)
    .filter(
      (item) =>
        typeof item.message === "string" &&
        item.message.length > 0
    )
    .sort(
      (a, b) =>
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
    );
};


// ============================================================
// COMPONENT
// ============================================================

export default function ChatScreen({
  route,
  navigation,
}) {
  const { user, token } = useAuth();

  const {
    playNewMessageSound,
  } = useNotifications();

  const conversationId =
    route?.params?.conversationId ??
    route?.params?.id ??
    route?.params?.conversation?.id;

  const conversationFromRoute =
    route?.params?.conversation ?? null;

  const [currentUser, setCurrentUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [conversation, setConversation] =
    useState(conversationFromRoute);

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [unreadMessages, setUnreadMessages] =
    useState(0);

  // Background product image failed to load
  const [backgroundFailed, setBackgroundFailed] =
    useState(false);

  // Product info dropdown
  const [showProductInfo, setShowProductInfo] =
    useState(false);

  const dropdownAnim =
    useRef(new Animated.Value(0)).current;

  const flatListRef =
    useRef(null);

  const messageIdsRef =
    useRef(new Set());

  const mountedRef =
    useRef(true);


  // ============================================================
  // CURRENT USER
  // ============================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);


  useEffect(() => {
    let mounted = true;

    const loadCurrentUser = async () => {
      if (!token) {
        if (mounted) {
          setAuthLoading(false);
        }

        return;
      }

      try {
        setAuthLoading(true);

        const response =
          await getUser(token);

        const loggedUser =
          response?.user ??
          response?.data ??
          response;

        console.log(
          "🔥 /user RESPONSE:",
          response
        );

        console.log(
          "🔥 CURRENT USER:",
          loggedUser
        );

        if (mounted) {
          setCurrentUser(loggedUser);
        }
      } catch (error) {
        console.log(
          "❌ /user ERROR:",
          error?.response?.data ||
            error?.message ||
            error
        );

        if (
          mounted &&
          user?.id
        ) {
          setCurrentUser(user);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, [token, user]);


  const currentUserId =
    useMemo(
      () => idOf(currentUser?.id),
      [currentUser?.id]
    );


  // ============================================================
  // PRODUCT BACKGROUND
  // ============================================================

  const productImage =
    useMemo(() => {
      return getProductImage(
        conversation
      );
    }, [conversation]);


  // Product info for dropdown
  const productInfo =
    useMemo(() => {
      return getProductInfo(conversation);
    }, [conversation]);


  // Reset failure flag when resolved image changes
  useEffect(() => {
    setBackgroundFailed(false);
  }, [productImage]);


  // Auto close dropdown if there is no product
  useEffect(() => {
    if (!productInfo && showProductInfo) {
      setShowProductInfo(false);
    }
  }, [productInfo, showProductInfo]);


  // Dropdown animation
  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: showProductInfo ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [showProductInfo, dropdownAnim]);


  const toggleProductInfo = useCallback(() => {
    if (!productInfo) {
      return;
    }

    setShowProductInfo((value) => !value);
  }, [productInfo]);


  // ============================================================
  // HEADERS
  // ============================================================

  const getHeaders =
    useCallback(() => {
      return {
        Accept:
          "application/json",

        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      };
    }, [token]);


  // ============================================================
  // ADD MESSAGE
  // ============================================================

  const addMessage =
    useCallback(
      (
        rawMessage,
        fallbackSenderId = null
      ) => {
        const normalized =
          normalizeMessage(
            rawMessage,
            fallbackSenderId
          );

        if (!normalized) {
          return false;
        }

        if (
          conversationId &&
          normalized.conversation_id &&
          !sameId(
            normalized.conversation_id,
            conversationId
          )
        ) {
          return false;
        }

        if (
          !normalized.message ||
          !normalized.message.trim()
        ) {
          return false;
        }

        const messageId =
          String(normalized.id);

        if (
          messageIdsRef.current.has(
            messageId
          )
        ) {
          return false;
        }

        messageIdsRef.current.add(
          messageId
        );

        setMessages(
          (previous) => {
            const exists =
              previous.some(
                (item) =>
                  String(item.id) ===
                  messageId
              );

            if (exists) {
              return previous;
            }

            return [
              ...previous,
              normalized,
            ].sort(
              (a, b) =>
                new Date(
                  a.created_at || 0
                ).getTime() -
                new Date(
                  b.created_at || 0
                ).getTime()
            );
          }
        );

        return true;
      },
      [conversationId]
    );


  // ============================================================
  // LOAD CONVERSATION
  // ============================================================

  const loadConversation =
    useCallback(
      async () => {
        if (
          !conversationId ||
          !token
        ) {
          return;
        }

        try {
          const response =
            await fetch(
              `${API_URL}/conversations/${conversationId}`,
              {
                method: "GET",
                headers:
                  getHeaders(),
              }
            );

          if (!response.ok) {
            return;
          }

          const json =
            await response.json();

          console.log(
            "💬 CONVERSATION:",
            json
          );

          const data =
            json?.data ??
            json?.conversation ??
            json;

          if (
            mountedRef.current
          ) {
            setConversation(data);
          }
        } catch (error) {
          console.log(
            "❌ Conversation error:",
            error?.message ||
              error
          );
        }
      },
      [
        conversationId,
        token,
        getHeaders,
      ]
    );


  // ============================================================
  // LOAD MESSAGES
  // ============================================================

  const loadMessages =
    useCallback(
      async () => {
        if (
          !conversationId ||
          !token
        ) {
          return;
        }

        try {
          setLoading(true);

          messageIdsRef.current.clear();

          const response =
            await fetch(
              `${API_URL}/conversations/${conversationId}/messages`,
              {
                method: "GET",
                headers:
                  getHeaders(),
              }
            );

          const json =
            await response.json();

          if (!response.ok) {
            throw new Error(
              json?.message ||
                "Failed to load messages."
            );
          }

          const loaded =
            extractMessages(json);

          loaded.forEach(
            (item) => {
              messageIdsRef.current.add(
                String(item.id)
              );
            }
          );

          if (
            mountedRef.current
          ) {
            setMessages(
              loaded
            );
          }

          setTimeout(() => {
            flatListRef.current?.scrollToEnd(
              {
                animated: false,
              }
            );
          }, 200);
        } catch (error) {
          console.log(
            "❌ Load messages error:",
            error?.message ||
              error
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [
        conversationId,
        token,
        getHeaders,
      ]
    );


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    if (
      !conversationId ||
      !token
    ) {
      return;
    }

    loadConversation();
    loadMessages();
  }, [
    conversationId,
    token,
    loadConversation,
    loadMessages,
  ]);


  // ============================================================
  // REALTIME REVERB
  // ============================================================

  useEffect(() => {
    if (
      !conversationId ||
      !token ||
      !currentUserId
    ) {
      return;
    }

    const handleMessage =
      (event) => {
        const incoming =
          event?.message ??
          event?.data?.message ??
          event?.data ??
          event;

        const normalized =
          normalizeMessage(
            incoming
          );

        if (!normalized) {
          return;
        }

        if (
          normalized.conversation_id &&
          !sameId(
            normalized.conversation_id,
            conversationId
          )
        ) {
          return;
        }

        const mine =
          sameId(
            normalized.sender_id,
            currentUserId
          );

        const wasAdded =
          addMessage(
            normalized
          );

        if (
          wasAdded &&
          !mine
        ) {
          playNewMessageSound?.();

          setUnreadMessages(
            (value) =>
              value + 1
          );
        }

        setTimeout(() => {
          flatListRef.current?.scrollToEnd(
            {
              animated: true,
            }
          );
        }, 100);
      };

    try {
      subscribeToConversation(
        conversationId,
        handleMessage
      );
    } catch (error) {
      console.log(
        "❌ Reverb subscribe error:",
        error
      );
    }

    return () => {
      try {
        unsubscribeFromConversation(
          conversationId
        );
      } catch (error) {
        console.log(
          "❌ Reverb unsubscribe error:",
          error
        );
      }
    };
  }, [
    conversationId,
    token,
    currentUserId,
    addMessage,
    playNewMessageSound,
  ]);


  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage =
    useCallback(
      async () => {
        const text =
          input.trim();

        if (
          !text ||
          !conversationId ||
          !token ||
          !currentUserId ||
          sending
        ) {
          return;
        }

        setInput("");
        setSending(true);

        try {
          const socketId =
            getReverbSocketId();

          const headers =
            getHeaders();

          if (socketId) {
            headers[
              "X-Socket-ID"
            ] = socketId;
          }

          const response =
            await fetch(
              `${API_URL}/conversations/${conversationId}/messages`,
              {
                method: "POST",

                headers,

                body:
                  JSON.stringify({
                    message: text,
                  }),
              }
            );

          const json =
            await response.json();

          if (!response.ok) {
            throw new Error(
              json?.message ||
                "Failed to send message."
            );
          }

          const sentMessage =
            json?.data ??
            json?.message ??
            null;

          if (!sentMessage) {
            return;
          }

          const normalized =
            normalizeMessage(
              sentMessage,
              currentUserId
            );

          if (normalized) {
            addMessage(
              normalized,
              currentUserId
            );
          }

          setTimeout(() => {
            flatListRef.current?.scrollToEnd(
              {
                animated: true,
              }
            );
          }, 100);
        } catch (error) {
          console.error(
            "❌ SEND MESSAGE ERROR:",
            error?.message ||
              error
          );

          setInput(text);
        } finally {
          if (
            mountedRef.current
          ) {
            setSending(false);
          }
        }
      },
      [
        input,
        conversationId,
        token,
        currentUserId,
        sending,
        getHeaders,
        addMessage,
      ]
    );


  // ============================================================
  // SCROLL
  // ============================================================

  const scrollToBottom =
    useCallback(() => {
      flatListRef.current?.scrollToEnd(
        {
          animated: true,
        }
      );

      setUnreadMessages(0);
    }, []);


  // ============================================================
  // OTHER USER
  // ============================================================

  const otherUser =
    useMemo(() => {
      if (!conversation) {
        return null;
      }

      const buyer =
        conversation.buyer ??
        conversation.buyer_user ??
        null;

      const seller =
        conversation.seller ??
        conversation.seller_user ??
        null;

      if (
        buyer &&
        !sameId(
          buyer.id,
          currentUserId
        )
      ) {
        return buyer;
      }

      if (
        seller &&
        !sameId(
          seller.id,
          currentUserId
        )
      ) {
        return seller;
      }

      if (
        conversation.buyer_id &&
        !sameId(
          conversation.buyer_id,
          currentUserId
        )
      ) {
        return {
          id:
            conversation.buyer_id,
          name: "User",
        };
      }

      if (
        conversation.seller_id &&
        !sameId(
          conversation.seller_id,
          currentUserId
        )
      ) {
        return {
          id:
            conversation.seller_id,
          name: "User",
        };
      }

      return null;
    }, [
      conversation,
      currentUserId,
    ]);


  // ============================================================
  // AVATAR
  // ============================================================

  const getAvatarUrl =
    (avatar) => {
      return normalizeMediaUrl(avatar);
    };


  // ============================================================
  // DATE
  // ============================================================

  const formatTime =
    (date) => {
      if (!date) {
        return "";
      }

      const d =
        new Date(date);

      if (
        Number.isNaN(
          d.getTime()
        )
      ) {
        return "";
      }

      return d.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };


  const formatDate =
    (date) => {
      if (!date) {
        return "";
      }

      const d =
        new Date(date);

      if (
        Number.isNaN(
          d.getTime()
        )
      ) {
        return "";
      }

      const today =
        new Date();

      const yesterday =
        new Date();

      yesterday.setDate(
        yesterday.getDate() - 1
      );

      if (
        d.toDateString() ===
        today.toDateString()
      ) {
        return "Today";
      }

      if (
        d.toDateString() ===
        yesterday.toDateString()
      ) {
        return "Yesterday";
      }

      return d.toLocaleDateString(
        [],
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    };


  // ============================================================
  // DATE SEPARATOR
  // ============================================================

  const shouldShowDate =
    (index) => {
      if (index === 0) {
        return true;
      }

      const current =
        messages[index];

      const previous =
        messages[index - 1];

      const currentDate =
        new Date(
          current.created_at
        ).toDateString();

      const previousDate =
        new Date(
          previous.created_at
        ).toDateString();

      return (
        currentDate !==
        previousDate
      );
    };


  // ============================================================
  // RENDER MESSAGE
  // ============================================================

  const renderMessage =
    ({ item, index }) => {
      const isMine =
        currentUserId !== null &&
        sameId(
          item.sender_id,
          currentUserId
        );

      const avatar =
        getAvatarUrl(
          item.sender?.avatar
        );

      return (
        <View>
          {shouldShowDate(
            index
          ) && (
            <View
              style={
                styles.dateContainer
              }
            >
              <BlurView
                intensity={28}
                tint="dark"
                style={
                  styles.dateBadge
                }
              >
                <Text
                  style={
                    styles.dateText
                  }
                >
                  {formatDate(
                    item.created_at
                  )}
                </Text>
              </BlurView>
            </View>
          )}

          <View
            style={[
              styles.messageRow,
              isMine
                ? styles.messageRowMine
                : styles.messageRowOther,
            ]}
          >
            {!isMine && (
              <View
                style={
                  styles.avatarContainer
                }
              >
                {avatar ? (
                  <Image
                    source={{
                      uri: avatar,
                    }}
                    style={
                      styles.avatar
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.avatarPlaceholder
                    }
                  >
                    <Text
                      style={
                        styles.avatarLetter
                      }
                    >
                      {(
                        item.sender?.name ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View
              style={[
                styles.messageBubble,
                isMine
                  ? styles.myBubble
                  : styles.otherBubble,
              ]}
            >
              {!isMine &&
                item.sender?.name && (
                  <Text
                    style={
                      styles.senderName
                    }
                  >
                    {item.sender.name}
                  </Text>
                )}

              <Text
                style={[
                  styles.messageText,
                  isMine
                    ? styles.myMessageText
                    : styles.otherMessageText,
                ]}
              >
                {item.message}
              </Text>

              <View
                style={
                  styles.messageMeta
                }
              >
                <Text
                  style={[
                    styles.timeText,
                    isMine
                      ? styles.myTimeText
                      : styles.otherTimeText,
                  ]}
                >
                  {formatTime(
                    item.created_at
                  )}
                </Text>

                {isMine && (
                  <CheckCheck
                    size={15}
                    strokeWidth={2.4}
                    color="#8ff0b8"
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      );
    };


  // ============================================================
  // LOADING
  // ============================================================

  if (
    authLoading ||
    (loading &&
      messages.length === 0)
  ) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#65e69a"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // ============================================================
  // UI
  // ============================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      {/* ======================================================
          PRODUCT BACKGROUND
      ====================================================== */}

      {productImage &&
      !backgroundFailed ? (
        <Image
          key={productImage}
          source={{
            uri: productImage,
          }}
          style={
            styles.backgroundImage
          }
          resizeMode="cover"
          onError={() => {
            console.log(
              "❌ Background image failed:",
              productImage
            );

            if (
              mountedRef.current
            ) {
              setBackgroundFailed(
                true
              );
            }
          }}
        />
      ) : (
        <View
          style={
            styles.backgroundFallback
          }
        />
      )}

      <View
        pointerEvents="none"
        style={
          styles.backgroundDarkOverlay
        }
      />

      <BlurView
        pointerEvents="none"
        intensity={42}
        tint="dark"
        style={
          styles.fullScreenBlur
        }
      />

      <View
        pointerEvents="none"
        style={
          styles.glassOverlay
        }
      />


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <KeyboardAvoidingView
        style={
          styles.keyboardContainer
        }
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={
          Platform.OS === "ios"
            ? 5
            : 0
        }
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={
            styles.headerOuter
          }
        >
          <BlurView
            intensity={35}
            tint="dark"
            style={
              styles.headerBlur
            }
          />

          <View
            style={
              styles.headerGlass
            }
          >
            <TouchableOpacity
              style={
                styles.backButton
              }
              onPress={() =>
                navigation.goBack()
              }
            >
              <ArrowLeft
                size={23}
                color="#ffffff"
                strokeWidth={2.2}
              />
            </TouchableOpacity>

            <View
              style={
                styles.headerAvatarContainer
              }
            >
              {getAvatarUrl(
                otherUser?.avatar
              ) ? (
                <Image
                  source={{
                    uri:
                      getAvatarUrl(
                        otherUser.avatar
                      ),
                  }}
                  style={
                    styles.headerAvatar
                  }
                />
              ) : (
                <View
                  style={
                    styles.headerAvatarPlaceholder
                  }
                >
                  <Text
                    style={
                      styles.headerAvatarLetter
                    }
                  >
                    {(
                      otherUser?.name ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={
                styles.headerInfo
              }
            >
              <Text
                style={
                  styles.headerName
                }
                numberOfLines={1}
              >
                {otherUser?.name ||
                  "Conversation"}
              </Text>

              <View
                style={
                  styles.onlineRow
                }
              >
                <View
                  style={
                    styles.onlineDot
                  }
                />

                <Text
                  style={
                    styles.headerStatus
                  }
                >
                  Online
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.headerMore,
                !productInfo &&
                  styles.headerMoreDisabled,
              ]}
              onPress={toggleProductInfo}
              activeOpacity={0.7}
              disabled={!productInfo}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate:
                        dropdownAnim.interpolate(
                          {
                            inputRange: [
                              0, 1,
                            ],
                            outputRange: [
                              "0deg",
                              "180deg",
                            ],
                          }
                        ),
                    },
                  ],
                }}
              >
                <ChevronDown
                  size={21}
                  color="#ffffff"
                  strokeWidth={2}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>


        {/* ==================================================
            PRODUCT INFO DROPDOWN
        ================================================== */}

        {productInfo && (
          <Animated.View
            style={[
              styles.dropdownOuter,
              {
                opacity: dropdownAnim,

                maxHeight:
                  dropdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 320],
                  }),

                marginTop:
                  dropdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 6],
                  }),
              },
            ]}
            pointerEvents={
              showProductInfo
                ? "auto"
                : "none"
            }
          >
            <BlurView
              intensity={55}
              tint="dark"
              style={
                styles.dropdownBlur
              }
            />

            <View
              style={
                styles.dropdownGlass
              }
            >
              {productInfo.image ? (
                <Image
                  source={{
                    uri: productInfo.image,
                  }}
                  style={
                    styles.dropdownImage
                  }
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={
                    styles.dropdownImagePlaceholder
                  }
                >
                  <Text
                    style={
                      styles.dropdownImageLetter
                    }
                  >
                    {productInfo.name
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              <View
                style={
                  styles.dropdownInfo
                }
              >
                <Text
                  numberOfLines={2}
                  style={
                    styles.dropdownName
                  }
                >
                  {productInfo.name}
                </Text>

                <View
                  style={
                    styles.dropdownMetaRow
                  }
                >
                  {productInfo.price ? (
                    <Text
                      style={
                        styles.dropdownPrice
                      }
                    >
                      {productInfo.price}{" "}
                      <Text
                        style={
                          styles.dropdownCurrency
                        }
                      >
                        {productInfo.currency}
                      </Text>
                    </Text>
                  ) : null}

                  {productInfo.condition ? (
                    <View
                      style={
                        styles.dropdownBadge
                      }
                    >
                      <Text
                        style={
                          styles.dropdownBadgeText
                        }
                      >
                        {productInfo.condition}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {productInfo.category ? (
                  <Text
                    numberOfLines={1}
                    style={
                      styles.dropdownCategory
                    }
                  >
                    {productInfo.category}
                  </Text>
                ) : null}

                {productInfo.description ? (
                  <Text
                    numberOfLines={3}
                    style={
                      styles.dropdownDescription
                    }
                  >
                    {productInfo.description}
                  </Text>
                ) : null}
              </View>
            </View>
          </Animated.View>
        )}


        {/* ==================================================
            MESSAGES
        ================================================== */}

        <View
          style={
            styles.messagesContainer
          }
        >
          <FlatList
            ref={
              flatListRef
            }
            data={messages}
            keyExtractor={(item) =>
              String(item.id)
            }
            renderItem={
              renderMessage
            }
            contentContainerStyle={
              styles.messagesContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd(
                {
                  animated: false,
                }
              );
            }}
          />

          {unreadMessages > 0 && (
            <TouchableOpacity
              style={
                styles.unreadButton
              }
              onPress={
                scrollToBottom
              }
            >
              <Text
                style={
                  styles.unreadText
                }
              >
                {unreadMessages}
              </Text>

              <ChevronDown
                size={17}
                color="#ffffff"
              />
            </TouchableOpacity>
          )}
        </View>


        {/* ==================================================
            INPUT
        ================================================== */}

        <View
          style={
            styles.inputArea
          }
        >
          <BlurView
            intensity={45}
            tint="dark"
            style={
              styles.inputBlur
            }
          />

          <View
            style={
              styles.inputGlass
            }
          >
            <TextInput
              value={input}
              onChangeText={
                setInput
              }
              placeholder="Write a message..."
              placeholderTextColor="#b7b7b7"
              style={
                styles.input
              }
              multiline
              maxLength={5000}
              editable={!sending}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() ||
                  sending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={
                sendMessage
              }
              disabled={
                !input.trim() ||
                sending
              }
            >
              {sending ? (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                />
              ) : (
                <Send
                  size={19}
                  color="#ffffff"
                  strokeWidth={2.5}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#050505",
    },

    keyboardContainer: {
      flex: 1,
    },

    // ========================================================
    // BACKGROUND
    // ========================================================

    backgroundImage: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
    },

    backgroundFallback: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#07100c",
    },

    backgroundDarkOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor:
        "rgba(0,0,0,0.46)",
    },

    fullScreenBlur: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },

    glassOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor:
        "rgba(5,10,8,0.25)",
    },

    // ========================================================
    // HEADER
    // ========================================================

    headerOuter: {
      height: 68,
      marginHorizontal: 8,
      marginTop: 4,
      borderRadius: 22,
      overflow: "hidden",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.14)",

      backgroundColor:
        "rgba(10,15,13,0.35)",

      zIndex: 2,
    },

    headerBlur: {
      ...StyleSheet.absoluteFillObject,
    },

    headerGlass: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 7,
      backgroundColor:
        "rgba(0,0,0,0.22)",
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        "rgba(255,255,255,0.08)",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.10)",
    },

    headerAvatarContainer: {
      marginLeft: 9,
    },

    headerAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,

      borderWidth: 2,
      borderColor:
        "rgba(255,255,255,0.32)",
    },

    headerAvatarPlaceholder: {
      width: 42,
      height: 42,
      borderRadius: 21,

      backgroundColor:
        "rgba(27,126,79,0.82)",

      alignItems: "center",
      justifyContent: "center",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.18)",
    },

    headerAvatarLetter: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "800",
    },

    headerInfo: {
      flex: 1,
      marginLeft: 11,
    },

    headerName: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "800",
      maxWidth: "90%",
    },

    onlineRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
    },

    onlineDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#72e7a1",
      marginRight: 5,
    },

    headerStatus: {
      color: "#b4eac9",
      fontSize: 11,
      fontWeight: "600",
    },

    headerMore: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        "rgba(255,255,255,0.07)",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.10)",
    },

    headerMoreDisabled: {
      opacity: 0.4,
    },

    // ========================================================
    // PRODUCT INFO DROPDOWN
    // ========================================================

    dropdownOuter: {
      marginHorizontal: 8,
      borderRadius: 22,
      overflow: "hidden",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.14)",

      backgroundColor:
        "rgba(10,15,13,0.35)",

      zIndex: 1,
    },

    dropdownBlur: {
      ...StyleSheet.absoluteFillObject,
    },

    dropdownGlass: {
      flexDirection: "row",
      alignItems: "flex-start",

      paddingHorizontal: 12,
      paddingVertical: 12,

      backgroundColor:
        "rgba(0,0,0,0.32)",

      gap: 12,
    },

    dropdownImage: {
      width: 76,
      height: 76,
      borderRadius: 16,

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.18)",

      backgroundColor:
        "rgba(20,25,22,0.5)",
    },

    dropdownImagePlaceholder: {
      width: 76,
      height: 76,
      borderRadius: 16,

      backgroundColor:
        "rgba(27,126,79,0.55)",

      alignItems: "center",
      justifyContent: "center",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.18)",
    },

    dropdownImageLetter: {
      color: "#ffffff",
      fontSize: 26,
      fontWeight: "800",
    },

    dropdownInfo: {
      flex: 1,
    },

    dropdownName: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "800",
      lineHeight: 20,
    },

    dropdownMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: 5,
      gap: 6,
    },

    dropdownPrice: {
      color: "#8ff0b8",
      fontSize: 15,
      fontWeight: "800",
    },

    dropdownCurrency: {
      color: "#b9eecb",
      fontSize: 11,
      fontWeight: "700",
    },

    dropdownBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,

      borderRadius: 10,

      backgroundColor:
        "rgba(255,255,255,0.10)",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.14)",
    },

    dropdownBadgeText: {
      color: "#dcdcdc",
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },

    dropdownCategory: {
      color: "#a7b1ac",
      fontSize: 11,
      fontWeight: "600",
      marginTop: 5,
    },

    dropdownDescription: {
      color: "#cfd6d2",
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
    },

    // ========================================================
    // MESSAGES
    // ========================================================

    messagesContainer: {
      flex: 1,
    },

    messagesContent: {
      paddingHorizontal: 12,
      paddingTop: 14,
      paddingBottom: 16,
    },

    messageRow: {
      width: "100%",
      flexDirection: "row",
      marginBottom: 7,
      alignItems: "flex-end",
    },

    messageRowMine: {
      justifyContent: "flex-end",
    },

    messageRowOther: {
      justifyContent: "flex-start",
    },

    avatarContainer: {
      width: 30,
      marginRight: 7,
    },

    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.18)",
    },

    avatarPlaceholder: {
      width: 30,
      height: 30,
      borderRadius: 15,

      backgroundColor:
        "rgba(20,30,25,0.75)",

      alignItems: "center",
      justifyContent: "center",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.14)",
    },

    avatarLetter: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "800",
    },

    messageBubble: {
      maxWidth: "78%",
      paddingHorizontal: 13,
      paddingTop: 9,
      paddingBottom: 7,
      borderRadius: 18,

      borderWidth: 1,

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.20,
      shadowRadius: 6,
      elevation: 2,
    },

    myBubble: {
      backgroundColor:
        "rgba(13,104,67,0.76)",

      borderColor:
        "rgba(130,255,185,0.20)",

      borderBottomRightRadius: 5,
    },

    otherBubble: {
      backgroundColor:
        "rgba(20,25,23,0.66)",

      borderColor:
        "rgba(255,255,255,0.13)",

      borderBottomLeftRadius: 5,
    },

    senderName: {
      color: "#7fe9a8",
      fontSize: 11,
      fontWeight: "800",
      marginBottom: 3,
    },

    messageText: {
      fontSize: 15,
      lineHeight: 21,
    },

    myMessageText: {
      color: "#ffffff",
    },

    otherMessageText: {
      color: "#f4f4f4",
    },

    messageMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginTop: 4,
      gap: 3,
    },

    timeText: {
      fontSize: 10,
      fontWeight: "500",
    },

    myTimeText: {
      color: "#b0eac7",
    },

    otherTimeText: {
      color: "#a5aaa7",
    },

    // ========================================================
    // DATE
    // ========================================================

    dateContainer: {
      alignItems: "center",
      marginVertical: 13,
      overflow: "hidden",
      borderRadius: 14,
      alignSelf: "center",
    },

    dateBadge: {
      paddingHorizontal: 13,
      paddingVertical: 6,

      borderRadius: 14,

      overflow: "hidden",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.12)",

      backgroundColor:
        "rgba(10,12,11,0.50)",
    },

    dateText: {
      color: "#d0d0d0",
      fontSize: 10,
      fontWeight: "700",
    },

    // ========================================================
    // UNREAD
    // ========================================================

    unreadButton: {
      position: "absolute",
      right: 18,
      bottom: 16,

      height: 40,
      minWidth: 40,

      paddingHorizontal: 12,

      borderRadius: 20,

      backgroundColor:
        "rgba(17,121,75,0.90)",

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 4,

      borderWidth: 1,
      borderColor:
        "rgba(155,255,195,0.25)",

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 5,
    },

    unreadText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "800",
    },

    // ========================================================
    // INPUT
    // ========================================================

    inputArea: {
      paddingHorizontal: 10,
      paddingTop: 7,

      paddingBottom:
        Platform.OS === "ios"
          ? 8
          : 7,

      overflow: "hidden",
    },

    inputBlur: {
      ...StyleSheet.absoluteFillObject,
    },

    inputGlass: {
      minHeight: 52,
      maxHeight: 125,

      flexDirection: "row",
      alignItems: "flex-end",

      borderRadius: 27,

      backgroundColor:
        "rgba(12,17,15,0.66)",

      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.15)",

      paddingLeft: 16,
      paddingRight: 5,
      paddingVertical: 5,

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 4,
    },

    input: {
      flex: 1,

      color: "#ffffff",
      fontSize: 15,

      maxHeight: 112,

      paddingTop: 9,
      paddingBottom: 9,
      paddingRight: 8,
    },

    sendButton: {
      width: 42,
      height: 42,

      borderRadius: 21,

      backgroundColor:
        "rgba(23,151,88,0.94)",

      alignItems: "center",
      justifyContent: "center",

      borderWidth: 1,
      borderColor:
        "rgba(164,255,197,0.22)",

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 3,
    },

    sendButtonDisabled: {
      opacity: 0.38,
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,

      backgroundColor:
        "#050806",
    },

    loadingText: {
      color: "#a7b1ac",
      fontSize: 14,
      fontWeight: "600",
    },
  });