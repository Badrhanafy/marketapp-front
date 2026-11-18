import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";

import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  StatusBar,
} from "react-native";

import { MessageCircle, X } from "lucide-react-native";
import { BlurView } from "expo-blur";

import { navigationRef } from "../navigation/AppNavigator";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { useNotifications } from "../context/NotificationContext";

const SIZE = 62;
const DRAG_LIMIT = 45;

// Screens where the floating chat BUTTON should be hidden.
// The toast will still be shown on these screens.
const HIDDEN_SCREENS = ["ProductDetails","add", "Create", "Nearby","Profile","ChatList","Chat"];

export default function FloatingChatButton() {
  const { tabBarTotalHeight } = useResponsiveLayout();
  const { width, height } = useWindowDimensions();

  const [toastCount, setToastCount] = useState(0);

  const {
    latestMessage,
    latestNotification,
    dismissLatestMessage,
    dismissLatestNotification,
  } = useNotifications();

  // =========================
  // CURRENT ROUTE (via navigationRef)
  // =========================
  // This component lives outside the navigator tree, so we cannot use
  // useNavigationState here. Instead we read the route from navigationRef
  // and subscribe to its "state" event to keep it in sync.

  const [currentRouteName, setCurrentRouteName] = useState(() => {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute()?.name ?? null;
    }
    return null;
  });

  useEffect(() => {
    const syncRoute = () => {
      if (navigationRef.isReady()) {
        setCurrentRouteName(navigationRef.getCurrentRoute()?.name ?? null);
      }
    };

    // Try once on mount (in case navigation became ready after render)
    syncRoute();

    // Subscribe to navigation state changes
    const unsubscribe = navigationRef.addListener("state", syncRoute);

    return () => {
      unsubscribe?.();
    };
  }, []);

  const hideButton =
    currentRouteName != null && HIDDEN_SCREENS.includes(currentRouteName);

  // Floating button position
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const dragOffset = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Toast animations
  const toastTranslateY = useRef(new Animated.Value(-150)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const timerRef = useRef(null);
  const lastToastKey = useRef(null);

  // =========================
  // TOAST DATA
  // =========================

  const toast = useMemo(
    () =>
      latestMessage
        ? {
            key: `message-${latestMessage.id}`,
            title: latestMessage.sender || "New message",
            message: latestMessage.preview,
            dismiss: dismissLatestMessage,
            type: "message",
          }
        : latestNotification
        ? {
            key: `notification-${latestNotification.id}`,
            title: latestNotification.title || "New notification",
            message: latestNotification.message,
            dismiss: dismissLatestNotification,
            type: "notification",
          }
        : null,
    [
      latestMessage,
      latestNotification,
      dismissLatestMessage,
      dismissLatestNotification,
    ]
  );

  // =========================
  // COUNT NEW TOASTS
  // =========================

  useEffect(() => {
    if (!toast?.key) return;

    if (lastToastKey.current === toast.key) return;

    lastToastKey.current = toast.key;

    setToastCount((prev) => prev + 1);
  }, [toast?.key]);

  // =========================
  // HIDE TOAST
  // =========================

  const hideToast = useCallback(() => {
    clearTimeout(timerRef.current);

    Animated.parallel([
      Animated.timing(toastTranslateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),

      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        toast?.dismiss?.();
      }
    });
  }, [toast, toastTranslateY, toastOpacity]);

  // =========================
  // TOAST ANIMATION
  // =========================

  useEffect(() => {
    if (!toast) return;

    clearTimeout(timerRef.current);

    toastTranslateY.setValue(-150);
    toastOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(toastTranslateY, {
        toValue: 0,
        speed: 16,
        bounciness: 5,
        useNativeDriver: true,
      }),

      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(hideToast, 5000);

    return () => {
      clearTimeout(timerRef.current);
      toastTranslateY.stopAnimation();
      toastOpacity.stopAnimation();
    };
  }, [toast?.key, hideToast, toastTranslateY, toastOpacity]);

  // =========================
  // NAVIGATION
  // =========================

  const handlePress = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate("ChatList");
    }

    setToastCount(0);

    // Return button to original corner
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      speed: 18,
      bounciness: 5,
      useNativeDriver: true,
    }).start();

    dragOffset.current = { x: 0, y: 0 };
  }, [pan]);

  // =========================
  // LIMITED DRAG
  // =========================

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,

        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,

        onPanResponderGrant: () => {
          hasDragged.current = false;
          pan.stopAnimation();
        },

        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6) {
            hasDragged.current = true;
          }

          const nextX = Math.max(
            -DRAG_LIMIT,
            Math.min(DRAG_LIMIT, dragOffset.current.x + gesture.dx)
          );

          const nextY = Math.max(
            -DRAG_LIMIT,
            Math.min(DRAG_LIMIT, dragOffset.current.y + gesture.dy)
          );

          pan.setValue({ x: nextX, y: nextY });
        },

        onPanResponderRelease: (_, gesture) => {
          const nextX = Math.max(
            -DRAG_LIMIT,
            Math.min(DRAG_LIMIT, dragOffset.current.x + gesture.dx)
          );

          const nextY = Math.max(
            -DRAG_LIMIT,
            Math.min(DRAG_LIMIT, dragOffset.current.y + gesture.dy)
          );

          dragOffset.current = { x: nextX, y: nextY };

          if (!hasDragged.current) {
            handlePress();
          }
        },

        onPanResponderTerminate: () => {
          pan.setValue(dragOffset.current);
        },
      }),
    [pan, handlePress]
  );

  // =========================
  // RENDER
  // =========================

  return (
    <>
      {/* TOP GLASS NOTIFICATION — always rendered, even on hidden screens */}

      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastContainer,
            {
              width: width - 36,
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.toast}
            onPress={() => {
              clearTimeout(timerRef.current);
              toast.dismiss?.();
              handlePress();
            }}
          >
            <BlurView
              intensity={75}
              tint="light"
              style={styles.blurBackground}
            >
              <View style={styles.toastIcon}>
                <MessageCircle size={23} color="#14221A" />
              </View>

              <View style={styles.toastContent}>
                <Text style={styles.toastTitle} numberOfLines={1}>
                  {toast.title}
                </Text>

                <Text style={styles.toastMessage} numberOfLines={2}>
                  {toast.message}
                </Text>
              </View>

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  hideToast();
                }}
                hitSlop={12}
                style={styles.closeButton}
              >
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* FIXED CORNER FLOATING BUTTON — hidden on specific screens */}

      {!hideButton && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.container,
            {
              bottom: tabBarTotalHeight + 16,
              right: 20,
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
              ],
            },
          ]}
        >
          <View style={styles.button}>
            <MessageCircle
              size={28}
              color="#ffff"
              strokeWidth={2.5}
            />

            {toastCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {toastCount > 99 ? "99+" : toastCount}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </>
  );
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: (StatusBar.currentHeight || 0) + 10,
    alignSelf: "center",
    zIndex: 999999,
    elevation: 999999,
  },

  toast: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 12,
  },

  blurBackground: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  toastIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#014de6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  toastContent: {
    flex: 1,
  },

  toastTitle: {
    color: "#14221A",
    fontSize: 14,
    fontWeight: "800",
  },

  toastMessage: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },

  closeButton: {
    padding: 5,
    marginLeft: 8,
  },

  container: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    zIndex: 99999,
    elevation: 99999,
  },

  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#427df4",
    elevation: 15,
    shadowColor: "#0a0a0a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },

  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 21,
    height: 21,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
});