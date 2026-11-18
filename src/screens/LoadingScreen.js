import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Adjust the path to where this file lives in your project.
import logo from "../../assets/applogowhite.png";

/* Same palette as HomeScreen */
const PRIMARY_DARK = "#1D4ED8";
const PRIMARY_DEEP = "#0A2E9E";
const SKY = "#38A3FF";
const SKY_SOFT = "#7DD3FC";
const WHITE = "#FFFFFF";
const HERO_GRADIENT = [PRIMARY_DEEP, PRIMARY_DARK, SKY];

const LOGO_BOX = 124;
const RING = LOGO_BOX + 20;

const NAME_TOP = "Souma";
const NAME_BOTTOM = "Market";

/* One letter that rises and fades in */
function Letter({ char, anim, style }) {
  return (
    <Animated.Text
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
            },
          ],
        },
      ]}
    >
      {char}
    </Animated.Text>
  );
}

/* A ripple ring that expands from behind the logo, forever */
function Ripple({ delay }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ripple,
        {
          opacity: t.interpolate({
            inputRange: [0, 0.15, 1],
            outputRange: [0, 0.5, 0],
          }),
          transform: [
            {
              scale: t.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 2.3],
              }),
            },
          ],
        },
      ]}
    />
  );
}

/**
 * Branded loading screen.
 *
 * <LoadingScreen />                       → always visible
 * <LoadingScreen visible={isLoading} />   → fades out when isLoading turns false
 */
export default function LoadingScreen({ visible = true, onHidden }) {
  const { width } = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);

  const screenOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const logoIn = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;

  const letters = useMemo(
    () =>
      [...NAME_TOP, ...NAME_BOTTOM].map(() => new Animated.Value(0)),
    []
  );

  /* Entrance sequence + loops */
  useEffect(() => {
    if (!visible) return undefined;

    // Logo springs in
    Animated.spring(logoIn, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // Letters pop in one after another
    Animated.stagger(
      70,
      letters.map((v) =>
        Animated.spring(v, {
          toValue: 1,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        })
      )
    ).start(() => {
      Animated.timing(tagline, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });

    // Logo floats gently
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Soft glow pulse
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Progress bar sweep
    const barLoop = Animated.loop(
      Animated.timing(bar, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      })
    );

    floatLoop.start();
    glowLoop.start();
    barLoop.start();

    return () => {
      floatLoop.stop();
      glowLoop.stop();
      barLoop.stop();
    };
  }, [visible, logoIn, letters, tagline, float, glow, bar]);

  /* Fade in / out when `visible` changes */
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          onHidden?.();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const trackW = Math.min(width * 0.42, 180);
  const barW = trackW * 0.45;

  const floatY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -9],
  });

  const logoScale = logoIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.4],
  });

  const barX = bar.interpolate({
    inputRange: [0, 1],
    outputRange: [-barW, trackW],
  });

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft background shapes */}
      <View style={[styles.shape, styles.shapeA]} />
      <View style={[styles.shape, styles.shapeB]} />

      <View style={styles.center}>
        {/* Logo + ripples */}
        <View style={styles.logoStage}>
          <Ripple delay={0} />
          <Ripple delay={730} />
          <Ripple delay={1460} />

          <Animated.View
            style={[
              styles.glow,
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />

          <Animated.View
            style={[
              styles.logoBox,
              {
                opacity: logoIn,
                transform: [{ translateY: floatY }, { scale: logoScale }],
              },
            ]}
          >
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </Animated.View>
        </View>

        {/* Name: letters pop in one by one */}
        <View style={styles.nameBlock}>
          <View style={styles.row}>
            {[...NAME_TOP].map((c, i) => (
              <Letter key={`t-${i}`} char={c} anim={letters[i]} style={styles.nameTop} />
            ))}
          </View>
          <View style={[styles.row, styles.rowBottom]}>
            {[...NAME_BOTTOM].map((c, i) => (
              <Letter
                key={`b-${i}`}
                char={c}
                anim={letters[NAME_TOP.length + i]}
                style={styles.nameBottom}
              />
            ))}
          </View>
        </View>

        {/* Sweeping progress bar */}
        <Animated.View style={[styles.track, { width: trackW, opacity: tagline }]}>
          <Animated.View
            style={[
              styles.barFill,
              { width: barW, transform: [{ translateX: barX }] },
            ]}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: PRIMARY_DEEP,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  shape: { position: "absolute", borderRadius: 999 },
  shapeA: {
    width: 340,
    height: 340,
    top: -120,
    end: -130,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  shapeB: {
    width: 240,
    height: 240,
    bottom: -90,
    start: -90,
    borderWidth: 14,
    borderColor: "rgba(255,255,255,0.10)",
  },

  logoStage: {
    width: RING * 2.4,
    height: RING * 2.4,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
  },
  glow: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: SKY_SOFT,
  },
  logoBox: {
    width: LOGO_BOX,
    height: LOGO_BOX,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
  },
  logo: { width: 78, height: 78 },

  nameBlock: { alignItems: "center", marginTop: -RING * 0.55 },
  row: { flexDirection: "row", alignItems: "flex-end" },
  rowBottom: { marginTop: -4 },
  nameTop: {
    color: WHITE,
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: -1,
  },
  nameBottom: {
    color: SKY_SOFT,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 7,
    marginStart: 0,
  },

  track: {
    height: 4,
    borderRadius: 2,
    marginTop: 34,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: WHITE,
  },
});