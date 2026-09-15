import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, ClipPath, Path, Rect, Pattern } from "react-native-svg";
import { Star, X, ChevronRight } from "lucide-react-native";

// ============================================================
// CONFIG — replace with your real store links / API data
// ============================================================
const APP_NAME = "Souk";
const STORE_URL = Platform.select({
  ios: "https://apps.apple.com/app/id0000000000", // ← your App Store id
  android: "market://details?id=com.yourapp", // ← your bundle id
  default: "https://play.google.com/store/apps/details?id=com.yourapp",
});

// ---------- Fake rater data (swap with your API) ----------
const RATERS = [
  { initials: "SK", color: "#F59E0B" },
  { initials: "AM", color: "#3B82F6" },
  { initials: "YZ", color: "#EC4899" },
];

const AVERAGE = 4.8; // ← from your API
const MAX = 5;
const RATED_COUNT = 13; // ← from your API

// ---------- Theme (matches the reference design) ----------
const BG = "#1B1B29";
const LIME = "#CDF15C";
const LIME_DARK = "#A8D63B";
const SLATE = "#242433";
const SLATE_LIGHT = "#3A3A4E";
const WHITE = "#FFFFFF";
const MUTED = "#8E8EA3";
const PURPLE = "#7C6CF6";

// ============================================================
// LIME SQUIRCLE — the shaped green SVG from the reference
// Continuous-corner rounded rect, stretched to its container.
// ============================================================
function LimeShape({ width = 360, height = 250, children, style }) {
  const r = 48; // corner radius
  const d = `
    M 0 ${r}
    C 0 ${r * 0.35} ${r * 0.35} 0 ${r} 0
    H ${width - r}
    C ${width - r * 0.35} 0 ${width} ${r * 0.35} ${width} ${r}
    V ${height - r}
    C ${width} ${height - r * 0.35} ${width - r * 0.35} ${height} ${width - r} ${height}
    H ${r}
    C ${r * 0.35} ${height} 0 ${height - r * 0.35} 0 ${height - r}
    Z
  `;
  return (
    <View style={[styles.shapeWrap, style]}>
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <Path d={d} fill={LIME} />
      </Svg>
      {children}
    </View>
  );
}

// ============================================================
// STRIPED PROGRESS BAR (SVG, hatched fill like the reference)
// ============================================================
function StripedProgress({ progress, width = 300, height = 26 }) {
  const fillW = Math.max(height, width * Math.min(Math.max(progress, 0), 1));
  const hatch = "hatchClip";
  const clip = "fillClip";
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <Defs>
        <Pattern
          id={hatch}
          patternUnits="userSpaceOnUse"
          width="14"
          height={height}
        >
          <Rect width="14" height={height} fill={SLATE_LIGHT} />
          <Path
            d={`M-4 ${height + 4} L18 -4`}
            stroke={SLATE}
            strokeWidth="5"
          />
        </Pattern>
        <ClipPath id={clip}>
          <Rect x="0" y="0" width={fillW} height={height} rx={height / 2} />
        </ClipPath>
      </Defs>

      {/* track */}
      <Rect x="0" y="0" width={width} height={height} rx={height / 2} fill={SLATE} />
      {/* hatched fill, clipped to a rounded rect */}
      <Rect
        x="0"
        y="0"
        width={fillW}
        height={height}
        rx={height / 2}
        fill={`url(#${hatch})`}
        clipPath={`url(#${clip})`}
      />
    </Svg>
  );
}

// ============================================================
// AVATAR CLUSTER — overlapping rater avatars + "+N" chip
// ============================================================
function AvatarCluster({ raters, extraCount }) {
  return (
    <View style={styles.avatarsRow}>
      {raters.map((r, i) => (
        <View
          key={r.initials}
          style={[
            styles.avatar,
            { backgroundColor: r.color, marginLeft: i === 0 ? 0 : -12 },
          ]}
        >
          <Text style={styles.avatarText}>{r.initials}</Text>
        </View>
      ))}
      <View style={[styles.avatar, styles.avatarMore, { marginLeft: -12 }]}>
        <Text style={styles.avatarMoreText}>+{extraCount}</Text>
      </View>
    </View>
  );
}

// ============================================================
// SCREEN
// ============================================================
export default function RateUsScreen({ navigation }) {
  const [rating, setRating] = useState(0);
  const [thanks, setThanks] = useState(false);

  const openStore = async () => {
    try {
      const supported = await Linking.canOpenURL(STORE_URL);
      if (supported) await Linking.openURL(STORE_URL);
    } catch (e) {
      console.log("RATE US LINK ERROR:", e.message);
    }
  };

  const handlePick = (value) => {
    setRating(value);
    setThanks(false);
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    setThanks(true);
    openStore();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rate Us</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.8}
          onPress={() => navigation?.goBack?.()}
        >
          <X size={20} color={WHITE} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

      {/* LIME CARD */}
      <LimeShape style={styles.card} height={250}>
        <View style={styles.cardContent}>
          {/* top row: label + avatars */}
          <View style={styles.cardTopRow}>
            <View style={styles.pill}>
              <Star size={12} color={LIME_DARK} fill={LIME_DARK} />
              <Text style={styles.pillText}>Rated by our users</Text>
            </View>
            <AvatarCluster raters={RATERS} extraCount={RATED_COUNT - RATERS.length} />
          </View>

          {/* big count + chip */}
          <View style={styles.countRow}>
            <Text style={styles.bigCount}>
              {AVERAGE}
              <Text style={styles.bigCountMax}>/{MAX}</Text>
            </Text>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>{RATED_COUNT}+ users</Text>
            </View>
          </View>

          {/* striped progress */}
          <StripedProgress progress={AVERAGE / MAX} />
        </View>
      </LimeShape>

      {/* STARS */}
      <View style={styles.starsBlock}>
        <Text style={styles.starsTitle}>
          {thanks ? "Thanks for rating us!" : `Enjoying ${APP_NAME}?`}
        </Text>
        <Text style={styles.starsSub}>
          {thanks
            ? "Your support helps us grow."
            : "Tap a star to share your experience."}
        </Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              hitSlop={8}
              onPress={() => handlePick(i)}
            >
              <Star
                size={38}
                color={i <= rating ? LIME : MUTED}
                fill={i <= rating ? LIME : "transparent"}
                strokeWidth={1.8}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
          activeOpacity={0.85}
          disabled={rating === 0}
          onPress={handleSubmit}
        >
          <Text style={styles.submitBtnText}>Submit rating</Text>
          <ChevronRight size={18} color={BG} strokeWidth={2.8} />
        </TouchableOpacity>
      </View>

      {/* STORE LINK */}
      <TouchableOpacity
        style={styles.storeLink}
        activeOpacity={0.8}
        onPress={openStore}
      >
        <Text style={styles.storeLinkText}>
          or rate {APP_NAME} on the {Platform.OS === "ios" ? "App Store" : "Play Store"}
        </Text>
        <ChevronRight size={16} color={PURPLE} strokeWidth={2.6} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// =====================================
// STYLES
// =====================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 20 },

  // ---------- header ----------
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 24,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: SLATE,
    alignItems: "center",
    justifyContent: "center",
  },

  // ---------- lime squircle ----------
  shapeWrap: {
    position: "relative",
    borderRadius: 48,
    overflow: "hidden",
  },
  card: {
    height: 250,
    shadowColor: LIME_DARK,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  cardContent: {
    flex: 1,
    padding: 22,
    justifyContent: "space-between",
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillText: {
    color: LIME,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // ---------- avatars ----------
  avatarsRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: LIME,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: WHITE, fontSize: 12, fontWeight: "900" },
  avatarMore: { backgroundColor: SLATE },
  avatarMoreText: { color: LIME, fontSize: 12, fontWeight: "900" },

  // ---------- count ----------
  countRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  bigCount: {
    color: BG,
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 58,
  },
  bigCountMax: {
    fontSize: 26,
    fontWeight: "800",
    color: "rgba(27,27,41,0.55)",
  },
  countChip: {
    backgroundColor: "rgba(27,27,41,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  countChipText: { color: BG, fontSize: 12, fontWeight: "900" },

  // ---------- stars ----------
  starsBlock: {
    marginTop: 32,
    alignItems: "center",
    gap: 8,
  },
  starsTitle: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  starsSub: { color: MUTED, fontSize: 13, fontWeight: "600" },
  starsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    marginBottom: 18,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: LIME,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 16,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { color: BG, fontSize: 15, fontWeight: "900" },

  // ---------- store link ----------
  storeLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 24,
  },
  storeLinkText: { color: PURPLE, fontSize: 13, fontWeight: "800" },
});
