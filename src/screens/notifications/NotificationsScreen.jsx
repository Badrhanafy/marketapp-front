import React, { useRef, useEffect, useState } from "react";

import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from "react-native";

import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import { BlurView } from "expo-blur";

import { Bell, Check, Trash2, Heart, MapPin } from "lucide-react-native";

import { useNotifications } from "../../context/NotificationContext";

const API_URL = "http://192.168.8.5:8000";

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}/${path.replace(/^\/+/, "")}`;
};

const getRelativeTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSeconds < 60) return "Just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const normalizeNotification = (notification) => {
  const data = notification?.data || notification || {};
  const user = data.user || {};
  const product = data.product || {};

  return {
    id: notification?.id || data.id,
    title: data.title || "New notification",
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

export default function NotificationsScreen() {
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
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  useEffect(() => {
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

  // ---- Smooth tutorial: open → hold → glide closed ----
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
      if (tutorialTimeoutRef.current) clearTimeout(tutorialTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        style={styles.swipeDeleteAction}
      >
        {/* Navy glass delete panel — same family as the theme */}
        <BlurView intensity={40} tint="dark" style={styles.swipeDeleteBlur}>
          <Animated.View style={{ transform: [{ scale }], opacity }}>
            <Trash2 size={20} color="#FFFFFF" />
          </Animated.View>
          <Animated.Text style={[styles.swipeDeleteText, { opacity }]}>
            Delete
          </Animated.Text>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderNotification = ({ item, index }) => {
    const notification = normalizeNotification(item);
    const isUnread = !notification.read_at;
    const isFirst = index === 0;

    const likerName = notification.user.name || "Unknown user";
    const likerAvatar = getImageUrl(notification.user.avatar);
    const productImage = getImageUrl(notification.product.image);

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
              isUnread && styles.unreadNotification,
            ]}
          >
            {/* Navy glass strip on left of unread cards */}
            {isUnread && (
              <View style={styles.unreadGlassStrip} pointerEvents="none">
                <BlurView
                  intensity={45}
                  tint="dark"
                  style={styles.unreadGlassStripBlur}
                />
              </View>
            )}

            <View style={styles.avatarContainer}>
              {likerAvatar ? (
                <Image source={{ uri: likerAvatar }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarText}>
                  {likerName !== "Unknown user"
                    ? likerName.charAt(0).toUpperCase()
                    : "?"}
                </Text>
              )}
              {isUnread && <View style={styles.avatarUnreadRing} />}
            </View>

            <View style={styles.content}>
              <View style={styles.titleRow}>
                <View style={styles.titleLeft}>
                  <View style={styles.heartBadge}>
                    <Heart size={13} color={NAVY} fill={NAVY} />
                  </View>
                  <Text style={styles.title}>{notification.title}</Text>
                </View>

                {isUnread && (
                  <Animated.View
                    style={[
                      styles.unreadDot,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  />
                )}
              </View>

              <Text style={styles.message}>
                <Text style={styles.likerName}>{likerName}</Text> liked your
                product
              </Text>

              {notification.product.id && (
                <View style={styles.productBox}>
                  {productImage ? (
                    <Image
                      source={{ uri: productImage }}
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Bell size={20} color={NAVY_FAINT} />
                    </View>
                  )}

                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {notification.product.name || "Product"}
                    </Text>

                    {notification.product.price !== null && (
                      <Text style={styles.productPrice}>
                        {notification.product.price} DH
                      </Text>
                    )}

                    {notification.product.city && (
                      <View style={styles.cityRow}>
                        <MapPin size={11} color={NAVY_FAINT} />
                        <Text style={styles.productCity}>
                          {notification.product.city}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <Text style={styles.date}>
                {getRelativeTime(notification.created_at)}
              </Text>
            </View>

            {isFirst && showSwipeHint && (
              <Animated.View style={styles.swipeHint} pointerEvents="none">
                <BlurView
                  intensity={55}
                  tint="dark"
                  style={styles.swipeHintBlur}
                >
                  <Text style={styles.swipeHintText}>Swipe to delete</Text>
                </BlurView>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* ---- Navy glass header with white content below ---- */}
        <View style={styles.headerWrap}>
          <BlurView intensity={65} tint="dark" style={styles.headerBlur}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerAccentBar} />
                <View>
                  <Text style={styles.headerTitle}>Notifications</Text>
                  <Text style={styles.headerSubtitle}>
                    {unreadCount === 0
                      ? "You're all caught up"
                      : `${unreadCount} unread`}
                  </Text>
                </View>
              </View>

              {unreadCount > 0 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={markAllAsRead}
                  style={styles.markAllButton}
                >
                  <Check size={16} color={NAVY} />
                  <Text style={styles.markAllText}>Mark all</Text>
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <BlurView intensity={45} tint="dark" style={styles.emptyIconBlur}>
              <View style={styles.emptyIcon}>
                <Bell size={42} color={WHITE} />
              </View>
            </BlurView>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You're all caught up.</Text>
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
      </View>
    </GestureHandlerRootView>
  );
}

// =========================================================
//  MINIMAL PALETTE — WHITE + NAVY ONLY
// =========================================================
const NAVY = "#04045E";           // brand anchor
const NAVY_DEEP = "#020240";      // darker shade for glass tint
const NAVY_MUTED = "#5B5B8C";     // secondary text
const NAVY_FAINT = "#9C9FC7";     // tertiary text/icons
const NAVY_SURFACE = "#F2F3FA";   // cool off-white surface
const NAVY_BORDER = "#E4E6F5";    // soft border
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // ---- Header: navy glass over white ----
  headerWrap: {
    overflow: "hidden",
    backgroundColor: NAVY,
  },

  headerBlur: {
    backgroundColor: "rgba(4, 4, 94, 0.85)",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
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
    height: 30,
    borderRadius: 2,
    backgroundColor: WHITE,
    marginRight: 12,
    opacity: 0.9,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.3,
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
  },

  // ---- Mark-all: white glass pill on navy ----
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  markAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: NAVY,
  },

  list: {
    padding: 14,
    paddingBottom: 30,
    backgroundColor: WHITE,
  },

  swipeWrapper: {
    marginBottom: 12,
  },

  notification: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: NAVY_BORDER,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },

  // Unread: soft navy-tinted surface + stronger border
  unreadNotification: {
    borderColor: NAVY,
    backgroundColor: NAVY_SURFACE,
    shadowOpacity: 0.12,
  },

  // ---- Navy glass strip on left of unread cards ----
  unreadGlassStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    overflow: "hidden",
  },

  unreadGlassStripBlur: {
    flex: 1,
    backgroundColor: "rgba(4, 4, 94, 0.75)",
  },

  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: NAVY_SURFACE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
    borderWidth: 2,
    borderColor: WHITE,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },

  // ---- Navy ring around avatar for unread ----
  avatarUnreadRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: NAVY,
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 19,
    fontWeight: "800",
    color: NAVY,
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
    gap: 7,
  },

  heartBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: NAVY_SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 14,
    fontWeight: "700",
    color: NAVY,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NAVY,
    marginLeft: 7,
  },

  message: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: NAVY_MUTED,
  },

  likerName: {
    fontWeight: "800",
    color: NAVY,
  },

  productBox: {
    marginTop: 12,
    padding: 8,
    borderRadius: 13,
    backgroundColor: NAVY_SURFACE,
    borderWidth: 1,
    borderColor: NAVY_BORDER,
    flexDirection: "row",
    alignItems: "center",
  },

  productImage: {
    width: 62,
    height: 62,
    borderRadius: 10,
    backgroundColor: NAVY_BORDER,
  },

  productImagePlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 10,
    backgroundColor: NAVY_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  productInfo: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },

  productName: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    color: NAVY,
  },

  productPrice: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: NAVY,
  },

  cityRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  productCity: {
    fontSize: 11,
    color: NAVY_FAINT,
  },

  date: {
    marginTop: 9,
    fontSize: 11,
    fontWeight: "600",
    color: NAVY_FAINT,
  },

  // ---- Swipe-to-delete: solid navy with a dark blur overlay ----
  swipeDeleteAction: {
    backgroundColor: NAVY,
    justifyContent: "center",
    alignItems: "center",
    width: 82,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
  },

  swipeDeleteBlur: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(2, 2, 64, 0.85)",
  },

  swipeDeleteText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "700",
  },

  // ---- Swipe hint pill (navy glass over white card) ----
  swipeHint: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -14,
    borderRadius: 20,
    overflow: "hidden",
  },

  swipeHintBlur: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(4, 4, 94, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },

  swipeHintText: {
    fontSize: 11,
    fontWeight: "700",
    color: WHITE,
    letterSpacing: 0.2,
  },

  // ---- Empty state ----
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
    backgroundColor: WHITE,
  },

  emptyIconBlur: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4, 4, 94, 0.9)",
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
  },

  emptyText: {
    marginTop: 5,
    fontSize: 14,
    color: NAVY_MUTED,
  },
});