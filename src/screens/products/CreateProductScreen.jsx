import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function CreateProductScreen({ navigation }) {
  const { token } = useAuth();

  // Product fields
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");

  // Categories
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  // Media
  const [media, setMedia] = useState([]);

  // Loading
  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [loading, setLoading] = useState(false);

  // =====================================================
  // FETCH CATEGORIES
  // =====================================================

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");

      console.log("CATEGORIES:", response.data);

      setCategories(
        response.data.categories ||
          response.data.data ||
          []
      );
    } catch (error) {
      console.log(
        "CATEGORIES ERROR:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Error",
        "Unable to load categories."
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // =====================================================
  // PICK MEDIA
  // =====================================================

  const pickMedia = async () => {
    if (media.length >= 8) {
      Alert.alert(
        "Maximum reached",
        "You can add maximum 8 images/videos."
      );
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow access to your photos and videos."
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: 8 - media.length,
        quality: 0.8,
      });

    if (result.canceled) {
      return;
    }

    const selected = result.assets || [];

    setMedia((current) => [
      ...current,
      ...selected,
    ].slice(0, 8));
  };

  // =====================================================
  // REMOVE MEDIA
  // =====================================================

  const removeMedia = (index) => {
    setMedia((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  // =====================================================
  // CREATE PRODUCT
  // =====================================================

  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert("Error", "Product name is required.");
      return;
    }

    if (!price.trim()) {
      Alert.alert("Error", "Price is required.");
      return;
    }

    if (!categoryId) {
      Alert.alert("Error", "Please select a category.");
      return;
    }

    if (!city.trim()) {
      Alert.alert("Error", "City is required.");
      return;
    }

    if (!condition.trim()) {
      Alert.alert("Error", "Condition is required.");
      return;
    }

    if (media.length === 0) {
      Alert.alert(
        "Error",
        "Please add at least one image or video."
      );
      return;
    }

    try {
      setLoading(true);

      // =================================================
      // STEP 1: CREATE PRODUCT
      // =================================================

      const productResponse = await api.post(
        "/products",
        {
          name: name.trim(),
          price: Number(price),
          category_id: categoryId,
          city: city.trim(),
          condition: condition.trim(),
          description: description.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "PRODUCT RESPONSE:",
        productResponse.data
      );

      const product =
        productResponse.data.product ||
        productResponse.data.data;

      if (!product?.id) {
        throw new Error(
          "Product ID was not returned by the server."
        );
      }

      // =================================================
      // STEP 2: UPLOAD MEDIA
      // =================================================

      const formData = new FormData();

      media.forEach((item) => {
        const uri = item.uri;

        const fileName =
          item.fileName ||
          uri.split("/").pop() ||
          `media-${Date.now()}`;

        let mimeType = item.mimeType;

        if (!mimeType) {
          if (item.type === "video") {
            mimeType = "video/mp4";
          } else {
            mimeType = "image/jpeg";
          }
        }

        formData.append("media[]", {
          uri,
          name: fileName,
          type: mimeType,
        });
      });

      const mediaResponse = await api.post(
        `/products/${product.id}/media`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log(
        "MEDIA RESPONSE:",
        mediaResponse.data
      );

      // =================================================
      // SUCCESS
      // =================================================

      Alert.alert(
        "Success",
        "Your product has been published successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("Products");
            },
          },
        ]
      );

    } catch (error) {
      console.log(
        "CREATE PRODUCT ERROR:",
        error.response?.data || error.message
      );

      const errors =
        error.response?.data?.errors;

      if (errors) {
        const messages = Object.values(errors)
          .flat()
          .join("\n");

        Alert.alert("Validation Error", messages);
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.message ||
            error.message ||
            "Something went wrong."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Sell an item
      </Text>

      <Text style={styles.subtitle}>
        Add your product to the marketplace
      </Text>

      {/* NAME */}

      <Text style={styles.label}>
        Product name *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. iPhone 15"
        value={name}
        onChangeText={setName}
      />

      {/* PRICE */}

      <Text style={styles.label}>
        Price *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 5000"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />

      {/* CATEGORY */}

      <Text style={styles.label}>
        Category *
      </Text>

      {loadingCategories ? (
        <View style={styles.loadingCategory}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>
            Loading categories...
          </Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.select}
            onPress={() =>
              setCategoryOpen(!categoryOpen)
            }
          >
            <Text
              style={
                categoryId
                  ? styles.selectText
                  : styles.placeholder
              }
            >
              {categoryId
                ? categories.find(
                    (category) =>
                      category.id === categoryId
                  )?.name
                : "Select category"}
            </Text>

            <Text>
              {categoryOpen ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {categoryOpen && (
            <View style={styles.categoryList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryItem}
                  onPress={() => {
                    setCategoryId(category.id);
                    setCategoryOpen(false);
                  }}
                >
                  <Text style={styles.categoryText}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {/* CITY */}

      <Text style={styles.label}>
        City *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Laayoune"
        value={city}
        onChangeText={setCity}
      />

      {/* CONDITION */}

      <Text style={styles.label}>
        Condition *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. New / Used"
        value={condition}
        onChangeText={setCondition}
      />

      {/* DESCRIPTION */}

      <Text style={styles.label}>
        Description
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.textarea,
        ]}
        placeholder="Describe your product..."
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      {/* MEDIA */}

      <View style={styles.mediaHeader}>
        <Text style={styles.label}>
          Photos / Videos *
        </Text>

        <Text style={styles.mediaCount}>
          {media.length}/8
        </Text>
      </View>

      <TouchableOpacity
        style={styles.mediaButton}
        onPress={pickMedia}
      >
        <Text style={styles.mediaButtonText}>
          + Add Images / Videos
        </Text>
      </TouchableOpacity>

      {/* MEDIA PREVIEW */}

      {media.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaPreview}
        >
          {media.map((item, index) => (
            <View
              key={`${item.uri}-${index}`}
              style={styles.mediaItem}
            >
              {item.type === "video" ? (
                <View style={styles.videoPreview}>
                  <Text style={styles.videoIcon}>
                    ▶
                  </Text>

                  <Text style={styles.videoText}>
                    Video
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: item.uri }}
                  style={styles.previewImage}
                />
              )}

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() =>
                  removeMedia(index)
                }
              >
                <Text style={styles.removeText}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* SUBMIT */}

      <TouchableOpacity
        style={[
          styles.createButton,
          loading && styles.disabled,
        ]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createText}>
            Publish Product
          </Text>
        )}
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
    marginTop: 5,
    marginBottom: 30,
    color: "#777",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 7,
    color: "#222",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 18,
  },

  textarea: {
    height: 120,
  },

  select: {
    height: 52,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectText: {
    color: "#222",
    fontSize: 15,
  },

  placeholder: {
    color: "#999",
    fontSize: 15,
  },

  categoryList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 18,
    overflow: "hidden",
  },

  categoryItem: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  categoryText: {
    fontSize: 15,
  },

  loadingCategory: {
    height: 52,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 18,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loadingText: {
    color: "#777",
  },

  mediaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  mediaCount: {
    color: "#777",
    marginBottom: 7,
  },

  mediaButton: {
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  mediaButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },

  mediaPreview: {
    marginTop: 15,
    marginBottom: 20,
  },

  mediaItem: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#eee",
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  videoPreview: {
    flex: 1,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },

  videoIcon: {
    color: "#fff",
    fontSize: 25,
  },

  videoText: {
    color: "#fff",
    marginTop: 5,
  },

  removeButton: {
    position: "absolute",
    top: 5,
    right: 5,

    width: 25,
    height: 25,
    borderRadius: 13,

    backgroundColor: "rgba(0,0,0,0.7)",

    alignItems: "center",
    justifyContent: "center",
  },

  removeText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 22,
  },

  createButton: {
    height: 55,
    borderRadius: 12,
    backgroundColor: "#111",

    alignItems: "center",
    justifyContent: "center",
  },

  createText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.6,
  },
});