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
  SafeAreaView,
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
  Sparkles,
  ChevronRight,
  Layers,
} from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 260;
const LIME = "#B9FA3C";
const NAVY = "#040045";
const MUTED = "#8B8BAE";
const BG = "#F5F6FA";

// Import background image
import backgroundimage from '../../../assets/images/imagesell.jpg';
import backgroundimage2 from '../../../assets/images/headerbg.jpg';

export default function HomeScreen({ navigation }) {
  const { user, token } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
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

  // =========================
  // FETCH CATEGORIES
  // =========================
  const fetchCategories = useCallback(async () => {
    try {
      setCatLoading(true);
      const response = await api.get("/categories");
      const data = response.data.categories || response.data.data || [];
      setCategories(data);
    } catch (error) {
      console.log("CATEGORIES ERROR:", error.response?.data || error.message);
    } finally {
      setCatLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
    fetchCategories();
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
  // CATEGORY ICON & COLOR MAP
  // =========================
  const getCategoryMeta = (name) => {
    const n = (name || "").toLowerCase();
    if (n.includes("electronic") || n.includes("phone") || n.includes("tech")) 
      return { Icon: Smartphone, color: "#6366f1", bg: "rgba(99,102,241,0.08)" };
    if (n.includes("cloth") || n.includes("fashion") || n.includes("wear") || n.includes("shirt")) 
      return { Icon: Shirt, color: "#ec4899", bg: "rgba(236,72,153,0.08)" };
    if (n.includes("home") || n.includes("furniture") || n.includes("house")) 
      return { Icon: Home, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" };
    if (n.includes("sport") || n.includes("gym") || n.includes("fitness")) 
      return { Icon: Dumbbell, color: "#10b981", bg: "rgba(16,185,129,0.08)" };
    if (n.includes("book") || n.includes("edu")) 
      return { Icon: BookOpen, color: "#3b82f6", bg: "rgba(59,130,246,0.08)" };
    if (n.includes("vehicle") || n.includes("car") || n.includes("auto")) 
      return { Icon: Car, color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
    if (n.includes("watch") || n.includes("jewel")) 
      return { Icon: Watch, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" };
    if (n.includes("bike") || n.includes("outdoor") || n.includes("cycle")) 
      return { Icon: Bike, color: "#14b8a6", bg: "rgba(20,184,166,0.08)" };
    if (n.includes("camera") || n.includes("photo")) 
      return { Icon: Camera, color: "#f97316", bg: "rgba(249,115,22,0.08)" };
    return { Icon: Tag, color: "#64748b", bg: "rgba(100,116,139,0.08)" };
  };

  // =========================
  // DERIVED LISTS
  // =========================
  const mostViewed = [...products]
    .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
    .slice(0, 10);

  const freshArrivals = [...products]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  // =========================
  // RENDERERS
  // =========================

  // ── Half-Border Category Card ──
  const renderCategory = ({ item }) => {
    const { Icon, color, bg } = getCategoryMeta(item.name);
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("CategoryProducts", { categoryName: item.name })}
      >
        <View style={[styles.categoryHalfBorder, { backgroundColor: color }]} />
        <View style={[styles.categoryIconCircle, { backgroundColor: bg }]}>
          <Icon size={22} color={color} strokeWidth={2} />
        </View>
        <Text style={styles.categoryCardName} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Product Card (Most Viewed) ──
  const renderProductCard = ({ item }) => {
    const image = getFirstImage(item);
    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
      >
        <View style={styles.cardImageBox}>
          {image ? (
            <Image source={{ uri: image }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.noImage]}>
              <Camera size={24} color={MUTED} />
            </View>
          )}
          <View style={styles.viewsBadge}>
            <Eye size={12} color="#fff" />
            <Text style={styles.viewsText}>{item.views_count || 0}</Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardPrice}>
              {parseFloat(item.price).toFixed(item.price % 1 === 0 ? 0 : 2)} DH
            </Text>
            <View style={styles.cardCityRow}>
              <MapPin size={11} color={MUTED} />
              <Text style={styles.cardCity} numberOfLines={1}>{item.city}</Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={[styles.statusDot, { backgroundColor: item.status === "available" ? LIME : "#F59E0B" }]} />
            <Text style={styles.cardStatus}>{item.status}</Text>
            <View style={styles.cardRating}>
              <Heart size={12} color={MUTED} />
              <Text style={styles.cardRatingText}>{item.likes_count || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Fresh Arrivals Card ──
  const renderTrendingCard = ({ item }) => {
    const image = getFirstImage(item);
    return (
      <TouchableOpacity
        style={styles.trendingCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.trendingImage} resizeMode="cover" />
        ) : (
          <View style={[styles.trendingImage, styles.noImage]}>
            <Camera size={24} color={MUTED} />
          </View>
        )}
        <View style={styles.trendingOverlay} />
        <View style={styles.trendingContent}>
          <Text style={styles.trendingName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.trendingRow}>
            <Text style={styles.trendingPrice}>{parseFloat(item.price).toFixed(0)} DH</Text>
            <View style={styles.trendingViews}>
              <Eye size={12} color="#fff" />
              <Text style={styles.trendingViewsText}>{item.views_count || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ═══════════════════════════════════ */}
      {/* HEADER with Background Image      */}
      {/* ═══════════════════════════════════ */}
      <View style={styles.headerContainer}>
        <Image 
          source={backgroundimage}
          style={styles.headerBgImage} 
          resizeMode="cover" 
        />
        <View style={styles.headerOverlay}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.greeting}>{getGreeting()}</Text>
                    <View style={styles.locationRow}>
                      <MapPin size={12} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.locationText}>{user?.city || "Your city"}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.notifBtn} activeOpacity={0.8}>
                  <Bell size={20} color="#fff" />
                  <View style={styles.notifDot} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchWrap}>
                <View style={styles.searchBox}>
                  <Search size={18} color="rgba(255,255,255,0.6)" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products, brands..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
                  <SlidersHorizontal size={20} color={NAVY} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LIME} colors={[LIME]} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ═══════════════════════════════════ */}
        {/* CATEGORIES — Fetched from API     */}
        {/* ═══════════════════════════════════ */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <View style={styles.sectionIconBox}>
                <Layers size={16} color={LIME} />
              </View>
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
              <Text style={styles.seeAll}>See all</Text>
              <ChevronRight size={14} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {catLoading && categories.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={NAVY} />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => `cat-${item.id}`}
            renderItem={renderCategory}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        )}

        {/* ═══════════════════════════════════ */}
        {/* PROMO BANNER                      */}
        {/* ═══════════════════════════════════ */}
        <TouchableOpacity style={styles.promoCard} activeOpacity={0.9}>
          <Image 
            source={backgroundimage}
            style={styles.promoBgImage} 
            resizeMode="cover" 
          />
          <View style={styles.promoOverlay}>
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Sell your items fast</Text>
              <Text style={styles.promoSub}>Post an ad in under 2 minutes in confidence and safety</Text>
              <TouchableOpacity style={styles.promoBtn}>
                <Text style={styles.promoBtnText}>Post Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* ═══════════════════════════════════ */}
        {/* MOST VIEWED                       */}
        {/* ═══════════════════════════════════ */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <View style={styles.sectionIconBox}>
                <TrendingUp size={16} color={LIME} />
              </View>
              <Text style={styles.sectionTitle}>Most Viewed</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
              <Text style={styles.seeAll}>See all</Text>
              <ChevronRight size={14} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={NAVY} />
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
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No products yet</Text>
          </View>
        )}

        {/* ═══════════════════════════════════ */}
        {/* FRESH ARRIVALS                    */}
        {/* ═══════════════════════════════════ */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <View style={[styles.sectionIconBox, { backgroundColor: "rgba(99,102,241,0.1)" }]}>
                <Sparkles size={16} color="#6366f1" />
              </View>
              <Text style={styles.sectionTitle}>Fresh Arrivals</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
              <Text style={styles.seeAll}>See all</Text>
              <ChevronRight size={14} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && products.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={NAVY} />
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
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No new arrivals</Text>
          </View>
        )}

        {/* ═══════════════════════════════════ */}
        {/* BROWSE ALL GRID                   */}
        {/* ═══════════════════════════════════ */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <View style={[styles.sectionIconBox, { backgroundColor: "rgba(4,0,69,0.06)" }]}>
                <Search size={16} color={NAVY} />
              </View>
              <Text style={styles.sectionTitle}>Browse All</Text>
            </View>
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
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
                >
                  <View style={styles.gridImageBox}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.gridImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.gridImage, styles.noImage]}>
                        <Camera size={20} color={MUTED} />
                      </View>
                    )}
                  </View>
                  <View style={styles.gridInfo}>
                    <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.gridPrice}>
                      {parseFloat(item.price).toFixed(item.price % 1 === 0 ? 0 : 2)} DH
                    </Text>
                    <View style={styles.gridMeta}>
                      <MapPin size={10} color={MUTED} />
                      <Text style={styles.gridCity} numberOfLines={1}>{item.city}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBox}>
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
    backgroundColor: BG,
  },

  // ── Header with Background Image ──
  headerContainer: {
    height: 260,
    position: "relative",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  headerBgImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,0,69,0.6)",
  },
  safeArea: {
    flex: 1,
  },
  headerContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 40,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: LIME,
  },
  avatarText: {
    color: NAVY,
    fontSize: 18,
    fontWeight: "900",
  },
  greeting: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
  },
  notifBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  notifDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LIME,
    borderWidth: 2,
    borderColor: "rgba(4,0,69,0.5)",
  },

  // ── Search ──
  searchWrap: {
    flexDirection: "row",
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 54,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    height: "100%",
  },
  filterBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  // ── Scroll Content ──
  scrollContent: {
    paddingTop: 4,
  },

  // ── Section Headers ──
  sectionPad: {
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(185,250,60,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "700",
    color: MUTED,
  },

  // ── Categories (Half-Border Cards) ──
  categoryList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginRight: 12,
    minWidth: 140,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.04)",
    overflow: "hidden",
    position: "relative",
  },
  categoryHalfBorder: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 2,
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryCardName: {
    fontSize: 14,
    fontWeight: "800",
    color: NAVY,
    maxWidth: 90,
  },

  // ── Promo Banner ──
  promoCard: {
    marginTop: 20,
    marginHorizontal: 20,
    marginTop: 6,
    borderRadius: 20,
    overflow: "hidden",
    height: 180,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  promoBgImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  promoOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,0,69,0.65)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  promoContent: {
    gap: 6,
  },
  promoTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  promoSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    marginBottom: 8,
  },
  promoBtn: {
    backgroundColor: LIME,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignSelf: "flex-start",
    borderRadius: 0,
  },
  promoBtnText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Product Cards ──
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
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.04)",
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
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(4,0,69,0.55)",
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
    padding: 16,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "800",
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
    fontWeight: "900",
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
    color: MUTED,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(4,0,69,0.04)",
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
    color: MUTED,
  },

  // ── Trending / Fresh Arrivals ──
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
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.04)",
  },
  trendingImage: {
    width: "100%",
    height: "100%",
  },
  trendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,0,69,0.35)",
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

  // ── Browse All Grid ──
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 14,
  },
  gridCard: {
    width: (SCREEN_WIDTH - 54) / 2,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.03)",
  },
  gridImageBox: {
    width: "100%",
    height: 150,
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridInfo: {
    padding: 14,
  },
  gridName: {
    fontSize: 14,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 4,
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: NAVY,
    marginBottom: 6,
  },
  gridMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  gridCity: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
  },

  // ── Shared ──
  noImage: {
    backgroundColor: "#F0F0F7",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#A0A0C0",
    fontSize: 14,
    fontWeight: "600",
  },
  loader: {
    marginVertical: 20,
  },
});