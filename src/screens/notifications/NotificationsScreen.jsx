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
  Dimensions,
} from "react-native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import { Bell, Check, Trash2, Heart, MapPin } from "lucide-react-native";
import { useNotifications } from "../../context/NotificationContext";

const API_URL = "http://192.168.8.5:8000";
const { width } = Dimensions.get("window");

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
  const dropAnim = useRef(new Animated.Value(-120)).current; // Animated drop effect for header/container
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  useEffect(() => {
    // Drop down entrance animation
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
      if (tutorialTimeoutRef.current) clearTimeout(tutorialTimeoutRef.current);
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
        style={styles.swipeDeleteAction}
      >
        <BlurView intensity={20} tint="light" style={styles.swipeDeleteBlur}>
          <Animated.View style={{ transform: [{ scale }], opacity }}>
            <Trash2 size={20} color="#EF4444" />
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
            {isUnread && <View style={styles.unreadSideStripe} />}

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
                    <Heart size={13} color={GREEN_PRIMARY} fill={GREEN_PRIMARY} />
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
                      <Bell size={20} color={GREEN_FAINT} />
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
                        <MapPin size={11} color={GREEN_MUTED} />
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
                <View style={styles.swipeHintInner}>
                  <Text style={styles.swipeHintText}>Swipe to delete</Text>
                </View>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY: dropAnim }] },
        ]}
      >
        <View style={styles.headerWrap}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerAccentBar} />
              <View>
                <Text style={styles.headerTitle}>Notifications</Text>
                <Text style={styles.headerSubtitle}>
                  {unreadCount === 0
                    ? "You're all caught up"
                    : `${unreadCount} unread messages`}
                </Text>
              </View>
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={markAllAsRead}
                style={styles.markAllButton}
              >
                <Check size={15} color={GREEN_PRIMARY} />
                <Text style={styles.markAllText}>Mark all</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Bell size={36} color={GREEN_PRIMARY} />
            </View>
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
      </Animated.View>
    </GestureHandlerRootView>
  );
}

// =========================================================
//  LIGHTER THEME - ALTERNATE CLEAN STRUCTURE & PALETTE
// =========================================================
const GREEN_PRIMARY = "#059669";  // Professional emerald tone
const GREEN_SURFACE = "#F8FAFC";  // Ultra clean light grey-blue off-white
const GREEN_MUTED = "#64748B";    // Slate secondary color
const GREEN_FAINT = "#CBD5E1";    // Soft grey borders
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  headerWrap: {
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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
    backgroundColor: GREEN_PRIMARY,
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: GREEN_MUTED,
  },

  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  markAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN_PRIMARY,
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
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: GREEN_FAINT,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    overflow: "hidden",
  },

  unreadNotification: {
    borderColor: "#6EE7B7",
    backgroundColor: WHITE,
  },

  unreadSideStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: GREEN_PRIMARY,
  },

  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN_SURFACE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  avatarUnreadRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: GREEN_PRIMARY,
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: GREEN_PRIMARY,
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
  },

  heartBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },

  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: GREEN_PRIMARY,
    marginLeft: 6,
  },

  message: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
  },

  likerName: {
    fontWeight: "700",
    color: "#0F172A",
  },

  productBox: {
    marginTop: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: GREEN_SURFACE,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: GREEN_FAINT,
  },

  productImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: GREEN_FAINT,
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
    color: "#1E293B",
  },

  productPrice: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: GREEN_PRIMARY,
  },

  cityRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  productCity: {
    fontSize: 11,
    color: GREEN_MUTED,
  },

  date: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
  },

  swipeDeleteAction: {
    backgroundColor: "#FEE2E2",
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
    color: "#EF4444",
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
    backgroundColor: "rgba(15, 23, 42, 0.8)",
  },

  swipeHintText: {
    fontSize: 10,
    fontWeight: "600",
    color: WHITE,
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
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },

  emptyText: {
    marginTop: 4,
    fontSize: 13,
    color: GREEN_MUTED,
  },
});