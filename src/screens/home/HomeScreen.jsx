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
  ImageBackground,
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
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react-native";

// Import a local promo image or use a remote one
import promoBg from "../../../assets/images/imagesell.jpg"; // <-- Replace with your actual image path

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 260;
const LIME = "#B9FA3C";
const NAVY = "#040045";

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
  // CATEGORIES
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
      <View style={styles.categoryIconBox}>
        <Text style={styles.categoryIcon}>{item.icon}</Text>
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProductCard = ({ item }) => {
    const image = getFirstImage(item);

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
      >
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

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardPrice}>
              {parseFloat(item.price).toFixed(item.price % 1 === 0 ? 0 : 2)} DH
            </Text>
            <View style={styles.cardCityRow}>
              <MapPin size={11} color="#8B8BAE" />
              <Text style={styles.cardCity} numberOfLines={1}>
                {item.city}
              </Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={[styles.statusDot, { backgroundColor: item.status === "available" ? LIME : "#F59E0B" }]} />
            <Text style={styles.cardStatus}>{item.status}</Text>
            <View style={styles.cardRating}>
              <Heart size={12} color="#8B8BAE" />
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

  const mostViewed = [...products]
    .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
    .slice(0, 10);

  const freshArrivals = [...products]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* ========================= */}
      {/* HEADER                    */}
      {/* ========================= */}
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
                <MapPin size={12} color="rgba(255,255,255,0.5)" />
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
            <Search size={18} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="rgba(255,255,255,0.4)"
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LIME} colors={[LIME]} />
        }
      >
        {/* ========================= */}
        {/* CATEGORIES                */}
        {/* ========================= */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Categories</Text>
          </View>
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
        {/* PROMO BANNER — IMAGE BG   */}
        {/* ========================= */}
        <TouchableOpacity style={styles.promoBanner} activeOpacity={0.9}>
          <ImageBackground
            source={promoBg}
            style={styles.promoImageBg}
            imageStyle={styles.promoImageStyle}
            resizeMode="cover"
          >
            {/* Full dark overlay holding all text */}
            <View style={styles.promoOverlay}>
              {/* Decorative lime accent line at top */}
              <View style={styles.promoAccentLine} />

              <View style={styles.promoContent}>
                <View style={styles.promoTagBox}>
                  <View style={styles.promoTagDot} />
                  <Text style={styles.promoTag}>NEW FEATURE</Text>
                </View>

                <Text style={styles.promoTitle}>Sell your items fast</Text>
                <Text style={styles.promoSub}>
                  Post an ad in under 2 minutes and reach thousands of buyers in your city instantly.
                </Text>

                <TouchableOpacity style={styles.promoBtn} activeOpacity={0.8}>
                  <Text style={styles.promoBtnText}>Post Now</Text>
                  <View style={styles.promoBtnIcon}>
                    <ArrowRight size={16} color={NAVY} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Bottom lime glow bar */}
              <View style={styles.promoBottomGlow} />
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* ========================= */}
        {/* MOST VIEWED               */}
        {/* ========================= */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconBox}>
              <TrendingUp size={16} color={LIME} />
            </View>
            <Text style={styles.sectionTitle}>Most Viewed</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator style={styles.sectionLoader} color={NAVY} />
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
            <View style={[styles.sectionIconBox, { backgroundColor: "rgba(4,0,69,0.06)" }]}>
              <Text style={{ fontSize: 14 }}>✨</Text>
            </View>
            <Text style={styles.sectionTitle}>Fresh Arrivals</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator style={styles.sectionLoader} color={NAVY} />
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
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Browse All</Text>
          </View>
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
                      <MapPin size={10} color="#8B8BAE" />
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
    backgroundColor: "#F0F0F7",
  },

  // HEADER
  header: {
    backgroundColor: NAVY,
    paddingTop: 55,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: LIME,
  },
  avatarText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "800",
  },
  greeting: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "600",
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
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
    backgroundColor: LIME,
    borderWidth: 2,
    borderColor: NAVY,
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    height: "100%",
  },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
  },

  // SECTIONS
  sectionHeader: {
    marginTop: 28,
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionBar: {
    width: 4,
    height: 24,
    backgroundColor: LIME,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.2,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(185,250,60,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8B8BAE",
  },

  // CATEGORIES
  categoryList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    alignItems: "center",
    gap: 8,
    marginRight: 14,
  },
  categoryIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.05)",
  },
  categoryIcon: {
    fontSize: 26,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B6B8D",
  },

  // ═══════════════════════════════════
  // PROMO BANNER — IMAGE BACKGROUND
  // ═══════════════════════════════════
  promoBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  promoImageBg: {
    width: "100%",
    height: 220,
  },
  promoImageStyle: {
    borderRadius: 24,
  },
  // Full overlay that holds ALL text
  promoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 0, 69, 0.82)",
    borderRadius: 24,
    padding: 24,
    justifyContent: "space-between",
  },
  // Top accent line
  promoAccentLine: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    backgroundColor: LIME,
    opacity: 0.4,
    borderRadius: 1,
  },
  promoContent: {
    flex: 1,
    justifyContent: "center",
  },
  promoTagBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  promoTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LIME,
  },
  promoTag: {
    fontSize: 11,
    fontWeight: "800",
    color: LIME,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  promoTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  promoSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 22,
    fontWeight: "500",
    marginBottom: 18,
    maxWidth: "85%",
  },
  promoBtn: {
    backgroundColor: LIME,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  promoBtnText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "800",
  },
  promoBtnIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(4,0,69,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Bottom glow bar
  promoBottomGlow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: LIME,
    opacity: 0.3,
  },

  // PRODUCT CARDS (Most Viewed)
  productList: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.05)",
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
    backgroundColor: "rgba(4,0,69,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
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
    color: NAVY,
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
    color: NAVY,
  },
  cardCityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: "50%",
  },
  cardCity: {
    fontSize: 12,
    color: "#8B8BAE",
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(4,0,69,0.05)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  cardStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B6B8D",
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
    color: "#8B8BAE",
  },

  // TRENDING / FRESH ARRIVALS
  trendingList: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  trendingCard: {
    width: 200,
    height: 260,
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
  },
  trendingImage: {
    width: "100%",
    height: "100%",
  },
  trendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,0,69,0.4)",
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
    color: NAVY,
    backgroundColor: LIME,
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
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.05)",
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
    color: NAVY,
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: NAVY,
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
    color: "#8B8BAE",
    fontWeight: "600",
  },

  // SHARED
  noImage: {
    backgroundColor: "#F0F0F7",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    color: "#A0A0C0",
    fontWeight: "700",
    fontSize: 13,
  },
  emptySection: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#A0A0C0",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionLoader: {
    marginVertical: 20,
  },
});