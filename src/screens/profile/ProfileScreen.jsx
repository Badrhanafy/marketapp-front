import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  ImageBackground,
  Dimensions,
  Animated,
  RefreshControl,
} from "react-native";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { media_URL } from "../../constants/config";
import bg from '../../../assets/images/khayma1.jpg'

const { width } = Dimensions.get("window");
const CARD_WIDTH = 172;

export default function ProfileScreen({ navigation }) {
  const { user, token, updateUser, logout } = useAuth();

  // =========================
  // ANIMATIONS
  // =========================
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // =========================
  // PROFILE MODAL
  // =========================
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // =========================
  // MY PRODUCTS
  // =========================
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // =========================
  // INITIAL USER DATA
  // =========================
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCity(user.city || "");
    }
  }, [user]);

  // =========================
  // GET MY PRODUCTS
  // =========================
  const fetchMyProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const response = await api.get("/my-products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data.products || []);
    } catch (error) {
      console.log("MY PRODUCTS ERROR:", error.response?.data || error.message);
    } finally {
      setProductsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchMyProducts();
  }, [token, fetchMyProducts]);

  // =========================
  // OPEN PROFILE MODAL
  // =========================
  const openEditProfile = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setCity(user?.city || "");
    setModalVisible(true);
  };

  // =========================
  // UPDATE PROFILE
  // =========================
  const updateProfile = async () => {
    try {
      setUpdateLoading(true);
      const response = await api.put(
        "/UpdateProfile",
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      updateUser(response.data.user);
      setModalVisible(false);
      Alert.alert("Success", "Your profile has been updated.");
    } catch (error) {
      console.log("UPDATE PROFILE ERROR:", error.response?.data || error.message);
      const errors = error.response?.data?.errors;
      if (errors) {
        const message = Object.values(errors).flat().join("\n");
        Alert.alert("Validation Error", message);
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.message || "Failed to update profile."
        );
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  // =========================
  // PRODUCT IMAGE
  // =========================
  const getProductImage = (product) => {
    if (!product?.media || product.media.length === 0) return null;
    const firstImage = product.media[0];
    if (!firstImage) return null;
    if (firstImage.path) {
      const cleanApiUrl = media_URL.endsWith("/")
        ? media_URL.slice(0, -1)
        : media_URL;
      const cleanPath = firstImage.path.startsWith("/")
        ? firstImage.path.slice(1)
        : firstImage.path;
      return `${cleanApiUrl}/storage/${cleanPath}`;
    }
    if (firstImage.url) return firstImage.url;
    return null;
  };

  // =========================
  // STATUS COLOR HELPER
  // =========================
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "sold":
        return { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" };
      case "reserved":
        return { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" };
      case "active":
      case "available":
        return { bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" };
    }
  };

  // =========================
  // PRODUCT CARD (HORIZONTAL)
  // =========================
  const renderProduct = ({ item }) => {
    const image = getProductImage(item);
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.85}
        onPress={() => {
          navigation.navigate("MyProductDetails", { product: item });
        }}
      >
        {/* IMAGE */}
        <View style={styles.productImageContainer}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
          {/* Status Badge on Image */}
          <View
            style={[
              styles.imageStatusBadge,
              {
                backgroundColor: statusStyle.bg,
                borderColor: statusStyle.border,
              },
            ]}
          >
            <Text
              style={[
                styles.imageStatusText,
                { color: statusStyle.text },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        {/* INFO */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>{item.price} DH</Text>
          <View style={styles.productBottom}>
            <View style={styles.cityRow}>
              <Text style={styles.cityIcon}>📍</Text>
              <Text style={styles.productCity} numberOfLines={1}>
                {item.city}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  // =========================
  // SCREEN
  // =========================
  return (
    <View style={styles.container}>
      {/* Custom Status Bar */}
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* Floating Header (appears on scroll) */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <Text style={styles.floatingHeaderText}>
          {user?.name || "Profile"}
        </Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={productsLoading}
            onRefresh={fetchMyProducts}
            tintColor="#0F172A"
            colors={["#0F172A"]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* BACKGROUND HEADER WITH OVERLAY */}
        <ImageBackground
          source={bg}
          style={styles.headerBackground}
          imageStyle={styles.headerBackgroundImage}
        >
          {/* Dark Overlay - Less transparency = more opaque */}
          <View style={styles.headerOverlay} />

          {/* Profile Content */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.name
                      ? user.name.charAt(0).toUpperCase()
                      : "U"}
                  </Text>
                </View>
              </View>
              <View style={styles.onlineIndicator} />
            </View>

            <Text style={styles.name}>{user?.name || "User"}</Text>
            <Text style={styles.email}>{user?.email || ""}</Text>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{products.length}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {products.filter((p) => p.status === "sold").length}
                </Text>
                <Text style={styles.statLabel}>Sold</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {products.filter((p) => p.status === "active" || p.status === "available").length}
                </Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* PERSONAL INFORMATION */}
        <View style={styles.sectionWrapper}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={openEditProfile}
          >
            <View style={styles.menuIconBox}>
              <Text style={styles.menuIcon}>👤</Text>
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>Personal Information</Text>
              <Text style={styles.menuSubtitle}>
                Name, email, phone and city
              </Text>
            </View>
            <View style={styles.arrowBox}>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* MY PRODUCTS HEADER */}
        <View style={styles.productsHeaderWrapper}>
          <View>
            <Text style={styles.sectionTitle}>My Products</Text>
            <Text style={styles.sectionSubtitle}>
              Products you are selling
            </Text>
          </View>
          <View style={styles.productsCountBadge}>
            <Text style={styles.productsCount}>{products.length}</Text>
          </View>
        </View>

        {/* HORIZONTAL PRODUCTS LIST */}
        {products.length > 0 ? (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            decelerationRate="fast"
          />
        ) : !productsLoading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIcon}>📦</Text>
            </View>
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptyText}>
              You haven't uploaded any products yet. Start selling today!
            </Text>
          </View>
        ) : null}

        {/* FOOTER */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>App v1.0.0</Text>
        </View>
      </Animated.ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Personal Information</Text>
                <Text style={styles.modalSubtitle}>
                  Update your account information
                </Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* NAME */}
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Your name"
                autoCapitalize="words"
                placeholderTextColor="#9CA3AF"
              />

              {/* EMAIL */}
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="Your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />

              {/* PHONE */}
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                placeholder="Your phone"
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />

              {/* CITY */}
              <Text style={styles.label}>City</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                style={styles.input}
                placeholder="Your city"
                placeholderTextColor="#9CA3AF"
              />

              {/* SAVE */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  updateLoading && styles.disabled,
                ]}
                onPress={updateProfile}
                disabled={updateLoading}
                activeOpacity={0.8}
              >
                {updateLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              {/* CANCEL */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  // FLOATING HEADER
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "#0F172A",
    zIndex: 100,
    justifyContent: "flex-end",
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  // LIST
  listContent: {
    paddingBottom: 40,
  },

  // HEADER BACKGROUND
  headerBackground: {
    width: width,
    paddingTop: 50,
    paddingBottom: 30,
  },
  headerBackgroundImage: {
    resizeMode: "cover",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#036203",
    opacity: 0.8,
  },

  // PROFILE
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
    position: "relative",
    zIndex: 2,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 14,
  },
  avatarRing: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#0F172A",
    fontSize: 34,
    fontWeight: "800",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#10B981",
    borderWidth: 3,
    borderColor: "#0F172A",
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  email: {
    color: "rgba(255,255,255,0.65)",
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
  },

  // STATS
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statItem: {
    alignItems: "center",
    minWidth: 70,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginTop: 3,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 16,
  },

  // SECTION WRAPPER
  sectionWrapper: {
    paddingHorizontal: 16,
    marginTop: -10,
    position: "relative",
    zIndex: 3,
  },

  // MENU
  menuItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  menuSubtitle: {
    color: "#64748B",
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
  },
  arrowBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    fontSize: 20,
    color: "#94A3B8",
    fontWeight: "400",
    lineHeight: 22,
  },

  // PRODUCTS HEADER
  productsHeaderWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: "#64748B",
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
  },
  productsCountBadge: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  productsCount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },

  // HORIZONTAL PRODUCTS
  horizontalListContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  productImageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  noImage: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 13,
  },
  imageStatusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageStatusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },
  productBottom: {
    marginTop: 8,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cityIcon: {
    fontSize: 11,
    marginRight: 3,
  },
  productCity: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  // EMPTY STATE
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyText: {
    color: "#64748B",
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },

  // FOOTER
  footerSection: {
    paddingHorizontal: 16,
    marginTop: 10,
    alignItems: "center",
  },
  logoutButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  versionText: {
    color: "#CBD5E1",
    fontSize: 12,
    marginTop: 16,
    fontWeight: "600",
  },

  // MODAL
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    color: "#64748B",
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    backgroundColor: "#E2E8F0",
  },
  closeText: {
    fontSize: 26,
    color: "#475569",
    lineHeight: 30,
    fontWeight: "400",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 12,
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "600",
  },
  saveButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cancelButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
});