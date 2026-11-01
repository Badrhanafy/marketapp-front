import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
  ScrollView,
  FlatList,
  StatusBar,
  Animated,
  Easing,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { media_URL } from "../../constants/config";
import {
  Settings2,
  Package,
  BadgeCheck,
  LogOut,
  Heart,
  X,
  Eye,
  ChevronRight,
  Globe,
  Check,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Plus,
  MessageCircleCheck,
} from "lucide-react-native";

import i18n from "../../i18n";

// ── Palette (green app theme) ──
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#F0FDF4";
const RED = "#DC2626";

// ── Layout constants ──
const PAGE_PADDING = 18;
const AVATAR = 92; // inner photo
const AVATAR_RING = 8; // light ring around it
const AVATAR_OUTER = AVATAR + AVATAR_RING * 2;
const PEAK = 64; // height of the chevron peak
const ZONE_BELOW = 52; // white area under the peak that holds the lower avatar half
const TOP_BAR_CONTENT = 44;

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
            { backgroundColor: theme.iconBg, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <X size={18} color={theme.titleText} />
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
      <View style={[styles.settingIcon, { backgroundColor: theme.greenSoft }]}>
        <Icon size={18} color={theme.primary} />
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
        <View style={[styles.valueChip, { backgroundColor: theme.iconBg }]}>
          <Text style={[styles.valueChipText, { color: theme.titleText }]}>
            {value}
          </Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={theme.mutedText} />
    </TouchableOpacity>
  );
}

function SectionTitle({ title, subtitle, count, theme }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: theme.titleText }]}>
          {title}
        </Text>
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
        <Text style={[styles.sectionCount, { color: theme.mutedText }]}>
          {count}
        </Text>
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
        { width: size.w, height: size.h, backgroundColor: theme.surfaceAlt },
      ]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.fill} resizeMode="cover" />
      ) : (
        <View style={[styles.fill, styles.center]}>
          <Package size={30} color={theme.mutedText} />
        </View>
      )}

      {topStart ? <View style={styles.tileTopStart}>{topStart}</View> : null}
      {topEnd ? <View style={styles.tileTopEnd}>{topEnd}</View> : null}

      <View style={styles.tileOverlay}>
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
              backgroundColor: theme.surfaceAlt,
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

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */
export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user, token, updateUser, logout } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  /* ---- Geometry ---- */
  const SPACER = insets.top + 250; // transparent area where the green header shows
  const HEADER_H = SPACER + PEAK + 320; // extra height covers pull-to-refresh overscroll
  const TOP_BAR_H = insets.top + 8 + TOP_BAR_CONTENT + 10;
  const tile = {
    w: clamp(Math.round(width * 0.4), 140, 190),
    h: clamp(Math.round(width * 0.4), 140, 190) * 1.3,
  };

  /* ---- Scroll-driven animation ---- */
  const scrollY = useRef(new Animated.Value(0)).current;

  // Avatar springs in on mount
  const avatarScale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(avatarScale, {
      toValue: 1,
      friction: 5,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [avatarScale]);

  // Header moves at half speed → the white sheet slides over it
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, SPACER + PEAK],
    outputRange: [0, -(SPACER + PEAK) * 0.5],
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

  /* ---- Theme bundle ---- */
  const theme = useMemo(
    () => ({
      pageBg: colors.background,
      sheetBg: isDark ? colors.surface : "#FFFFFF",
      surface: colors.surface,
      surfaceAlt: colors.surfaceSecondary,
      border: colors.border,

      primary: isDark ? "#22C55E" : GREEN,
      greenText: isDark ? "#4ADE80" : GREEN_DARK,
      greenSoft: isDark ? "rgba(34,197,94,0.16)" : GREEN_TINT,
      greenChip: isDark ? "rgba(34,197,94,0.18)" : GREEN_SOFT,

      titleText: colors.text,
      bodyText: colors.textSecondary,
      mutedText: colors.inactive,

      cardBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(22,163,74,0.10)",
      shadow: isDark ? "#000000" : GREEN_DARK,
      lightLine: isDark ? "rgba(255,255,255,0.08)" : "#E6F2EA",
      iconBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",

      headerBg: isDark ? "#14532D" : GREEN,
      barBg: isDark ? "#052E16" : GREEN_DARK,

      fieldBg: colors.surfaceSecondary,
      fieldBorder: colors.border,

      modalOverlay: isDark ? "rgba(0,0,0,0.75)" : "rgba(5,46,22,0.55)",
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
        return { bg: "rgba(15,23,42,0.82)", text: "#FFFFFF" };
      case "active":
      case "available":
        return { bg: GREEN, text: "#FFFFFF" };
      default:
        return { bg: "rgba(255,255,255,0.92)", text: "#0F172A" };
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

  const statItems = [
    { key: "products", value: products.length, label: t("profile.products") },
    { key: "active", value: activeCount, label: t("profile.active") },
    { key: "sold", value: soldCount, label: t("profile.sold") },
  ];

  /* ---------------------------------------------------------------- */
  /* Renderers                                                         */
  /* ---------------------------------------------------------------- */
  const cardStyle = {
    backgroundColor: theme.surface,
    borderColor: theme.cardBorder,
    shadowColor: theme.shadow,
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
            <Eye size={11} color="#FFFFFF" />
            <Text style={[styles.chipText, { color: "#FFFFFF" }]}>
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
          <Heart size={11} color="#FFFFFF" fill={RED} />
          <Text style={[styles.chipText, { color: "#FFFFFF" }]}>
            {item.likes_count ?? 0}
          </Text>
        </View>
      }
    />
  );

  const renderEmpty = ({ icon: Icon, iconColor, title, text, action }) => (
    <View style={[styles.empty, styles.emptyCard, cardStyle]}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: theme.iconBg, borderColor: theme.cardBorder },
        ]}
      >
        <Icon size={24} color={iconColor || theme.mutedText} />
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
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: theme.primary }]}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.emptyCtaText}>{t("profile.addProduct")}</Text>
              </TouchableOpacity>
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
    <View style={[styles.container, { backgroundColor: theme.sheetBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Fixed green header (parallax) ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.header,
          {
            height: HEADER_H,
            backgroundColor: theme.headerBg,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
      >
        {/* decorative shapes */}
        <View
          style={[
            styles.shape,
            {
              width: 320,
              height: 320,
              borderRadius: 160,
              top: -100,
              end: -120,
              backgroundColor: "rgba(255,255,255,0.12)",
            },
          ]}
        />
        <View
          style={[
            styles.shape,
            {
              width: 150,
              height: 150,
              borderRadius: 75,
              top: insets.top + 120,
              start: -64,
              borderWidth: 12,
              borderColor: "rgba(255,255,255,0.22)",
            },
          ]}
        />
        <View
          style={[
            styles.shape,
            {
              width: 230,
              height: 230,
              borderRadius: 115,
              top: SPACER - 40,
              start: -90,
              backgroundColor: "rgba(255,255,255,0.10)",
            },
          ]}
        />
        <View
          style={[
            styles.shape,
            {
              width: 54,
              height: 54,
              borderRadius: 27,
              top: SPACER - 60,
              end: 44,
              backgroundColor: "rgba(255,255,255,0.20)",
            },
          ]}
        />
        <View
          style={[
            styles.shape,
            {
              width: 30,
              height: 30,
              borderRadius: 15,
              top: SPACER - 96,
              start: width * 0.3,
              backgroundColor: "rgba(255,255,255,0.18)",
            },
          ]}
        />

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

      {/* ── Scroll content: transparent spacer + white sheet ── */}
      <Animated.ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={productsLoading || likedLoading}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={[GREEN]}
            progressViewOffset={TOP_BAR_H}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Lets the header show through */}
        <View style={{ height: SPACER }} pointerEvents="none" />

        {/* Chevron peak + avatar */}
        <View style={{ height: PEAK + ZONE_BELOW }}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderLeftWidth: width / 2,
              borderRightWidth: width / 2,
              borderBottomWidth: PEAK,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: theme.sheetBg,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: PEAK - 1,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.sheetBg,
            }}
          />

          <View style={styles.avatarWrap}>
            <Animated.View
              style={[
                styles.avatarRing,
                {
                  backgroundColor: theme.greenChip,
                  shadowColor: theme.shadow,
                  transform: [{ scale: avatarScale }],
                },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* White sheet */}
        <View
          style={[
            styles.sheetBody,
            { backgroundColor: theme.sheetBg, minHeight: height - TOP_BAR_H },
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
              <BadgeCheck size={14} color={theme.primary} />
              <Text
                style={[styles.cardEmail, { color: theme.mutedText }]}
                numberOfLines={1}
              >
                {user?.email || ""}
              </Text>
            </View>
            {user?.city ? (
              <View style={[styles.cityChip, { backgroundColor: theme.greenChip }]}>
                <MapPin size={11} color={theme.greenText} />
                <Text style={[styles.cityChipText, { color: theme.greenText }]}>
                  {user.city}
                </Text>
              </View>
            ) : null}
          </FadeInUp>

          {/* Stats */}
          <FadeInUp delay={220} style={styles.statsRow}>
            {statItems.map((item, i) => (
              <React.Fragment key={item.key}>
                {i > 0 && (
                  <View
                    style={[styles.statDivider, { backgroundColor: theme.lightLine }]}
                  />
                )}
                <View style={styles.stat}>
                  <Text style={[styles.statNumber, { color: theme.titleText }]}>
                    {item.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.mutedText }]}>
                    {item.label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </FadeInUp>

          {/* My products */}
          <FadeInUp delay={320} style={styles.section}>
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
          <FadeInUp delay={420} style={styles.section}>
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

          {/* Account */}
          <FadeInUp delay={520} style={[styles.section, styles.padded]}>
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
                title={"messages"}
                subtitle={t("profile.languageSub")}
                onPress={() => navigation.navigate("ChatList")}
                theme={theme}
                last
              />
            </View>

            <Text style={[styles.versionText, { color: theme.mutedText }]}>
              {t("profile.appVersion")}
            </Text>
          </FadeInUp>
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
            { backgroundColor: theme.barBg, opacity: barOpacity },
          ]}
        />

        <TouchableOpacity
          style={styles.barButton}
          activeOpacity={0.8}
          onPress={() => setLanguageModalVisible(true)}
          hitSlop={8}
        >
          <Globe size={19} color="#FFFFFF" />
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
          <LogOut size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.primary },
                  updateLoading && styles.disabled,
                ]}
                onPress={updateProfile}
                disabled={updateLoading}
                activeOpacity={0.85}
              >
                {updateLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>{t("common.saveChanges")}</Text>
                )}
              </TouchableOpacity>

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
                        backgroundColor: isActive ? theme.greenChip : theme.fieldBg,
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
                        <Check size={14} color="#FFFFFF" />
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
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: PAGE_PADDING },

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
    left: 24,
    right: 24,
    alignItems: "center",
  },
  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  welcomeSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 17,
    fontWeight: "400",
    marginTop: 4,
    textAlign: "center",
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
  barButton: {
    width: TOP_BAR_CONTENT,
    height: TOP_BAR_CONTENT,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  barTitle: {
    flex: 1,
    height: TOP_BAR_CONTENT,
    lineHeight: TOP_BAR_CONTENT,
    textAlign: "center",
    color: "#FFFFFF",
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 36, fontWeight: "800" },

  /* Sheet body */
  sheetBody: { paddingBottom: 40 },
  identity: { alignItems: "center", paddingHorizontal: PAGE_PADDING },
  cardName: { fontSize: 23, fontWeight: "800", letterSpacing: -0.4 },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    maxWidth: "92%",
  },
  cardEmail: { fontSize: 13, fontWeight: "500", flexShrink: 1 },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  cityChipText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: PAGE_PADDING + 6,
  },
  stat: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 3,
  },
  statDivider: { width: 1, height: 36 },

  /* Sections */
  section: { marginTop: 30 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12.5, fontWeight: "500", marginTop: 2 },
  sectionCount: { fontSize: 15, fontWeight: "800" },

  /* Tiles */
  tileRow: { paddingHorizontal: PAGE_PADDING, paddingBottom: 4 },
  tile: {
    borderRadius: 22,
    overflow: "hidden",
  },
  tileTopStart: { position: "absolute", top: 10, start: 10 },
  tileTopEnd: { position: "absolute", top: 10, end: 10 },
  tileOverlay: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "rgba(15,23,42,0.58)",
  },
  tileName: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "700" },
  tilePrice: {
    color: "#86EFAC",
    fontSize: 14.5,
    fontWeight: "800",
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
  chipGlass: { backgroundColor: "rgba(15,23,42,0.45)" },
  chipText: { fontSize: 11, fontWeight: "800" },

  /* Settings rows */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 2,
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "700" },
  settingSubtitle: { fontSize: 12.5, fontWeight: "500", marginTop: 2 },
  valueChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  valueChipText: { fontSize: 12, fontWeight: "700" },

  versionText: {
    textAlign: "center",
    marginTop: 16,
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
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
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
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCtaText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  /* Modal sheets */
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
  sheetTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
  sheetSubtitle: { marginTop: 3, fontSize: 14, fontWeight: "500" },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Fields */
  field: { marginTop: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  fieldInput: { flex: 1, fontSize: 15, fontWeight: "600", height: "100%" },

  saveButton: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  cancelText: { fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },

  /* Language */
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
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