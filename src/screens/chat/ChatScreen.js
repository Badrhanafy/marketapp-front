import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import {
  ArrowLeft,
  MoreHorizontal,
  Package,
  Send,
  X,
} from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";

import api from "../../api/client";

import {
  subscribeToConversation,
  unsubscribeFromConversation,
  getReverbSocketId,
} from "../../services/reverb";

import { API_URL } from "../../constants/config";

const MEDIA_URL = API_URL.replace(/\/api\/?$/, "");

/* =========================================================
   THEME
========================================================= */

const COLORS = {
  gradient: ["#0c3b3a", "#146a63", "#4bbfa0"],

  /** base background behind the pattern image */
  bg: "#0c3b3a",

  white: "#ffffff",
  textDark: "#213331",
  textMuted: "#7f918d",
  border: "#e1efea",

  /** ✅ MORE TRANSPARENT bubbles (working with BlurView) */
  sentBubble: "rgba(191, 234, 219, 0.18)",
  sentBubbleBorder: "rgba(163, 221, 201, 0.35)",

  receivedBubble: "rgba(255, 255, 255, 0.22)",
  receivedBubbleBorder: "rgba(255, 255, 255, 0.45)",

  accent: "#146a63",
  accentSoft: "#e4f5f0",

  /** dark scrim over the pattern */
  overlay: "rgba(0, 0, 0, 0.35)",
};

/* =========================================================
   RESPONSIVE
========================================================= */

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const clamp = (v, min, max) =>
  Math.min(Math.max(v, min), max);

const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const hScale = width / BASE_WIDTH;
    const vScale = height / BASE_HEIGHT;

    const sx = (n) => clamp(n * hScale, n * 0.85, n * 1.35);
    const sy = (n) => clamp(n * vScale, n * 0.9, n * 1.3);
    const fs = (n) => clamp(n * hScale, n * 0.92, n * 1.25);

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
   MEDIA
========================================================= */

const normalizeMediaUrl = (value) => {
  if (!value || typeof value !== "string") return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  const clean = value
    .replace(/^\/+/, "")
    .replace(/^storage\//, "");

  return `${MEDIA_URL}/storage/${clean}`;
};

const getProductImage = (product) => {
  if (!product) return null;

  const media =
    product.media ||
    product.product_media ||
    product.productMedia ||
    [];

  if (Array.isArray(media) && media.length > 0) {
    const sorted = [...media].sort(
      (a, b) =>
        Number(a?.order ?? 0) - Number(b?.order ?? 0)
    );

    const first = sorted[0];

    const path =
      first?.path ||
      first?.url ||
      first?.image ||
      first?.src;

    const normalized = normalizeMediaUrl(path);

    if (normalized) return normalized;
  }

  return (
    normalizeMediaUrl(product.image) ||
    normalizeMediaUrl(product.image_url) ||
    normalizeMediaUrl(product.thumbnail)
  );
};

const getUserAvatar = (person) => {
  if (!person) return null;

  return (
    normalizeMediaUrl(person.avatar) ||
    normalizeMediaUrl(person.avatar_url) ||
    normalizeMediaUrl(person.profile_photo) ||
    normalizeMediaUrl(person.photo) ||
    normalizeMediaUrl(person.image) ||
    null
  );
};

const getInitial = (name) => {
  if (!name || typeof name !== "string") return "?";
  return name.trim().charAt(0).toUpperCase();
};

/* =========================================================
   NORMALIZE MESSAGE
========================================================= */

const normalizeMessage = (raw, fallbackSenderId = null) => {
  if (!raw) return null;

  let message = raw;

  if (message?.data && typeof message.data === "object") {
    message = message.data;
  }

  if (message?.data && typeof message.data === "string") {
    try {
      message = JSON.parse(message.data);
    } catch {
      return null;
    }
  }

  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch {
      return null;
    }
  }

  if (
    message?.message &&
    typeof message.message === "object" &&
    !Array.isArray(message.message)
  ) {
    message = message.message;
  }

  const product =
    message?.product ?? message?.product_data ?? null;

  const sender = message?.sender ?? message?.user ?? null;

  return {
    id:
      message?.id ??
      `realtime-${Date.now()}-${Math.random()}`,

    conversation_id:
      message?.conversation_id ??
      message?.conversationId ??
      null,

    sender_id:
      message?.sender_id ??
      message?.senderId ??
      sender?.id ??
      fallbackSenderId ??
      null,

    message:
      typeof message?.message === "string"
        ? message.message
        : message?.body ?? message?.content ?? "",

    product_id:
      message?.product_id ??
      message?.productId ??
      product?.id ??
      null,

    product,
    sender,

    read_at: message?.read_at ?? null,

    created_at:
      message?.created_at ??
      message?.createdAt ??
      new Date().toISOString(),

    updated_at:
      message?.updated_at ??
      message?.updatedAt ??
      null,
  };
};

/* =========================================================
   EXTRACT
========================================================= */

const extractMessages = (json, fallbackSenderId = null) => {
  const rawMessages =
    json?.data?.data ?? json?.data ?? json?.messages ?? [];

  if (!Array.isArray(rawMessages)) return [];

  return rawMessages
    .map((item) => normalizeMessage(item, fallbackSenderId))
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(a.created_at) - new Date(b.created_at)
    );
};

/* =========================================================
   SCREEN
========================================================= */

export default function ChatScreen({ navigation, route }) {
  const { user, token } = useAuth();

  const insets = useSafeAreaInsets();
  const rs = useResponsive();

  const params = route?.params || {};

  const conversationId = params.conversationId
    ? Number(params.conversationId)
    : null;

  const routeProduct = params.product || null;

  const sellerId =
    params.sellerId ??
    routeProduct?.user_id ??
    routeProduct?.user?.id ??
    null;

  const fromProductDetails = Boolean(
    params.fromProductDetails
  );

  /* =====================================================
     TOKENS
  ===================================================== */

  const tokens = useMemo(() => {
    const { sx, sy, fs, isSmall, isLarge, isTablet } = rs;

    const bubbleMax = isSmall
      ? "86%"
      : isLarge || isTablet
      ? "70%"
      : "80%";

    return {
      // Header
      headerHeight: sy(60),
      headerPaddingH: sx(12),
      headerPaddingBottom: sy(12),
      headerButtonSize: sx(38),
      headerButtonRadius: sx(19),
      headerButtonIcon: sx(20),
      avatarSize: sx(38),
      avatarRadius: sx(19),
      avatarBorder: sx(1.5),
      avatarInitialSize: fs(15),
      headerTitleSize: fs(15),
      headerSubtitleSize: fs(10),
      headerTextMarginLeft: sx(10),

      // Messages
      listPaddingH: sx(14),
      listPaddingTop: sy(10),
      listPaddingBottom: sy(12),
      messageRowMarginBottom: sy(12),
      bubbleMaxWidth: bubbleMax,
      bubblePadding: sx(12),
      bubbleRadius: sx(18),
      bubbleTailRadius: sx(6),
      messageTextSize: fs(14),
      messageTextLineHeight: fs(20),
      messageTimeSize: fs(9),
      messageTimeMarginTop: sy(5),

      // Product card
      productCardWidth: sx(220),
      productCardMinHeight: sy(72),
      productCardRadius: sx(12),
      productImageSize: sx(72),
      productLabelSize: fs(8),
      productNameSize: fs(12),
      productPriceSize: fs(11),
      productMarginBottom: sy(7),

      // Empty
      emptyIconSize: sx(54),
      emptyIconRadius: sx(27),
      emptyTitleSize: fs(17),
      emptyTextSize: fs(12),

      // Input
      inputPaddingH: sx(12),
      inputPaddingTop: sy(8),
      inputBottomOffset: Math.max(insets.bottom, sy(10)),
      inputContainerMinH: sy(52),
      inputContainerMaxH: sy(125),
      inputContainerRadius: sx(26),
      inputPaddingLeft: sx(16),
      inputPaddingRight: sx(6),
      inputFontSize: fs(14),
      inputLineHeight: fs(19),
      inputMinHeight: sy(40),
      inputMaxHeight: sy(105),
      sendButtonSize: sx(42),
      sendButtonRadius: sx(21),
      sendButtonIcon: sx(18),
      sendButtonMarginLeft: sx(7),

      // Pending product
      pendingImageSize: sx(68),
      pendingCardMinH: sy(68),
      pendingCardRadius: sx(16),
      pendingLabelSize: fs(8),
      pendingNameSize: fs(13),
      pendingPriceSize: fs(11),
      pendingMarginBottom: sy(8),
      pendingRemoveSize: sx(24),
      pendingRemoveRadius: sx(12),
    };
  }, [rs, insets.bottom]);

  /* =====================================================
     STATE
  ===================================================== */

  const [conversation, setConversation] = useState(
    params.conversation || null
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [pendingProduct, setPendingProduct] = useState(
    fromProductDetails && routeProduct ? routeProduct : null
  );

  const [otherUser, setOtherUser] = useState(null);

  const flatListRef = useRef(null);

  /* =====================================================
     MEMOS
  ===================================================== */

  const pendingProductId = useMemo(() => {
    if (!pendingProduct?.id) return null;
    return Number(pendingProduct.id);
  }, [pendingProduct]);

  const headerName =
    otherUser?.name ||
    conversation?.other_user?.name ||
    conversation?.seller?.name ||
    "Chat";

  const headerAvatarUri = useMemo(
    () =>
      getUserAvatar(otherUser) ||
      getUserAvatar(conversation?.other_user) ||
      getUserAvatar(conversation?.seller),
    [otherUser, conversation]
  );

  const headerInitial = useMemo(
    () => getInitial(headerName),
    [headerName]
  );

  /* =====================================================
     LOAD CONVERSATION
  ===================================================== */

  const loadConversation = useCallback(async () => {
    if (!conversationId) return null;

    try {
      const response = await api.get(
        `/conversations/${conversationId}`
      );

      const data =
        response?.data?.data ?? response?.data ?? null;

      if (!data) return null;

      setConversation(data);

      const participant =
        data?.other_user ??
        data?.otherUser ??
        data?.seller ??
        data?.user ??
        null;

      if (participant) setOtherUser(participant);

      if (!fromProductDetails) {
        const lastProduct =
          data?.last_message?.product ??
          data?.lastMessage?.product ??
          null;

        if (lastProduct) setSelectedProduct(lastProduct);
      }

      return data;
    } catch (error) {
      console.log(
        "❌ LOAD CONVERSATION ERROR:",
        error?.response?.data || error?.message
      );
      return null;
    }
  }, [conversationId, fromProductDetails]);

  /* =====================================================
     LOAD MESSAGES
  ===================================================== */

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await api.get(
        `/conversations/${conversationId}/messages`
      );

      const normalized = extractMessages(
        response?.data,
        user?.id
      );

      setMessages(normalized);

      const lastProductMessage = [...normalized]
        .reverse()
        .find((item) => item?.product);

      if (lastProductMessage?.product) {
        setSelectedProduct(lastProductMessage.product);
      }
    } catch (error) {
      console.log(
        "❌ LOAD MESSAGES ERROR:",
        error?.response?.data || error?.message
      );
    }
  }, [conversationId, user?.id]);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      try {
        await loadConversation();
        await loadMessages();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [loadConversation, loadMessages]);

  /* =====================================================
     REALTIME
  ===================================================== */

  const handleRealtimeMessage = useCallback(
    (payload) => {
      const normalized = normalizeMessage(payload, null);

      if (!normalized) return;

      if (
        conversationId &&
        normalized.conversation_id &&
        Number(normalized.conversation_id) !==
          Number(conversationId)
      ) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some(
          (item) =>
            String(item.id) === String(normalized.id)
        );

        if (exists) return prev;

        return [...prev, normalized];
      });

      if (normalized.product) {
        setSelectedProduct(normalized.product);
      }
    },
    [conversationId]
  );

  useEffect(() => {
    if (!conversationId) return;

    let active = true;

    const subscribe = async () => {
      try {
        await subscribeToConversation(
          conversationId,
          (payload) => {
            if (!active) return;
            handleRealtimeMessage(payload);
          }
        );
      } catch (error) {
        console.log(
          "❌ CONVERSATION SUBSCRIBE ERROR:",
          error
        );
      }
    };

    subscribe();

    return () => {
      active = false;

      try {
        unsubscribeFromConversation(conversationId);
      } catch (error) {
        console.log("⚠️ unsubscribe error:", error);
      }
    };
  }, [conversationId, handleRealtimeMessage]);

  /* =====================================================
     SCROLL
  ===================================================== */

  useEffect(() => {
    if (!messages.length) return;

    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd?.({ animated: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages.length]);

  /* =====================================================
     SEND MESSAGE
  ===================================================== */

  const sendMessage = useCallback(async () => {
    const text = input.trim();

    if (!text) return;

    const activeProductId = pendingProductId;

    if (!conversationId) {
      Alert.alert(
        "Chat unavailable",
        "There is no conversation yet."
      );
      return;
    }

    if (sending) return;

    try {
      setSending(true);

      const body = {
        message: text,
        ...(activeProductId
          ? { product_id: activeProductId }
          : {}),
      };

      const socketId = getReverbSocketId?.();

      const headers = {
        Accept: "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(socketId ? { "X-Socket-ID": socketId } : {}),
      };

      const response = await api.post(
        `/conversations/${conversationId}/messages`,
        body,
        { headers }
      );

      const rawMessage =
        response?.data?.data ?? response?.data ?? null;

      const sentMessage = normalizeMessage(
        rawMessage,
        user?.id
      );

      if (sentMessage) {
        setMessages((prev) => {
          const exists = prev.some(
            (item) =>
              String(item.id) === String(sentMessage.id)
          );

          if (exists) return prev;

          return [...prev, sentMessage];
        });

        if (sentMessage.product) {
          setSelectedProduct(sentMessage.product);
        }
      }

      setPendingProduct(null);
      setInput("");
    } catch (error) {
      console.log(
        "❌ SEND MESSAGE ERROR:",
        error?.response?.data || error?.message
      );

      Alert.alert(
        "Message failed",
        error?.response?.data?.message ||
          "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  }, [
    input,
    pendingProductId,
    conversationId,
    sending,
    token,
    user?.id,
  ]);

  /* =====================================================
     REMOVE PENDING
  ===================================================== */

  const removePendingProduct = useCallback(() => {
    setPendingProduct(null);
  }, []);

  /* =====================================================
     PENDING PRODUCT
  ===================================================== */

  const renderPendingProduct = useCallback(() => {
    if (!pendingProduct) return null;

    const image = getProductImage(pendingProduct);

    return (
      <View
        style={[
          styles.pendingProductWrapper,
          {
            marginBottom: tokens.pendingMarginBottom,
          },
        ]}
      >
        <View
          style={[
            styles.pendingProductCard,
            {
              minHeight: tokens.pendingCardMinH,
              borderRadius: tokens.pendingCardRadius,
              paddingRight: rs.sx(36),
            },
          ]}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={{
                width: tokens.pendingImageSize,
                height: tokens.pendingImageSize,
                backgroundColor: "#e2f0eb",
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: tokens.pendingImageSize,
                height: tokens.pendingImageSize,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#e2f0eb",
              }}
            >
              <Package size={rs.sx(21)} color={COLORS.accent} />
            </View>
          )}

          <View
            style={[
              styles.pendingProductInfo,
              {
                paddingHorizontal: rs.sx(10),
                paddingVertical: rs.sy(8),
              },
            ]}
          >
            <Text
              style={[
                styles.pendingProductLabel,
                {
                  fontSize: tokens.pendingLabelSize,
                  marginBottom: rs.sy(2),
                },
              ]}
            >
              ATTACHED PRODUCT
            </Text>

            <Text
              style={[
                styles.pendingProductName,
                { fontSize: tokens.pendingNameSize },
              ]}
              numberOfLines={1}
            >
              {pendingProduct.name ||
                pendingProduct.product_name ||
                "Product"}
            </Text>

            {pendingProduct.price != null && (
              <Text
                style={[
                  styles.pendingProductPrice,
                  {
                    fontSize: tokens.pendingPriceSize,
                    marginTop: rs.sy(2),
                  },
                ]}
              >
                {pendingProduct.price} MAD
              </Text>
            )}
          </View>
        </View>

        <Pressable
          onPress={removePendingProduct}
          style={[
            styles.removePendingProduct,
            {
              top: rs.sy(8),
              right: rs.sx(8),
              width: tokens.pendingRemoveSize,
              height: tokens.pendingRemoveSize,
              borderRadius: tokens.pendingRemoveRadius,
            },
          ]}
        >
          <X size={rs.sx(15)} color={COLORS.accent} />
        </Pressable>
      </View>
    );
  }, [pendingProduct, removePendingProduct, tokens, rs]);

  /* =====================================================
     PRODUCT CARD
  ===================================================== */

  const renderProductCard = useCallback(
    (product) => {
      if (!product) return null;

      const image = getProductImage(product);

      return (
        <View
          style={[
            styles.messageProductCard,
            {
              width: tokens.productCardWidth,
              minHeight: tokens.productCardMinHeight,
              borderRadius: tokens.productCardRadius,
              marginBottom: tokens.productMarginBottom,
            },
          ]}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={{
                width: tokens.productImageSize,
                height: tokens.productImageSize,
                backgroundColor: "#e2f0eb",
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: tokens.productImageSize,
                height: tokens.productImageSize,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#e2f0eb",
              }}
            >
              <Package size={rs.sx(22)} color={COLORS.accent} />
            </View>
          )}

          <View
            style={[
              styles.messageProductInfo,
              {
                paddingHorizontal: rs.sx(9),
                paddingVertical: rs.sy(8),
              },
            ]}
          >
            <Text
              style={[
                styles.messageProductLabel,
                { fontSize: tokens.productLabelSize },
              ]}
            >
              PRODUCT
            </Text>

            <Text
              style={[
                styles.messageProductName,
                {
                  fontSize: tokens.productNameSize,
                  marginTop: rs.sy(3),
                },
              ]}
              numberOfLines={2}
            >
              {product.name ||
                product.product_name ||
                "Product"}
            </Text>

            {product.price != null && (
              <Text
                style={[
                  styles.messageProductPrice,
                  {
                    fontSize: tokens.productPriceSize,
                    marginTop: rs.sy(3),
                  },
                ]}
              >
                {product.price} MAD
              </Text>
            )}
          </View>
        </View>
      );
    },
    [tokens, rs]
  );

  /* =====================================================
     MESSAGE
  ===================================================== */

  const renderMessage = useCallback(
    ({ item }) => {
      const isMine =
        Number(item.sender_id) === Number(user?.id);

      return (
        <View
          style={[
            styles.messageRow,
            {
              marginBottom: tokens.messageRowMarginBottom,
            },
            isMine
              ? styles.messageRowMine
              : styles.messageRowOther,
          ]}
        >
          <BlurView
            intensity={isMine ? 30 : 45}
            tint="light"
            experimentalBlurMethod="dimezisBlurView"
            style={[
              styles.messageBubble,
              {
                maxWidth: tokens.bubbleMaxWidth,
                padding: tokens.bubblePadding,
                borderRadius: tokens.bubbleRadius,
              },
              isMine
                ? [
                    styles.myBubble,
                    {
                      borderBottomRightRadius:
                        tokens.bubbleTailRadius,
                    },
                  ]
                : [
                    styles.otherBubble,
                    {
                      borderBottomLeftRadius:
                        tokens.bubbleTailRadius,
                    },
                  ],
            ]}
          >
            {item.product
              ? renderProductCard(item.product)
              : null}

            {item.message ? (
              <Text
                style={[
                  styles.messageText,
                  {
                    fontSize: tokens.messageTextSize,
                    lineHeight:
                      tokens.messageTextLineHeight,
                  },
                  isMine
                    ? styles.messageTextMine
                    : styles.messageTextOther,
                ]}
              >
                {item.message}
              </Text>
            ) : null}

            <Text
              style={[
                styles.messageTime,
                {
                  fontSize: tokens.messageTimeSize,
                  marginTop: tokens.messageTimeMarginTop,
                },
                isMine
                  ? styles.messageTimeMine
                  : styles.messageTimeOther,
              ]}
            >
              {item.created_at
                ? new Date(
                    item.created_at
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </Text>
          </BlurView>
        </View>
      );
    },
    [user?.id, renderProductCard, tokens]
  );

  /* =====================================================
     EMPTY
  ===================================================== */

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyMessages}>
        <View
          style={[
            styles.emptyIcon,
            {
              width: tokens.emptyIconSize,
              height: tokens.emptyIconSize,
              borderRadius: tokens.emptyIconRadius,
            },
          ]}
        >
          <Send size={rs.sx(23)} color="#ffffff" />
        </View>

        <Text
          style={[
            styles.emptyMessagesTitle,
            { fontSize: tokens.emptyTitleSize },
          ]}
        >
          Start conversation
        </Text>

        <Text
          style={[
            styles.emptyMessagesText,
            { fontSize: tokens.emptyTextSize },
          ]}
        >
          Send a message to start chatting.
        </Text>
      </View>
    );
  };

  /* =====================================================
     NO CONVERSATION
  ===================================================== */

  const renderNoConversation = () => {
    if (conversationId) return null;

    return (
      <View style={styles.noConversation}>
        <Package size={rs.sx(42)} color="#ffffff" />

        <Text
          style={[
            styles.noConversationTitle,
            { fontSize: rs.fs(18) },
          ]}
        >
          Conversation not found
        </Text>

        <Text
          style={[
            styles.noConversationText,
            {
              fontSize: rs.fs(12),
              lineHeight: rs.fs(18),
            },
          ]}
        >
          The product is attached, but there is no
          existing conversation ID.
        </Text>
      </View>
    );
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </View>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <ImageBackground
      style={styles.container}
      source={require("../../../assets/images/chatbgpattern.png")}
      resizeMode="cover"
    >
      {/* ✅ dark scrim over pattern */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.overlay,
        ]}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 10 : 0
        }
      >
        {/* ==================== HEADER ==================== */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={COLORS.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.headerGradient,
              {
                paddingTop: insets.top,
                paddingBottom: tokens.headerPaddingBottom,
              },
            ]}
          >
            <View
              style={[
                styles.header,
                {
                  height: tokens.headerHeight,
                  paddingHorizontal: tokens.headerPaddingH,
                },
              ]}
            >
              <Pressable
                onPress={() => navigation.goBack()}
                style={[
                  styles.headerButton,
                  {
                    width: tokens.headerButtonSize,
                    height: tokens.headerButtonSize,
                    borderRadius: tokens.headerButtonRadius,
                  },
                ]}
                hitSlop={8}
              >
                <ArrowLeft
                  size={tokens.headerButtonIcon}
                  color="#ffffff"
                />
              </Pressable>

              <View
                style={[
                  styles.headerCenter,
                  { paddingHorizontal: rs.sx(10) },
                ]}
              >
                {headerAvatarUri ? (
                  <Image
                    source={{ uri: headerAvatarUri }}
                    style={{
                      width: tokens.avatarSize,
                      height: tokens.avatarSize,
                      borderRadius: tokens.avatarRadius,
                      backgroundColor:
                        "rgba(255,255,255,0.25)",
                      borderWidth: tokens.avatarBorder,
                      borderColor:
                        "rgba(255,255,255,0.6)",
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: tokens.avatarSize,
                      height: tokens.avatarSize,
                      borderRadius: tokens.avatarRadius,
                      backgroundColor:
                        "rgba(255,255,255,0.22)",
                      borderWidth: tokens.avatarBorder,
                      borderColor:
                        "rgba(255,255,255,0.6)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#ffffff",
                        fontSize: tokens.avatarInitialSize,
                        fontWeight: "800",
                      }}
                    >
                      {headerInitial}
                    </Text>
                  </View>
                )}

                <View
                  style={[
                    styles.headerTextWrap,
                    {
                      marginLeft:
                        tokens.headerTextMarginLeft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.headerTitle,
                      { fontSize: tokens.headerTitleSize },
                    ]}
                    numberOfLines={1}
                  >
                    {headerName}
                  </Text>

                  {sellerId ? (
                    <Text
                      style={[
                        styles.headerSubtitle,
                        {
                          fontSize:
                            tokens.headerSubtitleSize,
                        },
                      ]}
                    >
                      Marketplace
                    </Text>
                  ) : null}
                </View>
              </View>

              <Pressable
                style={[
                  styles.headerButton,
                  {
                    width: tokens.headerButtonSize,
                    height: tokens.headerButtonSize,
                    borderRadius: tokens.headerButtonRadius,
                  },
                ]}
                hitSlop={8}
              >
                <MoreHorizontal
                  size={rs.sx(18)}
                  color="#ffffff"
                />
              </Pressable>
            </View>
          </LinearGradient>

          {/* ✅ Simple flat divider — no SVG wave */}
          <View
            style={[
              styles.headerDivider,
              { height: rs.sy(6) },
            ]}
          />
        </View>

        {/* ==================== MESSAGES ==================== */}
        {conversationId ? (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) =>
              String(item?.id ?? `message-${index}`)
            }
            renderItem={renderMessage}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[
              {
                paddingHorizontal: tokens.listPaddingH,
                paddingTop: tokens.listPaddingTop,
                paddingBottom: tokens.listPaddingBottom,
              },
              messages.length === 0 &&
                styles.messagesEmptyContent,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
          />
        ) : (
          renderNoConversation()
        )}

        {/* ==================== INPUT ==================== */}
        <View style={styles.inputArea}>
          {/* ✅ Simple flat divider — no SVG wave */}
          <View
            style={[
              styles.inputDivider,
              { height: rs.sy(6) },
            ]}
          />

          <LinearGradient
            colors={COLORS.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.inputGradient,
              {
                paddingHorizontal: tokens.inputPaddingH,
                paddingTop: tokens.inputPaddingTop,
                paddingBottom: tokens.inputBottomOffset,
              },
            ]}
          >
            {renderPendingProduct()}

            <View
              style={[
                styles.inputContainer,
                {
                  minHeight: tokens.inputContainerMinH,
                  maxHeight: tokens.inputContainerMaxH,
                  borderRadius: tokens.inputContainerRadius,
                  paddingLeft: tokens.inputPaddingLeft,
                  paddingRight: tokens.inputPaddingRight,
                },
              ]}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={
                  pendingProduct
                    ? "Write your message..."
                    : "Type your message here..."
                }
                placeholderTextColor="#93a6a2"
                multiline
                maxLength={2000}
                style={[
                  styles.input,
                  {
                    fontSize: tokens.inputFontSize,
                    lineHeight: tokens.inputLineHeight,
                    minHeight: tokens.inputMinHeight,
                    maxHeight: tokens.inputMaxHeight,
                  },
                ]}
                editable={
                  !sending && Boolean(conversationId)
                }
              />

              <Pressable
                onPress={sendMessage}
                disabled={
                  sending ||
                  !input.trim() ||
                  !conversationId
                }
                style={[
                  styles.sendButton,
                  {
                    width: tokens.sendButtonSize,
                    height: tokens.sendButtonSize,
                    borderRadius: tokens.sendButtonRadius,
                    marginLeft: tokens.sendButtonMarginLeft,
                  },
                  (!input.trim() ||
                    sending ||
                    !conversationId) &&
                    styles.sendButtonDisabled,
                ]}
                hitSlop={6}
              >
                {sending ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.accent}
                  />
                ) : (
                  <Send
                    size={tokens.sendButtonIcon}
                    color={COLORS.accent}
                  />
                )}
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  flex: { flex: 1 },

  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  overlay: {
    backgroundColor: COLORS.overlay,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* HEADER */

  headerWrapper: {
    backgroundColor: COLORS.gradient[0],
  },

  headerGradient: {},

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerDivider: {
    backgroundColor: COLORS.gradient[0],
  },

  headerButton: {
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  headerTextWrap: {
    flex: 1,
  },

  headerTitle: {
    color: "#ffffff",
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
    marginTop: 2,
  },

  /* MESSAGES */

  messagesEmptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  messageRow: {
    width: "100%",
    flexDirection: "row",
  },

  messageRowMine: {
    justifyContent: "flex-end",
  },

  messageRowOther: {
    justifyContent: "flex-start",
  },

  messageBubble: {
    overflow: "hidden",
  },

  myBubble: {
    backgroundColor: COLORS.sentBubble,
    borderWidth: 1,
    borderColor: COLORS.sentBubbleBorder,
  },

  otherBubble: {
    backgroundColor: COLORS.receivedBubble,
    borderWidth: 1,
    borderColor: COLORS.receivedBubbleBorder,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  messageText: {
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  messageTextMine: {
    color: "#ffffff",
  },

  messageTextOther: {
    color: "#ffffff",
  },

  messageTime: {
    alignSelf: "flex-end",
  },

  messageTimeMine: {
    color: "rgba(255,255,255,0.75)",
  },

  messageTimeOther: {
    color: "rgba(255,255,255,0.75)",
  },

  /* PRODUCT CARD */

  messageProductCard: {
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    flexDirection: "row",
  },

  messageProductInfo: {
    flex: 1,
  },

  messageProductLabel: {
    color: COLORS.accent,
    fontWeight: "900",
    letterSpacing: 1,
  },

  messageProductName: {
    color: COLORS.textDark,
    fontWeight: "800",
  },

  messageProductPrice: {
    color: COLORS.accent,
    fontWeight: "800",
  },

  /* EMPTY */

  emptyMessages: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyIcon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  emptyMessagesTitle: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 14,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  emptyMessagesText: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 5,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  /* NO CONVERSATION */

  noConversation: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  noConversationTitle: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 14,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  noConversationText: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 8,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  /* INPUT */

  inputArea: {
    backgroundColor: COLORS.gradient[0],
  },

  inputDivider: {
    backgroundColor: COLORS.gradient[0],
  },

  inputGradient: {},

  inputContainer: {
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  input: {
    flex: 1,
    color: COLORS.textDark,
    paddingTop: 9,
    paddingBottom: 8,
    textAlignVertical: "center",
  },

  sendButton: {
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    opacity: 0.4,
  },

  /* PENDING */

  pendingProductWrapper: {
    position: "relative",
  },

  pendingProductCard: {
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  pendingProductInfo: {
    flex: 1,
  },

  pendingProductLabel: {
    color: COLORS.accent,
    fontWeight: "900",
    letterSpacing: 1,
  },

  pendingProductName: {
    color: COLORS.textDark,
    fontWeight: "800",
  },

  pendingProductPrice: {
    color: COLORS.accent,
    fontWeight: "700",
  },

  removePendingProduct: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
});