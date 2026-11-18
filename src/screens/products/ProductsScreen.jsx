import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Pressable,
  I18nManager,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  SlidersHorizontal,
  Search,
  XCircle,
  X,
  MapPin,
  Heart,
  Eye,
  Star,
  Check,
  LayoutGrid,
  List,
  BadgeCheck,
  RotateCcw,
  SearchX,
  WifiOff,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import api from "../../api/client";
import { media_URL } from "../../constants/config";
import { useTheme } from "../../context/ThemeContext";

import headerBg from "../../../assets/images/headerbg.jpg";

/* ──────────────────────────────────────────────────────────────
   Palette: same blue gradient system as HomeScreen
   ────────────────────────────────────────────────────────────── */
const PRIMARY = "#2563EB";
const PRIMARY_DARK = "#1D4ED8";
const PRIMARY_DEEP = "#0A2E9E";
const SKY = "#38A3FF";
const BLUE_SOFT = "#EFF6FF";
const BLUE_TINT = "#DBEAFE";

const PAGE_BG = "#F3F6FD";
const WHITE = "#FFFFFF";

const INK = "#0B1B3A";
const INK_SOFT = "#2F4170";
const MUTED = "#64748B";
const BORDER = "rgba(11, 27, 58, 0.08)";

const OFFER = "#FBBF24";
const OFFER_INK = "#78350F";
const RED = "#DC2626";
const AMBER = "#F59E0B";

const HERO_GRADIENT = [PRIMARY_DEEP, PRIMARY_DARK, SKY];
const CTA_GRADIENT = [PRIMARY_DARK, SKY];
const ON_HERO = "#FFFFFF";
const ON_HERO_SOFT = "rgba(255,255,255,0.82)";

/* ── Layout ── */
const PAGE_PADDING = 16;
const SEARCH_H = 56;
const SEARCH_OVERLAP = 28; // how far the search pill overlaps the hero
const HERO_RADIUS = 36;
const GRID_GAP = 14;
const GRID_ROW_GAP = 22;

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const getImageUrl = (mediaItem) => {
  if (!mediaItem) return null;

  if (mediaItem.path) {
    return `${media_URL}storage/${mediaItem.path}`;
  }

  if (mediaItem.url) {
    return mediaItem.url
      .replace("localhost", "192.168.8.5")
      .replace("127.0.0.1", "192.168.8.8");
  }

  return null;
};

const getFirstImageUrl = (item) => {
  const firstImage =
    item.media?.find((m) => m.type === "image") || item.media?.[0];
  return getImageUrl(firstImage);
};

/* Fade + slide-up entrance */
function FadeInUp({ delay = 0, distance = 16, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 480,
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

/* Pulsing placeholders while loading (matches the active view mode) */
function SkeletonList({ theme, imageW, gridW, mode }) {
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

  if (mode === "grid") {
    return (
      <View style={styles.skelGrid}>
        {[0, 1, 2, 3].map((i) => (
          <Animated.View key={i} style={{ width: gridW, opacity: pulse }}>
            <View
              style={[
                styles.gridImage,
                { width: gridW, height: gridW, backgroundColor: theme.blueTint },
              ]}
            />
            <View style={[styles.skelBar, { width: "80%", marginTop: 10, backgroundColor: theme.blueTint }]} />
            <View style={[styles.skelBar, { width: "45%", marginTop: 8, backgroundColor: theme.blueTint }]} />
          </Animated.View>
        ))}
      </View>
    );
  }

  return (
    <View>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.listCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.cardBorder,
              opacity: pulse,
            },
          ]}
        >
          <View
            style={[
              styles.listImage,
              { width: imageW, height: imageW, backgroundColor: theme.blueTint },
            ]}
          />
          <View style={styles.skelInfo}>
            <View style={[styles.skelBar, { width: "80%", backgroundColor: theme.blueTint }]} />
            <View style={[styles.skelBar, { width: "45%", height: 14, backgroundColor: theme.blueTint }]} />
            <View style={[styles.skelBar, { width: "60%", backgroundColor: theme.blueTint }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Product card: list view                                             */
/* ------------------------------------------------------------------ */
const ListCard = ({ item, onPress, theme, imageW }) => {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.id]);

  const imageUrl = getFirstImageUrl(item);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.listCard,
        { backgroundColor: theme.surface, borderColor: theme.cardBorder },
      ]}
    >
      <View
        style={[
          styles.listImage,
          { width: imageW, height: imageW, backgroundColor: theme.blueTint },
        ]}
      >
        {imageUrl && !failed ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.fill}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.fallback]}>
            <Text style={[styles.fallbackText, { color: theme.blueText }]}>
              {item.name?.charAt(0).toUpperCase()}
            </Text>
            <Text style={[styles.fallbackSub, { color: theme.mutedText }]}>
              {t("common.noImage")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.listInfo}>
        <Text style={[styles.name, { color: theme.titleText }]} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={[styles.price, { color: theme.priceText }]}>
          {Number(item.price).toLocaleString()}{" "}
          <Text style={[styles.currency, { color: theme.mutedText }]}>
            {t("common.currency")}
          </Text>
        </Text>

        <View style={styles.meta}>
          {item.city ? (
            <View style={styles.metaLocation}>
              <MapPin size={12} color={theme.primary} strokeWidth={2.6} />
              <Text
                style={[styles.location, { color: theme.mutedText }]}
                numberOfLines={1}
              >
                {item.city}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {item.condition ? (
            <View style={[styles.conditionChip, { backgroundColor: theme.blueChip }]}>
              <Text style={[styles.conditionText, { color: theme.blueText }]}>
                {item.condition}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Heart size={13} color={RED} fill={RED} />
            <Text style={[styles.statText, { color: theme.bodyText }]}>
              {item.likes_count || 0}
            </Text>
          </View>
          <View style={styles.stat}>
            <Eye size={13} color={theme.mutedText} />
            <Text style={[styles.statText, { color: theme.bodyText }]}>
              {item.views_count || 0}
            </Text>
          </View>
          <View style={styles.stat}>
            <Star size={13} color={AMBER} fill={AMBER} />
            <Text style={[styles.statText, { color: theme.bodyText }]}>
              {item.rating_avg || 0}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ------------------------------------------------------------------ */
/* Product card: grid view (borderless, like HomeScreen)               */
/* ------------------------------------------------------------------ */
const GridCard = ({ item, onPress, theme, gridW }) => {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.id]);

  const imageUrl = getFirstImageUrl(item);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ width: gridW }}>
      <View
        style={[
          styles.gridImage,
          { width: gridW, height: gridW, backgroundColor: theme.blueTint },
        ]}
      >
        {imageUrl && !failed ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.fill}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.fallback]}>
            <Text style={[styles.fallbackText, { color: theme.blueText }]}>
              {item.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {item.condition ? (
          <View style={styles.gridBadge}>
            <Text style={styles.gridBadgeText}>{item.condition}</Text>
          </View>
        ) : null}

        <View style={styles.gridLikes}>
          <Heart size={11} color={WHITE} fill={RED} />
          <Text style={styles.gridLikesText}>{item.likes_count || 0}</Text>
        </View>
      </View>

      <View style={styles.gridInfo}>
        <Text style={[styles.gridName, { color: theme.titleText }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.gridPrice, { color: theme.priceText }]} numberOfLines={1}>
          {Number(item.price).toLocaleString()}{" "}
          <Text style={[styles.currency, { color: theme.mutedText }]}>
            {t("common.currency")}
          </Text>
        </Text>
        {item.city ? (
          <View style={styles.gridMeta}>
            <MapPin size={12} color={theme.primary} strokeWidth={2.6} />
            <Text style={[styles.location, { color: theme.mutedText }]} numberOfLines={1}>
              {item.city}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

/* ------------------------------------------------------------------ */
/* Filter pieces                                                       */
/* ------------------------------------------------------------------ */
const FilterOption = ({ label, active, onPress, theme }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={[
      styles.filterOption,
      {
        backgroundColor: active ? theme.primary : theme.fieldBg,
        borderColor: active ? theme.primary : theme.fieldBorder,
      },
    ]}
  >
    {active ? <Check size={14} color={WHITE} strokeWidth={3} /> : null}
    <Text
      style={[
        styles.filterOptionText,
        { color: active ? WHITE : theme.titleText },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const FilterGroup = ({ icon: Icon, label, theme, children }) => (
  <View style={styles.filterGroup}>
    <View style={styles.filterLabelRow}>
      <View style={[styles.filterLabelIcon, { backgroundColor: theme.blueTint }]}>
        <Icon size={15} color={theme.blueText} strokeWidth={2.5} />
      </View>
      <Text style={[styles.filterLabel, { color: theme.titleText }]}>{label}</Text>
    </View>
    <View style={styles.filterOptions}>{children}</View>
  </View>
);

/* Quick category pill used in the rail under the search bar */
const CategoryPill = ({ label, active, onPress, theme }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={[
      styles.pill,
      {
        backgroundColor: active ? theme.primary : theme.surface,
        borderColor: active ? theme.primary : theme.cardBorder,
      },
    ]}
  >
    <Text
      style={[styles.pillText, { color: active ? WHITE : theme.bodyText }]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

/* ------------------------------------------------------------------ */
/* Main screen                                                         */
/* ------------------------------------------------------------------ */
export default function ProductsScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const imageW = clamp(Math.round(width * 0.32), 108, 150);
  const gridW = Math.floor((width - PAGE_PADDING * 2 - GRID_GAP) / 2);

  /* ---- Geometry ---- */
  const HEADER_H = insets.top + 128;
  const SEARCH_TOP = HEADER_H - SEARCH_OVERLAP; // resting position of the pill
  const STICKY_TOP = insets.top + 8; // where the pill docks
  const STICK_DIST = SEARCH_TOP - STICKY_TOP;
  const STICKY_BOTTOM = STICKY_TOP + SEARCH_H + 12;
  const LIST_TOP = SEARCH_TOP + SEARCH_H + 16;

  /* ---- Scroll-driven animation (native-driver safe) ---- */
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY]
  );

  // Search pill scrolls with content, then docks at the top
  const searchLift = scrollY.interpolate({
    inputRange: [0, STICK_DIST],
    outputRange: [0, -STICK_DIST],
    extrapolate: "clamp",
  });

  // Blue bar behind the docked pill fades in
  const backdropOpacity = scrollY.interpolate({
    inputRange: [STICK_DIST - 40, STICK_DIST],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const FADE_DIST = HEADER_H * 0.9;
  const STRETCH = 140;

  // Hero: stretches on pull-down, parallax-slides at half speed on scroll
  const headerTranslateY = scrollY.interpolate({
    inputRange: [-STRETCH, 0, HEADER_H],
    outputRange: [HEADER_H * 0.2, 0, -HEADER_H * 0.5],
    extrapolate: "clamp",
  });
  const headerScaleY = scrollY.interpolate({
    inputRange: [-STRETCH, 0],
    outputRange: [1.4, 1],
    extrapolate: "clamp",
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, FADE_DIST * 0.6, FADE_DIST],
    outputRange: [1, 0.8, 0],
    extrapolate: "clamp",
  });

  // Title leaves faster than the hero
  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, FADE_DIST * 0.6],
    outputRange: [0, -26],
    extrapolate: "clamp",
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, FADE_DIST * 0.45],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  /* ---- Theme bundle (light matches HomeScreen, dark keeps app colors) ---- */
  const theme = useMemo(
    () => ({
      pageBg: isDark ? colors.background : PAGE_BG,
      surface: isDark ? colors.surface : WHITE,
      border: isDark ? colors.border : BORDER,

      primary: isDark ? "#3B82F6" : PRIMARY,
      blueText: isDark ? "#93C5FD" : PRIMARY_DARK,
      priceText: isDark ? "#93C5FD" : PRIMARY_DARK,
      blueSoft: isDark ? "rgba(59,130,246,0.16)" : BLUE_SOFT,
      blueTint: isDark ? "rgba(59,130,246,0.22)" : BLUE_TINT,
      blueChip: isDark ? "rgba(59,130,246,0.20)" : BLUE_TINT,

      titleText: isDark ? colors.text : INK,
      bodyText: isDark ? colors.textSecondary : INK_SOFT,
      mutedText: isDark ? colors.inactive : MUTED,

      cardBorder: isDark ? "rgba(255,255,255,0.07)" : BORDER,
      shadow: isDark ? "#000000" : PRIMARY_DARK,
      iconBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(11,27,58,0.05)",

      fieldBg: isDark ? colors.surfaceSecondary : PAGE_BG,
      fieldBorder: isDark ? colors.border : BLUE_TINT,

      modalOverlay: isDark ? "rgba(0,0,0,0.75)" : "rgba(6,24,84,0.55)",
    }),
    [colors, isDark]
  );

  /* ---- State ---- */
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  /* ---- Fetch ---- */
  const fetchProducts = async () => {
    try {
      setError(null);
      const response = await api.get("/products");
      const productsData = response.data?.products?.data || [];
      setProducts(productsData);
    } catch (err) {
      console.log("PRODUCTS ERROR:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Unable to load products.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);

  /* ---- Filtering ---- */
  const applyFilters = useCallback(() => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category?.id === selectedCategory);
    }
    if (selectedCondition) {
      filtered = filtered.filter((p) => p.condition === selectedCondition);
    }
    if (selectedCity) {
      filtered = filtered.filter((p) => p.city === selectedCity);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, selectedCondition, selectedCity]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const categories = useMemo(() => {
    const unique = new Map();
    products
      .map((p) => p.category)
      .filter(Boolean)
      .forEach((c) => unique.set(c.id, c));
    return Array.from(unique.values());
  }, [products]);

  const conditions = useMemo(
    () => [...new Set(products.map((p) => p.condition).filter(Boolean))],
    [products]
  );

  const cities = useMemo(
    () => [...new Set(products.map((p) => p.city).filter(Boolean))],
    [products]
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedCondition(null);
    setSelectedCity(null);
  };

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (selectedCondition ? 1 : 0) +
    (selectedCity ? 1 : 0);

  const toggle = (current, value, setter) =>
    setter(current === value ? null : value);

  /* ---- Pieces ---- */
  const renderChip = (key, label, onClear) => (
    <View key={key} style={[styles.chip, { backgroundColor: theme.blueChip }]}>
      <Text style={[styles.chipText, { color: theme.blueText }]}>{label}</Text>
      <TouchableOpacity onPress={onClear} hitSlop={8}>
        <X size={14} color={theme.blueText} strokeWidth={2.6} />
      </TouchableOpacity>
    </View>
  );

  const hasSecondaryChips = !!(selectedCondition || selectedCity);

  const renderListHeader = () => (
    <View>
      {/* Quick category rail */}
      {!loading && categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.railScroll}
          contentContainerStyle={styles.railContent}
        >
          <CategoryPill
            theme={theme}
            label={t("common.all", { defaultValue: "All" })}
            active={!selectedCategory}
            onPress={() => setSelectedCategory(null)}
          />
          {categories.map((cat) => (
            <CategoryPill
              key={cat.id}
              theme={theme}
              label={cat.name}
              active={selectedCategory === cat.id}
              onPress={() => toggle(selectedCategory, cat.id, setSelectedCategory)}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Active filter chips */}
      {hasSecondaryChips ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {selectedCondition
            ? renderChip("cond", selectedCondition, () => setSelectedCondition(null))
            : null}
          {selectedCity
            ? renderChip("city", selectedCity, () => setSelectedCity(null))
            : null}
          <TouchableOpacity onPress={resetFilters} hitSlop={6}>
            <Text style={[styles.clearAll, { color: theme.blueText }]}>
              {t("products.clearAll")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {/* Results count + view toggle */}
      {!loading && products.length > 0 ? (
        <View style={styles.resultsRow}>
          <Text style={[styles.resultsText, { color: theme.mutedText }]}>
            {t("products.results", {
              count: filteredProducts.length,
              defaultValue: "{{count}} items",
            })}
          </Text>

          <View style={[styles.toggle, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            {[
              { key: "grid", Icon: LayoutGrid },
              { key: "list", Icon: List },
            ].map(({ key, Icon }) => {
              const active = viewMode === key;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.8}
                  onPress={() => setViewMode(key)}
                  style={[
                    styles.toggleBtn,
                    active && { backgroundColor: theme.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={key}
                  accessibilityState={{ selected: active }}
                >
                  <Icon
                    size={16}
                    color={active ? WHITE : theme.mutedText}
                    strokeWidth={2.4}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (loading)
      return (
        <SkeletonList theme={theme} imageW={imageW} gridW={gridW} mode={viewMode} />
      );

    if (error && products.length === 0) {
      return (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.blueTint }]}>
            <WifiOff size={28} color={RED} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.titleText }]}>
            {error}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setLoading(true);
              fetchProducts();
            }}
          >
            <LinearGradient
              colors={CTA_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButton}
            >
              <RotateCcw size={16} color={WHITE} strokeWidth={2.5} />
              <Text style={styles.retryText}>{t("common.tryAgain")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.blueTint }]}>
          <SearchX size={28} color={theme.blueText} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.titleText }]}>
          {t("products.noMatchTitle")}
        </Text>
        <Text style={[styles.emptyText, { color: theme.mutedText }]}>
          {t("products.noMatchText")}
        </Text>
        {activeFilterCount > 0 || searchQuery ? (
          <TouchableOpacity onPress={resetFilters} style={styles.emptyReset}>
            <Text style={[styles.clearAll, { color: theme.blueText }]}>
              {t("products.resetAll")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item, index }) => {
    const onPress = () =>
      navigation.navigate("ProductDetails", { productId: item.id });

    return (
      <FadeInUp delay={Math.min(index, 6) * 70}>
        {viewMode === "grid" ? (
          <GridCard item={item} theme={theme} gridW={gridW} onPress={onPress} />
        ) : (
          <ListCard item={item} theme={theme} imageW={imageW} onPress={onPress} />
        )}
      </FadeInUp>
    );
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <View style={[styles.container, { backgroundColor: theme.pageBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero header: parallax + stretch */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.header,
          {
            height: HEADER_H,
            opacity: headerOpacity,
            transform: [
              { translateY: headerTranslateY },
              { scaleY: headerScaleY },
            ],
          },
        ]}
      >
        <ImageBackground
          source={headerBg}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
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

        <Animated.View
          style={[
            styles.heroText,
            {
              paddingTop: insets.top + 14,
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.title} numberOfLines={1}>
            {t("products.marketplace")}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {t("products.discoverNear")}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Blue bar behind the docked search pill */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyBackdrop,
          { height: STICKY_BOTTOM, opacity: backdropOpacity },
        ]}
      >
        <LinearGradient
          colors={HERO_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Search pill + filter button (docks to the top on scroll) */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            top: SEARCH_TOP,
            backgroundColor: theme.surface,
            borderColor: searchFocused ? theme.primary : theme.cardBorder,
            shadowColor: theme.shadow,
            transform: [{ translateY: searchLift }],
          },
        ]}
      >
        <Search
          size={20}
          color={searchFocused ? theme.primary : theme.bodyText}
          strokeWidth={2.3}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.titleText }]}
          placeholder={t("products.searchProducts")}
          placeholderTextColor={theme.mutedText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={theme.primary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
            <XCircle size={19} color={theme.mutedText} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setFilterModalVisible(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Filters"
        >
          <LinearGradient
            colors={CTA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.filterFab}
          >
            <SlidersHorizontal size={18} color={WHITE} strokeWidth={2.4} />
            {activeFilterCount > 0 ? (
              <View style={[styles.filterBadge, { borderColor: theme.surface }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Product list / grid */}
      <Animated.FlatList
        key={viewMode}
        data={loading ? [] : filteredProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={viewMode === "grid" ? 2 : 1}
        columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingTop: LIST_TOP, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={WHITE}
            colors={[PRIMARY]}
            progressBackgroundColor={WHITE}
            progressViewOffset={HEADER_H}
          />
        }
        ListHeaderComponent={renderListHeader()}
        ListEmptyComponent={renderEmpty()}
      />

      {/* Filter sheet */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.titleText }]}>
                {t("products.filters")}
              </Text>
              <Pressable
                onPress={() => setFilterModalVisible(false)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: theme.blueSoft, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <X size={18} color={theme.primary} strokeWidth={2.6} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <FilterGroup icon={LayoutGrid} label={t("products.category")} theme={theme}>
                {categories.map((cat) => (
                  <FilterOption
                    key={cat.id}
                    theme={theme}
                    label={cat.name}
                    active={selectedCategory === cat.id}
                    onPress={() => toggle(selectedCategory, cat.id, setSelectedCategory)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup icon={BadgeCheck} label={t("products.condition")} theme={theme}>
                {conditions.map((cond) => (
                  <FilterOption
                    key={cond}
                    theme={theme}
                    label={cond}
                    active={selectedCondition === cond}
                    onPress={() => toggle(selectedCondition, cond, setSelectedCondition)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup icon={MapPin} label={t("products.city")} theme={theme}>
                {cities.map((city) => (
                  <FilterOption
                    key={city}
                    theme={theme}
                    label={city}
                    active={selectedCity === city}
                    onPress={() => toggle(selectedCity, city, setSelectedCity)}
                  />
                ))}
              </FilterGroup>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
                activeOpacity={0.7}
              >
                <RotateCcw size={15} color={theme.bodyText} />
                <Text style={[styles.resetButtonText, { color: theme.bodyText }]}>
                  {t("products.resetAll")}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setFilterModalVisible(false)}
              style={styles.applyWrap}
            >
              <LinearGradient
                colors={CTA_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.applyButton}
              >
                <Text style={styles.applyButtonText}>
                  {t("products.applyFilters")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
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
  fill: { width: "100%", height: "100%" },

  /* Hero */
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: PRIMARY_DEEP,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
    overflow: "hidden",
  },
  heroText: { paddingHorizontal: 20 },
  title: {
    color: ON_HERO,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.9,
  },
  subtitle: {
    color: ON_HERO_SOFT,
    fontSize: 14.5,
    fontWeight: "500",
    marginTop: 3,
  },

  stickyBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    elevation: 6,
    overflow: "hidden",
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },

  /* Search */
  searchContainer: {
    position: "absolute",
    start: PAGE_PADDING,
    end: PAGE_PADDING,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: SEARCH_H,
    paddingStart: 18,
    paddingEnd: 6,
    borderRadius: SEARCH_H / 2,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
    height: "100%",
  },
  filterFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    end: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { color: WHITE, fontSize: 10, fontWeight: "800" },

  /* List header: category rail, chips, results row */
  railScroll: { flexGrow: 0, marginHorizontal: -PAGE_PADDING },
  railContent: {
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 4,
    gap: 8,
  },
  pill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { fontSize: 13.5, fontWeight: "800" },

  chipsScroll: { flexGrow: 0, marginHorizontal: -PAGE_PADDING, marginTop: 12 },
  chipsContent: {
    paddingHorizontal: PAGE_PADDING,
    alignItems: "center",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13, fontWeight: "700" },
  clearAll: { fontSize: 13, fontWeight: "800", paddingHorizontal: 6 },

  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 14,
  },
  resultsText: { fontSize: 13.5, fontWeight: "700" },
  toggle: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  toggleBtn: {
    width: 36,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  /* List + cards */
  list: { paddingHorizontal: PAGE_PADDING, flexGrow: 1 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_ROW_GAP },
  skelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    rowGap: GRID_ROW_GAP,
  },

  listCard: {
    flexDirection: "row",
    borderRadius: 24,
    borderWidth: 1,
    padding: 10,
    gap: 12,
    marginBottom: 12,
  },
  listImage: { borderRadius: 18, overflow: "hidden" },
  listInfo: { flex: 1, paddingVertical: 2, justifyContent: "center" },

  fallback: { alignItems: "center", justifyContent: "center" },
  fallbackText: { fontSize: 34, fontWeight: "800" },
  fallbackSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },

  name: { fontSize: 15, fontWeight: "700", lineHeight: 20, letterSpacing: -0.2 },
  price: { fontSize: 17, fontWeight: "900", marginTop: 5 },
  currency: { fontSize: 11, fontWeight: "700" },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
    gap: 8,
  },
  metaLocation: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: { fontSize: 12, fontWeight: "600", flexShrink: 1 },
  conditionChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  conditionText: { fontSize: 11, fontWeight: "800" },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 10,
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontWeight: "700" },

  /* Grid card */
  gridImage: { borderRadius: 26, overflow: "hidden" },
  gridBadge: {
    position: "absolute",
    top: 10,
    start: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: OFFER,
  },
  gridBadgeText: { fontSize: 10.5, fontWeight: "900", color: OFFER_INK },
  gridLikes: {
    position: "absolute",
    bottom: 10,
    end: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(11,27,58,0.55)",
  },
  gridLikesText: { color: WHITE, fontSize: 11, fontWeight: "800" },
  gridInfo: { paddingTop: 10, paddingHorizontal: 4 },
  gridName: { fontSize: 14.5, fontWeight: "700", lineHeight: 19, letterSpacing: -0.2 },
  gridPrice: { fontSize: 16, fontWeight: "900", marginTop: 6 },
  gridMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },

  /* Skeleton */
  skelInfo: { flex: 1, justifyContent: "center", gap: 12 },
  skelBar: { height: 11, borderRadius: 6 },

  /* Empty / error */
  empty: { alignItems: "center", marginTop: 50, paddingHorizontal: 30 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyReset: { marginTop: 14, padding: 8 },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
  },
  retryText: { color: WHITE, fontWeight: "800", fontSize: 14 },

  /* Filter sheet */
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 10,
    maxHeight: "85%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.4 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterGroup: { marginTop: 18 },
  filterLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  filterLabelIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filterLabel: { fontSize: 15.5, fontWeight: "800" },
  filterOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  filterOptionText: { fontSize: 13.5, fontWeight: "700" },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
    paddingVertical: 10,
  },
  resetButtonText: { fontWeight: "700", fontSize: 14 },
  applyWrap: { marginTop: 12 },
  applyButton: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: { color: WHITE, fontWeight: "800", fontSize: 16 },
});