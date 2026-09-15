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
  Pressable,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { WebView } from "react-native-webview";
import {
  Camera,
  ImagePlus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Navigation,
  LocateFixed,
  Plus,
  Minus,
  RefreshCw,
  Package,
  Tag,
  DollarSign,
  FileText,
  Layers,
  Sparkles,
  ThumbsUp,
  Wrench,
  Recycle,
  Star,
  Rocket,
  Shield,
  CircleCheck,
  ArrowRight,
  Hand,
  Move,
} from "lucide-react-native";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");
const MAX_MEDIA = 8;

// -------- Theme --------
const LIME = "#B9FA3C";
const NAVY = "#04045E";
const WHITE = "#FFFFFF";
const MUTED = "#8B8BAE";
const BG = "#F7F7FC";

const STEPS = [
  { key: "media", title: "Show it off", subtitle: "Great photos sell faster" },
  { key: "details", title: "The essentials", subtitle: "What are you selling?" },
  { key: "location", title: "Where & what state", subtitle: "Help buyers find it" },
  { key: "review", title: "Almost there", subtitle: "Review and publish" },
];

// Backend Rule::in([...]) — must match exactly
const CONDITIONS = [
  { value: "New", label: "New", Icon: Sparkles },
  { value: "Like_new", label: "Like New", Icon: Star },
  { value: "Good", label: "Good", Icon: ThumbsUp },
  { value: "Fair", label: "Fair", Icon: Wrench },
  { value: "Poor", label: "Poor", Icon: Recycle },
];

const DEFAULT_POSITION = { latitude: 31.7917, longitude: -7.0926 };
const DEFAULT_ZOOM = 6;

// ============================================================
// LEAFLET MAP HTML
// ------------------------------------------------------------
// • Default mode:  "tap"     → a single tap places the pin
// • Hold mode:     "browse"  → pan/zoom is enabled
// The user press-holds the map for ~250 ms → we unlock browse mode
// and the parent ScrollView stops scrolling. When they release, we
// lock pan back and only listen for taps.
// ============================================================

const buildPickableMapHtml = ({ pin }) => {
  const hasPin =
    pin &&
    Number.isFinite(Number(pin.latitude)) &&
    Number.isFinite(Number(pin.longitude));

  const initialCenter = hasPin
    ? [Number(pin.latitude), Number(pin.longitude)]
    : [DEFAULT_POSITION.latitude, DEFAULT_POSITION.longitude];

  const initialZoom = hasPin ? 15 : DEFAULT_ZOOM;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-container {
      background: #E8EEF7;
      font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif;
      touch-action: none;
    }
    /* Pin — matches the app's navy/lime palette */
    .pin-wrap { position: relative; width: 46px; height: 58px; }
    .pin-head {
      width: 42px; height: 42px; border-radius: 50%;
      background: ${NAVY};
      border: 3px solid ${LIME};
      display: flex; align-items: center; justify-content: center;
      position: absolute; top: 0; left: 2px;
      box-shadow: 0 6px 14px rgba(4,4,94,0.35);
    }
    .pin-head-dot {
      width: 14px; height: 14px; border-radius: 50%;
      background: ${LIME};
      box-shadow: 0 0 0 3px rgba(185,250,60,0.35);
    }
    .pin-tail {
      position: absolute; bottom: 0; left: 50%;
      width: 8px; height: 8px;
      background: ${NAVY};
      border: 2px solid ${LIME};
      border-radius: 50%;
      transform: translateX(-50%);
    }
    .pin-shadow {
      position: absolute; bottom: -3px; left: 50%;
      width: 22px; height: 6px;
      background: rgba(4,4,94,0.25);
      border-radius: 50%; transform: translateX(-50%);
      filter: blur(2px);
    }
    .browse-indicator {
      position: absolute; inset: 0;
      pointer-events: none;
      border: 3px solid ${LIME};
      border-radius: 18px;
      opacity: 0;
      transition: opacity .2s;
      z-index: 999;
    }
    .browse-indicator.active { opacity: 1; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="browse-indicator" id="browseBorder"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
        doubleClickZoom: false,
        /* Start locked — user must press-and-hold to unlock. */
        dragging: false,
        touchZoom: false,
        boxZoom: false,
        scrollWheelZoom: false,
        keyboard: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);

      map.setView(${JSON.stringify(initialCenter)}, ${initialZoom});

      var pinIcon = L.divIcon({
        className: '',
        html:
          '<div class="pin-wrap">' +
            '<div class="pin-head"><div class="pin-head-dot"></div></div>' +
            '<div class="pin-tail"></div>' +
            '<div class="pin-shadow"></div>' +
          '</div>',
        iconSize: [46, 58],
        iconAnchor: [23, 56],
      });

      var marker = null;

      function post(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function placePin(lat, lng, moveCamera) {
        if (marker) {
          marker.setLatLng([lat, lng]);
        } else {
          marker = L.marker([lat, lng], { icon: pinIcon, draggable: false }).addTo(map);
        }
        if (moveCamera) {
          map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
        }
        post({ type: 'pinChanged', latitude: lat, longitude: lng });
      }

      ${hasPin ? `placePin(${Number(pin.latitude)}, ${Number(pin.longitude)}, false);` : ""}

      var browseBorder = document.getElementById('browseBorder');
      var browseMode = false;

      function enterBrowse() {
        if (browseMode) return;
        browseMode = true;
        map.dragging.enable();
        map.touchZoom.enable();
        browseBorder.classList.add('active');
        post({ type: 'browseMode', active: true });
      }

      function exitBrowse() {
        if (!browseMode) return;
        browseMode = false;
        map.dragging.disable();
        map.touchZoom.disable();
        browseBorder.classList.remove('active');
        post({ type: 'browseMode', active: false });
      }

      // Press-and-hold detection.
      var holdTimer = null;
      var holdStart = null;
      var HOLD_MS = 220;
      var MOVE_TOLERANCE = 8;

      function onTouchStart(e) {
        if (!e.touches || e.touches.length === 0) return;
        var t = e.touches[0];
        holdStart = { x: t.clientX, y: t.clientY };
        if (holdTimer) clearTimeout(holdTimer);
        holdTimer = setTimeout(function () {
          holdTimer = null;
          enterBrowse();
          if (window.navigator && window.navigator.vibrate) {
            try { window.navigator.vibrate(15); } catch (_) {}
          }
        }, HOLD_MS);
      }

      function onTouchMove(e) {
        if (!holdTimer || !holdStart || !e.touches || e.touches.length === 0) return;
        var t = e.touches[0];
        var dx = t.clientX - holdStart.x;
        var dy = t.clientY - holdStart.y;
        if (Math.sqrt(dx*dx + dy*dy) > MOVE_TOLERANCE) {
          clearTimeout(holdTimer);
          holdTimer = null;
        }
      }

      function onTouchEnd() {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        holdStart = null;
        if (browseMode) {
          // keep browse mode active briefly so lift-finger doesn't re-lock
          setTimeout(exitBrowse, 300);
        }
      }

      map.getContainer().addEventListener('touchstart', onTouchStart, { passive: true });
      map.getContainer().addEventListener('touchmove', onTouchMove, { passive: true });
      map.getContainer().addEventListener('touchend', onTouchEnd, { passive: true });
      map.getContainer().addEventListener('touchcancel', onTouchEnd, { passive: true });

      // Tap-to-place (fires when the map isn't in browse mode)
      map.on('click', function (e) {
        if (browseMode) return;
        placePin(e.latlng.lat, e.latlng.lng, false);
      });

      // ----- Exposed helpers -----
      window.__setPin = function (lat, lng, zoom) {
        placePin(lat, lng, true);
        if (zoom) map.flyTo([lat, lng], zoom, { duration: 0.5 });
      };
      window.__zoomIn  = function () { map.zoomIn(); };
      window.__zoomOut = function () { map.zoomOut(); };

      setTimeout(function () { post({ type: 'ready' }); }, 100);
    })();
  </script>
</body>
</html>`;
};

export default function CreateProductScreen({ navigation }) {
  const { token } = useAuth();

  // Product fields
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");

  // Categories
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Media
  const [media, setMedia] = useState([]);

  // Steps
  const [step, setStep] = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const entranceAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const webRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapBrowsing, setMapBrowsing] = useState(false);
  const initialPinRef = useRef(null);

  // =====================================================
  // FETCH CATEGORIES
  // =====================================================
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await api.get("/categories");
        if (!mounted) return;
        setCategories(response.data.categories || response.data.data || []);
      } catch (error) {
        Alert.alert("Error", "Unable to load categories.");
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Entrance animations
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

    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [step, entranceAnims, progressAnim]);

  // =====================================================
  // STEP NAV
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
  // REVERSE GEOCODE
  // =====================================================
  const reverseGeocodeLocation = async (lat, lng) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (!addresses || addresses.length === 0) {
        setLocationAddress("Selected location");
        return;
      }
      const a = addresses[0];
      const detectedCity =
        a.city || a.subregion || a.district || a.region || "";
      const readable = [a.street, a.district, detectedCity, a.country]
        .filter(Boolean)
        .join(", ");
      if (detectedCity) setCity(detectedCity);
      setLocationAddress(readable || detectedCity || "Selected location");
    } catch (err) {
      console.log("REVERSE GEOCODE ERROR:", err);
      setLocationAddress("Selected location");
    }
  };

  const applyLocation = async (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationError("");
    await reverseGeocodeLocation(lat, lng);
  };

  // =====================================================
  // WEBVIEW MESSAGES
  // =====================================================
  const handleWebViewMessage = async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg?.type === "ready") { setMapReady(true); return; }
      if (msg?.type === "browseMode") { setMapBrowsing(!!msg.active); return; }
      if (msg?.type === "pinChanged") {
        await applyLocation(Number(msg.latitude), Number(msg.longitude));
      }
    } catch (_) {}
  };

  const setPinOnMap = (lat, lng) => {
    webRef.current?.injectJavaScript(
      `window.__setPin && window.__setPin(${lat}, ${lng}, 15); true;`
    );
  };
  const zoomIn = () =>
    webRef.current?.injectJavaScript("window.__zoomIn && window.__zoomIn(); true;");
  const zoomOut = () =>
    webRef.current?.injectJavaScript("window.__zoomOut && window.__zoomOut(); true;");

  // =====================================================
  // GPS
  // =====================================================
  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      setLocationError("");

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationError("Location services are disabled. Enable GPS or tap the map.");
        Alert.alert("Location services disabled", "Turn on GPS, or tap the map.");
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationError("Location permission denied. Tap the map instead.");
        Alert.alert("Location permission", "You can still tap the map to place the pin.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });

      const lat = current.coords.latitude;
      const lng = current.coords.longitude;
      await applyLocation(lat, lng);
      setPinOnMap(lat, lng);
    } catch (err) {
      console.log("LOCATION ERROR:", err);
      setLocationError("Couldn't get your GPS location. Tap the map to pick manually.");
    } finally {
      setGettingLocation(false);
    }
  };

  // =====================================================
  // VALIDATION
  // =====================================================
  const validateStep = (index) => {
    switch (index) {
      case 0:
        if (media.length === 0) { Alert.alert("Oops", "Add at least one photo or video to continue."); return false; }
        return true;
      case 1:
        if (!name.trim()) { Alert.alert("Oops", "Give your product a name."); return false; }
        if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) { Alert.alert("Oops", "Enter a valid price."); return false; }
        if (!categoryId) { Alert.alert("Oops", "Pick a category."); return false; }
        return true;
      case 2:
        if (!city.trim()) { Alert.alert("Oops", "Enter your city."); return false; }
        if (!condition) { Alert.alert("Oops", "Select the condition."); return false; }
        if (latitude === null || longitude === null) { Alert.alert("Location required", "Tap the map or use GPS to place your pin."); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1 && validateStep(step)) goToStep(step + 1);
  };
  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
    else navigation.goBack();
  };

  // =====================================================
  // MEDIA
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
    setMedia((cur) => [...cur, ...(result.assets || [])].slice(0, MAX_MEDIA));
  };
  const removeMedia = (i) => setMedia((cur) => cur.filter((_, idx) => idx !== i));

  // =====================================================
  // CREATE
  // =====================================================
  const handleCreate = async () => {
    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        price: Number(price),
        category_id: categoryId,
        city: city.trim(),
        latitude,
        longitude,
        condition,
        description: description.trim(),
      };
      const productResponse = await api.post("/products", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const product = productResponse.data.product || productResponse.data.data;
      if (!product?.id) throw new Error("Product ID was not returned by the server.");

      const formData = new FormData();
      media.forEach((item, i) => {
        const uri = item.uri;
        const fileName = item.fileName || uri.split("/").pop() || `media-${Date.now()}-${i}`;
        let mimeType = item.mimeType;
        if (!mimeType) mimeType = item.type === "video" ? "video/mp4" : "image/jpeg";
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
    } catch (error) {
      const errors = error.response?.data?.errors;
      if (errors) Alert.alert("Validation Error", Object.values(errors).flat().join("\n"));
      else Alert.alert("Error", error.response?.data?.message || error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESET
  // =====================================================
  const resetForm = () => {
    setName(""); setPrice(""); setCity("");
    setLatitude(null); setLongitude(null);
    setLocationAddress(""); setLocationError("");
    setCondition(""); setDescription("");
    setCategoryId(null); setMedia([]);
    setStep(0); setSuccess(false);
    initialPinRef.current = null;
    successScale.setValue(0);
    progressAnim.setValue(0);
    slideX.setValue(0);
  };

  // =====================================================
  // STYLES HELPERS
  // =====================================================
  const enterStyle = (index) => ({
    opacity: entranceAnims[index] || 1,
    transform: [
      {
        translateY: (entranceAnims[index] || new Animated.Value(1)).interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  });

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // =====================================================
  // STEP 1 — MEDIA
  // =====================================================
  const renderMediaStep = () => (
    <>
      <Animated.View style={[styles.dropZone, enterStyle(0)]}>
        <TouchableOpacity style={styles.dropZoneInner} onPress={pickMedia}>
          <View style={styles.dropZoneIcon}>
            <ImagePlus size={28} color={NAVY} strokeWidth={2.2} />
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
              style={[
                styles.mediaItem,
                { opacity: entranceAnims[Math.min(index + 1, 7)] || 1 },
              ]}
            >
              {item.type === "video" ? (
                <View style={styles.videoPreview}>
                  <Camera size={22} color={WHITE} />
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

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeMedia(index)}
                hitSlop={6}
              >
                <X size={14} color={WHITE} strokeWidth={3} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      <Animated.View style={[styles.tipCard, enterStyle(6)]}>
        <Sparkles size={18} color={NAVY} />
        <Text style={styles.tipText}>
          Products with 4+ clear photos sell up to 2× faster.
        </Text>
      </Animated.View>
    </>
  );

  // =====================================================
  // STEP 2 — DETAILS
  // =====================================================
  const renderDetailsStep = () => (
    <>
      <Animated.View style={enterStyle(0)}>
        <Text style={styles.label}>Product name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. iPhone 15"
          placeholderTextColor={MUTED}
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
            placeholderTextColor={MUTED}
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
            <ActivityIndicator color={NAVY} />
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
          placeholderTextColor={MUTED}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />
      </Animated.View>
    </>
  );

  // =====================================================
  // STEP 3 — LOCATION
  // =====================================================
  const renderLocationStep = () => {
    const hasLocation = latitude !== null && longitude !== null;
    if (!initialPinRef.current) {
      initialPinRef.current = hasLocation ? { latitude, longitude } : null;
    }
    const html = buildPickableMapHtml({ pin: initialPinRef.current });

    return (
      <>
        {/* CITY */}
        <Animated.View style={enterStyle(0)}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>City *</Text>
            {city.trim() !== "" && (
              <View style={styles.detectedBadge}>
                <Text style={styles.detectedBadgeText}>Auto-filled</Text>
              </View>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. Casablanca"
            placeholderTextColor={MUTED}
            value={city}
            onChangeText={setCity}
          />
        </Animated.View>

        {/* MAP HEADER */}
        <Animated.View style={enterStyle(1)}>
          <View style={styles.mapHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapTitle}>Drop your pin</Text>
              <Text style={styles.mapSubtitle}>
                Tap to place · hold to browse the map
              </Text>
            </View>

            <TouchableOpacity
              style={styles.gpsButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
              activeOpacity={0.85}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color={NAVY} />
              ) : (
                <LocateFixed size={20} color={NAVY} strokeWidth={2.4} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* MAP + HOLD-TO-BROWSE TIP */}
        <Animated.View style={[styles.mapContainer, enterStyle(2)]}>
          <WebView
            ref={webRef}
            style={styles.map}
            originWhitelist={["*"]}
            source={{ html, baseUrl: "https://localhost" }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.mapLoading}>
                <ActivityIndicator color={NAVY} />
              </View>
            )}
            androidLayerType="hardware"
            setSupportMultipleWindows={false}
            scrollEnabled={false}
            overScrollMode="never"
            bounces={false}
          />

          {/* Hold-to-browse HINT (top-left) */}
          <View style={styles.mapHint} pointerEvents="none">
            <Hand size={14} color={NAVY} strokeWidth={2.4} />
            <Text style={styles.mapHintText} numberOfLines={1}>
              {mapBrowsing ? "Browsing the map…" : "Hold to browse"}
            </Text>
          </View>

          {/* Browsing overlay badge */}
          {mapBrowsing && (
            <View style={styles.browseBadge} pointerEvents="none">
              <Move size={12} color={NAVY} strokeWidth={2.6} />
              <Text style={styles.browseBadgeText}>Dragging</Text>
            </View>
          )}

          {/* Zoom stack (top-right) */}
          <View style={styles.zoomStack}>
            <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} activeOpacity={0.85}>
              <Plus size={18} color={NAVY} strokeWidth={2.8} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.zoomBtn, { marginTop: 8 }]}
              onPress={zoomOut}
              activeOpacity={0.85}
            >
              <Minus size={18} color={NAVY} strokeWidth={2.8} />
            </TouchableOpacity>
          </View>

          {/* Recenter (bottom-right) */}
          <TouchableOpacity
            style={styles.mapCurrentButton}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
            activeOpacity={0.85}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color={NAVY} />
            ) : (
              <Navigation size={18} color={NAVY} strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* SELECTED LOCATION SUMMARY */}
        {hasLocation ? (
          <Animated.View style={[styles.selectedLocationCard, enterStyle(3)]}>
            <View style={styles.selectedLocationIcon}>
              <MapPin size={18} color={NAVY} strokeWidth={2.4} />
            </View>
            <View style={styles.selectedLocationContent}>
              <Text style={styles.selectedLocationTitle}>Pin placed</Text>
              <Text style={styles.selectedLocationAddress} numberOfLines={2}>
                {locationAddress || city || "Selected location"}
              </Text>
              <Text style={styles.coordinates}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshLocationButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
              hitSlop={6}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color={NAVY} />
              ) : (
                <RefreshCw size={16} color={NAVY} strokeWidth={2.4} />
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.locationEmptyCard, enterStyle(3)]}>
            <View style={styles.emptyLocationIcon}>
              <MapPin size={18} color={MUTED} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyLocationTitle}>No location yet</Text>
              <Text style={styles.emptyLocationText}>
                Tap the map or press the locate button to drop your pin.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ERROR */}
        {locationError !== "" && (
          <Animated.View style={[styles.locationWarning, enterStyle(4)]}>
            <Text style={styles.locationWarningIcon}>⚠</Text>
            <Text style={styles.locationWarningText}>{locationError}</Text>
          </Animated.View>
        )}

        {/* CONDITION */}
        <Animated.View style={enterStyle(5)}>
          <Text style={styles.label}>Condition *</Text>
          <View style={styles.conditionRow}>
            {CONDITIONS.map(({ value, label, Icon }) => {
              const selected = condition === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.conditionCard, selected && styles.conditionCardSelected]}
                  onPress={() => setCondition(value)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.conditionIconWrap,
                      selected && styles.conditionIconWrapSelected,
                    ]}
                  >
                    <Icon
                      size={20}
                      color={selected ? NAVY : NAVY}
                      strokeWidth={2.4}
                    />
                  </View>
                  <Text
                    style={[
                      styles.conditionText,
                      selected && styles.conditionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* INFO */}
        <Animated.View style={[styles.mapInfoCard, enterStyle(6)]}>
          <Shield size={16} color={NAVY} strokeWidth={2.4} />
          <Text style={styles.mapInfoText}>
            Only the city and approximate location are shown publicly.
          </Text>
        </Animated.View>
      </>
    );
  };

  // =====================================================
  // STEP 4 — REVIEW
  // =====================================================
  const renderReviewStep = () => (
    <>
      <Animated.View style={[styles.reviewCard, enterStyle(0)]}>
        {media[0] && media[0].type !== "video" && (
          <Image source={{ uri: media[0].uri }} style={styles.reviewImage} />
        )}
        {media[0] && media[0].type === "video" && (
          <View style={styles.reviewVideo}>
            <Camera size={28} color={WHITE} />
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
                <Text style={styles.metaTagText}>
                  {CONDITIONS.find((c) => c.value === condition)?.label || condition}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.reviewRow, enterStyle(1)]}>
        <View style={styles.reviewLeft}>
          <MapPin size={14} color={MUTED} />
          <Text style={styles.reviewLabel}>City</Text>
        </View>
        <Text style={styles.reviewValue}>{city.trim() || "—"}</Text>
      </Animated.View>

      <Animated.View style={[styles.reviewRow, enterStyle(2)]}>
        <View style={styles.reviewLeft}>
          <Navigation size={14} color={MUTED} />
          <Text style={styles.reviewLabel}>Coordinates</Text>
        </View>
        <Text style={styles.reviewValue} numberOfLines={1}>
          {latitude !== null && longitude !== null
            ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            : "—"}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.reviewRow, enterStyle(3)]}>
        <View style={styles.reviewLeft}>
          <Camera size={14} color={MUTED} />
          <Text style={styles.reviewLabel}>Media</Text>
        </View>
        <Text style={styles.reviewValue}>
          {media.length} item{media.length !== 1 ? "s" : ""}
        </Text>
      </Animated.View>

      {description.trim() !== "" && (
        <Animated.View style={[styles.reviewRow, enterStyle(4)]}>
          <View style={styles.reviewLeft}>
            <FileText size={14} color={MUTED} />
            <Text style={styles.reviewLabel}>Description</Text>
          </View>
          <Text style={styles.reviewValue} numberOfLines={3}>
            {description.trim()}
          </Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.publishNote, enterStyle(5)]}>
        <Rocket size={16} color={NAVY} strokeWidth={2.4} />
        <Text style={styles.publishNoteText}>
          Your product will be visible to all buyers instantly.
        </Text>
      </Animated.View>
    </>
  );

  const stepRenderers = [
    renderMediaStep,
    renderDetailsStep,
    renderLocationStep,
    renderReviewStep,
  ];

  // =====================================================
  // SUCCESS
  // =====================================================
  if (success) {
    return (
      <View style={styles.successContainer}>
        <Animated.View
          style={[styles.successCircle, { transform: [{ scale: successScale }] }]}
        >
          <Check size={44} color={NAVY} strokeWidth={3} />
        </Animated.View>
        <Text style={styles.successTitle}>Published!</Text>
        <Text style={styles.successSubtitle}>
          Your product is live on the marketplace.
        </Text>

        <View style={styles.successActions}>
          <TouchableOpacity
            style={styles.successPrimary}
            onPress={resetForm}
            activeOpacity={0.9}
          >
            <Plus size={18} color={NAVY} strokeWidth={2.8} />
            <Text style={styles.successPrimaryText}>Publish another</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.successSecondary}
            onPress={() => navigation.navigate("Products")}
            activeOpacity={0.9}
          >
            <Text style={styles.successSecondaryText}>View my products</Text>
            <ArrowRight size={16} color={NAVY} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={12}
            activeOpacity={0.85}
          >
            {step === 0 ? (
              <X size={18} color={NAVY} strokeWidth={2.6} />
            ) : (
              <ChevronLeft size={18} color={NAVY} strokeWidth={2.6} />
            )}
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

          <View style={styles.stepCounterBadge}>
            <Text style={styles.stepCounter}>
              {step + 1}/{STEPS.length}
            </Text>
          </View>
        </View>

        {/* DOTS */}
        <View style={styles.dotsRow}>
          {STEPS.map((s, i) => (
            <View key={s.key} style={styles.dotItem}>
              <View style={[styles.dot, i <= step && styles.dotActive]}>
                {i < step && <Check size={11} color={NAVY} strokeWidth={3.4} />}
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.dotLine, i < step && styles.dotLineActive]} />
              )}
            </View>
          ))}
        </View>

        {/* TITLES */}
        <Animated.View style={[styles.titles, { opacity: fadeAnim }]}>
          <Text style={styles.title}>{STEPS[step].title}</Text>
          <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>
        </Animated.View>

        {/* CONTENT */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!mapBrowsing}
          nestedScrollEnabled
          directionalLockEnabled
        >
          <Animated.View style={{ transform: [{ translateX: slideX }] }}>
            {stepRenderers[step]()}
          </Animated.View>
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity
              style={styles.backNavButton}
              onPress={() => goToStep(step - 1)}
              activeOpacity={0.85}
            >
              <Text style={styles.backNavText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[styles.nextButton, step === 0 && styles.nextButtonFull]}
              onPress={handleNext}
              activeOpacity={0.9}
            >
              <Text style={styles.nextText}>Continue</Text>
              <ChevronRight size={18} color={NAVY} strokeWidth={2.8} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.nextButton,
                styles.publishButton,
                loading && styles.disabled,
              ]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={NAVY} />
              ) : (
                <>
                  <Rocket size={18} color={NAVY} strokeWidth={2.6} />
                  <Text style={styles.publishText}>Publish Product</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: BG },

  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EEF7",
  },

  // ---------- HEADER ----------
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECECF4",
    shadowColor: NAVY,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ECECF4",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: NAVY,
  },
  stepCounterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: LIME,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: 0.3,
  },

  // ---------- DOTS ----------
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 18,
  },
  dotItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ECECF4",
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { backgroundColor: LIME },
  dotLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#ECECF4",
    marginHorizontal: 4,
    borderRadius: 2,
  },
  dotLineActive: { backgroundColor: NAVY },

  titles: { paddingHorizontal: 20, marginTop: 22, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "900", color: NAVY, letterSpacing: -0.4 },
  subtitle: { marginTop: 4, color: MUTED, fontSize: 14, fontWeight: "600" },

  content: { paddingHorizontal: 20, paddingBottom: 30 },

  // ---------- INPUTS ----------
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: "#E4E4EE",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: NAVY,
    fontWeight: "600",
    marginBottom: 20,
  },
  textarea: { height: 110 },

  // ---------- MEDIA ----------
  dropZone: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: NAVY,
    backgroundColor: WHITE,
    overflow: "hidden",
  },
  dropZoneInner: { alignItems: "center", paddingVertical: 38 },
  dropZoneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  dropZoneTitle: { fontSize: 17, fontWeight: "800", color: NAVY },
  dropZoneHint: { fontSize: 13, color: MUTED, marginTop: 4, fontWeight: "600" },

  mediaPreview: { marginTop: 4, marginBottom: 18 },
  mediaItem: {
    width: 108,
    height: 108,
    borderRadius: 14,
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#EEE",
  },
  previewImage: { width: "100%", height: "100%" },
  videoPreview: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  videoText: { color: WHITE, marginTop: 2, fontSize: 12, fontWeight: "700" },
  coverBadge: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: LIME,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  coverBadgeText: {
    color: NAVY,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  removeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },

  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIME,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  tipText: { flex: 1, fontSize: 13, color: NAVY, fontWeight: "700", lineHeight: 18 },

  // ---------- DETAILS ----------
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  currencyBadge: {
    backgroundColor: NAVY,
    borderRadius: 14,
    width: 56,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  currencyText: { color: LIME, fontWeight: "900", fontSize: 15 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: "800" },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: "#E4E4EE",
  },
  chipSelected: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 14, color: NAVY, fontWeight: "700" },
  chipTextSelected: { color: LIME },

  loadingCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  loadingText: { color: MUTED, fontWeight: "600" },

  // ---------- LOCATION ----------
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detectedBadge: {
    backgroundColor: LIME,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 8,
  },
  detectedBadgeText: { color: NAVY, fontSize: 10, fontWeight: "900" },

  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
    gap: 12,
  },
  mapTitle: { fontSize: 16, fontWeight: "800", color: NAVY },
  mapSubtitle: { fontSize: 12, color: MUTED, marginTop: 3, fontWeight: "600" },

  gpsButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: LIME,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  mapContainer: {
    height: 340,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#E8EEF7",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: NAVY,
    shadowColor: NAVY,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    position: "relative",
  },
  map: { width: "100%", height: "100%", backgroundColor: "#E8EEF7" },

  mapHint: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECECF4",
    shadowColor: NAVY,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    maxWidth: 180,
  },
  mapHintText: { fontSize: 12, color: NAVY, fontWeight: "800" },

  browseBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: LIME,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: NAVY,
    shadowColor: NAVY,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  browseBadgeText: { fontSize: 12, color: NAVY, fontWeight: "900" },

  zoomStack: { position: "absolute", top: 14, right: 14 },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECECF4",
    shadowColor: NAVY,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  mapCurrentButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: NAVY,
    shadowColor: LIME,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  // ---------- SELECTED / EMPTY LOCATION ----------
  selectedLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: LIME,
    borderRadius: 17,
    padding: 13,
    marginBottom: 18,
  },
  selectedLocationIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  selectedLocationContent: { flex: 1 },
  selectedLocationTitle: { color: NAVY, fontSize: 14, fontWeight: "900" },
  selectedLocationAddress: {
    color: "#545478",
    fontSize: 12,
    marginTop: 3,
    fontWeight: "600",
  },
  coordinates: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  refreshLocationButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },

  locationEmptyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: "#E4E4EE",
    borderRadius: 17,
    padding: 14,
    marginBottom: 18,
  },
  emptyLocationIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emptyLocationTitle: { fontSize: 14, fontWeight: "800", color: NAVY },
  emptyLocationText: {
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
    marginTop: 3,
    fontWeight: "600",
  },

  // ---------- WARNING ----------
  locationWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF7ED",
    borderWidth: 1.5,
    borderColor: "#FED7AA",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    gap: 8,
  },
  locationWarningIcon: { fontSize: 16, color: "#9A3412", fontWeight: "900" },
  locationWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#9A3412",
    fontWeight: "600",
  },

  // ---------- INFO ----------
  mapInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 13,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#E4E4EE",
  },
  mapInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: NAVY,
    fontWeight: "600",
  },

  // ---------- CONDITION ----------
  conditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  conditionCard: {
    width: (width - 60) / 2,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: "#E4E4EE",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  conditionCardSelected: { backgroundColor: LIME, borderColor: NAVY },
  conditionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  conditionIconWrapSelected: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: NAVY,
  },
  conditionText: { fontSize: 14, fontWeight: "800", color: NAVY },
  conditionTextSelected: { color: NAVY },

  // ---------- REVIEW ----------
  reviewCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#E4E4EE",
    shadowColor: NAVY,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  reviewImage: { width: "100%", height: 180 },
  reviewVideo: {
    width: "100%",
    height: 180,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewBody: { padding: 16 },
  reviewName: { fontSize: 18, fontWeight: "800", color: NAVY },
  reviewPrice: { fontSize: 20, fontWeight: "900", color: NAVY, marginTop: 4 },
  reviewMetaRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  metaTag: {
    backgroundColor: LIME,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaTagText: { fontSize: 12, fontWeight: "800", color: NAVY },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: "#E4E4EE",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  reviewLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewLabel: { fontSize: 13, color: MUTED, fontWeight: "700" },
  reviewValue: {
    fontSize: 14,
    color: NAVY,
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },
  publishNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: LIME,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  publishNoteText: { flex: 1, fontSize: 13, color: NAVY, fontWeight: "800" },

  // ---------- FOOTER ----------
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
    backgroundColor: BG,
  },
  backNavButton: {
    paddingHorizontal: 22,
    height: 56,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: "#E4E4EE",
    alignItems: "center",
    justifyContent: "center",
  },
  backNavText: { fontSize: 15, fontWeight: "800", color: NAVY },
  nextButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: LIME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: LIME,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  nextButtonFull: { flex: 1 },
  nextText: { color: NAVY, fontSize: 16, fontWeight: "900", letterSpacing: 0.3 },
  publishButton: { backgroundColor: NAVY },
  publishText: { color: LIME, fontSize: 16, fontWeight: "900", letterSpacing: 0.3 },
  disabled: { opacity: 0.6 },

  // ---------- SUCCESS ----------
  successContainer: {
    flex: 1,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
    borderWidth: 3,
    borderColor: NAVY,
    shadowColor: NAVY,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  successTitle: { fontSize: 26, fontWeight: "900", color: NAVY },
  successSubtitle: {
    fontSize: 14,
    color: MUTED,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  successActions: { width: "100%", maxWidth: 360, marginTop: 32, gap: 12 },
  successPrimary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: LIME,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  successPrimaryText: { color: NAVY, fontSize: 16, fontWeight: "900" },
  successSecondary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  successSecondaryText: { color: NAVY, fontSize: 15, fontWeight: "800" },
});