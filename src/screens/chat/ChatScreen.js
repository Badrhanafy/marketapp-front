import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
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
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  MoreHorizontal,
  Package,
  Send,
  X,
} from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import api from "../../api/client";

import {
  subscribeToConversation,
  unsubscribeFromConversation,
  getReverbSocketId,
} from "../../services/reverb";

import { API_URL } from "../../constants/config";

const MEDIA_URL = API_URL.replace(/\/api\/?$/, "");

/* =========================================================
   PALETTE (green app theme)
========================================================= */

const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#F0FDF4";

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
   STYLES FACTORY (depends on theme + screen size)
========================================================= */

const makeStyles = (theme, rs, insets) => {
  const { sx, sy, fs } = rs;

  const bubbleMax = rs.isSmall
    ? "86%"
    : rs.isLarge || rs.isTablet
    ? "72%"
    : "80%";

  return StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: theme.pageBg },
    listWrap: { flex: 1 },

    /* Header */
    header: {
      backgroundColor: theme.headerBg,
      paddingTop: insets.top + 6,
      paddingBottom: sy(14),
      paddingHorizontal: sx(12),
      flexDirection: "row",
      alignItems: "center",
      borderBottomStartRadius: sx(28),
      overflow: "hidden",
    },
    headerRing: {
      position: "absolute",
      width: 170,
      height: 170,
      borderRadius: 85,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
      top: -80,
      end: -50,
    },
    headerButton: {
      width: sx(40),
      height: sx(40),
      borderRadius: sx(14),
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: sx(10),
    },
    avatarRing: {
      width: sx(46),
      height: sx(46),
      borderRadius: sx(23),
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: {
      width: sx(40),
      height: sx(40),
      borderRadius: sx(20),
      backgroundColor: GREEN_DARK,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: { width: "100%", height: "100%" },
    avatarInitial: {
      color: "#FFFFFF",
      fontSize: fs(16),
      fontWeight: "800",
    },
    headerTextWrap: { flex: 1, marginStart: sx(10) },
    headerTitle: { color: "#FFFFFF", fontSize: fs(16), fontWeight: "800" },
    headerSubtitle: {
      color: "rgba(255,255,255,0.8)",
      fontSize: fs(11.5),
      fontWeight: "600",
      marginTop: 2,
    },

    /* List */
    listContent: {
      paddingHorizontal: sx(12),
      paddingTop: sy(14),
      paddingBottom: sy(14),
    },
    listEmptyContent: { flexGrow: 1, justifyContent: "center" },

    separatorRow: {
      width: "100%",
      alignItems: "center",
      marginTop: sy(14),
      marginBottom: sy(10),
    },
    separatorChip: {
      backgroundColor: theme.chipBg,
      paddingHorizontal: sx(12),
      paddingVertical: sy(5),
      borderRadius: 999,
    },
    separatorText: {
      color: theme.greenText,
      fontSize: fs(11),
      fontWeight: "800",
      letterSpacing: 0.3,
    },

    messageRow: { width: "100%", flexDirection: "row", marginBottom: sy(6) },
    messageRowMine: { justifyContent: "flex-end" },
    messageRowOther: { justifyContent: "flex-start" },
    bubble: {
      maxWidth: bubbleMax,
      paddingHorizontal: sx(12),
      paddingTop: sy(8),
      paddingBottom: sy(6),
      borderRadius: sx(18),
      overflow: "hidden",
    },
    bubbleMine: {
      backgroundColor: GREEN,
      borderBottomEndRadius: sx(5),
    },
    bubbleOther: {
      backgroundColor: theme.surface,
      borderBottomStartRadius: sx(5),
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    messageText: {
      fontSize: fs(14.5),
      lineHeight: fs(20),
      fontWeight: "500",
    },
    messageTextMine: { color: "#FFFFFF" },
    messageTextOther: { color: theme.titleText },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
      marginTop: sy(3),
    },
    timeText: { fontSize: fs(10), fontWeight: "600" },
    timeMine: { color: "rgba(255,255,255,0.78)" },
    timeOther: { color: theme.mutedText },

    /* Product card inside bubble */
    productCard: {
      width: sx(220),
      minHeight: sy(72),
      borderRadius: sx(12),
      marginBottom: sy(7),
      overflow: "hidden",
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    productImage: {
      width: sx(72),
      height: sx(72),
      backgroundColor: theme.greenChip,
      alignItems: "center",
      justifyContent: "center",
    },
    productInfo: {
      flex: 1,
      paddingHorizontal: sx(9),
      paddingVertical: sy(8),
    },
    productLabel: {
      color: theme.greenText,
      fontSize: fs(8.5),
      fontWeight: "900",
      letterSpacing: 1,
    },
    productName: {
      color: theme.titleText,
      fontSize: fs(12.5),
      fontWeight: "800",
      marginTop: sy(3),
    },
    productPrice: {
      color: theme.primary,
      fontSize: fs(12),
      fontWeight: "800",
      marginTop: sy(3),
    },

    /* Empty / skeleton / no conversation */
    empty: { alignItems: "center", justifyContent: "center", padding: 30 },
    emptyIcon: {
      width: sx(60),
      height: sx(60),
      borderRadius: sx(30),
      backgroundColor: theme.greenChip,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      color: theme.titleText,
      fontSize: fs(17),
      fontWeight: "800",
      marginTop: 14,
      textAlign: "center",
    },
    emptyText: {
      color: theme.mutedText,
      fontSize: fs(13),
      marginTop: 6,
      textAlign: "center",
      lineHeight: fs(19),
    },
    noConversation: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },
    skeletonWrap: { paddingTop: sy(6) },
    skelBubble: {
      height: sy(40),
      borderRadius: sx(18),
      backgroundColor: theme.surfaceAlt,
      marginBottom: sy(10),
    },

    /* Scroll-to-bottom button */
    fab: {
      position: "absolute",
      end: sx(14),
      bottom: sy(12),
      width: sx(42),
      height: sx(42),
      borderRadius: sx(21),
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.cardBorder,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 6,
    },
    fabBadge: {
      position: "absolute",
      top: -7,
      end: -4,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      backgroundColor: GREEN,
      alignItems: "center",
      justifyContent: "center",
    },
    fabBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },

    /* Composer */
    inputArea: {
      backgroundColor: theme.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      paddingHorizontal: sx(10),
      paddingTop: sy(8),
    },
    pendingWrap: { marginBottom: sy(8) },
    pendingCard: {
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
      borderRadius: sx(14),
      backgroundColor: theme.greenSoft,
      borderWidth: 1,
      borderColor: theme.greenChip,
      paddingEnd: sx(38),
    },
    pendingImage: {
      width: sx(62),
      height: sx(62),
      backgroundColor: theme.greenChip,
      alignItems: "center",
      justifyContent: "center",
    },
    pendingInfo: {
      flex: 1,
      paddingHorizontal: sx(10),
      paddingVertical: sy(8),
    },
    pendingLabel: {
      color: theme.greenText,
      fontSize: fs(8.5),
      fontWeight: "900",
      letterSpacing: 1,
    },
    pendingName: {
      color: theme.titleText,
      fontSize: fs(13),
      fontWeight: "800",
      marginTop: 2,
    },
    pendingPrice: {
      color: theme.primary,
      fontSize: fs(11.5),
      fontWeight: "800",
      marginTop: 2,
    },
    pendingRemove: {
      position: "absolute",
      top: sy(8),
      end: sx(8),
      width: sx(24),
      height: sx(24),
      borderRadius: sx(12),
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    inputRow: { flexDirection: "row", alignItems: "flex-end", gap: sx(8) },
    inputContainer: {
      flex: 1,
      backgroundColor: theme.fieldBg,
      borderRadius: sx(24),
      borderWidth: 1.5,
      paddingStart: sx(16),
      paddingEnd: sx(10),
      justifyContent: "center",
    },
    input: {
      color: theme.titleText,
      fontSize: fs(15),
      lineHeight: fs(20),
      paddingTop: 0,
      paddingBottom: 0,
      textAlignVertical: "center",
    },
    sendButton: {
      width: sx(48),
      height: sx(48),
      borderRadius: sx(24),
      backgroundColor: GREEN,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: GREEN_DARK,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 4,
    },
  });
};

/* =========================================================
   SMALL COMPONENTS
========================================================= */

/* Product card shown inside a message bubble */
const BubbleProduct = React.memo(function BubbleProduct({ product, st, rs }) {
  const image = getProductImage(product);

  return (
    <View style={st.productCard}>
      {image ? (
        <Image
          source={{ uri: image }}
          style={{ width: rs.sx(72), height: rs.sx(72) }}
          resizeMode="cover"
        />
      ) : (
        <View style={st.productImage}>
          <Package size={rs.sx(22)} color={GREEN} />
        </View>
      )}

      <View style={st.productInfo}>
        <Text style={st.productLabel}>PRODUCT</Text>
        <Text style={st.productName} numberOfLines={2}>
          {product.name || product.product_name || "Product"}
        </Text>
        {product.price != null && (
          <Text style={st.productPrice}>{product.price} MAD</Text>
        )}
      </View>
    </View>
  );
});

/* One chat bubble. Memoized so typing never re-renders the list. */
const MessageRow = React.memo(function MessageRow({
  item,
  isMine,
  fresh,
  onAnimated,
  st,
  rs,
}) {
  const anim = useRef(new Animated.Value(fresh ? 0 : 1)).current;

  useEffect(() => {
    if (!fresh) return;

    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onAnimated?.(item.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sending = item.status === "sending";

  return (
    <Animated.View
      style={[
        st.messageRow,
        isMine ? st.messageRowMine : st.messageRowOther,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[st.bubble, isMine ? st.bubbleMine : st.bubbleOther]}>
        {item.product ? (
          <BubbleProduct product={item.product} st={st} rs={rs} />
        ) : null}

        {item.message ? (
          <Text
            style={[
              st.messageText,
              isMine ? st.messageTextMine : st.messageTextOther,
            ]}
          >
            {item.message}
          </Text>
        ) : null}

        <View style={st.metaRow}>
          <Text style={[st.timeText, isMine ? st.timeMine : st.timeOther]}>
            {formatTime(item.created_at)}
          </Text>

          {isMine ? (
            sending ? (
              <Clock size={12} color="rgba(255,255,255,0.78)" />
            ) : item.read_at ? (
              <CheckCheck size={14} color="#BFDBFE" />
            ) : (
              <Check size={14} color="rgba(255,255,255,0.78)" />
            )
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
});

const DateSeparator = React.memo(function DateSeparator({ label, st }) {
  return (
    <View style={st.separatorRow}>
      <View style={st.separatorChip}>
        <Text style={st.separatorText}>{label}</Text>
      </View>
    </View>
  );
});

/* Pulsing placeholder bubbles while the conversation loads */
const SkeletonBubbles = React.memo(function SkeletonBubbles({ st }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const rows = [
    { w: "58%", mine: false },
    { w: "42%", mine: true },
    { w: "66%", mine: false },
    { w: "36%", mine: true },
  ];

  return (
    <View style={st.skeletonWrap}>
      {rows.map((r, i) => (
        <Animated.View
          key={i}
          style={[
            st.skelBubble,
            {
              width: r.w,
              alignSelf: r.mine ? "flex-end" : "flex-start",
              opacity: pulse,
            },
          ]}
        />
      ))}
    </View>
  );
});

/**
 * Composer owns the text state, so every keystroke re-renders
 * only this small component — never the header or the message list.
 */
const Composer = React.memo(function Composer({
  theme,
  st,
  rs,
  insets,
  disabled,
  pendingProduct,
  onRemoveProduct,
  onSend,
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [kbVisible, setKbVisible] = useState(false);

  const minH = rs.fs(20) + 20;
  const maxH = rs.fs(20) * 5 + 20;
  const [inputH, setInputH] = useState(minH);

  const canSend = input.trim().length > 0 && !disabled;

  /* Send button spring */
  const sendAnim = useRef(new Animated.Value(canSend ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(sendAnim, {
      toValue: canSend ? 1 : 0,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [canSend, sendAnim]);

  /* Drop the home-indicator padding while the keyboard is open */
  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const s = Keyboard.addListener(showEvt, () => setKbVisible(true));
    const h = Keyboard.addListener(hideEvt, () => setKbVisible(false));

    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const handleContentSize = useCallback(
    (e) => {
      const h = e.nativeEvent.contentSize.height + 20;
      const next = clamp(h, minH, maxH);
      setInputH((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    },
    [minH, maxH]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || disabled) return;

    // Clear immediately so typing the next message is instant
    setInput("");
    setInputH(minH);

    const ok = await onSend(text);

    // Restore the draft if sending failed and the user hasn't typed anything new
    if (!ok) setInput((current) => (current ? current : text));
  }, [input, disabled, onSend, minH]);

  const pendingImage = pendingProduct ? getProductImage(pendingProduct) : null;

  return (
    <View
      style={[
        st.inputArea,
        { paddingBottom: kbVisible ? 8 : Math.max(insets.bottom, 10) },
      ]}
    >
      {pendingProduct ? (
        <View style={st.pendingWrap}>
          <View style={st.pendingCard}>
            {pendingImage ? (
              <Image
                source={{ uri: pendingImage }}
                style={{ width: rs.sx(62), height: rs.sx(62) }}
                resizeMode="cover"
              />
            ) : (
              <View style={st.pendingImage}>
                <Package size={rs.sx(21)} color={GREEN} />
              </View>
            )}

            <View style={st.pendingInfo}>
              <Text style={st.pendingLabel}>ATTACHED PRODUCT</Text>
              <Text style={st.pendingName} numberOfLines={1}>
                {pendingProduct.name || pendingProduct.product_name || "Product"}
              </Text>
              {pendingProduct.price != null && (
                <Text style={st.pendingPrice}>{pendingProduct.price} MAD</Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={onRemoveProduct}
            style={st.pendingRemove}
            hitSlop={8}
          >
            <X size={rs.sx(14)} color={GREEN_DARK} />
          </Pressable>
        </View>
      ) : null}

      <View style={st.inputRow}>
        <View
          style={[
            st.inputContainer,
            {
              height: inputH,
              borderColor: focused ? theme.primary : "transparent",
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            onContentSizeChange={handleContentSize}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              pendingProduct
                ? "Write your message..."
                : "Type your message here..."
            }
            placeholderTextColor={theme.mutedText}
            multiline
            maxLength={2000}
            scrollEnabled={inputH >= maxH}
            style={[st.input, { height: inputH - 20 }]}
            editable={!disabled}
          />
        </View>

        <Animated.View
          style={{
            opacity: sendAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.55, 1],
            }),
            transform: [
              {
                scale: sendAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.88, 1],
                }),
              },
            ],
          }}
        >
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={st.sendButton}
            hitSlop={6}
          >
            <Send size={rs.sx(19)} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
});

/* =========================================================
   SCREEN
========================================================= */

export default function ChatScreen({ navigation, route }) {
  const { user, token } = useAuth();
  const { colors, isDark } = useTheme();

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
     THEME + STYLES
  ===================================================== */

  const theme = useMemo(
    () => ({
      pageBg: isDark ? colors.background : "#F4F8F5",
      surface: colors.surface,
      surfaceAlt: colors.surfaceSecondary,
      border: colors.border,
      fieldBg: colors.surfaceSecondary,

      primary: isDark ? "#22C55E" : GREEN,
      greenText: isDark ? "#4ADE80" : GREEN_DARK,
      greenSoft: isDark ? "rgba(34,197,94,0.12)" : GREEN_TINT,
      greenChip: isDark ? "rgba(34,197,94,0.18)" : GREEN_SOFT,
      chipBg: isDark ? "rgba(34,197,94,0.16)" : GREEN_SOFT,

      titleText: colors.text,
      mutedText: colors.inactive,

      cardBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(22,163,74,0.12)",
      shadow: isDark ? "#000000" : GREEN_DARK,

      headerBg: isDark ? "#14532D" : GREEN,
    }),
    [colors, isDark]
  );

  const st = useMemo(
    () => makeStyles(theme, rs, { top: insets.top, bottom: insets.bottom }),
    [theme, rs, insets.top, insets.bottom]
  );

  /* =====================================================
     REFS
  ===================================================== */

  const flatListRef = useRef(null);
  const isFocusedRef = useRef(false);
  const markingAsReadRef = useRef(false);
  const conversationIdRef = useRef(conversationId);

  const isAtBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);
  const listLenRef = useRef(0);
  const freshIdsRef = useRef(new Set());

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  /* =====================================================
     STATE
  ===================================================== */

  const [conversation, setConversation] = useState(
    params.conversation || null
  );

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [, setSelectedProduct] = useState(null);

  const [pendingProduct, setPendingProduct] = useState(
    fromProductDetails && routeProduct ? routeProduct : null
  );

  const [otherUser, setOtherUser] = useState(null);

  const [showFab, setShowFab] = useState(false);
  const [newCount, setNewCount] = useState(0);

  /* =====================================================
     MEMOS
  ===================================================== */

  const pendingProductId = useMemo(() => {
    if (!pendingProduct?.id) return null;

    return Number(pendingProduct.id);
  }, [pendingProduct]);

  const listData = useMemo(() => buildListData(messages), [messages]);

  listLenRef.current = listData.length;

  const derivedOtherUser = useMemo(() => {
    if (otherUser) return otherUser;
    if (conversation?.other_user) return conversation.other_user;
    if (conversation?.otherUser) return conversation.otherUser;
    if (conversation?.seller) return conversation.seller;
    if (conversation?.user) return conversation.user;

    const fromMessages = messages.find(
      (m) => m?.sender && Number(m.sender.id) !== Number(user?.id)
    )?.sender;

    return fromMessages || null;
  }, [otherUser, conversation, messages, user?.id]);

  const headerName = useMemo(
    () => derivedOtherUser?.name || derivedOtherUser?.username || "Chat",
    [derivedOtherUser]
  );

  const headerAvatarUri = useMemo(
    () => getUserAvatar(derivedOtherUser),
    [derivedOtherUser]
  );

  const headerInitial = useMemo(() => getInitial(headerName), [headerName]);

  /* =====================================================
     LOAD CONVERSATION
  ===================================================== */

  const loadConversation = useCallback(async () => {
    if (!conversationId) return null;

    try {
      const response = await api.get(`/conversations/${conversationId}`);

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
          const isMine = Number(message.sender_id) === Number(user?.id);

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
        await Promise.all([loadConversation(), loadMessages()]);
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

        freshIdsRef.current.add(String(normalized.id));

        return [...prev, normalized];
      });

      if (normalized.product) {
        setSelectedProduct(normalized.product);
      }

      // Not at the bottom → show a "new messages" counter on the FAB
      const mine = Number(normalized.sender_id) === Number(user?.id);

      if (!isAtBottomRef.current && !mine) {
        setNewCount((c) => c + 1);
      }

      if (isFocusedRef.current) {
        setTimeout(() => {
          markMessagesAsRead();
        }, 100);
      }
    },
    [markMessagesAsRead, user?.id]
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
     SCROLL BEHAVIOUR
  ===================================================== */

  const scrollToBottom = useCallback((animated = true) => {
    flatListRef.current?.scrollToEnd?.({ animated });
  }, []);

  const handleScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;

    const distance =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);

    const atBottom = distance < 60;
    isAtBottomRef.current = atBottom;

    const far = distance > 280;
    setShowFab((prev) => (prev === far ? prev : far));

    if (atBottom) setNewCount((prev) => (prev ? 0 : prev));
  }, []);

  // New content: follow along only if the user is already at the bottom
  const handleContentSizeChange = useCallback(() => {
    if (!initialScrollDoneRef.current) {
      if (listLenRef.current > 0) {
        scrollToBottom(false);
        initialScrollDoneRef.current = true;
      }
      return;
    }

    if (isAtBottomRef.current) scrollToBottom(true);
  }, [scrollToBottom]);

  // List shrinks/grows (keyboard open/close, composer growth): stay pinned
  const handleListLayout = useCallback(() => {
    if (isAtBottomRef.current && initialScrollDoneRef.current) {
      scrollToBottom(false);
    }
  }, [scrollToBottom]);

  const handleFabPress = useCallback(() => {
    isAtBottomRef.current = true;
    setNewCount(0);
    scrollToBottom(true);
  }, [scrollToBottom]);

  /* Floating button animation */
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fabAnim, {
      toValue: showFab ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showFab, fabAnim]);

  /* =====================================================
     SEND MESSAGE (optimistic)
  ===================================================== */

  const sendMessage = useCallback(
    async (text) => {
      if (!text) return false;

      if (!conversationId) {
        Alert.alert("Chat unavailable", "There is no conversation yet.");
        return false;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const productSnapshot = pendingProduct;
      const activeProductId = pendingProductId;

      const optimistic = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user?.id ?? null,
        message: text,
        product_id: activeProductId,
        product: productSnapshot,
        sender: null,
        read_at: null,
        created_at: new Date().toISOString(),
        updated_at: null,
        status: "sending",
      };

      // Show it instantly and keep the list pinned to the bottom
      isAtBottomRef.current = true;
      freshIdsRef.current.add(tempId);
      setMessages((prev) => [...prev, optimistic]);
      setPendingProduct(null);

      try {
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

        const rawMessage = response?.data?.data ?? response?.data ?? null;

        const sentMessage = normalizeMessage(rawMessage, user?.id);

        setMessages((prev) => {
          if (!sentMessage) {
            return prev.map((m) =>
              m.id === tempId ? { ...m, status: undefined } : m
            );
          }

          const exists = prev.some(
            (item) => String(item.id) === String(sentMessage.id)
          );

          if (exists) return prev.filter((m) => m.id !== tempId);

          return prev.map((m) => (m.id === tempId ? sentMessage : m));
        });

        if (sentMessage?.product) {
          setSelectedProduct(sentMessage.product);
        }

        return true;
      } catch (error) {
        console.log(
          "❌ SEND MESSAGE ERROR:",
          error?.response?.data || error?.message || error
        );

        // Roll back the optimistic bubble and restore the attachment
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setPendingProduct(productSnapshot);

        Alert.alert(
          "Message failed",
          error?.response?.data?.message || "Unable to send message."
        );

        return false;
      }
    },
    [conversationId, pendingProduct, pendingProductId, token, user?.id]
  );

  const removePendingProduct = useCallback(() => {
    setPendingProduct(null);
  }, []);

  const handleAnimated = useCallback((id) => {
    freshIdsRef.current.delete(String(id));
  }, []);

  /* =====================================================
     LIST RENDERERS
  ===================================================== */

  const renderListItem = useCallback(
    ({ item }) => {
      if (item.type === "separator") {
        return <DateSeparator label={item.label} st={st} />;
      }

      const message = item.message;
      const isMine = Number(message.sender_id) === Number(user?.id);

      return (
        <MessageRow
          item={message}
          isMine={isMine}
          fresh={freshIdsRef.current.has(String(message.id))}
          onAnimated={handleAnimated}
          st={st}
          rs={rs}
        />
      );
    },
    [st, rs, user?.id, handleAnimated]
  );

  const renderEmpty = useCallback(() => {
    if (loading) return <SkeletonBubbles st={st} />;

    return (
      <View style={st.empty}>
        <View style={st.emptyIcon}>
          <Send size={rs.sx(24)} color={theme.primary} />
        </View>
        <Text style={st.emptyTitle}>Start conversation</Text>
        <Text style={st.emptyText}>Send a message to start chatting.</Text>
      </View>
    );
  }, [loading, st, rs, theme.primary]);

  const renderNoConversation = () => (
    <View style={st.noConversation}>
      <View style={st.emptyIcon}>
        <Package size={rs.sx(26)} color={theme.primary} />
      </View>
      <Text style={st.emptyTitle}>Conversation not found</Text>
      <Text style={st.emptyText}>
        The product is attached, but there is no existing conversation ID.
      </Text>
    </View>
  );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <View style={st.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        style={st.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* ==================== HEADER ==================== */}

        <View style={st.header}>
          <View style={st.headerRing} pointerEvents="none" />

          <Pressable
            onPress={() => navigation.goBack()}
            style={st.headerButton}
            hitSlop={8}
          >
            <ArrowLeft size={rs.sx(20)} color="#FFFFFF" />
          </Pressable>

          <View style={st.headerCenter}>
            <View style={st.avatarRing}>
              <View style={st.avatar}>
                {headerAvatarUri ? (
                  <Image source={{ uri: headerAvatarUri }} style={st.avatarImage} />
                ) : (
                  <Text style={st.avatarInitial}>{headerInitial}</Text>
                )}
              </View>
            </View>

            <View style={st.headerTextWrap}>
              <Text style={st.headerTitle} numberOfLines={1}>
                {headerName}
              </Text>
              <Text style={st.headerSubtitle} numberOfLines={1}>
                {sellerId ? "Marketplace" : "Tap for info"}
              </Text>
            </View>
          </View>

          <Pressable style={st.headerButton} hitSlop={8}>
            <MoreHorizontal size={rs.sx(19)} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* ==================== MESSAGES ==================== */}

        {conversationId ? (
          <View style={st.listWrap}>
            <FlatList
              ref={flatListRef}
              data={loading ? [] : listData}
              keyExtractor={(item) => item.id}
              renderItem={renderListItem}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={[
                st.listContent,
                (loading || listData.length === 0) && st.listEmptyContent,
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onContentSizeChange={handleContentSizeChange}
              onLayout={handleListLayout}
              initialNumToRender={18}
              windowSize={11}
              removeClippedSubviews={Platform.OS === "android"}
            />

            {/* Jump to latest */}
            <Animated.View
              pointerEvents={showFab ? "auto" : "none"}
              style={[
                st.fab,
                {
                  opacity: fabAnim,
                  transform: [
                    {
                      translateY: fabAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                    {
                      scale: fabAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable
                onPress={handleFabPress}
                style={StyleSheet.absoluteFill}
                hitSlop={6}
              >
                <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                  <ChevronDown size={rs.sx(22)} color={theme.primary} />
                </View>
              </Pressable>

              {newCount > 0 ? (
                <View style={st.fabBadge} pointerEvents="none">
                  <Text style={st.fabBadgeText}>
                    {newCount > 99 ? "99+" : newCount}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          </View>
        ) : (
          renderNoConversation()
        )}

        {/* ==================== INPUT ==================== */}

        <Composer
          theme={theme}
          st={st}
          rs={rs}
          insets={insets}
          disabled={!conversationId}
          pendingProduct={pendingProduct}
          onRemoveProduct={removePendingProduct}
          onSend={sendMessage}
        />
      </KeyboardAvoidingView>
    </View>
  );
}