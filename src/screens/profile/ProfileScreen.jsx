import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  I18nManager,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

import {
  BadgeCheck,
  Check,
  ChevronRight,
  Eye,
  Globe,
  Heart,
  LogOut,
  Mail,
  MapPin,
  MessageCircleCheck,
  Package,
  Phone,
  Plus,
  QrCode,
  Settings2,
  Share2,
  User as UserIcon,
  X,
} from "lucide-react-native";
import api from "../../api/client";
import { media_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import i18n from "../../i18n";
import QRCode from "react-native-qrcode-svg";

import headerBg from "../../../assets/images/headerbg.jpg";

// Replace with your actual public domain / deep link.
const PUBLIC_PROFILE_URL = "http://192.168.8.28:8000";

/* ──────────────────────────────────────────────────────────────
   Palette: same blue gradient system as HomeScreen
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
const BORDER = "rgba(11, 27, 58, 0.08)";

const ONLINE = "#22C55E";
const RED = "#DC2626";

const HERO_GRADIENT = [PRIMARY_DEEP, PRIMARY_DARK, SKY];
const CTA_GRADIENT = [PRIMARY_DARK, SKY];
const GLASS = "rgba(255,255,255,0.16)";
const GLASS_BORDER = "rgba(255,255,255,0.28)";
const ON_HERO = "#FFFFFF";
const ON_HERO_SOFT = "rgba(255,255,255,0.82)";

/* ── Layout constants ── */
const PAGE_PADDING = 18;
const SHEET_RADIUS = 34;
const AVATAR = 96; // inner photo
const AVATAR_RING = 5;
const AVATAR_OUTER = AVATAR + AVATAR_RING * 2;
const AVATAR_ZONE = AVATAR_OUTER + 10;
const TOP_BAR_CONTENT = 42;

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const buildMediaUrl = (mediaItem) => {
  if (!mediaItem) return null;

  if (mediaItem.path) {
    const base = media_URL?.endsWith("/")
      ? media_URL.slice(0, -1)
      : media_URL || "";
    const cleanPath = mediaItem.path.startsWith("/")
      ? mediaItem.path.slice(1)
      : mediaItem.path;
    return `${base}/storage/${cleanPath}`;
  }

  if (mediaItem.url) {
    return mediaItem.url
      .replace("localhost", "192.168.8.2")
      .replace("127.0.0.1", "192.168.8.2");
  }

  return null;
};

const getFirstImage = (product) => {
  if (!product?.media || product.media.length === 0) return null;
  const firstImage =
    product.media.find((m) => m.type === "image") || product.media[0];
  return buildMediaUrl(firstImage);
};

const LANGUAGES = [
  { code: "en", key: "profile.english", label: "English" },
  { code: "fr", key: "profile.french", label: "Français" },
  { code: "ar", key: "profile.arabic", label: "العربية" },
];

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */
function GradientButton({
  onPress,
  disabled,
  loading,
  icon: Icon,
  label,
  style,
  height = 54,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={CTA_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradBtn, { height }]}
      >
        {loading ? (
          <ActivityIndicator color={WHITE} />
        ) : (
          <>
            {Icon ? <Icon size={18} color={WHITE} strokeWidth={2.5} /> : null}
            <Text style={styles.gradBtnText}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SheetHeader({ title, subtitle, onClose, theme }) {
  return (
    <>
      <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
      <View style={styles.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sheetTitle, { color: theme.titleText }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.sheetSubtitle, { color: theme.mutedText }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: theme.blueSoft, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <X size={18} color={theme.primary} strokeWidth={2.6} />
        </Pressable>
      </View>
    </>
  );
}

function Field({ label, icon: Icon, theme, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.bodyText }]}>
        {label}
      </Text>
      <View
        style={[
          styles.fieldBox,
          {
            backgroundColor: theme.fieldBg,
            borderColor: focused ? theme.primary : theme.fieldBorder,
          },
        ]}
      >
        <Icon size={17} color={focused ? theme.primary : theme.mutedText} />
        <TextInput
          {...inputProps}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.fieldInput, { color: theme.titleText }]}
          placeholderTextColor={theme.mutedText}
          selectionColor={theme.primary}
        />
      </View>
    </View>
  );
}

function SettingRow({ icon: Icon, title, subtitle, value, onPress, theme, last }) {
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      style={[
        styles.settingRow,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.lightLine,
        },
      ]}
    >
      <View style={styles.settingIcon}>
        <Icon size={19} color={theme.blueText} strokeWidth={2.4} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: theme.titleText }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.settingSubtitle, { color: theme.mutedText }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <View style={[styles.valueChip, { backgroundColor: theme.blueSoft }]}>
          <Text style={[styles.valueChipText, { color: theme.blueText }]}>
            {value}
          </Text>
        </View>
      ) : null}
      <ChevronRight
        size={18}
        color={theme.mutedText}
        strokeWidth={2.4}
        style={styles.rtlFlip}
      />
    </TouchableOpacity>
  );
}

function SectionTitle({ title, subtitle, count, theme }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.titleText }]}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text
            style={[styles.sectionSubtitle, { color: theme.mutedText }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {count !== undefined ? (
        <View style={[styles.countPill, { backgroundColor: theme.blueSoft }]}>
          <Text style={[styles.countText, { color: theme.blueText }]}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* Image-first tile used for both "my products" and "liked" rows */
function ProductTile({
  image,
  name,
  price,
  topStart,
  topEnd,
  onPress,
  theme,
  size,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.tile,
        { width: size.w, height: size.h, backgroundColor: theme.blueTint },
      ]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.fill} resizeMode="cover" />
      ) : (
        <View style={[styles.fill, styles.center]}>
          <Package size={30} color={theme.blueText} />
        </View>
      )}

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,46,158,0)", "rgba(10,46,158,0.55)", "rgba(6,24,84,0.92)"]}
        locations={[0.4, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      {topStart ? <View style={styles.tileTopStart}>{topStart}</View> : null}
      {topEnd ? <View style={styles.tileTopEnd}>{topEnd}</View> : null}

      <View style={styles.tileOverlay} pointerEvents="none">
        <Text style={styles.tileName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.tilePrice} numberOfLines={1}>
          {price}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* Entrance animation: fade + slide up */
function FadeInUp({ delay = 0, distance = 18, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 520,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* Pulsing placeholder tiles shown while products load */
function SkeletonRow({ size, theme }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.skeletonRow}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.tile,
            {
              width: size.w,
              height: size.h,
              backgroundColor: theme.blueTint,
              opacity: pulse,
            },
          ]}
        >
          <View style={styles.skelBars}>
            <View
              style={[styles.skelBar, { width: "70%", backgroundColor: theme.border }]}
            />
            <View
              style={[styles.skelBar, { width: "40%", backgroundColor: theme.border }]}
            />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/* Four corner brackets that frame the QR code like a scanner viewfinder */
function QrCorners({ color, size = 26, thickness = 4, radius = 10 }) {
  const base = { position: "absolute", width: size, height: size, borderColor: color };
  return (
    <>
      <View
        style={[
          base,
          { top: 0, left: 0, borderTopWidth: thickness, borderLeftWidth: thickness, borderTopLeftRadius: radius },
        ]}
      />
      <View
        style={[
          base,
          { top: 0, right: 0, borderTopWidth: thickness, borderRightWidth: thickness, borderTopRightRadius: radius },
        ]}
      />
      <View
        style={[
          base,
          { bottom: 0, left: 0, borderBottomWidth: thickness, borderLeftWidth: thickness, borderBottomLeftRadius: radius },
        ]}
      />
      <View
        style={[
          base,
          { bottom: 0, right: 0, borderBottomWidth: thickness, borderRightWidth: thickness, borderBottomRightRadius: radius },
        ]}
      />
    </>
  );
}

/* Avatar used in header + QR card: photo if available, gradient initial otherwise */
function AvatarCircle({ uri, initial, size, fontSize }) {
  const common = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={common} resizeMode="cover" />;
  }
  return (
    <LinearGradient
      colors={[PRIMARY_DEEP, PRIMARY]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[common, styles.center]}
    >
      <Text style={[styles.avatarText, { fontSize }]}>{initial}</Text>
    </LinearGradient>
  );
}

/* Modal card that shows the user's public-profile QR code */
function QrModal({ visible, onClose, theme, user, avatarUri, url, initial, width, t }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const qrSize = clamp(Math.round(width * 0.56), 170, 230);

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scale]);

  const handleShare = async () => {
    if (!url) return;
    try {
      await Share.share({ message: url, url });
    } catch (error) {
      console.log("SHARE PROFILE ERROR:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.qrOverlay, { backgroundColor: theme.modalOverlay }]}
        onPress={onClose}
      >
        {/* Inner Pressable swallows taps so touching the card doesn't close it */}
        <Pressable onPress={() => {}} style={styles.qrCardWrap}>
          <Animated.View
            style={[
              styles.qrCard,
              {
                backgroundColor: theme.surface,
                shadowColor: theme.shadow,
                transform: [{ scale }],
              },
            ]}
          >
            {/* Gradient banner */}
            <LinearGradient
              colors={HERO_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.qrBanner}
            >
              <View
                style={[
                  styles.shape,
                  {
                    width: 180,
                    height: 180,
                    borderRadius: 90,
                    top: -70,
                    end: -50,
                    backgroundColor: "rgba(255,255,255,0.12)",
                  },
                ]}
              />
              <View
                style={[
                  styles.shape,
                  {
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    top: 30,
                    start: -30,
                    borderWidth: 8,
                    borderColor: "rgba(255,255,255,0.20)",
                  },
                ]}
              />

              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [styles.qrClose, { opacity: pressed ? 0.7 : 1 }]}
                accessibilityLabel={t("common.close", { defaultValue: "Close" })}
              >
                <X size={18} color={WHITE} />
              </Pressable>

              <Text style={styles.qrBannerTitle}>
                {t("profile.myQrCode", { defaultValue: "My QR code" })}
              </Text>
            </LinearGradient>

            {/* Avatar overlapping the banner */}
            <View style={styles.qrAvatarWrap}>
              <View style={[styles.qrAvatarRing, { backgroundColor: theme.surface }]}>
                <AvatarCircle uri={avatarUri} initial={initial} size={70} fontSize={28} />
              </View>
            </View>

            <Text style={[styles.qrName, { color: theme.titleText }]} numberOfLines={1}>
              {user?.name || "User"}
            </Text>
            {user?.city ? (
              <View style={[styles.cityChip, { backgroundColor: theme.blueChip }]}>
                <MapPin size={12} color={theme.blueText} strokeWidth={2.6} />
                <Text style={[styles.cityChipText, { color: theme.blueText }]}>
                  {user.city}
                </Text>
              </View>
            ) : null}

            {/* QR frame (always white so it scans in dark mode too) */}
            <View style={styles.qrFrameOuter}>
              <QrCorners color={theme.primary} />
              <View style={styles.qrFrameInner}>
                {url ? (
                  <QRCode
                    value={url}
                    size={qrSize}
                    ecl="H"
                    quietZone={6}
                    color={INK}
                    backgroundColor={WHITE}
                  />
                ) : (
                  <View
                    style={{
                      width: qrSize,
                      height: qrSize,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ActivityIndicator color={theme.primary} />
                  </View>
                )}
              </View>
            </View>

            <Text style={[styles.qrHint, { color: theme.mutedText }]}>
              {t("profile.qrHint", {
                defaultValue: "Scan this code to open your public profile",
              })}
            </Text>

            <View style={styles.qrActions}>
              <GradientButton
                onPress={handleShare}
                disabled={!url}
                icon={Share2}
                label={t("profile.shareProfile", { defaultValue: "Share profile" })}
                height={52}
              />
              <TouchableOpacity
                style={styles.qrSecondaryBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: theme.bodyText }]}>
                  {t("common.close", { defaultValue: "Close" })}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */
export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user, token, updateUser, logout } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const publicProfileUrl = user?.id ? `${PUBLIC_PROFILE_URL}/u/${user.id}` : "";

  /* ---- Geometry ---- */
  const SPACER = insets.top + 220; // area where the hero shows through
  const HEADER_H = SPACER + 340; // extra height covers pull-to-refresh overscroll
  const TOP_BAR_H = insets.top + 8 + TOP_BAR_CONTENT + 10;
  const tile = {
    w: clamp(Math.round(width * 0.4), 140, 190),
    h: clamp(Math.round(width * 0.4), 140, 190) * 1.3,
  };

  /* ---- Scroll-driven animation ---- */
  const scrollY = useRef(new Animated.Value(0)).current;

  const avatarScale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(avatarScale, {
      toValue: 1,
      friction: 5,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [avatarScale]);

  // Header moves at half speed so the sheet slides over it
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, SPACER],
    outputRange: [0, -SPACER * 0.5],
    extrapolateLeft: "clamp",
  });

  const welcomeOpacity = scrollY.interpolate({
    inputRange: [0, SPACER * 0.45],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const welcomeShift = scrollY.interpolate({
    inputRange: [0, SPACER * 0.45],
    outputRange: [0, -14],
    extrapolate: "clamp",
  });

  // Solid top bar fades in just before the sheet reaches it
  const barOpacity = scrollY.interpolate({
    inputRange: [SPACER - 110, SPACER - 30],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  /* ---- Theme bundle (light matches HomeScreen, dark keeps app colors) ---- */
  const theme = useMemo(
    () => ({
      pageBg: isDark ? colors.background : WHITE,
      surface: isDark ? colors.surface : WHITE,
      border: isDark ? colors.border : BORDER,

      primary: isDark ? "#3B82F6" : PRIMARY,
      blueText: isDark ? "#93C5FD" : PRIMARY_DARK,
      blueSoft: isDark ? "rgba(59,130,246,0.16)" : BLUE_SOFT,
      blueTint: isDark ? "rgba(59,130,246,0.22)" : BLUE_TINT,
      blueChip: isDark ? "rgba(59,130,246,0.20)" : BLUE_TINT,

      titleText: isDark ? colors.text : INK,
      bodyText: isDark ? colors.textSecondary : INK_SOFT,
      mutedText: isDark ? colors.inactive : MUTED,

      cardBorder: isDark ? "rgba(255,255,255,0.07)" : BORDER,
      shadow: isDark ? "#000000" : PRIMARY_DARK,
      lightLine: isDark ? "rgba(255,255,255,0.08)" : "rgba(11,27,58,0.07)",

      barBg: isDark ? "#06164F" : PRIMARY_DEEP,

      fieldBg: isDark ? colors.surfaceSecondary : PAGE_BG,
      fieldBorder: isDark ? colors.border : BLUE_TINT,

      modalOverlay: isDark ? "rgba(0,0,0,0.75)" : "rgba(6,24,84,0.55)",
    }),
    [colors, isDark]
  );

  /* ---- State ---- */
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [likedProducts, setLikedProducts] = useState([]);
  const [likedLoading, setLikedLoading] = useState(false);

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");

  const [qrModalVisible, setQrModalVisible] = useState(false);

  /* Sync form with auth user */
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCity(user.city || "");
    }
  }, [user]);

  useEffect(() => {
    const handler = (lng) => setCurrentLanguage(lng);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  /* ---- Data ---- */
  const fetchMyProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const response = await api.get("/my-products");
      const list = response.data?.products || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.log("MY PRODUCTS ERROR:", error.response?.data || error.message);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchLikedProducts = useCallback(async () => {
    try {
      setLikedLoading(true);
      const response = await api.get("/my-liked-products");
      const list = response.data?.products || [];
      setLikedProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.log("LIKED PRODUCTS ERROR:", error.response?.data || error.message);
    } finally {
      setLikedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMyProducts();
      fetchLikedProducts();
    }
  }, [token, fetchMyProducts, fetchLikedProducts]);

  const onRefresh = useCallback(() => {
    fetchMyProducts();
    fetchLikedProducts();
  }, [fetchMyProducts, fetchLikedProducts]);

  const openEditProfile = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setCity(user?.city || "");
    setModalVisible(true);
  };

  const changeLanguage = useCallback(async (code) => {
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem("language", code);
      setCurrentLanguage(code);
      setLanguageModalVisible(false);
    } catch (error) {
      console.log("CHANGE LANGUAGE ERROR:", error);
    }
  }, []);

  const updateProfile = async () => {
    try {
      setUpdateLoading(true);
      const response = await api.put("/UpdateProfile", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
      });
      updateUser(response.data.user);
      setModalVisible(false);
      Alert.alert(t("common.success"), t("profile.profileUpdated"));
    } catch (error) {
      console.log("UPDATE PROFILE ERROR:", error.response?.data || error.message);
      const errors = error.response?.data?.errors;
      if (errors) {
        Alert.alert(t("common.error"), Object.values(errors).flat().join("\n"));
      } else {
        Alert.alert(
          t("common.error"),
          error.response?.data?.message || t("profile.failedToUpdate")
        );
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("profile.logout"), style: "destructive", onPress: logout },
    ]);
  };

  /* ---- Status helpers ---- */
  const getTileStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "sold":
        return { bg: "rgba(11,27,58,0.85)", text: WHITE };
      case "active":
      case "available":
        return { bg: ONLINE, text: WHITE };
      default:
        return { bg: "rgba(255,255,255,0.92)", text: INK };
    }
  };

  const getStatusLabel = (status) => {
    const key = String(status || "").toLowerCase();
    if (key === "sold") return t("products.status.sold");
    if (key === "reserved") return t("products.status.reserved");
    if (key === "active" || key === "available")
      return t("products.status.available");
    return status || "";
  };

  /* ---- Derived ---- */
  const soldCount = products.filter((p) => p.status === "sold").length;
  const activeCount = products.filter(
    (p) => p.status === "active" || p.status === "available"
  ).length;

  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.label ||
    currentLanguage.toUpperCase();

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";
  const avatarUri = user?.avatar_url || user?.avatar || user?.photo || null;

  const statItems = [
    { key: "products", value: products.length, label: t("profile.products") },
    { key: "active", value: activeCount, label: t("profile.active") },
    { key: "sold", value: soldCount, label: t("profile.sold") },
  ];

  /* ---------------------------------------------------------------- */
  /* Renderers                                                         */
  /* ---------------------------------------------------------------- */
  const cardStyle = {
    backgroundColor: theme.blueSoft,
    borderColor: "transparent",
    shadowColor: "transparent",
  };

  const renderMyProduct = ({ item }) => {
    const status = getTileStatus(item.status);
    return (
      <ProductTile
        theme={theme}
        size={tile}
        image={getFirstImage(item)}
        name={item.name}
        price={`${item.price} ${t("common.currency")}`}
        onPress={() => navigation.navigate("MyProductDetails", { product: item })}
        topStart={
          <View style={[styles.chip, { backgroundColor: status.bg }]}>
            <Text style={[styles.chipText, { color: status.text }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        }
        topEnd={
          <View style={[styles.chip, styles.chipGlass]}>
            <Eye size={11} color={WHITE} />
            <Text style={[styles.chipText, { color: WHITE }]}>
              {item.views_count ?? 0}
            </Text>
          </View>
        }
      />
    );
  };

  const renderLikedProduct = ({ item }) => (
    <ProductTile
      theme={theme}
      size={tile}
      image={getFirstImage(item)}
      name={item.name}
      price={`${item.price} ${t("common.currency")}`}
      onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
      topEnd={
        <View style={[styles.chip, styles.chipGlass]}>
          <Heart size={11} color={WHITE} fill={RED} />
          <Text style={[styles.chipText, { color: WHITE }]}>
            {item.likes_count ?? 0}
          </Text>
        </View>
      }
    />
  );

  const renderEmpty = ({ icon: Icon, iconColor, title, text, action }) => (
    <View style={[styles.empty, styles.emptyCard, cardStyle]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.blueSoft }]}>
        <Icon size={24} color={iconColor || theme.blueText} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.titleText }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: theme.mutedText }]}>{text}</Text>
      {action}
    </View>
  );

  const renderLoading = () => <SkeletonRow size={tile} theme={theme} />;

  const renderTileRow = (data, renderItem, keyPrefix) => (
    <FlatList
      data={data}
      horizontal
      keyExtractor={(item) => `${keyPrefix}-${item.id}`}
      renderItem={(info) => (
        <FadeInUp delay={Math.min(info.index, 6) * 70} distance={14}>
          {renderItem(info)}
        </FadeInUp>
      )}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tileRow}
      ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      decelerationRate="fast"
    />
  );

  const renderProductsContent = () => {
    if (productsLoading && products.length === 0) return renderLoading();

    if (products.length === 0) {
      return (
        <View style={styles.padded}>
          {renderEmpty({
            icon: Package,
            title: t("profile.noProductsYet"),
            text: t("profile.noProductsSub"),
            action: (
              <GradientButton
                icon={Plus}
                label={t("profile.addProduct")}
                height={46}
                style={styles.emptyCta}
              />
            ),
          })}
        </View>
      );
    }

    return renderTileRow(products, renderMyProduct, "mine");
  };

  const renderLikedContent = () => {
    if (likedLoading && likedProducts.length === 0) return renderLoading();

    if (likedProducts.length === 0) {
      return (
        <View style={styles.padded}>
          {renderEmpty({
            icon: Heart,
            iconColor: RED,
            title: t("profile.noLikedYet"),
            text: t("profile.tapHeartToSave"),
          })}
        </View>
      );
    }

    return renderTileRow(likedProducts, renderLikedProduct, "liked");
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <View style={[styles.container, { backgroundColor: theme.pageBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Fixed hero header (parallax) ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.header,
          {
            height: HEADER_H,
            backgroundColor: PRIMARY_DEEP,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
      >
        <ImageBackground
          source={headerBg}
          resizeMode="cover"
          style={{ height: SPACER + 90 }}
        >
          <LinearGradient
            colors={[
              "rgba(10,46,158,0.78)",
              "rgba(29,78,216,0.62)",
              "rgba(56,163,255,0.36)",
            ]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(6,24,84,0.55)", "rgba(6,24,84,0.15)", "rgba(6,24,84,0)"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        {/* welcome text */}
        <Animated.View
          style={[
            styles.welcome,
            {
              top: insets.top + 84,
              opacity: welcomeOpacity,
              transform: [{ translateY: welcomeShift }],
            },
          ]}
        >
          <Text style={styles.welcomeTitle} numberOfLines={1}>
            {t("profile.myAccount")}
          </Text>
          <Text style={styles.welcomeSub} numberOfLines={2}>
            {t("profile.manageProfile")}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* ── Scroll content: transparent spacer + rounded sheet ── */}
      <Animated.ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={productsLoading || likedLoading}
            onRefresh={onRefresh}
            tintColor={WHITE}
            colors={[PRIMARY]}
            progressBackgroundColor={WHITE}
            progressViewOffset={TOP_BAR_H}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Lets the hero show through */}
        <View style={{ height: SPACER }} pointerEvents="none" />

        {/* Rounded sheet top + avatar */}
        <View style={{ height: AVATAR_ZONE }}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: AVATAR_OUTER / 2,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.pageBg,
              borderTopLeftRadius: SHEET_RADIUS,
              borderTopRightRadius: SHEET_RADIUS,
            }}
          />

          <View style={styles.avatarWrap}>
            <Animated.View
              style={[
                styles.avatarRing,
                {
                  backgroundColor: theme.surface,
                  shadowColor: theme.shadow,
                  transform: [{ scale: avatarScale }],
                },
              ]}
            >
              <AvatarCircle uri={avatarUri} initial={initial} size={AVATAR} fontSize={38} />
              <View style={[styles.onlineDot, { borderColor: theme.surface }]} />
            </Animated.View>
          </View>
        </View>

        {/* Sheet body */}
        <View
          style={[
            styles.sheetBody,
            { backgroundColor: theme.pageBg, minHeight: height - TOP_BAR_H },
          ]}
        >
          {/* Identity */}
          <FadeInUp delay={120} style={styles.identity}>
            <Text
              style={[styles.cardName, { color: theme.titleText }]}
              numberOfLines={1}
            >
              {user?.name || "User"}
            </Text>
            <View style={styles.emailRow}>
              <BadgeCheck size={14} color={theme.primary} strokeWidth={2.5} />
              <Text
                style={[styles.cardEmail, { color: theme.mutedText }]}
                numberOfLines={1}
              >
                {user?.email || ""}
              </Text>
            </View>
            {user?.city ? (
              <View style={[styles.cityChip, { backgroundColor: theme.blueChip }]}>
                <MapPin size={12} color={theme.blueText} strokeWidth={2.6} />
                <Text style={[styles.cityChipText, { color: theme.blueText }]}>
                  {user.city}
                </Text>
              </View>
            ) : null}

            {/* Quick actions */}
            <View style={styles.quickRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openEditProfile}
                style={styles.quickPrimaryWrap}
              >
                <LinearGradient
                  colors={CTA_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickPrimary}
                >
                  <Settings2 size={17} color={WHITE} strokeWidth={2.5} />
                  <Text style={styles.quickPrimaryText}>
                    {t("profile.personalInfo")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setQrModalVisible(true)}
                style={[
                  styles.quickSquare,
                  { backgroundColor: theme.surface, borderColor: theme.cardBorder },
                ]}
                accessibilityLabel={t("profile.myQrCode", { defaultValue: "My QR code" })}
              >
                <QrCode size={20} color={theme.primary} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </FadeInUp>

          {/* Stats card */}
          <FadeInUp delay={220} style={styles.padded}>
            <View style={[styles.statsCard, { borderColor: theme.lightLine }]}>
              {statItems.map((item, i) => (
                <React.Fragment key={item.key}>
                  {i > 0 && (
                    <View
                      style={[styles.statDivider, { backgroundColor: theme.lightLine }]}
                    />
                  )}
                  <View style={styles.stat}>
                    <Text style={[styles.statNumber, { color: theme.blueText }]}>
                      {item.value}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.mutedText }]}>
                      {item.label}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </FadeInUp>

          {/* Account */}
          <FadeInUp delay={320} style={[styles.section, styles.padded]}>
            <SectionTitle title={t("profile.account")} theme={theme} />

            <View>
              <SettingRow
                icon={Settings2}
                title={t("profile.personalInfo")}
                subtitle={t("profile.personalInfoSub")}
                onPress={openEditProfile}
                theme={theme}
              />
              <SettingRow
                icon={Globe}
                title={t("profile.language")}
                subtitle={t("profile.languageSub")}
                value={currentLanguageLabel}
                onPress={() => setLanguageModalVisible(true)}
                theme={theme}
              />
              <SettingRow
                icon={MessageCircleCheck}
                title={t("profile.messages", { defaultValue: "Messages" })}
                subtitle={t("profile.messagesSub", {
                  defaultValue: "Chat with buyers and sellers",
                })}
                onPress={() => navigation.navigate("ChatList")}
                theme={theme}
              />
              <SettingRow
                icon={UserIcon}
                title={t("profile.publicProfile", { defaultValue: "Public profile" })}
                subtitle={t("profile.publicProfileSub", {
                  defaultValue: "View and share your public profile",
                })}
                onPress={() => {
                  if (!user?.id) return;
                  navigation.navigate("PublicProfile", { userId: user.id });
                }}
                theme={theme}
              />
              <SettingRow
                icon={QrCode}
                title={t("profile.myQrCode", { defaultValue: "My QR code" })}
                subtitle={t("profile.myQrCodeSub", {
                  defaultValue: "Let others scan to find your profile",
                })}
                onPress={() => setQrModalVisible(true)}
                theme={theme}
                last
              />
            </View>
          </FadeInUp>

          {/* My products */}
          <FadeInUp delay={420} style={styles.section}>
            <View style={styles.padded}>
              <SectionTitle
                title={t("profile.myProducts")}
                subtitle={t("profile.sellingSub")}
                count={products.length}
                theme={theme}
              />
            </View>
            {renderProductsContent()}
          </FadeInUp>

          {/* Liked */}
          <FadeInUp delay={520} style={styles.section}>
            <View style={styles.padded}>
              <SectionTitle
                title={t("profile.likedProducts")}
                subtitle={t("profile.likedSub")}
                count={likedProducts.length}
                theme={theme}
              />
            </View>
            {renderLikedContent()}
          </FadeInUp>

          <Text style={[styles.versionText, { color: theme.mutedText }]}>
            {t("profile.appVersion")}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* ── Top bar (always above the sheet) ── */}
      <View
        pointerEvents="box-none"
        style={[styles.topBar, { height: TOP_BAR_H, paddingTop: insets.top + 8 }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.topBarBg,
            { opacity: barOpacity },
          ]}
        >
          <LinearGradient
            colors={HERO_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <TouchableOpacity
          style={styles.barButton}
          activeOpacity={0.8}
          onPress={() => setLanguageModalVisible(true)}
          hitSlop={8}
        >
          <Globe size={19} color={ON_HERO} strokeWidth={2.4} />
        </TouchableOpacity>

        <Animated.Text
          style={[styles.barTitle, { opacity: barOpacity }]}
          numberOfLines={1}
        >
          {user?.name || t("profile.myAccount")}
        </Animated.Text>

        <TouchableOpacity
          style={styles.barButton}
          activeOpacity={0.8}
          onPress={handleLogout}
          hitSlop={8}
          accessibilityLabel={t("profile.logout")}
        >
          <LogOut size={18} color={ON_HERO} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* QR CODE MODAL */}
      <QrModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        theme={theme}
        user={user}
        avatarUri={avatarUri}
        url={publicProfileUrl}
        initial={initial}
        width={width}
        t={t}
      />

      {/* EDIT PROFILE SHEET */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <SheetHeader
              title={t("profile.personalInfo")}
              subtitle={t("profile.updateAccountInfo")}
              onClose={() => setModalVisible(false)}
              theme={theme}
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Field
                theme={theme}
                icon={UserIcon}
                label={t("profile.fullName")}
                value={name}
                onChangeText={setName}
                placeholder={t("profile.namePlaceholder")}
                autoCapitalize="words"
              />
              <Field
                theme={theme}
                icon={Mail}
                label={t("profile.email")}
                value={email}
                onChangeText={setEmail}
                placeholder={t("profile.emailPlaceholder")}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                theme={theme}
                icon={Phone}
                label={t("profile.phone")}
                value={phone}
                onChangeText={setPhone}
                placeholder={t("profile.phonePlaceholder")}
                keyboardType="phone-pad"
              />
              <Field
                theme={theme}
                icon={MapPin}
                label={t("profile.city")}
                value={city}
                onChangeText={setCity}
                placeholder={t("profile.cityPlaceholder")}
              />

              <GradientButton
                onPress={updateProfile}
                disabled={updateLoading}
                loading={updateLoading}
                label={t("common.saveChanges")}
                style={styles.saveButton}
              />

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: theme.bodyText }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LANGUAGE SHEET */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <SheetHeader
              title={t("profile.selectLanguage")}
              subtitle={t("profile.languageSub")}
              onClose={() => setLanguageModalVisible(false)}
              theme={theme}
            />

            <View>
              {LANGUAGES.map((lang) => {
                const isActive = currentLanguage === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageRow,
                      {
                        backgroundColor: isActive ? theme.blueSoft : theme.fieldBg,
                        borderColor: isActive ? theme.primary : theme.fieldBorder,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => changeLanguage(lang.code)}
                  >
                    <Text style={[styles.languageRowText, { color: theme.titleText }]}>
                      {lang.label}
                    </Text>
                    {isActive ? (
                      <View
                        style={[styles.languageCheck, { backgroundColor: theme.primary }]}
                      >
                        <Check size={14} color={WHITE} strokeWidth={3} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  fill: { width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  rtlFlip: { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: PAGE_PADDING },
  disabled: { opacity: 0.5 },

  gradBtn: {
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  gradBtnText: { color: WHITE, fontSize: 15.5, fontWeight: "800" },

  /* Fixed header */
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  shape: { position: "absolute" },
  welcome: {
    position: "absolute",
    left: 22,
    right: 22,
  },
  welcomeTitle: {
    color: ON_HERO,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.9,
  },
  welcomeSub: {
    color: ON_HERO_SOFT,
    fontSize: 15,
    fontWeight: "500",
    marginTop: 4,
  },

  /* Top bar */
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 12,
  },
  topBarBg: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
  },
  barButton: {
    width: TOP_BAR_CONTENT,
    height: TOP_BAR_CONTENT,
    borderRadius: TOP_BAR_CONTENT / 2,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  barTitle: {
    flex: 1,
    height: TOP_BAR_CONTENT,
    lineHeight: TOP_BAR_CONTENT,
    textAlign: "center",
    color: ON_HERO,
    fontSize: 17,
    fontWeight: "800",
  },

  /* Avatar */
  avatarWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  avatarRing: {
    width: AVATAR_OUTER,
    height: AVATAR_OUTER,
    borderRadius: AVATAR_OUTER / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  avatarText: { color: WHITE, fontWeight: "900" },
  onlineDot: {
    position: "absolute",
    end: 6,
    bottom: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ONLINE,
    borderWidth: 3,
  },

  /* Sheet body */
  sheetBody: { paddingBottom: 40 },
  identity: { alignItems: "center", paddingHorizontal: PAGE_PADDING },
  cardName: { fontSize: 25, fontWeight: "900", letterSpacing: -0.7 },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    maxWidth: "92%",
  },
  cardEmail: { fontSize: 13.5, fontWeight: "500", flexShrink: 1 },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  cityChipText: { fontSize: 12.5, fontWeight: "700" },

  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    alignSelf: "stretch",
  },
  quickPrimaryWrap: { flex: 1 },
  quickPrimary: {
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickPrimaryText: { color: WHITE, fontSize: 14.5, fontWeight: "800" },
  quickSquare: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Stats */
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 25, fontWeight: "900", letterSpacing: -0.6 },
  statLabel: { fontSize: 12.5, fontWeight: "600", marginTop: 3 },
  statDivider: { width: 1, height: 36 },

  /* Sections */
  section: { marginTop: 28 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionBar: { width: 4, height: 20, borderRadius: 2 },
  sectionTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 13, fontWeight: "500", marginTop: 3 },
  countPill: {
    minWidth: 34,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  countText: { fontSize: 13, fontWeight: "800" },

  /* Settings card */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 10,
  },
  settingIcon: {
    width: 30,
    height: 30,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "700" },
  settingSubtitle: { fontSize: 12.5, fontWeight: "500", marginTop: 2 },
  valueChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  valueChipText: { fontSize: 12, fontWeight: "800" },

  /* Tiles */
  tileRow: { paddingHorizontal: PAGE_PADDING, paddingBottom: 4 },
  tile: { borderRadius: 26, overflow: "hidden" },
  tileTopStart: { position: "absolute", top: 10, start: 10 },
  tileTopEnd: { position: "absolute", top: 10, end: 10 },
  tileOverlay: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: 13,
    paddingBottom: 13,
  },
  tileName: { color: WHITE, fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  tilePrice: {
    color: SKY_SOFT,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipGlass: { backgroundColor: "rgba(11,27,58,0.45)" },
  chipText: { fontSize: 11, fontWeight: "800" },

  versionText: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 12,
    fontWeight: "600",
  },

  /* Skeleton */
  skeletonRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: PAGE_PADDING,
    overflow: "hidden",
  },
  skelBars: {
    position: "absolute",
    start: 12,
    end: 12,
    bottom: 14,
    gap: 8,
  },
  skelBar: { height: 10, borderRadius: 5 },

  /* Empty */
  empty: { alignItems: "center", paddingVertical: 26, paddingHorizontal: 24 },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "500",
  },
  emptyCta: { marginTop: 16, alignSelf: "stretch" },

  /* Modal sheets */
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 40,
    maxHeight: "92%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.4 },
  sheetSubtitle: { marginTop: 3, fontSize: 14, fontWeight: "500" },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* QR modal */
  qrOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  qrCardWrap: { width: "100%", maxWidth: 360 },
  qrCard: {
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 22,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 16,
  },
  qrBanner: {
    width: "100%",
    height: 112,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 18,
  },
  qrBannerTitle: {
    color: WHITE,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  qrClose: {
    position: "absolute",
    top: 14,
    end: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  qrAvatarWrap: { marginTop: -(AVATAR_OUTER / 2 - 14), alignItems: "center" },
  qrAvatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  qrName: {
    marginTop: 10,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.4,
    maxWidth: "86%",
  },
  qrFrameOuter: { marginTop: 18, padding: 12 },
  qrFrameInner: {
    padding: 10,
    borderRadius: 16,
    backgroundColor: WHITE,
  },
  qrHint: {
    marginTop: 12,
    paddingHorizontal: 32,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  qrActions: { width: "100%", paddingHorizontal: 22, marginTop: 18 },
  qrSecondaryBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  /* Fields */
  field: { marginTop: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 54,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  fieldInput: { flex: 1, fontSize: 15, fontWeight: "600", height: "100%" },

  saveButton: { marginTop: 26 },
  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  cancelText: { fontSize: 15, fontWeight: "700" },

  /* Language */
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    marginTop: 10,
  },
  languageRowText: { fontSize: 16, fontWeight: "700" },
  languageCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});