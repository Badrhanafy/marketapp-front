import React, { useEffect, useRef, useState, useMemo } from "react";
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
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
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
  FileText,
  Sparkles,
  ThumbsUp,
  Wrench,
  Recycle,
  Star,
  Rocket,
  Shield,
  ArrowRight,
  Hand,
  Move,
} from "lucide-react-native";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const { width } = Dimensions.get("window");
const MAX_MEDIA = 8;

// ============================================================
// BRAND PALETTE (shared across light & dark)
// ============================================================
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#ECFDF5";
const WHITE = "#FFFFFF";

// ============================================================
// STEPS
// ============================================================
const STEPS = [
  { key: "media", titleKey: "createProduct.steps.media", subtitleKey: "createProduct.steps.mediaSub" },
  { key: "details", titleKey: "createProduct.steps.details", subtitleKey: "createProduct.steps.detailsSub" },
  { key: "location", titleKey: "createProduct.steps.location", subtitleKey: "createProduct.steps.locationSub" },
  { key: "review", titleKey: "createProduct.steps.review", subtitleKey: "createProduct.steps.reviewSub" },
];

// Backend Rule::in([...]) — must match exactly
const CONDITIONS = [
  { value: "New", labelKey: "products.conditions.new", Icon: Sparkles },
  { value: "Like_new", labelKey: "products.conditions.like_new", Icon: Star },
  { value: "Good", labelKey: "products.conditions.good", Icon: ThumbsUp },
  { value: "Fair", labelKey: "products.conditions.fair", Icon: Wrench },
  { value: "Poor", labelKey: "products.conditions.poor", Icon: Recycle },
];

const DEFAULT_POSITION = { latitude: 31.7917, longitude: -7.0926 };
const DEFAULT_ZOOM = 6;

// ============================================================
// LEAFLET MAP HTML — theme-aware pin colors
// ============================================================
const buildPickableMapHtml = ({ pin, theme }) => {
  const hasPin =
    pin &&
    Number.isFinite(Number(pin.latitude)) &&
    Number.isFinite(Number(pin.longitude));

  const initialCenter = hasPin
    ? [Number(pin.latitude), Number(pin.longitude)]
    : [DEFAULT_POSITION.latitude, DEFAULT_POSITION.longitude];

  const initialZoom = hasPin ? 15 : DEFAULT_ZOOM;

  const mapBg = theme.mapBg;
  const pinColor = theme.mapPinColor;
  const pinShadow = theme.mapPinShadow;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-container {
      background: ${mapBg};
      font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif;
      touch-action: none;
    }
    .pin-wrap { position: relative; width: 46px; height: 58px; }
    .pin-head {
      width: 42px; height: 42px; border-radius: 50%;
      background: ${pinColor};
      border: 3px solid #FFFFFF;
      display: flex; align-items: center; justify-content: center;
      position: absolute; top: 0; left: 2px;
      box-shadow: 0 6px 14px ${pinShadow};
    }
    .pin-head-dot {
      width: 14px; height: 14px; border-radius: 50%;
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.35);
    }
    .pin-tail {
      position: absolute; bottom: 0; left: 50%;
      width: 8px; height: 8px;
      background: ${pinColor};
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      transform: translateX(-50%);
    }
    .pin-shadow {
      position: absolute; bottom: -3px; left: 50%;
      width: 22px; height: 6px;
      background: ${pinShadow};
      border-radius: 50%; transform: translateX(-50%);
      filter: blur(2px);
    }
    .browse-indicator {
      position: absolute; inset: 0;
      pointer-events: none;
      border: 3px solid ${pinColor};
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
          setTimeout(exitBrowse, 300);
        }
      }

      map.getContainer().addEventListener('touchstart', onTouchStart, { passive: true });
      map.getContainer().addEventListener('touchmove', onTouchMove, { passive: true });
      map.getContainer().addEventListener('touchend', onTouchEnd, { passive: true });
      map.getContainer().addEventListener('touchcancel', onTouchEnd, { passive: true });

      map.on('click', function (e) {
        if (browseMode) return;
        placePin(e.latlng.lat, e.latlng.lng, false);
      });

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
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  /*
  |--------------------------------------------------------------------------
  | Theme-derived colors
  |--------------------------------------------------------------------------
  */
  const themeColors = useMemo(
    () => ({
      /* Surfaces */
      bg: colors.background,
      surface: colors.surface,
      field: colors.surfaceSecondary,
      cardBg: colors.surface,

      /* Text */
      text: colors.text,
      textMuted: colors.textSecondary,
      textInactive: colors.inactive,

      /* Borders */
      border: colors.border,

      /* Shadows */
      shadow: colors.text,

      /* Brand */
      primary: colors.primary,
      icon: colors.icon,

      /* Condition chip backgrounds */
      iconWrapBg: isDark ? "rgba(34,197,94,0.12)" : GREEN_TINT,
      greenSoft: isDark ? "rgba(34,197,94,0.14)" : GREEN_SOFT,

      /* Warning */
      warningBg: isDark ? "rgba(154,52,18,0.15)" : "#FFF7ED",
      warningBorder: isDark ? "rgba(234,88,12,0.35)" : "#FED7AA",
      warningText: isDark ? "#FDBA74" : "#9A3412",

      /* Map */
      mapBg: isDark ? "#0F172A" : "#E8F5EC",
      mapPinColor: colors.primary,
      mapPinShadow: isDark
        ? "rgba(34,197,94,0.35)"
        : "rgba(22,163,74,0.35)",

      /* Progress track background */
      trackBg: isDark ? "#1E293B" : "#E2E8F0",

      /* Overlay gradient tint for review card etc */
      overlay: isDark ? "rgba(15,23,42,0.9)" : SLATE,
    }),
    [colors, isDark]
  );

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
        Alert.alert(t("common.error"), "Unable to load categories.");
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [t]);

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
      const addresses = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (!addresses || addresses.length === 0) {
        setLocationAddress("Selected location");
        return;
      }
      const a = addresses[0];
      const detectedCity = a.city || a.subregion || a.district || a.region || "";
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
      if (msg?.type === "ready") {
        setMapReady(true);
        return;
      }
      if (msg?.type === "browseMode") {
        setMapBrowsing(!!msg.active);
        return;
      }
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
        setLocationError(
          "Location services are disabled. Enable GPS or tap the map."
        );
        Alert.alert(
          "Location services disabled",
          "Turn on GPS, or tap the map."
        );
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationError(
          "Location permission denied. Tap the map instead."
        );
        Alert.alert(
          "Location permission",
          "You can still tap the map to place the pin."
        );
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
      setLocationError(
        "Couldn't get your GPS location. Tap the map to pick manually."
      );
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
        if (media.length === 0) {
          Alert.alert(t("common.oops"), t("createProduct.valMedia"));
          return false;
        }
        return true;
      case 1:
        if (!name.trim()) {
          Alert.alert(t("common.oops"), t("createProduct.valName"));
          return false;
        }
        if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
          Alert.alert(t("common.oops"), t("createProduct.valPrice"));
          return false;
        }
        if (!categoryId) {
          Alert.alert(t("common.oops"), t("createProduct.valCategory"));
          return false;
        }
        return true;
      case 2:
        if (!city.trim()) {
          Alert.alert(t("common.oops"), t("createProduct.valCity"));
          return false;
        }
        if (!condition) {
          Alert.alert(t("common.oops"), t("createProduct.valCondition"));
          return false;
        }
        if (latitude === null || longitude === null) {
          Alert.alert(t("common.oops"), t("createProduct.valLocation"));
          return false;
        }
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
      Alert.alert(
        t("common.holdOn"),
        t("createProduct.maxMediaReached", { max: MAX_MEDIA })
      );
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("common.holdOn"),
        t("createProduct.permissionRequired")
      );
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
  const removeMedia = (i) =>
    setMedia((cur) => cur.filter((_, idx) => idx !== i));

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
      const product =
        productResponse.data.product || productResponse.data.data;
      if (!product?.id)
        throw new Error("Product ID was not returned by the server.");

      const formData = new FormData();
      media.forEach((item, i) => {
        const uri = item.uri;
        const fileName =
          item.fileName ||
          uri.split("/").pop() ||
          `media-${Date.now()}-${i}`;
        let mimeType = item.mimeType;
        if (!mimeType)
          mimeType = item.type === "video" ? "video/mp4" : "image/jpeg";
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
      if (errors)
        Alert.alert(
          t("common.error"),
          Object.values(errors).flat().join("\n")
        );
      else
        Alert.alert(
          t("common.error"),
          error.response?.data?.message ||
            error.message ||
            t("common.somethingWentWrong")
        );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESET
  // =====================================================
  const resetForm = () => {
    setName("");
    setPrice("");
    setCity("");
    setLatitude(null);
    setLongitude(null);
    setLocationAddress("");
    setLocationError("");
    setCondition("");
    setDescription("");
    setCategoryId(null);
    setMedia([]);
    setStep(0);
    setSuccess(false);
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
      <Animated.View
        style={[
          styles.dropZone,
          {
            borderColor: themeColors.primary,
            backgroundColor: themeColors.greenSoft,
          },
          enterStyle(0),
        ]}
      >
        <TouchableOpacity style={styles.dropZoneInner} onPress={pickMedia}>
          <View
            style={[
              styles.dropZoneIcon,
              {
                backgroundColor: themeColors.primary,
                shadowColor: themeColors.shadow,
              },
            ]}
          >
            <ImagePlus size={28} color={WHITE} strokeWidth={2.2} />
          </View>
          <Text style={[styles.dropZoneTitle, { color: themeColors.text }]}>
            {media.length === 0
              ? t("createProduct.addPhotos")
              : t("createProduct.addMore")}
          </Text>
          <Text style={[styles.dropZoneHint, { color: themeColors.textMuted }]}>
            {t("createProduct.slotsLeft", { count: MAX_MEDIA - media.length })}
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
                {
                  backgroundColor: themeColors.field,
                  opacity: entranceAnims[Math.min(index + 1, 7)] || 1,
                },
              ]}
            >
              {item.type === "video" ? (
                <View
                  style={[
                    styles.videoPreview,
                    { backgroundColor: themeColors.overlay },
                  ]}
                >
                  <Camera size={22} color={WHITE} />
                  <Text style={styles.videoText}>Video</Text>
                </View>
              ) : (
                <Image source={{ uri: item.uri }} style={styles.previewImage} />
              )}

              {index === 0 && (
                <View
                  style={[
                    styles.coverBadge,
                    { backgroundColor: themeColors.primary },
                  ]}
                >
                  <Text style={styles.coverBadgeText}>
                    {t("createProduct.cover")}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.removeButton,
                  { backgroundColor: themeColors.overlay },
                ]}
                onPress={() => removeMedia(index)}
                hitSlop={6}
              >
                <X size={14} color={WHITE} strokeWidth={3} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      <Animated.View
        style={[
          styles.tipCard,
          { backgroundColor: themeColors.greenSoft },
          enterStyle(6),
        ]}
      >
        <Sparkles size={18} color={themeColors.primary} />
        <Text style={[styles.tipText, { color: themeColors.primary }]}>
          {t("createProduct.photoTip")}
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
        <Text style={[styles.label, { color: themeColors.text }]}>
          {t("createProduct.productName")}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: themeColors.field,
              borderColor: themeColors.border,
              color: themeColors.text,
            },
          ]}
          placeholder={t("createProduct.productNamePlaceholder")}
          placeholderTextColor={themeColors.textInactive}
          value={name}
          onChangeText={setName}
        />
      </Animated.View>

      <Animated.View style={enterStyle(1)}>
        <Text style={[styles.label, { color: themeColors.text }]}>
          {t("createProduct.price")}
        </Text>
        <View style={styles.priceRow}>
          <View
            style={[
              styles.currencyBadge,
              { backgroundColor: themeColors.primary },
            ]}
          >
            <Text style={styles.currencyText}>{t("common.currency")}</Text>
          </View>
          <TextInput
            style={[
              styles.input,
              styles.priceInput,
              {
                backgroundColor: themeColors.field,
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            placeholder="0"
            placeholderTextColor={themeColors.textInactive}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>
      </Animated.View>

      <Animated.View style={enterStyle(2)}>
        <Text style={[styles.label, { color: themeColors.text }]}>
          {t("createProduct.category")}
        </Text>

        {loadingCategories ? (
          <View style={styles.loadingCategory}>
            <ActivityIndicator color={themeColors.primary} />
            <Text
              style={[
                styles.loadingText,
                { color: themeColors.textMuted },
              ]}
            >
              {t("createProduct.loadingCategories")}
            </Text>
          </View>
        ) : (
          <View style={styles.chipWrap}>
            {categories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected
                        ? themeColors.primary
                        : themeColors.field,
                      borderColor: selected
                        ? themeColors.primary
                        : themeColors.border,
                    },
                  ]}
                  onPress={() => setCategoryId(category.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: selected ? WHITE : themeColors.text,
                      },
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Animated.View>

      <Animated.View style={enterStyle(3)}>
        <Text style={[styles.label, { color: themeColors.text }]}>
          {t("createProduct.description")}
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.textarea,
            {
              backgroundColor: themeColors.field,
              borderColor: themeColors.border,
              color: themeColors.text,
            },
          ]}
          placeholder={t("createProduct.descPlaceholder")}
          placeholderTextColor={themeColors.textInactive}
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
      initialPinRef.current = hasLocation
        ? { latitude, longitude }
        : null;
    }
    const html = buildPickableMapHtml({
      pin: initialPinRef.current,
      theme: themeColors,
    });

    return (
      <>
        {/* CITY */}
        <Animated.View style={enterStyle(0)}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: themeColors.text }]}>
              {t("createProduct.city")}
            </Text>
            {city.trim() !== "" && (
              <View
                style={[
                  styles.detectedBadge,
                  { backgroundColor: themeColors.greenSoft },
                ]}
              >
                <Text
                  style={[
                    styles.detectedBadgeText,
                    { color: themeColors.primary },
                  ]}
                >
                  {t("createProduct.autoFilled")}
                </Text>
              </View>
            )}
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.field,
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            placeholder={t("createProduct.cityPlaceholder")}
            placeholderTextColor={themeColors.textInactive}
            value={city}
            onChangeText={setCity}
          />
        </Animated.View>

        {/* MAP HEADER */}
        <Animated.View style={enterStyle(1)}>
          <View style={styles.mapHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mapTitle, { color: themeColors.text }]}>
                {t("createProduct.dropPin")}
              </Text>
              <Text
                style={[styles.mapSubtitle, { color: themeColors.textMuted }]}
              >
                {t("createProduct.dropPinSub")}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.gpsButton,
                {
                  backgroundColor: themeColors.primary,
                  shadowColor: themeColors.shadow,
                },
              ]}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
              activeOpacity={0.85}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <LocateFixed size={20} color={WHITE} strokeWidth={2.4} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* MAP */}
        <Animated.View
          style={[
            styles.mapContainer,
            {
              borderColor: themeColors.primary,
              backgroundColor: themeColors.mapBg,
              shadowColor: themeColors.shadow,
            },
            enterStyle(2),
          ]}
        >
          <WebView
            ref={webRef}
            style={[styles.map, { backgroundColor: themeColors.mapBg }]}
            originWhitelist={["*"]}
            source={{ html, baseUrl: "https://localhost" }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View
                style={[
                  styles.mapLoading,
                  { backgroundColor: themeColors.mapBg },
                ]}
              >
                <ActivityIndicator color={themeColors.primary} />
              </View>
            )}
            androidLayerType="hardware"
            setSupportMultipleWindows={false}
            scrollEnabled={false}
            overScrollMode="never"
            bounces={false}
          />

          {/* Hold-to-browse HINT */}
          <View
            style={[
              styles.mapHint,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                shadowColor: themeColors.shadow,
              },
            ]}
            pointerEvents="none"
          >
            <Hand size={14} color={themeColors.primary} strokeWidth={2.4} />
            <Text
              style={[styles.mapHintText, { color: themeColors.text }]}
              numberOfLines={1}
            >
              {mapBrowsing
                ? t("createProduct.browsingMap")
                : t("createProduct.holdToBrowse")}
            </Text>
          </View>

          {mapBrowsing && (
            <View
              style={[
                styles.browseBadge,
                { backgroundColor: themeColors.primary },
              ]}
              pointerEvents="none"
            >
              <Move size={12} color={WHITE} strokeWidth={2.6} />
              <Text style={styles.browseBadgeText}>
                {t("createProduct.dragging")}
              </Text>
            </View>
          )}

          {/* Zoom stack */}
          <View style={styles.zoomStack}>
            <TouchableOpacity
              style={[
                styles.zoomBtn,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  shadowColor: themeColors.shadow,
                },
              ]}
              onPress={zoomIn}
              activeOpacity={0.85}
            >
              <Plus size={18} color={themeColors.text} strokeWidth={2.8} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.zoomBtn,
                {
                  marginTop: 8,
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  shadowColor: themeColors.shadow,
                },
              ]}
              onPress={zoomOut}
              activeOpacity={0.85}
            >
              <Minus size={18} color={themeColors.text} strokeWidth={2.8} />
            </TouchableOpacity>
          </View>

          {/* Recenter */}
          <TouchableOpacity
            style={[
              styles.mapCurrentButton,
              {
                backgroundColor: themeColors.primary,
                shadowColor: themeColors.shadow,
              },
            ]}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
            activeOpacity={0.85}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <Navigation size={18} color={WHITE} strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* SELECTED / EMPTY LOCATION */}
        {hasLocation ? (
          <Animated.View
            style={[
              styles.selectedLocationCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.primary,
              },
              enterStyle(3),
            ]}
          >
            <View
              style={[
                styles.selectedLocationIcon,
                { backgroundColor: themeColors.primary },
              ]}
            >
              <MapPin size={18} color={WHITE} strokeWidth={2.4} />
            </View>
            <View style={styles.selectedLocationContent}>
              <Text
                style={[
                  styles.selectedLocationTitle,
                  { color: themeColors.text },
                ]}
              >
                {t("createProduct.pinPlaced")}
              </Text>
              <Text
                style={[
                  styles.selectedLocationAddress,
                  { color: themeColors.textMuted },
                ]}
                numberOfLines={2}
              >
                {locationAddress || city || "Selected location"}
              </Text>
              <Text
                style={[
                  styles.coordinates,
                  { color: themeColors.textInactive },
                ]}
              >
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.refreshLocationButton,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.primary,
                },
              ]}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
              hitSlop={6}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <RefreshCw
                  size={16}
                  color={themeColors.primary}
                  strokeWidth={2.4}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              styles.locationEmptyCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
              enterStyle(3),
            ]}
          >
            <View
              style={[
                styles.emptyLocationIcon,
                { backgroundColor: themeColors.field },
              ]}
            >
              <MapPin
                size={18}
                color={themeColors.textInactive}
                strokeWidth={2.4}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.emptyLocationTitle,
                  { color: themeColors.text },
                ]}
              >
                {t("createProduct.noLocationYet")}
              </Text>
              <Text
                style={[
                  styles.emptyLocationText,
                  { color: themeColors.textMuted },
                ]}
              >
                {t("createProduct.tapMapToPlace")}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ERROR */}
        {locationError !== "" && (
          <Animated.View
            style={[
              styles.locationWarning,
              {
                backgroundColor: themeColors.warningBg,
                borderColor: themeColors.warningBorder,
              },
              enterStyle(4),
            ]}
          >
            <Text
              style={[
                styles.locationWarningIcon,
                { color: themeColors.warningText },
              ]}
            >
              ⚠
            </Text>
            <Text
              style={[
                styles.locationWarningText,
                { color: themeColors.warningText },
              ]}
            >
              {locationError}
            </Text>
          </Animated.View>
        )}

        {/* CONDITION */}
        <Animated.View style={enterStyle(5)}>
          <Text style={[styles.label, { color: themeColors.text }]}>
            {t("createProduct.condition")}
          </Text>
          <View style={styles.conditionRow}>
            {CONDITIONS.map(({ value, labelKey, Icon }) => {
              const selected = condition === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.conditionCard,
                    {
                      backgroundColor: selected
                        ? themeColors.primary
                        : themeColors.surface,
                      borderColor: selected
                        ? themeColors.primary
                        : themeColors.border,
                    },
                  ]}
                  onPress={() => setCondition(value)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.conditionIconWrap,
                      {
                        backgroundColor: selected
                          ? "rgba(255,255,255,0.2)"
                          : themeColors.iconWrapBg,
                        borderWidth: selected ? 1.5 : 0,
                        borderColor: selected ? WHITE : "transparent",
                      },
                    ]}
                  >
                    <Icon
                      size={20}
                      color={selected ? WHITE : themeColors.primary}
                      strokeWidth={2.4}
                    />
                  </View>
                  <Text
                    style={[
                      styles.conditionText,
                      { color: selected ? WHITE : themeColors.text },
                    ]}
                  >
                    {t(labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* INFO */}
        <Animated.View
          style={[
            styles.mapInfoCard,
            {
              backgroundColor: themeColors.greenSoft,
              borderColor: themeColors.greenSoft,
            },
            enterStyle(6),
          ]}
        >
          <Shield size={16} color={themeColors.primary} strokeWidth={2.4} />
          <Text
            style={[styles.mapInfoText, { color: themeColors.primary }]}
          >
            {t("createProduct.locationPrivacy")}
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
      <Animated.View
        style={[
          styles.reviewCard,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
            shadowColor: themeColors.shadow,
          },
          enterStyle(0),
        ]}
      >
        {media[0] && media[0].type !== "video" && (
          <Image source={{ uri: media[0].uri }} style={styles.reviewImage} />
        )}
        {media[0] && media[0].type === "video" && (
          <View
            style={[
              styles.reviewVideo,
              { backgroundColor: themeColors.overlay },
            ]}
          >
            <Camera size={28} color={WHITE} />
          </View>
        )}

        <View style={styles.reviewBody}>
          <Text style={[styles.reviewName, { color: themeColors.text }]}>
            {name.trim() || t("createProduct.unnamedProduct")}
          </Text>
          <Text
            style={[styles.reviewPrice, { color: themeColors.primary }]}
          >
            {Number(price) || 0} {t("common.currency")}
          </Text>

          <View style={styles.reviewMetaRow}>
            {selectedCategory && (
              <View
                style={[
                  styles.metaTag,
                  { backgroundColor: themeColors.greenSoft },
                ]}
              >
                <Text
                  style={[
                    styles.metaTagText,
                    { color: themeColors.primary },
                  ]}
                >
                  {selectedCategory.name}
                </Text>
              </View>
            )}
            {condition !== "" && (
              <View
                style={[
                  styles.metaTag,
                  { backgroundColor: themeColors.greenSoft },
                ]}
              >
                <Text
                  style={[
                    styles.metaTagText,
                    { color: themeColors.primary },
                  ]}
                >
                  {t(
                    CONDITIONS.find((c) => c.value === condition)?.labelKey ||
                      "createProduct.condition"
                  )}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.reviewRow,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
          enterStyle(1),
        ]}
      >
        <View style={styles.reviewLeft}>
          <MapPin size={14} color={themeColors.textMuted} />
          <Text
            style={[styles.reviewLabel, { color: themeColors.textMuted }]}
          >
            {t("createProduct.city").replace(" *", "")}
          </Text>
        </View>
        <Text
          style={[styles.reviewValue, { color: themeColors.text }]}
        >
          {city.trim() || "—"}
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.reviewRow,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
          enterStyle(2),
        ]}
      >
        <View style={styles.reviewLeft}>
          <Navigation size={14} color={themeColors.textMuted} />
          <Text
            style={[styles.reviewLabel, { color: themeColors.textMuted }]}
          >
            {t("createProduct.coordinates")}
          </Text>
        </View>
        <Text
          style={[styles.reviewValue, { color: themeColors.text }]}
          numberOfLines={1}
        >
          {latitude !== null && longitude !== null
            ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            : "—"}
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.reviewRow,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
          enterStyle(3),
        ]}
      >
        <View style={styles.reviewLeft}>
          <Camera size={14} color={themeColors.textMuted} />
          <Text
            style={[styles.reviewLabel, { color: themeColors.textMuted }]}
          >
            {t("createProduct.media")}
          </Text>
        </View>
        <Text
          style={[styles.reviewValue, { color: themeColors.text }]}
        >
          {media.length}{" "}
          {media.length === 1
            ? t("createProduct.mediaCount", { count: 1 })
            : t("createProduct.mediaCount_plural", { count: media.length })}
        </Text>
      </Animated.View>

      {description.trim() !== "" && (
        <Animated.View
          style={[
            styles.reviewRow,
            {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            },
            enterStyle(4),
          ]}
        >
          <View style={styles.reviewLeft}>
            <FileText size={14} color={themeColors.textMuted} />
            <Text
              style={[styles.reviewLabel, { color: themeColors.textMuted }]}
            >
              {t("createProduct.description")}
            </Text>
          </View>
          <Text
            style={[styles.reviewValue, { color: themeColors.text }]}
            numberOfLines={3}
          >
            {description.trim()}
          </Text>
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.publishNote,
          { backgroundColor: themeColors.greenSoft },
          enterStyle(5),
        ]}
      >
        <Rocket
          size={16}
          color={themeColors.primary}
          strokeWidth={2.4}
        />
        <Text
          style={[styles.publishNoteText, { color: themeColors.primary }]}
        >
          {t("createProduct.publishNote")}
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
      <View
        style={[
          styles.successContainer,
          { backgroundColor: themeColors.bg },
        ]}
      >
        <Animated.View
          style={[
            styles.successCircle,
            {
              backgroundColor: themeColors.primary,
              borderColor: themeColors.primary,
              shadowColor: themeColors.shadow,
            },
            { transform: [{ scale: successScale }] },
          ]}
        >
          <Check size={44} color={WHITE} strokeWidth={3} />
        </Animated.View>
        <Text
          style={[styles.successTitle, { color: themeColors.text }]}
        >
          {t("createProduct.successTitle")}
        </Text>
        <Text
          style={[
            styles.successSubtitle,
            { color: themeColors.textMuted },
          ]}
        >
          {t("createProduct.successSub")}
        </Text>

        <View style={styles.successActions}>
          <TouchableOpacity
            style={[
              styles.successPrimary,
              {
                backgroundColor: themeColors.primary,
                shadowColor: themeColors.shadow,
              },
            ]}
            onPress={resetForm}
            activeOpacity={0.9}
          >
            <Plus size={18} color={WHITE} strokeWidth={2.8} />
            <Text style={styles.successPrimaryText}>
              {t("createProduct.createAnother")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.successSecondary,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.primary,
              },
            ]}
            onPress={() => navigation.navigate("Products")}
            activeOpacity={0.9}
          >
            <Text
              style={[
                styles.successSecondaryText,
                { color: themeColors.primary },
              ]}
            >
              {t("createProduct.viewProduct")}
            </Text>
            <ArrowRight
              size={16}
              color={themeColors.primary}
              strokeWidth={2.6}
            />
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
      style={[styles.flex, { backgroundColor: themeColors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={[
              styles.backButton,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                shadowColor: themeColors.shadow,
              },
            ]}
            hitSlop={12}
            activeOpacity={0.85}
          >
            {step === 0 ? (
              <X size={18} color={themeColors.text} strokeWidth={2.6} />
            ) : (
              <ChevronLeft
                size={18}
                color={themeColors.text}
                strokeWidth={2.6}
              />
            )}
          </TouchableOpacity>

          <View
            style={[
              styles.progressTrack,
              { backgroundColor: themeColors.trackBg },
            ]}
          >
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: themeColors.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["12%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.stepCounterBadge,
              { backgroundColor: themeColors.greenSoft },
            ]}
          >
            <Text
              style={[
                styles.stepCounter,
                { color: themeColors.primary },
              ]}
            >
              {step + 1}/{STEPS.length}
            </Text>
          </View>
        </View>

        {/* DOTS */}
        <View style={styles.dotsRow}>
          {STEPS.map((s, i) => (
            <View key={s.key} style={styles.dotItem}>
              <View
                style={[
                  styles.dot,
                  i <= step
                    ? { backgroundColor: themeColors.primary }
                    : { backgroundColor: themeColors.trackBg },
                ]}
              >
                {i < step && (
                  <Check size={11} color={WHITE} strokeWidth={3.4} />
                )}
              </View>
              {i < STEPS.length - 1 && (
                <View
                  style={[
                    styles.dotLine,
                    i < step
                      ? { backgroundColor: themeColors.primary }
                      : { backgroundColor: themeColors.trackBg },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* TITLES */}
        <Animated.View style={[styles.titles, { opacity: fadeAnim }]}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t(STEPS[step].titleKey)}
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
            {t(STEPS[step].subtitleKey)}
          </Text>
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
        <View
          style={[
            styles.footer,
            {
              backgroundColor: themeColors.surface,
              borderTopColor: themeColors.border,
            },
          ]}
        >
          {step > 0 && (
            <TouchableOpacity
              style={[
                styles.backNavButton,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                },
              ]}
              onPress={() => goToStep(step - 1)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.backNavText, { color: themeColors.text }]}
              >
                {t("common.back")}
              </Text>
            </TouchableOpacity>
          )}

          {step < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                {
                  backgroundColor: themeColors.primary,
                  shadowColor: themeColors.shadow,
                },
                step === 0 && styles.nextButtonFull,
              ]}
              onPress={handleNext}
              activeOpacity={0.9}
            >
              <Text style={styles.nextText}>{t("common.continue")}</Text>
              <ChevronRight size={18} color={WHITE} strokeWidth={2.8} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.nextButton,
                {
                  backgroundColor: themeColors.primary,
                  shadowColor: themeColors.shadow,
                },
                loading && styles.disabled,
              ]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <>
                  <Rocket size={18} color={WHITE} strokeWidth={2.6} />
                  <Text style={styles.publishText}>
                    {loading
                      ? t("createProduct.publishing")
                      : t("createProduct.publishNow")}
                  </Text>
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
// STYLES  (structural only — colors inline from theme)
// =====================================================
const SLATE = "#0F172A";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },

  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  stepCounterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: "900",
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
    alignItems: "center",
    justifyContent: "center",
  },
  dotLine: {
    flex: 1,
    height: 3,
    marginHorizontal: 4,
    borderRadius: 2,
  },

  titles: { paddingHorizontal: 20, marginTop: 22, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { marginTop: 4, fontSize: 14, fontWeight: "600" },

  content: { paddingHorizontal: 20, paddingBottom: 30 },

  // ---------- INPUTS ----------
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
  },
  textarea: { height: 110 },

  // ---------- MEDIA ----------
  dropZone: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  dropZoneInner: { alignItems: "center", paddingVertical: 38 },
  dropZoneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dropZoneTitle: { fontSize: 17, fontWeight: "800" },
  dropZoneHint: { fontSize: 13, marginTop: 4, fontWeight: "600" },

  mediaPreview: { marginTop: 4, marginBottom: 18 },
  mediaItem: {
    width: 108,
    height: 108,
    borderRadius: 14,
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: { width: "100%", height: "100%" },
  videoPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  videoText: { color: WHITE, marginTop: 2, fontSize: 12, fontWeight: "700" },
  coverBadge: {
    position: "absolute",
    bottom: 5,
    left: 5,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  coverBadgeText: {
    color: WHITE,
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
    alignItems: "center",
    justifyContent: "center",
  },

  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  tipText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },

  // ---------- DETAILS ----------
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  currencyBadge: {
    borderRadius: 14,
    width: 56,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  currencyText: { color: WHITE, fontWeight: "900", fontSize: 15 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: "800" },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontWeight: "700" },

  loadingCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  loadingText: { fontWeight: "600" },

  // ---------- LOCATION ----------
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detectedBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 8,
  },
  detectedBadgeText: { fontSize: 10, fontWeight: "900" },

  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
    gap: 12,
  },
  mapTitle: { fontSize: 16, fontWeight: "800" },
  mapSubtitle: { fontSize: 12, marginTop: 3, fontWeight: "600" },

  gpsButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  mapContainer: {
    height: 340,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 2,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    position: "relative",
  },
  map: { width: "100%", height: "100%" },

  mapHint: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    maxWidth: 180,
  },
  mapHintText: { fontSize: 12, fontWeight: "800" },

  browseBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#15803D",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  browseBadgeText: { fontSize: 12, color: WHITE, fontWeight: "900" },

  zoomStack: { position: "absolute", top: 14, right: 14 },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  // ---------- SELECTED / EMPTY LOCATION ----------
  selectedLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 17,
    padding: 13,
    marginBottom: 18,
  },
  selectedLocationIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  selectedLocationContent: { flex: 1 },
  selectedLocationTitle: { fontSize: 14, fontWeight: "900" },
  selectedLocationAddress: { fontSize: 12, marginTop: 3, fontWeight: "600" },
  coordinates: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  refreshLocationButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  locationEmptyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 17,
    padding: 14,
    marginBottom: 18,
  },
  emptyLocationIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emptyLocationTitle: { fontSize: 14, fontWeight: "800" },
  emptyLocationText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
    fontWeight: "600",
  },

  // ---------- WARNING ----------
  locationWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    gap: 8,
  },
  locationWarningIcon: { fontSize: 16, fontWeight: "900" },
  locationWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },

  // ---------- INFO ----------
  mapInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
    padding: 13,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1.5,
  },
  mapInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
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
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  conditionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  conditionText: { fontSize: 14, fontWeight: "800" },

  // ---------- REVIEW ----------
  reviewCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1.5,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  reviewImage: { width: "100%", height: 180 },
  reviewVideo: {
    width: "100%",
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewBody: { padding: 16 },
  reviewName: { fontSize: 18, fontWeight: "800" },
  reviewPrice: { fontSize: 20, fontWeight: "900", marginTop: 4 },
  reviewMetaRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  metaTag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaTagText: { fontSize: 12, fontWeight: "800" },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  reviewLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewLabel: { fontSize: 13, fontWeight: "700" },
  reviewValue: {
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },
  publishNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  publishNoteText: { flex: 1, fontSize: 13, fontWeight: "800" },

  // ---------- FOOTER ----------
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  backNavButton: {
    paddingHorizontal: 22,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  backNavText: { fontSize: 15, fontWeight: "800" },
  nextButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  nextButtonFull: { flex: 1 },
  nextText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  publishText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  disabled: { opacity: 0.6 },

  // ---------- SUCCESS ----------
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
    borderWidth: 3,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  successTitle: { fontSize: 26, fontWeight: "900" },
  successSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  successActions: { width: "100%", maxWidth: 360, marginTop: 32, gap: 12 },
  successPrimary: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  successPrimaryText: { color: WHITE, fontSize: 16, fontWeight: "900" },
  successSecondary: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  successSecondaryText: { fontSize: 15, fontWeight: "800" },
});