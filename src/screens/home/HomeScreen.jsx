import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  memo,
  forwardRef,
  useImperativeHandle,
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
  FlatList,
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
  Star,
  ChevronRight,
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
   Theme
   ────────────────────────────────────────────────────────────── */
const PRIMARY = "#B8E601";
const PRIMARY_DARK = "#99BF00";
const PRIMARY_DEEP = "#789600";
const MINT_SOFT = "#F7FBE8";
const MINT_TINT = "#E9F3C1";

const PAGE_BG = "#FBFCF6";
const WHITE = "#FFFFFF";

const INK = "#14221A";
const INK_SOFT = "#3B4A41";
const MUTED = "#6F7D74";
const BORDER = "rgba(20,34,26,0.07)";

const ONLINE = "#22C55E";
const ACCENT = "#B8E601";
const NAVY = "#14221A";

const STICKY_BG = "#E6F29A";

const PAGE_PADDING = 16;
const SCREEN_W = Dimensions.get("window").width;

/* Carousel card geometry (fixed → FlatList can skip measuring) */
const CARD_W = Math.round(SCREEN_W * 0.56);
const CARD_GAP = 14;
const CARD_SNAP = CARD_W + CARD_GAP;

const STICKY_THRESHOLD = 90;
const STICKY_HEIGHT = 64;
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/* ── Eased gradient (computed once at module load) ── */
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
const TILE_FADE = ["rgba(0,0,0,0)", "rgba(0,0,0,0.78)"];
const TILE_FADE_LOCATIONS = [0, 1];

/* ── Helpers ── */
const cleanBase = () =>
  media_URL?.endsWith("/") ? media_URL.slice(0, -1) : media_URL || "";

const getMediaUrl = (mediaItem) => {
  if (!mediaItem?.path) return null;
  const path = mediaItem.path.startsWith("/")
    ? mediaItem.path.slice(1)
    : mediaItem.path;
  return `${cleanBase()}/storage/${path}`;
};

const getFirstImage = (product) => {
  const media = product?.media;
  if (!media || media.length === 0) return null;
  const first = media.find((m) => m.type === "image") || media[0];
  return getMediaUrl(first);
};

const getCategoryImage = (cat) => {
  if (!cat?.icon) return null;
  const path = cat.icon.startsWith("/") ? cat.icon.slice(1) : cat.icon;
  return `${cleanBase()}/storage/${path}`;
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

/**
 * Pre-compute everything a card needs ONCE per product (not on every render),
 * so cards are pure/memoized and scrolling never re-runs this work.
 */
const normalizeProduct = (p) => {
  const createdAt = p?.created_at ? new Date(p.created_at).getTime() : 0;
  const price = Number(p?.price || 0);
  return {
    id: p.id,
    name: p.name,
    image: getFirstImage(p),
    price,
    priceText: price.toLocaleString(),
    pct: getDiscountPct(p),
    city: getCity(p),
    category: toText(p?.category),
    views: p?.views_count || 0,
    createdAt: Number.isFinite(createdAt) ? createdAt : 0,
    isNew: createdAt > 0 && Date.now() - createdAt < NEW_WINDOW_MS,
  };
};

/* ================================================================== */
/* Small memoized building blocks                                     */
/* ================================================================== */

/* Section header: title + subtitle on the left, lime "See all" pill on the right */
const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTexts}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onAction}
        hitSlop={8}
        style={styles.seeAllPill}
      >
        <Text style={styles.seeAllText}>{actionLabel}</Text>
        <ChevronRight size={16} color={INK} strokeWidth={2.6} />
      </TouchableOpacity>
    </View>
  );
});

/* Category tile — no shadow; selection is shown with a ring only */
const CategoryTile = memo(function CategoryTile({ item, isAll, selected, onSelect }) {
  const [failed, setFailed] = useState(false);
  const image = isAll ? null : getCategoryImage(item);
  const Icon = getCategoryIcon(item.name, isAll);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onSelect(item)}
      style={styles.categoryTile}
    >
      <View style={[styles.categoryBox, selected && styles.categoryBoxActive]}>
        {image && !failed ? (
          <Image
            source={{ uri: image }}
            style={styles.fill}
            resizeMode="cover"
            resizeMethod="resize"
            fadeDuration={0}
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
});

/* Borderless product card (image tile + gradient price overlay + chip + text) */
const ProductCard = memo(function ProductCard({ item, onPress, labels }) {
  const [failed, setFailed] = useState(false);

  const chip = item.isNew
    ? { icon: "star", text: labels.new }
    : item.pct > 0
    ? { icon: "tag", text: `-${item.pct}%` }
    : null;

  const meta = [item.city, item.category].filter(Boolean).join(" · ");

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item.id)}
      style={styles.card}
    >
      <View style={styles.tile}>
        {item.image && !failed ? (
          <Image
            source={{ uri: item.image }}
            style={styles.fill}
            resizeMode="cover"
            resizeMethod="resize"
            fadeDuration={0}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.center, { backgroundColor: MINT_TINT }]}>
            <Camera size={32} color={PRIMARY_DARK} />
          </View>
        )}

        <LinearGradient
          pointerEvents="none"
          colors={TILE_FADE}
          locations={TILE_FADE_LOCATIONS}
          style={styles.tileFade}
        />

        <View style={styles.tileText} pointerEvents="none">
          <Text style={styles.tileLabel} numberOfLines={1}>
            {item.pct > 0 ? `${item.pct}% ${labels.off}` : labels.price}
          </Text>
          <Text style={styles.tilePrice} numberOfLines={1}>
            {item.priceText} {labels.currency}
          </Text>
        </View>
      </View>

      {chip ? (
        <View style={styles.chip}>
          {chip.icon === "star" ? (
            <Star size={14} color={PRIMARY_DEEP} fill={PRIMARY_DEEP} strokeWidth={2} />
          ) : (
            <Tag size={14} color={PRIMARY_DEEP} strokeWidth={2.4} />
          )}
          <Text style={styles.chipText}>{chip.text}</Text>
        </View>
      ) : (
        <View style={styles.chipSpacer} />
      )}

      <Text style={styles.cardName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {meta || labels.cityUnknown}
      </Text>
    </TouchableOpacity>
  );
});

const CardSeparator = () => <View style={styles.cardSeparator} />;

/* Horizontal virtualised carousel — only a few cards are mounted at a time */
const ProductCarousel = memo(function ProductCarousel({ data, labels, onPressItem }) {
  const renderItem = useCallback(
    ({ item }) => <ProductCard item={item} labels={labels} onPress={onPressItem} />,
    [labels, onPressItem]
  );
  const keyExtractor = useCallback((item) => String(item.id), []);
  const getItemLayout = useCallback(
    (_, index) => ({ length: CARD_SNAP, offset: CARD_SNAP * index, index }),
    []
  );

  return (
    <FlatList
      data={data}
      horizontal
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      ItemSeparatorComponent={CardSeparator}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContent}
      snapToInterval={CARD_SNAP}
      snapToAlignment="start"
      decelerationRate="fast"
      nestedScrollEnabled
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={3}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews
    />
  );
});

/* Lightweight static placeholders (no spinners, no animation → zero cost) */
const CarouselSkeleton = memo(function CarouselSkeleton() {
  return (
    <View style={styles.skeletonRow}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonTile} />
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonLine} />
        </View>
      ))}
    </View>
  );
});

/* Identity (avatar + greeting) — shared by the header and the sticky bar */
const IdentityRow = memo(function IdentityRow({ avatarUrl, initial, name, welcome }) {
  return (
    <View style={styles.identityRow}>
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, styles.center, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={styles.onlineDot} />
      </View>

      <View style={styles.greetingBlock}>
        <Text style={styles.greetingSmall} numberOfLines={1}>
          {welcome}
        </Text>
        <Text style={styles.greetingName} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
});

/* Bell + menu buttons — shared by the header and the sticky bar */
const HeaderActions = memo(function HeaderActions({ unreadCount, onBell, onMenu }) {
  return (
    <View style={styles.headerActions}>
      <View style={styles.bellWrap}>
        <NotificationBell unreadCount={unreadCount} iconColor={INK} onPress={onBell} />
      </View>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onMenu}
        style={styles.roundBtn}
        hitSlop={6}
      >
        <Menu size={20} color={INK} strokeWidth={2.4} />
      </TouchableOpacity>
    </View>
  );
});

/**
 * Sticky bar owns its own "visible" state. Flipping it re-renders ONLY this
 * component — never the whole screen — and happens only when the scroll
 * threshold is crossed (not on every scroll frame).
 */
const StickyBar = forwardRef(function StickyBar({ opacity, paddingTop, children }, ref) {
  const [visible, setVisible] = useState(false);
  useImperativeHandle(ref, () => ({ setVisible }), []);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.stickyBar, { paddingTop, opacity }]}
    >
      <View style={styles.stickyInner}>{children}</View>
    </Animated.View>
  );
});

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

  const labels = useMemo(
    () => ({
      off: t("home.off", { defaultValue: "OFF" }),
      new: t("home.new", { defaultValue: "New" }),
      price: t("home.priceLabel", { defaultValue: "Price" }),
      currency: t("common.currency"),
      cityUnknown: t("home.cityUnknown", { defaultValue: "City not set" }),
    }),
    [t]
  );

  const sliderRef = useRef(null);
  const stickyRef = useRef(null);
  const stickyShown = useRef(false);
  const mountedRef = useRef(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/products");
      if (!mountedRef.current) return;
      setProducts(response.data.products?.data || response.data.data || []);
    } catch (error) {
      console.log("HOME PRODUCTS ERROR:", error.response?.data || error.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setCatLoading(true);
      const response = await api.get("/categories");
      if (!mountedRef.current) return;
      setCategories(response.data.categories || response.data.data || []);
    } catch (error) {
      console.log("CATEGORIES ERROR:", error.response?.data || error.message);
    } finally {
      if (mountedRef.current) setCatLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
    fetchCategories();
    refreshNotifications?.();
  }, [fetchProducts, fetchCategories, refreshNotifications]);

  /* ── Derived data: normalised once, sorted/filtered once per fetch ── */
  const sections = useMemo(() => {
    const normalized = products.map(normalizeProduct);

    const bestSellers = [...normalized]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const deals = normalized.filter((p) => p.pct > 0).slice(0, 10);

    const fresh = [...normalized]
      .sort((a, b) => b.createdAt - a.createdAt || Number(b.id) - Number(a.id))
      .slice(0, 10);

    return [
      {
        key: "best",
        title: t("home.bestSellers", { defaultValue: "Best sellers" }),
        subtitle: t("home.bestSellersSub", { defaultValue: "Most viewed near you" }),
        data: bestSellers,
      },
      {
        key: "deals",
        title: t("home.hotDeals", { defaultValue: "Hot deals" }),
        subtitle: t("home.hotDealsSub", { defaultValue: "Price drops you'll love" }),
        data: deals,
      },
      {
        key: "new",
        title: t("home.newArrivals", { defaultValue: "New arrivals" }),
        subtitle: t("home.newArrivalsSub", { defaultValue: "Fresh listings" }),
        data: fresh,
      },
    ].filter((s) => s.data.length > 0);
  }, [products, t]);

  const categoryRail = useMemo(
    () => [{ id: "all", name: t("common.all") }, ...categories],
    [categories, t]
  );

  /* ── Stable callbacks (keep memoized children from re-rendering) ── */
  const openProduct = useCallback(
    (id) => navigation.navigate("ProductDetails", { productId: id }),
    [navigation]
  );
  const goExplore = useCallback(() => navigation.navigate("Explore"), [navigation]);
  const goSettings = useCallback(() => navigation.navigate("Settings"), [navigation]);
  const goNotifications = useCallback(
    () => navigation.getParent()?.navigate("Notifications"),
    [navigation]
  );
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const onSearchOpenProduct = useCallback(
    (product) => {
      setSearchOpen(false);
      openProduct(product.id);
    },
    [openProduct]
  );
  const onSelectCategory = useCallback(
    (item) => {
      setSelectedCategoryId(item.id);
      if (item.id !== "all")
        navigation.navigate("CategoryProducts", { categoryName: item.name });
    },
    [navigation]
  );
  const onCtaPress = useCallback(
    (s) => s.route && navigation.navigate(s.route),
    [navigation]
  );

  const pauseSlider = useCallback(() => sliderRef.current?.pause(), []);
  const resumeSlider = useCallback(() => sliderRef.current?.resume(), []);

  /* Category rail renderers */
  const renderCategory = useCallback(
    ({ item }) => (
      <CategoryTile
        item={item}
        isAll={item.id === "all"}
        selected={selectedCategoryId === item.id}
        onSelect={onSelectCategory}
      />
    ),
    [selectedCategoryId, onSelectCategory]
  );
  const categoryKey = useCallback((item) => `cat-${item.id}`, []);

  /* ── Scroll: opacity runs on the native thread; JS only flips a flag on crossing ── */
  const stickyOpacity = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD, STICKY_THRESHOLD + 40],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (e) => {
          const show = e.nativeEvent.contentOffset.y > STICKY_THRESHOLD;
          if (show !== stickyShown.current) {
            stickyShown.current = show;
            stickyRef.current?.setVisible(show);
          }
        },
      }),
    [scrollY]
  );

  const avatarUrl = user?.avatar_url || user?.avatar || user?.photo || null;
  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();
  const displayName = user?.name || t("home.there");
  const welcome = t("home.welcomeBack");
  const unread = unreadCount || 0;

  const seeAllLabel = t("home.seeAll", { defaultValue: "See all" });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={pauseSlider}
        onMomentumScrollEnd={resumeSlider}
        onScrollEndDrag={resumeSlider}
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
            <IdentityRow
              avatarUrl={avatarUrl}
              initial={initial}
              name={displayName}
              welcome={welcome}
            />
            <HeaderActions unreadCount={unread} onBell={goNotifications} onMenu={goSettings} />
          </View>

          <Text style={styles.tagline} numberOfLines={1}>
            {t("products.discoverNear")}
          </Text>

          <View style={styles.search}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.searchInputArea}
              onPress={openSearch}
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
              onPress={goExplore}
            >
              <SlidersHorizontal size={18} color={INK} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Promo banner ── */}
        <View style={styles.bannerWrap}>
          <BannerSlider ref={sliderRef} slides={slides} onCtaPress={onCtaPress} />
        </View>

        {/* ── Categories ── */}
        {catLoading && categories.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={PRIMARY} />
        ) : (
          <FlatList
            data={categoryRail}
            horizontal
            renderItem={renderCategory}
            keyExtractor={categoryKey}
            extraData={selectedCategoryId}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
            nestedScrollEnabled
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews
          />
        )}

        {/* ── Product sections ── */}
        {loading && products.length === 0 ? (
          <>
            <SectionHeader
              title={t("home.bestSellers", { defaultValue: "Best sellers" })}
              subtitle={t("home.bestSellersSub", { defaultValue: "Most viewed near you" })}
              actionLabel={seeAllLabel}
              onAction={goExplore}
            />
            <CarouselSkeleton />
          </>
        ) : sections.length > 0 ? (
          sections.map((s) => (
            <View key={s.key}>
              <SectionHeader
                title={s.title}
                subtitle={s.subtitle}
                actionLabel={seeAllLabel}
                onAction={goExplore}
              />
              <ProductCarousel data={s.data} labels={labels} onPressItem={openProduct} />
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t("home.noProductsYet")}</Text>
        )}
      </Animated.ScrollView>

      {/* ── Sticky bar ── */}
      <StickyBar ref={stickyRef} opacity={stickyOpacity} paddingTop={insets.top + 6}>
        <IdentityRow
          avatarUrl={avatarUrl}
          initial={initial}
          name={displayName}
          welcome={welcome}
        />
        <HeaderActions unreadCount={unread} onBell={goNotifications} onMenu={goSettings} />
      </StickyBar>

      <SearchModal
        visible={searchOpen}
        onClose={closeSearch}
        products={products}
        categories={categories}
        onOpenProduct={onSearchOpenProduct}
      />
    </View>
  );
}

/* ================================================================== */
/* Styles                                                             */
/* ================================================================== */
/* Shadows only on a few static elements (bell/menu/search) — never on lists */
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
    color: ACCENT,
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
    shadowColor: "#14221A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
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
    backgroundColor: ACCENT,
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

  /* Categories (borderless, no shadow) */
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
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: MINT_SOFT,
    borderWidth: 2,
    borderColor: "transparent",
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

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAGE_PADDING,
    marginTop: 30,
    marginBottom: 16,
    gap: 12,
  },
  sectionTexts: { flex: 1 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: INK,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "500",
    color: MUTED,
  },
  seeAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingStart: 18,
    paddingEnd: 12,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACCENT,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: "700",
    color: INK,
  },

  /* Carousel + borderless card */
  carouselContent: { paddingHorizontal: PAGE_PADDING },
  cardSeparator: { width: CARD_GAP },
  card: { width: CARD_W },
  tile: {
    width: CARD_W,
    height: CARD_W,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: MINT_SOFT,
  },
  tileFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  tileText: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
  },
  tileLabel: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  tilePrice: {
    marginTop: 2,
    color: ACCENT,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
    textTransform: "uppercase",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 12,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: ACCENT,
  },
  chipSpacer: { height: 34, marginTop: 12 },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_DEEP,
  },
  cardName: {
    marginTop: 10,
    fontSize: 19,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: INK,
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 14.5,
    fontWeight: "500",
    color: MUTED,
  },

  /* Skeleton */
  skeletonRow: {
    flexDirection: "row",
    gap: CARD_GAP,
    paddingHorizontal: PAGE_PADDING,
  },
  skeletonCard: { width: CARD_W },
  skeletonTile: {
    width: CARD_W,
    height: CARD_W,
    borderRadius: 28,
    backgroundColor: MINT_SOFT,
  },
  skeletonChip: {
    marginTop: 12,
    width: 70,
    height: 34,
    borderRadius: 17,
    backgroundColor: MINT_SOFT,
  },
  skeletonLine: {
    marginTop: 12,
    width: "70%",
    height: 18,
    borderRadius: 9,
    backgroundColor: MINT_SOFT,
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