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
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { getToken } from "../../storage/token";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  Search,
  MapPin,
  TrendingUp,
  Eye,
  Heart,
  SlidersHorizontal,
  Smartphone,
  Shirt,
  Home,
  Dumbbell,
  BookOpen,
  Car,
  Watch,
  Bike,
  Camera,
  Tag,
  ChevronRight,
  ArrowRight,
  Layers,
  Menu,
  Star,
  Store,
} from "lucide-react-native";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import { media_URL } from "../../constants/config";
import NotificationBell from "../../components/NotificationBell";
import SearchModal from "../../components/SearchModal";

import backgroundimage from "../../../assets/images/imagesell.jpg";
import imageSell from "../../../assets/images/merchandiser.jpg";
import backgroundimage2 from "../../../assets/images/headerbg.jpg";

const CARD_WIDTH = 168;

// ---------- Brand palette (shared between themes) ----------
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#ECFDF5";
const WHITE = "#FFFFFF";

const GREEN_SHADES = {
  forest: "#15803D",
  brand: "#16A34A",
  emerald: "#10B981",
  teal: "#14B8A6",
  mint: "#22C55E",
  sage: "#4ADE80",
  moss: "#166534",
};

// ---------- Hero slider constants ----------
const HERO_HEIGHT = 280;
const SLIDE_DURATION = 5000;
const FADE_OUT = 280;
const FADE_IN = 420;

// ---------- Sticky header constants ----------
const HEADER_HEIGHT_ESTIMATE = (StatusBar.currentHeight || 0) + 72;
const HEADER_COLLAPSE_RANGE = [50, 110];

// ============================================================
// HERO SLIDES — images only
// ============================================================
const SLIDES = [
  {
    key: "discover",
    image: backgroundimage2,
    badge: "DISCOVER",
    title: "Great deals,\nright nearby",
    subtitle: "Thousands of local listings added daily.",
    cta: "Explore Now",
    route: "Explore",
  },
  {
    key: "sell",
    image: imageSell,
    badge: "SELL FASTER",
    title: "Sell what\nyou don't use",
    subtitle: "Turn unused items into cash in minutes.",
    cta: "Post an ad",
    route: "PostAd",
  },
  {
    key: "shop",
    image: backgroundimage,
    badge: "SHOP LOCAL",
    title: "Buy with\nconfidence",
    subtitle: "Verified sellers, real photos, zero surprises.",
    cta: "Browse deals",
    route: "Explore",
  },
];

// ============================================================
// HOOK: useHeroSlider — fade out / swap / fade in
// ============================================================
function useHeroSlider(slideCount) {
  const [activeSlide, setActiveSlide] = useState(0);
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const activeRef = useRef(0);
  const timerRef = useRef(null);
  const animatingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (next) => {
      if (animatingRef.current) return;
      if (next === activeRef.current) return;
      animatingRef.current = true;

      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: FADE_OUT,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        activeRef.current = next;
        setActiveSlide(next);

        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: FADE_IN,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          animatingRef.current = false;
        });
      });
    },
    [bgOpacity]
  );

  const goToSlide = useCallback(
    (index) => {
      const next = ((index % slideCount) + slideCount) % slideCount;
      animateTo(next);
    },
    [slideCount, animateTo]
  );

  const startAutoPlay = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      animateTo((activeRef.current + 1) % slideCount);
    }, SLIDE_DURATION);
  }, [slideCount, animateTo, clearTimer]);

  useEffect(() => {
    startAutoPlay();
    return clearTimer;
  }, [startAutoPlay, clearTimer]);

  return {
    activeSlide,
    bgOpacity,
    goToSlide,
    pause: clearTimer,
    resume: startAutoPlay,
  };
}

// ============================================================
// ANIMATED TEXT — re-triggers on every slide change
// ============================================================
function SlideText({ slide, onCtaPress }) {
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    badgeAnim.setValue(0);
    titleAnim.setValue(0);
    subtitleAnim.setValue(0);
    ctaAnim.setValue(0);

    Animated.stagger(90, [
      Animated.timing(badgeAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ctaAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [slide.key]);

  const rise = (anim, distance = 22) => ({
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

  return (
    <View style={styles.heroTextBlock} pointerEvents="box-none">
      <Animated.View style={rise(badgeAnim, 12)}>
        <View style={[styles.heroBadge, { backgroundColor: WHITE }]}>
          <Star size={11} color={GREEN_DARK} fill={GREEN_DARK} />
          <Text style={[styles.heroBadgeText, { color: GREEN_DARK }]}>
            {slide.badge}
          </Text>
        </View>
      </Animated.View>

      <Animated.Text style={[styles.heroTitle, rise(titleAnim, 20)]}>
        {slide.title}
      </Animated.Text>

      <Animated.Text style={[styles.heroSubtitle, rise(subtitleAnim, 18)]}>
        {slide.subtitle}
      </Animated.Text>

      <Animated.View style={rise(ctaAnim, 24)}>
        <TouchableOpacity
          style={[styles.heroCta, { backgroundColor: GREEN }]}
          activeOpacity={0.88}
          onPress={onCtaPress}
        >
          <Text style={[styles.heroCtaText, { color: WHITE }]}>
            {slide.cta}
          </Text>
          <View style={[styles.heroCtaIcon, { backgroundColor: WHITE }]}>
            <ArrowRight size={13} color={GREEN_DARK} strokeWidth={2.8} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ============================================================
// USER AVATAR
// ============================================================
function UserAvatar({ user, size = 42, themeColors }) {
  const avatarUrl = user?.avatar_url || user?.avatar || user?.photo || null;
  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.avatarWrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: themeColors.shadow,
        },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: themeColors.primary,
              borderColor: themeColors.avatarRing,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarInitial,
              { fontSize: size * 0.42, color: WHITE },
            ]}
          >
            {initial}
          </Text>
        </View>
      )}
      <View
        style={[
          styles.avatarOnlineDot,
          {
            backgroundColor: GREEN_SHADES.mint,
            borderColor: themeColors.avatarRing,
          },
        ]}
      />
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { unreadCount, refresh: refreshNotifications } = useNotifications();
  const { colors, isDark } = useTheme();

  /*
  |--------------------------------------------------------------------------
  | Theme-driven inline colors
  |--------------------------------------------------------------------------
  */
  const themeColors = useMemo(
    () => ({
      primary: colors.primary,
      iconAccent: colors.icon,

      /* Surfaces */
      pageBg: colors.background,
      headerBg: colors.surface,
      cardBg: colors.surface,
      inputBg: colors.surface,
      categoryCircleBg: colors.surface,
      categoryCircleSelected: isDark
        ? "rgba(34,197,94,0.18)"
        : GREEN_SOFT,
      categoryCircleBorder: isDark
        ? colors.border
        : "rgba(15,23,42,0.06)",
      categoryCircleBorderSelected: isDark
        ? "rgba(34,197,94,0.4)"
        : GREEN_SOFT,

      /* Text */
      titleText: colors.text,
      bodyText: colors.textSecondary,
      mutedText: isDark ? "#94A3B8" : "#64748B",
      inactiveText: colors.inactive,

      /* Borders */
      border: colors.border,
      cardBorder: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(15,23,42,0.04)",
      cardFooterBorder: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(15,23,42,0.05)",

      /* Shadows */
      shadow: colors.text,

      /* Misc */
      avatarRing: isDark ? colors.surface : WHITE,
      statusBarStyle: isDark ? "light-content" : "dark-content",
    }),
    [colors, isDark]
  );

  const heroSlides = useMemo(
    () => [
      {
        key: "discover",
        image: backgroundimage2,
        badge: t("home.discover"),
        title: t("home.discoverTitle"),
        subtitle: t("home.discoverSubtitle"),
        cta: t("home.exploreNow"),
        route: "Explore",
      },
      {
        key: "sell",
        image: imageSell,
        badge: t("home.sellFaster"),
        title: t("home.sellTitle"),
        subtitle: t("home.sellSubtitle"),
        cta: t("home.postAd"),
        route: "PostAd",
      },
      {
        key: "shop",
        image: backgroundimage,
        badge: t("home.shopLocal"),
        title: t("home.shopTitle"),
        subtitle: t("home.shopSubtitle"),
        cta: t("home.browseDeals"),
        route: "Explore",
      },
    ],
    [t]
  );

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT_ESTIMATE);

  const { activeSlide, bgOpacity, goToSlide, pause, resume } =
    useHeroSlider(heroSlides.length);

  const currentSlide = heroSlides[activeSlide] || heroSlides[0];

  useEffect(() => {
    async function checkToken() {
      const token = await getToken();
      console.log(token);
    }
    checkToken();
  }, []);

  // =========================
  // STICKY HEADER — scroll-driven animation
  // =========================
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const headerShadowOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_RANGE[0]],
    outputRange: [0, 0.1],
    extrapolate: "clamp",
  });
  const headerElevation = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_RANGE[0]],
    outputRange: [0, 6],
    extrapolate: "clamp",
  });
  const avatarScale = scrollY.interpolate({
    inputRange: HEADER_COLLAPSE_RANGE,
    outputRange: [1, 0.86],
    extrapolate: "clamp",
  });

  // =========================
  // FETCH
  // =========================
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/products");
      const data =
        response.data.products?.data || response.data.data || [];
      setProducts(data);
    } catch (error) {
      console.log(
        "HOME PRODUCTS ERROR:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setCatLoading(true);
      const response = await api.get("/categories");
      const data = response.data.categories || response.data.data || [];
      setCategories(data);
    } catch (error) {
      console.log(
        "CATEGORIES ERROR:",
        error.response?.data || error.message
      );
    } finally {
      setCatLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
    fetchCategories();
    refreshNotifications?.();
  };

  // =========================
  // HELPERS
  // =========================
  const getMediaUrl = (mediaItem) => {
    if (!mediaItem?.path) return null;
    const base = media_URL?.endsWith("/")
      ? media_URL.slice(0, -1)
      : media_URL || "";
    const path = mediaItem.path.startsWith("/")
      ? mediaItem.path.slice(1)
      : mediaItem.path;
    return `${base}/storage/${path}`;
  };

  const getFirstImage = (product) => {
    const media = product?.media;
    if (!media || media.length === 0) return null;
    const first = media.find((m) => m.type === "image") || media[0];
    return getMediaUrl(first);
  };

  const getCategoryMeta = (name, isAll) => {
    if (isAll) return { Icon: Layers, color: GREEN_SHADES.brand };
    const n = (name || "").toLowerCase();
    if (n.includes("electronic") || n.includes("phone") || n.includes("tech"))
      return { Icon: Smartphone, color: GREEN_SHADES.brand };
    if (
      n.includes("cloth") ||
      n.includes("fashion") ||
      n.includes("wear") ||
      n.includes("shirt")
    )
      return { Icon: Shirt, color: GREEN_SHADES.emerald };
    if (n.includes("home") || n.includes("furniture") || n.includes("house"))
      return { Icon: Home, color: GREEN_SHADES.teal };
    if (n.includes("sport") || n.includes("gym") || n.includes("fitness"))
      return { Icon: Dumbbell, color: GREEN_SHADES.forest };
    if (n.includes("book") || n.includes("edu"))
      return { Icon: BookOpen, color: GREEN_SHADES.moss };
    if (n.includes("vehicle") || n.includes("car") || n.includes("auto"))
      return { Icon: Car, color: GREEN_SHADES.emerald };
    if (n.includes("watch") || n.includes("jewel"))
      return { Icon: Watch, color: GREEN_SHADES.mint };
    if (n.includes("bike") || n.includes("outdoor") || n.includes("cycle"))
      return { Icon: Bike, color: GREEN_SHADES.teal };
    if (n.includes("camera") || n.includes("photo"))
      return { Icon: Camera, color: GREEN_SHADES.sage };
    return { Icon: Tag, color: GREEN_SHADES.brand };
  };

  // =========================
  // DERIVED
  // =========================
  const categoryRail = useMemo(
    () => [{ id: "all", name: t("common.all") }, ...categories],
    [categories, t]
  );

  const topPicks = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 10),
    [products]
  );

  const freshArrivals = useMemo(
    () =>
      [...products]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10),
    [products]
  );

  // =========================
  // RENDERERS
  // =========================
  const renderCategory = ({ item }) => {
    const isAll = item.id === "all";
    const isSelected = selectedCategoryId === item.id;
    const { Icon, color } = getCategoryMeta(item.name, isAll);
    return (
      <TouchableOpacity
        style={styles.categoryTile}
        activeOpacity={0.75}
        onPress={() => {
          setSelectedCategoryId(item.id);
          if (!isAll) {
            navigation.navigate("CategoryProducts", {
              categoryName: item.name,
            });
          }
        }}
      >
        <View
          style={[
            styles.categoryCircle,
            {
              backgroundColor: isSelected
                ? themeColors.categoryCircleSelected
                : themeColors.categoryCircleBg,
              borderColor: isSelected
                ? themeColors.categoryCircleBorderSelected
                : themeColors.categoryCircleBorder,
            },
          ]}
        >
          <Icon
            size={22}
            color={isSelected ? themeColors.primary : color}
            strokeWidth={2.2}
          />
        </View>
        <Text
          style={[
            styles.categoryTileName,
            {
              color: isSelected
                ? themeColors.primary
                : themeColors.titleText,
            },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProductCard = ({ item }) => {
    const image = getFirstImage(item);
    const isAvailable = item.status === "available";
    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          {
            backgroundColor: themeColors.cardBg,
            borderColor: themeColors.cardBorder,
            shadowColor: themeColors.shadow,
          },
        ]}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("ProductDetails", { productId: item.id })
        }
      >
        <View style={styles.cardImageBox}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.cardImage,
                styles.noImage,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Camera size={22} color={themeColors.inactiveText} />
            </View>
          )}

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isAvailable
                  ? "rgba(21,128,61,0.85)"
                  : "rgba(15,23,42,0.65)",
              },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: WHITE }]}>
              {item.status}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.favBtn,
              {
                backgroundColor: isDark
                  ? "rgba(15,23,42,0.85)"
                  : "rgba(255,255,255,0.92)",
              },
            ]}
            activeOpacity={0.8}
            hitSlop={6}
          >
            <Heart
              size={15}
              color={themeColors.primary}
              strokeWidth={2.4}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardName, { color: themeColors.titleText }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.cardCategory, { color: themeColors.mutedText }]}
            numberOfLines={1}
          >
            {item.category?.name || item.city}
          </Text>

          <View style={styles.specRow}>
            <View style={styles.specItem}>
              <MapPin size={11} color={themeColors.mutedText} />
              <Text
                style={[styles.specText, { color: themeColors.mutedText }]}
                numberOfLines={1}
              >
                {item.city}
              </Text>
            </View>
            <View style={styles.specItem}>
              <Eye size={11} color={themeColors.mutedText} />
              <Text
                style={[styles.specText, { color: themeColors.mutedText }]}
              >
                {item.views_count || 0}
              </Text>
            </View>
            <View style={styles.specItem}>
              <Heart size={11} color={themeColors.mutedText} />
              <Text
                style={[styles.specText, { color: themeColors.mutedText }]}
              >
                {item.likes_count || 0}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.cardFooter,
              { borderTopColor: themeColors.cardFooterBorder },
            ]}
          >
            <Text
              style={[styles.cardPrice, { color: themeColors.primary }]}
              numberOfLines={1}
            >
              {parseFloat(item.price).toFixed(
                item.price % 1 === 0 ? 0 : 2
              )}{" "}
              {t("common.currency")}
            </Text>
            <TouchableOpacity
              style={[
                styles.cardArrowBtn,
                { backgroundColor: themeColors.primary },
              ]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("ProductDetails", {
                  productId: item.id,
                })
              }
            >
              <ArrowRight size={15} color={WHITE} strokeWidth={2.6} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // =========================
  // HERO handlers
  // =========================
  const handleCtaPress = () => {
    if (currentSlide.route) navigation.navigate(currentSlide.route);
  };

  const handleDotPress = (i) => {
    pause();
    goToSlide(i);
    resume();
  };

  // =========================
  // RENDER
  // =========================
  return (
    <View
      style={[styles.container, { backgroundColor: themeColors.pageBg }]}
    >
      <StatusBar
        barStyle={themeColors.statusBarStyle}
        backgroundColor={themeColors.headerBg}
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight, paddingBottom: 24 },
        ]}
      >
        {/* HERO SLIDER */}
        <View style={styles.heroWrap}>
          <View
            style={[
              styles.heroCard,
              { shadowColor: themeColors.shadow },
            ]}
          >
            <Animated.View
              style={[styles.heroBgLayer, { opacity: bgOpacity }]}
              pointerEvents="none"
            >
              <Image
                source={currentSlide.image}
                style={styles.heroBgImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={[
                  "rgba(15,23,42,0.05)",
                  "rgba(15,23,42,0.35)",
                  "rgba(15,23,42,0.80)",
                ]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <SlideText slide={currentSlide} onCtaPress={handleCtaPress} />

            <View style={styles.dotsRow}>
              {SLIDES.map((s, i) => (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => handleDotPress(i)}
                  activeOpacity={0.7}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: "rgba(255,255,255,0.5)" },
                      i === activeSlide && [
                        styles.dotActive,
                        { backgroundColor: GREEN },
                      ],
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* SEARCH + FILTER */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={[
              styles.searchTrigger,
              {
                backgroundColor: themeColors.inputBg,
                shadowColor: themeColors.shadow,
              },
            ]}
            activeOpacity={0.9}
            onPress={() => setSearchOpen(true)}
          >
            <Search
              size={18}
              color={themeColors.mutedText}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.searchTriggerText,
                { color: themeColors.mutedText },
              ]}
            >
              {t("home.searchPlaceholder")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: themeColors.primary,
                shadowColor: themeColors.shadow,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => setSearchOpen(true)}
          >
            <SlidersHorizontal size={17} color={WHITE} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        {/* CATEGORIES */}
        {catLoading && categories.length === 0 ? (
          <ActivityIndicator
            style={styles.loader}
            color={themeColors.primary}
          />
        ) : (
          <FlatList
            data={categoryRail}
            keyExtractor={(item) => `cat-${item.id}`}
            renderItem={renderCategory}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        )}

        {/* TOP PICKS */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <TrendingUp
                size={18}
                color={themeColors.primary}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: themeColors.titleText },
                ]}
              >
                {t("home.topPicks")}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.seeAllBtn}
            >
              <Text
                style={[
                  styles.seeAll,
                  { color: themeColors.primary },
                ]}
              >
                {t("home.viewAll")}
              </Text>
              <ChevronRight
                size={14}
                color={themeColors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator
            style={styles.loader}
            color={themeColors.primary}
          />
        ) : topPicks.length > 0 ? (
          <FlatList
            data={topPicks}
            keyExtractor={(item) => `tp-${item.id}`}
            renderItem={renderProductCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        ) : (
          <View style={styles.emptyBox}>
            <Text
              style={[
                styles.emptyText,
                { color: themeColors.inactiveText },
              ]}
            >
              {t("home.noProductsYet")}
            </Text>
          </View>
        )}

        {/* PROMO */}
        <TouchableOpacity
          style={[
            styles.promoCard,
            { shadowColor: themeColors.shadow },
          ]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("PostAd")}
        >
          <Image
            source={backgroundimage}
            style={styles.promoBgImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              "rgba(15,23,42,0.9)",
              "rgba(15,23,42,0.55)",
              "rgba(15,23,42,0.05)",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.promoOverlay}
          >
            <View style={styles.promoContent}>
              <Text
                style={[styles.promoEyebrow, { color: GREEN_SOFT }]}
              >
                {t("home.promoEyebrow")}
              </Text>
              <Text style={[styles.promoTitle, { color: WHITE }]}>
                {t("home.promoTitle")}
              </Text>
              <Text style={[styles.promoSub, { color: "rgba(255,255,255,0.82)" }]}>
                {t("home.promoSub")}
              </Text>
              <TouchableOpacity
                style={styles.promoBtn}
                onPress={() => navigation.navigate("PostAd")}
              >
                <Text
                  style={[styles.promoBtnText, { color: WHITE }]}
                >
                  {t("home.discoverMore")}
                </Text>
                <View
                  style={[
                    styles.promoBtnIcon,
                    { backgroundColor: themeColors.primary },
                  ]}
                >
                  <ArrowRight size={13} color={WHITE} strokeWidth={2.8} />
                </View>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* FRESH ARRIVALS */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <Store
                size={18}
                color={themeColors.primary}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: themeColors.titleText },
                ]}
              >
                {t("home.freshArrivals")}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.seeAllBtn}
            >
              <Text
                style={[
                  styles.seeAll,
                  { color: themeColors.primary },
                ]}
              >
                {t("home.viewAll")}
              </Text>
              <ChevronRight
                size={14}
                color={themeColors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator
            style={styles.loader}
            color={themeColors.primary}
          />
        ) : freshArrivals.length > 0 ? (
          <FlatList
            data={freshArrivals}
            keyExtractor={(item) => `fa-${item.id}`}
            renderItem={renderProductCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        ) : (
          <View style={styles.emptyBox}>
            <Text
              style={[
                styles.emptyText,
                { color: themeColors.inactiveText },
              ]}
            >
              {t("home.noNewArrivals")}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* STICKY HEADER */}
      <Animated.View
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        style={[
          styles.stickyHeader,
          {
            backgroundColor: themeColors.headerBg,
            shadowColor: themeColors.shadow,
            shadowOpacity: headerShadowOpacity,
            elevation: headerElevation,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.identityGroup}>
            <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
              <UserAvatar user={user} themeColors={themeColors} />
            </Animated.View>
            <View style={styles.greetingBlock}>
              <Text
                style={[
                  styles.greetingSmall,
                  { color: themeColors.mutedText },
                ]}
                numberOfLines={1}
              >
                {t("home.welcomeBack")}
              </Text>
              <Text
                style={[
                  styles.greetingTitle,
                  { color: themeColors.titleText },
                ]}
                numberOfLines={1}
              >
                {user?.name || t("home.there")}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.iconSquareBtn}>
              <NotificationBell
                unreadCount={unreadCount || 0}
                iconColor={themeColors.primary}
                onPress={() =>
                  navigation.getParent()?.navigate("Notifications")
                }
              />
            </View>
            <TouchableOpacity              style={styles.iconSquareBtn}
              activeOpacity={0.6}
              onPress={() => navigation.navigate("Settings")}
            >
              <Menu
                size={22}
                color={themeColors.primary}
                strokeWidth={2.4}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <SearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
        categories={categories}
        onOpenProduct={(product) => {
          setSearchOpen(false);
          navigation.navigate("ProductDetails", {
            productId: product.id,
          });
        }}
      />
    </View>
  );
}

// =====================================
// STYLES  (structural only — colors inline)
// =====================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // HEADER
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 14,
    paddingBottom: 16,
    gap: 12,
    position: "relative",
  },
  identityGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconSquareBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingBlock: { flex: 1 },
  greetingSmall: { fontSize: 12, fontWeight: "600" },
  greetingTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },

  // AVATAR
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarInitial: {
    fontWeight: "900",
  },
  avatarOnlineDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },

  // ── HERO ──
  heroWrap: { paddingHorizontal: 20, marginBottom: 18 },
  heroCard: {
    position: "relative",
    height: HERO_HEIGHT,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  heroBgLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  heroBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  heroTextBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 20,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 8,
    maxWidth: "85%",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
    marginBottom: 16,
    maxWidth: "85%",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingLeft: 16,
    paddingRight: 6,
    height: 40,
    borderRadius: 20,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroCtaText: { fontSize: 13, fontWeight: "800" },
  heroCtaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  dotsRow: {
    position: "absolute",
    right: 16,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    zIndex: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: { width: 16 },

  // SEARCH
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchTrigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },

  // CATEGORIES
  categoryList: { paddingHorizontal: 20, gap: 10, paddingBottom: 4 },
  categoryTile: { width: 76, alignItems: "center", marginRight: 12 },
  categoryCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTileName: {
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 8,
    maxWidth: 76,
    textAlign: "center",
    letterSpacing: -0.1,
  },

  // SECTIONS
  sectionPad: {
    paddingHorizontal: 20,
    marginTop: 26,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAll: { fontSize: 13, fontWeight: "700" },

  // CARDS
  productList: { paddingHorizontal: 20, paddingBottom: 6 },
  productCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    marginRight: 12,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
  },
  cardImageBox: { width: CARD_WIDTH, height: 128, position: "relative" },
  cardImage: { width: "100%", height: "100%" },
  statusBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  favBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { padding: 12 },
  cardName: { fontSize: 14, fontWeight: "800" },
  cardCategory: { fontSize: 11.5, fontWeight: "600", marginTop: 2 },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 1,
  },
  specText: { fontSize: 10.5, fontWeight: "700" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cardPrice: {
    fontSize: 14.5,
    fontWeight: "900",
    flexShrink: 1,
  },
  cardArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // PROMO
  promoCard: {
    marginTop: 4,
    marginHorizontal: 20,
    borderRadius: 22,
    overflow: "hidden",
    height: 200,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  promoBgImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  promoOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  promoContent: { gap: 4, maxWidth: "78%" },
  promoEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  promoTitle: {
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 25,
    letterSpacing: -0.4,
  },
  promoSub: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 6,
    marginBottom: 12,
  },
  promoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingLeft: 14,
    paddingRight: 6,
    height: 36,
    borderRadius: 18,
  },
  promoBtnText: { fontSize: 12.5, fontWeight: "800" },
  promoBtnIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  noImage: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: { paddingVertical: 30, alignItems: "center" },
  emptyText: { fontSize: 14, fontWeight: "600" },
  loader: { marginVertical: 20 },
});