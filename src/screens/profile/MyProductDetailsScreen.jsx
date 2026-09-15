import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
} from "react-native";
import { media_URL } from "../../constants/config";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

// ─── Theme ────────────────────────────────────────────────────────────────────
const theme = {
  colors: {
    primary: "#00D100",        // Brand green
    primaryDark: "#00A800",
    primaryLight: "#E6FAE6",
    accent: "#F59E0B",         // Amber (secondary accent)
    background: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceAlt: "#F5FBF5",
    border: "#E5E7EB",
    borderFocus: "#00D100",
    text: "#111827",
    textMuted: "#6B7280",
    textLight: "#9CA3AF",
    success: "#00D100",
    danger: "#EF4444",
    white: "#FFFFFF",
    overlay: "rgba(17, 24, 39, 0.55)",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    button: {
      shadowColor: "#00D100",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const buildMediaUrl = (path, baseUrl) => {
  if (!path) return null;
    return `${baseUrl}storage/${path}`;
};

const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MyProductDetailsScreen({ route, navigation }) {
  const { product: initialProduct } = route.params;
  const { token } = useAuth();

  const [product, setProduct] = useState(initialProduct);
  const [name, setName] = useState(initialProduct.name || "");
  const [price, setPrice] = useState(String(initialProduct.price || ""));
  const [city, setCity] = useState(initialProduct.city || "");
  const [description, setDescription] = useState(
    initialProduct.description || ""
  );
  const [condition, setCondition] = useState(initialProduct.condition || "");
  const [status, setStatus] = useState(
    initialProduct.status || "available"
  );
  const [loading, setLoading] = useState(false);

  const updateProduct = async () => {
    try {
      setLoading(true);
      const response = await api.put(
        `/products/${product.id}`,
        {
          name,
          price: Number(price),
          city,
          description,
          condition,
          status,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updated = response.data.product;
      setProduct(updated);

      Alert.alert("Success", "Product updated successfully.");
      navigation.goBack();
    } catch (error) {
      const errors = error.response?.data?.errors;
      if (errors) {
        const message = Object.values(errors).flat().join("\n");
        Alert.alert("Validation Error", message);
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.message || "Unable to update product."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const media = product.media || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Edit Product</Text>
        <Text style={styles.subtitle}>
          Update your product information
        </Text>
      </View>

      {/* Media */}
      {media.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Media</Text>
            <Text style={styles.sectionCount}>
              {media.length} {media.length === 1 ? "item" : "items"}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaScroll}
          >
            {media.map((item) => {
              const imageUrl = buildMediaUrl(item.path, media_URL);
              return (
                <View key={item.id} style={styles.mediaItem}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                    onError={(e) =>
                      console.log(
                        "❌ IMAGE ERROR:",
                        imageUrl,
                        e.nativeEvent
                      )
                    }
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Product Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter product name"
          placeholderTextColor={theme.colors.textLight}
        />
      </View>

      {/* Price */}
      <View style={styles.field}>
        <Text style={styles.label}>Price</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={theme.colors.textLight}
        />
      </View>

      {/* City */}
      <View style={styles.field}>
        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Enter city"
          placeholderTextColor={theme.colors.textLight}
        />
      </View>

      {/* Condition */}
      <View style={styles.field}>
        <Text style={styles.label}>Condition</Text>
        <View style={styles.options}>
          {CONDITION_OPTIONS.map(({ value, label }) => {
            const active = condition === value;
            return (
              <TouchableOpacity
                key={value}
                activeOpacity={0.8}
                style={[styles.option, active && styles.optionSelected]}
                onPress={() => setCondition(value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    active && styles.optionTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Status */}
      <View style={styles.field}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.options}>
          {STATUS_OPTIONS.map(({ value, label }) => {
            const active = status === value;
            return (
              <TouchableOpacity
                key={value}
                activeOpacity={0.8}
                style={[styles.option, active && styles.optionSelected]}
                onPress={() => setStatus(value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    active && styles.optionTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          placeholder="Describe your product..."
          placeholderTextColor={theme.colors.textLight}
        />
      </View>

      {/* Actions */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.primaryButton, loading && styles.disabled]}
        onPress={updateProduct}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.white} />
        ) : (
          <Text style={styles.primaryButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.secondaryButton}
        onPress={() =>
          navigation.navigate("ManageProductMedia", { product })
        }
      >
        <Text style={styles.secondaryButtonText}>
          Manage Photos & Videos
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    padding: theme.spacing.xl,
    paddingTop: 55,
    paddingBottom: 120,
  },

  header: {
    marginBottom: theme.spacing.xxl,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.4,
  },

  subtitle: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontSize: 14,
  },

  section: {
    marginBottom: theme.spacing.xl,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },

  sectionCount: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
  },

  mediaScroll: {
    paddingRight: theme.spacing.lg,
  },

  mediaItem: {
    width: 120,
    height: 120,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },

  mediaImage: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.surfaceAlt,
  },

  field: {
    marginBottom: theme.spacing.md,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
  },

  textarea: {
    height: 130,
    paddingTop: 14,
  },

  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },

  option: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  optionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  optionText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  optionTextSelected: {
    color: theme.colors.white,
    fontWeight: "700",
  },

  primaryButton: {
    height: 55,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xl,
    ...theme.shadow.button,
  },

  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  disabled: {
    opacity: 0.6,
  },

  secondaryButton: {
    height: 55,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md,
  },

  secondaryButtonText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
});