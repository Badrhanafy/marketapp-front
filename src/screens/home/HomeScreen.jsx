import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { getToken } from "../../storage/token";
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
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import RateUsScreen from "../../components/RateUsScreen";
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
  Layers,
  Map,
  Navigation,
  Store,
} from "lucide-react-native";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { media_URL } from "../../constants/config";
import NotificationBell from "../../components/NotificationBell";
import SearchModal from "../../components/SearchModal";

import backgroundimage from "../../../assets/images/imagesell.jpg";
import imageSell from "../../../assets/images/merchandiser.jpg";
import backgroundimage2 from "../../../assets/images/headerbg.jpg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 260;

// ---------- Theme ----------
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#ECFDF5";
const SLATE = "#0F172A";
const MUTED = "#64748B";
const INACTIVE = "#94A3B8";
const WHITE = "#FFFFFF";
const BG = "#F8FAFC";

// ---------- Green-family palette for categories ----------
const GREEN_SHADES = {
  forest: "#15803D",
  brand: "#16A34A",
  emerald: "#10B981",
  teal: "#14B8A6",
  mint: "#22C55E",
  sage: "#4ADE80",
  moss: "#166534",
};

// ---------- Slider constants ----------
const SLIDE_HEIGHT = 340;
const COLLAPSE_DISTANCE = 120;
const STICKY_HEIGHT = (StatusBar.currentHeight || 0) + 64;
const SLIDE_DURATION = 5000;
const TRANSITION = 650;
const LAAYOUNE = { latitude: 27.1536, longitude: -13.2033 };

// ---------- Search bar straddle geometry ----------
const SEARCH_BAR_HEIGHT = 52;
const SEARCH_BAR_HALF = SEARCH_BAR_HEIGHT / 2;

// ============================================================
// MAP HTML
// ============================================================
const buildLaayouneMapHtml = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-container { background: #E8EEF7; font-family: -apple-system, system-ui; }
    .pin {
      width: 30px; height: 30px; border-radius: 50%;
      background: ${GREEN}; border: 3px solid #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.28);
      display: flex; align-items: center; justify-content: center;
    }
    .pin-dot { width: 10px; height: 10px; border-radius: 50%; background: #fff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var map = L.map('map', {
        zoomControl: false, attributionControl: false,
        dragging: false, touchZoom: false, scrollWheelZoom: false,
        doubleClickZoom: false, boxZoom: false, keyboard: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      var ll = [${LAAYOUNE.latitude}, ${LAAYOUNE.longitude}];
      map.setView(ll, 12);
      var icon = L.divIcon({
        className: '',
        html: '<div class="pin"><div class="pin-dot"></div></div>',
        iconSize: [30, 30], iconAnchor: [15, 15],
      });
      L.marker(ll, { icon: icon, interactive: false }).addTo(map);
    })();
  </script>
</body>
</html>`;

// ============================================================
// SLIDES — every image slide must use a DISTINCT asset.
// Reusing the same `require` source in two overlapping
// Animated.Image layers breaks the crossfade on Android.
// ============================================================
const SLIDES = [
  {
    key: "sell",
    image: backgroundimage2,
    eyebrow: "SELL FASTER",
    title: "Sell what\nyou don't use",
    subtitle: "Turn unused items into cash in minutes.",
  },
  {
    key: "discover",
    image:imageSell, // ← imagesell.jpg, distinct from slide 1
    eyebrow: "DISCOVER",
    title: "Great deals,\nright nearby",
    subtitle: "Thousands of local listings added daily.",
  },
  {
    key: "map",
    type: "map",
    eyebrow: "NEAR YOU",
    title: "Find nearby\nproducts for sale",
    subtitle: "Tap to explore the map in Laayoune.",
  },
];

const IMAGE_SLIDES = SLIDES.filter((s) => s.type !== "map");

// ============================================================
// HOOK: useHeroSlider
// ------------------------------------------------------------
// Owns everything about the hero slider:
//   - active index + animated position (slideAnim)
//   - text fade in/out (textAnim)
//   - manual navigation (goToSlide)
//   - autoplay with cleanup
//
// The previous implementation drove Animated calls from inside
// a setState updater, which React can invoke twice and which
// desynced `slideAnim` from `activeSlide`. Here a single ref
// (activeRef) is the source of truth for both.
// ============================================================
function useHeroSlider(slideCount) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const activeRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (next) => {
      activeRef.current = next;

      // 1. Fade current text out
      Animated.timing(textAnim, {
        toValue: 0,
        duration: TRANSITION * 0.35,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start(() => {
        // 2. Swap content, then in parallel:
        //    crossfade the background + fade the text back in
        setActiveSlide(next);
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: next,
            duration: TRANSITION,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic),
          }),
          Animated.timing(textAnim, {
            toValue: 1,
            duration: TRANSITION * 0.6,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ]).start();
      });
    },
    [slideAnim, textAnim]
  );

  const goToSlide = useCallback(
    (index) => {
      const next = ((index % slideCount) + slideCount) % slideCount;
      if (next === activeRef.current) return;
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

  return { activeSlide, slideAnim, textAnim, goToSlide };
}

// ============================================================
// SCREEN
// ============================================================
export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { unreadCount, refresh: refreshNotifications } = useNotifications();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Slider — all state/logic lives in the hook
  const { activeSlide, slideAnim, textAnim, goToSlide } = useHeroSlider(
    SLIDES.length
  );
  const mapHtml = useMemo(() => buildLaayouneMapHtml(), []);

  // Scroll
  const scrollY = useRef(new Animated.Value(0)).current;

  const stickyBarOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const stickyContentOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_DISTANCE * 0.4, COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const stickyContentScale = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [0.94, 1],
    extrapolate: "clamp",
  });

  const sliderOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE * 0.9],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const sliderTranslateY = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [0, -24],
    extrapolate: "clamp",
  });

  // =========================
  // FETCH
  // =========================
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/products");
      const data = response.data.products?.data || response.data.data || [];
      setProducts(data);
    } catch (error) {
      console.log("HOME PRODUCTS ERROR:", error.response?.data || error.message);
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
      console.log("CATEGORIES ERROR:", error.response?.data || error.message);
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

  useEffect(() => {
    const showToken = async () => {
      const token = await getToken();
      console.log("🔐 HOME TOKEN:", token);
    };
    showToken();
  }, []);

  const getFirstImage = (product) => {
    const media = product?.media;
    if (!media || media.length === 0) return null;
    const first = media.find((m) => m.type === "image") || media[0];
    return getMediaUrl(first);
  };

  // =========================
  // GREEN-FAMILY CATEGORY META
  // =========================
  const getCategoryMeta = (name) => {
    const n = (name || "").toLowerCase();
    if (n.includes("electronic") || n.includes("phone") || n.includes("tech"))
      return { Icon: Smartphone, color: GREEN_SHADES.brand };
    if (n.includes("cloth") || n.includes("fashion") || n.includes("wear") || n.includes("shirt"))
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
  const mostViewed = useMemo(
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
    const { Icon, color } = getCategoryMeta(item.name);
    return (
      <TouchableOpacity
        style={styles.categoryTile}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("CategoryProducts", { categoryName: item.name })
        }
      >
        <View
          style={[
            styles.categoryCircle,
            { borderColor: color, backgroundColor: WHITE },
          ]}
        >
          <View
            style={[styles.categoryIconHalo, { backgroundColor: GREEN_TINT }]}
          />
          <Icon size={22} color={color} strokeWidth={2.2} />
        </View>
        <Text style={styles.categoryTileName} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProductCard = ({ item }) => {
    const image = getFirstImage(item);
    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("ProductDetails", { productId: item.id })
        }
      >
        <View style={styles.cardImageBox}>
          {image ? (
            <Image source={{ uri: image }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.noImage]}>
              <Camera size={24} color={INACTIVE} />
            </View>
          )}
          <View style={styles.viewsBadge}>
            <Eye size={12} color="#fff" />
            <Text style={styles.viewsText}>{item.views_count || 0}</Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardPrice}>
              {parseFloat(item.price).toFixed(item.price % 1 === 0 ? 0 : 2)} DH
            </Text>
            <View style={styles.cardCityRow}>
              <MapPin size={11} color={MUTED} />
              <Text style={styles.cardCity} numberOfLines={1}>
                {item.city}
              </Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.status === "available" ? GREEN : "#F59E0B" },
              ]}
            />
            <Text style={styles.cardStatus}>{item.status}</Text>
            <View style={styles.cardRating}>
              <Heart size={12} color={MUTED} />
              <Text style={styles.cardRatingText}>{item.likes_count || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTrendingCard = ({ item }) => {
    const image = getFirstImage(item);
    return (
      <TouchableOpacity
        style={styles.trendingCard}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("ProductDetails", { productId: item.id })
        }
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.trendingImage} resizeMode="cover" />
        ) : (
          <View style={[styles.trendingImage, styles.noImage]}>
            <Camera size={24} color={INACTIVE} />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(15,23,42,0.85)"]}
          style={styles.trendingOverlay}
          pointerEvents="none"
        />
        <View style={styles.trendingContent}>
          <Text style={styles.trendingName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.trendingRow}>
            <Text style={styles.trendingPrice}>
              {parseFloat(item.price).toFixed(0)} DH
            </Text>
            <View style={styles.trendingViews}>
              <Eye size={12} color="#fff" />
              <Text style={styles.trendingViewsText}>
                {item.views_count || 0}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // =========================
  // HERO SLIDER RENDER
  // =========================
  const currentSlide = SLIDES[activeSlide];
  const isMapSlide = currentSlide.type === "map";

  const handleSlidePress = () => {
    if (isMapSlide) navigation.navigate("Nearby");
  };

  // Crossfade layers: the ACTIVE image always sits on top (zIndex 2),
  // so the incoming slide fades IN over the outgoing one.
  const renderSlideBackgrounds = () =>
    IMAGE_SLIDES.map((slide, idx) => {
      const opacity = slideAnim.interpolate({
        inputRange: [idx - 1, idx, idx + 1],
        outputRange: [0, 1, 0],
        extrapolate: "clamp",
      });
      const isActive = idx === activeSlide;
      return (
        <Animated.Image
          key={slide.key}
          source={slide.image}
          fadeDuration={0} // ← disable Android's built-in fade so our opacity animation controls visibility
          style={[
            styles.headerBgImage,
            { opacity, zIndex: isActive ? 2 : 1 },
          ]}
          resizeMode="cover"
        />
      );
    });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  // =========================
  // RENDER
  // =========================
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* STICKY GREEN BAR */}
      <Animated.View
        style={[styles.stickyBar, { opacity: stickyBarOpacity }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.stickyContent,
            {
              opacity: stickyContentOpacity,
              transform: [{ scale: stickyContentScale }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.brandWrap}>
            <View style={styles.brandLogo}>
              <Navigation size={16} color={GREEN_DARK} strokeWidth={2.8} />
            </View>
            <Text style={styles.brandName}>
              Souk<Text style={styles.brandDot}>.</Text>
            </Text>
          </View>

          <View style={styles.stickyActions}>
            <TouchableOpacity
              style={styles.stickyIconBtn}
              activeOpacity={0.85}
              onPress={() => setSearchOpen(true)}
            >
              <Search size={18} color={WHITE} strokeWidth={2.6} />
            </TouchableOpacity>

            <View style={styles.bellWrapSticky}>
              <NotificationBell
                unreadCount={unreadCount || 0}
                onPress={() => navigation.getParent()?.navigate("Notifications")}
              />
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
            progressViewOffset={STICKY_HEIGHT}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* SLIDER HEADER + FLOATING SEARCH BAR */}
        <View style={styles.headerWrap}>
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: sliderOpacity,
                transform: [{ translateY: sliderTranslateY }],
              },
            ]}
          >
            {/* BACKGROUND LAYER */}
            <View style={styles.headerBgLayer} pointerEvents="none">
              <View style={styles.headerBgFallback} />

              {renderSlideBackgrounds()}

              <View
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: isMapSlide ? 1 : 0, zIndex: 3 },
                ]}
                pointerEvents="none"
              >
                <WebView
                  source={{ html: mapHtml, baseUrl: "https://localhost" }}
                  style={styles.mapWebview}
                  originWhitelist={["*"]}
                  scrollEnabled={false}
                  javaScriptEnabled
                  domStorageEnabled
                  androidLayerType="hardware"
                  pointerEvents="none"
                />
              </View>

              <LinearGradient
                colors={[
                  "rgba(22,163,74,0.10)",
                  "rgba(22,163,74,0.35)",
                  "rgba(15,23,42,0.88)",
                ]}
                locations={[0, 0.5, 1]}
                style={[StyleSheet.absoluteFill, { zIndex: 4 }]}
              />
            </View>

            {/* FOREGROUND CONTENT */}
            <View style={styles.headerContent}>
              {/* TOP BAR */}
              <View style={styles.topBar}>
                <View style={{ flex: 1 }} />

                <View style={styles.topBarActions}>
                  <TouchableOpacity
                    style={styles.iconChip}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("Nearby")}
                  >
                    <Map size={17} color={WHITE} strokeWidth={2.4} />
                  </TouchableOpacity>

                  <View style={styles.bellWrapHeader}>
                    <NotificationBell
                      unreadCount={unreadCount || 0}
                      onPress={() =>
                        navigation.getParent()?.navigate("Notifications")
                      }
                    />
                  </View>
                </View>
              </View>

              {/* SLIDE TEXT */}
              <TouchableOpacity
                activeOpacity={isMapSlide ? 0.85 : 1}
                onPress={handleSlidePress}
                style={styles.slideTextBlock}
              >
                <Animated.View style={{ opacity: textAnim }}>
                  <View style={styles.eyebrowPill}>
                    <View style={styles.eyebrowDot} />
                    <Text style={styles.eyebrowText}>{currentSlide.eyebrow}</Text>
                  </View>

                  <Text style={styles.slideTitle}>{currentSlide.title}</Text>

                  <Text style={styles.slideSubtitle}>
                    {currentSlide.subtitle}
                  </Text>

                  {isMapSlide && (
                    <View style={styles.mapCta}>
                      <Navigation size={14} color={GREEN_DARK} strokeWidth={2.6} />
                      <Text style={styles.mapCtaText}>Explore map</Text>
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>

              {/* INDICATORS */}
              <View style={styles.indicatorsRow}>
                {SLIDES.map((s, i) => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => goToSlide(i)}
                    activeOpacity={0.7}
                    hitSlop={6}
                    style={styles.indicatorTouch}
                  >
                    <View
                      style={[
                        styles.indicator,
                        i === activeSlide && styles.indicatorActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* FLOATING SEARCH BAR */}
          <Animated.View
            style={[
              styles.floatingSearchWrap,
              {
                opacity: sliderOpacity,
                transform: [{ translateY: sliderTranslateY }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.searchTrigger}
              activeOpacity={0.9}
              onPress={() => setSearchOpen(true)}
            >
              <Search size={18} color={MUTED} strokeWidth={2.4} />
              <Text style={styles.searchTriggerText}>
                Search products, brands...
              </Text>
              <View style={styles.searchFilterBtn}>
                <SlidersHorizontal size={16} color={WHITE} strokeWidth={2.6} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* CATEGORIES */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <Layers size={18} color={GREEN} strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
              <Text style={styles.seeAll}>See all</Text>
              <ChevronRight size={14} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>

        {catLoading && categories.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={GREEN} />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => `cat-${item.id}`}
            renderItem={renderCategory}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        )}

        {/* PROMO */}
        <TouchableOpacity style={styles.promoCard} activeOpacity={0.9}>
          <Image source={backgroundimage} style={styles.promoBgImage} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(15,23,42,0.88)", "rgba(15,23,42,0.35)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.promoOverlay}
          >
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Sell your items fast</Text>
              <Text style={styles.promoSub}>
                Post an ad in under 2 minutes in confidence and safety
              </Text>
              <TouchableOpacity style={styles.promoBtn}>
                <Text style={styles.promoBtnText}>Post Now</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* FRESH ARRIVALS */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <Store size={18} color={GREEN} strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>Fresh Arrivals</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
              <Text style={styles.seeAll}>See all</Text>
              <ChevronRight size={14} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={GREEN} />
        ) : freshArrivals.length > 0 ? (
          <FlatList
            data={freshArrivals}
            keyExtractor={(item) => `fa-${item.id}`}
            renderItem={renderTrendingCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
          />
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No new arrivals</Text>
          </View>
        )}

        {/* MOST VIEWED */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <TrendingUp size={18} color={GREEN} strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>Most Viewed</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
              <Text style={styles.seeAll}>See all</Text>
              <ChevronRight size={14} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={GREEN} />
        ) : mostViewed.length > 0 ? (
          <FlatList
            data={mostViewed}
            keyExtractor={(item) => `mv-${item.id}`}
            renderItem={renderProductCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No products yet</Text>
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* SEARCH MODAL */}
      <SearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
        categories={categories}
        onOpenProduct={(product) => {
          setSearchOpen(false);
          navigation.navigate("ProductDetails", { productId: product.id });
        }}
      />
      
    </View>
  );
}

// =====================================
// STYLES
// =====================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 40 },

  // ============================================================
  // STICKY BAR
  // ============================================================
  stickyBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: STICKY_HEIGHT,
    backgroundColor: GREEN,
    zIndex: 50,
    paddingTop: StatusBar.currentHeight || 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: GREEN_DARK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  stickyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  brandDot: { color: GREEN_SOFT },
  stickyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stickyIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellWrapSticky: {
    height: 42,
    minWidth: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  // ============================================================
  // SLIDER HEADER + FLOATING SEARCH BAR
  // ============================================================
  headerWrap: {
    position: "relative",
    zIndex: 10,
    marginBottom: SEARCH_BAR_HALF,
  },
  headerContainer: {
    position: "relative",
    height: SLIDE_HEIGHT,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    backgroundColor: SLATE,
    shadowColor: SLATE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },

  floatingSearchWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: -SEARCH_BAR_HALF,
    zIndex: 20,
  },

  headerBgLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  headerBgFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SLATE,
    zIndex: 0,
  },
  headerBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  mapWebview: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E8EEF7",
  },

  headerContent: {
    flex: 1,
    zIndex: 5,
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 18,
    justifyContent: "space-between",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 40,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellWrapHeader: {
    height: 40,
    minWidth: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // ----- SLIDE TEXT -----
  slideTextBlock: {
    marginTop: 2,
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 26,
  },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    marginBottom: 10,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN_SOFT,
  },
  eyebrowText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  slideTitle: {
    color: WHITE,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  slideSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    maxWidth: "92%",
  },
  mapCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: GREEN_SOFT,
  },
  mapCtaText: {
    color: GREEN_DARK,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  // ----- INDICATORS -----
  indicatorsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 0,
    marginBottom: 20,
  },
  indicatorTouch: { paddingVertical: 4 },
  indicator: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  indicatorActive: {
    width: 22,
    backgroundColor: GREEN_SOFT,
  },

  searchTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: WHITE,
    borderRadius: 18,
    height: SEARCH_BAR_HEIGHT,
    paddingLeft: 16,
    paddingRight: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  searchTriggerText: {
    flex: 1,
    color: MUTED,
    fontSize: 15,
    fontWeight: "600",
  },
  searchFilterBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // ============================================================
  // SECTIONS
  // ============================================================
  sectionPad: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 14,
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
    fontSize: 19,
    fontWeight: "800",
    color: SLATE,
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAll: { fontSize: 13, fontWeight: "700", color: GREEN },

  // ----- CATEGORIES -----
  categoryList: { paddingHorizontal: 20, gap: 10 },
  categoryTile: { width: 80, alignItems: "center", marginRight: 14 },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  categoryIconHalo: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    opacity: 0.9,
  },
  categoryTileName: {
    fontSize: 12,
    fontWeight: "800",
    color: SLATE,
    marginTop: 8,
    maxWidth: 80,
    textAlign: "center",
    letterSpacing: -0.1,
  },

  promoCard: {
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    height: 180,
    shadowColor: SLATE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  promoBgImage: { width: "100%", height: "100%", position: "absolute" },
  promoOverlay: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  promoContent: { gap: 6 },
  promoTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: WHITE,
    letterSpacing: -0.5,
  },
  promoSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
    marginBottom: 8,
  },
  promoBtn: {
    backgroundColor: GREEN,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignSelf: "flex-start",
    borderRadius: 10,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  promoBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  productList: { paddingHorizontal: 20, paddingBottom: 6 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: WHITE,
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: SLATE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
  },
  cardImageBox: { width: CARD_WIDTH, height: 170, position: "relative" },
  cardImage: { width: "100%", height: "100%" },
  viewsBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15,23,42,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  viewsText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cardInfo: { padding: 16 },
  cardName: { fontSize: 15, fontWeight: "800", color: SLATE },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  cardPrice: { fontSize: 16, fontWeight: "900", color: GREEN },
  cardCityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: "50%",
  },
  cardCity: { fontSize: 12, color: MUTED, fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.05)",
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  cardStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    textTransform: "capitalize",
    flex: 1,
  },
  cardRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  cardRatingText: { fontSize: 12, fontWeight: "700", color: MUTED },

  trendingList: { paddingHorizontal: 20, paddingBottom: 6 },
  trendingCard: {
    width: 200,
    height: 260,
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: SLATE,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
  },
  trendingImage: { width: "100%", height: "100%" },
  trendingOverlay: { ...StyleSheet.absoluteFillObject },
  trendingContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  trendingName: {
    fontSize: 15,
    fontWeight: "800",
    color: WHITE,
    lineHeight: 22,
    marginBottom: 8,
  },
  trendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendingPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: WHITE,
    backgroundColor: GREEN,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  trendingViews: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendingViewsText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  noImage: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: { paddingVertical: 30, alignItems: "center" },
  emptyText: { color: INACTIVE, fontSize: 14, fontWeight: "600" },
  loader: { marginVertical: 20 },
});
