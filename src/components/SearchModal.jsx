import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  SlidersHorizontal,
  X,
  Check,
  MapPin,
  Heart,
  Eye,
  Camera,
  Tag,
} from "lucide-react-native";

import { media_URL } from "../constants/config";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ---------- Theme ----------
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const SLATE = "#0F172A";
const MUTED = "#64748B";
const INACTIVE = "#94A3B8";
const WHITE = "#FFFFFF";
const BG = "#F8FAFC";

const SORTS = [
  { key: "recent", label: "Newest first" },
  { key: "price_asc", label: "Price: Low → High" },
  { key: "price_desc", label: "Price: High → Low" },
  { key: "views", label: "Most viewed" },
];

const PRICE_BUCKETS = [
  { key: "any", label: "Any price" },
  { key: "0-100", label: "Under 100 DH" },
  { key: "100-500", label: "100 – 500 DH" },
  { key: "500-2000", label: "500 – 2,000 DH" },
  { key: "2000+", label: "2,000+ DH" },
];

// ============================================================
// Filtering logic
// ============================================================
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

// ============================================================
// Media URL helper
// ============================================================
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

// ============================================================
// SearchModal
// ============================================================
export default function SearchModal({
  visible,
  onClose,
  products = [],
  categories = [],
  initialQuery = "",
  onOpenProduct,
}) {
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(null);
  const [priceBucket, setPriceBucket] = useState("any");
  const [sortKey, setSortKey] = useState("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const filtersAnim = useRef(new Animated.Value(0)).current;

  // Reset query when the modal reopens with a new initial value
  useEffect(() => {
    if (visible) {
      setQuery(initialQuery);
      // focus after the slide-in finishes
      setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      // reset filters on close so next open is fresh
      setCategoryId(null);
      setPriceBucket("any");
      setSortKey("recent");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Slide animation for the whole modal
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 320 : 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  // Filters sheet animation
  useEffect(() => {
    Animated.timing(filtersAnim, {
      toValue: filtersOpen ? 1 : 0,
      duration: filtersOpen ? 260 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [filtersOpen, filtersAnim]);

  // Results
  const results = useMemo(
    () => applyFilters(products, { query, categoryId, priceBucket, sortKey }),
    [products, query, categoryId, priceBucket, sortKey]
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (categoryId !== null) n += 1;
    if (priceBucket !== "any") n += 1;
    if (sortKey !== "recent") n += 1;
    return n;
  }, [categoryId, priceBucket, sortKey]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  const openFilters = () => setFiltersOpen(true);
  const closeFilters = () => setFiltersOpen(false);

  const handleResetFilters = () => {
    setCategoryId(null);
    setPriceBucket("any");
    setSortKey("recent");
  };

  const handleClearQuery = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleOpenProduct = (product) => {
    onClose?.();
    onOpenProduct?.(product);
  };

  // ---- Render product card (2-column grid) ----
  const renderItem = ({ item }) => {
    const image = getFirstImage(item);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => handleOpenProduct(item)}
      >
        <View style={styles.cardImageBox}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardImage, styles.noImage]}>
              <Camera size={22} color={INACTIVE} />
            </View>
          )}

          <View style={styles.viewsBadge}>
            <Eye size={11} color="#fff" />
            <Text style={styles.viewsText}>{item.views_count || 0}</Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardPrice}>
            {parseFloat(item.price).toFixed(item.price % 1 === 0 ? 0 : 2)} DH
          </Text>

          <View style={styles.cardMeta}>
            <MapPin size={10} color={MUTED} />
            <Text style={styles.cardCity} numberOfLines={1}>
              {item.city}
            </Text>
            <View style={styles.cardDot} />
            <Heart size={10} color={MUTED} />
            <Text style={styles.cardCity}>{item.likes_count || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: slideAnim, backgroundColor: "rgba(15,23,42,0.45)" },
          ]}
        />
      </Pressable>

      {/* Sliding panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* ==================== HEADER ==================== */}
        <View style={styles.header}>
          <View style={styles.searchPill}>
            <Search size={18} color={MUTED} strokeWidth={2.4} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Search products, brands..."
              placeholderTextColor={MUTED}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={handleClearQuery} hitSlop={6}>
                <X size={16} color={MUTED} strokeWidth={2.6} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.85}
            hitSlop={8}
          >
            <X size={18} color={SLATE} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        {/* ==================== FILTER BAR ==================== */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              activeFilterCount > 0 && styles.filterBtnActive,
            ]}
            onPress={openFilters}
            activeOpacity={0.85}
          >
            <SlidersHorizontal
              size={15}
              color={activeFilterCount > 0 ? WHITE : GREEN_DARK}
              strokeWidth={2.6}
            />
            <Text
              style={[
                styles.filterBtnText,
                activeFilterCount > 0 && styles.filterBtnTextActive,
              ]}
            >
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.resultCount}>
            {loading
              ? "Searching…"
              : `${results.length} result${results.length !== 1 ? "s" : ""}`}
          </Text>
        </View>

        {/* ==================== ACTIVE FILTER CHIPS ==================== */}
        {(selectedCategory ||
          priceBucket !== "any" ||
          sortKey !== "recent") && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {selectedCategory && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>
                  {selectedCategory.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setCategoryId(null)}
                  hitSlop={4}
                >
                  <X size={11} color={GREEN_DARK} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            )}

            {priceBucket !== "any" && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>
                  {PRICE_BUCKETS.find((b) => b.key === priceBucket)?.label}
                </Text>
                <TouchableOpacity
                  onPress={() => setPriceBucket("any")}
                  hitSlop={4}
                >
                  <X size={11} color={GREEN_DARK} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            )}

            {sortKey !== "recent" && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>
                  {SORTS.find((s) => s.key === sortKey)?.label}
                </Text>
                <TouchableOpacity
                  onPress={() => setSortKey("recent")}
                  hitSlop={4}
                >
                  <X size={11} color={GREEN_DARK} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* ==================== RESULTS ==================== */}
        {results.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Search size={28} color={GREEN} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              {query.trim() !== ""
                ? `We couldn't find anything matching "${query.trim()}".`
                : "Try adjusting your filters or search terms."}
            </Text>
            {(activeFilterCount > 0 || query.trim() !== "") && (
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => {
                  setQuery("");
                  handleResetFilters();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyResetText}>Reset search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={8}
            windowSize={5}
            removeClippedSubviews
          />
        )}

        {/* ==================== FILTER SHEET ==================== */}
        {filtersOpen && (
          <>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeFilters}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    opacity: filtersAnim,
                    backgroundColor: "rgba(15,23,42,0.4)",
                  },
                ]}
              />
            </Pressable>

            <Animated.View
              style={[
                styles.sheet,
                {
                  transform: [
                    {
                      translateY: filtersAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [420, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.grabberWrap}>
                <View style={styles.grabber} />
              </View>

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Filters</Text>
                <TouchableOpacity onPress={handleResetFilters} hitSlop={8}>
                  <Text style={styles.sheetReset}>Reset</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ maxHeight: 420 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sheetLabel}>Category</Text>
                <View style={styles.chipWrap}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      categoryId === null && styles.chipActive,
                    ]}
                    onPress={() => setCategoryId(null)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        categoryId === null && styles.chipTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((c) => {
                    const active = c.id === categoryId;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setCategoryId(c.id)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.sheetLabel}>Price</Text>
                <View style={styles.chipWrap}>
                  {PRICE_BUCKETS.map((b) => {
                    const active = b.key === priceBucket;
                    return (
                      <TouchableOpacity
                        key={b.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setPriceBucket(b.key)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {b.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.sheetLabel}>Sort by</Text>
                <View style={styles.sortList}>
                  {SORTS.map((s) => {
                    const active = s.key === sortKey;
                    return (
                      <TouchableOpacity
                        key={s.key}
                        style={styles.sortRow}
                        onPress={() => setSortKey(s.key)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.sortText,
                            active && styles.sortTextActive,
                          ]}
                        >
                          {s.label}
                        </Text>
                        {active && (
                          <Check size={16} color={GREEN} strokeWidth={3} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.applyBtn}
                activeOpacity={0.9}
                onPress={closeFilters}
              >
                <Text style={styles.applyBtnText}>
                  Show {results.length} result{results.length !== 1 ? "s" : ""}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: WHITE,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    color: SLATE,
    fontSize: 15,
    fontWeight: "600",
    height: "100%",
    paddingVertical: 0,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // Filter bar
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: GREEN_SOFT,
  },
  filterBtnActive: { backgroundColor: GREEN },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: GREEN_DARK,
  },
  filterBtnTextActive: { color: WHITE },
  filterCountBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: "900",
    color: GREEN_DARK,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
  },

  // Chips row
  chipsRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: GREEN_SOFT,
    marginRight: 8,
  },
  activeChipText: {
    color: GREEN_DARK,
    fontSize: 12,
    fontWeight: "800",
  },

  // Grid
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: SLATE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardImageBox: {
    width: "100%",
    height: 130,
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  cardImage: { width: "100%", height: "100%" },
  noImage: { alignItems: "center", justifyContent: "center" },
  viewsBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(15,23,42,0.6)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  viewsText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardInfo: { padding: 12 },
  cardName: {
    fontSize: 13,
    fontWeight: "800",
    color: SLATE,
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: GREEN,
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardCity: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
    maxWidth: 70,
  },
  cardDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: INACTIVE,
    marginHorizontal: 2,
  },

  // Empty
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: SLATE,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyResetBtn: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: GREEN,
  },
  emptyResetText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
  },

  // Filters sheet
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 26,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  grabberWrap: { alignItems: "center", paddingTop: 4, paddingBottom: 8 },
  grabber: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: SLATE,
    letterSpacing: -0.3,
  },
  sheetReset: { fontSize: 13, fontWeight: "800", color: GREEN },
  sheetLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: SLATE,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 10,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 13, fontWeight: "700", color: SLATE },
  chipTextActive: { color: WHITE },
  sortList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  sortText: { fontSize: 14, fontWeight: "700", color: MUTED },
  sortTextActive: { color: GREEN_DARK },
  applyBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  applyBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});