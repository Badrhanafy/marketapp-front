import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ScrollView,
  Animated,
  FlatList,
  useWindowDimensions,
} from "react-native";
import {
  ChevronLeft,
  MapPin,
  Eye,
  Heart,
  Search,
  ShoppingBag,
  X,
  LayoutGrid,
  List as ListIcon,
  ArrowUpRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../../api/client";
import { media_URL, API_URL } from "../../constants/config";
import { useTheme } from "../../context/ThemeContext";
import axios from "axios";

// ------------------------------------------------------------
// Header background image (online). Replace with any image URL you like.
// If it fails to load, the header falls back to a green gradient.
// ------------------------------------------------------------


  

const GREEN = "#22C55E";

const H_PADDING = 16;
const GAP = 12;

// ------------------------------------------------------------
// Palette — white body, #22C55E accents, light + dark
// ------------------------------------------------------------
function buildPalette(colors, isDark) {
  return isDark
    ? {
        primary: GREEN,
        onPrimary: "#FFFFFF",
        sheet: colors?.background || "#0B130E",
        card: colors?.surface || "#14201A",
        text: "#F1F7F3",
        muted: "#94A3A0",
        faint: "#6B7C75",
        border: "rgba(255,255,255,0.09)",
        soft: "rgba(34,197,94,0.16)",
        softText: "#86EFAC",
        imageBg: "rgba(34,197,94,0.10)",
        headerFallback: "#0A2A16",
        headerGradient: [
          "rgba(3,16,9,0.78)",
          "rgba(5,40,20,0.58)",
          "rgba(34,197,94,0.30)",
        ],
      }
    : {
        primary: GREEN,
        onPrimary: "#FFFFFF",
        sheet: "#FFFFFF",
        card: "#FFFFFF",
        text: "#0F1F14",
        muted: "#64748B",
        faint: "#94A3B8",
        border: "#E4F3E9",
        soft: "#DCFCE7",
        softText: "#15803D",
        imageBg: "#F0FBF3",
        headerFallback: "#14532D",
        headerGradient: [
          "rgba(4,30,15,0.72)",
          "rgba(10,70,35,0.50)",
          "rgba(34,197,94,0.38)",
        ],
      };
}

function getFirstImageUrl(product) {
  const media = product?.media;
  if (!media || !Array.isArray(media) || media.length === 0) return null;
  const first = media.find((m) => m.type === "image") || media[0];
  if (!first) return null;

  const base = media_URL ? media_URL.replace(/\/+$/, "") : `${API_URL}`;
  let path = first.path || "";
  if (path.startsWith("/")) path = path.slice(1);
  if (path.startsWith("storage/")) path = path.slice(8);
  return `${base}/storage/${path}`;
}

function formatPrice(price) {
  const num = parseFloat(price);
  if (Number.isNaN(num)) return "0";
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
}

// ------------------------------------------------------------
// Product card — grid tile or horizontal list row (no shadows)
// ------------------------------------------------------------
const ProductCard = memo(function ProductCard({
  product,
  onPress,
  index,
  t,
  styles,
  cardWidth,
  variant, // "grid" | "list"
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const delay = Math.min(index, 8) * 50;
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, lift, index]);

  const imageUrl = getFirstImageUrl(product);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const liked = (product.likes_count || 0) > 0;
  const isList = variant === "list";

  const media = (
    <View style={isList ? styles.listImageBox : styles.gridImageBox}>
      {imageUrl && !imageError ? (
        <>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
          {imageLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="small" color={t.primary} />
            </View>
          )}
        </>
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <View style={styles.placeholderCircle}>
            <Text style={styles.placeholderText}>
              {(product.name || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <ShoppingBag
            size={16}
            color={t.primary}
            style={styles.placeholderIcon}
          />
        </View>
      )}

      {!!product.condition && (
        <View style={styles.conditionPill}>
          <Text style={styles.conditionText}>{product.condition}</Text>
        </View>
      )}

      {!isList && (
        <>
          <View style={styles.likeBadge}>
            <Heart
              size={12}
              color={liked ? t.primary : "#fff"}
              fill={liked ? t.primary : "none"}
            />
            <Text style={styles.glassText}>{product.likes_count || 0}</Text>
          </View>
          <View style={styles.viewsBadge}>
            <Eye size={11} color="#fff" />
            <Text style={styles.glassText}>{product.views_count || 0}</Text>
          </View>
        </>
      )}
    </View>
  );

  const priceBlock = (
    <Text style={styles.price}>
      {formatPrice(product.price)}
      <Text style={styles.priceUnit}> DH</Text>
    </Text>
  );

  return (
    <Animated.View
      style={{
        width: isList ? "100%" : cardWidth,
        opacity: fade,
        transform: [{ translateY: lift }],
      }}
    >
      <TouchableOpacity
        style={isList ? styles.listCard : styles.gridCard}
        activeOpacity={0.85}
        onPress={onPress}
      >
        {media}

        {isList ? (
          <View style={styles.listInfo}>
            <View>
              <Text style={styles.name} numberOfLines={2}>
                {product.name}
              </Text>
              <View style={styles.cityRow}>
                <MapPin size={13} color={t.primary} />
                <Text style={styles.city} numberOfLines={1}>
                  {product.city}
                </Text>
              </View>
            </View>

            <View style={styles.listBottom}>
              {priceBlock}
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Eye size={12} color={t.primary} />
                  <Text style={styles.statText}>{product.views_count || 0}</Text>
                </View>
                <View style={styles.statPill}>
                  <Heart
                    size={12}
                    color={t.primary}
                    fill={liked ? t.primary : "none"}
                  />
                  <Text style={styles.statText}>{product.likes_count || 0}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.gridInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {product.name}
            </Text>
            <View style={styles.cityRow}>
              <MapPin size={13} color={t.primary} />
              <Text style={styles.city} numberOfLines={1}>
                {product.city}
              </Text>
            </View>

            <View style={styles.gridBottom}>
              {priceBlock}
              <View style={styles.goBtn}>
                <ArrowUpRight size={16} color="#fff" strokeWidth={2.6} />
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ------------------------------------------------------------
// Sort chip
// ------------------------------------------------------------
const SortChip = memo(function SortChip({ label, active, onPress, styles }) {
  return (
    <TouchableOpacity
      style={[styles.sortChip, active && styles.sortChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Popular", value: "views" },
  { label: "Price ↑", value: "price_asc" },
  { label: "Price ↓", value: "price_desc" },
];

// ------------------------------------------------------------
// Screen
// ------------------------------------------------------------
export default function CategoryProductsScreen({ route, navigation }) {
  const { categoryName } = route.params;



  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const t = useMemo(() => buildPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => makeStyles(t, insets.top), [t, insets.top]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [headerFailed, setHeaderFailed] = useState(false);
const [HEADER_IMAGE_URL,setHEADER_IMAGE_URL ] =useState()
const [path,setpath ] =useState('')
  const isList = viewMode === "list";
  const numColumns = isList ? 1 : width >= 768 ? 3 : 2;
  const cardWidth =
    (width - H_PADDING * 2 - GAP * (numColumns - 1)) / numColumns;
useEffect(() => {
  const fetchCategory = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/categories/${categoryName}`
      );

      const categorydata = response.data?.products;

      const icon = categorydata?.icon;

      console.log("Category icon:", icon);

      const iconUrl = icon
        ? `${media_URL.replace(/\/+$/, "")}/storage/${icon}`
        : null;

      setHEADER_IMAGE_URL(iconUrl);
    } catch (error) {
      console.log(
        "Category fetch error:",
        error.response?.data || error.message
      );
    }
  };

  if (categoryName) {
    fetchCategory();
  }
}, [categoryName]);
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/categories/${encodeURIComponent(categoryName)}`
      );
      const categoryData = response.data?.products;
      setProducts(categoryData?.products || []);
    } catch (error) {
      console.error(
        "Category fetch error:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryName]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            (p.name || "").toLowerCase().includes(q) ||
            (p.city || "").toLowerCase().includes(q)
        )
      : [...products];

    switch (sortBy) {
      case "price_asc":
        return list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      case "price_desc":
        return list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      case "views":
        return list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
      case "newest":
      default:
        return list.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    }
  }, [products, sortBy, query]);

  const listHeader = (
    <View style={styles.toolbar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortBar}
        style={styles.sortScroll}
      >
        {SORT_OPTIONS.map((o) => (
          <SortChip
            key={o.value}
            label={o.label}
            active={sortBy === o.value}
            onPress={() => setSortBy(o.value)}
            styles={styles}
          />
        ))}
      </ScrollView>

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, !isList && styles.toggleBtnActive]}
          onPress={() => setViewMode("grid")}
          activeOpacity={0.8}
        >
          <LayoutGrid size={16} color={!isList ? "#fff" : t.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, isList && styles.toggleBtnActive]}
          onPress={() => setViewMode("list")}
          activeOpacity={0.8}
        >
          <ListIcon size={16} color={isList ? "#fff" : t.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const searching = query.trim().length > 0;
  const empty = (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconBg}>
        <Search size={30} color={t.primary} />
      </View>
      <Text style={styles.emptyTitle}>
        {searching ? "No matches" : "No products yet"}
      </Text>
      <Text style={styles.emptySub}>
        {searching
          ? `Nothing in ${categoryName} matches “${query.trim()}”. Try another name or city.`
          : `There are no products in ${categoryName} right now. Pull down to refresh or check back later.`}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Header: online image + gradient fill ──────────── */}
      <ImageBackground
        source={headerFailed ? null : { uri: HEADER_IMAGE_URL }}
        resizeMode="cover"
        onError={() => setHeaderFailed(true)}
        style={styles.top}
      >
        <LinearGradient
          colors={t.headerGradient}
          locations={[0, 0.55, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {categoryName}
            </Text>
            <Text style={styles.subtitle}>
              {products.length} {products.length === 1 ? "product" : "products"}{" "}
              available
            </Text>
          </View>
        </View>

        {/* Frosted, see-through search field */}
        <View style={styles.searchField}>
          <Search size={18} color="rgba(255,255,255,0.85)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search in ${categoryName}`}
            placeholderTextColor="rgba(255,255,255,0.7)"
            selectionColor="#fff"
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searching && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={10}
              style={styles.clearBtn}
            >
              <X size={13} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </ImageBackground>

      {/* ── Sheet with the products ───────────────────────── */}
      <View style={styles.sheet}>
        {loading && products.length === 0 ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={t.primary} />
            <Text style={styles.loaderText}>Loading products...</Text>
          </View>
        ) : (
          <FlatList
            key={`cols-${numColumns}`}
            data={visibleProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <ProductCard
                product={item}
                index={index}
                t={t}
                styles={styles}
                cardWidth={cardWidth}
                variant={isList ? "list" : "grid"}
                onPress={() =>
                  navigation.navigate("ProductDetails", { productId: item.id })
                }
              />
            )}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
            ItemSeparatorComponent={
              isList ? () => <View style={{ height: GAP }} /> : undefined
            }
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={t.primary}
                colors={[t.primary]}
                progressBackgroundColor={t.card}
              />
            }
            ListHeaderComponent={listHeader}
            ListEmptyComponent={empty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

// ------------------------------------------------------------
// Styles — built from the palette so light/dark switch instantly.
// Cards intentionally have NO shadow / elevation: border only.
// ------------------------------------------------------------
function makeStyles(t, topInset) {
  const glass = "rgba(8,24,14,0.5)";

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.headerFallback },

    // Header
    top: {
      paddingTop: topInset + 10,
      paddingHorizontal: H_PADDING,
      paddingBottom: 46, // the sheet overlaps this area
      backgroundColor: t.headerFallback,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
    },
    titleBlock: { flex: 1, marginLeft: 14 },
    title: {
      fontSize: 22,
      fontWeight: "900",
      color: "#fff",
      letterSpacing: -0.5,
    },
    subtitle: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "600",
      color: "rgba(255,255,255,0.85)",
    },

    // Frosted search: translucent fill + hairline border over the image
    searchField: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      height: 48,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.32)",
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: "#fff",
      paddingVertical: 0,
    },
    clearBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },

    // Sheet
    sheet: {
      flex: 1,
      marginTop: -28,
      backgroundColor: t.sheet,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: "hidden",
    },
    loaderBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    loaderText: {
      marginTop: 14,
      fontSize: 14,
      color: t.muted,
      fontWeight: "600",
    },

    // List
    listContent: {
      paddingHorizontal: H_PADDING,
      paddingTop: 18,
      paddingBottom: 24,
      flexGrow: 1,
    },
    row: { gap: GAP, marginBottom: GAP },

    // Toolbar
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    sortScroll: { flex: 1 },
    sortBar: { gap: 8, paddingRight: 10 },
    sortChip: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: t.soft,
    },
    sortChipActive: { backgroundColor: t.primary },
    sortChipText: { fontSize: 13, fontWeight: "700", color: t.softText },
    sortChipTextActive: { color: "#fff" },

    toggle: {
      flexDirection: "row",
      padding: 3,
      borderRadius: 14,
      backgroundColor: t.soft,
      marginLeft: 8,
    },
    toggleBtn: {
      width: 34,
      height: 32,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleBtnActive: { backgroundColor: t.primary },

    // ── Grid card ─────────────────────────────────────────
    gridCard: {
      backgroundColor: t.card,
      borderRadius: 22,
      padding: 7,
      borderWidth: 1,
      borderColor: t.border,
    },
    gridImageBox: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: t.imageBg,
    },
    gridInfo: { paddingHorizontal: 6, paddingTop: 10, paddingBottom: 4 },
    gridBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
    },
    goBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: t.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── List card ─────────────────────────────────────────
    listCard: {
      flexDirection: "row",
      backgroundColor: t.card,
      borderRadius: 22,
      padding: 7,
      borderWidth: 1,
      borderColor: t.border,
    },
    listImageBox: {
      width: 116,
      height: 116,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: t.imageBg,
    },
    listInfo: {
      flex: 1,
      marginLeft: 12,
      paddingVertical: 3,
      paddingRight: 4,
      justifyContent: "space-between",
    },
    listBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    statPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: t.soft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    statText: { fontSize: 11, fontWeight: "800", color: t.softText },

    // Image internals
    image: { width: "100%", height: "100%" },
    imageLoader: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.imageBg,
    },
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.imageBg,
    },
    placeholderCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: t.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: { color: "#fff", fontSize: 22, fontWeight: "800" },
    placeholderIcon: {
      position: "absolute",
      bottom: 8,
      right: 8,
      opacity: 0.5,
    },

    conditionPill: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: t.primary,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 8,
    },
    conditionText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#fff",
      textTransform: "capitalize",
    },
    likeBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: glass,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    viewsBadge: {
      position: "absolute",
      bottom: 8,
      left: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: glass,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    glassText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    // Text
    name: {
      fontSize: 14,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -0.2,
    },
    cityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 5,
    },
    city: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: t.muted },
    price: {
      fontSize: 17,
      fontWeight: "900",
      color: t.primary,
      letterSpacing: -0.3,
    },
    priceUnit: { fontSize: 12, fontWeight: "800" },

    // Empty
    emptyBox: {
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 30,
    },
    emptyIconBg: {
      width: 76,
      height: 76,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.soft,
      marginBottom: 18,
    },
    emptyTitle: {
      fontSize: 19,
      fontWeight: "900",
      color: t.text,
      marginBottom: 8,
    },
    emptySub: {
      fontSize: 14,
      color: t.muted,
      textAlign: "center",
      lineHeight: 21,
      fontWeight: "500",
    },
  });
}