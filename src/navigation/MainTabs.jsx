// navigation/MainTabs.js
import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  LayoutGrid,
  Plus,
  Navigation as NavigationIcon,
  User,
} from "lucide-react-native";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Path,
  Defs,
  ClipPath,
  G,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "../screens/home/HomeScreen";
import ProductsScreen from "../screens/products/ProductsScreen";
import CreateProductScreen from "../screens/products/CreateProductScreen";
import NearbyScreen from "../screens/products/NearbyScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

import { useTheme } from "../context/ThemeContext";
import { getMetrics } from "../screens/home/TabSpace";
import {
  subscribeTabBar,
  setTabBarHidden,
  getTabBarHidden,
} from "./tabBarScroll";

const Tab = createBottomTabNavigator();

/* ============================================================ */
/* Scene wrapper                                                */
/* ============================================================ */
const SceneSpaceContext = createContext(null);

function withScene(Screen, name) {
  function Scene(props) {
    const space = useContext(SceneSpaceContext);
    return (
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "transparent",
          marginBottom: space || 0,
        }}
      >
        <Screen {...props} />
      </Animated.View>
    );
  }
  Scene.displayName = `Scene(${name})`;
  return Scene;
}

const HomeTab = withScene(HomeScreen, "Home");
const ProductsTab = withScene(ProductsScreen, "Products");
const CreateTab = withScene(CreateProductScreen, "Create");
const NearbyTab = withScene(NearbyScreen, "Nearby");
const ProfileTab = withScene(ProfileScreen, "Profile");

/* ============================================================ */
/* Icons + labels                                               */
/* ============================================================ */
const ICONS = {
  Home,
  Products: LayoutGrid,
  Create: Plus,
  Nearby: NavigationIcon,
  Profile: User,
};

const LABELS = {
  Home: "Home",
  Products: "Browse",
  Create: "Sell",
  Nearby: "Nearby",
  Profile: "Profile",
};

/* ============================================================ */
/* Bar geometry                                                 */
/* ============================================================ */
function buildPaths(m, cx, depthFactor) {
  const { width, barHeight, notchR, scoopHalf, restDepth, corner } = m;
  const dep = restDepth * depthFactor;
  const lSh = cx - scoopHalf;
  const rSh = cx + scoopHalf;
  const ext = 120;

  const top = [
    `M${-ext},0`,
    `L${lSh},0`,
    `C${lSh + scoopHalf * 0.55},0 ${cx - notchR * 0.95},${dep} ${cx},${dep}`,
    `C${cx + notchR * 0.95},${dep} ${rSh - scoopHalf * 0.55},0 ${rSh},0`,
    `L${width + ext},0`,
  ].join(" ");

  const fill = `${top} L${width + ext},${barHeight} L${-ext},${barHeight} Z`;

  const clip = [
    `M0,${barHeight}`,
    `L0,${corner}`,
    `Q0,0 ${corner},0`,
    `L${width - corner},0`,
    `Q${width},0 ${width},${corner}`,
    `L${width},${barHeight}`,
    "Z",
  ].join(" ");

  return { top, fill, clip };
}

/* ============================================================ */
/* Theme — white bar, brand-blue accents                        */
/* ============================================================ */
function buildTheme(colors, isDark) {
  // Bar surface is white in light mode, near-white in dark mode.
  // Brand blue lives on the ball and the active label only.
  return {
    // Filled SVG surface color (solid, no gradient)
    barFill: isDark ? "#0E1733" : "#FFFFFF",

    // 1px top hairline — darker on light, lighter on dark
    barHairline: isDark ? "rgba(255,255,255,0.10)" : "rgba(11,27,58,0.08)",

    // Shadow tint under the bar
    barShadow: isDark ? "#000000" : "#1D4ED8",

    // Inactive icon / label on the white surface
    iconInactive: isDark ? "#93C5FD" : "#0A2E9E",
    labelInactive: isDark
      ? "rgba(147,197,253,0.75)"
      : "rgba(10,46,158,0.72)",

    // Active label (the one sitting on the ball is white via ballIcon;
    // the small label under the ball uses this color)
    labelActive: isDark ? "#FFFFFF" : "#1D4ED8",

    // Android ripple on white surface
    ripple: isDark ? "rgba(255,255,255,0.14)" : "rgba(37,99,235,0.12)",

    // The ball — always the brand moment
    ballGradient: isDark ? ["#1D4ED8", "#38A3FF"] : ["#1D4ED8", "#38A3FF"],
    ballShadow: "#1D4ED8",
    ballIcon: "#FFFFFF",
  };
}

/* ============================================================ */
/* Regular tab button                                           */
/* ============================================================ */
function TabButton({
  routeName,
  onPress,
  iconOpacity,
  activeLabelOpacity,
  inactiveLabelOpacity,
  theme,
  m,
}) {
  const Icon = ICONS[routeName] || Home;
  const label = LABELS[routeName] || routeName;
  const pressScale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.9,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();

  const labelStyle = {
    fontSize: m.labelSize,
    letterSpacing: 0.2,
    marginTop: 3,
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[styles.tabButton, { height: m.barContent }]}
      hitSlop={4}
      android_ripple={{
        color: theme.ripple,
        borderless: true,
        radius: m.tabSize / 1.2,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View
        style={{ alignItems: "center", transform: [{ scale: pressScale }] }}
      >
        <Animated.View
          style={{
            height: m.iconSize + 4,
            alignItems: "center",
            justifyContent: "center",
            opacity: iconOpacity,
          }}
        >
          <Icon
            size={m.iconSize}
            color={theme.iconInactive}
            strokeWidth={1.6}
          />
        </Animated.View>

        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Animated.Text
            numberOfLines={1}
            style={[
              labelStyle,
              {
                color: theme.labelInactive,
                opacity: inactiveLabelOpacity,
              },
            ]}
          >
            {label}
          </Animated.Text>
          <Animated.Text
            numberOfLines={1}
            style={[
              labelStyle,
              StyleSheet.absoluteFill,
              {
                color: theme.labelActive,
                fontWeight: "700",
                opacity: activeLabelOpacity,
                textAlign: "center",
              },
            ]}
          >
            {label}
          </Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ============================================================ */
/* Custom tab bar — white surface, brand-ball accent            */
/* ============================================================ */
function CurvedTabBar({ state, navigation, m }) {
  const { colors, isDark } = useTheme();
  const theme = useMemo(() => buildTheme(colors, isDark), [colors, isDark]);

  const centerOf = useCallback(
    (i) => m.rowLeft + i * m.tabWidth + m.tabWidth / 2,
    [m.rowLeft, m.tabWidth]
  );

  /* ── Animated values ── */
  const ballX = useRef(
    new Animated.Value(centerOf(state.index) - m.ballSize / 2)
  ).current;
  const hop = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 0 : 1))
  ).current;
  const ballOpacity = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
  ).current;

  const cx = useRef(new Animated.Value(centerOf(state.index))).current;
  const depth = useRef(new Animated.Value(1)).current;

  const live = useRef({ cx: centerOf(state.index), depth: 1 });
  const fillRef = useRef(null);
  const lineRef = useRef(null);

  const redraw = useCallback(() => {
    const p = buildPaths(m, live.current.cx, live.current.depth);
    fillRef.current?.setNativeProps({ d: p.fill });
    lineRef.current?.setNativeProps({ d: p.top });
  }, [m]);

  useEffect(() => {
    const a = cx.addListener(({ value }) => {
      live.current.cx = value;
      redraw();
    });
    const b = depth.addListener(({ value }) => {
      live.current.depth = value;
      redraw();
    });
    return () => {
      cx.removeListener(a);
      depth.removeListener(b);
    };
  }, [cx, depth, redraw]);

  /* ── Hide on scroll ── */
  const slideY = useRef(new Animated.Value(0)).current;
  const hideDistance = m.barHeight + m.headroom + 40;

  useEffect(() => {
    const unsubscribe = subscribeTabBar((hidden) => {
      slideY.stopAnimation();
      Animated.timing(slideY, {
        toValue: hidden ? hideDistance : 0,
        duration: hidden ? 220 : 360,
        easing: hidden ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, [slideY, hideDistance]);

  useEffect(() => {
    setTabBarHidden(false);
  }, [state.index]);

  useEffect(() => {
    ballX.setValue(centerOf(state.index) - m.ballSize / 2);
    cx.setValue(centerOf(state.index));
    live.current.cx = centerOf(state.index);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.width, m.rowWidth, m.ballSize]);

  /* ── The slide ── */
  const prevIndex = useRef(state.index);
  useEffect(() => {
    const from = prevIndex.current;
    const to = state.index;
    if (from === to) return;
    prevIndex.current = to;

    const dist = Math.abs(to - from);
    const flight = 460 + dist * 60;
    const target = centerOf(to);

    hop.stopAnimation();
    hop.setValue(0);
    Animated.parallel([
      Animated.timing(ballX, {
        toValue: target - m.ballSize / 2,
        duration: flight,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(hop, {
        toValue: 1,
        duration: flight,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();

    depth.stopAnimation();
    cx.stopAnimation();
    Animated.parallel([
      Animated.sequence([
        Animated.timing(depth, {
          toValue: 0.12,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.delay(flight * 0.4),
        Animated.spring(depth, {
          toValue: 1,
          friction: 7,
          tension: 110,
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(cx, {
        toValue: target,
        duration: flight * 0.55,
        delay: 110,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    state.routes.forEach((_, i) => {
      const isTo = i === to;
      Animated.timing(ballOpacity[i], {
        toValue: isTo ? 1 : 0,
        duration: isTo ? 200 : 120,
        delay: isTo ? flight * 0.35 : 0,
        useNativeDriver: true,
      }).start();
      Animated.timing(barOpacity[i], {
        toValue: isTo ? 0 : 1,
        duration: isTo ? 160 : 220,
        delay: isTo ? flight * 0.5 : 120,
        useNativeDriver: true,
      }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);

  /* ── Ball transforms ── */
  const ballTransform = useMemo(() => {
    const steps = 10;
    const input = Array.from({ length: steps + 1 }, (_, k) => k / steps);
    const arc = input.map((p) => -m.jump * 4 * p * (1 - p));

    return {
      translateY: hop.interpolate({ inputRange: input, outputRange: arc }),
      scaleY: hop.interpolate({
        inputRange: [0, 0.15, 0.5, 0.88, 0.95, 1],
        outputRange: [1, 1.08, 1.03, 0.94, 1.02, 1],
      }),
      scaleX: hop.interpolate({
        inputRange: [0, 0.15, 0.5, 0.88, 0.95, 1],
        outputRange: [1, 0.94, 0.98, 1.07, 0.99, 1],
      }),
    };
  }, [hop, m.jump]);

  const ballTop = m.headroom + m.restDepth - m.gap - m.ballSize;
  const initial = buildPaths(m, live.current.cx, live.current.depth);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: m.barHeight + m.headroom,
          transform: [{ translateY: slideY }],
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Bar surface */}
      <View
        style={[
          styles.barShell,
          {
            height: m.barHeight,
            ...(Platform.OS === "ios"
              ? { shadowColor: theme.barShadow }
              : null),
          },
        ]}
        pointerEvents="box-none"
      >
        <Svg
          width={m.width}
          height={m.barHeight}
          style={styles.svg}
          pointerEvents="none"
        >
          <Defs>
            <ClipPath id="barClip">
              <Path d={initial.clip} />
            </ClipPath>
          </Defs>
          <G clipPath="url(#barClip)">
            {/* Solid white surface — no gradient */}
            <Path ref={fillRef} d={initial.fill} fill={theme.barFill} />
            {/* Hairline along the notch + top edge */}
            <Path
              ref={lineRef}
              d={initial.top}
              fill="none"
              stroke={theme.barHairline}
              strokeWidth={1}
            />
          </G>
        </Svg>

        <View
          style={[
            styles.row,
            {
              height: m.barContent,
              bottom: m.inset,
              width: m.rowWidth,
              left: m.rowLeft,
            },
          ]}
          pointerEvents="box-none"
        >
          {state.routes.map((route, index) => {
            const focused = state.index === index;

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

            return (
              <TabButton
                key={route.key}
                routeName={route.name}
                onPress={onPress}
                iconOpacity={barOpacity[index]}
                activeLabelOpacity={ballOpacity[index]}
                inactiveLabelOpacity={barOpacity[index]}
                theme={theme}
                m={m}
              />
            );
          })}
        </View>
      </View>

      {/* The ball — brand blue accent on a white bar */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ball,
          {
            top: ballTop,
            width: m.ballSize,
            height: m.ballSize,
            borderRadius: m.ballSize / 2,
            shadowColor: theme.ballShadow,
            transform: [
              { translateX: ballX },
              { translateY: ballTransform.translateY },
              { scaleX: ballTransform.scaleX },
              { scaleY: ballTransform.scaleY },
            ],
          },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={theme.ballGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: m.ballSize / 2 },
          ]}
        />
        {state.routes.map((route, i) => {
          const Icon = ICONS[route.name] || Home;
          return (
            <Animated.View
              key={route.key}
              style={[
                StyleSheet.absoluteFill,
                styles.center,
                {
                  opacity: ballOpacity[i],
                  transform: [
                    {
                      scale: ballOpacity[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.55, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Icon
                size={m.iconSize}
                color={theme.ballIcon}
                strokeWidth={1.8}
              />
            </Animated.View>
          );
        })}
      </Animated.View>
    </Animated.View>
  );
}

/* ============================================================ */
/* Navigator                                                    */
/* ============================================================ */
export default function MainTabs() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const m = useMemo(
    () => getMetrics(width, height, insets.bottom),
    [width, height, insets.bottom]
  );

  const sceneSpace = useRef(new Animated.Value(m.sceneBottomSpace)).current;

  useEffect(() => {
    sceneSpace.stopAnimation();
    sceneSpace.setValue(getTabBarHidden() ? 0 : m.sceneBottomSpace);

    return subscribeTabBar((hidden) => {
      sceneSpace.stopAnimation();
      Animated.timing(sceneSpace, {
        toValue: hidden ? 0 : m.sceneBottomSpace,
        duration: hidden ? 220 : 360,
        easing: hidden ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, [sceneSpace, m.sceneBottomSpace]);

  const sceneStyle = { backgroundColor: "transparent" };

  return (
    <SceneSpaceContext.Provider value={sceneSpace}>
      <Tab.Navigator
        initialRouteName="Home"
        sceneContainerStyle={sceneStyle}
        screenOptions={{
          headerShown: false,
          sceneStyle,
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
        tabBar={(props) => <CurvedTabBar {...props} m={m} />}
      >
        <Tab.Screen name="Home" component={HomeTab} />
        <Tab.Screen name="Products" component={ProductsTab} />
        <Tab.Screen name="Create" component={CreateTab} />
        <Tab.Screen name="Nearby" component={NearbyTab} />
        <Tab.Screen name="Profile" component={ProfileTab} />
      </Tab.Navigator>
    </SceneSpaceContext.Provider>
  );
}

/* ============================================================ */
/* Styles                                                       */
/* ============================================================ */
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    overflow: "visible",
  },
  barShell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: { elevation: 12 },
    }),
  },
  svg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "transparent",
  },
  row: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "transparent",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
  },
  center: { alignItems: "center", justifyContent: "center" },
  ball: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});