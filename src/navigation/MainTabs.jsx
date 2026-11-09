import React, { useRef, useEffect, useMemo, useCallback } from "react";
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
import Svg, { Path, Defs, ClipPath, G } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "../screens/home/HomeScreen";
import ProductsScreen from "../screens/products/ProductsScreen";
import CreateProductScreen from "../screens/products/CreateProductScreen";
import NearbyScreen from "../screens/products/NearbyScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

import { useTheme } from "../context/ThemeContext";

const Tab = createBottomTabNavigator();

/* ============================================================ */
/* Icons                                                        */
/* ============================================================ */
const ICONS = {
  Home,
  Products: LayoutGrid,
  Create: Plus,
  Nearby: NavigationIcon,
  Profile: User,
};

const TAB_COUNT = 5;

/* ============================================================ */
/* Metrics                                                      */
/* ============================================================ */
function getMetrics(width, height, bottomInset) {
  const shortSide = Math.min(width, height);
  const isTablet = shortSide >= 600;
  const isSmall = width < 360;
  const isLandscape = width > height;
  const isCompact = !isTablet && (height < 500 || isLandscape);

  const barContent = isTablet ? 68 : isCompact ? 48 : isSmall ? 54 : 58;
  const ballSize = isTablet ? 58 : isCompact ? 44 : isSmall ? 48 : 52;
  const iconSize = isTablet ? 24 : isCompact || isSmall ? 20 : 22;
  const corner = isTablet ? 26 : isSmall ? 20 : 24;
  const tabSize = isTablet ? 52 : 46;
  const gap = 5; // space between ball and the bottom of the notch
  const jump = isCompact ? 18 : 26; // height of the hop arc

  const inset = Math.max(bottomInset || 0, 0);
  const barHeight = barContent + inset;

  const notchR = ballSize / 2 + 6;
  const scoopHalf = notchR * 1.75;
  const restDepth = Math.round(notchR * 0.92);

  // How far the ball rests above the bar's top edge
  const ballAbove = ballSize + gap - restDepth;
  const headroom = ballAbove + jump + 12;

  const rowWidth = Math.min(width, isTablet ? 680 : width);
  const rowLeft = (width - rowWidth) / 2;
  const tabWidth = rowWidth / TAB_COUNT;

  return {
    width,
    barContent,
    barHeight,
    ballSize,
    iconSize,
    corner,
    tabSize,
    gap,
    jump,
    inset,
    notchR,
    scoopHalf,
    restDepth,
    headroom,
    rowWidth,
    rowLeft,
    tabWidth,
    sceneBottomSpace: barHeight,
  };
}

/* ============================================================ */
/* Bar geometry                                                 */
/* The notch is drawn on a flat top edge that is wider than the */
/* screen, then the whole shape is clipped to a rounded-top     */
/* rectangle. That way the notch can sit on the first/last tab  */
/* and cut into the corner without breaking the path.           */
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
/* Theme                                                        */
/* ============================================================ */
function buildTheme(colors, isDark) {
  const primary = colors?.primary || "#16A34A";
  const surface = colors?.surface || (isDark ? "#0B1220" : "#FFFFFF");

  return {
    barFill: surface,
    barHairline: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.07)",
    barShadow: isDark ? "#000000" : "#0F172A",
    iconInactive: isDark
      ? colors?.textMuted || "#94A3B8"
      : colors?.textMuted || "#64748B",
    ripple: `${primary}${isDark ? "33" : "22"}`,
    ballBg: primary,
    ballIcon: "#FFFFFF",
  };
}

/* ============================================================ */
/* Regular tab button (icon lives in the bar)                   */
/* ============================================================ */
function TabButton({ routeName, onPress, opacity, theme, m }) {
  const Icon = ICONS[routeName] || Home;
  const pressScale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.82,
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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[styles.tabButton, { height: m.barContent }]}
      hitSlop={6}
      android_ripple={{ color: theme.ripple, borderless: true, radius: m.tabSize / 1.2 }}
    >
      <Animated.View
        style={{
          width: m.tabSize,
          height: m.tabSize,
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: [{ scale: pressScale }],
        }}
      >
        <Icon size={m.iconSize} color={theme.iconInactive} strokeWidth={1.9} />
      </Animated.View>
    </Pressable>
  );
}

/* ============================================================ */
/* Custom tab bar: hopping ball + morphing notch                */
/* ============================================================ */
function CurvedTabBar({ state, navigation, m }) {
  const { colors, isDark } = useTheme();
  const theme = useMemo(() => buildTheme(colors, isDark), [colors, isDark]);

  const centerOf = useCallback(
    (i) => m.rowLeft + i * m.tabWidth + m.tabWidth / 2,
    [m.rowLeft, m.tabWidth]
  );

  /* ── Animated values ── */
  // Native driver: ball travel + hop arc + icon fades
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

  // JS driver: notch position + depth (drive the SVG path)
  const cx = useRef(new Animated.Value(centerOf(state.index))).current;
  const depth = useRef(new Animated.Value(1)).current;

  const live = useRef({ cx: centerOf(state.index), depth: 1 });
  const fillRef = useRef(null);
  const lineRef = useRef(null);

  /* Redraw the path without re-rendering React */
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

  /* Snap everything when the layout changes (rotation, resize) */
  useEffect(() => {
    ballX.setValue(centerOf(state.index) - m.ballSize / 2);
    cx.setValue(centerOf(state.index));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.width, m.rowWidth, m.ballSize]);

  /* ── The hop ── */
  const prevIndex = useRef(state.index);
  useEffect(() => {
    const from = prevIndex.current;
    const to = state.index;
    if (from === to) return;
    prevIndex.current = to;

    const dist = Math.abs(to - from);
    const flight = 520 + dist * 70;
    const target = centerOf(to);

    // Ball: travel + arc
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

    // Notch: flatten as the ball leaves, glide across, then deepen to catch it
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
        Animated.delay(flight * 0.42),
        Animated.spring(depth, {
          toValue: 1,
          friction: 6,
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

    // Icons: swap between "icon in the bar" and "icon in the ball"
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
        delay: isTo ? flight * 0.55 : 150,
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
      // stretch on launch, squash on landing, small settle
      scaleY: hop.interpolate({
        inputRange: [0, 0.12, 0.5, 0.88, 0.94, 1],
        outputRange: [1, 1.18, 1.06, 0.86, 1.04, 1],
      }),
      scaleX: hop.interpolate({
        inputRange: [0, 0.12, 0.5, 0.88, 0.94, 1],
        outputRange: [1, 0.88, 0.96, 1.14, 0.98, 1],
      }),
    };
  }, [hop, m.jump]);

  const ballTop = m.headroom + m.restDepth - m.gap - m.ballSize;
  const initial = buildPaths(m, live.current.cx, live.current.depth);

  return (
    <View
      style={[styles.container, { height: m.barHeight + m.headroom }]}
      pointerEvents="box-none"
    >
      {/* Bar surface */}
      <View
        style={[
          styles.barShell,
          {
            height: m.barHeight,
            ...(Platform.OS === "ios" ? { shadowColor: theme.barShadow } : null),
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
            <Path ref={fillRef} d={initial.fill} fill={theme.barFill} />
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
                opacity={barOpacity[index]}
                theme={theme}
                m={m}
              />
            );
          })}
        </View>
      </View>

      {/* The ball */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ball,
          {
            top: ballTop,
            width: m.ballSize,
            height: m.ballSize,
            borderRadius: m.ballSize / 2,
            backgroundColor: theme.ballBg,
            shadowColor: theme.ballBg,
            transform: [
              { translateX: ballX },
              { translateY: ballTransform.translateY },
              { scaleX: ballTransform.scaleX },
              { scaleY: ballTransform.scaleY },
            ],
          },
        ]}
      >
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
              <Icon size={m.iconSize + 2} color={theme.ballIcon} strokeWidth={2.4} />
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
}

/* ============================================================ */
/* Navigator                                                    */
/* ============================================================ */
export default function TabNavigator() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const m = useMemo(
    () => getMetrics(width, height, insets.bottom),
    [width, height, insets.bottom]
  );

  const sceneStyle = {
    backgroundColor: "transparent",
    marginBottom: m.sceneBottomSpace,
  };

  return (
    <Tab.Navigator
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
      <Tab.Screen name="Create" component={CreateProductScreen} />
     
      <Tab.Screen name="Products" component={ProductsScreen} />
       <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Nearby" component={NearbyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
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
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: { elevation: 0 },
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
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  ball: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 8,
  },
});