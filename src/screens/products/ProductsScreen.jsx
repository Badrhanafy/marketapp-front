import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  SafeAreaView,
} from "react-native";
import {
  SlidersHorizontal,
  Search,
  XCircle,
  X,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import api from "../../api/client";
import { API_URL } from "../../constants/config";

// ============================================================
//  CONFIGURATION
// ============================================================
const API_BASE_URL = API_URL;

// ============================================================
//  PRODUCT CARD COMPONENT (separate component = hooks allowed)
// ============================================================
const ProductCard = ({ item, onPress }) => {
  const { t } = useTranslation();
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // Reset failure state when item changes
  useEffect(() => {
    setImageLoadFailed(false);
  }, [item.id]);

  // Get first image from media array
  const firstImage =
    item.media?.find((m) => m.type === "image") || item.media?.[0];

  // Build image URL
  const getImageUrl = (mediaItem) => {
    if (!mediaItem) return null;

    // إذا كان الـ path موجود، صاوب الرابط مباشرة باستخدام API_BASE_URL الصحيح مع الـ Port 8000
    if (mediaItem.path) {
      return `${API_BASE_URL}/storage/${mediaItem.path}`;
    }

    // وإلا إلا كان فيه url قديم، بدل localhost وz'id الـ port إذا كان ناقص
    if (mediaItem.url) {
      return mediaItem.url
        .replace("localhost", "192.168.8.5")
        .replace("127.0.0.1", "192.168.8.8");
    }

    return null;
  };

  const imageUrl = getImageUrl(firstImage);

  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        {imageUrl && !imageLoadFailed ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          // Fallback: show first letter of product name
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
            <Text style={styles.fallbackSubText}>{t("common.noImage")}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.price}>
          {Number(item.price).toLocaleString()} DH
        </Text>

        <View style={styles.meta}>
          <Text style={styles.location}>📍 {item.city || "Unknown"}</Text>
          <Text style={styles.condition}>{item.condition || "N/A"}</Text>
        </View>

        <View style={styles.stats}>
          <Text>❤️ {item.likes_count || 0}</Text>
          <Text>👁️ {item.views_count || 0}</Text>
          <Text>⭐ {item.rating_avg || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================================
//  MAIN PRODUCTS SCREEN
// ============================================================
export default function ProductsScreen({ navigation }) {
  const { t } = useTranslation();
  // ---- State ----
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // ---- Fetch Products ----
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

  // ---- Filtering Logic ----
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

  // ---- Extract unique filter options ----
  const categories = useMemo(() => {
    const cats = products.map((p) => p.category).filter(Boolean);
    const unique = new Map();
    cats.forEach((c) => unique.set(c.id, c));
    return Array.from(unique.values());
  }, [products]);

  const conditions = useMemo(() => {
    const conds = products.map((p) => p.condition).filter(Boolean);
    return [...new Set(conds)];
  }, [products]);

  const cities = useMemo(() => {
    const cityList = products.map((p) => p.city).filter(Boolean);
    return [...new Set(cityList)];
  }, [products]);

  // ---- Reset Filters ----
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedCondition(null);
    setSelectedCity(null);
  };

  // ---- Loading / Error States ----
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>{t("products.loadingProducts")}</Text>
      </View>
    );
  }

  if (error && products.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            fetchProducts();
          }}
        >
          <Text style={styles.retryText}>{t("common.tryAgain")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Main Render ----
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("products.marketplace")}</Text>
          <Text style={styles.subtitle}>{t("products.discoverNear")}</Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <SlidersHorizontal size={24} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#777" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("products.searchProducts")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <XCircle size={20} color="#777" />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filters (chips) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsContainer}
      >
        {selectedCategory && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {categories.find((c) => c.id === selectedCategory)?.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <X size={16} color="#555" />
            </TouchableOpacity>
          </View>
        )}
        {selectedCondition && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{selectedCondition}</Text>
            <TouchableOpacity onPress={() => setSelectedCondition(null)}>
              <X size={16} color="#555" />
            </TouchableOpacity>
          </View>
        )}
        {selectedCity && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{selectedCity}</Text>
            <TouchableOpacity onPress={() => setSelectedCity(null)}>
              <X size={16} color="#555" />
            </TouchableOpacity>
          </View>
        )}
        {(selectedCategory || selectedCondition || selectedCity) && (
          <TouchableOpacity onPress={resetFilters}>
            <Text style={styles.clearAll}>{t("products.clearAll")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            onPress={() =>
              navigation.navigate("ProductDetails", { productId: item.id })
            }
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t("products.noMatchTitle")}</Text>
            <Text style={styles.emptyText}>{t("products.noMatchText")}</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("products.filters")}</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <X size={24} color="#111" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category */}
              <Text style={styles.filterLabel}>{t("products.category")}</Text>
              <View style={styles.filterOptions}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.filterOption,
                      selectedCategory === cat.id && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text
                      style={
                        selectedCategory === cat.id
                          ? styles.filterOptionActiveText
                          : {}
                      }
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Condition */}
              <Text style={styles.filterLabel}>{t("products.condition")}</Text>
              <View style={styles.filterOptions}>
                {conditions.map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[
                      styles.filterOption,
                      selectedCondition === cond && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedCondition(cond)}
                  >
                    <Text
                      style={
                        selectedCondition === cond
                          ? styles.filterOptionActiveText
                          : {}
                      }
                    >
                      {cond}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* City */}
              <Text style={styles.filterLabel}>{t("products.city")}</Text>
              <View style={styles.filterOptions}>
                {cities.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[
                      styles.filterOption,
                      selectedCity === city && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedCity(city)}
                  >
                    <Text
                      style={
                        selectedCity === city ? styles.filterOptionActiveText : {}
                      }
                    >
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>{t("products.resetAll")}</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>{t("products.applyFilters")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
//  STYLES (unchanged)
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { marginTop: 4, color: "#777", fontSize: 14 },
  filterButton: { padding: 8 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  chipsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: { marginRight: 6, color: "#333" },
  clearAll: { color: "#111", fontWeight: "600", paddingVertical: 6 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 15,
    overflow: "hidden",
    flexDirection: "row",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  imageContainer: {
    width: 125,
    height: 145,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    width: "100%",
    height: "100%",
  },
  fallbackText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#666",
  },
  fallbackSubText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  info: { flex: 1, padding: 12 },
  name: { fontSize: 16, fontWeight: "600", color: "#222" },
  price: { marginTop: 7, fontSize: 18, fontWeight: "700" },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  location: { color: "#777", fontSize: 12, flex: 1 },
  condition: {
    fontSize: 11,
    color: "#555",
    backgroundColor: "#eee",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: { marginTop: 10, color: "#777" },
  error: { textAlign: "center", color: "#d00", marginBottom: 15 },
  retryButton: {
    backgroundColor: "#111",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyText: { color: "#777", marginTop: 7 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  filterLabel: { fontSize: 16, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  filterOptions: { flexDirection: "row", flexWrap: "wrap" },
  filterOption: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionActive: { backgroundColor: "#111" },
  filterOptionActiveText: { color: "#fff" },
  resetButton: { marginTop: 20, alignSelf: "center", padding: 10 },
  resetButtonText: { color: "#111", fontWeight: "600" },
  applyButton: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  applyButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});