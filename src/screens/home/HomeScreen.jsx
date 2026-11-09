import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  Search,
  SlidersHorizontal,
  Menu,
  Layers,
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
  MapPin,
} from "lucide-react-native";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { media_URL } from "../../constants/config";
import NotificationBell from "../../components/NotificationBell";
import SearchModal from "../../components/SearchModal";
import BannerSlider from "./BannerSlider";

import backgroundimage from "../../../assets/images/imagesell.jpg";
import imageSell from "../../../assets/images/merchandiser.jpg";
import backgroundimage2 from "../../../assets/images/headerbg.jpg";

/* ──────────────────────────────────────────────────────────────
   Theme — fresh grocery UI
   ────────────────────────────────────────────────────────────── */
const PRIMARY = "#1DA058";
const PRIMARY_DARK = "#14784A";
const PRIMARY_DEEP = "#2D6D3B";
const MINT = "#E3F1DC";
const MINT_SOFT = "#EEF6EA";
const MINT_TINT = "#D6EBDD";

const PAGE_BG = "#FFFFFF";
const WHITE = "#FFFFFF";

const INK = "#14221A";
const INK_SOFT = "#3B4A41";
const MUTED = "#6F7D74";
const STRIKE = "#9CA8A1";
const BORDER = "rgba(20,34,26,0.07)";
const HAIRLINE = "rgba(20,34,26,0.10)";

const OFFER = "#F6C640";
const OFFER_INK = "#3A2A00";
const ONLINE = "#22C55E";

const LIME = "#B8E601";

const NAVY = "#14221A";
const AVATAR_ACCENT = "#D4FF3F";

/* Sticky header uses the top of the mint fade so it matches the gradient top */
const STICKY_BG = "#CFE8C6";

const PAGE_PADDING = 16;
const CARD_GAP = 12;
const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - PAGE_PADDING * 2 - CARD_GAP) / 2;
const CARD_IMAGE_H = Math.round(CARD_W * 0.82);

/* Scroll threshold to reveal the sticky bar */
const STICKY_THRESHOLD = 90;
const STICKY_HEIGHT = 64;

/* ── Eased gradient: soft mint → white, no visible band edges ── */
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `#${A.map((v, i) =>
    Math.round(v + (B[i] - v) * k)
      .toString(16)
      .padStart(2, "0")
  ).join("")}`;
};
const buildFade = (from, to, steps = 12) => {
  const colors = [];
  const locations = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const eased = t * t * (3 - 2 * t);
    colors.push(mix(from, to, eased));
    locations.push(t);
  }
  colors[steps] = to;
  return { colors, locations };
};
const HEADER_FADE = buildFade(STICKY_BG, PAGE_BG);

/* ── Helpers ── */
const getMediaUrl = (mediaItem) => {
  if (!mediaItem?.path) return null;
  const base = media_URL?.endsWith("/") ? media_URL.slice(0, -1) : media_URL || "";
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

const getCategoryImage = (cat) => {
  if (!cat?.icon) return null;
  const base = media_URL?.endsWith("/") ? media_URL.slice(0, -1) : media_URL || "";
  const path = cat.icon.startsWith("/") ? cat.icon.slice(1) : cat.icon;
  return `${base}/storage/${path}`;
};

const getCategoryIcon = (name, isAll) => {
  if (isAll) return Layers;
  const n = (name || "").toLowerCase();
  if (n.includes("electronic") || n.includes("phone") || n.includes("tech")) return Smartphone;
  if (n.includes("cloth") || n.includes("fashion") || n.includes("wear") || n.includes("shirt")) return Shirt;
  if (n.includes("home") || n.includes("furniture") || n.includes("house")) return Home;
  if (n.includes("sport") || n.includes("gym") || n.includes("fitness")) return Dumbbell;
  if (n.includes("book") || n.includes("edu")) return BookOpen;
  if (n.includes("vehicle") || n.includes("car") || n.includes("auto")) return Car;
  if (n.includes("watch") || n.includes("jewel")) return Watch;
  if (n.includes("bike") || n.includes("outdoor") || n.includes("cycle")) return Bike;
  if (n.includes("camera") || n.includes("photo")) return Camera;
  return Tag;
};

const getOldPrice = (p) =>
  Number(p?.old_price || p?.compare_price || p?.original_price || 0) || 0;

const getDiscountPct = (p) => {
  if (p?.discount_percent) return Math.round(Number(p.discount_percent));
  const old = getOldPrice(p);
  const cur = Number(p?.price || 0);
  if (old > cur && cur > 0) return Math.round(((old - cur) / old) * 100);
  return 0;
};

const toText = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object") return toText(v.name || v.title || v.city);
  return null;
};

const getCity = (p) =>
  toText(p?.city) ||
  toText(p?.city_name) ||
  toText(p?.location?.city) ||
  toText(p?.location) ||
  toText(p?.user?.city) ||
  toText(p?.seller?.city) ||
  null;

/* ── Section header ── */
function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity activeOpacity={0.7} onPress={onAction} hitSlop={8}>
        <Text style={styles.seeAll}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ── Category tile ── */
function CategoryTile({ item, isAll, selected, onPress }) {
  const [failed, setFailed] = useState(false);
  const image = isAll ? null : getCategoryImage(item);
  const Icon = getCategoryIcon(item.name, isAll);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.categoryTile}
    >
      <View style={[styles.categoryBox, selected && styles.categoryBoxActive]}>
        {image && !failed ? (
          <Image
            source={{ uri: image }}
            style={styles.fill}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.center, { backgroundColor: MINT_TINT }]}>
            <Icon size={24} color={PRIMARY_DARK} strokeWidth={2} />
          </View>
        )}
      </View>
      <Text
        style={[styles.categoryName, selected && styles.categoryNameActive]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
}

/* ── Product card ── */
function ProductCard({ item, onPress, t }) {
  const [failed, setFailed] = useState(false);
  const image = getFirstImage(item);
  const pct = getDiscountPct(item);
  const oldPrice = getOldPrice(item);
  const city = getCity(item);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.card}>
      <View style={styles.cardImageBox}>
        {image && !failed ? (
          <Image
            source={{ uri: image }}
            style={styles.fill}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.center, { backgroundColor: MINT_TINT }]}>
            <Camera size={28} color={PRIMARY_DARK} />
          </View>
        )}

        {pct > 0 ? (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>
              {pct}% {t("home.off", { defaultValue: "OFF" })}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price} numberOfLines={1}>
            {Number(item.price).toLocaleString()}{" "}
            <Text style={styles.priceCurrency}>{t("common.currency")}</Text>
          </Text>
          {oldPrice > Number(item.price) ? (
            <Text style={styles.oldPrice} numberOfLines={1}>
              {oldPrice.toLocaleString()}
            </Text>
          ) : null}
        </View>

        <View style={styles.locationChip}>
          <MapPin size={12} color={PRIMARY} strokeWidth={2.6} />
          <Text style={styles.locationText} numberOfLines={1}>
            {city || t("home.cityUnknown", { defaultValue: "City not set" })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ================================================================== */
/* Main screen                                                        */
/* ================================================================== */
export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { unreadCount, refresh: refreshNotifications } = useNotifications();
  const insets = useSafeAreaInsets();

  const slides = useMemo(
    () => [
      {
        key: "discover",
        image: backgroundimage2,
        eyebrow: t("home.discover"),
        title: t("home.discoverTitle"),
        cta: t("home.exploreNow"),
        route: "Explore",
      },
      {
        key: "sell",
        image: imageSell,
        eyebrow: t("home.sellFaster"),
        title: t("home.sellTitle"),
        cta: t("home.postAd"),
        route: "PostAd",
      },
      {
        key: "shop",
        image: backgroundimage,
        eyebrow: t("home.shopLocal"),
        title: t("home.shopTitle"),
        cta: t("home.browseDeals"),
        route: "Explore",
      },
    ],
    [t]
  );

  const sliderRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [stickyVisible, setStickyVisible] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/products");
      setProducts(response.data.products?.data || response.data.data || []);
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
      setCategories(response.data.categories || response.data.data || []);
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

  const categoryRail = useMemo(
    () => [{ id: "all", name: t("common.all") }, ...categories],
    [categories, t]
  );

  const bestSellers = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 10),
    [products]
  );

  const openProduct = (id) =>
    navigation.navigate("ProductDetails", { productId: id });

  const avatarUrl = user?.avatar_url || user?.avatar || user?.photo || null;
  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();

  const gridRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < bestSellers.length; i += 2)
      rows.push(bestSellers.slice(i, i + 2));
    return rows;
  }, [bestSellers]);

  /* Fade the sticky bar in as the user scrolls past the header identity row */
  const stickyOpacity = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD, STICKY_THRESHOLD + 40],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e) => {
        const y = e.nativeEvent.contentOffset.y;
        const shouldShow = y > STICKY_THRESHOLD;
        if (shouldShow !== stickyVisible) setStickyVisible(shouldShow);
      },
    }
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={() => sliderRef.current?.pause()}
        onMomentumScrollEnd={() => sliderRef.current?.resume()}
        onScrollEndDrag={() => sliderRef.current?.resume()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={HEADER_FADE.colors}
          locations={HEADER_FADE.locations}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 14 }]}
        >
          <View style={styles.headerTop}>
            <View style={styles.identityRow}>
              <View style={styles.avatarWrap}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.avatar, styles.center, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>

              <View style={styles.greetingBlock}>
                <Text style={styles.greetingSmall} numberOfLines={1}>
                  {t("home.welcomeBack")}
                </Text>
                <Text style={styles.greetingName} numberOfLines={1}>
                  {user?.name || t("home.there")}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <View style={styles.bellWrap}>
                <NotificationBell
                  unreadCount={unreadCount || 0}
                  iconColor={INK}
                  onPress={() =>
                    navigation.getParent()?.navigate("Notifications")
                  }
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => navigation.navigate("Settings")}
                style={styles.roundBtn}
                hitSlop={6}
              >
                <Menu size={20} color={INK} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.tagline} numberOfLines={1}>
            {t("products.discoverNear")}
          </Text>

          <View style={styles.search}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.searchInputArea}
              onPress={() => setSearchOpen(true)}
            >
              <Search size={19} color={INK_SOFT} strokeWidth={2.3} />
              <Text style={styles.searchText} numberOfLines={1}>
                {t("home.searchPlaceholder")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              hitSlop={8}
              style={styles.filterBtn}
              onPress={() => navigation.navigate("Explore")}
            >
              <SlidersHorizontal size={18} color={INK} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Promo banner ── */}
        <View style={styles.bannerWrap}>
          <BannerSlider
            ref={sliderRef}
            slides={slides}
            onCtaPress={(s) => s.route && navigation.navigate(s.route)}
          />
        </View>

        {/* ── Categories ── */}
        {catLoading && categories.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={PRIMARY} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            {categoryRail.map((item) => {
              const isAll = item.id === "all";
              return (
                <CategoryTile
                  key={`cat-${item.id}`}
                  item={item}
                  isAll={isAll}
                  selected={selectedCategoryId === item.id}
                  onPress={() => {
                    setSelectedCategoryId(item.id);
                    if (!isAll)
                      navigation.navigate("CategoryProducts", {
                        categoryName: item.name,
                      });
                  }}
                />
              );
            })}
          </ScrollView>
        )}

        {/* ── Best sellers ── */}
        <SectionHeader
          title={t("home.bestSellers", { defaultValue: "Best sellers" })}
          actionLabel={t("home.seeAll", { defaultValue: "See all" })}
          onAction={() => navigation.navigate("Explore")}
        />

        {loading && products.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={PRIMARY} />
        ) : bestSellers.length > 0 ? (
          <View style={styles.grid}>
            {gridRows.map((row, i) => (
              <View key={`row-${i}`} style={styles.gridRow}>
                {row.map((item) => (
                  <ProductCard
                    key={`bs-${item.id}`}
                    item={item}
                    t={t}
                    onPress={() => openProduct(item.id)}
                  />
                ))}
                {row.length === 1 ? <View style={styles.cardSpacer} /> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t("home.noProductsYet")}</Text>
        )}
      </Animated.ScrollView>

      {/* ── Sticky bar — user info + action buttons on solid header bg ── */}
      <Animated.View
        pointerEvents={stickyVisible ? "auto" : "none"}
        style={[
          styles.stickyBar,
          {
            paddingTop: insets.top + 6,
            opacity: stickyOpacity,
          },
        ]}
      >
        <View style={styles.stickyInner}>
          <View style={styles.identityRow}>
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.center, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>

            <View style={styles.greetingBlock}>
              <Text style={styles.greetingSmall} numberOfLines={1}>
                {t("home.welcomeBack")}
              </Text>
              <Text style={styles.greetingName} numberOfLines={1}>
                {user?.name || t("home.there")}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.bellWrap}>
              <NotificationBell
                unreadCount={unreadCount || 0}
                iconColor={INK}
                onPress={() =>
                  navigation.getParent()?.navigate("Notifications")
                }
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.navigate("Settings")}
              style={styles.roundBtn}
              hitSlop={6}
            >
              <Menu size={20} color={INK} strokeWidth={2.4} />
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
          openProduct(product.id);
        }}
      />
    </View>
  );
}

/* ================================================================== */
/* Styles                                                             */
/* ================================================================== */
const SOFT_SHADOW = {
  shadowColor: "#14221A",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
    overflow: "visible",
  },
  fill: { width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 1000,
    elevation: 0,
    overflow: "visible",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1001,
    overflow: "visible",
  },
  identityRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingEnd: 12,
  },
  avatarWrap: { width: 44, height: 44 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: WHITE,
  },
  avatarFallback: { backgroundColor: NAVY },
  avatarInitial: {
    color: AVATAR_ACCENT,
    fontSize: 18,
    fontWeight: "900",
  },
  onlineDot: {
    position: "absolute",
    end: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: ONLINE,
    borderWidth: 2,
    borderColor: WHITE,
  },
  greetingBlock: { flex: 1 },
  greetingSmall: {
    color: MUTED,
    fontSize: 12.5,
    fontWeight: "600",
  },
  greetingName: {
    color: INK,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  tagline: {
    color: INK,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 1002,
    elevation: 20,
    overflow: "visible",
  },

  /* Bell — white pill + raised stack for tooltip */
  bellWrap: {
    width: 42,
    height: 42,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    ...SOFT_SHADOW,
    zIndex: 1003,
    elevation: 21,
    overflow: "visible",
  },

  /* Menu button — same white pill */
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    ...SOFT_SHADOW,
  },

  /* Search */
  search: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    marginTop: 16,
    paddingStart: 16,
    paddingEnd: 6,
    borderRadius: 26,
    backgroundColor: WHITE,
    boxShadow: "0px 3px 10px rgba(20, 34, 26, 0.18)",
  },
  searchInputArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: "100%",
  },
  searchText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "500",
    color: MUTED,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LIME,
  },

  bannerWrap: { backgroundColor: PAGE_BG },

  /* Sticky bar */
  stickyBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: STICKY_BG,
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 5000,
    elevation: 30,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(20,34,26,0.10)",
  },
  stickyInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: STICKY_HEIGHT - 10,
  },

  /* Categories */
  categoryList: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 18,
    paddingBottom: 2,
    gap: 14,
  },
  categoryTile: { width: 72, alignItems: "center" },
  categoryBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: WHITE,
    ...SOFT_SHADOW,
  },
  categoryBoxActive: { borderColor: PRIMARY },
  categoryName: {
    marginTop: 8,
    maxWidth: 78,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    color: INK_SOFT,
  },
  categoryNameActive: { color: PRIMARY_DARK },

  /* Sections */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAGE_PADDING,
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: INK,
  },
  seeAll: { fontSize: 13, fontWeight: "800", color: PRIMARY },

  /* Product grid */
  grid: { paddingHorizontal: PAGE_PADDING },
  gridRow: { flexDirection: "row", gap: CARD_GAP, marginBottom: CARD_GAP },
  cardSpacer: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    ...SOFT_SHADOW,
  },
  cardImageBox: {
    width: "100%",
    height: CARD_IMAGE_H,
    backgroundColor: MINT_SOFT,
  },
  offerBadge: {
    position: "absolute",
    top: 10,
    start: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: OFFER,
  },
  offerText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: OFFER_INK,
    letterSpacing: 0.2,
  },
  cardBody: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: INK,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  price: { fontSize: 17, fontWeight: "900", color: INK, letterSpacing: -0.3 },
  priceCurrency: { fontSize: 11.5, fontWeight: "700", color: INK_SOFT },
  oldPrice: {
    fontSize: 11.5,
    fontWeight: "600",
    color: STRIKE,
    textDecorationLine: "line-through",
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    gap: 4,
    marginTop: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: MINT_SOFT,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: "700",
    color: PRIMARY_DARK,
  },

  emptyText: {
    textAlign: "center",
    paddingVertical: 28,
    fontSize: 14,
    fontWeight: "600",
    color: MUTED,
  },
  loader: { marginVertical: 24 },
});