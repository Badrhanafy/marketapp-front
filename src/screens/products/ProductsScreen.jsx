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
  BadgeCheck,
  RotateCcw,
  SearchX,
  WifiOff,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import api from "../../api/client";
import { media_URL } from "../../constants/config";
import { useTheme } from "../../context/ThemeContext";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#F0FDF4";
const RED = "#DC2626";
const AMBER = "#F59E0B";

const PAGE_PADDING = 16;

// Collapsing header geometry
const HEADER_CONTENT_H = 76;
const SEARCH_H = 52;
const HEADER_BOTTOM_PAD = 46;
const FLIP_DEGREES = 38;

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

/* Fade + slide-up entrance (first few cards only) */
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

/* Eight-point tile motif (two overlapping squares) */
function TileStar({ x, y, size, color }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y, width: size, height: size }}
    >
      <View
        style={[
          styles.tileSquare,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.tileSquare,
          { borderColor: color, transform: [{ rotate: "45deg" }] },
        ]}
      />
    </View>
  );
}

/* Header decoration: a field of tile stars, offset every other row */
function TilePattern({ width, height, color }) {
  const stars = useMemo(() => {
    const size = 38;
    const step = 66;
    const cols = Math.ceil(width / step) + 1;
    const rows = Math.ceil(height / (step * 0.5)) + 1;
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          key: `${r}-${c}`,
          x: c * step + (r % 2 ? step / 2 : 0) - size / 2,
          y: r * (step * 0.5) - size / 2,
          size,
        });
      }
    }
    return out;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s) => (
        <TileStar key={s.key} x={s.x} y={s.y} size={s.size} color={color} />
      ))}
    </View>
  );
}

/* Pulsing placeholder cards while loading */
function SkeletonList({ theme, imageW }) {
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
    <View>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.cardBorder,
              shadowColor: theme.shadow,
              opacity: pulse,
            },
          ]}
        >
          <View
            style={[
              styles.imageBox,
              { width: imageW, height: imageW, backgroundColor: theme.surfaceAlt },
            ]}
          />
          <View style={styles.skelInfo}>
            <View style={[styles.skelBar, { width: "80%", backgroundColor: theme.surfaceAlt }]} />
            <View style={[styles.skelBar, { width: "45%", height: 14, backgroundColor: theme.surfaceAlt }]} />
            <View style={[styles.skelBar, { width: "60%", backgroundColor: theme.surfaceAlt }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Product card                                                        */
/* ------------------------------------------------------------------ */
const ProductCard = React.memo(function ProductCard({ item, onPress, theme, imageW }) {
  const { t } = useTranslation();
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [item.id]);

  const firstImage =
    item.media?.find((m) => m.type === "image") || item.media?.[0];
  const imageUrl = getImageUrl(firstImage);
  const rating = Number(item.rating_avg) || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.cardBorder,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.imageBox,
          { width: imageW, height: imageW, backgroundColor: theme.surfaceAlt },
        ]}
      >
        {imageUrl && !imageLoadFailed ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.fill}
            resizeMode="cover"
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.fallback, { backgroundColor: theme.greenChip }]}>
            <Text style={[styles.fallbackText, { color: theme.greenText }]}>
              {item.name?.charAt(0).toUpperCase()}
            </Text>
            <Text style={[styles.fallbackSub, { color: theme.mutedText }]}>
              {t("common.noImage")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.titleText }]} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={[styles.price, { color: theme.primary }]}>
          {Number(item.price).toLocaleString()} {t("common.currency")}
        </Text>

        <View style={styles.meta}>
          {item.city ? (
            <View style={styles.metaLocation}>
              <MapPin size={12} color={theme.mutedText} />
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
            <View style={[styles.conditionChip, { backgroundColor: theme.greenChip }]}>
              <Text style={[styles.conditionText, { color: theme.greenText }]}>
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
              {rating ? rating.toFixed(1) : 0}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */
const CategoryPill = ({ label, active, onPress, theme }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={[
      styles.categoryPill,
      {
        backgroundColor: active ? theme.primary : theme.surface,
        borderColor: active ? theme.primary : theme.cardBorder,
      },
    ]}
  >
    <Text
      style={[
        styles.categoryPillText,
        { color: active ? "#FFFFFF" : theme.titleText },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

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
    {active ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
    <Text
      style={[
        styles.filterOptionText,
        { color: active ? "#FFFFFF" : theme.titleText },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const FilterGroup = ({ icon: Icon, label, theme, children }) => (
  <View style={styles.filterGroup}>
    <View style={styles.filterLabelRow}>
      <View style={[styles.filterLabelIcon, { backgroundColor: theme.greenChip }]}>
        <Icon size={15} color={theme.primary} />
      </View>
      <Text style={[styles.filterLabel, { color: theme.titleText }]}>{label}</Text>
    </View>
    <View style={styles.filterOptions}>{children}</View>
  </View>
);

/* ------------------------------------------------------------------ */
/* Main screen                                                         */
/* ------------------------------------------------------------------ */
export default function ProductsScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { contentPaddingBottom, isTablet, maxContentWidth } = useResponsiveLayout();

  const imageW = clamp(Math.round(width * 0.32), 108, 150);

  /* ---- Collapsing header geometry ---- */
  const STICKY_TOP = insets.top + 8; // where the search bar parks
  const HEADER_H = insets.top + 14 + HEADER_CONTENT_H + HEADER_BOTTOM_PAD;
  const SEARCH_TOP = HEADER_H - SEARCH_H / 2; // overlaps the header edge
  const RANGE = SEARCH_TOP - STICKY_TOP; // scroll distance of the animation
  const STICKY_BAR_H = STICKY_TOP + SEARCH_H + 8;

  // Flip hinge sits at the top-right corner (top-left in RTL layouts)
  const dir = I18nManager.isRTL ? -1 : 1;
  const pivotX = (dir * width) / 2;
  const pivotY = -HEADER_H / 2;

  /* ---- Theme bundle ---- */
  const theme = useMemo(
    () => ({
      pageBg: colors.background,
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
      iconBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",

      headerBg: isDark ? "#14532D" : GREEN,

      fieldBg: colors.surfaceSecondary,
      fieldBorder: colors.border,

      modalOverlay: isDark ? "rgba(0,0,0,0.75)" : "rgba(5,46,22,0.55)",
    }),
    [colors, isDark]
  );

  /* ---- Data state ---- */
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /* ---- Filter state ---- */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  /* ---- Scroll state ---- */
  const scrollY = useRef(new Animated.Value(0)).current;
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);

  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (e) => {
          const next = e.nativeEvent.contentOffset.y > RANGE * 0.7;
          if (next !== collapsedRef.current) {
            collapsedRef.current = next;
            setCollapsed(next);
          }
        },
      }),
    [scrollY, RANGE]
  );

  /* ---- Scroll-driven animation values ---- */
  const anim = useMemo(() => {
    const clampOpts = { extrapolate: "clamp" };
    return {
      headerRotate: scrollY.interpolate({
        inputRange: [0, RANGE],
        outputRange: ["0deg", `${dir * FLIP_DEGREES}deg`],
        ...clampOpts,
      }),
      headerTranslateY: scrollY.interpolate({
        inputRange: [0, RANGE],
        outputRange: [0, -HEADER_H * 0.6],
        ...clampOpts,
      }),
      headerOpacity: scrollY.interpolate({
        inputRange: [0, RANGE * 0.75, RANGE],
        outputRange: [1, 0.9, 0],
        ...clampOpts,
      }),
      textOpacity: scrollY.interpolate({
        inputRange: [0, RANGE * 0.4],
        outputRange: [1, 0],
        ...clampOpts,
      }),
      textTranslateY: scrollY.interpolate({
        inputRange: [0, RANGE],
        outputRange: [0, -30],
        ...clampOpts,
      }),
      searchTranslateY: scrollY.interpolate({
        inputRange: [0, RANGE],
        outputRange: [0, -RANGE],
        ...clampOpts,
      }),
      stickyBgOpacity: scrollY.interpolate({
        inputRange: [RANGE * 0.6, RANGE],
        outputRange: [0, 1],
        ...clampOpts,
      }),
      miniFilterOpacity: scrollY.interpolate({
        inputRange: [RANGE * 0.7, RANGE],
        outputRange: [0, 1],
        ...clampOpts,
      }),
    };
  }, [scrollY, RANGE, HEADER_H, dir]);

  /* ---- Fetch ---- */
  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get("/products");
      setProducts(response.data?.products?.data || []);
    } catch (err) {
      console.log("PRODUCTS ERROR:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Unable to load products.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  /* ---- Derived data ---- */
  const filteredProducts = useMemo(() => {
    let list = products;

    const q = searchQuery.toLowerCase().trim();
    if (q) list = list.filter((p) => p.name?.toLowerCase().includes(q));
    if (selectedCategory) list = list.filter((p) => p.category?.id === selectedCategory);
    if (selectedCondition) list = list.filter((p) => p.condition === selectedCondition);
    if (selectedCity) list = list.filter((p) => p.city === selectedCity);

    return list;
  }, [products, searchQuery, selectedCategory, selectedCondition, selectedCity]);

  const categories = useMemo(() => {
    const unique = new Map();
    products.forEach((p) => {
      if (p.category) unique.set(p.category.id, p.category);
    });
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

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (selectedCondition ? 1 : 0) +
    (selectedCity ? 1 : 0);

  const hasAnyFilter = activeFilterCount > 0 || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedCondition(null);
    setSelectedCity(null);
  };

  const toggle = (current, value, setter) =>
    setter(current === value ? null : value);

  const openFilters = () => setFilterModalVisible(true);

  /* ---- Pieces ---- */
  const renderChip = (label, onClear) => (
    <View style={[styles.chip, { backgroundColor: theme.greenChip }]}>
      <Text style={[styles.chipText, { color: theme.greenText }]}>{label}</Text>
      <TouchableOpacity onPress={onClear} hitSlop={8}>
        <X size={14} color={theme.greenText} strokeWidth={2.6} />
      </TouchableOpacity>
    </View>
  );

  // Scrolls away with the list: category rail + result summary
  const listHeader = loading ? null : (
    <View>
      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.rail}
          contentContainerStyle={styles.railContent}
        >
          <CategoryPill
            theme={theme}
            label={t("products.all", { defaultValue: "All" })}
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

      <View style={styles.summaryRow}>
        <Text style={[styles.summaryText, { color: theme.mutedText }]}>
          {t("products.itemsCount", {
            count: filteredProducts.length,
            defaultValue: "{{count}} items",
          })}
        </Text>
        {selectedCondition
          ? renderChip(selectedCondition, () => setSelectedCondition(null))
          : null}
        {selectedCity ? renderChip(selectedCity, () => setSelectedCity(null)) : null}
        {hasAnyFilter ? (
          <TouchableOpacity onPress={resetFilters} hitSlop={6}>
            <Text style={[styles.clearAll, { color: theme.primary }]}>
              {t("products.clearAll")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return <SkeletonList theme={theme} imageW={imageW} />;

    if (error && products.length === 0) {
      return (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: theme.iconBg, borderColor: theme.cardBorder },
            ]}
          >
            <WifiOff size={28} color={RED} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.titleText }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
            onPress={() => {
              setLoading(true);
              fetchProducts();
            }}
          >
            <RotateCcw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>{t("common.tryAgain")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.empty}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: theme.iconBg, borderColor: theme.cardBorder },
          ]}
        >
          <SearchX size={28} color={theme.mutedText} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.titleText }]}>
          {t("products.noMatchTitle")}
        </Text>
        <Text style={[styles.emptyText, { color: theme.mutedText }]}>
          {t("products.noMatchText")}
        </Text>
      </View>
    );
  };

  const renderItem = useCallback(
    ({ item, index }) => {
      const card = (
        <ProductCard
          item={item}
          theme={theme}
          imageW={imageW}
          onPress={() =>
            navigation.navigate("ProductDetails", { productId: item.id })
          }
        />
      );
      return index < 6 ? <FadeInUp delay={index * 70}>{card}</FadeInUp> : card;
    },
    [theme, imageW, navigation]
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <View style={[styles.container, { backgroundColor: theme.pageBg }]}>
      <StatusBar
        barStyle={collapsed && !isDark ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Product list (lowest layer) */}
      <Animated.FlatList
        data={loading ? [] : filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty()}
        contentContainerStyle={[
          styles.list,
          isTablet ? { maxWidth: maxContentWidth, alignSelf: "center", width: "100%" } : null,
          {
            paddingTop: SEARCH_TOP + SEARCH_H + 14,
            paddingBottom: contentPaddingBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={[GREEN]}
            progressViewOffset={HEADER_H}
          />
        }
      />

      {/* Green header: flips away to the top-right while scrolling */}
      <View
        pointerEvents="box-none"
        style={[styles.headerWrap, { height: HEADER_H }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.headerBg,
            {
              height: HEADER_H,
              backgroundColor: theme.headerBg,
              opacity: anim.headerOpacity,
              transform: [
                { translateY: anim.headerTranslateY },
                // rotate around the top-right corner
                { translateX: pivotX },
                { translateY: pivotY },
                { rotate: anim.headerRotate },
                { translateX: -pivotX },
                { translateY: -pivotY },
              ],
            },
          ]}
        >
          <TilePattern
            width={width}
            height={HEADER_H}
            color="rgba(255,255,255,0.10)"
          />
          <View style={[styles.ring, styles.ringLg]} />
          <View style={[styles.ring, styles.ringMd]} />
        </Animated.View>

        <Animated.View
          pointerEvents={collapsed ? "none" : "auto"}
          style={[
            styles.headerRow,
            {
              top: insets.top + 14,
              opacity: anim.textOpacity,
              transform: [{ translateY: anim.textTranslateY }],
            },
          ]}
        >
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {t("products.marketplace")}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {t("products.discoverNear")}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            activeOpacity={0.8}
            onPress={openFilters}
            hitSlop={6}
          >
            <SlidersHorizontal size={20} color="#FFFFFF" />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Backdrop behind the stuck search bar */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyBackdrop,
          {
            height: STICKY_BAR_H,
            backgroundColor: theme.pageBg,
            borderBottomColor: theme.cardBorder,
            opacity: anim.stickyBgOpacity,
          },
        ]}
      />

      {/* Search pill: rises with the content, then sticks */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            top: SEARCH_TOP,
            height: SEARCH_H,
            backgroundColor: theme.surface,
            borderColor: searchFocused ? theme.primary : "transparent",
            shadowColor: theme.shadow,
            transform: [{ translateY: anim.searchTranslateY }],
          },
        ]}
      >
        <Search size={19} color={searchFocused ? theme.primary : theme.mutedText} />
        <TextInput
          style={[styles.searchInput, { color: theme.titleText }]}
          placeholder={t("products.searchProducts")}
          placeholderTextColor={theme.mutedText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
            <XCircle size={19} color={theme.mutedText} />
          </TouchableOpacity>
        )}

        {/* Filter button moves into the pill once the header is gone */}
        {collapsed && (
          <Animated.View style={{ opacity: anim.miniFilterOpacity }}>
            <TouchableOpacity
              style={[styles.miniFilter, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}
              onPress={openFilters}
              hitSlop={6}
            >
              <SlidersHorizontal size={16} color="#FFFFFF" />
              {activeFilterCount > 0 ? (
                <View style={[styles.miniBadge, { borderColor: theme.surface }]}>
                  <Text style={styles.miniBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>

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
                  { backgroundColor: theme.iconBg, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <X size={18} color={theme.titleText} />
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
              style={[styles.applyButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>{t("products.applyFilters")}</Text>
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

  /* Header */
  headerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomStartRadius: 44,
    overflow: "hidden",
  },
  tileSquare: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: 3,
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  ringLg: {
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -100,
    end: -90,
  },
  ringMd: {
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -60,
    end: -50,
  },
  headerRow: {
    position: "absolute",
    left: 20,
    right: 20,
    height: HEADER_CONTENT_H,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: { flex: 1 },
  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 3,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    end: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { color: GREEN_DARK, fontSize: 11, fontWeight: "800" },

  /* Search */
  searchContainer: {
    position: "absolute",
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
    height: "100%",
  },
  stickyBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 4,
  },
  miniFilter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: -8,
  },
  miniBadge: {
    position: "absolute",
    top: -5,
    end: -5,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
  },
  miniBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },

  /* List header: category rail + summary */
  list: { paddingHorizontal: PAGE_PADDING, flexGrow: 1 },
  rail: { flexGrow: 0, marginHorizontal: -PAGE_PADDING },
  railContent: {
    paddingHorizontal: PAGE_PADDING,
    alignItems: "center",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryPillText: { fontSize: 13.5, fontWeight: "700" },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  summaryText: { fontSize: 13, fontWeight: "700", marginEnd: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontWeight: "700" },
  clearAll: { fontSize: 13, fontWeight: "800", paddingHorizontal: 6 },

  /* Card */
  card: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    gap: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  imageBox: { borderRadius: 14, overflow: "hidden" },
  fallback: { alignItems: "center", justifyContent: "center" },
  fallbackText: { fontSize: 34, fontWeight: "800" },
  fallbackSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  info: { flex: 1, paddingVertical: 2, justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  price: { fontSize: 17, fontWeight: "800", marginTop: 5 },
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

  /* Skeleton */
  skelInfo: { flex: 1, justifyContent: "center", gap: 12 },
  skelBar: { height: 11, borderRadius: 6 },

  /* Empty / error */
  empty: { alignItems: "center", marginTop: 48, paddingHorizontal: 30 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  /* Filter sheet */
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
  modalTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
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
  applyButton: {
    height: 54,
    borderRadius: 999,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
});