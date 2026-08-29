import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
// ============================================================
//  CONFIGURATION – change to your actual server IP
// ============================================================
const API_BASE_URL = API_URL;

export default function MyProductsScreen({ navigation }) {
  const { token } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ============================================================
  //  FETCH MY PRODUCTS
  // ============================================================
  const fetchMyProducts = async () => {
    try {
      const response = await api.get("/my-products", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ MY PRODUCTS RESPONSE:", response.data);

      // 🔥 Your API returns: { status: true, products: [ ... ] }
      // (If it ever changes to { products: { data: [...] } }, this still works)
      let productsData = response.data?.products;
      if (productsData && !Array.isArray(productsData)) {
        productsData = productsData.data || [];
      }
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.log("❌ FETCH ERROR:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Unable to load your products."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyProducts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyProducts();
  };

  // ============================================================
  //  IMAGE URL CONSTRUCTION
  // ============================================================
const getImageUrl = (mediaItem) => {
    if (!mediaItem) return null;

    if (mediaItem.path) {
      return `${API_BASE_URL}/storage/${mediaItem.path}`;
    }

    if (mediaItem.url) {
      return mediaItem.url
        .replace("localhost", "192.168.100.160") // دير IP الصحيح ديالك هنا
        .replace("127.0.0.1", "192.168.100.160");
    }

    return null;
  };

  // ============================================================
  //  PRODUCT ITEM RENDERER
  // ============================================================
  const renderProduct = ({ item }) => {
    // Get the first image (type === "image") from the media array
    const firstImage = item.media?.find((m) => m.type === "image");
    const imageUrl = getImageUrl(firstImage);

    // Debug: log the URL being used
    console.log(`🖼️ Product ${item.id} → image URL:`, imageUrl);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("MyProductDetails", { product: item })
        }
      >
        {/* ============================================ */}
        {/*  IMAGE SECTION                             */}
        {/* ============================================ */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onLoadStart={() =>
                console.log(`🟡 Loading product ${item.id}`)
              }
              onLoad={() =>
                console.log(`🟢 Loaded product ${item.id}`)
              }
              onError={(e) =>
                console.log(
                  `🔴 Failed product ${item.id}:`,
                  e.nativeEvent.error
                )
              }
            />
          ) : (
            // Fallback when no image URL is available
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>📷 No image</Text>
            </View>
          )}

          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              item.status === "available" && styles.available,
              item.status === "reserved" && styles.reserved,
              item.status === "sold" && styles.sold,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {/* ============================================ */}
        {/*  PRODUCT INFO                               */}
        {/* ============================================ */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.price}>
            {Number(item.price).toLocaleString()} DH
          </Text>
          <Text style={styles.city}>📍 {item.city}</Text>

          <View style={styles.meta}>
            <Text style={styles.metaText}>👁 {item.views_count || 0}</Text>
            <Text style={styles.metaText}>❤️ {item.likes_count || 0}</Text>
            <Text style={styles.metaText}>📷 {item.media?.length || 0}</Text>
          </View>

          <Text style={styles.editHint}>Tap to manage →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================================
  //  LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>Loading your products…</Text>
      </View>
    );
  }

  // ============================================================
  //  MAIN RENDER
  // ============================================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Products</Text>
          <Text style={styles.subtitle}>
            {products.length} product{products.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("Sell")}
        >
          <Text style={styles.addButtonText}>+ Sell</Text>
        </TouchableOpacity>
      </View>

      {/* Empty or List */}
      {products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptyText}>
            You haven't published any products.
          </Text>
          <TouchableOpacity
            style={styles.sellButton}
            onPress={() => navigation.navigate("Sell")}
          >
            <Text style={styles.sellButtonText}>Sell something</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ============================================================
//  STYLES (unchanged, but included for completeness)
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    color: "#777",
    marginTop: 4,
  },
  addButton: {
    backgroundColor: "#111",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  list: {
    padding: 15,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 15,
    overflow: "hidden",
  },
  imageContainer: {
    height: 210,
    width: "100%",
    position: "relative",
    backgroundColor: "#f0f0f0",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  noImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
  },
  noImageText: {
    color: "#999",
    fontSize: 16,
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  available: {
    backgroundColor: "#dcfce7",
  },
  reserved: {
    backgroundColor: "#fef3c7",
  },
  sold: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  info: {
    padding: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
  },
  city: {
    color: "#777",
    marginTop: 5,
  },
  meta: {
    flexDirection: "row",
    gap: 18,
    marginTop: 12,
  },
  metaText: {
    color: "#666",
    fontSize: 13,
  },
  editHint: {
    color: "#111",
    fontWeight: "600",
    marginTop: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    color: "#777",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 50,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 15,
  },
  emptyText: {
    color: "#777",
    marginTop: 6,
    textAlign: "center",
  },
  sellButton: {
    backgroundColor: "#111",
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 20,
  },
  sellButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});