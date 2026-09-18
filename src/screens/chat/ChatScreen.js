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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { useIsFocused } from "@react-navigation/native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

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
   THEME  —  Professional white / WhatsApp-like
========================================================= */

const COLORS = {
  /* Surfaces */
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F2F5",

  /* Header */
  headerBg: "#FFFFFF",
  headerBorder: "#E5E7EB",
  headerTitle: "#0B141A",
  headerSubtitle: "#667781",
  headerIcon: "#0B141A",
  headerButtonBg: "#F0F2F5",

  /* Sent bubble (dark green) */
  sentBubble: "#05603A",
  sentText: "#FFFFFF",
  sentTime: "rgba(255,255,255,0.72)",

  /* Received bubble (light) */
  receivedBubble: "#F0F2F5",
  receivedBubbleBorder: "#E5E7EB",
  receivedText: "#0B141A",
  receivedTime: "#667781",

  /* Product card */
  productCardBg: "#FFFFFF",
  productCardBorder: "#E5E7EB",
  productLabel: "#05603A",
  productName: "#0B141A",
  productPrice: "#05603A",
  productImageBg: "#EAF3EE",

  /* Input */
  inputAreaBg: "#FFFFFF",
  inputAreaBorder: "#E5E7EB",
  inputBg: "#F0F2F5",
  inputText: "#0B141A",
  inputPlaceholder: "#8696A0",
  sendButtonBg: "#05603A",
  sendButtonDisabled: "#A8C7B8",
  sendIcon: "#FFFFFF",

  /* Date separator */
  dateChipBg: "#E9EDEF",
  dateChipText: "#54656F",

  /* Misc */
  emptyIconBg: "#F0F2F5",
  emptyIconColor: "#05603A",
  emptyTitle: "#0B141A",
  emptyText: "#667781",
};

/* =========================================================
   RESPONSIVE
========================================================= */

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

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

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const clean = value.replace(/^\/+/, "").replace(/^storage\//, "");

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
      (a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0)
    );

    const first = sorted[0];

    const path =
      first?.path || first?.url || first?.image || first?.src;

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

  // Some APIs return the avatar as an object like { url, path, src }
  const avatarField =
    typeof person.avatar === "object" && person.avatar !== null
      ? person.avatar.url ||
        person.avatar.path ||
        person.avatar.src ||
        person.avatar.image
      : person.avatar;

  return (
    normalizeMediaUrl(avatarField) ||
    normalizeMediaUrl(person.avatar_url) ||
    normalizeMediaUrl(person.profile_photo) ||
    normalizeMediaUrl(person.profile_picture) ||
    normalizeMediaUrl(person.profile_image) ||
    normalizeMediaUrl(person.photo) ||
    normalizeMediaUrl(person.image) ||
    normalizeMediaUrl(person.picture) ||
    null
  );
};

const getInitial = (name) => {
  if (!name || typeof name !== "string") return "?";

  return name.trim().charAt(0).toUpperCase();
};

/* =========================================================
   DATE HELPERS
========================================================= */

const getDayKey = (value) => {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "";

  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const isSameDay = (a, b) => getDayKey(a) === getDayKey(b);

const formatDayLabel = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  if (isSameDay(date, now)) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }

  try {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year:
        date.getFullYear() === now.getFullYear()
          ? undefined
          : "numeric",
    });
  } catch {
    return date.toDateString();
  }
};

/* =========================================================
   TIME FORMAT
========================================================= */

const formatTime = (value) => {
  if (!value) return "";

  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
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
      message?.updated_at ?? message?.updatedAt ?? null,
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
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
};

/* =========================================================
   BUILD LIST (messages + date separators)
========================================================= */

const buildListData = (messages) => {
  const out = [];

  let lastDayKey = null;

  messages.forEach((message) => {
    const dayKey = getDayKey(message.created_at);

    if (dayKey && dayKey !== lastDayKey) {
      out.push({
        type: "separator",
        id: `separator-${dayKey}`,
        label: formatDayLabel(message.created_at),
      });

      lastDayKey = dayKey;
    }

    out.push({
      type: "message",
      id: String(message.id),
      message,
    });
  });

  return out;
};

/* =========================================================
   SCREEN
========================================================= */

export default function ChatScreen({ navigation, route }) {
  const { user, token } = useAuth();

  const insets = useSafeAreaInsets();
  const rs = useResponsive();

  const isFocused = useIsFocused();

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

  const fromProductDetails = Boolean(params.fromProductDetails);

  /* =====================================================
     REFS
  ===================================================== */

  const flatListRef = useRef(null);
  const isFocusedRef = useRef(false);
  const markingAsReadRef = useRef(false);
  const conversationIdRef = useRef(conversationId);

  /* =====================================================
     FOCUS REF SYNC
  ===================================================== */

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  /* =====================================================
     TOKENS
  ===================================================== */

  const tokens = useMemo(() => {
    const { sx, sy, fs, isSmall, isLarge, isTablet } = rs;

    const bubbleMax = isSmall
      ? "86%"
      : isLarge || isTablet
      ? "72%"
      : "80%";

    return {
      headerHeight: sy(58),
      headerPaddingH: sx(12),
      headerPaddingBottom: sy(10),
      headerButtonSize: sx(38),
      headerButtonRadius: sx(19),
      headerButtonIcon: sx(20),
      avatarSize: sx(40),
      avatarRadius: sx(20),
      avatarInitialSize: fs(15),
      headerTitleSize: fs(15),
      headerSubtitleSize: fs(11),
      headerTextMarginLeft: sx(10),

      listPaddingH: sx(12),
      listPaddingTop: sy(12),
      listPaddingBottom: sy(14),
      messageRowMarginBottom: sy(6),
      bubbleMaxWidth: bubbleMax,
      bubblePaddingH: sx(12),
      bubblePaddingV: sy(8),
      bubbleRadius: sx(14),
      bubbleTailRadius: sx(4),
      messageTextSize: fs(14.5),
      messageTextLineHeight: fs(20),
      messageTimeSize: fs(10),
      messageTimeMarginTop: sy(3),

      /* Date separator */
      separatorMarginTop: sy(14),
      separatorMarginBottom: sy(10),
      separatorChipPaddingH: sx(12),
      separatorChipPaddingV: sy(5),
      separatorChipRadius: sx(10),
      separatorFontSize: fs(11),

      productCardWidth: sx(220),
      productCardMinHeight: sy(72),
      productCardRadius: sx(10),
      productImageSize: sx(72),
      productLabelSize: fs(8),
      productNameSize: fs(12.5),
      productPriceSize: fs(11.5),
      productMarginBottom: sy(7),

      emptyIconSize: sx(54),
      emptyIconRadius: sx(27),
      emptyTitleSize: fs(17),
      emptyTextSize: fs(12.5),

      inputPaddingH: sx(10),
      inputPaddingTop: sy(8),
      inputBottomOffset: Math.max(insets.bottom, sy(10)),
      inputContainerMinH: sy(48),
      inputContainerMaxH: sy(125),
      inputContainerRadius: sx(24),
      inputPaddingLeft: sx(16),
      inputPaddingRight: sx(5),
      inputFontSize: fs(14.5),
      inputLineHeight: fs(19),
      inputMinHeight: sy(38),
      inputMaxHeight: sy(105),
      sendButtonSize: sx(40),
      sendButtonRadius: sx(20),
      sendButtonIcon: sx(18),
      sendButtonMarginLeft: sx(6),

      pendingImageSize: sx(68),
      pendingCardMinH: sy(68),
      pendingCardRadius: sx(14),
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

  /* =====================================================
     MEMOS
  ===================================================== */

  const pendingProductId = useMemo(() => {
    if (!pendingProduct?.id) return null;

    return Number(pendingProduct.id);
  }, [pendingProduct]);

  const listData = useMemo(
    () => buildListData(messages),
    [messages]
  );

  /**
   * The other participant in the conversation.
   *
   * Priority:
   *  1. explicit otherUser state (set from conversation endpoint)
   *  2. other_user / seller / user fields on the conversation
   *  3. sender of the first message that wasn't sent by me
   *
   * This guarantees the header works even when the conversation
   * endpoint does not include participant info.
   */
  const derivedOtherUser = useMemo(() => {
    if (otherUser) return otherUser;
    if (conversation?.other_user) return conversation.other_user;
    if (conversation?.otherUser) return conversation.otherUser;
    if (conversation?.seller) return conversation.seller;
    if (conversation?.user) return conversation.user;

    const fromMessages = messages.find(
      (m) =>
        m?.sender &&
        Number(m.sender.id) !== Number(user?.id)
    )?.sender;

    return fromMessages || null;
  }, [otherUser, conversation, messages, user?.id]);

  const headerName = useMemo(() => {
    return (
      derivedOtherUser?.name ||
      derivedOtherUser?.username ||
      "Chat"
    );
  }, [derivedOtherUser]);

  const headerAvatarUri = useMemo(
    () => getUserAvatar(derivedOtherUser),
    [derivedOtherUser]
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

      const data = response?.data?.data ?? response?.data ?? null;

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

      const normalized = extractMessages(response?.data, user?.id);

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
     MARK MESSAGES AS READ
  ===================================================== */

  const markMessagesAsRead = useCallback(async () => {
    if (!conversationId || !token || !isFocusedRef.current) {
      return;
    }

    if (markingAsReadRef.current) return;

    markingAsReadRef.current = true;

    try {
      const response = await api.post(
        `/conversations/${conversationId}/messages/read`,
        {},
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const readAt =
        response?.data?.read_at ||
        response?.data?.data?.read_at ||
        new Date().toISOString();

      setMessages((current) =>
        current.map((message) => {
          const isMine =
            Number(message.sender_id) === Number(user?.id);

          if (isMine) return message;
          if (message.read_at) return message;

          return {
            ...message,
            read_at: readAt,
          };
        })
      );
    } catch (error) {
      console.log(
        "❌ MARK AS READ ERROR:",
        error?.response?.data || error?.message || error
      );
    } finally {
      markingAsReadRef.current = false;
    }
  }, [conversationId, token, user?.id]);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      try {
        await Promise.all([
          loadConversation(),
          loadMessages(),
        ]);
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
     MARK AS READ WHEN CHAT IS OPEN
  ===================================================== */

  useEffect(() => {
    if (!conversationId || !token || !isFocused) return;

    const timer = setTimeout(() => {
      markMessagesAsRead();
    }, 150);

    return () => clearTimeout(timer);
  }, [conversationId, token, isFocused, markMessagesAsRead]);

  /* =====================================================
     REALTIME MESSAGE
  ===================================================== */

  const handleRealtimeMessage = useCallback(
    (payload) => {
      const normalized = normalizeMessage(payload, null);

      if (!normalized) return;

      if (
        conversationIdRef.current &&
        normalized.conversation_id &&
        Number(normalized.conversation_id) !==
          Number(conversationIdRef.current)
      ) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some(
          (item) => String(item.id) === String(normalized.id)
        );

        if (exists) return prev;

        return [...prev, normalized];
      });

      if (normalized.product) {
        setSelectedProduct(normalized.product);
      }

      if (isFocusedRef.current) {
        setTimeout(() => {
          markMessagesAsRead();
        }, 100);
      }
    },
    [markMessagesAsRead]
  );

  /* =====================================================
     REALTIME SUBSCRIPTION
  ===================================================== */

  useEffect(() => {
    if (!conversationId) return;

    let active = true;

    const subscribe = async () => {
      try {
        await subscribeToConversation(conversationId, (payload) => {
          if (!active) return;
          handleRealtimeMessage(payload);
        });
      } catch (error) {
        console.log("❌ CONVERSATION SUBSCRIBE ERROR:", error);
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
    if (!listData.length) return;

    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd?.({ animated: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [listData.length]);

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
        ...(activeProductId ? { product_id: activeProductId } : {}),
      };

      const socketId = getReverbSocketId?.();

      const headers = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(socketId ? { "X-Socket-ID": socketId } : {}),
      };

      const response = await api.post(
        `/conversations/${conversationId}/messages`,
        body,
        { headers }
      );

      const rawMessage =
        response?.data?.data ?? response?.data ?? null;

      const sentMessage = normalizeMessage(rawMessage, user?.id);

      if (sentMessage) {
        setMessages((prev) => {
          const exists = prev.some(
            (item) => String(item.id) === String(sentMessage.id)
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
        error?.response?.data || error?.message || error
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
     REMOVE PENDING PRODUCT
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
          { marginBottom: tokens.pendingMarginBottom },
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
                backgroundColor: COLORS.productImageBg,
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
                backgroundColor: COLORS.productImageBg,
              }}
            >
              <Package
                size={rs.sx(21)}
                color={COLORS.productLabel}
              />
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
          <X size={rs.sx(15)} color={COLORS.productLabel} />
        </Pressable>
      </View>
    );
  }, [
    pendingProduct,
    removePendingProduct,
    tokens,
    rs,
  ]);

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
                backgroundColor: COLORS.productImageBg,
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
                backgroundColor: COLORS.productImageBg,
              }}
            >
              <Package
                size={rs.sx(22)}
                color={COLORS.productLabel}
              />
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
              {product.name || product.product_name || "Product"}
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
     DATE SEPARATOR
  ===================================================== */

  const renderDateSeparator = useCallback(
    (label) => (
      <View
        style={[
          styles.separatorRow,
          {
            marginTop: tokens.separatorMarginTop,
            marginBottom: tokens.separatorMarginBottom,
          },
        ]}
      >
        <View
          style={[
            styles.separatorChip,
            {
              paddingHorizontal: tokens.separatorChipPaddingH,
              paddingVertical: tokens.separatorChipPaddingV,
              borderRadius: tokens.separatorChipRadius,
            },
          ]}
        >
          <Text
            style={[
              styles.separatorText,
              { fontSize: tokens.separatorFontSize },
            ]}
          >
            {label}
          </Text>
        </View>
      </View>
    ),
    [tokens]
  );

  /* =====================================================
     MESSAGE
  ===================================================== */

  const renderMessage = useCallback(
    (item) => {
      const isMine =
        Number(item.sender_id) === Number(user?.id);

      return (
        <View
          style={[
            styles.messageRow,
            {
              marginBottom: tokens.messageRowMarginBottom,
            },
            isMine ? styles.messageRowMine : styles.messageRowOther,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              {
                maxWidth: tokens.bubbleMaxWidth,
                paddingHorizontal: tokens.bubblePaddingH,
                paddingVertical: tokens.bubblePaddingV,
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
                    lineHeight: tokens.messageTextLineHeight,
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
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      );
    },
    [
      user?.id,
      renderProductCard,
      tokens,
    ]
  );

  /* =====================================================
     FLAT LIST RENDERER
  ===================================================== */

  const renderListItem = useCallback(
    ({ item }) => {
      if (item.type === "separator") {
        return renderDateSeparator(item.label);
      }

      return renderMessage(item.message);
    },
    [renderDateSeparator, renderMessage]
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
          <Send
            size={rs.sx(23)}
            color={COLORS.emptyIconColor}
          />
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
        <Package size={rs.sx(42)} color={COLORS.emptyIconColor} />

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
          The product is attached, but there is no existing
          conversation ID.
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
          <ActivityIndicator
            size="large"
            color={COLORS.sendButtonBg}
          />
        </View>
      </View>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* ==================== HEADER ==================== */}

        <View
          style={[
            styles.headerWrapper,
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
                color={COLORS.headerIcon}
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
                    backgroundColor: COLORS.surfaceMuted,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: tokens.avatarSize,
                    height: tokens.avatarSize,
                    borderRadius: tokens.avatarRadius,
                    backgroundColor: COLORS.sentBubble,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
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
                  { marginLeft: tokens.headerTextMarginLeft },
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

                <Text
                  style={[
                    styles.headerSubtitle,
                    { fontSize: tokens.headerSubtitleSize },
                  ]}
                  numberOfLines={1}
                >
                  {sellerId ? "Marketplace" : "Tap for info"}
                </Text>
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
                color={COLORS.headerIcon}
              />
            </Pressable>
          </View>

          <View style={styles.headerDivider} />
        </View>

        {/* ==================== MESSAGES ==================== */}

        {conversationId ? (
          <FlatList
            ref={flatListRef}
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[
              {
                paddingHorizontal: tokens.listPaddingH,
                paddingTop: tokens.listPaddingTop,
                paddingBottom: tokens.listPaddingBottom,
              },
              listData.length === 0 &&
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
          <View style={styles.inputDivider} />

          <View
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
                placeholderTextColor={COLORS.inputPlaceholder}
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
                editable={!sending && Boolean(conversationId)}
              />

              <Pressable
                onPress={sendMessage}
                disabled={
                  sending || !input.trim() || !conversationId
                }
                style={[
                  styles.sendButton,
                  {
                    width: tokens.sendButtonSize,
                    height: tokens.sendButtonSize,
                    borderRadius: tokens.sendButtonRadius,
                    marginLeft: tokens.sendButtonMarginLeft,
                  },
                  (!input.trim() || sending || !conversationId) &&
                    styles.sendButtonDisabled,
                ]}
                hitSlop={6}
              >
                {sending ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.sendIcon}
                  />
                ) : (
                  <Send
                    size={tokens.sendButtonIcon}
                    color={COLORS.sendIcon}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
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

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* HEADER */

  headerWrapper: {
    backgroundColor: COLORS.headerBg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.headerBorder,
  },

  headerButton: {
    backgroundColor: COLORS.headerButtonBg,
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
    color: COLORS.headerTitle,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: COLORS.headerSubtitle,
    fontWeight: "600",
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
  },

  otherBubble: {
    backgroundColor: COLORS.receivedBubble,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.receivedBubbleBorder,
  },

  messageText: {
    fontWeight: "500",
  },

  messageTextMine: {
    color: COLORS.sentText,
  },

  messageTextOther: {
    color: COLORS.receivedText,
  },

  messageTime: {
    alignSelf: "flex-end",
    fontWeight: "600",
  },

  messageTimeMine: {
    color: COLORS.sentTime,
  },

  messageTimeOther: {
    color: COLORS.receivedTime,
  },

  /* DATE SEPARATOR */

  separatorRow: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  separatorChip: {
    backgroundColor: COLORS.dateChipBg,
  },

  separatorText: {
    color: COLORS.dateChipText,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  /* PRODUCT CARD */

  messageProductCard: {
    overflow: "hidden",
    backgroundColor: COLORS.productCardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.productCardBorder,
    flexDirection: "row",
  },

  messageProductInfo: {
    flex: 1,
  },

  messageProductLabel: {
    color: COLORS.productLabel,
    fontWeight: "900",
    letterSpacing: 1,
  },

  messageProductName: {
    color: COLORS.productName,
    fontWeight: "800",
  },

  messageProductPrice: {
    color: COLORS.productPrice,
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
    backgroundColor: COLORS.emptyIconBg,
  },

  emptyMessagesTitle: {
    color: COLORS.emptyTitle,
    fontWeight: "900",
    marginTop: 14,
  },

  emptyMessagesText: {
    color: COLORS.emptyText,
    marginTop: 5,
    textAlign: "center",
  },

  /* NO CONVERSATION */

  noConversation: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  noConversationTitle: {
    color: COLORS.emptyTitle,
    fontWeight: "900",
    marginTop: 14,
  },

  noConversationText: {
    color: COLORS.emptyText,
    textAlign: "center",
    marginTop: 8,
  },

  /* INPUT */

  inputArea: {
    backgroundColor: COLORS.inputAreaBg,
  },

  inputDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.inputAreaBorder,
  },

  inputGradient: {},

  inputContainer: {
    backgroundColor: COLORS.inputBg,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: 5,
  },

  input: {
    flex: 1,
    color: COLORS.inputText,
    paddingTop: 9,
    paddingBottom: 8,
    textAlignVertical: "center",
  },

  sendButton: {
    backgroundColor: COLORS.sendButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    backgroundColor: COLORS.sendButtonDisabled,
    opacity: 0.7,
  },

  /* PENDING PRODUCT */

  pendingProductWrapper: {
    position: "relative",
  },

  pendingProductCard: {
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.productCardBg,
    borderWidth: 1,
    borderColor: COLORS.productLabel,
  },

  pendingProductInfo: {
    flex: 1,
  },

  pendingProductLabel: {
    color: COLORS.productLabel,
    fontWeight: "900",
    letterSpacing: 1,
  },

  pendingProductName: {
    color: COLORS.productName,
    fontWeight: "800",
  },

  pendingProductPrice: {
    color: COLORS.productPrice,
    fontWeight: "700",
  },

  removePendingProduct: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.productLabel,
  },
});