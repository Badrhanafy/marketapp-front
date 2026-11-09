import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  XCircle,
  MessageCircle,
  CheckCheck,
  RotateCcw,
  SearchX,
  WifiOff,
  Tag,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  subscribeToConversation,
  unsubscribeFromConversation,
} from "../../services/reverb";
import { API_URL } from "../../constants/config";

const MEDIA_URL = API_URL.replace(/\/api\/?$/, "");

// ── Palette (same green app theme as Products) ──
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#F0FDF4";
const RED = "#DC2626";

const RTL = I18nManager.isRTL;
const AVATAR = 56;
const THUMB = 24;

/* ------------------------------------------------------------------ */
/* Skeleton rows                                                       */
/* ------------------------------------------------------------------ */
function SkeletonRows({ theme }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Animated.View key={i} style={[styles.row, { opacity: pulse }]}>
          <View style={[styles.skelAvatar, { backgroundColor: theme.surfaceAlt }]} />
          <View style={styles.skelInfo}>
            <View style={[styles.skelBar, { width: "50%", backgroundColor: theme.surfaceAlt }]} />
            <View style={[styles.skelBar, { width: "30%", height: 9, backgroundColor: theme.surfaceAlt }]} />
            <View style={[styles.skelBar, { width: "75%", backgroundColor: theme.surfaceAlt }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Conversation row                                                    */
/* ------------------------------------------------------------------ */
const ConversationRow = React.memo(function ConversationRow({
  theme,
  name,
  avatar,
  productThumb,
  productName,
  lastMessage,
  time,
  unread,
  lastIsMine,
  role,
  onPress,
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => setAvatarFailed(false), [avatar]);
  useEffect(() => setThumbFailed(false), [productThumb]);

  const hasUnread = unread > 0;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.ripple }}
      style={({ pressed }) => [
        styles.row,
        hasUnread && { backgroundColor: theme.greenSoft },
        pressed && { backgroundColor: theme.pressed },
      ]}
    >
      {/* Avatar + product thumbnail badge */}
      <View style={styles.avatarWrap}>
        {avatar && !avatarFailed ? (
          <Image
            source={{ uri: avatar }}
            style={[styles.avatar, { backgroundColor: theme.surfaceAlt }]}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.greenChip }]}>
            <Text style={[styles.avatarInitial, { color: theme.greenText }]}>
              {(name || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {productThumb && !thumbFailed ? (
          <Image
            source={{ uri: productThumb }}
            style={[
              styles.thumb,
              { borderColor: hasUnread ? theme.greenSoftSolid : theme.pageBg, backgroundColor: theme.surfaceAlt },
            ]}
            onError={() => setThumbFailed(true)}
          />
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.lineTop}>
          <Text
            numberOfLines={1}
            style={[
              styles.name,
              { color: theme.titleText, fontWeight: hasUnread ? "800" : "700" },
            ]}
          >
            {name}
          </Text>
          <Text
            style={[
              styles.time,
              { color: hasUnread ? theme.primary : theme.mutedText },
              hasUnread && { fontWeight: "800" },
            ]}
          >
            {time}
          </Text>
        </View>

        <View style={styles.lineMid}>
          {productName ? (
            <View style={[styles.productTag, { backgroundColor: theme.greenChip }]}>
              <Tag size={10} color={theme.greenText} strokeWidth={2.6} />
              <Text
                numberOfLines={1}
                style={[styles.productTagText, { color: theme.greenText }]}
              >
                {productName}
              </Text>
            </View>
          ) : null}
          {role ? (
            <Text style={[styles.roleText, { color: theme.mutedText }]}>{role}</Text>
          ) : null}
        </View>

        <View style={styles.lineBottom}>
          {lastIsMine ? (
            <CheckCheck
              size={15}
              color={theme.primary}
              strokeWidth={2.5}
              style={styles.check}
            />
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              styles.preview,
              hasUnread
                ? { color: theme.titleText, fontWeight: "700" }
                : { color: theme.bodyText },
            ]}
          >
            {lastMessage}
          </Text>

          {hasUnread ? (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/* Main screen                                                         */
/* ------------------------------------------------------------------ */
const ChatListScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  /* ---- Theme bundle (same tokens as Products) ---- */
  const theme = useMemo(
    () => ({
      pageBg: colors.background,
      surface: colors.surface,
      surfaceAlt: colors.surfaceSecondary,
      border: colors.border,

      primary: isDark ? "#22C55E" : GREEN,
      greenText: isDark ? "#4ADE80" : GREEN_DARK,
      greenSoft: isDark ? "rgba(34,197,94,0.10)" : GREEN_TINT,
      greenSoftSolid: isDark ? "#10251a" : GREEN_TINT,
      greenChip: isDark ? "rgba(34,197,94,0.18)" : GREEN_SOFT,

      titleText: colors.text,
      bodyText: colors.textSecondary,
      mutedText: colors.inactive,

      divider: isDark ? "rgba(255,255,255,0.07)" : "rgba(22,163,74,0.10)",
      shadow: isDark ? "#000000" : GREEN_DARK,
      iconBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
      pressed: isDark ? "rgba(255,255,255,0.05)" : "rgba(22,163,74,0.06)",
      ripple: isDark ? "rgba(255,255,255,0.08)" : "rgba(22,163,74,0.10)",

      headerBg: isDark ? "#14532D" : GREEN,
    }),
    [colors, isDark]
  );

  /* ---- State ---- */
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  /* conversationId -> number of new incoming messages (local only) */
  const [unreadMap, setUnreadMap] = useState({});

  const subscriptionsRef = useRef(new Map());
  const loadingRef = useRef(false);

  /* ---- Media ---- */
  const normalizeMediaUrl = useCallback((value) => {
    if (!value || typeof value !== "string") return null;
    if (value.startsWith("http://") || value.startsWith("https://")) return value;

    const cleanPath = value.replace(/^\/+/, "");
    if (cleanPath.startsWith("storage/")) return `${MEDIA_URL}/${cleanPath}`;
    return `${MEDIA_URL}/storage/${cleanPath}`;
  }, []);

  /* ---- Conversation helpers ---- */
  const getOtherUser = useCallback(
    (conversation) => {
      if (!conversation || !user?.id) return null;
      const me = Number(user.id);
      if (Number(conversation.buyer_id) === me) return conversation.seller || null;
      if (Number(conversation.seller_id) === me) return conversation.buyer || null;
      return null;
    },
    [user?.id]
  );

  // "buying" when I'm the buyer, "selling" when I'm the seller
  const getRoleKey = useCallback(
    (conversation) => {
      const me = Number(user?.id);
      if (Number(conversation?.buyer_id) === me) return "buying";
      if (Number(conversation?.seller_id) === me) return "selling";
      return null;
    },
    [user?.id]
  );

  const getLastMessageObject = useCallback(
    (conversation) => conversation?.lastMessage || conversation?.last_message || null,
    []
  );

  const getLastMessage = useCallback(
    (conversation) => {
      const message = getLastMessageObject(conversation);
      const fallback = t("chat.noMessages", { defaultValue: "No messages yet" });
      if (!message) return fallback;
      if (typeof message === "string") return message;
      return message.message || message.body || fallback;
    },
    [getLastMessageObject, t]
  );

  const getLastMessageDate = useCallback(
    (conversation) => {
      const message = getLastMessageObject(conversation);
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
    (conversation) => getLastMessageObject(conversation)?.product || null,
    [getLastMessageObject]
  );

  const getProductImage = useCallback(
    (conversation) => {
      const product = getLastMessageProduct(conversation);
      if (!product) return null;

      const media = product.media || product.product_media || product.productMedia || [];

      if (Array.isArray(media) && media.length > 0) {
        const sorted = [...media].sort(
          (a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0)
        );
        const first = sorted[0];
        return normalizeMediaUrl(first?.path || first?.url || first?.image || first?.src);
      }

      return normalizeMediaUrl(
        product.image || product.image_url || product.thumbnail || product.photo
      );
    },
    [getLastMessageProduct, normalizeMediaUrl]
  );

  const formatTime = useCallback((dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return "";

      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }

      const diff = now.getTime() - date.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      if (diff >= 0 && diff < 7 * oneDay) {
        return date.toLocaleDateString([], { weekday: "short" });
      }

      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
    } catch {
      return "";
    }
  }, []);

  const sortConversations = useCallback(
    (items) =>
      [...items].sort((a, b) => {
        const dateA = new Date(getLastMessageDate(a) || 0).getTime();
        const dateB = new Date(getLastMessageDate(b) || 0).getTime();
        return dateB - dateA;
      }),
    [getLastMessageDate]
  );

  /* ---- Load ---- */
  const loadConversations = useCallback(
    async (isRefresh = false) => {
      if (!token || !user?.id) {
        setLoading(false);
        return;
      }
      if (loadingRef.current && !isRefresh) return;

      try {
        loadingRef.current = true;
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/conversations`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.message || "Failed to load conversations.");
        }

        const data = json?.conversations || json?.data || [];
        setConversations(Array.isArray(data) ? sortConversations(data) : []);
        // Unread indicator is controlled locally on purpose
        // (no unread_count from the API).
      } catch (err) {
        console.error("❌ ChatList error:", err);
        setError(err?.message || "Unable to load conversations.");
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, user?.id, sortConversations]
  );

  /* ---- Realtime ---- */
  const handleRealtimeMessage = useCallback(
    (conversationId, payload) => {
      const realtimeMessage =
        payload?.message || payload?.data?.message || payload?.data || payload;

      if (!realtimeMessage) return;

      const incomingConversationId = Number(
        realtimeMessage.conversation_id ?? conversationId
      );
      const senderId = Number(realtimeMessage.sender_id ?? realtimeMessage.sender?.id);
      const isMine = senderId === Number(user?.id);

      setConversations((current) => {
        const index = current.findIndex(
          (c) => Number(c.id) === incomingConversationId
        );

        if (index === -1) {
          setTimeout(() => loadConversations(), 0);
          return current;
        }

        const oldConversation = current[index];
        const oldLastMessage = getLastMessageObject(oldConversation);

        const updatedLastMessage = {
          ...(oldLastMessage || {}),
          ...realtimeMessage,
        };

        if (Object.prototype.hasOwnProperty.call(realtimeMessage, "product")) {
          updatedLastMessage.product = realtimeMessage.product;
        }

        const updatedConversation = {
          ...oldConversation,
          lastMessage: updatedLastMessage,
          last_message: updatedLastMessage,
          last_message_at: realtimeMessage.created_at || oldConversation.last_message_at,
          updated_at: realtimeMessage.created_at || oldConversation.updated_at,
        };

        const next = [...current];
        next.splice(index, 1);
        next.unshift(updatedConversation);
        return next;
      });

      // Only incoming messages raise the unread badge
      if (!isMine) {
        const key = String(incomingConversationId);
        setUnreadMap((current) => ({
          ...current,
          [key]: (current[key] || 0) + 1,
        }));
      }
    },
    [user?.id, loadConversations, getLastMessageObject]
  );

  const subscribeToAllConversations = useCallback(() => {
    if (!token || !user?.id || !conversations.length) return;

    conversations.forEach((conversation) => {
      const conversationId = conversation?.id;
      if (!conversationId) return;

      const key = String(conversationId);
      if (subscriptionsRef.current.has(key)) return;

      try {
        const result = subscribeToConversation(conversationId, (payload) => {
          handleRealtimeMessage(conversationId, payload);
        });
        subscriptionsRef.current.set(key, result || true);
      } catch (err) {
        console.error(`❌ Reverb subscription failed: conversation.${conversationId}`, err);
      }
    });
  }, [token, user?.id, conversations, handleRealtimeMessage]);

  /* ---- Effects ---- */
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    subscribeToAllConversations();
  }, [subscribeToAllConversations]);

  useEffect(() => {
    const subscriptions = subscriptionsRef.current;
    return () => {
      subscriptions.forEach((_, conversationId) => {
        try {
          unsubscribeFromConversation(conversationId);
        } catch (err) {
          console.log("❌ Reverb unsubscribe error:", err);
        }
      });
      subscriptions.clear();
    };
  }, []);

  /* ---- Open chat ---- */
  const openConversation = useCallback(
    (conversation) => {
      setUnreadMap((current) => {
        const key = String(conversation.id);
        if (!current[key]) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });

      const product = getLastMessageObject(conversation)?.product || null;

      navigation.navigate("Chat", {
        conversationId: conversation.id,
        otherUser: getOtherUser(conversation),
        sellerId: conversation?.seller_id ?? null,
        product,
        productId: product?.id ?? null,
      });
    },
    [getOtherUser, getLastMessageObject, navigation]
  );

  /* ---- Tabs + search ---- */
  const totalUnread = useMemo(
    () => Object.values(unreadMap).reduce((sum, n) => sum + n, 0),
    [unreadMap]
  );

  const tabCounts = useMemo(() => {
    let unread = 0;
    let buying = 0;
    let selling = 0;
    conversations.forEach((c) => {
      if (unreadMap[String(c.id)]) unread += 1;
      const role = getRoleKey(c);
      if (role === "buying") buying += 1;
      if (role === "selling") selling += 1;
    });
    return { all: conversations.length, unread, buying, selling };
  }, [conversations, unreadMap, getRoleKey]);

  const tabs = [
    { key: "all", label: t("chat.tabAll", { defaultValue: "All" }) },
    { key: "unread", label: t("chat.tabUnread", { defaultValue: "Unread" }) },
    { key: "buying", label: t("chat.tabBuying", { defaultValue: "Buying" }) },
    { key: "selling", label: t("chat.tabSelling", { defaultValue: "Selling" }) },
  ];

  const visibleConversations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return conversations.filter((c) => {
      if (activeTab === "unread" && !unreadMap[String(c.id)]) return false;
      if (activeTab === "buying" && getRoleKey(c) !== "buying") return false;
      if (activeTab === "selling" && getRoleKey(c) !== "selling") return false;

      if (!q) return true;

      const haystack = [
        getOtherUser(c)?.name,
        getLastMessageProduct(c)?.name,
        getLastMessage(c),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    conversations,
    activeTab,
    searchQuery,
    unreadMap,
    getRoleKey,
    getOtherUser,
    getLastMessageProduct,
    getLastMessage,
  ]);

  /* ---- Render pieces ---- */
  const renderItem = useCallback(
    ({ item }) => {
      const otherUser = getOtherUser(item);
      const lastObj = getLastMessageObject(item);
      const senderId = Number(lastObj?.sender_id ?? lastObj?.sender?.id);
      const role = getRoleKey(item);

      return (
        <ConversationRow
          theme={theme}
          name={otherUser?.name || t("chat.unknownUser", { defaultValue: "Unknown user" })}
          avatar={normalizeMediaUrl(otherUser?.avatar)}
          productThumb={getProductImage(item)}
          productName={getLastMessageProduct(item)?.name}
          lastMessage={getLastMessage(item)}
          time={formatTime(getLastMessageDate(item))}
          unread={unreadMap[String(item.id)] || 0}
          lastIsMine={Boolean(lastObj && senderId === Number(user?.id))}
          role={
            role === "buying"
              ? t("chat.roleSeller", { defaultValue: "Seller" })
              : role === "selling"
              ? t("chat.roleBuyer", { defaultValue: "Buyer" })
              : null
          }
          onPress={() => openConversation(item)}
        />
      );
    },
    [
      theme,
      getOtherUser,
      getLastMessageObject,
      getRoleKey,
      normalizeMediaUrl,
      getProductImage,
      getLastMessageProduct,
      getLastMessage,
      formatTime,
      getLastMessageDate,
      unreadMap,
      user?.id,
      openConversation,
      t,
    ]
  );

  const renderEmpty = () => {
    if (loading) return <SkeletonRows theme={theme} />;

    if (error && conversations.length === 0) {
      return (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.iconBg, borderColor: theme.divider }]}>
            <WifiOff size={28} color={RED} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.titleText }]}>
            {t("chat.loadFailed", { defaultValue: "Couldn't load chats" })}
          </Text>
          <Text style={[styles.emptyText, { color: theme.mutedText }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
            onPress={() => loadConversations()}
          >
            <RotateCcw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>{t("common.tryAgain", { defaultValue: "Try again" })}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const filtering = searchQuery.trim().length > 0 || activeTab !== "all";

    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.iconBg, borderColor: theme.divider }]}>
          {filtering ? (
            <SearchX size={28} color={theme.mutedText} />
          ) : (
            <MessageCircle size={28} color={theme.primary} />
          )}
        </View>
        <Text style={[styles.emptyTitle, { color: theme.titleText }]}>
          {filtering
            ? t("chat.noMatchTitle", { defaultValue: "No chats found" })
            : t("chat.emptyTitle", { defaultValue: "No conversations yet" })}
        </Text>
        <Text style={[styles.emptyText, { color: theme.mutedText }]}>
          {filtering
            ? t("chat.noMatchText", { defaultValue: "Try another filter, name or product." })
            : t("chat.emptyText", {
                defaultValue:
                  "When you contact a seller or someone contacts you, your conversations will appear here.",
              })}
        </Text>
      </View>
    );
  };

  const BackIcon = RTL ? ArrowRight : ArrowLeft;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <View style={[styles.container, { backgroundColor: theme.pageBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header: title row + integrated search */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.headerBg, paddingTop: insets.top + 10 },
        ]}
      >
        <View style={[styles.ring, styles.ringLg]} />
        <View style={[styles.ring, styles.ringMd]} />

        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <BackIcon size={20} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {t("chat.title", { defaultValue: "Messages" })}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {totalUnread > 0
                ? t("chat.newMessages", {
                    defaultValue: "{{count}} new messages",
                    count: totalUnread,
                  })
                : t("chat.conversationCount", {
                    defaultValue: "{{count}} conversations",
                    count: conversations.length,
                  })}
            </Text>
          </View>

          {totalUnread > 0 ? (
            <View style={styles.headerBadge}>
              <Text style={[styles.headerBadgeText, { color: theme.headerBg }]}>
                {totalUnread > 99 ? "99+" : totalUnread}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.surface,
              borderColor: searchFocused ? "#FFFFFF" : "transparent",
            },
          ]}
        >
          <Search size={18} color={searchFocused ? theme.primary : theme.mutedText} />
          <TextInput
            style={[styles.searchInput, { color: theme.titleText }]}
            placeholder={t("chat.searchChats", { defaultValue: "Search by name, product or message" })}
            placeholderTextColor={theme.mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
              <XCircle size={18} color={theme.mutedText} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsWrap}>
        <FlatList
          horizontal
          data={tabs}
          keyExtractor={(tab) => tab.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item: tab }) => {
            const active = activeTab === tab.key;
            const count = tabCounts[tab.key];
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? theme.primary : theme.surface,
                    borderColor: active ? theme.primary : theme.divider,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? "#FFFFFF" : theme.titleText },
                  ]}
                >
                  {tab.label}
                </Text>
                {count > 0 ? (
                  <View
                    style={[
                      styles.tabCount,
                      {
                        backgroundColor: active
                          ? "rgba(255,255,255,0.25)"
                          : tab.key === "unread"
                          ? theme.primary
                          : theme.greenChip,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        {
                          color: active
                            ? "#FFFFFF"
                            : tab.key === "unread"
                            ? "#FFFFFF"
                            : theme.greenText,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Conversation list */}
      <FlatList
        data={loading ? [] : visibleConversations}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.divider }]} />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadConversations(true)}
            tintColor={theme.primary}
            colors={[GREEN]}
          />
        }
        ListEmptyComponent={renderEmpty()}
      />
    </View>
  );
};

export default ChatListScreen;

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomStartRadius: 32,
    borderBottomEndRadius: 32,
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  ringLg: {
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -110,
    end: -90,
  },
  ringMd: {
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -70,
    end: -50,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerText: { flex: 1 },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  headerBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: { fontSize: 12, fontWeight: "800" },

  /* Search */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "500",
    paddingVertical: 0,
    height: "100%",
  },

  /* Tabs */
  tabsWrap: { paddingTop: 14, paddingBottom: 6 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  tabText: { fontSize: 13.5, fontWeight: "700" },
  tabCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountText: { fontSize: 11, fontWeight: "800" },

  /* List + rows */
  list: { flexGrow: 1, paddingTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginStart: 16 + AVATAR + 14,
    marginEnd: 16,
  },

  avatarWrap: { width: AVATAR, height: AVATAR },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 22, fontWeight: "800" },
  thumb: {
    position: "absolute",
    bottom: -3,
    end: -5,
    width: THUMB,
    height: THUMB,
    borderRadius: 8,
    borderWidth: 2,
  },

  content: { flex: 1, minWidth: 0 },
  lineTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontSize: 15.5 },
  time: { fontSize: 11.5, fontWeight: "600" },

  lineMid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  productTag: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  productTagText: { flexShrink: 1, fontSize: 11, fontWeight: "800" },
  roleText: { fontSize: 11, fontWeight: "600" },

  lineBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    minWidth: 0,
  },
  check: { marginEnd: 4 },
  preview: { flex: 1, fontSize: 13.5, fontWeight: "500" },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    marginStart: 10,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "800" },

  /* Skeleton */
  skelAvatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  skelInfo: { flex: 1, gap: 10 },
  skelBar: { height: 11, borderRadius: 6 },

  /* Empty / error */
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});