import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ImageBackground,
  Animated,
  Easing,
  StatusBar,
  I18nManager,
} from "react-native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Heart,
  MapPin,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import { media_URL } from "../../constants/config";
import headerBg from "../../../assets/images/headerbg.jpg";

/* ──────────────────────────────────────────────────────────────
   Theme — same blue system as PublicProfileScreen
   ────────────────────────────────────────────────────────────── */
const PRIMARY = "#2563EB";
const PRIMARY_DARK = "#1D4ED8";
const PRIMARY_DEEP = "#0A2E9E";
const SKY = "#38A3FF";
const BLUE_SOFT = "#EFF6FF";
const BLUE_TINT = "#DBEAFE";
const DANGER = "#EF4444";
const DANGER_DARK = "#DC2626";

const GLASS = "rgba(255,255,255,0.16)";
const GLASS_BORDER = "rgba(255,255,255,0.28)";
const ON_HERO = "#FFFFFF";
const ON_HERO_SOFT = "rgba(255,255,255,0.82)";

const PAGE_PADDING = 16;
const HEADER_RADIUS = 28;

const LIGHT = {
  pageBg: "#F3F6FD",
  card: "#FFFFFF",
  cardUnread: "#F5F9FF",
  border: "rgba(11, 27, 58, 0.08)",
  ink: "#0B1B3A",
  inkSoft: "#2F4170",
  muted: "#64748B",
  strike: "#94A3B8",
  blueSoft: BLUE_SOFT,
  blueTint: BLUE_TINT,
};

const DARK = {
  pageBg: "#0A1226",
  card: "#111C36",
  cardUnread: "#13244A",
  border: "rgba(255,255,255,0.08)",
  ink: "#F1F5F9",
  inkSoft: "#CBD5E1",
  muted: "#94A3B8",
  strike: "#64748B",
  blueSoft: "rgba(56,163,255,0.12)",
  blueTint: "rgba(56,163,255,0.22)",
};

const API_URL = media_URL;

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}/${path.replace(/^\/+/, "")}`;
};

const getRelativeTime = (dateString, t) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return t("notifications.justNow");

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return t("notifications.minutesAgo", { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("notifications.hoursAgo", { count: hours });

  const days = Math.floor(hours / 24);
  if (days === 1) return t("notifications.yesterday");
  if (days < 7) return t("notifications.daysAgo", { count: days });

  return date.toLocaleDateString();
};

const normalizeNotification = (notification) => {
  const data = notification?.data || notification || {};
  const user = data.user || {};
  const product = data.product || {};

  return {
    id: notification?.id || data.id,
    title: data.title || "",
    message: data.message || "",
    type: data.type || notification?.type || null,
    created_at:
      notification?.created_at || data.created_at || new Date().toISOString(),
    read_at: notification?.read_at || null,
    user: {
      id: user.id || data.user_id || null,
      name: user.name || null,
      avatar: user.avatar || null,
    },
    product: {
      id: product.id || data.product_id || null,
      name: product.name || null,
      price: product.price ?? null,
      city: product.city || null,
      image: product.image || null,
    },
  };
};

/* ==================================================================
   Screen
   ================================================================== */
export default function NotificationsScreen({ navigation }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const C = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    markAllAsRead,
  } = useNotifications();

  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const [tutorialDone, setTutorialDone] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const swipeableRefs = useRef({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const canGoBack = !!navigation?.canGoBack?.();

  const data = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((n) => !normalizeNotification(n).read_at)
        : notifications,
    [notifications, filter]
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  /* Swipe-to-delete tutorial on the first row */
  useEffect(() => {
    if (tutorialDone || data.length === 0) return;

    const firstId = normalizeNotification(data[0])?.id;
    if (!firstId) return;

    const timers = [];

    timers.push(
      setTimeout(() => {
        const ref = swipeableRefs.current[firstId];
        if (!ref) return;

        setShowSwipeHint(true);
        ref.openRight();

        timers.push(
          setTimeout(() => {
            setShowSwipeHint(false);
            requestAnimationFrame(() => ref.close());
            timers.push(setTimeout(() => setTutorialDone(true), 450));
          }, 1100)
        );
      }, 650)
    );

    return () => timers.forEach(clearTimeout);
  }, [tutorialDone, data.length]);

  const dismissTutorial = () => {
    setTutorialDone(true);
    setShowSwipeHint(false);
  };

  /* ── Swipe delete ── */
  const renderRightActions = (progress, dragX, id) => {
    const scale = dragX.interpolate({
      inputRange: [-90, -20, 0],
      outputRange: [1, 0.7, 0.4],
      extrapolate: "clamp",
    });
    const opacity = dragX.interpolate({
      inputRange: [-80, -30, 0],
      outputRange: [1, 0.6, 0],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          swipeableRefs.current[id]?.close();
          deleteNotification(id);
        }}
        style={styles.deleteWrap}
        accessibilityRole="button"
        accessibilityLabel={t("notifications.delete")}
      >
        <LinearGradient
          colors={[DANGER, DANGER_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.deleteAction}
        >
          <Animated.View style={{ transform: [{ scale }], opacity }}>
            <Trash2 size={20} color="#FFFFFF" strokeWidth={2.4} />
          </Animated.View>
          <Animated.Text style={[styles.deleteText, { opacity }]}>
            {t("notifications.delete")}
          </Animated.Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  /* ── Row ── */
  const renderNotification = ({ item, index }) => {
    const n = normalizeNotification(item);
    const isUnread = !n.read_at;

    const likerName = n.user.name || t("common.unknown");
    const likerAvatar = getImageUrl(n.user.avatar);
    const productImage = getImageUrl(n.product.image);

    return (
      <View style={styles.rowWrap}>
        <Swipeable
          ref={(ref) => {
            if (ref) swipeableRefs.current[n.id] = ref;
          }}
          renderRightActions={(progress, dragX) =>
            renderRightActions(progress, dragX, n.id)
          }
          overshootRight={false}
          friction={2}
          rightThreshold={36}
          onSwipeableWillOpen={dismissTutorial}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (isUnread) markAsRead(n.id);
            }}
            style={[
              styles.row,
              {
                backgroundColor: isUnread ? C.cardUnread : C.card,
                borderColor: isUnread ? BLUE_TINT : C.border,
              },
            ]}
          >
            {/* Avatar + heart badge */}
            <View style={styles.avatarWrap}>
              {likerAvatar ? (
                <Image source={{ uri: likerAvatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[PRIMARY_DEEP, PRIMARY]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {n.user.name ? n.user.name.charAt(0).toUpperCase() : "?"}
                  </Text>
                </LinearGradient>
              )}
              <View style={[styles.heartBadge, { borderColor: C.card }]}>
                <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>

            {/* Text */}
            <View style={styles.content}>
              <Text
                style={[styles.message, { color: C.inkSoft }]}
                numberOfLines={2}
              >
                <Text style={[styles.likerName, { color: C.ink }]}>
                  {likerName}
                </Text>{" "}
                {t("notifications.likedProduct")}
              </Text>

              {n.product.name ? (
                <Text
                  style={[styles.productName, { color: C.muted }]}
                  numberOfLines={1}
                >
                  {n.product.name}
                  {n.product.price !== null ? (
                    <Text style={styles.productPrice}>
                      {"  "}
                      {n.product.price} {t("common.currency")}
                    </Text>
                  ) : null}
                </Text>
              ) : null}

              <View style={styles.metaRow}>
                <Text style={[styles.date, { color: C.strike }]}>
                  {getRelativeTime(n.created_at, t)}
                </Text>
                {n.product.city ? (
                  <View style={styles.cityRow}>
                    <MapPin size={11} color={C.strike} strokeWidth={2.6} />
                    <Text style={[styles.date, { color: C.strike }]}>
                      {n.product.city}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Product thumbnail */}
            {n.product.id ? (
              productImage ? (
                <Image
                  source={{ uri: productImage }}
                  style={styles.thumb}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: C.blueTint }]}>
                  <Bell size={18} color={PRIMARY_DARK} strokeWidth={2.4} />
                </View>
              )
            ) : null}

            {isUnread && <View style={styles.unreadDot} />}

            {index === 0 && showSwipeHint && (
              <View style={styles.swipeHint} pointerEvents="none">
                <View style={styles.swipeHintInner}>
                  <Text style={styles.swipeHintText}>
                    {t("notifications.swipeToDelete")}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  /* ── Compact gradient header + filter pills ── */
  const renderHeader = () => (
    <View>
      <ImageBackground
        source={headerBg}
        resizeMode="cover"
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        imageStyle={styles.headerImage}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(10,46,158,0.86)",
            "rgba(29,78,216,0.70)",
            "rgba(56,163,255,0.45)",
          ]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerWash}
        />

        <View style={styles.headerRow}>
          {canGoBack ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
              style={styles.roundBtn}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft
                size={20}
                color={ON_HERO}
                strokeWidth={2.5}
                style={styles.rtlFlip}
              />
            </TouchableOpacity>
          ) : null}

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t("notifications.title")}</Text>
            <Text style={styles.headerSub}>
              {unreadCount === 0
                ? t("notifications.allCaughtUp")
                : t("notifications.unreadCount", { count: unreadCount })}
            </Text>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={markAllAsRead}
              style={styles.markAllBtn}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("notifications.markAll")}
            >
              <CheckCheck size={18} color={ON_HERO} strokeWidth={2.5} />
              <Text style={styles.markAllText}>
                {t("notifications.markAll")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ImageBackground>

      <View style={styles.pills}>
        {[
          { key: "all", label: t("notifications.all", { defaultValue: "All" }) },
          {
            key: "unread",
            label: t("notifications.unread", { defaultValue: "Unread" }),
            count: unreadCount,
          },
        ].map((p) => {
          const active = filter === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              activeOpacity={0.85}
              onPress={() => setFilter(p.key)}
              style={[
                styles.pill,
                active
                  ? { backgroundColor: PRIMARY, borderColor: PRIMARY }
                  : { backgroundColor: C.card, borderColor: C.border },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: active ? "#FFFFFF" : C.inkSoft },
                ]}
              >
                {p.label}
              </Text>
              {p.count > 0 && (
                <View
                  style={[
                    styles.pillCount,
                    {
                      backgroundColor: active
                        ? "rgba(255,255,255,0.25)"
                        : C.blueTint,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillCountText,
                      { color: active ? "#FFFFFF" : PRIMARY_DARK },
                    ]}
                  >
                    {p.count > 99 ? "99+" : p.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: C.blueTint }]}>
        <BellOff size={34} color={PRIMARY_DARK} strokeWidth={2.2} />
      </View>
      <Text style={[styles.emptyTitle, { color: C.ink }]}>
        {t("notifications.noNotifications")}
      </Text>
      <Text style={[styles.emptyText, { color: C.muted }]}>
        {t("notifications.allCaughtUp")}
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={data}
          keyExtractor={(item) => String(normalizeNotification(item).id)}
          renderItem={renderNotification}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[]}
        />
      </Animated.View>
    </GestureHandlerRootView>
  );
}

/* ==================================================================
   Styles
   ================================================================== */
const styles = StyleSheet.create({
  rtlFlip: { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },

  /* Header */
  header: {
    paddingHorizontal: PAGE_PADDING + 4,
    paddingBottom: 22,
    backgroundColor: PRIMARY_DEEP,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
    overflow: "hidden",
  },
  headerImage: {
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
  },
  headerWash: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.7,
    color: ON_HERO,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "600",
    color: ON_HERO_SOFT,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  markAllText: { fontSize: 12.5, fontWeight: "800", color: ON_HERO },

  /* Filter pills */
  pills: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: "800" },
  pillCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pillCountText: { fontSize: 11, fontWeight: "900" },

  /* Rows */
  rowWrap: { marginBottom: 8, marginHorizontal: PAGE_PADDING },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  avatarWrap: { width: 48, height: 48 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  heartBadge: {
    position: "absolute",
    end: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderWidth: 2.5,
  },

  content: { flex: 1, minWidth: 0 },
  message: { fontSize: 13.5, fontWeight: "500", lineHeight: 19 },
  likerName: { fontWeight: "800" },
  productName: { marginTop: 2, fontSize: 12, fontWeight: "600" },
  productPrice: { fontWeight: "800", color: PRIMARY },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  date: { fontSize: 11, fontWeight: "600" },

  thumb: { width: 54, height: 54, borderRadius: 14 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },

  unreadDot: {
    position: "absolute",
    top: 12,
    end: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: PRIMARY,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  /* Swipe delete */
  deleteWrap: { marginStart: 8 },
  deleteAction: {
    width: 74,
    flex: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  deleteText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },

  swipeHint: {
    position: "absolute",
    end: 10,
    bottom: 10,
  },
  swipeHintInner: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(10,46,158,0.9)",
  },
  swipeHintText: { fontSize: 10.5, fontWeight: "700", color: "#FFFFFF" },

  /* Empty */
  empty: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 64,
    gap: 6,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.4 },
  emptyText: {
    fontSize: 13.5,
    fontWeight: "500",
    lineHeight: 20,
    textAlign: "center",
  },
});