import React, { useRef, useEffect, useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  Package,
  PlusCircle,
  MapPin,
  User,
} from "lucide-react-native";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

import HomeScreen from "../screens/home/HomeScreen";
import ProductsScreen from "../screens/products/ProductsScreen";
import CreateProductScreen from "../screens/products/CreateProductScreen";
import NearbyScreen from "../screens/products/NearbyScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

import { useTheme } from "../context/ThemeContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

const Tab = createBottomTabNavigator();

const ICONS = {
  Home,
  Products: Package,
  Create: PlusCircle,
  Nearby: MapPin,
  Profile: User,
};

// ============================================================
// Bar path — dynamic curved scoop cradling the center floating FAB
// ============================================================
function barPath(width, height, notchR, corner = 20) {
  const cx = width / 2;
  const scoopHalf = notchR + 6;

  const leftShoulder = cx - scoopHalf;
  const rightShoulder = cx + scoopHalf;

  const c1x = cx - scoopHalf * 0.65;
  const c2x = cx + scoopHalf * 0.65;
  const shoulderY = 0;
  const scoopDepth = Math.round(notchR * 0.76);

  return [
    `M0,${corner}`,
    `Q0,0 ${corner},0`,
    `L${leftShoulder},${shoulderY}`,
    `C${c1x},${shoulderY} ${cx - notchR * 0.82},${scoopDepth} ${cx},${scoopDepth}`,
    `C${cx + notchR * 0.82},${scoopDepth} ${c2x},${shoulderY} ${rightShoulder},${shoulderY}`,
    `L${width - corner},${shoulderY}`,
    `Q${width},0 ${width},${corner}`,
    `L${width},${height}`,
    `L0,${height}`,
    "Z",
  ].join(" ");
}

// ============================================================
// Regular tab button
// ============================================================
function TabButton({ routeName, focused, onPress, theme, iconSize, height }) {
  const Icon = ICONS[routeName] || Home;

  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(glow, {
        toValue: focused ? 1 : 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.spring(lift, {
        toValue: focused ? -3 : 0,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, glow, lift]);

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.88,
      friction: 5,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();

  const iconColor = focused
    ? theme.tabActiveIcon
    : theme.tabInactiveIcon;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[styles.tabButton, { height }]}
      hitSlop={8}
      android_ripple={{
        color: theme.tabRipple,
        borderless: true,
        radius: 40,
      }}
    >
      <Animated.View
        style={[
          styles.tabInner,
          { transform: [{ scale }, { translateY: lift }] },
        ]}
      >
        <Animated.View
          style={[
            styles.activePill,
            {
              backgroundColor: theme.tabActivePill,
              opacity: glow,
              transform: [
                {
                  scale: glow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        />

        <Icon
          size={iconSize}
          color={iconColor}
          strokeWidth={focused ? 2.6 : 2}
        />

        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: theme.tabDot,
              opacity: glow,
              transform: [
                {
                  translateY: glow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 0],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

// ============================================================
// Center floating FAB
// ============================================================
function CenterButton({
  routeName,
  focused,
  onPress,
  theme,
  centerSize,
  iconSize,
  fabRing,
  fabLift,
}) {
  const Icon = ICONS[routeName] || PlusCircle;

  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.08 : 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();

    Animated.timing(rotate, {
      toValue: focused ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, scale, rotate]);

  useEffect(() => {
    if (focused) {
      pulse.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(0);
    }
  }, [focused, pulse]);

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.9,
      friction: 5,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: focused ? 1.08 : 1,
      friction: 5,
      useNativeDriver: true,
    }).start();

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "135deg"],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0],
  });

  const ringDim = centerSize + fabRing * 2;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[styles.centerWrap, { marginTop: -(fabLift + fabRing) }]}
      hitSlop={16}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          {
            width: ringDim,
            height: ringDim,
            borderRadius: ringDim / 2,
            backgroundColor: theme.fabBg,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.centerButton,
          {
            width: centerSize,
            height: centerSize,
            borderRadius: centerSize / 2,
            borderWidth: fabRing,
            backgroundColor: theme.fabBg,
            borderColor: theme.fabBorder,
          },
          { transform: [{ scale }] },
        ]}
      >
        <View
          style={[
            styles.fabInnerHighlight,
            {
              height: centerSize * 0.32,
              borderRadius: centerSize / 2,
            },
          ]}
          pointerEvents="none"
        />

        <Animated.View
          style={{
            transform: [{ rotate: focused ? rotation : "0deg" }],
          }}
        >
          <Icon
            size={iconSize + 8}
            color={theme.fabIcon}
            strokeWidth={2.7}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ============================================================
// Custom tab bar — fully responsive across all devices
// ============================================================
function CurvedTabBar({ state, navigation }) {
  const { colors, isDark } = useTheme();
  const {
    width,
    insets,
    tabBarBaseHeight,
    tabBarTotalHeight,
    tabBarFabLift,
    tabBarCenterSize,
    tabBarIconSize,
    tabBarFabRing,
    tabBarNotchRadius,
    tabBarCornerRadius,
    isTablet,
  } = useResponsiveLayout();

  const totalHeight = tabBarTotalHeight;
  const headroom = tabBarFabLift + tabBarFabRing + 6;

  const theme = useMemo(
    () => ({
      barFill: isDark ? colors.surface : "#FFFFFF",
      barFillTop: isDark ? colors.surface : "#FFFFFF",
      barFillBottom: isDark ? colors.surface : "#FFFFFF",
      barHairline: isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(21,128,61,0.12)",
      barShadow: isDark ? "#000000" : "#0F5C2B",

      tabActiveIcon: colors.icon,
      tabInactiveIcon: colors.inactive,
      tabActivePill: isDark ? "rgba(34,197,94,0.18)" : "#DCFCE7",
      tabDot: colors.primary,
      tabRipple: isDark ? "rgba(34,197,94,0.22)" : "#DCFCE7",

      fabBg: colors.primary,
      fabBorder: isDark ? colors.surface : "#FFFFFF",
      fabIcon: "#FFFFFF",
    }),
    [colors, isDark]
  );

  return (
    <View
      style={[
        styles.container,
        {
          height: totalHeight + headroom,
          bottom: 0,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Docked shaped background — full width, sits at the bottom edge */}
      <View
        style={[styles.barShell, { height: totalHeight }]}
        pointerEvents="box-none"
      >
        <Svg
          width={width}
          height={totalHeight}
          style={styles.svg}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient
              id="barFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop
                offset="0%"
                stopColor={theme.barFillTop}
                stopOpacity="1"
              />
              <Stop
                offset="100%"
                stopColor={theme.barFillBottom}
                stopOpacity="1"
              />
            </LinearGradient>

            <LinearGradient
              id="topShadow"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop
                offset="0%"
                stopColor={theme.barShadow}
                stopOpacity="0.06"
              />
              <Stop
                offset="100%"
                stopColor={theme.barShadow}
                stopOpacity="0"
              />
            </LinearGradient>
          </Defs>

          <Path
            d={barPath(width, totalHeight, tabBarNotchRadius, tabBarCornerRadius)}
            fill="url(#barFill)"
          />

          <Path
            d={barPath(width, totalHeight, tabBarNotchRadius, tabBarCornerRadius)}
            fill="none"
            stroke={theme.barHairline}
            strokeWidth={1}
          />
        </Svg>

        {/* Icon row — compact, responsive, docks safely above bottom insets */}
        <View
          style={[
            styles.row,
            {
              height: tabBarBaseHeight,
              top: 0,
              maxWidth: isTablet ? 720 : "100%",
              alignSelf: "center",
            },
          ]}
          pointerEvents="box-none"
        >
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const isCenter = route.name === "Create";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            if (isCenter) {
              return (
                <CenterButton
                  key={route.key}
                  routeName={route.name}
                  focused={focused}
                  onPress={onPress}
                  theme={theme}
                  centerSize={tabBarCenterSize}
                  iconSize={tabBarIconSize}
                  fabRing={tabBarFabRing}
                  fabLift={tabBarFabLift}
                />
              );
            }

            return (
              <TabButton
                key={route.key}
                routeName={route.name}
                focused={focused}
                onPress={onPress}
                theme={theme}
                iconSize={tabBarIconSize}
                height={tabBarBaseHeight}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ============================================================
// Navigator
// ============================================================
export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: {
          backgroundColor: "transparent",
        },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: "transparent",
        },
      }}
      tabBar={(props) => <CurvedTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Create" component={CreateProductScreen} />
      <Tab.Screen name="Nearby" component={NearbyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    overflow: "visible",
  },

  barShell: {
    position: "relative",
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: {
        elevation: 0,
      },
    }),
  },

  svg: {
    position: "absolute",
    bottom: 0,
    backgroundColor: "transparent",
  },

  row: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "transparent",
  },

  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  dot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // ---------- Center FAB ----------
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "transparent",
  },

  pulseRing: {
    position: "absolute",
    top: 0,
    opacity: 0.35,
  },

  centerButton: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },

  fabInnerHighlight: {
    position: "absolute",
    top: 3,
    left: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});