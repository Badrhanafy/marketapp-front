import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  ScrollView,
  Animated,
} from "react-native";
import api from "../../api/client";
import { media_URL } from "../../constants/config";
import {
  ChevronLeft,
  MapPin,
  Eye,
  Heart,
  Search,
  ShoppingBag,
  SlidersHorizontal,
} from "lucide-react-native";
import { API_URL } from "../../constants/config";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

// ------------------------------------------------------------
// Animated ProductCard – enhanced with depth & texture
// ------------------------------------------------------------
const ProductCard = ({ product, onPress, index }) => {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.92))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getFirstImageUrl = (product) => {
    const media = product?.media;
    if (!media || !Array.isArray(media) || media.length === 0) return null;
    const first = media.find((m) => m.type === "image") || media[0];
    if (!first) return null;

    const base = media_URL ? media_URL.replace(/\/+$/, "") : `${API_URL}`;
    let path = first.path || "";
    if (path.startsWith("/")) path = path.slice(1);
    if (path.startsWith("storage/")) path = path.slice(8);
    return `${base}/storage/${path}`;
  };

  const imageUrl = getFirstImageUrl(product);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Richer placeholder gradients using brand palette intensities
  const getPlaceholderGradient = (id) => {
    const combos = [
      ["#060680", "#0808A0"],
      ["#050570", "#070790"],
      ["#04045F", "#0606B0"],
    ];
    return combos[(id || 0) % combos.length];
  };
  const [gradStart, gradEnd] = getPlaceholderGradient(product.id);

  const formatPrice = (price) => {
    const num = parseFloat(price);
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  };

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity style={styles.card} activeOpacity={0.82} onPress={onPress}>
        {/* Image Section with Gradient Overlay */}
        <View style={styles.imageBox}>
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
              {/* Subtle bottom gradient for text legibility if needed */}
              <LinearGradient
                colors={["transparent", "rgba(4,4,95,0.15)"]}
                style={styles.imageOverlay}
              />
              {imageLoading && (
                <View style={styles.imageLoader}>
                  <ActivityIndicator size="small" color="#B9FA3C" />
                </View>
              )}
            </>
          ) : (
            <LinearGradient
              colors={[gradStart, gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.image}
            >
              <View style={styles.placeholderCircle}>
                <Text style={styles.placeholderText}>
                  {(product.name || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <ShoppingBag size={18} color="rgba(185,250,60,0.25)" style={styles.placeholderIcon} />
            </LinearGradient>
          )}

          {/* Views Badge – glassmorphism style */}
          <View style={styles.badgeRow}>
            <View style={styles.glassBadge}>
              <Eye size={10} color="#B9FA3C" />
              <Text style={styles.badgeText}>{product.views_count || 0}</Text>
            </View>
          </View>

          {/* Condition Tag – floating pill */}
          <View style={styles.conditionPill}>
            <Text style={styles.conditionPillText}>{product.condition}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)} DH</Text>
            <View style={styles.likesRow}>
              <Heart size={12} color="#94A3B8" fill={product.likes_count > 0 ? "#04045F" : "none"} />
              <Text style={styles.likesText}>{product.likes_count || 0}</Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.cityRow}>
              <MapPin size={12} color="#04045F" />
              <Text style={styles.city} numberOfLines={1}>
                {product.city}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ------------------------------------------------------------
// Main Screen – enhanced layout
// ------------------------------------------------------------
export default function CategoryProductsScreen({ route, navigation }) {
  const { categoryName } = route.params;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const scrollY = useState(new Animated.Value(0))[0];

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/categories/${encodeURIComponent(categoryName)}`);
      const categoryData = response.data?.products;
      const productList = categoryData?.products || [];
      setProducts(productList);
    } catch (error) {
      console.error("Category fetch error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryName]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const sortedProducts = useMemo(() => {
    const list = [...products];
    switch (sortBy) {
      case "price_asc":
        return list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      case "price_desc":
        return list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      case "views":
        return list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
      case "newest":
      default:
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }, [products, sortBy]);

  const SortChip = ({ label, value, icon }) => {
    const isActive = sortBy === value;
    return (
      <TouchableOpacity
        style={[styles.sortChip, isActive && styles.sortChipActive]}
        onPress={() => setSortBy(value)}
        activeOpacity={0.75}
      >
        {isActive && (
          <View style={styles.activeDot}>
            <View style={styles.activeDotInner} />
          </View>
        )}
        <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.headerTop}>
        <View style={styles.titleRow}>
          <SlidersHorizontal size={20} color="#B9FA3C" />
          <Text style={styles.headerTitle}>{categoryName}</Text>
        </View>
        <Text style={styles.headerCount}>
          {products.length} {products.length === 1 ? "product" : "products"} available
        </Text>
      </View>

      <View style={styles.sortSection}>
        <Text style={styles.sortLabel}>Sort by</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortBar}
        >
          <SortChip label="Newest" value="newest" />
          <SortChip label="Popular" value="views" />
          <SortChip label="Price ↑" value="price_asc" />
          <SortChip label="Price ↓" value="price_desc" />
        </ScrollView>
      </View>
    </View>
  );

  const EmptyComponent = () => (
    <View style={styles.emptyBox}>
      <LinearGradient
        colors={["#F8FAFC", "#F1F5F9"]}
        style={styles.emptyIconBg}
      >
        <Search size={32} color="#04045F" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptySub}>
        There are no products in the {categoryName} category yet. Check back later!
      </Text>
    </View>
  );

  // Header background animation on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.97],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030350" />

      {/* Enhanced Top Bar with depth */}
      <Animated.View style={[styles.topBar, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={["#04045F", "#060680", "#0808A8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topBarGradient}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {categoryName}
            </Text>
            <View style={styles.titleUnderline} />
          </View>
          <View style={{ width: 42 }} />
        </LinearGradient>
      </Animated.View>

      {loading && products.length === 0 ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#04045F" />
          <Text style={styles.loaderText}>Loading products...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={sortedProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => (
            <ProductCard
              product={item}
              index={index}
              onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
            />
          )}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#04045F"
              colors={["#04045F", "#B9FA3C"]}
            />
          }
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyComponent />}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}
    </View>
  );
}

// ------------------------------------------------------------
// Enhanced Styles – richer textures, better hierarchy
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Soft cool gray instead of pure white
  },

  // ── Top Bar ───────────────────────────────────────────────
  topBar: {
    shadowColor: "#04045F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 10,
  },
  topBarGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(10px)",
  },
  titleContainer: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 12,
  },
  topBarTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  titleUnderline: {
    width: 24,
    height: 3,
    backgroundColor: "#B9FA3C",
    borderRadius: 2,
    marginTop: 6,
    opacity: 0.9,
  },

  // ── Loader ────────────────────────────────────────────────
  loaderBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  loaderText: {
    marginTop: 16,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },

  // ── List Content ──────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 4,
  },

  // ── List Header ───────────────────────────────────────────
  listHeader: {
    marginTop: 12,
    marginBottom: 4,
  },
  headerTop: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#04045F",
    letterSpacing: -0.8,
  },
  headerCount: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 6,
    fontWeight: "600",
    marginLeft: 30,
  },

  // ── Sort Section ─────────────────────────────────────────
  sortSection: {
    marginBottom: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  sortBar: {
    gap: 8,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#04045F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sortChipActive: {
    backgroundColor: "#04045F",
    borderColor: "#04045F",
    shadowColor: "#04045F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(185,250,60,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#B9FA3C",
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  sortChipTextActive: {
    color: "#fff",
  },

  // ── Row & Card ────────────────────────────────────────────
  row: {
    justifyContent: "space-between",
    marginBottom: 16,
  },

  cardWrapper: {
    width: CARD_WIDTH,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#04045F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
  },

  // ── Image Box ─────────────────────────────────────────────
  imageBox: {
    width: "100%",
    height: 170,
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(4,4,95,0.05)",
  },

  // Placeholder
  placeholderCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  placeholderText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  placeholderIcon: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },

  // ── Badges ────────────────────────────────────────────────
  badgeRow: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 6,
  },
  glassBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(4,4,95,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(185,250,60,0.25)",
    backdropFilter: "blur(8px)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  conditionPill: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(185,250,60,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  conditionPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#04045F",
    textTransform: "capitalize",
    letterSpacing: 0.2,
  },

  // ── Info Section ──────────────────────────────────────────
  info: {
    padding: 14,
    paddingTop: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
    lineHeight: 18,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: "900",
    color: "#04045F", // Deep navy for readability (was lime on white)
    letterSpacing: -0.3,
  },
  priceAccent: {
    color: "#B9FA3C",
  },

  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  likesText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  city: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // ── Empty State ────────────────────────────────────────────
  emptyBox: {
    alignItems: "center",
    paddingVertical: 100,
    paddingHorizontal: 30,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#04045F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#04045F",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
});