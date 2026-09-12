import React, { useEffect, useRef, useState } from "react";
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
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");
const MAX_MEDIA = 8;

const STEPS = [
  { key: "media", title: "Show it off", subtitle: "Great photos sell faster" },
  { key: "details", title: "The essentials", subtitle: "What are you selling?" },
  { key: "location", title: "Where & what state", subtitle: "Help buyers find it" },
  { key: "review", title: "Almost there", subtitle: "Review and publish" },
];

const CONDITIONS = ["Good", "Like_New", "Fair", "Poor"];

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
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Media
  const [media, setMedia] = useState([]);

  // Step navigation
  const [step, setStep] = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Stagger-in animations per step
  const entranceAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;

  // Loading
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;

  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  // =====================================================
  // FETCH CATEGORIES
  // =====================================================

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data.categories || response.data.data || []);
    } catch (error) {
      Alert.alert("Error", "Unable to load categories.");
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Animate entrance when step changes
  useEffect(() => {
    entranceAnims.forEach((anim) => anim.setValue(0));

    Animated.stagger(
      70,
      entranceAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 9,
        })
      )
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [step]);

  // =====================================================
  // STEP NAVIGATION
  // =====================================================

  const goToStep = (next) => {
    const direction = next > step ? 1 : -1;

    Animated.timing(slideX, {
      toValue: -direction * width,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      slideX.setValue(direction * width);

      Animated.spring(slideX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    });
  };

  // =====================================================
  // STEP VALIDATION
  // =====================================================

  const validateStep = (index) => {
    switch (index) {
      case 0:
        if (media.length === 0) {
          Alert.alert("Oops", "Add at least one photo or video to continue.");
          return false;
        }
        return true;

      case 1:
        if (!name.trim()) {
          Alert.alert("Oops", "Give your product a name.");
          return false;
        }
        if (!price.trim() || isNaN(Number(price))) {
          Alert.alert("Oops", "Enter a valid price.");
          return false;
        }
        if (!categoryId) {
          Alert.alert("Oops", "Pick a category.");
          return false;
        }
        return true;

      case 2:
        if (!city.trim()) {
          Alert.alert("Oops", "Enter your city.");
          return false;
        }
        if (!condition) {
          Alert.alert("Oops", "Select the condition.");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      if (validateStep(step)) goToStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      goToStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  // =====================================================
  // PICK MEDIA
  // =====================================================

  const pickMedia = async () => {
    if (media.length >= MAX_MEDIA) {
      Alert.alert("Maximum reached", `You can add up to ${MAX_MEDIA} images/videos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your photos and videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_MEDIA - media.length,
      quality: 0.8,
    });

    if (result.canceled) return;

    setMedia((current) => [...current, ...(result.assets || [])].slice(0, MAX_MEDIA));
  };

  const removeMedia = (index) => {
    setMedia((current) => current.filter((_, i) => i !== index));
  };

  // =====================================================
  // CREATE PRODUCT
  // =====================================================

  const handleCreate = async () => {
    try {
      setLoading(true);

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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const product = productResponse.data.product || productResponse.data.data;

      if (!product?.id) {
        throw new Error("Product ID was not returned by the server.");
      }

      const formData = new FormData();

      media.forEach((item) => {
        const uri = item.uri;
        const fileName = item.fileName || uri.split("/").pop() || `media-${Date.now()}`;

        let mimeType = item.mimeType;
        if (!mimeType) {
          mimeType = item.type === "video" ? "video/mp4" : "image/jpeg";
        }

        formData.append("media[]", { uri, name: fileName, type: mimeType });
      });

      await api.post(`/products/${product.id}/media`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess(true);

      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 6,
      }).start();

      setTimeout(() => navigation.navigate("Products"), 1600);
    } catch (error) {
      const errors = error.response?.data?.errors;

      if (errors) {
        Alert.alert("Validation Error", Object.values(errors).flat().join("\n"));
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.message || error.message || "Something went wrong."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI HELPERS
  // =====================================================

  const enterStyle = (index) => ({
    opacity: entranceAnims[index],
    transform: [
      {
        translateY: entranceAnims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  });

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // =====================================================
  // STEP CONTENT RENDERERS
  // =====================================================

  const renderMediaStep = () => (
    <>
      <Animated.View style={[styles.dropZone, enterStyle(0)]}>
        <TouchableOpacity style={styles.dropZoneInner} onPress={pickMedia}>
          <View style={styles.dropZoneIcon}>
            <Text style={styles.dropZoneIconText}>📸</Text>
          </View>
          <Text style={styles.dropZoneTitle}>
            {media.length === 0 ? "Add your photos" : "Add more"}
          </Text>
          <Text style={styles.dropZoneHint}>
            {MAX_MEDIA - media.length} slots left · photos & videos
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {media.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaPreview}
          contentContainerStyle={{ paddingTop: 8 }}
        >
          {media.map((item, index) => (
            <Animated.View
              key={`${item.uri}-${index}`}
              style={[styles.mediaItem, { opacity: entranceAnims[Math.min(index + 1, 7)] }]}
            >
              {item.type === "video" ? (
                <View style={styles.videoPreview}>
                  <Text style={styles.videoIcon}>▶</Text>
                  <Text style={styles.videoText}>Video</Text>
                </View>
              ) : (
                <Image source={{ uri: item.uri }} style={styles.previewImage} />
              )}

              {index === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>COVER</Text>
                </View>
              )}

              <TouchableOpacity style={styles.removeButton} onPress={() => removeMedia(index)}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      <Animated.View style={[styles.tipCard, enterStyle(6)]}>
        <Text style={styles.tipEmoji}>💡</Text>
        <Text style={styles.tipText}>
          Products with 4+ clear photos sell up to 2× faster.
        </Text>
      </Animated.View>
    </>
  );

  const renderDetailsStep = () => (
    <>
      <Animated.View style={enterStyle(0)}>
        <Text style={styles.label}>Product name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. iPhone 15"
          value={name}
          onChangeText={setName}
        />
      </Animated.View>

      <Animated.View style={enterStyle(1)}>
        <Text style={styles.label}>Price *</Text>
        <View style={styles.priceRow}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>DH</Text>
          </View>
          <TextInput
            style={[styles.input, styles.priceInput]}
            placeholder="0"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>
      </Animated.View>

      <Animated.View style={enterStyle(2)}>
        <Text style={styles.label}>Category *</Text>

        {loadingCategories ? (
          <View style={styles.loadingCategory}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading categories...</Text>
          </View>
        ) : (
          <View style={styles.chipWrap}>
            {categories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCategoryId(category.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Animated.View>

      <Animated.View style={enterStyle(3)}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Condition details, what's included, why you're selling..."
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />
      </Animated.View>
    </>
  );

  const renderLocationStep = () => (
    <>
      <Animated.View style={enterStyle(0)}>
        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Laayoune"
          value={city}
          onChangeText={setCity}
        />
      </Animated.View>

      <Animated.View style={enterStyle(1)}>
        <Text style={styles.label}>Condition *</Text>
        <View style={styles.conditionRow}>
          {CONDITIONS.map((c) => {
            const selected = condition === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.conditionCard, selected && styles.conditionCardSelected]}
                onPress={() => setCondition(c)}
                activeOpacity={0.75}
              >
                <Text style={styles.conditionEmoji}>
                  {c === "New" ? "✨" : c === "Like New" ? "🌟" : c === "Used" ? "🔧" : "♻️"}
                </Text>
                <Text style={[styles.conditionText, selected && styles.conditionTextSelected]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View style={[styles.mapIllustration, enterStyle(2)]}>
        <Text style={styles.mapEmoji}>📍</Text>
        <Text style={styles.mapText}>
          Buyers near {city.trim() || "your city"} will see your listing first.
        </Text>
      </Animated.View>
    </>
  );

  const renderReviewStep = () => (
    <>
      <Animated.View style={[styles.reviewCard, enterStyle(0)]}>
        {media[0] && media[0].type !== "video" && (
          <Image source={{ uri: media[0].uri }} style={styles.reviewImage} />
        )}
        {media[0] && media[0].type === "video" && (
          <View style={styles.reviewVideo}>
            <Text style={styles.videoIcon}>▶</Text>
          </View>
        )}

        <View style={styles.reviewBody}>
          <Text style={styles.reviewName}>{name.trim() || "Unnamed product"}</Text>
          <Text style={styles.reviewPrice}>{Number(price) || 0} DH</Text>

          <View style={styles.reviewMetaRow}>
            {selectedCategory && (
              <View style={styles.metaTag}>
                <Text style={styles.metaTagText}>{selectedCategory.name}</Text>
              </View>
            )}
            {condition !== "" && (
              <View style={styles.metaTag}>
                <Text style={styles.metaTagText}>{condition}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.reviewRow, enterStyle(1)]}>
        <Text style={styles.reviewLabel}>City</Text>
        <Text style={styles.reviewValue}>{city.trim() || "—"}</Text>
      </Animated.View>

      <Animated.View style={[styles.reviewRow, enterStyle(2)]}>
        <Text style={styles.reviewLabel}>Media</Text>
        <Text style={styles.reviewValue}>
          {media.length} item{media.length !== 1 ? "s" : ""}
        </Text>
      </Animated.View>

      {description.trim() !== "" && (
        <Animated.View style={[styles.reviewRow, enterStyle(3)]}>
          <Text style={styles.reviewLabel}>Description</Text>
          <Text style={styles.reviewValue} numberOfLines={3}>
            {description.trim()}
          </Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.publishNote, enterStyle(4)]}>
        <Text style={styles.publishNoteText}>
          🚀 Your product will be visible to all buyers instantly.
        </Text>
      </Animated.View>
    </>
  );

  const stepRenderers = [renderMediaStep, renderDetailsStep, renderLocationStep, renderReviewStep];

  // =====================================================
  // SUCCESS SCREEN
  // =====================================================

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Animated.View
          style={[
            styles.successCircle,
            { transform: [{ scale: successScale }] },
          ]}
        >
          <Text style={styles.successCheck}>✓</Text>
        </Animated.View>
        <Text style={styles.successTitle}>Published! 🎉</Text>
        <Text style={styles.successSubtitle}>Your product is live on the marketplace.</Text>
      </View>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={12}>
            <Text style={styles.backArrow}>{step === 0 ? "✕" : "←"}</Text>
          </TouchableOpacity>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["12%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.stepCounter}>
            {step + 1}/{STEPS.length}
          </Text>
        </View>

        {/* STEP INDICATORS */}
        <View style={styles.dotsRow}>
          {STEPS.map((s, i) => (
            <View key={s.key} style={styles.dotItem}>
              <View style={[styles.dot, i <= step && styles.dotActive]}>
                {i < step && <Text style={styles.dotCheck}>✓</Text>}
              </View>
              {i < STEPS.length - 1 && <View style={[styles.dotLine, i < step && styles.dotLineActive]} />}
            </View>
          ))}
        </View>

        {/* TITLES */}
        <Animated.View style={[styles.titles, { opacity: fadeAnim }]}>
          <Text style={styles.title}>{STEPS[step].title}</Text>
          <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>
        </Animated.View>

        {/* STEP CONTENT */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateX: slideX }] }}>
            {stepRenderers[step]()}
          </Animated.View>
        </ScrollView>

        {/* FOOTER BUTTONS */}
        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity style={styles.backNavButton} onPress={() => goToStep(step - 1)}>
              <Text style={styles.backNavText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < STEPS.length - 1 ? (
            <TouchableOpacity style={[styles.nextButton, step === 0 && styles.nextButtonFull]} onPress={handleNext}>
              <Text style={styles.nextText}>Continue</Text>
              <Text style={styles.nextArrow}>→</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, styles.publishButton, loading && styles.disabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.publishText}>🚀 Publish Product</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  container: {
    flex: 1,
    backgroundColor: "#f7f7fa",
  },

  // Header / progress
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    gap: 14,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  backArrow: { fontSize: 17, color: "#111" },

  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e5ea",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#111",
  },

  stepCounter: {
    fontSize: 13,
    fontWeight: "600",
    color: "#777",
    width: 34,
    textAlign: "right",
  },

  // Step dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 18,
  },

  dotItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#e5e5ea",
    alignItems: "center",
    justifyContent: "center",
  },

  dotActive: { backgroundColor: "#111" },

  dotCheck: { color: "#fff", fontSize: 11, fontWeight: "700" },

  dotLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e5e5ea",
    marginHorizontal: 4,
  },

  dotLineActive: { backgroundColor: "#111" },

  // Titles
  titles: {
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    color: "#888",
    fontSize: 14,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // Shared inputs
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e3e3e8",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },

  textarea: {
    height: 110,
  },

  // ---- MEDIA STEP ----
  dropZone: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#bbb",
    backgroundColor: "#fff",
    overflow: "hidden",
  },

  dropZoneInner: {
    alignItems: "center",
    paddingVertical: 38,
  },

  dropZoneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f0f0f4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  dropZoneIconText: { fontSize: 30 },

  dropZoneTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

  dropZoneHint: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },

  mediaPreview: {
    marginTop: 4,
    marginBottom: 18,
  },

  mediaItem: {
    width: 108,
    height: 108,
    borderRadius: 14,
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#eee",
  },

  previewImage: { width: "100%", height: "100%" },

  videoPreview: {
    flex: 1,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },

  videoIcon: { color: "#fff", fontSize: 24 },
  videoText: { color: "#fff", marginTop: 4, fontSize: 12 },

  coverBadge: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: "#111",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  coverBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  removeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },

  removeText: { color: "#fff", fontSize: 18, lineHeight: 20 },

  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff8e1",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },

  tipEmoji: { fontSize: 20 },

  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#7a6a2f",
    lineHeight: 18,
  },

  // ---- DETAILS STEP ----
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  currencyBadge: {
    backgroundColor: "#111",
    borderRadius: 14,
    width: 56,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  currencyText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  priceInput: { flex: 1, fontSize: 18, fontWeight: "600" },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e3e3e8",
  },

  chipSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },

  chipText: { fontSize: 14, color: "#444", fontWeight: "600" },
  chipTextSelected: { color: "#fff" },

  loadingCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },

  loadingText: { color: "#888" },

  // ---- LOCATION STEP ----
  conditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },

  conditionCard: {
    width: (width - 60) / 2,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e3e3e8",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
  },

  conditionCardSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },

  conditionEmoji: { fontSize: 26 },

  conditionText: { fontSize: 14, fontWeight: "600", color: "#444" },
  conditionTextSelected: { color: "#fff" },

  mapIllustration: {
    backgroundColor: "#e8f4fd",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  mapEmoji: { fontSize: 26 },

  mapText: {
    flex: 1,
    fontSize: 13,
    color: "#2b5d8a",
    lineHeight: 18,
  },

  // ---- REVIEW STEP ----
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  reviewImage: { width: "100%", height: 180 },

  reviewVideo: {
    width: "100%",
    height: 180,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },

  reviewBody: { padding: 16 },

  reviewName: { fontSize: 18, fontWeight: "700", color: "#111" },

  reviewPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginTop: 4,
  },

  reviewMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  metaTag: {
    backgroundColor: "#f0f0f4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  metaTagText: { fontSize: 12, fontWeight: "600", color: "#555" },

  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },

  reviewLabel: { fontSize: 13, color: "#999", fontWeight: "600" },

  reviewValue: {
    fontSize: 14,
    color: "#111",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },

  publishNote: {
    backgroundColor: "#e9f9ee",
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },

  publishNoteText: { fontSize: 13, color: "#2d6a3e" },

  // ---- FOOTER ----
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
    backgroundColor: "#f7f7fa",
  },

  backNavButton: {
    paddingHorizontal: 22,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e3e3e8",
    alignItems: "center",
    justifyContent: "center",
  },

  backNavText: { fontSize: 15, fontWeight: "700", color: "#444" },

  nextButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  nextButtonFull: { flex: 1 },

  nextText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  nextArrow: { color: "#fff", fontSize: 16, fontWeight: "700" },

  publishButton: { backgroundColor: "#1a8f4a" },

  publishText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  disabled: { opacity: 0.6 },

  // ---- SUCCESS ----
  successContainer: {
    flex: 1,
    backgroundColor: "#f7f7fa",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#1a8f4a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,

    shadowColor: "#1a8f4a",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  successCheck: { color: "#fff", fontSize: 48, fontWeight: "800" },

  successTitle: { fontSize: 26, fontWeight: "800", color: "#111" },

  successSubtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
});