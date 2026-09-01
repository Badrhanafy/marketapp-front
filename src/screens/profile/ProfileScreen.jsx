import React, { useEffect, useState, useCallback, useRef } from "react";
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
const LIME = "#B9FA3C";
const NAVY = "#040045";

export default function ProfileScreen({ navigation }) {
  const { user, token, updateUser, logout } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [-20, 0],
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
  // STATUS COLOR HELPER — Lime/Navy Palette
  // =========================
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "sold":
        return { bg: "rgba(185,250,60,0.15)", text: LIME, border: "rgba(185,250,60,0.3)" };
      case "reserved":
        return { bg: "rgba(4,0,69,0.08)", text: NAVY, border: "rgba(4,0,69,0.2)" };
      case "active":
      case "available":
        return { bg: "rgba(185,250,60,0.22)", text: "#7BCF00", border: "rgba(185,250,60,0.4)" };
      default:
        return { bg: "rgba(4,0,69,0.06)", text: "#6B6B8D", border: "rgba(4,0,69,0.12)" };
    }
  };

  // =========================
  // PRODUCT CARD (HORIZONTAL)
  // =========================
  const renderProduct = ({ item, index }) => {
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
              <View style={styles.cityIconDot} />
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Floating Header */}
      <Animated.View 
        style={[
          styles.floatingHeader, 
          { 
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }]
          }
        ]}
      >
        <View style={styles.floatingHeaderInner}>
          <View style={styles.floatingHeaderDot} />
          <Text style={styles.floatingHeaderText}>
            {user?.name || "Profile"}
          </Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={productsLoading}
            onRefresh={fetchMyProducts}
            tintColor={LIME}
            colors={[LIME]}
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
          <View style={styles.headerOverlay} />
          
          {/* Decorative lime accent line */}
          <View style={styles.headerAccentLine} />

          {/* Profile Content */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarRingOuter}>
                <View style={styles.avatarRing}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user?.name
                        ? user.name.charAt(0).toUpperCase()
                        : "U"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.onlineIndicator} />
            </View>

            <Text style={styles.name}>{user?.name || "User"}</Text>
            <Text style={styles.email}>{user?.email || ""}</Text>

            {/* Quick Stats — Glassmorphism cards */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconBox}>
                  <Text style={styles.statIcon}>◆</Text>
                </View>
                <Text style={styles.statNumber}>{products.length}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: "rgba(185,250,60,0.15)" }]}>
                  <Text style={[styles.statIcon, { color: LIME }]}>✓</Text>
                </View>
                <Text style={styles.statNumber}>
                  {products.filter((p) => p.status === "sold").length}
                </Text>
                <Text style={styles.statLabel}>Sold</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: "rgba(185,250,60,0.1)" }]}>
                  <Text style={[styles.statIcon, { color: "#8BD600" }]}>●</Text>
                </View>
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
            {/* Lime accent edge */}
            <View style={styles.menuAccentEdge} />
          </TouchableOpacity>
        </View>

        {/* MY PRODUCTS HEADER */}
        <View style={styles.productsHeaderWrapper}>
          <View style={styles.productsHeaderLeft}>
            <View style={styles.sectionTitleBar} />
            <View>
              <Text style={styles.sectionTitle}>My Products</Text>
              <Text style={styles.sectionSubtitle}>
                Products you are selling
              </Text>
            </View>
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
            <TouchableOpacity style={styles.emptyCta} activeOpacity={0.8}>
              <Text style={styles.emptyCtaText}>Add Product</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* FOOTER */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <View style={styles.logoutIconBox}>
              <Text style={styles.logoutIcon}>→</Text>
            </View>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          <View style={styles.footerDivider} />
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
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderBar} />
                <View>
                  <Text style={styles.modalTitle}>Personal Information</Text>
                  <Text style={styles.modalSubtitle}>
                    Update your account information
                  </Text>
                </View>
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
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder="Your name"
                  autoCapitalize="words"
                  placeholderTextColor="#8B8BAE"
                />
                <View style={styles.inputAccent} />
              </View>

              {/* EMAIL */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholder="Your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#8B8BAE"
                />
                <View style={styles.inputAccent} />
              </View>

              {/* PHONE */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.input}
                  placeholder="Your phone"
                  keyboardType="phone-pad"
                  placeholderTextColor="#8B8BAE"
                />
                <View style={styles.inputAccent} />
              </View>

              {/* CITY */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  style={styles.input}
                  placeholder="Your city"
                  placeholderTextColor="#8B8BAE"
                />
                <View style={styles.inputAccent} />
              </View>

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
                  <ActivityIndicator color={NAVY} />
                ) : (
                  <>
                    <Text style={styles.saveText}>Save Changes</Text>
                    <View style={styles.saveIconBox}>
                      <Text style={styles.saveIcon}>→</Text>
                    </View>
                  </>
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
    backgroundColor: "#F0F0F7",
  },

  // FLOATING HEADER
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: NAVY,
    zIndex: 100,
    justifyContent: "flex-end",
    paddingBottom: 14,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  floatingHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LIME,
    marginRight: 10,
  },
  floatingHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // LIST
  listContent: {
    paddingBottom: 50,
  },

  // HEADER BACKGROUND
  headerBackground: {
    width: width,
    paddingTop: 60,
    paddingBottom: 35,
    position: "relative",
  },
  headerBackgroundImage: {
    resizeMode: "cover",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NAVY,
    opacity: 0.88,
  },
  headerAccentLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: LIME,
    opacity: 0.6,
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
    marginBottom: 16,
  },
  avatarRingOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(185,250,60,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(185,250,60,0.25)",
  },
  avatarRing: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(185,250,60,0.4)",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: NAVY,
    fontSize: 36,
    fontWeight: "800",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: LIME,
    borderWidth: 3,
    borderColor: NAVY,
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  email: {
    color: "rgba(255,255,255,0.55)",
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
  },

  // STATS
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(185,250,60,0.15)",
  },
  statItem: {
    alignItems: "center",
    minWidth: 80,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "700",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(185,250,60,0.2)",
    marginHorizontal: 14,
  },

  // SECTION WRAPPER
  sectionWrapper: {
    paddingHorizontal: 16,
    marginTop: -12,
    position: "relative",
    zIndex: 3,
  },

  // MENU
  menuItem: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.06)",
    position: "relative",
    overflow: "hidden",
  },
  menuAccentEdge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: LIME,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  menuIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(4,0,69,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuIcon: {
    fontSize: 22,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: NAVY,
  },
  menuSubtitle: {
    color: "#8B8BAE",
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
  },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(4,0,69,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    fontSize: 22,
    color: LIME,
    fontWeight: "400",
    lineHeight: 24,
  },

  // PRODUCTS HEADER
  productsHeaderWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  productsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitleBar: {
    width: 4,
    height: 32,
    backgroundColor: LIME,
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: "#8B8BAE",
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
  },
  productsCountBadge: {
    backgroundColor: NAVY,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  productsCount: {
    fontSize: 15,
    fontWeight: "800",
    color: LIME,
  },

  // HORIZONTAL PRODUCTS
  horizontalListContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 18,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.05)",
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
    backgroundColor: "#F0F0F7",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    color: "#A0A0C0",
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageStatusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productInfo: {
    padding: 14,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: NAVY,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: NAVY,
    marginTop: 6,
  },
  productBottom: {
    marginTop: 10,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cityIconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LIME,
    marginRight: 6,
  },
  productCity: {
    color: "#8B8BAE",
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(4,0,69,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.06)",
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: NAVY,
  },
  emptyText: {
    color: "#8B8BAE",
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  emptyCta: {
    marginTop: 20,
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCtaText: {
    color: LIME,
    fontWeight: "700",
    fontSize: 14,
  },

  // FOOTER
  footerSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    alignItems: "center",
  },
  logoutButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(185,250,60,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(185,250,60,0.25)",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexDirection: "row",
  },
  logoutIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(185,250,60,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    transform: [{ rotate: "180deg" }],
  },
  logoutIcon: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "700",
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  footerDivider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(4,0,69,0.08)",
    marginTop: 20,
    marginBottom: 10,
  },
  versionText: {
    color: "#B0B0D0",
    fontSize: 12,
    fontWeight: "600",
  },

  // MODAL
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 0, 69, 0.6)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 50,
    maxHeight: "92%",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalHeaderBar: {
    width: 4,
    height: 36,
    backgroundColor: LIME,
    borderRadius: 2,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    color: "#8B8BAE",
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(4,0,69,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    backgroundColor: "rgba(4,0,69,0.1)",
  },
  closeText: {
    fontSize: 26,
    color: NAVY,
    lineHeight: 30,
    fontWeight: "400",
  },

  // INPUT GROUP
  inputGroup: {
    position: "relative",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 14,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    height: 54,
    borderWidth: 1.5,
    borderColor: "rgba(4,0,69,0.08)",
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: "#F8F8FC",
    fontSize: 15,
    color: NAVY,
    fontWeight: "600",
  },
  inputAccent: {
    position: "absolute",
    bottom: 0,
    left: 18,
    right: 18,
    height: 2,
    backgroundColor: LIME,
    opacity: 0,
    borderRadius: 1,
  },

  // SAVE BUTTON
  saveButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    marginBottom: 14,
    flexDirection: "row",
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  saveIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(4,0,69,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  saveIcon: {
    fontSize: 12,
    color: NAVY,
    fontWeight: "800",
  },
  cancelButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#04045F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(4,0,69,0.06)",
  },
  cancelText: {
    color: "#B9FA3C",
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
});