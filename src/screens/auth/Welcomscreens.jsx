import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Easing,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Navigation, ArrowRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import bgImage from "../../../assets/images/house.jpg";

const { width, height } = Dimensions.get("window");

// ── Layout constants ──
// ↑ Card is now taller: 55% of screen (was 40%) so buttons have real room
const CARD_HEIGHT = Math.min(height * 0.44, 480);
const ARC_DEPTH = 42;

// ── Brand palette ──
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#ECFDF5";
const SLATE = "#0F172A";
const MUTED = "#64748B";
const WHITE = "#FFFFFF";

export default function WelcomeScreen({ navigation, onLogin, onSignUp }) {
  const { t } = useTranslation();
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1.08)).current;
  const cardTranslateY = useRef(
    new Animated.Value(CARD_HEIGHT + ARC_DEPTH)
  ).current;

  const brandAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.stagger(120, [
        Animated.timing(brandAnim, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleAnim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(subtitleAnim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(buttonsAnim, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const fadeRise = (anim, distance = 20) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  });

  const handleLogin = () => {
    if (onLogin) return onLogin();
    navigation?.navigate("Login");
  };
  const handleSignUp = () => {
    if (onSignUp) return onSignUp();
    navigation?.navigate("Register");
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ---------- Background ---------- */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: bgOpacity, transform: [{ scale: bgScale }] },
        ]}
        pointerEvents="none"
      >
        <Image source={bgImage} style={styles.bgImage} resizeMode="cover" />
        <LinearGradient
          colors={[
            "rgba(21,128,61,0.35)",
            "rgba(15,23,42,0.55)",
            "rgba(15,23,42,0.80)",
          ]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ---------- Brand block (top area) ---------- */}
      <Animated.View
        style={[styles.brandBlock, fadeRise(brandAnim, 16)]}
        pointerEvents="none"
      >
        <View style={styles.brandLogo}>
          <Navigation size={30} color={GREEN_DARK} strokeWidth={2.8} />
        </View>

        <Text style={styles.brandName}>
          Souk<Text style={styles.brandDot}>.</Text>
        </Text>

        <Text style={styles.brandTagline}>
          {t("auth.brandTagline")}
        </Text>
      </Animated.View>

      {/* ---------- Curved white card ---------- */}
      <Animated.View
        style={[
          styles.cardWrap,
          { transform: [{ translateY: cardTranslateY }] },
        ]}
      >
        <View style={styles.arcMask}>
          <View style={styles.arcCircle} />
        </View>

        <View style={styles.cardBody}>
          <Animated.Text style={[styles.title, fadeRise(titleAnim, 12)]}>
            {t("auth.welcome")}
          </Animated.Text>

          <Animated.Text
            style={[styles.subtitle, fadeRise(subtitleAnim, 14)]}
          >
            {t("auth.welcomeSub")}
          </Animated.Text>

          <View style={styles.spacer} />

          <Animated.View
            style={[styles.actions, fadeRise(buttonsAnim, 22)]}
          >
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.88}
              onPress={handleLogin}
            >
              <Text style={styles.primaryButtonText}>{t("auth.login")}</Text>
              <ArrowRight size={16} color={WHITE} strokeWidth={2.6} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={handleSignUp}
            >
              <Text style={styles.secondaryButtonText}>{t("auth.createAccount")}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

/* ------------------------- styles ------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SLATE,
  },

  bgImage: {
    width: "100%",
    height: "100%",
  },

  /* ---------- Brand block ---------- */
  brandBlock: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // now takes the remaining top area above the card
    height: height - CARD_HEIGHT - ARC_DEPTH,
    paddingTop: (StatusBar.currentHeight || 0) + 40,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  brandLogo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 2,
    borderColor: WHITE,
  },

  brandName: {
    fontSize: 34,
    fontWeight: "900",
    color: WHITE,
    letterSpacing: -0.8,
    textAlign: "center",
  },

  brandDot: {
    color: GREEN_SOFT,
  },

  brandTagline: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.4,
    textAlign: "center",
    maxWidth: 280,
  },

  /* ---------- Card ---------- */
  cardWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: CARD_HEIGHT + ARC_DEPTH,
  },

  arcMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ARC_DEPTH,
    overflow: "hidden",
  },

  arcCircle: {
    position: "absolute",
    top: -ARC_DEPTH * 6,
    left: -width * 0.3,
    width: width * 1.6,
    height: ARC_DEPTH * 12,
    borderRadius: (width * 1.6) / 2,
    backgroundColor: "transparent",
  },

  cardBody: {
    position: "absolute",
    top: ARC_DEPTH,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHITE,
    borderTopRightRadius: 56,
    borderTopLeftRadius: 56,
    paddingHorizontal: 32,
    paddingTop: 40, // ↑ more room above the title
    paddingBottom: Platform.OS === "ios" ? 48 : 36,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
    }),
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 3,
    color: SLATE,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 320,
  },

  // flexible gap that pushes buttons toward the bottom
  spacer: { flex: 1 },

  actions: {
    width: "100%",
    gap: 12, // ↑ a touch more breathing room between buttons
  },

  /* Primary green button */
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16, // ↑ slightly taller tap target
    shadowColor: GREEN_DARK,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  /* Secondary white + green outline */
  secondaryButton: {
    width: "100%",
    backgroundColor: GREEN_TINT,
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: GREEN_DARK,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});