import React, { useRef, useEffect } from "react";
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
  Dimensions,
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
  Circle,
  G,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "../screens/home/HomeScreen";
import ProductsScreen from "../screens/products/ProductsScreen";
import CreateProductScreen from "../screens/products/CreateProductScreen";
import NearbyScreen from "../screens/products/NearbyScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ============================================================
// RESPONSIVE SIZING
// ============================================================
const isSmallDevice = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH >= 768;
const isSmallHeight = SCREEN_HEIGHT < 700;

const BAR_HEIGHT = isTablet ? 82 : isSmallDevice ? 64 : isSmallHeight ? 62 : 70;
const CENTER_SIZE = isTablet ? 70 : isSmallDevice ? 56 : 62;
const ICON_SIZE = isTablet ? 24 : isSmallDevice ? 20 : 22;
const FAB_RING = isTablet ? 4 : 3; // white ring around FAB
const FAB_LIFT = CENTER_SIZE / 2 + (isTablet ? 16 : 12); // how high it pops above the bar
const NOTCH_R = CENTER_SIZE / 2 + FAB_RING + 6; // scoop radius around the FAB

// ============================================================
// THEME — Dark green + white
// ============================================================
const DARK_GREEN = "#15803D";
const DARK_GREEN_DEEP = "#0F5C2B";
const DARK_GREEN_SOFT = "#DCFCE7";
const DARK_GREEN_HAZE = "#F0FDF4";
const WHITE = "#FFFFFF";
const INACTIVE = "#94A3B8";
const HAIRLINE = "rgba(21,128,61,0.10)";

// Top corner radius of the bar — linked to the screen edge
const BAR_CORNER = isTablet ? 36 : isSmallDevice ? 22 : 28;

const ICONS = {
  Home,
  Products: Package,
  Create: PlusCircle,
  Nearby: MapPin,
  Profile: User,
};

// ============================================================
// Bar path — smooth curved scoop for the centered floating FAB
//
//  ── Top edge with:
//     • rounded top-left  (BAR_CORNER)
//     • flat shoulder
//     • deep symmetric scoop (bezier) that hugs the FAB
//     • flat shoulder
//     • rounded top-right (BAR_CORNER)
//  ── Straight sides down to the screen bottom
// ============================================================
function barPath(width, height, notchR, corner = 26) {
  const cx = width / 2;
  // Horizontal footprint of the scoop — wide enough to feel intentional,
  // narrow enough to leave room for the two tabs on each side.
  const scoopHalf = notchR + 8;

  // Shoulder = where the top edge stops being flat
  const leftShoulder = cx - scoopHalf;
  const rightShoulder = cx + scoopHalf;

  // Control points for the smooth scoop
  const c1x = cx - scoopHalf * 0.70;
  const c2x = cx + scoopHalf * 0.70;
  const shoulderY = 0;
  const scoopDepth = notchR * 1.2; // how deep the curve dips

  return [
    // Top-left rounded corner
    `M0,${corner}`,
    `Q0,0 ${corner},0`,

    // Flat shoulder up to the scoop
    `L${leftShoulder},${shoulderY}`,

    // Smooth scoop: ease into the dip, pass under the FAB, ease out
    `C${c1x},${shoulderY * 1.0} ${cx - notchR * 0.9},${scoopDepth} ${cx},${scoopDepth}`,
    `C${cx + notchR * 0.9},${scoopDepth} ${c2x},${shoulderY * 1.0} ${rightShoulder},${shoulderY}`,

    // Flat shoulder to the right corner
    `L${width - corner},${shoulderY}`,
    `Q${width},0 ${width},${corner}`,

    // Right and bottom edges
    `L${width},${height}`,
    `L0,${height}`,
    "Z",
  ].join(" ");
}

// ============================================================
// Regular tab button
// ============================================================
function TabButton({ routeName, focused, onPress }) {
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

  const iconColor = focused ? DARK_GREEN : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={styles.tabButton}
      hitSlop={8}
      android_ripple={{ color: DARK_GREEN_SOFT, borderless: true, radius: 40 }}
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
          size={ICON_SIZE}
          color={iconColor}
          strokeWidth={focused ? 2.6 : 2}
        />

        <Animated.View
          style={[
            styles.dot,
            {
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
//   • Sits above the bar (physically outside)
//   • White ring + green disc + soft outer glow
//   • Animated pulse ring when focused
//   • Plus rotates to X when focused (optional affordance)
// ============================================================
function CenterButton({ routeName, focused, onPress }) {
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

  // Subtle pulse ring animation when focused
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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={styles.centerWrap}
      hitSlop={16}
    >
      {/* Animated pulse ring (outside the button) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          {
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />

      <Animated.View style={[styles.centerButton, { transform: [{ scale }] }]}>
        {/* Inner highlight ring for depth */}
        <View style={styles.fabInnerHighlight} pointerEvents="none" />

        <Animated.View
          style={{ transform: [{ rotate: focused ? rotation : "0deg" }] }}
        >
          <Icon size={ICON_SIZE + 8} color={WHITE} strokeWidth={2.7} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ============================================================
// Custom tab bar
// ============================================================
function CurvedTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const totalHeight = BAR_HEIGHT + insets.bottom;
  const headroom = FAB_LIFT + FAB_RING + 8;

  return (
    <View
      style={[styles.container, { height: totalHeight + headroom }]}
      pointerEvents="box-none"
    >
      {/* Shaped background SVG */}
      <Svg
        width={SCREEN_WIDTH}
        height={totalHeight}
        style={styles.svg}
        pointerEvents="none"
      >
        <Defs>
         <LinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
  <Stop offset="0%" stopColor={"whiate"} stopOpacity="1" />
  <Stop offset="100%" stopColor={"white"} stopOpacity="1" />
</LinearGradient>

          {/* Soft top shadow gradient drawn as an overlay stroke */}
          <LinearGradient id="topShadow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={DARK_GREEN_DEEP} stopOpacity="0.06" />
            <Stop offset="100%" stopColor={DARK_GREEN_DEEP} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Main bar shape */}
        <Path
          d={barPath(SCREEN_WIDTH, totalHeight, NOTCH_R, BAR_CORNER)}
          fill="url(#barFill)"
        />

        {/* Hairline following the top edge (including the scoop) */}
        <Path
          d={barPath(SCREEN_WIDTH, totalHeight, NOTCH_R, BAR_CORNER)}
          fill="none"
          stroke={HAIRLINE}
          strokeWidth={1}
        />
      </Svg>

      {/* Icon row */}
      <View
        style={[
          styles.row,
          {
            height: totalHeight,
            paddingBottom: insets.bottom,
            bottom: 0,
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
              />
            );
          }

          return (
            <TabButton
              key={route.key}
              routeName={route.name}
              focused={focused}
              onPress={onPress}
            />
          );
        })}
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
        sceneContainerStyle: { backgroundColor: "transparent" },
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
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    borderTopLeftRadius: BAR_CORNER,
    borderTopRightRadius: BAR_CORNER,
    overflow: "visible", // keep the FAB pop-out visible
    ...Platform.select({
      ios: {
        shadowColor: DARK_GREEN_DEEP,
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
      },
      android: {
        elevation: 0,
        backgroundColor: "transparent",
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
    width: 56,
    height: 56,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: DARK_GREEN_SOFT,
  },
  dot: {
    position: "absolute",
    bottom: 8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: DARK_GREEN,
  },

  // ---------- Center FAB ----------
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -(FAB_LIFT + FAB_RING),
    backgroundColor: "transparent",
  },

  // Pulse ring that emanates from the FAB when focused
  pulseRing: {
    position: "absolute",
    top: 0,
    width: CENTER_SIZE + FAB_RING * 2,
    height: CENTER_SIZE + FAB_RING * 2,
    borderRadius: (CENTER_SIZE + FAB_RING * 2) / 2,
    backgroundColor: DARK_GREEN,
    opacity: 0.35,
  },

  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    borderWidth: FAB_RING,
    borderColor: "#16A34A",
    // Deep "floating" shadow
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 14,
  },

  // Inner top highlight → gives the disc a 3D feel
  fabInnerHighlight: {
    position: "absolute",
    top: 4,
    left: 10,
    right: 10,
    height: CENTER_SIZE * 0.35,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});