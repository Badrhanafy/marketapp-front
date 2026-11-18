import React, { useEffect, useState, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
  Share,
  Image,
  ImageBackground,
  I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  Share2,
  UserRound,
  RefreshCw,
  ChevronRight,
  CalendarDays,
} from "lucide-react-native";

import api from "../../api/client";
import headerBg from "../../../assets/images/headerbg.jpg";

/* ──────────────────────────────────────────────────────────────
   Theme — same blue gradient system as HomeScreen
   ────────────────────────────────────────────────────────────── */
const PRIMARY = "#2563EB";
const PRIMARY_DARK = "#1D4ED8";
const PRIMARY_DEEP = "#0A2E9E";
const SKY = "#38A3FF";
const SKY_SOFT = "#7DD3FC";
const BLUE_SOFT = "#EFF6FF";
const BLUE_TINT = "#DBEAFE";

const PAGE_BG = "#F3F6FD";
const WHITE = "#FFFFFF";

const INK = "#0B1B3A";
const INK_SOFT = "#2F4170";
const MUTED = "#64748B";
const STRIKE = "#94A3B8";
const BORDER = "rgba(11, 27, 58, 0.08)";

const ONLINE = "#22C55E";

const HERO_GRADIENT = [PRIMARY_DEEP, PRIMARY_DARK, SKY];
const CTA_GRADIENT = [PRIMARY_DARK, SKY];
const GLASS = "rgba(255,255,255,0.16)";
const GLASS_BORDER = "rgba(255,255,255,0.28)";
const ON_HERO = "#FFFFFF";
const ON_HERO_SOFT = "rgba(255,255,255,0.82)";

const PAGE_PADDING = 20;
const HERO_RADIUS = 36;
const AVATAR = 104;

// Replace with your actual public domain / deep link.
const PUBLIC_PROFILE_BASE_URL = "http://192.168.8.28:8000/u";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
const formatMemberSince = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

/* ──────────────────────────────────────────────────────────────
   Contact row
   ────────────────────────────────────────────────────────────── */
const ContactRow = memo(function ContactRow({
  icon: Icon,
  label,
  value,
  onPress,
  last,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.infoRow, !last && styles.infoRowDivider]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.infoIcon}>
        <Icon size={19} color={PRIMARY_DARK} strokeWidth={2.4} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <ChevronRight
        size={18}
        color={STRIKE}
        strokeWidth={2.4}
        style={styles.rtlFlip}
      />
    </TouchableOpacity>
  );
});

/* ==================================================================
   Screen
   ================================================================== */
export default function PublicProfileScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Public endpoint: must not require authentication.
      const response = await api.get(`/users/${userId}/public-profile`);

      setProfile(response.data?.user || response.data);
    } catch (error) {
      console.log(
        "PUBLIC PROFILE ERROR:",
        error.response?.data || error.message
      );
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleCall = async () => {
    if (!profile?.phone) return;

    try {
      await Linking.openURL(`tel:${profile.phone}`);
    } catch {
      Alert.alert("Error", "Unable to open phone application.");
    }
  };

  const handleEmail = async () => {
    if (!profile?.email) return;

    try {
      await Linking.openURL(`mailto:${profile.email}`);
    } catch {
      Alert.alert("Error", "Unable to open email application.");
    }
  };

  const handleShare = async () => {
    if (!profile?.id) return;

    const link = `${PUBLIC_PROFILE_BASE_URL}/${profile.id}`;

    try {
      await Share.share({
        message: `Check out ${profile.name}'s profile on SOUMA:\n${link}`,
        url: link,
      });
    } catch (error) {
      console.log("SHARE ERROR:", error.message);
    }
  };

  const handleChat = async () => {
    if (!profile?.id || chatLoading) return;

    try {
      setChatLoading(true);

      // Create or retrieve existing buyer/seller conversation.
      const response = await api.post("/conversations", {
        seller_id: profile.id,
      });

      const conversation = response.data?.conversation || response.data;

      if (!conversation?.id) {
        throw new Error("Conversation ID not found");
      }

      navigation.navigate("Chat", {
        conversationId: conversation.id,
        conversation,
        otherUser: profile,
      });
    } catch (error) {
      console.log("START CHAT ERROR:", error.response?.data || error.message);

      Alert.alert(
        "Error",
        error.response?.data?.message || "Could not start conversation."
      );
    } finally {
      setChatLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: PAGE_BG }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  /* ── Not found ── */
  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: PAGE_BG }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <View style={styles.emptyIcon}>
          <UserRound size={38} color={PRIMARY_DARK} strokeWidth={2.2} />
        </View>
        <Text style={styles.errorTitle}>Profile not found</Text>
        <Text style={styles.errorSub}>
          This profile may have been removed, or the connection failed.
        </Text>

        <TouchableOpacity activeOpacity={0.85} onPress={fetchProfile}>
          <LinearGradient
            colors={CTA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.retryButton}
          >
            <RefreshCw size={16} color={WHITE} strokeWidth={2.6} />
            <Text style={styles.buttonText}>Try again</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={styles.backTextBtn}
        >
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avatarUri = profile.avatar_url || profile.avatar || profile.photo || null;
  const initial = profile.name?.trim()?.charAt(0)?.toUpperCase() || "U";
  const memberSince = formatMemberSince(profile.created_at);
  const hasContact = !!(profile.email || profile.phone);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── Hero ── */}
        <View style={styles.header}>
          <ImageBackground
            source={headerBg}
            resizeMode="cover"
            style={[styles.heroPanel, { paddingTop: insets.top + 14 }]}
            imageStyle={styles.heroImageRadius}
          >
            <LinearGradient
              pointerEvents="none"
              colors={[
                "rgba(10,46,158,0.78)",
                "rgba(29,78,216,0.62)",
                "rgba(56,163,255,0.36)",
              ]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroWash}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(6,24,84,0.55)", "rgba(6,24,84,0.15)", "rgba(6,24,84,0)"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroWash}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(6,24,84,0)", "rgba(6,24,84,0.4)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroBottomFade}
            />

            {/* Top bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => navigation.goBack()}
                style={styles.roundBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ArrowLeft
                  size={20}
                  color={ON_HERO}
                  strokeWidth={2.5}
                  style={styles.rtlFlip}
                />
              </TouchableOpacity>

              <Text style={styles.topTitle}>Public profile</Text>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleShare}
                style={styles.roundBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Share profile"
              >
                <Share2 size={18} color={ON_HERO} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* Identity */}
            <View style={styles.identity}>
              <View style={styles.avatarRing}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[PRIMARY_DEEP, PRIMARY]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarImg}
                  >
                    <Text style={styles.avatarText}>{initial}</Text>
                  </LinearGradient>
                )}
                <View style={styles.onlineDot} />
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile.name || "SOUMA User"}
                </Text>
                {profile.is_verified ? (
                  <BadgeCheck size={22} color={SKY_SOFT} strokeWidth={2.4} />
                ) : null}
              </View>

              <View style={styles.metaChips}>
                <View style={styles.chip}>
                  <View style={styles.chipDot} />
                  <Text style={styles.chipText}>SOUMA member</Text>
                </View>

                {profile.city ? (
                  <View style={styles.chip}>
                    <MapPin size={13} color={ON_HERO} strokeWidth={2.6} />
                    <Text style={styles.chipText} numberOfLines={1}>
                      {profile.city}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </ImageBackground>

          {/* Floating action card */}
          <View style={styles.actionFloat}>
            <View style={styles.actionCard}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={chatLoading}
                onPress={handleChat}
                style={styles.chatWrap}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <LinearGradient
                  colors={CTA_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.chatButton}
                >
                  {chatLoading ? (
                    <ActivityIndicator color={WHITE} />
                  ) : (
                    <>
                      <MessageCircle size={20} color={WHITE} strokeWidth={2.4} />
                      <Text style={styles.buttonText}>Send message</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {profile.phone ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleCall}
                  style={styles.callButton}
                  accessibilityRole="button"
                  accessibilityLabel="Call seller"
                >
                  <Phone size={20} color={PRIMARY_DARK} strokeWidth={2.4} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          {memberSince ? (
            <View style={styles.summaryCard}>
              <View style={styles.infoIcon}>
                <CalendarDays size={19} color={PRIMARY_DARK} strokeWidth={2.4} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Member since</Text>
                <Text style={styles.infoValue}>{memberSince}</Text>
              </View>
            </View>
          ) : null}

          {/* Contact information */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Contact information</Text>
          </View>

          <View style={styles.infoCard}>
            {profile.email ? (
              <ContactRow
                icon={Mail}
                label="Email address"
                value={profile.email}
                onPress={handleEmail}
                last={!profile.phone}
              />
            ) : null}

            {profile.phone ? (
              <ContactRow
                icon={Phone}
                label="Phone number"
                value={profile.phone}
                onPress={handleCall}
                last
              />
            ) : null}

            {!hasContact ? (
              <Text style={styles.emptyInfo}>
                This member has no public contact information. Send a message
                to get in touch.
              </Text>
            ) : null}
          </View>

          {/* Share */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleShare}
            style={styles.shareCard}
            accessibilityRole="button"
          >
            <View style={styles.infoIcon}>
              <Share2 size={18} color={PRIMARY_DARK} strokeWidth={2.4} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.shareTitle}>Share this profile</Text>
              <Text style={styles.shareSub}>
                Send a link to friends or buyers
              </Text>
            </View>
            <ChevronRight
              size={18}
              color={STRIKE}
              strokeWidth={2.4}
              style={styles.rtlFlip}
            />
          </TouchableOpacity>

          <Text style={styles.footer}>SOUMA: buy and sell with confidence</Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ==================================================================
   Styles
   ================================================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  rtlFlip: { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  loadingText: { fontSize: 14, fontWeight: "600", color: MUTED, marginTop: 6 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_TINT,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: INK,
  },
  errorSub: {
    fontSize: 13.5,
    fontWeight: "500",
    lineHeight: 20,
    textAlign: "center",
    color: MUTED,
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
  },
  backTextBtn: { padding: 10 },
  backText: { fontSize: 14, fontWeight: "800", color: PRIMARY_DARK },

  /* Hero */
  header: { zIndex: 10, overflow: "visible" },
  heroPanel: {
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 66,
    backgroundColor: PRIMARY_DEEP,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
    overflow: "hidden",
  },
  heroImageRadius: {
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
  },
  heroBottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: ON_HERO,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },

  identity: { alignItems: "center", marginTop: 22 },
  avatarRing: {
    width: AVATAR + 8,
    height: AVATAR + 8,
    borderRadius: (AVATAR + 8) / 2,
    padding: 4,
    backgroundColor: WHITE,
    shadowColor: PRIMARY_DEEP,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  avatarImg: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: WHITE, fontSize: 42, fontWeight: "900" },
  onlineDot: {
    position: "absolute",
    end: 6,
    bottom: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ONLINE,
    borderWidth: 3,
    borderColor: WHITE,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    maxWidth: "100%",
  },
  name: {
    flexShrink: 1,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: ON_HERO,
  },
  metaChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ONLINE },
  chipText: { fontSize: 12.5, fontWeight: "700", color: ON_HERO_SOFT },

  /* Floating action card */
  actionFloat: { marginTop: -34, paddingHorizontal: PAGE_PADDING },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 30,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  chatWrap: { flex: 1 },
  chatButton: {
    height: 54,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: { color: WHITE, fontSize: 15, fontWeight: "800" },
  callButton: {
    width: 54,
    height: 54,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_SOFT,
    borderWidth: 1,
    borderColor: BLUE_TINT,
  },

  /* Body */
  body: { paddingHorizontal: PAGE_PADDING, paddingTop: 26 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: INK,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  infoCard: {
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 14,
  },
  infoRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_TINT,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11.5, fontWeight: "600", color: MUTED },
  infoValue: { fontSize: 14.5, fontWeight: "700", color: INK, marginTop: 3 },
  emptyInfo: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    color: MUTED,
    paddingVertical: 16,
  },

  shareCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  shareTitle: { fontSize: 14.5, fontWeight: "800", color: INK },
  shareSub: { fontSize: 12, fontWeight: "500", color: MUTED, marginTop: 2 },

  footer: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 12,
    fontWeight: "600",
    color: STRIKE,
  },
});