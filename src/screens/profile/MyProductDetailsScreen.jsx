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
import { API_URL } from "../../constants/config";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function MyProductDetailsScreen({
  route,
  navigation,
}) {
  const { product: initialProduct } = route.params;

  const { token } = useAuth();

  const [product, setProduct] =
    useState(initialProduct);

  const [name, setName] =
    useState(initialProduct.name || "");

  const [price, setPrice] =
    useState(String(initialProduct.price || ""));

  const [city, setCity] =
    useState(initialProduct.city || "");

  const [description, setDescription] =
    useState(initialProduct.description || "");

  const [condition, setCondition] =
    useState(initialProduct.condition || "");

  const [status, setStatus] =
    useState(initialProduct.status || "available");

  const [loading, setLoading] =
    useState(false);

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "UPDATE PRODUCT:",
        response.data
      );

      const updated =
        response.data.product;

      setProduct(updated);

      Alert.alert(
        "Success",
        "Product updated successfully."
      );

      navigation.goBack();

    } catch (error) {
      console.log(
        "UPDATE PRODUCT ERROR:",
        error.response?.data ||
        error.message
      );

      const errors =
        error.response?.data?.errors;

      if (errors) {
        const message =
          Object.values(errors)
            .flat()
            .join("\n");

        Alert.alert(
          "Validation Error",
          message
        );
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.message ||
          "Unable to update product."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Edit Product
      </Text>

      <Text style={styles.subtitle}>
        Update your product information
      </Text>

      {/* CURRENT MEDIA */}

   {product.media?.length > 0 && (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.media}
  >
    {product.media.map((item) => {
      const imageUrl = `${API_URL}/${item.path}`;

      console.log("🖼️ MEDIA:", item);
      console.log("🌐 IMAGE URL:", imageUrl);

      return (
        <View
          key={item.id}
          style={styles.mediaItem}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.mediaImage}
            resizeMode="cover"
            onLoadStart={() =>
              console.log("⏳ IMAGE LOAD START:", imageUrl)
            }
            onLoad={() =>
              console.log("✅ IMAGE LOADED:", imageUrl)
            }
            onError={(error) =>
              console.log(
                "❌ IMAGE ERROR:",
                JSON.stringify(error.nativeEvent, null, 2)
              )
            }
          />
        </View>
      );
    })}
  </ScrollView>
)}

      {/* NAME */}

      <Text style={styles.label}>
        Product name
      </Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      {/* PRICE */}

      <Text style={styles.label}>
        Price
      </Text>

      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />

      {/* CITY */}

      <Text style={styles.label}>
        City
      </Text>

      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
      />

      {/* CONDITION */}

      <Text style={styles.label}>
        Condition
      </Text>

      <View style={styles.options}>
        {[
          "new",
          "like_new",
          "good",
          "fair",
          "poor",
        ].map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.option,
              condition === value &&
              styles.selected,
            ]}
            onPress={() =>
              setCondition(value)
            }
          >
            <Text
              style={
                condition === value
                  ? styles.selectedText
                  : styles.optionText
              }
            >
              {value.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* STATUS */}

      <Text style={styles.label}>
        Status
      </Text>

      <View style={styles.options}>
        {[
          "available",
          "reserved",
          "sold",
        ].map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.option,
              status === value &&
              styles.selected,
            ]}
            onPress={() =>
              setStatus(value)
            }
          >
            <Text
              style={
                status === value
                  ? styles.selectedText
                  : styles.optionText
              }
            >
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* DESCRIPTION */}

      <Text style={styles.label}>
        Description
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.textarea,
        ]}
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      {/* UPDATE */}

      <TouchableOpacity
        style={[
          styles.updateButton,
          loading && styles.disabled,
        ]}
        onPress={updateProduct}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.updateText}>
            Save Changes
          </Text>
        )}
      </TouchableOpacity>

      {/* MANAGE MEDIA */}

      <TouchableOpacity
        style={styles.mediaButton}
        onPress={() =>
          navigation.navigate(
            "ManageProductMedia",
            {
              product,
            }
          )
        }
      >
        <Text style={styles.mediaButtonText}>
          Manage Photos & Videos
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  content: {
    padding: 20,
    paddingTop: 55,
    paddingBottom: 120,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },

  subtitle: {
    color: "#777",
    marginTop: 5,
    marginBottom: 25,
  },

  media: {
    marginBottom: 25,
  },

  mediaItem: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 10,
  },

 mediaImage: {
  width: 110,
  height: 110,
  backgroundColor: "#ddd",
},

  video: {
    flex: 1,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },

  videoText: {
    color: "#fff",
    fontWeight: "700",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 7,
    marginTop: 10,
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 10,
  },

  textarea: {
    height: 120,
  },

  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  selected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },

  optionText: {
    color: "#333",
    textTransform: "capitalize",
  },

  selectedText: {
    color: "#fff",
    textTransform: "capitalize",
    fontWeight: "600",
  },

  updateButton: {
    height: 55,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  updateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.6,
  },

  mediaButton: {
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  mediaButtonText: {
    fontWeight: "700",
  },
});