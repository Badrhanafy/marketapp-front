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
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  ImageBackground,
  Dimensions,
  Animated,
  RefreshControl,
} from "react-native";

import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { media_URL } from "../../constants/config";
import bg from "../../../assets/images/khayma1.jpg";
import {
  Settings2,
  Package,
  TrendingUp,
  BadgeCheck,
  LogOut,
  Pencil,
  Heart,
  X,
  Eye,
  ChevronRight,
  Globe,
  Check,
} from "lucide-react-native";

import i18n from "../../i18n";

const { width } = Dimensions.get("window");
const CARD_WIDTH = 172;
const LIME = "#B9FA3C";
const NAVY = "#040045";
const BANNER_HEIGHT = 200;
const AVATAR_SIZE = 84;

/* Media URL builder */
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

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const { user, token, updateUser, logout } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 180],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerTranslate = scrollY.interpolate({
    inputRange: [80, 180],
    outputRange: [-14, 0],
    extrapolate: "clamp",
  });

  /*
  |--------------------------------------------------------------------------
  | Theme bundle
  |--------------------------------------------------------------------------
  */
  const theme = useMemo(
    () => ({
      pageBg: colors.background,
      surface: colors.surface,
      surfaceAlt: colors.surfaceSecondary,

      cardBg: colors.surface,
      cardBorder: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(4,0,69,0.05)",
      shadow: isDark ? "#000000" : NAVY,

      titleText: colors.text,
      bodyText: colors.textSecondary,
      mutedText: colors.inactive,

      border: colors.border,

      primary: colors.primary,
      icon: colors.icon,

      /* Banner identity stays cinematic */
      bannerOverlay: NAVY,
      bannerText: "#FFFFFF",
      bannerSub: "rgba(255,255,255,0.7)",

      /* Floating header */
      floatingHeaderBg: isDark ? "#020617" : NAVY,
      floatingHeaderText: "#FFFFFF",
      floatingHeaderDot: LIME,

      /* Soft lime chip on the avatar / city */
      limeSoft: isDark ? "rgba(185,250,60,0.18)" : "rgba(185,250,60,0.15)",
      limeBorder: isDark
        ? "rgba(185,250,60,0.35)"
        : "rgba(185,250,60,0.4)",

      /* Section title bars + menu accent */
      sectionBar: LIME,
      menuAccent: LIME,

      /* Field surfaces inside modals */
      fieldBg: colors.surfaceSecondary,
      fieldBorder: colors.border,

      /* Stat pill */
      statPillBg: isDark ? colors.surfaceSecondary : "#F6F6FB",
      statPillBorder: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(4,0,69,0.06)",

      /* Count badges */
      countBadgeBg: isDark ? colors.primary : NAVY,
      countBadgeText: LIME,

      /* Liked */
      likedSoft: isDark ? "rgba(220,38,38,0.14)" : "rgba(220,38,38,0.08)",
      likedBorder: isDark
        ? "rgba(220,38,38,0.30)"
        : "rgba(220,38,38,0.18)",

      /* Modal */
      modalOverlay: isDark
        ? "rgba(0,0,0,0.75)"
        : "rgba(4,0,69,0.6)",
      modalBg: colors.surface,

      /* Button colors */
      saveBg: LIME,
      saveText: NAVY,
      cancelBg: isDark ? "#04045F" : "#04045F",
      cancelText: LIME,

      /* Liked modal cards */
      likedCardBg: isDark ? colors.surfaceSecondary : "#F8F8FC",
      likedCardBorder: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(4,0,69,0.05)",

      /* Empty state icon backgrounds */
      emptyIconBg: isDark
        ? "rgba(255,255,255,0.04)"
        : "rgba(4,0,69,0.04)",
      emptyIconBorder: isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(4,0,69,0.06)",

      /* Menu icon box */
      menuIconBg: isDark
        ? "rgba(255,255,255,0.05)"
        : "rgba(4,0,69,0.05)",

      /* Language chip */
      languageChipBg: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(4,0,69,0.06)",
    }),
    [colors, isDark]
  );

  /*
  |--------------------------------------------------------------------------
  | Profile edit modal
  |--------------------------------------------------------------------------
  */
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  /* My products */
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  /* Liked products */
  const [likedModalVisible, setLikedModalVisible] = useState(false);
  const [likedProducts, setLikedProducts] = useState([]);
  const [likedLoading, setLikedLoading] = useState(false);

  /* Language */
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(
    i18n.language || "en"
  );

  /* Sync form with auth user */
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCity(user.city || "");
    }
  }, [user]);

  /* Keep local language state in sync with i18n */
  useEffect(() => {
    const handler = (lng) => setCurrentLanguage(lng);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  /* Fetch my products */
  const fetchMyProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const response = await api.get("/my-products");
      const list = response.data?.products || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.log(
        "MY PRODUCTS ERROR:",
        error.response?.data || error.message
      );
    } finally {
      setProductsLoading(false);
    }
  }, []);

  /* Fetch liked products */
  const fetchLikedProducts = useCallback(async () => {
    try {
      setLikedLoading(true);
      const response = await api.get("/my-liked-products");
      const list = response.data?.products || [];
      setLikedProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.log(
        "LIKED PRODUCTS ERROR:",
        error.response?.data || error.message
      );
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

  const openLikedProducts = () => {
    setLikedModalVisible(true);
    fetchLikedProducts();
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
      console.log(
        "UPDATE PROFILE ERROR:",
        error.response?.data || error.message
      );
      const errors = error.response?.data?.errors;
      if (errors) {
        const message = Object.values(errors).flat().join("\n");
        Alert.alert(t("common.error"), message);
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

  /* Status badge */
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "sold":
        return {
          bg: "rgba(185,250,60,0.15)",
          text: isDark ? LIME : "#5F8F1A",
          border: "rgba(185,250,60,0.3)",
        };
      case "reserved":
        return {
          bg: isDark ? "rgba(255,255,255,0.06)" : "rgba(4,0,69,0.08)",
          text: isDark ? colors.text : NAVY,
          border: isDark
            ? "rgba(255,255,255,0.12)"
            : "rgba(4,0,69,0.2)",
        };
      case "active":
      case "available":
        return {
          bg: "rgba(185,250,60,0.22)",
          text: isDark ? LIME : "#5F8F1A",
          border: "rgba(185,250,60,0.4)",
        };
      default:
        return {
          bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(4,0,69,0.06)",
          text: colors.textSecondary,
          border: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(4,0,69,0.12)",
        };
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

  const renderProduct = ({ item }) => {
    const image = getFirstImage(item);
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            shadowColor: theme.shadow,
          },
        ]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("MyProductDetails", { product: item })
        }
      >
        <View
          style={[
            styles.productImageContainer,
            { backgroundColor: theme.surfaceAlt },
          ]}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.noImage,
                { backgroundColor: theme.surfaceAlt },
              ]}
            >
              <Text
                style={[styles.noImageText, { color: theme.mutedText }]}
              >
                {t("common.noImage")}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.imageStatusBadge,
              {
                backgroundColor: statusStyle.bg,
                borderColor: statusStyle.border,
              },
            ]}
          >
            <Text
              style={[styles.imageStatusText, { color: statusStyle.text }]}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.productInfo}>
          <Text
            style={[styles.productName, { color: theme.titleText }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.productPrice, { color: theme.primary }]}
          >
            {item.price} {t("common.currency")}
          </Text>
          <View style={styles.productBottom}>
            <View style={styles.cityRow}>
              <View
                style={[
                  styles.cityIconDot,
                  { backgroundColor: theme.primary },
                ]}
              />
              <Text
                style={[styles.productCity, { color: theme.mutedText }]}
                numberOfLines={1}
              >
                {item.city}
              </Text>
            </View>
            <View style={styles.productStatsRow}>
              <Eye size={11} color={theme.mutedText} />
              <Text
                style={[styles.productStatText, { color: theme.mutedText }]}
              >
                {item.views_count ?? 0}
              </Text>
              <Heart size={11} color="#DC2626" fill="#DC2626" />
              <Text
                style={[styles.productStatText, { color: theme.mutedText }]}
              >
                {item.likes_count ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLikedProduct = ({ item }) => {
    const image = getFirstImage(item);
    return (
      <TouchableOpacity
        style={[
          styles.likedCard,
          {
            backgroundColor: theme.likedCardBg,
            borderColor: theme.likedCardBorder,
          },
        ]}
        activeOpacity={0.85}
        onPress={() => {
          setLikedModalVisible(false);
          navigation.navigate("ProductDetails", { productId: item.id });
        }}
      >
        <View
          style={[
            styles.likedCardImageBox,
            { backgroundColor: theme.surfaceAlt },
          ]}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.likedCardImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.noImage,
                { backgroundColor: theme.surfaceAlt },
              ]}
            >
              <Text
                style={[styles.noImageText, { color: theme.mutedText }]}
              >
                {t("common.noImage")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.likedCardInfo}>
          <Text
            style={[styles.likedCardName, { color: theme.titleText }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.likedCardPrice, { color: theme.primary }]}
          >
            {item.price} {t("common.currency")}
          </Text>
          <View style={styles.likedCardMetaRow}>
            <View style={styles.cityRow}>
              <View
                style={[
                  styles.cityIconDot,
                  { backgroundColor: theme.primary },
                ]}
              />
              <Text
                style={[styles.productCity, { color: theme.mutedText }]}
                numberOfLines={1}
              >
                {item.city}
              </Text>
            </View>
            <View
              style={[
                styles.likedCardLikes,
                {
                  backgroundColor: theme.likedSoft,
                  borderColor: theme.likedBorder,
                  borderWidth: 1,
                },
              ]}
            >
              <Heart size={11} color="#DC2626" fill="#DC2626" />
              <Text style={styles.likedCardLikesText}>
                {item.likes_count ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleLogout = () => {
    Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const soldCount = products.filter((p) => p.status === "sold").length;
  const activeCount = products.filter(
    (p) => p.status === "active" || p.status === "available"
  ).length;

  const likedPreview = likedProducts.slice(0, 3);

  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.label ||
    currentLanguage.toUpperCase();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.pageBg }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Floating header */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            backgroundColor: theme.floatingHeaderBg,
            shadowColor: theme.shadow,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
      >
        <View style={styles.floatingHeaderInner}>
          <View
            style={[
              styles.floatingHeaderDot,
              { backgroundColor: theme.floatingHeaderDot },
            ]}
          />
          <Text
            style={[
              styles.floatingHeaderText,
              { color: theme.floatingHeaderText },
            ]}
          >
            {user?.name || t("profile.myAccount")}
          </Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={productsLoading || likedLoading}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* BANNER */}
        <ImageBackground
          source={bg}
          style={styles.banner}
          imageStyle={styles.bannerImage}
        >
          <View
            style={[
              styles.bannerOverlay,
              { backgroundColor: theme.bannerOverlay },
            ]}
            pointerEvents="none"
          />

          <TouchableOpacity
            style={styles.bannerEditButton}
            activeOpacity={0.8}
            onPress={openEditProfile}
          >
            <Pencil size={15} color="#fff" />
            <Text style={styles.bannerEditText}>{t("common.edit")}</Text>
          </TouchableOpacity>

          <View style={styles.bannerGreeting}>
            <Text style={styles.bannerHello}>{t("profile.myAccount")}</Text>
            <Text style={styles.bannerSub}>
              {t("profile.manageProfile")}
            </Text>
          </View>
        </ImageBackground>

        {/* FLOATING PROFILE CARD */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.surface,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View style={styles.avatarWrapper}>
            <View
              style={[
                styles.avatarRing,
                {
                  backgroundColor: theme.surface,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
              <View
                style={[
                  styles.onlineIndicator,
                  { borderColor: theme.surface },
                ]}
              />
            </View>
          </View>

          <Text
            style={[styles.cardName, { color: theme.titleText }]}
            numberOfLines={1}
          >
            {user?.name || "User"}
          </Text>

          <View style={styles.cardMetaRow}>
            <BadgeCheck size={13} color={theme.primary} />
            <Text
              style={[styles.cardEmail, { color: theme.mutedText }]}
              numberOfLines={1}
            >
              {user?.email || ""}
            </Text>
          </View>

          {user?.city ? (
            <View
              style={[
                styles.cityChip,
                {
                  backgroundColor: theme.limeSoft,
                  borderColor: theme.limeBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.cityChipDot,
                  { backgroundColor: theme.primary },
                ]}
              />
              <Text style={[styles.cityChipText, { color: theme.titleText }]}>
                {user.city}
              </Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View
              style={[
                styles.statPill,
                {
                  backgroundColor: theme.statPillBg,
                  borderColor: theme.statPillBorder,
                },
              ]}
            >
              <Package size={14} color={theme.primary} />
              <Text style={[styles.statNumber, { color: theme.titleText }]}>
                {products.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.mutedText }]}>
                {t("profile.products")}
              </Text>
            </View>
            <View
              style={[
                styles.statPill,
                {
                  backgroundColor: theme.statPillBg,
                  borderColor: theme.statPillBorder,
                },
              ]}
            >
              <TrendingUp size={14} color="#7BCF00" />
              <Text style={[styles.statNumber, { color: "#7BCF00" }]}>
                {activeCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.mutedText }]}>
                {t("profile.active")}
              </Text>
            </View>
            <View
              style={[
                styles.statPill,
                {
                  backgroundColor: theme.statPillBg,
                  borderColor: theme.statPillBorder,
                },
              ]}
            >
              <View style={styles.soldDot} />
              <Text style={[styles.statNumber, { color: "#B8860B" }]}>
                {soldCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.mutedText }]}>
                {t("profile.sold")}
              </Text>
            </View>
          </View>
        </View>

        {/* SETTINGS LIST */}
        <View style={styles.settingsWrapper}>
          <Text
            style={[styles.settingsTitle, { color: theme.mutedText }]}
          >
            {t("profile.account")}
          </Text>

          <TouchableOpacity
            style={[
              styles.menuItem,
              {
                backgroundColor: theme.surface,
                borderColor: theme.cardBorder,
                shadowColor: theme.shadow,
              },
            ]}
            activeOpacity={0.7}
            onPress={openEditProfile}
          >
            <View
              style={[
                styles.menuIconBox,
                { backgroundColor: theme.menuIconBg },
              ]}
            >
              <Settings2 size={18} color={theme.primary} />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={[styles.menuTitle, { color: theme.titleText }]}>
                {t("profile.personalInfo")}
              </Text>
              <Text
                style={[styles.menuSubtitle, { color: theme.mutedText }]}
              >
                {t("profile.personalInfoSub")}
              </Text>
            </View>
            <Text
              style={[styles.menuChevron, { color: theme.mutedText }]}
            >
              ›
            </Text>
            <View
              style={[
                styles.menuAccentEdge,
                { backgroundColor: theme.menuAccent },
              ]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuItem,
              {
                marginTop: 12,
                backgroundColor: theme.surface,
                borderColor: theme.cardBorder,
                shadowColor: theme.shadow,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setLanguageModalVisible(true)}
          >
            <View
              style={[
                styles.menuIconBox,
                { backgroundColor: theme.menuIconBg },
              ]}
            >
              <Globe size={18} color={theme.primary} />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={[styles.menuTitle, { color: theme.titleText }]}>
                {t("profile.language")}
              </Text>
              <Text
                style={[styles.menuSubtitle, { color: theme.mutedText }]}
              >
                {t("profile.languageSub")}
              </Text>
            </View>
            <View
              style={[
                styles.languageChip,
                { backgroundColor: theme.languageChipBg },
              ]}
            >
              <Text
                style={[
                  styles.languageChipText,
                  { color: theme.titleText },
                ]}
              >
                {currentLanguageLabel}
              </Text>
            </View>
            <Text
              style={[styles.menuChevron, { color: theme.mutedText }]}
            >
              ›
            </Text>
            <View
              style={[
                styles.menuAccentEdge,
                { backgroundColor: theme.menuAccent },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* MY PRODUCTS */}
        <View style={styles.productsHeaderWrapper}>
          <View style={styles.productsHeaderLeft}>
            <View
              style={[
                styles.sectionTitleBar,
                { backgroundColor: theme.sectionBar },
              ]}
            />
            <View>
              <Text
                style={[styles.sectionTitle, { color: theme.titleText }]}
              >
                {t("profile.myProducts")}
              </Text>
              <Text
                style={[styles.sectionSubtitle, { color: theme.mutedText }]}
              >
                {t("profile.sellingSub")}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.productsCountBadge,
              {
                backgroundColor: theme.countBadgeBg,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <Text
              style={[
                styles.productsCount,
                { color: theme.countBadgeText },
              ]}
            >
              {products.length}
            </Text>
          </View>
        </View>

        {products.length > 0 ? (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            decelerationRate="fast"
          />
        ) : !productsLoading ? (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconBox,
                {
                  backgroundColor: theme.emptyIconBg,
                  borderColor: theme.emptyIconBorder,
                },
              ]}
            >
              <Package size={30} color={theme.mutedText} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.titleText }]}>
              {t("profile.noProductsYet")}
            </Text>
            <Text style={[styles.emptyText, { color: theme.mutedText }]}>
              {t("profile.noProductsSub")}
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyCta,
                { backgroundColor: theme.primary },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.emptyCtaText, { color: "#FFFFFF" }]}
              >
                {t("profile.addProduct")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* LIKED PRODUCTS */}
        <View style={styles.likedSectionWrapper}>
          <View style={styles.likedSectionHeader}>
            <View style={styles.likedSectionTitleGroup}>
              <View
                style={[
                  styles.likedSectionTitleBar,
                  { backgroundColor: "#DC2626" },
                ]}
              />
              <View>
                <Text
                  style={[styles.sectionTitle, { color: theme.titleText }]}
                >
                  {t("profile.likedProducts")}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: theme.mutedText },
                  ]}
                >
                  {t("profile.likedSub")}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.likedSectionCountBadge,
                {
                  backgroundColor: theme.likedSoft,
                  borderColor: theme.likedBorder,
                },
              ]}
            >
              <Heart size={11} color="#DC2626" fill="#DC2626" />
              <Text style={styles.likedSectionCountText}>
                {likedProducts.length}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.likedSectionCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.cardBorder,
                shadowColor: theme.shadow,
              },
            ]}
            activeOpacity={0.85}
            onPress={openLikedProducts}
          >
            <View style={styles.likedPreviewRow}>
              {likedLoading && likedPreview.length === 0 ? (
                <View style={styles.likedPreviewSkeletonRow}>
                  <View
                    style={[
                      styles.likedPreviewSkeleton,
                      { backgroundColor: theme.surfaceAlt },
                    ]}
                  />
                  <View
                    style={[
                      styles.likedPreviewSkeleton,
                      { backgroundColor: theme.surfaceAlt },
                    ]}
                  />
                  <View
                    style={[
                      styles.likedPreviewSkeleton,
                      { backgroundColor: theme.surfaceAlt },
                    ]}
                  />
                </View>
              ) : likedPreview.length === 0 ? (
                <View
                  style={[
                    styles.likedPreviewEmpty,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor: theme.emptyIconBorder,
                    },
                  ]}
                >
                  <Heart size={20} color={theme.mutedText} />
                </View>
              ) : (
                <>
                  {likedPreview.map((item, idx) => {
                    const img = getFirstImage(item);
                    return (
                      <View
                        key={`preview-${item.id}`}
                        style={[
                          styles.likedPreviewThumb,
                          {
                            borderColor: theme.surface,
                            backgroundColor: theme.surfaceAlt,
                          },
                          idx > 0 && styles.likedPreviewThumbOverlap,
                        ]}
                      >
                        {img ? (
                          <Image
                            source={{ uri: img }}
                            style={styles.likedPreviewImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.likedPreviewNoImage,
                              { backgroundColor: theme.surfaceAlt },
                            ]}
                          >
                            <Heart size={14} color={theme.mutedText} />
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {likedProducts.length > 3 && (
                    <View
                      style={[
                        styles.likedPreviewThumb,
                        styles.likedPreviewThumbOverlap,
                        {
                          backgroundColor: theme.primary,
                          borderColor: theme.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.likedPreviewMoreText,
                          { color: "#FFFFFF" },
                        ]}
                      >
                        +{likedProducts.length - 3}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.likedSectionTextBox}>
              <Text
                style={[
                  styles.likedSectionCardTitle,
                  { color: theme.titleText },
                ]}
              >
                {likedProducts.length === 0
                  ? t("profile.noLikedYet")
                  : t("profile.likedCount", {
                      count: likedProducts.length,
                    })}
              </Text>
              <Text
                style={[
                  styles.likedSectionCardSubtitle,
                  { color: theme.mutedText },
                ]}
                numberOfLines={1}
              >
                {likedProducts.length === 0
                  ? t("profile.tapHeartToSave")
                  : t("profile.manageSavedItems")}
              </Text>
            </View>

            <View
              style={[
                styles.likedSectionArrowBox,
                { backgroundColor: theme.menuIconBg },
              ]}
            >
              <ChevronRight size={18} color={theme.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* FOOTER / LOGOUT */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                backgroundColor: theme.surface,
                shadowColor: theme.shadow,
              },
            ]}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <LogOut size={17} color="#DC2626" />
            <Text style={styles.logoutText}>
              {t("profile.logout")}
            </Text>
          </TouchableOpacity>
          <View
            style={[
              styles.footerDivider,
              { backgroundColor: theme.border },
            ]}
          />
          <Text
            style={[styles.versionText, { color: theme.mutedText }]}
          >
            {t("profile.appVersion")}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.overlay,
            { backgroundColor: theme.modalOverlay },
          ]}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: theme.modalBg,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderBar,
                    { backgroundColor: theme.sectionBar },
                  ]}
                />
                <View>
                  <Text
                    style={[styles.modalTitle, { color: theme.titleText }]}
                  >
                    {t("profile.personalInfo")}
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.mutedText },
                    ]}
                  >
                    {t("profile.updateAccountInfo")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: theme.menuIconBg,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <X size={20} color={theme.titleText} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.titleText }]}>
                  {t("profile.fullName")}
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.fieldBg,
                      borderColor: theme.fieldBorder,
                      color: theme.titleText,
                    },
                  ]}
                  placeholder={t("profile.namePlaceholder")}
                  placeholderTextColor={theme.mutedText}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.titleText }]}>
                  {t("profile.email")}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.fieldBg,
                      borderColor: theme.fieldBorder,
                      color: theme.titleText,
                    },
                  ]}
                  placeholder={t("profile.emailPlaceholder")}
                  placeholderTextColor={theme.mutedText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.titleText }]}>
                  {t("profile.phone")}
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.fieldBg,
                      borderColor: theme.fieldBorder,
                      color: theme.titleText,
                    },
                  ]}
                  placeholder={t("profile.phonePlaceholder")}
                  placeholderTextColor={theme.mutedText}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.titleText }]}>
                  {t("profile.city")}
                </Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.fieldBg,
                      borderColor: theme.fieldBorder,
                      color: theme.titleText,
                    },
                  ]}
                  placeholder={t("profile.cityPlaceholder")}
                  placeholderTextColor={theme.mutedText}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: theme.saveBg,
                    shadowColor: theme.saveBg,
                  },
                  updateLoading && styles.disabled,
                ]}
                onPress={updateProfile}
                disabled={updateLoading}
                activeOpacity={0.8}
              >
                {updateLoading ? (
                  <ActivityIndicator color={theme.saveText} />
                ) : (
                  <Text
                    style={[styles.saveText, { color: theme.saveText }]}
                  >
                    {t("common.saveChanges")}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: theme.cancelBg },
                ]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.cancelText, { color: theme.cancelText }]}
                >
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LANGUAGE MODAL */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View
          style={[
            styles.overlay,
            { backgroundColor: theme.modalOverlay },
          ]}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: theme.modalBg,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderBar,
                    { backgroundColor: theme.sectionBar },
                  ]}
                />
                <View>
                  <Text
                    style={[styles.modalTitle, { color: theme.titleText }]}
                  >
                    {t("profile.selectLanguage")}
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.mutedText },
                    ]}
                  >
                    {t("profile.languageSub")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setLanguageModalVisible(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: theme.menuIconBg,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <X size={20} color={theme.titleText} />
              </Pressable>
            </View>

            <View style={styles.languageList}>
              {LANGUAGES.map((lang) => {
                const isActive = currentLanguage === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageRow,
                      {
                        backgroundColor: isActive
                          ? theme.limeSoft
                          : theme.fieldBg,
                        borderColor: isActive
                          ? theme.primary
                          : theme.fieldBorder,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => changeLanguage(lang.code)}
                  >
                    <Text
                      style={[
                        styles.languageRowText,
                        { color: theme.titleText },
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {isActive ? (
                      <View
                        style={[
                          styles.languageCheckBox,
                          { backgroundColor: theme.primary },
                        ]}
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

      {/* LIKED PRODUCTS MODAL */}
      <Modal
        visible={likedModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLikedModalVisible(false)}
      >
        <View
          style={[
            styles.overlay,
            { backgroundColor: theme.modalOverlay },
          ]}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: theme.modalBg,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderBar,
                    { backgroundColor: theme.sectionBar },
                  ]}
                />
                <View>
                  <Text
                    style={[styles.modalTitle, { color: theme.titleText }]}
                  >
                    {t("profile.likedProducts")}
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.mutedText },
                    ]}
                  >
                    {likedLoading && likedProducts.length === 0
                      ? t("common.loading")
                      : t("profile.likedCount", {
                          count: likedProducts.length,
                        })}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setLikedModalVisible(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: theme.menuIconBg,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <X size={20} color={theme.titleText} />
              </Pressable>
            </View>

            {likedLoading && likedProducts.length === 0 ? (
              <View style={styles.likedLoading}>
                <ActivityIndicator color={theme.primary} />
                <Text
                  style={[
                    styles.likedLoadingText,
                    { color: theme.mutedText },
                  ]}
                >
                  {t("common.loading")}
                </Text>
              </View>
            ) : likedProducts.length === 0 ? (
              <View style={styles.likedEmpty}>
                <View
                  style={[
                    styles.likedEmptyIconBox,
                    {
                      backgroundColor: theme.likedSoft,
                      borderColor: theme.likedBorder,
                    },
                  ]}
                >
                  <Heart size={30} color="#DC2626" fill="#DC2626" />
                </View>
                <Text
                  style={[
                    styles.likedEmptyTitle,
                    { color: theme.titleText },
                  ]}
                >
                  {t("profile.noLikedYet")}
                </Text>
                <Text
                  style={[
                    styles.likedEmptyText,
                    { color: theme.mutedText },
                  ]}
                >
                  {t("profile.tapHeartToSave")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={likedProducts}
                keyExtractor={(item) => `liked-${item.id}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.likedListContent}
                ItemSeparatorComponent={() => (
                  <View style={styles.likedItemSeparator} />
                )}
                renderItem={renderLikedProduct}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // FLOATING HEADER
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 100,
    justifyContent: "flex-end",
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingHeaderInner: { flexDirection: "row", alignItems: "center" },
  floatingHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  floatingHeaderText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  listContent: { paddingBottom: 50 },

  // BANNER
  banner: {
    width: width,
    height: BANNER_HEIGHT,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    backgroundColor: NAVY,
  },
  bannerImage: { resizeMode: "cover" },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },

  bannerEditButton: {
    position: "absolute",
    top: (StatusBar.currentHeight || 44) + 8,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  bannerEditText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  bannerGreeting: {
    position: "absolute",
    left: 20,
    bottom: AVATAR_SIZE / 2 + 22,
  },
  bannerHello: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  bannerSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },

  // FLOATING PROFILE CARD
  profileCard: {
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: -(AVATAR_SIZE / 2 + 10),
    paddingTop: AVATAR_SIZE / 2 + 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 5,
  },
  avatarWrapper: {
    position: "absolute",
    top: -(AVATAR_SIZE / 2),
    alignSelf: "center",
  },
  avatarRing: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: LIME,
  },
  avatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
  onlineIndicator: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    borderWidth: 3,
  },

  cardName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 5,
    maxWidth: "90%",
  },
  cardEmail: { fontSize: 13, fontWeight: "600" },

  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 10,
    gap: 6,
  },
  cityChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cityChipText: { fontSize: 12.5, fontWeight: "700" },

  // STATS
  statsRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 10,
    width: "100%",
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 5,
  },
  statNumber: { fontSize: 15, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "700" },
  soldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#B8860B",
  },

  // SETTINGS LIST
  settingsWrapper: { paddingHorizontal: 16, marginTop: 22 },
  settingsTitle: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuItem: {
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  menuAccentEdge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuTextBox: { flex: 1 },
  menuTitle: { fontSize: 15.5, fontWeight: "700" },
  menuSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "500",
  },
  menuChevron: {
    fontSize: 22,
    fontWeight: "700",
    marginRight: 4,
  },

  languageChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  languageChipText: { fontSize: 12, fontWeight: "800" },

  // PRODUCTS HEADER
  productsHeaderWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  productsHeaderLeft: { flexDirection: "row", alignItems: "center" },
  sectionTitleBar: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "500",
  },
  productsCountBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  productsCount: { fontSize: 15, fontWeight: "800" },

  // HORIZONTAL MY PRODUCTS
  horizontalListContent: { paddingHorizontal: 16, paddingBottom: 6 },
  productCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    marginRight: 14,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
  },
  productImageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  productImage: { width: "100%", height: "100%" },
  noImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: { fontWeight: "600", fontSize: 13 },
  imageStatusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageStatusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productInfo: { padding: 14 },
  productName: { fontSize: 14, fontWeight: "700" },
  productPrice: { fontSize: 16, fontWeight: "800", marginTop: 6 },
  productBottom: { marginTop: 10 },
  cityRow: { flexDirection: "row", alignItems: "center" },
  cityIconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  productCity: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  productStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  productStatText: {
    fontSize: 11,
    fontWeight: "700",
    marginRight: 4,
  },

  // EMPTY
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 30,
  },
  emptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  emptyCta: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCtaText: { fontWeight: "700", fontSize: 14 },

  // LIKED SECTION
  likedSectionWrapper: { paddingHorizontal: 16, marginTop: 26 },
  likedSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  likedSectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  likedSectionTitleBar: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginRight: 12,
  },
  likedSectionCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  likedSectionCountText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
  },
  likedSectionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  likedPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 14,
    minWidth: 84,
  },
  likedPreviewThumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  likedPreviewThumbOverlap: { marginLeft: -14 },
  likedPreviewImage: { width: "100%", height: "100%" },
  likedPreviewNoImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  likedPreviewMoreText: {
    fontSize: 12,
    fontWeight: "900",
  },
  likedPreviewEmpty: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  likedPreviewSkeletonRow: { flexDirection: "row" },
  likedPreviewSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 6,
  },
  likedSectionTextBox: { flex: 1, justifyContent: "center" },
  likedSectionCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  likedSectionCardSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 3,
  },
  likedSectionArrowBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  // FOOTER
  footerSection: {
    paddingHorizontal: 16,
    marginTop: 22,
    alignItems: "center",
  },
  logoutButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(220,38,38,0.18)",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexDirection: "row",
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  footerDivider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginTop: 20,
    marginBottom: 10,
  },
  versionText: { fontSize: 12, fontWeight: "600" },

  // MODAL
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 50,
    maxHeight: "92%",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  modalHeaderBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  // INPUTS
  inputGroup: { position: "relative", marginBottom: 4 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 14,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    height: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: "600",
  },

  // SAVE / CANCEL
  saveButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    marginBottom: 14,
    flexDirection: "row",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cancelButton: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.06)",
  },
  cancelText: { fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },

  // LANGUAGE MODAL
  languageList: { marginTop: 4 },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  languageRowText: { fontSize: 16, fontWeight: "700" },
  languageCheckBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  // LIKED MODAL
  likedLoading: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  likedLoadingText: { fontSize: 13, fontWeight: "600" },
  likedEmpty: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 30,
  },
  likedEmptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  likedEmptyTitle: { fontSize: 17, fontWeight: "800" },
  likedEmptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "500",
  },
  likedListContent: { paddingTop: 4, paddingBottom: 12 },
  likedItemSeparator: { height: 10 },
  likedCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  likedCardImageBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  likedCardImage: { width: "100%", height: "100%" },
  likedCardInfo: { flex: 1, justifyContent: "center" },
  likedCardName: {
    fontSize: 14.5,
    fontWeight: "800",
    lineHeight: 19,
  },
  likedCardPrice: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: -0.3,
  },
  likedCardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  likedCardLikes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  likedCardLikesText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
});