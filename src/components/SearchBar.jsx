import React, { useCallback, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Search,
  SlidersHorizontal,
  X,
  Check,
  ChevronDown,
} from "lucide-react-native";

// ---------- Theme ----------
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#ECFDF5";
const SLATE = "#0F172A";
const MUTED = "#64748B";
const INACTIVE = "#94A3B8";
const WHITE = "#FFFFFF";

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
// Filtering logic — pure function, easy to test
// ============================================================
function applyFilters(products, { query, categoryId, priceBucket, sortKey }) {
  let list = [...products];

  // ---- Query ----
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const name = (p?.name || "").toLowerCase();
      const city = (p?.city || "").toLowerCase();
      const desc = (p?.description || "").toLowerCase();
      return name.includes(q) || city.includes(q) || desc.includes(q);
    });
  }

  // ---- Category ----
  if (categoryId != null) {
    list = list.filter((p) => p?.category_id === categoryId);
  }

  // ---- Price bucket ----
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

  // ---- Sort ----
  if (sortKey === "price_asc") {
    list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (sortKey === "price_desc") {
    list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  } else if (sortKey === "views") {
    list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
  } else {
    // recent
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return list;
}

// ============================================================
// SearchBar
// ============================================================
export default function SearchBar({
  products = [],
  categories = [],
  onChange,
  placeholder = "Search products, brands...",
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [priceBucket, setPriceBucket] = useState("any");
  const [sortKey, setSortKey] = useState("recent");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Animation for the sheet
  const sheetAnim = React.useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    setSheetOpen(true);
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSheetOpen(false));
  };

  // Notify parent whenever any filter changes
  const emit = useCallback(
    (next) => {
      const nextQuery = next.query !== undefined ? next.query : query;
      const nextCat = next.categoryId !== undefined ? next.categoryId : categoryId;
      const nextBucket = next.priceBucket !== undefined ? next.priceBucket : priceBucket;
      const nextSort = next.sortKey !== undefined ? next.sortKey : sortKey;

      const filtered = applyFilters(products, {
        query: nextQuery,
        categoryId: nextCat,
        priceBucket: nextBucket,
        sortKey: nextSort,
      });

      onChange?.({
        query: nextQuery,
        categoryId: nextCat,
        priceBucket: nextBucket,
        sortKey: nextSort,
        results: filtered,
        isActive:
          nextQuery.trim() !== "" ||
          nextCat !== null ||
          nextBucket !== "any" ||
          nextSort !== "recent",
      });
    },
    [products, query, categoryId, priceBucket, sortKey, onChange]
  );

  // Re-run when products arrive
  React.useEffect(() => {
    emit({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const handleQueryChange = (text) => {
    setQuery(text);
    emit({ query: text });
  };

  const handleClearQuery = () => {
    setQuery("");
    emit({ query: "" });
  };

  const handleApplyFilters = () => {
    emit({ categoryId, priceBucket, sortKey });
    closeSheet();
  };

  const handleReset = () => {
    setCategoryId(null);
    setPriceBucket("any");
    setSortKey("recent");
    emit({ categoryId: null, priceBucket: "any", sortKey: "recent" });
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (categoryId !== null) n += 1;
    if (priceBucket !== "any") n += 1;
    if (sortKey !== "recent") n += 1;
    return n;
  }, [categoryId, priceBucket, sortKey]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // ---- Sheet translate ----
  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });
  const backdropOpacity = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <>
      {/* ================= SEARCH PILL ================= */}
      <View style={styles.pill}>
        <Search size={18} color={MUTED} strokeWidth={2.4} />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={MUTED}
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
          autoCorrect={false}
        />

        {query.length > 0 && (
          <TouchableOpacity
            onPress={handleClearQuery}
            hitSlop={6}
            style={styles.clearBtn}
          >
            <X size={14} color={MUTED} strokeWidth={2.6} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          activeOpacity={0.85}
          onPress={openSheet}
        >
          <SlidersHorizontal size={16} color={WHITE} strokeWidth={2.6} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ================= ACTIVE FILTER CHIPS ================= */}
      {(selectedCategory || priceBucket !== "any") && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeChipsRow}
        >
          {selectedCategory && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>{selectedCategory.name}</Text>
              <TouchableOpacity
                onPress={() => {
                  setCategoryId(null);
                  emit({ categoryId: null });
                }}
                hitSlop={4}
              >
                <X size={12} color={GREEN_DARK} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          )}

          {priceBucket !== "any" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>
                {PRICE_BUCKETS.find((b) => b.key === priceBucket)?.label}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPriceBucket("any");
                  emit({ priceBucket: "any" });
                }}
                hitSlop={4}
              >
                <X size={12} color={GREEN_DARK} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ================= FILTER SHEET ================= */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: sheetTranslate }] },
          ]}
        >
          {/* Grabber */}
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>

            <TouchableOpacity onPress={handleReset} hitSlop={8}>
              <Text style={styles.sheetReset}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 460 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ---- Category ---- */}
            <Text style={styles.sheetLabel}>Category</Text>
            <View style={styles.chipWrap}>
              <TouchableOpacity
                style={[styles.chip, categoryId === null && styles.chipActive]}
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

            {/* ---- Price ---- */}
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

            {/* ---- Sort ---- */}
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

          {/* Apply button */}
          <TouchableOpacity
            style={styles.applyBtn}
            activeOpacity={0.9}
            onPress={handleApplyFilters}
          >
            <Text style={styles.applyBtnText}>Apply filters</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  // Pill
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: WHITE,
    borderRadius: 18,
    height: 52,
    paddingLeft: 16,
    paddingRight: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  input: {
    flex: 1,
    color: SLATE,
    fontSize: 15,
    fontWeight: "600",
    height: "100%",
    paddingVertical: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtn: {
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
  filterBtnActive: {
    backgroundColor: GREEN_DARK,
  },
  filterBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: WHITE,
  },
  filterBadgeText: {
    color: GREEN_DARK,
    fontSize: 9,
    fontWeight: "900",
  },

  // Active chips row (below the pill)
  activeChipsRow: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 2,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: GREEN_SOFT,
  },
  activeChipText: {
    color: GREEN_DARK,
    fontSize: 11,
    fontWeight: "800",
  },

  // Sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
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
  grabberWrap: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },
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
  sheetReset: {
    fontSize: 13,
    fontWeight: "800",
    color: GREEN,
  },

  sheetLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: SLATE,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 10,
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
    color: SLATE,
  },
  chipTextActive: {
    color: WHITE,
  },

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
  sortText: {
    fontSize: 14,
    fontWeight: "700",
    color: MUTED,
  },
  sortTextActive: {
    color: GREEN_DARK,
  },

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
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});