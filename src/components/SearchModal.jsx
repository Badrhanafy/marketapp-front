import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Animated,
  Easing,
  FlatList,
  I18nManager,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Search,
  X,
  Check,
  MapPin,
  Heart,
  Eye,
  Camera,
  ChevronRight,
  RotateCcw,
  SearchX,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Layers,
  Tag,
  ChevronDown,
} from "lucide-react-native";

import { media_URL } from "../constants/config";

/* ──────────────────────────────────────────────────────────────
   Theme — identical tokens to HomeScreen
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
const STRIKE = "#94A3B8";
const BORDER = "rgba(11, 27, 58, 0.08)";

const HERO_GRADIENT = [PRIMARY_DEEP, PRIMARY_DARK, SKY];
const CTA_GRADIENT = [PRIMARY_DARK, SKY];
const GLASS = "rgba(255,255,255,0.16)";
const GLASS_BORDER = "rgba(255,255,255,0.28)";
const ON_HERO = "#FFFFFF";
const ON_HERO_SOFT = "rgba(255,255,255,0.82)";

const HERO_RADIUS = 36;
const PAGE_PADDING = 16;
const GRID_GAP = 14;
const IMG_RADIUS = 26;

const SORTS = [
  { key: "recent", label: "Newest" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "views", label: "Most viewed" },
];

const PRICE_BUCKETS = [
  { key: "any", label: "Any price" },
  { key: "0-100", label: "Under 100 DH" },
  { key: "100-500", label: "100 – 500 DH" },
  { key: "500-2000", label: "500 – 2,000 DH" },
  { key: "2000+", label: "2,000+ DH" },
];

/* ============================================================
   Filtering logic (unchanged)
   ============================================================ */
function applyFilters(products, { query, categoryId, priceBucket, sortKey }) {
  let list = [...products];

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const name = (p?.name || "").toLowerCase();
      const city = (p?.city || "").toLowerCase();
      const desc = (p?.description || "").toLowerCase();
      return name.includes(q) || city.includes(q) || desc.includes(q);
    });
  }

  if (categoryId != null) {
    list = list.filter((p) => p?.category_id === categoryId);
  }

  if (priceBucket && priceBucket !== "any") {
    list = list.filter((p) => {
      const price = Number(p?.price) || 0;
      if (priceBucket === "0-100") return price < 100;
      if (priceBucket === "100-500") return price >= 100 && price < 500;
      if (priceBucket === "500-2000") return price >= 500 && price < 2000;
      if (priceBucket === "2000+") return price >= 2000;
      return true;
    });
  }

  if (sortKey === "price_asc") {
    list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (sortKey === "price_desc") {
    list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  } else if (sortKey === "views") {
    list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
  } else {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return list;
}

/* ============================================================
   Media helpers
   ============================================================ */
const stripSlash = (s) => (s?.endsWith("/") ? s.slice(0, -1) : s || "");

const getMediaUrl = (mediaItem) => {
  if (!mediaItem?.path) return null;
  const path = mediaItem.path.startsWith("/")
    ? mediaItem.path.slice(1)
    : mediaItem.path;
  return `${stripSlash(media_URL)}/storage/${path}`;
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
  return `${stripSlash(media_URL)}/storage/${path}`;
};

const formatPrice = (price) => {
  const n = Number(price) || 0;
  return n.toLocaleString(undefined, {
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
};

/* ============================================================
   Small pieces
   ============================================================ */

/* Category bubble that lives on the hero (glass → solid white when active) */
function CategoryBubble({ cat, active, onPress }) {
  const [failed, setFailed] = useState(false);
  const isAll = cat.id === "all";
  const image = isAll ? null : getCategoryImage(cat);
  const Icon = isAll ? Layers : Tag;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.bubbleWrap}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={cat.name}
    >
      <View style={[styles.bubble, active && styles.bubbleActive]}>
        {image && !failed ? (
          <Image
            source={{ uri: image }}
            style={styles.fill}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <Icon
            size={22}
            color={active ? PRIMARY_DARK : ON_HERO}
            strokeWidth={2.2}
          />
        )}
      </View>
      <Text
        style={[styles.bubbleLabel, active && styles.bubbleLabelActive]}
        numberOfLines={1}
      >
        {cat.name}
      </Text>
    </TouchableOpacity>
  );
}

function Pill({ label, active, onPress, withCheck }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {active && withCheck ? (
        <Check size={13} color={WHITE} strokeWidth={3} />
      ) : null}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RefineGroup({ title, children }) {
  return (
    <View style={styles.refineGroup}>
      <View style={styles.refineTitleRow}>
        <View style={styles.refineBar} />
        <Text style={styles.refineTitle}>{title}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

/* Grid card — same borderless squircle look as the Home product card */
function GridCard({ item, width, onPress }) {
  const image = getFirstImage(item);
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item)}
      style={{ width }}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={[styles.cardImage, { width, height: width }]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.fill} resizeMode="cover" />
        ) : (
          <View style={[styles.fill, styles.center]}>
            <Camera size={30} color={PRIMARY_DARK} />
          </View>
        )}
        <View style={styles.viewsChip}>
          <Eye size={11} color={WHITE} strokeWidth={2.6} />
          <Text style={styles.viewsChipText}>{item.views_count || 0}</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.cardPrice} numberOfLines={1}>
          {formatPrice(item.price)} <Text style={styles.currency}>DH</Text>
        </Text>
        {item.city ? (
          <View style={styles.metaRow}>
            <MapPin size={12} color={PRIMARY} strokeWidth={2.6} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.city}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/* List row — white tray card, for the compact view */
function ListRow({ item, onPress }) {
  const image = getFirstImage(item);
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(item)}
      style={styles.listRow}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={styles.thumb}>
        {image ? (
          <Image source={{ uri: image }} style={styles.fill} resizeMode="cover" />
        ) : (
          <View style={[styles.fill, styles.center]}>
            <Camera size={22} color={PRIMARY_DARK} />
          </View>
        )}
      </View>

      <View style={styles.listInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardPrice} numberOfLines={1}>
          {formatPrice(item.price)} <Text style={styles.currency}>DH</Text>
        </Text>
        <View style={styles.metaRow}>
          {item.city ? (
            <>
              <MapPin size={12} color={PRIMARY} strokeWidth={2.6} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.city}
              </Text>
            </>
          ) : null}
          <Heart size={12} color={MUTED} strokeWidth={2.4} />
          <Text style={styles.metaText}>{item.likes_count || 0}</Text>
          <Eye size={12} color={MUTED} strokeWidth={2.4} />
          <Text style={styles.metaText}>{item.views_count || 0}</Text>
        </View>
      </View>

      <ChevronRight
        size={18}
        color={STRIKE}
        strokeWidth={2.4}
        style={styles.rtlFlip}
      />
    </TouchableOpacity>
  );
}

/* ============================================================
   SearchModal
   ============================================================ */
export default function SearchModal({
  visible,
  onClose,
  products = [],
  categories = [],
  initialQuery = "",
  onOpenProduct,
}) {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const gridW = Math.floor((winW - PAGE_PADDING * 2 - GRID_GAP) / 2);

  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(null);
  const [priceBucket, setPriceBucket] = useState("any");
  const [sortKey, setSortKey] = useState("recent");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [refineOpen, setRefineOpen] = useState(false);

  const inputRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer;
    if (visible) {
      setQuery(initialQuery);
      timer = setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      setCategoryId(null);
      setPriceBucket("any");
      setSortKey("recent");
      setRefineOpen(false);
    }
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 320 : 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const results = useMemo(
    () => applyFilters(products, { query, categoryId, priceBucket, sortKey }),
    [products, query, categoryId, priceBucket, sortKey]
  );

  const categoryRail = useMemo(
    () => [{ id: "all", name: "All" }, ...categories],
    [categories]
  );

  const refineCount =
    (priceBucket !== "any" ? 1 : 0) + (sortKey !== "recent" ? 1 : 0);
  const activeFilterCount = refineCount + (categoryId !== null ? 1 : 0);
  const hasAnything = activeFilterCount > 0 || query.trim() !== "";

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  const handleResetFilters = () => {
    setCategoryId(null);
    setPriceBucket("any");
    setSortKey("recent");
  };

  const handleResetAll = () => {
    setQuery("");
    handleResetFilters();
  };

  const handleClearQuery = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleOpenProduct = useCallback(
    (product) => {
      onClose?.();
      onOpenProduct?.(product);
    },
    [onClose, onOpenProduct]
  );

  /* ── Hero: search + category bubbles ── */
  const hero = (
    <LinearGradient
      colors={HERO_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + 12 }]}
    >
      <View style={[styles.shape, styles.shapeA]} />
      <View style={[styles.shape, styles.shapeB]} />

      <View style={styles.heroRow}>
        <View style={styles.searchPill}>
          <Search size={20} color={INK_SOFT} strokeWidth={2.3} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search products, brands..."
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={PRIMARY}
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={handleClearQuery}
              hitSlop={8}
              style={styles.clearBtn}
              accessibilityLabel="Clear search"
            >
              <X size={13} color={WHITE} strokeWidth={3} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close search"
        >
          <X size={20} color={ON_HERO} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bubbleRow}
          keyboardShouldPersistTaps="handled"
        >
          {categoryRail.map((c) => {
            const isAll = c.id === "all";
            const active = isAll ? categoryId === null : categoryId === c.id;
            return (
              <CategoryBubble
                key={`cat-${c.id}`}
                cat={c}
                active={active}
                onPress={() =>
                  setCategoryId(isAll || categoryId === c.id ? null : c.id)
                }
              />
            );
          })}
        </ScrollView>
      ) : null}
    </LinearGradient>
  );

  /* ── Toolbar: count • refine • view toggle (+ collapsible tray) ── */
  const toolbar = (
    <View style={styles.toolbarWrap}>
      <View style={styles.toolbar}>
        <View style={styles.countBlock}>
          <Text style={styles.countNumber}>{results.length}</Text>
          <Text style={styles.countText}>
            {results.length === 1 ? "result" : "results"}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setRefineOpen((v) => !v)}
          style={[styles.refineBtn, refineOpen && styles.refineBtnOpen]}
          accessibilityRole="button"
          accessibilityLabel="Price and sort"
          accessibilityState={{ expanded: refineOpen }}
        >
          <SlidersHorizontal
            size={15}
            color={refineOpen ? WHITE : PRIMARY_DARK}
            strokeWidth={2.6}
          />
          <Text
            style={[styles.refineBtnText, refineOpen && styles.refineBtnTextOpen]}
          >
            Refine
          </Text>
          {refineCount > 0 ? (
            <View style={styles.refineBadge}>
              <Text style={styles.refineBadgeText}>{refineCount}</Text>
            </View>
          ) : (
            <ChevronDown
              size={14}
              color={refineOpen ? WHITE : PRIMARY_DARK}
              strokeWidth={2.8}
              style={refineOpen ? styles.chevronUp : null}
            />
          )}
        </TouchableOpacity>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setViewMode("grid")}
            style={[styles.toggleBtn, viewMode === "grid" && styles.toggleBtnActive]}
            accessibilityRole="button"
            accessibilityLabel="Grid view"
          >
            <LayoutGrid
              size={16}
              color={viewMode === "grid" ? WHITE : INK_SOFT}
              strokeWidth={2.4}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setViewMode("list")}
            style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
            accessibilityRole="button"
            accessibilityLabel="List view"
          >
            <List
              size={16}
              color={viewMode === "list" ? WHITE : INK_SOFT}
              strokeWidth={2.4}
            />
          </TouchableOpacity>
        </View>
      </View>

      {refineOpen ? (
        <View style={styles.refineTray}>
          <RefineGroup title="Price">
            {PRICE_BUCKETS.map((b) => (
              <Pill
                key={b.key}
                label={b.label}
                active={b.key === priceBucket}
                onPress={() => setPriceBucket(b.key)}
              />
            ))}
          </RefineGroup>

          <RefineGroup title="Sort by">
            {SORTS.map((s) => (
              <Pill
                key={s.key}
                label={s.label}
                active={s.key === sortKey}
                withCheck
                onPress={() => setSortKey(s.key)}
              />
            ))}
          </RefineGroup>

          {refineCount > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setPriceBucket("any");
                setSortKey("recent");
              }}
              hitSlop={8}
              style={styles.resetInline}
              activeOpacity={0.85}
            >
              <RotateCcw size={13} color={PRIMARY_DARK} strokeWidth={2.6} />
              <Text style={styles.resetInlineText}>Reset refine</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <SearchX size={30} color={PRIMARY_DARK} strokeWidth={2.2} />
      </View>
      <Text style={styles.emptyTitle}>No results found</Text>
      <Text style={styles.emptySubtitle}>
        {query.trim() !== ""
          ? `We couldn't find anything matching "${query.trim()}".`
          : "Try adjusting your filters or search terms."}
      </Text>
      {hasAnything ? (
        <TouchableOpacity activeOpacity={0.85} onPress={handleResetAll}>
          <LinearGradient
            colors={CTA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyBtn}
          >
            <Text style={styles.emptyBtnText}>Reset search</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const isGrid = viewMode === "grid";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[styles.panel, { opacity: slideAnim, transform: [{ translateY }] }]}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <FlatList
          key={viewMode}
          data={results}
          numColumns={isGrid ? 2 : 1}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) =>
            isGrid ? (
              <GridCard item={item} width={gridW} onPress={handleOpenProduct} />
            ) : (
              <ListRow item={item} onPress={handleOpenProduct} />
            )
          }
          columnWrapperStyle={isGrid ? styles.gridRow : undefined}
          ItemSeparatorComponent={() => (
            <View style={isGrid ? styles.gridSep : styles.listSep} />
          )}
          ListHeaderComponent={
            <View>
              {hero}
              {toolbar}
            </View>
          }
          ListEmptyComponent={renderEmpty()}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          windowSize={7}
          stickyHeaderIndices={[]}
        />

        {/* Floating reset pill */}
        {hasAnything && results.length > 0 ? (
          <View
            pointerEvents="box-none"
            style={[styles.floatWrap, { bottom: insets.bottom + 18 }]}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={handleResetAll}>
              <LinearGradient
                colors={CTA_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.floatBtn}
              >
                <RotateCcw size={15} color={WHITE} strokeWidth={2.8} />
                <Text style={styles.floatText}>Clear all</Text>
                <View style={styles.floatCount}>
                  <Text style={styles.floatCountText}>{results.length}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
const styles = StyleSheet.create({
  panel: { ...StyleSheet.absoluteFillObject, backgroundColor: PAGE_BG },
  fill: { width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  rtlFlip: { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },
  chevronUp: { transform: [{ rotate: "180deg" }] },

  /* Hero */
  hero: {
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 20,
    marginHorizontal: -0,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
    overflow: "hidden",
  },
  shape: { position: "absolute", borderRadius: 999 },
  shapeA: {
    width: 220,
    height: 220,
    top: -90,
    end: -70,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  shapeB: {
    width: 120,
    height: 120,
    bottom: -50,
    start: -30,
    borderWidth: 10,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 28,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: PRIMARY_DEEP,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: "600",
    color: INK,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: STRIKE,
  },
  closeBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },

  /* Category bubbles */
  bubbleRow: { gap: 14, paddingTop: 20, paddingEnd: PAGE_PADDING },
  bubbleWrap: { width: 64, alignItems: "center" },
  bubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS,
    borderWidth: 1.5,
    borderColor: GLASS_BORDER,
  },
  bubbleActive: { backgroundColor: WHITE, borderColor: SKY_SOFT },
  bubbleLabel: {
    marginTop: 7,
    maxWidth: 66,
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
    color: ON_HERO_SOFT,
  },
  bubbleLabelActive: { color: ON_HERO, fontWeight: "800" },

  /* Toolbar */
  toolbarWrap: { paddingHorizontal: PAGE_PADDING, paddingTop: 20, paddingBottom: 16 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 10 },
  countBlock: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 6 },
  countNumber: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: INK,
  },
  countText: { fontSize: 13.5, fontWeight: "700", color: MUTED },
  refineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: BLUE_SOFT,
    borderWidth: 1,
    borderColor: BLUE_TINT,
  },
  refineBtnOpen: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  refineBtnText: { fontSize: 13, fontWeight: "800", color: PRIMARY_DARK },
  refineBtnTextOpen: { color: WHITE },
  refineBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },
  refineBadgeText: { fontSize: 10.5, fontWeight: "900", color: WHITE },
  viewToggle: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 19,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  toggleBtn: {
    width: 34,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: { backgroundColor: PRIMARY },

  /* Refine tray */
  refineTray: {
    marginTop: 14,
    paddingVertical: 4,
    paddingBottom: 14,
    borderRadius: 26,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  refineGroup: { marginTop: 14 },
  refineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  refineBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: PRIMARY },
  refineTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: INK,
  },
  pillRow: { paddingHorizontal: 16, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: PAGE_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  pillText: { fontSize: 13.5, fontWeight: "700", color: INK_SOFT },
  pillTextActive: { color: WHITE },
  resetInline: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
    marginStart: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: BLUE_SOFT,
  },
  resetInlineText: { fontSize: 12.5, fontWeight: "800", color: PRIMARY_DARK },

  /* Grid */
  gridRow: { gap: GRID_GAP, paddingHorizontal: PAGE_PADDING },
  gridSep: { height: 22 },
  cardImage: {
    borderRadius: IMG_RADIUS,
    overflow: "hidden",
    backgroundColor: BLUE_TINT,
  },
  viewsChip: {
    position: "absolute",
    bottom: 10,
    end: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(10,46,158,0.72)",
  },
  viewsChipText: { fontSize: 10.5, fontWeight: "800", color: WHITE },
  cardInfo: { paddingTop: 10, paddingHorizontal: 4 },
  cardName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: INK,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: PRIMARY_DARK,
    marginTop: 4,
  },
  currency: { fontSize: 11, fontWeight: "700", color: MUTED },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  metaText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: MUTED,
    marginEnd: 8,
    flexShrink: 1,
  },

  /* List */
  listSep: { height: 10 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: PAGE_PADDING,
    padding: 10,
    borderRadius: 26,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: BLUE_TINT,
  },
  listInfo: { flex: 1 },

  /* Floating action */
  floatWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  floatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 50,
    paddingStart: 20,
    paddingEnd: 8,
    borderRadius: 25,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  floatText: { fontSize: 14, fontWeight: "800", color: WHITE },
  floatCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  floatCountText: { fontSize: 13, fontWeight: "900", color: WHITE },

  /* Empty */
  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_TINT,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: INK,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    fontWeight: "500",
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 18,
    height: 48,
    paddingHorizontal: 26,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtnText: { color: WHITE, fontSize: 14, fontWeight: "800" },
});