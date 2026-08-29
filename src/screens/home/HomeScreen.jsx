import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
} from "react-native";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { media_URL } from "../../constants/config";
import {
  Search,
  Bell,
  MapPin,
  TrendingUp,
  Eye,
  Heart,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 260;

export default function HomeScreen({ navigation }) {
  const { user, token, logout } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // =========================
  // FETCH PRODUCTS
  // =========================
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/products", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Adapt to your paginated response structure
      const data = response.data.products?.data || response.data.data || [];
      setProducts(data);
    } catch (error) {
      console.log("HOME PRODUCTS ERROR:", error.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // =========================
  // HELPERS
  // =========================
  const getMediaUrl = (mediaItem) => {
    if (!mediaItem?.path) return null;
    const base = media_URL?.endsWith("/") ? media_URL.slice(0, -1) : media_URL || "";
    const path = mediaItem.path.startsWith("/") ? mediaItem.path.slice(1) : mediaItem.path;
    return `${base}/storage/${path}`;
  };

  const getFirstImage = (product) => {
    const media = product?.media;
    if (!media || media.length === 0) return null;
    const first = media.find((m) => m.type === "image") || media[0];
    return getMediaUrl(first);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // =========================
  // CATEGORIES (mock or fetch real ones)
  // =========================
  const categories = [
    { id: 1, name: "Electronic", icon: "💻" },
    { id: 2, name: "Clothes", icon: "👕" },
    { id: 3, name: "Home", icon: "🏠" },
    { id: 4, name: "Sports", icon: "⚽" },
    { id: 5, name: "Books", icon: "📚" },
    { id: 6, name: "Vehicles", icon: "🚗" },
  ];

  // =========================
  // RENDERERS
  // =========================
  const renderCategory = ({ item }) => (
  <TouchableOpacity
    style={styles.categoryChip}
    activeOpacity={0.8}
    onPress={() => navigation.navigate("CategoryProducts", { categoryName: item.name })}
  >
    <Text style={styles.categoryIcon}>{item.icon}</Text>
    <Text style={styles.categoryName}>{item.name}</Text>
  </TouchableOpacity>
);

  const renderProductCard = ({ item }) => {
    const image = getFirstImage(item);
    const isEven = item.id % 2 === 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
      >
        {/* Image */}
        <View style={styles.cardImageBox}>
          {image ? (
            <Image source={{ uri: image }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.noImage]}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
          <View style={styles.viewsBadge}>
            <Eye size={12} color="#fff" />
            <Text style={styles.viewsText}>{item.views_count || 0}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardPrice}>
              {parseFloat(item.price).toFixed(item.price % 1 === 0 ? 0 : 2)} DH
            </Text>
            <View style={styles.cardCityRow}>
              <MapPin size={11} color="#94A3B8" />
              <Text style={styles.cardCity} numberOfLines={1}>
                {item.city}
              </Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={[styles.statusDot, { backgroundColor: item.status === "available" ? "#10B981" : "#F59E0B" }]} />
            <Text style={styles.cardStatus}>{item.status}</Text>
            <View style={styles.cardRating}>
              <Heart size={12} color="#94A3B8" />
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
        activeOpacity={0.85}
        onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
      >
        <Image source={{ uri: image }} style={styles.trendingImage} resizeMode="cover" />
        <View style={styles.trendingOverlay} />
        <View style={styles.trendingContent}>
          <Text style={styles.trendingName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.trendingRow}>
            <Text style={styles.trendingPrice}>{parseFloat(item.price).toFixed(0)} DH</Text>
            <View style={styles.trendingViews}>
              <Eye size={12} color="#fff" />
              <Text style={styles.trendingViewsText}>{item.views_count}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Sort by most viewed
  const mostViewed = [...products]
    .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
    .slice(0, 10);

  // Recently added
  const freshArrivals = [...products]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ========================= */}
      {/* HEADER                    */}
      /* ========================= */
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarText}>
                {(user?.name || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color="#94A3B8" />
                <Text style={styles.locationText}>{user?.city || "Your city"}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.8}>
            <Bell size={20} color="#fff" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
            <SlidersHorizontal size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F172A" />
        }
      >
        {/* ========================= */}
        {/* CATEGORIES                */}
        {/* ========================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCategory}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />

        {/* ========================= */}
        {/* PROMO BANNER              */}
        {/* ========================= */}
        <TouchableOpacity style={styles.promoBanner} activeOpacity={0.9}>
          <View style={styles.promoContent}>
            <Text style={styles.promoTag}>NEW</Text>
            <Text style={styles.promoTitle}>Sell your items fast</Text>
            <Text style={styles.promoSub}>
              Post an ad in under 2 minutes and reach thousands of buyers.
            </Text>
            <View style={styles.promoBtn}>
              <Text style={styles.promoBtnText}>Post Now →</Text>
            </View>
          </View>
          <View style={styles.promoCircle} />
        </TouchableOpacity>

        {/* ========================= */}
        {/* MOST VIEWED               */}
        {/* ========================= */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <TrendingUp size={18} color="#0F172A" />
            <Text style={styles.sectionTitle}>Most Viewed</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator style={styles.sectionLoader} color="#0F172A" />
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
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No products yet</Text>
          </View>
        )}

        {/* ========================= */}
        {/* FRESH ARRIVALS            */}
        {/* ========================= */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Fresh Arrivals</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator style={styles.sectionLoader} color="#0F172A" />
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
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No new arrivals</Text>
          </View>
        )}

        {/* ========================= */}
        {/* BROWSE ALL GRID           */}
        {/* ========================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Browse All</Text>
        </View>

        {products.length > 0 ? (
          <View style={styles.grid}>
            {products.map((item) => {
              const image = getFirstImage(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gridCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
                >
                  <View style={styles.gridImageBox}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.gridImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.gridImage, styles.noImage]}>
                        <Text style={styles.noImageText}>No Image</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.gridInfo}>
                    <Text style={styles.gridName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.gridPrice}>
                      {parseFloat(item.price).toFixed(item.price % 1 === 0 ? 0 : 2)} DH
                    </Text>
                    <View style={styles.gridMeta}>
                      <MapPin size={10} color="#94A3B8" />
                      <Text style={styles.gridCity} numberOfLines={1}>
                        {item.city}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No products available</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// =====================================
// STYLES
// =====================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // HEADER
  header: {
    backgroundColor: "#04045E",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  greeting: {
    color: "#B9FA3C",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    color: "#B9FA3C",
    fontSize: 13,
    fontWeight: "600",
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#0F172A",
  },

  // SEARCH
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    height: "100%",
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },

  // SECTIONS
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  // CATEGORIES
  categoryList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    alignItems: "center",
    gap: 6,
    marginRight: 14,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fff",
    textAlign: "center",
    lineHeight: 56,
    fontSize: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },

  // PROMO BANNER
  promoBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#277423",
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  promoContent: {
    zIndex: 2,
    maxWidth: "75%",
  },
  promoTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 10,
    overflow: "hidden",
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  promoSub: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 14,
  },
  promoBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  promoBtnText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  promoCircle: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  // PRODUCT CARDS (Most Viewed)
  productList: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardImageBox: {
    width: CARD_WIDTH,
    height: 170,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  viewsBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  viewsText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  cardInfo: {
    padding: 14,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardCityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: "50%",
  },
  cardCity: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  cardStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "capitalize",
    flex: 1,
  },
  cardRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardRatingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },

  // TRENDING / FRESH ARRIVALS
  trendingList: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  trendingCard: {
    width: 200,
    height: 260,
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  trendingImage: {
    width: "100%",
    height: "100%",
  },
  trendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
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
    color: "#fff",
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
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  trendingViews: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendingViewsText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // BROWSE ALL GRID
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  gridCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  gridImageBox: {
    width: "100%",
    height: 140,
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridInfo: {
    padding: 12,
  },
  gridName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },
  gridMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 6,
  },
  gridCity: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },

  // SHARED
  noImage: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    color: "#94A3B8",
    fontWeight: "700",
    fontSize: 13,
  },
  emptySection: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionLoader: {
    marginVertical: 20,
  },
});