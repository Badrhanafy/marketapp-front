import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { Bell } from "lucide-react-native";

const LIME = "#B9FA3C";
const NAVY = "#040045";

export default function NotificationBell({
  unreadCount = 0,
  onPress,
  tooltipDuration = 5000,
}) {
  // ----- animated values -----
  const scale = useRef(new Animated.Value(1)).current;      // bell pulse
  const tooltipY = useRef(new Animated.Value(-8)).current;  // slide down
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipScale = useRef(new Animated.Value(0.85)).current;

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hideTimer = useRef(null);
  const prevCountRef = useRef(unreadCount);

  // ----- show tooltip -----
  const showTooltip = useCallback(() => {
    setTooltipVisible(true);
    tooltipY.setValue(-8);
    tooltipOpacity.setValue(0);
    tooltipScale.setValue(0.85);

    Animated.parallel([
      Animated.spring(tooltipY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 90,
      }),
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(tooltipScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }),
    ]).start();

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => hideTooltip(), tooltipDuration);
  }, [tooltipDuration, tooltipY, tooltipOpacity, tooltipScale]);

  // ----- hide tooltip -----
  const hideTooltip = useCallback(() => {
    Animated.parallel([
      Animated.timing(tooltipY, {
        toValue: -8,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(tooltipScale, {
        toValue: 0.9,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setTooltipVisible(false);
    });
  }, [tooltipY, tooltipOpacity, tooltipScale]);

  // ----- pulse the bell -----
  const pulseBell = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, friction: 3 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  }, [scale]);

  // ----- react to unread count changes -----
  useEffect(() => {
    const prev = prevCountRef.current;
    const grew = unreadCount > prev;
    prevCountRef.current = unreadCount;

    if (grew && unreadCount > 0) {
      pulseBell();
      showTooltip();
    }
    // if user read everything, hide
    if (unreadCount === 0 && tooltipVisible) hideTooltip();
  }, [unreadCount, pulseBell, showTooltip, hideTooltip, tooltipVisible]);

  // clean up on unmount
  useEffect(() => () => hideTimer.current && clearTimeout(hideTimer.current), []);

  const handlePress = () => {
    hideTooltip();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    onPress?.();
  };

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <View style={styles.wrap}>
      {/* TOOLTIP */}
      {tooltipVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              opacity: tooltipOpacity,
              transform: [{ translateY: tooltipY }, { scale: tooltipScale }],
            },
          ]}
        >
          <View style={styles.tooltipArrow} />
          <View style={styles.tooltipInner}>
            <Text style={styles.tooltipTitle}>
              {unreadCount} new notification{unreadCount > 1 ? "s" : ""}
            </Text>
            <Text style={styles.tooltipSub}>Tap to view</Text>
          </View>
        </Animated.View>
      )}

      {/* BELL */}
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={handlePress}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Bell size={20} color="green" />
        </Animated.View>

        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>{badgeLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },

  button: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: NAVY,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: NAVY,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },

  // TOOLTIP
  tooltip: {
    position: "absolute",
    top: 54,               // below the button
    right: -4,             // anchor near bell
    minWidth: 190,
    zIndex: 999,
    elevation: 12,
  },
  tooltipArrow: {
    alignSelf: "flex-end",
    marginRight: 18,
    width: 12,
    height: 12,
    backgroundColor: "#fff",
    transform: [{ rotate: "45deg" }],
    marginBottom: -6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipInner: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.06)",
  },
  tooltipTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "800",
  },
  tooltipSub: {
    color: "#8B8BAE",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});