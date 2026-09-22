import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import { Bell, Check, Trash2, Heart, MapPin } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";

const API_URL = "http://192.168.8.5:8000";
const { width } = Dimensions.get("window");

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}/${path.replace(/^\/+/, "")}`;
};

/*
|--------------------------------------------------------------------------
| Relative time (translated)
|--------------------------------------------------------------------------
*/
const getRelativeTime = (dateString, t) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return t("notifications.justNow");

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60)
    return t("notifications.minutesAgo", { count: minutes });

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
      notification?.created_at ||
      data.created_at ||
      new Date().toISOString(),
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

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    markAllAsRead,
  } = useNotifications();

  const [tutorialDone, setTutorialDone] = useState(false);
  const swipeableRefs = useRef({});
  const tutorialTimeoutRef = useRef(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dropAnim = useRef(new Animated.Value(-120)).current;
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Theme-driven inline colors
  |--------------------------------------------------------------------------
  | Kept in a memo so we don't rebuild the object on every render.
  */
  const themeColors = useMemo(
    () => ({
      primary: colors.primary,
      iconAccent: colors.icon,

      /* Surfaces */
      pageBg: colors.background,
      headerBg: colors.surface,
      cardBg: colors.surface,
      cardBgUnread: colors.surface,
      productBoxBg: colors.surfaceSecondary,
      avatarBg: colors.surfaceSecondary,

      /* Borders */
      border: colors.border,
      borderSoft: isDark ? "#334155" : "#E2E8F0",
      borderUnread: isDark ? "#22C55E" : "#6EE7B7",

      /* Text */
      titleText: colors.text,
      bodyText: colors.textSecondary,
      nameText: colors.text,
      mutedText: colors.inactive,

      /* Badges / chips */
      badgeBg: isDark ? "rgba(34,197,94,0.12)" : "#ECFDF5",
      badgeBorder: isDark ? "rgba(34,197,94,0.35)" : "#A7F3D0",

      /* Delete */
      deleteBg: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
      deleteFg: "#EF4444",

      /* Hint overlay */
      hintBg: isDark ? "rgba(226,232,240,0.15)" : "rgba(15,23,42,0.8)",
      hintText: isDark ? "#F8FAFC" : "#FFFFFF",

      /* Heart inside badge */
      heartFg: colors.icon,
    }),
    [colors, isDark]
  );

  useEffect(() => {
    Animated.timing(dropAnim, {
      toValue: 0,
      duration: 600,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  useEffect(() => {
    if (tutorialDone || notifications.length === 0) return;

    const firstId = normalizeNotification(notifications[0])?.id;
    if (!firstId) return;

    tutorialTimeoutRef.current = setTimeout(() => {
      const ref = swipeableRefs.current[firstId];
      if (!ref) return;

      setShowSwipeHint(true);
      ref.openRight();

      const closeDelay = setTimeout(() => {
        setShowSwipeHint(false);
        requestAnimationFrame(() => {
          ref.close();
        });

        const doneDelay = setTimeout(() => {
          setTutorialDone(true);
        }, 450);

        return () => clearTimeout(doneDelay);
      }, 1100);

      return () => clearTimeout(closeDelay);
    }, 650);

    return () => {
      if (tutorialTimeoutRef.current)
        clearTimeout(tutorialTimeoutRef.current);
    };
  }, [tutorialDone, notifications.length]);

  const dismissTutorial = () => {
    setTutorialDone(true);
    setShowSwipeHint(false);
  };

  const renderRightActions = (progress, dragX, notificationId) => {
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
          swipeableRefs.current[notificationId]?.close();
          deleteNotification(notificationId);
        }}
        style={[
          styles.swipeDeleteAction,
          { backgroundColor: themeColors.deleteBg },
        ]}
      >
        <BlurView
          intensity={20}
          tint={isDark ? "dark" : "light"}
          style={styles.swipeDeleteBlur}
        >
          <Animated.View style={{ transform: [{ scale }], opacity }}>
            <Trash2 size={20} color={themeColors.deleteFg} />
          </Animated.View>
          <Animated.Text
            style={[
              styles.swipeDeleteText,
              { opacity, color: themeColors.deleteFg },
            ]}
          >
            {t("notifications.delete")}
          </Animated.Text>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderNotification = ({ item, index }) => {
    const notification = normalizeNotification(item);
    const isUnread = !notification.read_at;
    const isFirst = index === 0;

    const likerName = notification.user.name || t("common.unknown");
    const likerAvatar = getImageUrl(notification.user.avatar);
    const productImage = getImageUrl(notification.product.image);

    const displayTitle =
      notification.title || t("notifications.likedProduct");

    return (
      <View style={styles.swipeWrapper}>
        <Swipeable
          ref={(ref) => {
            if (ref) swipeableRefs.current[notification.id] = ref;
          }}
          renderRightActions={(progress, dragX) =>
            renderRightActions(progress, dragX, notification.id)
          }
          overshootRight={false}
          friction={2}
          rightThreshold={36}
          onSwipeableWillOpen={dismissTutorial}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (isUnread) markAsRead(notification.id);
            }}
            style={[
              styles.notification,
              {
                backgroundColor: isUnread
                  ? themeColors.cardBgUnread
                  : themeColors.cardBg,
                borderColor: isUnread
                  ? themeColors.borderUnread
                  : themeColors.border,
              },
            ]}
          >
            {isUnread && (
              <View
                style={[
                  styles.unreadSideStripe,
                  { backgroundColor: themeColors.primary },
                ]}
              />
            )}

            <View
              style={[
                styles.avatarContainer,
                {
                  backgroundColor: themeColors.avatarBg,
                  borderColor: themeColors.border,
                },
              ]}
            >
              {likerAvatar ? (
                <Image
                  source={{ uri: likerAvatar }}
                  style={styles.avatar}
                />
              ) : (
                <Text
                  style={[
                    styles.avatarText,
                    { color: themeColors.primary },
                  ]}
                >
                  {notification.user.name
                    ? notification.user.name.charAt(0).toUpperCase()
                    : "?"}
                </Text>
              )}

              {isUnread && (
                <View
                  style={[
                    styles.avatarUnreadRing,
                    { borderColor: themeColors.primary },
                  ]}
                />
              )}
            </View>

            <View style={styles.content}>
              <View style={styles.titleRow}>
                <View style={styles.titleLeft}>
                  <View
                    style={[
                      styles.heartBadge,
                      { backgroundColor: themeColors.badgeBg },
                    ]}
                  >
                    <Heart
                      size={13}
                      color={themeColors.heartFg}
                      fill={themeColors.heartFg}
                    />
                  </View>
                  <Text
                    style={[
                      styles.title,
                      { color: themeColors.titleText },
                    ]}
                    numberOfLines={1}
                  >
                    {displayTitle}
                  </Text>
                </View>

                {isUnread && (
                  <Animated.View
                    style={[
                      styles.unreadDot,
                      {
                        backgroundColor: themeColors.primary,
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                )}
              </View>

              <Text
                style={[
                  styles.message,
                  { color: themeColors.bodyText },
                ]}
              >
                <Text
                  style={[
                    styles.likerName,
                    { color: themeColors.nameText },
                  ]}
                >
                  {likerName}
                </Text>{" "}
                {t("notifications.likedProduct")}
              </Text>

              {notification.product.id && (
                <View
                  style={[
                    styles.productBox,
                    {
                      backgroundColor: themeColors.productBoxBg,
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  {productImage ? (
                    <Image
                      source={{ uri: productImage }}
                      style={styles.productImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.productImagePlaceholder,
                        { backgroundColor: themeColors.border },
                      ]}
                    >
                      <Bell size={20} color={themeColors.mutedText} />
                    </View>
                  )}

                  <View style={styles.productInfo}>
                    <Text
                      style={[
                        styles.productName,
                        { color: themeColors.titleText },
                      ]}
                      numberOfLines={2}
                    >
                      {notification.product.name || t("chat.product")}
                    </Text>

                    {notification.product.price !== null && (
                      <Text
                        style={[
                          styles.productPrice,
                          { color: themeColors.primary },
                        ]}
                      >
                        {notification.product.price}{" "}
                        {t("common.currency")}
                      </Text>
                    )}

                    {notification.product.city && (
                      <View style={styles.cityRow}>
                        <MapPin
                          size={11}
                          color={themeColors.mutedText}
                        />
                        <Text
                          style={[
                            styles.productCity,
                            { color: themeColors.mutedText },
                          ]}
                        >
                          {notification.product.city}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <Text
                style={[
                  styles.date,
                  { color: themeColors.mutedText },
                ]}
              >
                {getRelativeTime(notification.created_at, t)}
              </Text>
            </View>

            {isFirst && showSwipeHint && (
              <Animated.View
                style={styles.swipeHint}
                pointerEvents="none"
              >
                <View
                  style={[
                    styles.swipeHintInner,
                    { backgroundColor: themeColors.hintBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.swipeHintText,
                      { color: themeColors.hintText },
                    ]}
                  >
                    {t("notifications.swipeToDelete")}
                  </Text>
                </View>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: themeColors.pageBg }}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: themeColors.pageBg,
            transform: [{ translateY: dropAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.headerWrap,
            {
              backgroundColor: themeColors.headerBg,
              borderBottomColor: themeColors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerAccentBar,
                  { backgroundColor: themeColors.primary },
                ]}
              />
              <View>
                <Text
                  style={[
                    styles.headerTitle,
                    { color: themeColors.titleText },
                  ]}
                >
                  {t("notifications.title")}
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { color: themeColors.mutedText },
                  ]}
                >
                  {unreadCount === 0
                    ? t("notifications.allCaughtUp")
                    : t("notifications.unreadCount", {
                        count: unreadCount,
                      })}
                </Text>
              </View>
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={markAllAsRead}
                style={[
                  styles.markAllButton,
                  {
                    backgroundColor: themeColors.badgeBg,
                    borderColor: themeColors.badgeBorder,
                  },
                ]}
              >
                <Check size={15} color={themeColors.primary} />
                <Text
                  style={[
                    styles.markAllText,
                    { color: themeColors.primary },
                  ]}
                >
                  {t("notifications.markAll")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor: themeColors.badgeBg,
                  borderColor: themeColors.badgeBorder,
                },
              ]}
            >
              <Bell size={36} color={themeColors.primary} />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: themeColors.titleText },
              ]}
            >
              {t("notifications.noNotifications")}
            </Text>
            <Text
              style={[
                styles.emptyText,
                { color: themeColors.mutedText },
              ]}
            >
              {t("notifications.allCaughtUp")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotification}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </GestureHandlerRootView>
  );
}

/* =========================================================
   STYLES  (structure only — colors come from the theme)
========================================================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerWrap: {
    borderBottomWidth: 1,
    paddingTop: 10,
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerAccentBar: {
    width: 4,
    height: 26,
    borderRadius: 2,
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
  },

  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  markAllText: {
    fontSize: 12,
    fontWeight: "700",
  },

  list: {
    padding: 16,
    paddingBottom: 40,
  },

  swipeWrapper: {
    marginBottom: 10,
  },

  notification: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
    overflow: "hidden",
  },

  unreadSideStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
    borderWidth: 1,
  },

  avatarUnreadRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    borderWidth: 2,
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  titleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },

  heartBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },

  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginLeft: 6,
  },

  message: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },

  likerName: {
    fontWeight: "700",
  },

  productBox: {
    marginTop: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },

  productImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  productInfo: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },

  productName: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },

  productPrice: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
  },

  cityRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  productCity: {
    fontSize: 11,
  },

  date: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "500",
  },

  swipeDeleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 76,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },

  swipeDeleteBlur: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },

  swipeDeleteText: {
    fontSize: 11,
    fontWeight: "700",
  },

  swipeHint: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -12,
    borderRadius: 16,
    overflow: "hidden",
  },

  swipeHintInner: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },

  swipeHintText: {
    fontSize: 10,
    fontWeight: "600",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  emptyText: {
    marginTop: 4,
    fontSize: 13,
  },
});