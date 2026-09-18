import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
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

import i18n from "../../i18n"; // adjust to your i18n file path

const { width } = Dimensions.get("window");
const CARD_WIDTH = 172;
const LIME = "#B9FA3C";
const NAVY = "#040045";
const BANNER_HEIGHT = 200;
const AVATAR_SIZE = 84;

/*
|--------------------------------------------------------------------------
| Media URL builder
|--------------------------------------------------------------------------
*/
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

/* Language options for the switcher */
const LANGUAGES = [
  { code: "en", key: "profile.english", label: "English" },
  { code: "fr", key: "profile.french", label: "Français" },
  { code: "ar", key: "profile.arabic", label: "العربية" },
];

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();

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
  | Profile edit modal
  |--------------------------------------------------------------------------
  */
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | My products
  |--------------------------------------------------------------------------
  */
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Liked products
  |--------------------------------------------------------------------------
  */
  const [likedModalVisible, setLikedModalVisible] = useState(false);
  const [likedProducts, setLikedProducts] = useState([]);
  const [likedLoading, setLikedLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Language
  |--------------------------------------------------------------------------
  */
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(
    i18n.language || "en"
  );

  /*
  |--------------------------------------------------------------------------
  | Sync form with auth user
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCity(user.city || "");
    }
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | Keep the local language state in sync with i18n
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    const handler = (lng) => setCurrentLanguage(lng);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Fetch my products
  |--------------------------------------------------------------------------
  */
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

  /*
  |--------------------------------------------------------------------------
  | Fetch liked products
  |--------------------------------------------------------------------------
  */
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

  /*
  |--------------------------------------------------------------------------
  | On mount / on token change — fetch both lists
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (token) {
      fetchMyProducts();
      fetchLikedProducts();
    }
  }, [token, fetchMyProducts, fetchLikedProducts]);

  /*
  |--------------------------------------------------------------------------
  | Pull-to-refresh — refresh both lists
  |--------------------------------------------------------------------------
  */
  const onRefresh = useCallback(() => {
    fetchMyProducts();
    fetchLikedProducts();
  }, [fetchMyProducts, fetchLikedProducts]);

  /*
  |--------------------------------------------------------------------------
  | Open profile edit modal
  |--------------------------------------------------------------------------
  */
  const openEditProfile = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setCity(user?.city || "");
    setModalVisible(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Open liked products modal (refresh for freshness)
  |--------------------------------------------------------------------------
  */
  const openLikedProducts = () => {
    setLikedModalVisible(true);
    fetchLikedProducts();
  };

  /*
  |--------------------------------------------------------------------------
  | Change app language
  |--------------------------------------------------------------------------
  */
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

  /*
  |--------------------------------------------------------------------------
  | Update profile
  |--------------------------------------------------------------------------
  */
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
      Alert.alert(
        t("common.success"),
        t("profile.profileUpdated")
      );
    } catch (error) {
      console.log("UPDATE PROFILE ERROR:", error.response?.data || error.message);
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

  /*
  |--------------------------------------------------------------------------
  | Status badge style
  |--------------------------------------------------------------------------
  */
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "sold":
        return {
          bg: "rgba(185,250,60,0.15)",
          text: LIME,
          border: "rgba(185,250,60,0.3)",
        };
      case "reserved":
        return {
          bg: "rgba(4,0,69,0.08)",
          text: NAVY,
          border: "rgba(4,0,69,0.2)",
        };
      case "active":
      case "available":
        return {
          bg: "rgba(185,250,60,0.22)",
          text: "#7BCF00",
          border: "rgba(185,250,60,0.4)",
        };
      default:
        return {
          bg: "rgba(4,0,69,0.06)",
          text: "#6B6B8D",
          border: "rgba(4,0,69,0.12)",
        };
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Status label (translated)
  |--------------------------------------------------------------------------
  */
  const getStatusLabel = (status) => {
    const key = String(status || "").toLowerCase();
    if (key === "sold") return t("products.status.sold");
    if (key === "reserved") return t("products.status.reserved");
    if (key === "active" || key === "available")
      return t("products.status.available");
    return status || "";
  };

  /*
  |--------------------------------------------------------------------------
  | My product card (horizontal list)
  |--------------------------------------------------------------------------
  */
  const renderProduct = ({ item }) => {
    const image = getFirstImage(item);
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("MyProductDetails", { product: item })
        }
      >
        <View style={styles.productImageContainer}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>{t("common.noImage")}</Text>
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
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>
            {item.price} {t("common.currency")}
          </Text>
          <View style={styles.productBottom}>
            <View style={styles.cityRow}>
              <View style={styles.cityIconDot} />
              <Text style={styles.productCity} numberOfLines={1}>
                {item.city}
              </Text>
            </View>
            <View style={styles.productStatsRow}>
              <Eye size={11} color="#8B8BAE" />
              <Text style={styles.productStatText}>
                {item.views_count ?? 0}
              </Text>
              <Heart size={11} color="#DC2626" fill="#DC2626" />
              <Text style={styles.productStatText}>
                {item.likes_count ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Liked product row (vertical list inside modal)
  |--------------------------------------------------------------------------
  */
  const renderLikedProduct = ({ item }) => {
    const image = getFirstImage(item);
    return (
      <TouchableOpacity
        style={styles.likedCard}
        activeOpacity={0.85}
        onPress={() => {
          setLikedModalVisible(false);
          navigation.navigate("ProductDetails", { productId: item.id });
        }}
      >
        <View style={styles.likedCardImageBox}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.likedCardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>{t("common.noImage")}</Text>
            </View>
          )}
        </View>

        <View style={styles.likedCardInfo}>
          <Text style={styles.likedCardName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.likedCardPrice}>
            {item.price} {t("common.currency")}
          </Text>
          <View style={styles.likedCardMetaRow}>
            <View style={styles.cityRow}>
              <View style={styles.cityIconDot} />
              <Text style={styles.productCity} numberOfLines={1}>
                {item.city}
              </Text>
            </View>
            <View style={styles.likedCardLikes}>
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

  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */
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

  /*
  |--------------------------------------------------------------------------
  | Current language label
  |--------------------------------------------------------------------------
  */
  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.label ||
    currentLanguage.toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Floating header on scroll */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
      >
        <View style={styles.floatingHeaderInner}>
          <View style={styles.floatingHeaderDot} />
          <Text style={styles.floatingHeaderText}>
            {user?.name || t("profile.myAccount")}
          </Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={productsLoading || likedLoading}
            onRefresh={onRefresh}
            tintColor={NAVY}
            colors={[NAVY]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* ══════════════════════════════════════════ */}
        {/* CINEMATIC BANNER + OVERLAY                  */}
        {/* ══════════════════════════════════════════ */}
        <ImageBackground
          source={bg}
          style={styles.banner}
          imageStyle={styles.bannerImage}
        >
          <View style={styles.bannerOverlay} pointerEvents="none" />

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

        {/* ══════════════════════════════════════════ */}
        {/* FLOATING PROFILE CARD (overlaps banner)     */}
        {/* ══════════════════════════════════════════ */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
              <View style={styles.onlineIndicator} />
            </View>
          </View>

          <Text style={styles.cardName} numberOfLines={1}>
            {user?.name || "User"}
          </Text>

          <View style={styles.cardMetaRow}>
            <BadgeCheck size={13} color={NAVY} />
            <Text style={styles.cardEmail} numberOfLines={1}>
              {user?.email || ""}
            </Text>
          </View>

          {user?.city ? (
            <View style={styles.cityChip}>
              <View style={styles.cityChipDot} />
              <Text style={styles.cityChipText}>{user.city}</Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Package size={14} color={NAVY} />
              <Text style={styles.statNumber}>{products.length}</Text>
              <Text style={styles.statLabel}>
                {t("profile.products")}
              </Text>
            </View>
            <View style={styles.statPill}>
              <TrendingUp size={14} color="#7BCF00" />
              <Text style={[styles.statNumber, { color: "#7BCF00" }]}>
                {activeCount}
              </Text>
              <Text style={styles.statLabel}>
                {t("profile.active")}
              </Text>
            </View>
            <View style={styles.statPill}>
              <View style={styles.soldDot} />
              <Text style={[styles.statNumber, { color: "#B8860B" }]}>
                {soldCount}
              </Text>
              <Text style={styles.statLabel}>{t("profile.sold")}</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════ */}
        {/* SETTINGS LIST                               */}
        {/* ══════════════════════════════════════════ */}
        <View style={styles.settingsWrapper}>
          <Text style={styles.settingsTitle}>
            {t("profile.account")}
          </Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={openEditProfile}
          >
            <View style={styles.menuIconBox}>
              <Settings2 size={18} color={NAVY} />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>
                {t("profile.personalInfo")}
              </Text>
              <Text style={styles.menuSubtitle}>
                {t("profile.personalInfoSub")}
              </Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
            <View style={styles.menuAccentEdge} />
          </TouchableOpacity>

          {/* Language menu item */}
          <TouchableOpacity
            style={[styles.menuItem, { marginTop: 12 }]}
            activeOpacity={0.7}
            onPress={() => setLanguageModalVisible(true)}
          >
            <View style={styles.menuIconBox}>
              <Globe size={18} color={NAVY} />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>
                {t("profile.language")}
              </Text>
              <Text style={styles.menuSubtitle}>
                {t("profile.languageSub")}
              </Text>
            </View>
            <View style={styles.languageChip}>
              <Text style={styles.languageChipText}>
                {currentLanguageLabel}
              </Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
            <View style={styles.menuAccentEdge} />
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════ */}
        {/* MY PRODUCTS                                 */}
        {/* ══════════════════════════════════════════ */}
        <View style={styles.productsHeaderWrapper}>
          <View style={styles.productsHeaderLeft}>
            <View style={styles.sectionTitleBar} />
            <View>
              <Text style={styles.sectionTitle}>
                {t("profile.myProducts")}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t("profile.sellingSub")}
              </Text>
            </View>
          </View>
          <View style={styles.productsCountBadge}>
            <Text style={styles.productsCount}>{products.length}</Text>
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
            <View style={styles.emptyIconBox}>
              <Package size={30} color="#A0A0C0" />
            </View>
            <Text style={styles.emptyTitle}>
              {t("profile.noProductsYet")}
            </Text>
            <Text style={styles.emptyText}>
              {t("profile.noProductsSub")}
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyCtaText}>
                {t("profile.addProduct")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ══════════════════════════════════════════ */}
        {/* LIKED PRODUCTS SECTION                      */}
        {/* ══════════════════════════════════════════ */}
        <View style={styles.likedSectionWrapper}>
          <View style={styles.likedSectionHeader}>
            <View style={styles.likedSectionTitleGroup}>
              <View style={styles.likedSectionTitleBar} />
              <View>
                <Text style={styles.sectionTitle}>
                  {t("profile.likedProducts")}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {t("profile.likedSub")}
                </Text>
              </View>
            </View>
            <View style={styles.likedSectionCountBadge}>
              <Heart size={11} color="#DC2626" fill="#DC2626" />
              <Text style={styles.likedSectionCountText}>
                {likedProducts.length}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.likedSectionCard}
            activeOpacity={0.85}
            onPress={openLikedProducts}
          >
            <View style={styles.likedPreviewRow}>
              {likedLoading && likedPreview.length === 0 ? (
                <View style={styles.likedPreviewSkeletonRow}>
                  <View style={styles.likedPreviewSkeleton} />
                  <View style={styles.likedPreviewSkeleton} />
                  <View style={styles.likedPreviewSkeleton} />
                </View>
              ) : likedPreview.length === 0 ? (
                <View style={styles.likedPreviewEmpty}>
                  <Heart size={20} color="#C5C5DD" />
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
                          <View style={styles.likedPreviewNoImage}>
                            <Heart size={14} color="#A0A0C0" />
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
                        styles.likedPreviewMore,
                      ]}
                    >
                      <Text style={styles.likedPreviewMoreText}>
                        +{likedProducts.length - 3}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.likedSectionTextBox}>
              <Text style={styles.likedSectionCardTitle}>
                {likedProducts.length === 0
                  ? t("profile.noLikedYet")
                  : t("profile.likedCount", {
                      count: likedProducts.length,
                    })}
              </Text>
              <Text
                style={styles.likedSectionCardSubtitle}
                numberOfLines={1}
              >
                {likedProducts.length === 0
                  ? t("profile.tapHeartToSave")
                  : t("profile.manageSavedItems")}
              </Text>
            </View>

            <View style={styles.likedSectionArrowBox}>
              <ChevronRight size={18} color={NAVY} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════ */}
        {/* FOOTER / LOGOUT                             */}
        {/* ══════════════════════════════════════════ */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <LogOut size={17} color="#DC2626" />
            <Text style={styles.logoutText}>
              {t("profile.logout")}
            </Text>
          </TouchableOpacity>
          <View style={styles.footerDivider} />
          <Text style={styles.versionText}>
            {t("profile.appVersion")}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* ══════════════════════════════════════════ */}
      {/* EDIT PROFILE MODAL                          */}
      {/* ══════════════════════════════════════════ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderBar} />
                <View>
                  <Text style={styles.modalTitle}>
                    {t("profile.personalInfo")}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {t("profile.updateAccountInfo")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <X size={20} color={NAVY} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t("profile.fullName")}
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder={t("profile.namePlaceholder")}
                  autoCapitalize="words"
                  placeholderTextColor="#8B8BAE"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("profile.email")}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholder={t("profile.emailPlaceholder")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#8B8BAE"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("profile.phone")}</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.input}
                  placeholder={t("profile.phonePlaceholder")}
                  keyboardType="phone-pad"
                  placeholderTextColor="#8B8BAE"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("profile.city")}</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  style={styles.input}
                  placeholder={t("profile.cityPlaceholder")}
                  placeholderTextColor="#8B8BAE"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  updateLoading && styles.disabled,
                ]}
                onPress={updateProfile}
                disabled={updateLoading}
                activeOpacity={0.8}
              >
                {updateLoading ? (
                  <ActivityIndicator color={NAVY} />
                ) : (
                  <Text style={styles.saveText}>
                    {t("common.saveChanges")}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════ */}
      {/* LANGUAGE MODAL                              */}
      {/* ══════════════════════════════════════════ */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderBar} />
                <View>
                  <Text style={styles.modalTitle}>
                    {t("profile.selectLanguage")}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {t("profile.languageSub")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setLanguageModalVisible(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <X size={20} color={NAVY} />
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
                      isActive && styles.languageRowActive,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => changeLanguage(lang.code)}
                  >
                    <Text
                      style={[
                        styles.languageRowText,
                        isActive && styles.languageRowTextActive,
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {isActive ? (
                      <View style={styles.languageCheckBox}>
                        <Check size={14} color={NAVY} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════ */}
      {/* LIKED PRODUCTS MODAL                        */}
      {/* ══════════════════════════════════════════ */}
      <Modal
        visible={likedModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLikedModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderBar} />
                <View>
                  <Text style={styles.modalTitle}>
                    {t("profile.likedProducts")}
                  </Text>
                  <Text style={styles.modalSubtitle}>
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
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <X size={20} color={NAVY} />
              </Pressable>
            </View>

            {likedLoading && likedProducts.length === 0 ? (
              <View style={styles.likedLoading}>
                <ActivityIndicator color={NAVY} />
                <Text style={styles.likedLoadingText}>
                  {t("common.loading")}
                </Text>
              </View>
            ) : likedProducts.length === 0 ? (
              <View style={styles.likedEmpty}>
                <View style={styles.likedEmptyIconBox}>
                  <Heart size={30} color="#DC2626" fill="#DC2626" />
                </View>
                <Text style={styles.likedEmptyTitle}>
                  {t("profile.noLikedYet")}
                </Text>
                <Text style={styles.likedEmptyText}>
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
  container: { flex: 1, backgroundColor: "#F0F0F7" },

  // FLOATING HEADER
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: NAVY,
    zIndex: 100,
    justifyContent: "flex-end",
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
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
    backgroundColor: LIME,
    marginRight: 10,
  },
  floatingHeaderText: {
    color: "#fff",
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
    backgroundColor: NAVY,
    opacity: 0.5,
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
    backgroundColor: "#fff",
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: -(AVATAR_SIZE / 2 + 10),
    paddingTop: AVATAR_SIZE / 2 + 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: NAVY,
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
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: NAVY,
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
    borderColor: "#fff",
  },

  cardName: {
    fontSize: 20,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.3,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 5,
    maxWidth: "90%",
  },
  cardEmail: { color: "#8B8BAE", fontSize: 13, fontWeight: "600" },

  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(185,250,60,0.15)",
    borderWidth: 1,
    borderColor: "rgba(185,250,60,0.4)",
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
    backgroundColor: "#7BCF00",
  },
  cityChipText: { color: NAVY, fontSize: 12.5, fontWeight: "700" },

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
    backgroundColor: "#F6F6FB",
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.06)",
    borderRadius: 14,
    paddingVertical: 12,
    gap: 5,
  },
  statNumber: { fontSize: 15, fontWeight: "800", color: NAVY },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#8B8BAE" },
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
    color: "#8B8BAE",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuItem: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.05)",
    position: "relative",
    overflow: "hidden",
  },
  menuAccentEdge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: LIME,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "rgba(4,0,69,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuTextBox: { flex: 1 },
  menuTitle: { fontSize: 15.5, fontWeight: "700", color: NAVY },
  menuSubtitle: {
    color: "#8B8BAE",
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "500",
  },
  menuChevron: {
    fontSize: 22,
    color: "#C5C5DD",
    fontWeight: "700",
    marginRight: 4,
  },

  // Language chip inside the menu item
  languageChip: {
    backgroundColor: "rgba(4,0,69,0.06)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  languageChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: NAVY,
  },

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
    backgroundColor: LIME,
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: "#8B8BAE",
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "500",
  },
  productsCountBadge: {
    backgroundColor: NAVY,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  productsCount: { fontSize: 15, fontWeight: "800", color: LIME },

  // HORIZONTAL MY PRODUCTS
  horizontalListContent: { paddingHorizontal: 16, paddingBottom: 6 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 18,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.05)",
  },
  productImageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  productImage: { width: "100%", height: "100%" },
  noImage: {
    flex: 1,
    backgroundColor: "#F0F0F7",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: { color: "#A0A0C0", fontWeight: "600", fontSize: 13 },
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
  productName: { fontSize: 14, fontWeight: "700", color: NAVY },
  productPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: NAVY,
    marginTop: 6,
  },
  productBottom: { marginTop: 10 },
  cityRow: { flexDirection: "row", alignItems: "center" },
  cityIconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LIME,
    marginRight: 6,
  },
  productCity: {
    color: "#8B8BAE",
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
    color: "#8B8BAE",
    marginRight: 4,
  },

  // EMPTY STATE
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 30,
  },
  emptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(4,0,69,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.06)",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: NAVY },
  emptyText: {
    color: "#8B8BAE",
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  emptyCta: {
    marginTop: 20,
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCtaText: { color: LIME, fontWeight: "700", fontSize: 14 },

  // LIKED PRODUCTS SECTION
  likedSectionWrapper: {
    paddingHorizontal: 16,
    marginTop: 26,
  },
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
    backgroundColor: "#DC2626",
    borderRadius: 2,
    marginRight: 12,
  },
  likedSectionCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.18)",
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
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.05)",
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
    backgroundColor: "#F0F0F7",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  likedPreviewThumbOverlap: {
    marginLeft: -14,
  },
  likedPreviewImage: { width: "100%", height: "100%" },
  likedPreviewNoImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E8F0",
  },
  likedPreviewMore: {
    backgroundColor: NAVY,
  },
  likedPreviewMoreText: {
    color: LIME,
    fontSize: 12,
    fontWeight: "900",
  },
  likedPreviewEmpty: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0F0F7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.06)",
  },
  likedPreviewSkeletonRow: {
    flexDirection: "row",
  },
  likedPreviewSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EAEAF2",
    marginRight: 6,
  },
  likedSectionTextBox: {
    flex: 1,
    justifyContent: "center",
  },
  likedSectionCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.2,
  },
  likedSectionCardSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#8B8BAE",
    marginTop: 3,
  },
  likedSectionArrowBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(4,0,69,0.04)",
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
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "rgba(220,38,38,0.18)",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexDirection: "row",
    gap: 8,
    shadowColor: NAVY,
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
    backgroundColor: "rgba(4,0,69,0.08)",
    marginTop: 20,
    marginBottom: 10,
  },
  versionText: { color: "#B0B0D0", fontSize: 12, fontWeight: "600" },

  // MODAL SHARED
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 0, 69, 0.6)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 50,
    maxHeight: "92%",
    shadowColor: NAVY,
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
    backgroundColor: LIME,
    borderRadius: 2,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    color: "#8B8BAE",
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(4,0,69,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: { backgroundColor: "rgba(4,0,69,0.1)" },

  // INPUT GROUP
  inputGroup: { position: "relative", marginBottom: 4 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 14,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    height: 54,
    borderWidth: 1.5,
    borderColor: "rgba(4,0,69,0.08)",
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: "#F8F8FC",
    fontSize: 15,
    color: NAVY,
    fontWeight: "600",
  },

  // SAVE / CANCEL
  saveButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    marginBottom: 14,
    flexDirection: "row",
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cancelButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#04045F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.06)",
  },
  cancelText: { color: "#B9FA3C", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },

  // LANGUAGE MODAL
  languageList: {
    marginTop: 4,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(4,0,69,0.06)",
    backgroundColor: "#F8F8FC",
    marginBottom: 10,
  },
  languageRowActive: {
    borderColor: NAVY,
    backgroundColor: "rgba(185,250,60,0.14)",
  },
  languageRowText: {
    fontSize: 16,
    fontWeight: "700",
    color: NAVY,
  },
  languageRowTextActive: {
    color: NAVY,
  },
  languageCheckBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: LIME,
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
  likedLoadingText: { color: "#8B8BAE", fontSize: 13, fontWeight: "600" },
  likedEmpty: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 30,
  },
  likedEmptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(220,38,38,0.06)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  likedEmptyTitle: { fontSize: 17, fontWeight: "800", color: NAVY },
  likedEmptyText: {
    color: "#8B8BAE",
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
    backgroundColor: "#F8F8FC",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.05)",
    alignItems: "center",
  },
  likedCardImageBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#EEE",
    marginRight: 12,
  },
  likedCardImage: { width: "100%", height: "100%" },
  likedCardInfo: { flex: 1, justifyContent: "center" },
  likedCardName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: NAVY,
    lineHeight: 19,
  },
  likedCardPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: NAVY,
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
    backgroundColor: "rgba(220,38,38,0.08)",
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