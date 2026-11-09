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
const WHITE = "#FFFFFF";

/* ============================================================ */
/* Steps                                                        */
/* ============================================================ */
const STEPS = [
  { key: "media", titleKey: "createProduct.steps.media", subtitleKey: "createProduct.steps.mediaSub" },
  { key: "details", titleKey: "createProduct.steps.details", subtitleKey: "createProduct.steps.detailsSub" },
  { key: "location", titleKey: "createProduct.steps.location", subtitleKey: "createProduct.steps.locationSub" },
  { key: "review", titleKey: "createProduct.steps.review", subtitleKey: "createProduct.steps.reviewSub" },
];

const CONDITIONS = [
  { value: "New", labelKey: "products.conditions.new", Icon: Sparkles },
  { value: "Like_new", labelKey: "products.conditions.like_new", Icon: Star },
  { value: "Good", labelKey: "products.conditions.good", Icon: ThumbsUp },
  { value: "Fair", labelKey: "products.conditions.fair", Icon: Wrench },
  { value: "Poor", labelKey: "products.conditions.poor", Icon: Recycle },
];

const DEFAULT_POSITION = { latitude: 31.7917, longitude: -7.0926 };
const DEFAULT_ZOOM = 6;

/* ============================================================ */
/* Palette resolver — safe fallbacks, light + dark              */
/* ============================================================ */
function buildPalette(colors, isDark) {
  const primary = colors?.primary || "#16A34A";
  const surface = colors?.surface || (isDark ? "#0F172A" : WHITE);
  const bg = colors?.background || (isDark ? "#0B1220" : WHITE);
  const field = colors?.surfaceSecondary || (isDark ? "#111C33" : "#F1F5F9");
  const border = colors?.border || (isDark ? "#1E293B" : "#E2E8F0");
  const text = colors?.text || (isDark ? "#F1F5F9" : "#0F172A");
  const textMuted = colors?.textSecondary || (isDark ? "#94A3B8" : "#475569");
  const textInactive = colors?.inactive || (isDark ? "#64748B" : "#94A3B8");

  return {
    primary,
    primarySoft: isDark ? "rgba(34,197,94,0.14)" : "#ECFDF5",
    primaryBorder: isDark ? "rgba(34,197,94,0.35)" : "#BBF7D0",
    surface,
    bg,
    field,
    border,
    text,
    textMuted,
    textInactive,
    shadow: isDark ? "#000000" : "#0F172A",
    mapBg: isDark ? "#0B1220" : "#EAF3EC",
    mapPinColor: primary,
    mapPinShadow: isDark ? "rgba(34,197,94,0.35)" : "rgba(22,163,74,0.35)",
    warningBg: isDark ? "rgba(154,52,18,0.15)" : "#FFF7ED",
    warningBorder: isDark ? "rgba(234,88,12,0.35)" : "#FED7AA",
    warningText: isDark ? "#FDBA74" : "#9A3412",
  };
}

/* ============================================================ */
/* Leaflet map HTML — reliable interactions                     */
/* ============================================================ */
const buildPickableMapHtml = ({ pin, palette }) => {
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
      background: ${palette.mapBg};
      font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif;
      touch-action: none;
    }
    .leaflet-control-attribution { font-size: 9px; }
    .pin-wrap { position: relative; width: 46px; height: 58px; }
    .pin-head {
      width: 42px; height: 42px; border-radius: 50%;
      background: ${palette.mapPinColor};
      border: 3px solid #FFFFFF;
      display: flex; align-items: center; justify-content: center;
      position: absolute; top: 0; left: 2px;
      box-shadow: 0 6px 14px ${palette.mapPinShadow};
    }
    .pin-head-dot {
      width: 14px; height: 14px; border-radius: 50%;
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.35);
    }
    .pin-tail {
      position: absolute; bottom: 0; left: 50%;
      width: 8px; height: 8px;
      background: ${palette.mapPinColor};
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      transform: translateX(-50%);
    }
    .pin-shadow {
      position: absolute; bottom: -3px; left: 50%;
      width: 22px; height: 6px;
      background: ${palette.mapPinShadow};
      border-radius: 50%; transform: translateX(-50%);
      filter: blur(2px);
    }
    .browse-indicator {
      position: absolute; inset: 0;
      pointer-events: none;
      border: 3px solid ${palette.mapPinColor};
      border-radius: 20px;
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
        dragging: false,          // disabled by default — enabled on long-press
        touchZoom: false,         // enabled on long-press
        boxZoom: false,
        scrollWheelZoom: false,
        keyboard: false,
        tap: true,
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
        if (marker) marker.setLatLng([lat, lng]);
        else marker = L.marker([lat, lng], { icon: pinIcon, draggable: false }).addTo(map);
        if (moveCamera) map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
        post({ type: 'pinChanged', latitude: lat, longitude: lng });
      }

      ${hasPin ? `placePin(${Number(pin.latitude)}, ${Number(pin.longitude)}, false);` : ""}

      /* ---- Long-press browse mode ---- */
      var browseBorder = document.getElementById('browseBorder');
      var browseMode = false;

      function enterBrowse() {
        if (browseMode) return;
        browseMode = true;
        map.dragging.enable();
        map.touchZoom.enable();
        browseBorder.classList.add('active');
        post({ type: 'browseMode', active: true });
        if (window.navigator && window.navigator.vibrate) {
          try { window.navigator.vibrate(15); } catch (_) {}
        }
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
        if (browseMode) setTimeout(exitBrowse, 200);
      }

      map.getContainer().addEventListener('touchstart', onTouchStart, { passive: true });
      map.getContainer().addEventListener('touchmove', onTouchMove, { passive: true });
      map.getContainer().addEventListener('touchend', onTouchEnd, { passive: true });
      map.getContainer().addEventListener('touchcancel', onTouchEnd, { passive: true });

      /* Tap drops the pin — only when not browsing */
      map.on('click', function (e) {
        if (browseMode) return;
        placePin(e.latlng.lat, e.latlng.lng, false);
      });

      /* Public API used by RN */
      window.__setPin = function (lat, lng, zoom) {
        placePin(lat, lng, false);
        map.setView([lat, lng], zoom || Math.max(map.getZoom(), 15), { animate: true });
      };
      window.__recenter = function () {
        if (marker) {
          var ll = marker.getLatLng();
          map.setView([ll.lat, ll.lng], Math.max(map.getZoom(), 15), { animate: true });
        } else {
          map.setView([${DEFAULT_POSITION.latitude}, ${DEFAULT_POSITION.longitude}], ${DEFAULT_ZOOM}, { animate: true });
        }
      };
      window.__zoomIn  = function () { map.zoomIn(1, { animate: true }); };
      window.__zoomOut = function () { map.zoomOut(1, { animate: true }); };

      setTimeout(function () { post({ type: 'ready' }); }, 100);
    })();
  </script>
</body>
</html>`;
};

/* ============================================================ */
/* Screen                                                        */
/* ============================================================ */
export default function CreateProductScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const T = useMemo(() => buildPalette(colors, isDark), [colors, isDark]);

  /* Form state */
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

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [media, setMedia] = useState([]);

  /* Steps */
  const [step, setStep] = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(1)).current;
  const entranceAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1 / STEPS.length)).current;

  const webRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapBrowsing, setMapBrowsing] = useState(false);
  const initialPinRef = useRef(null);

  /* Fetch categories */
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
    return () => { mounted = false; };
  }, [t]);

  /* Entrance animation per step */
  useEffect(() => {
    entranceAnims.forEach((anim) => anim.setValue(0));
    Animated.stagger(
      60,
      entranceAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 9,
        })
      )
    ).start();

    titleFade.setValue(0);
    Animated.timing(titleFade, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step, entranceAnims, titleFade, progressAnim]);

  /* Step nav */
  const goToStep = (next) => {
    const direction = next > step ? 1 : -1;
    Animated.timing(slideX, {
      toValue: -direction * width,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      slideX.setValue(direction * width);
      Animated.spring(slideX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 55,
        friction: 10,
      }).start();
    });
  };

  /* Reverse geocode */
  const reverseGeocodeLocation = async (lat, lng) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (!addresses || addresses.length === 0) {
        setLocationAddress("Selected location");
        return;
      }
      const a = addresses[0];
      const detectedCity = a.city || a.subregion || a.district || a.region || "";
      const readable = [a.street, a.district, detectedCity, a.country].filter(Boolean).join(", ");
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

  /* WebView messages */
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

  const setPinOnMap = (lat, lng) =>
    webRef.current?.injectJavaScript(`window.__setPin && window.__setPin(${lat}, ${lng}, 15); true;`);

  const zoomIn = () =>
    webRef.current?.injectJavaScript("window.__zoomIn && window.__zoomIn(); true;");
  const zoomOut = () =>
    webRef.current?.injectJavaScript("window.__zoomOut && window.__zoomOut(); true;");
  const recenter = () =>
    webRef.current?.injectJavaScript("window.__recenter && window.__recenter(); true;");

  /* GPS */
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

  /* Validation */
  const validateStep = (index) => {
    switch (index) {
      case 0:
        if (media.length === 0) { Alert.alert(t("common.oops"), t("createProduct.valMedia")); return false; }
        return true;
      case 1:
        if (!name.trim()) { Alert.alert(t("common.oops"), t("createProduct.valName")); return false; }
        if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
          Alert.alert(t("common.oops"), t("createProduct.valPrice")); return false;
        }
        if (!categoryId) { Alert.alert(t("common.oops"), t("createProduct.valCategory")); return false; }
        return true;
      case 2:
        if (!city.trim()) { Alert.alert(t("common.oops"), t("createProduct.valCity")); return false; }
        if (!condition) { Alert.alert(t("common.oops"), t("createProduct.valCondition")); return false; }
        if (latitude === null || longitude === null) {
          Alert.alert(t("common.oops"), t("createProduct.valLocation")); return false;
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

  /* Media */
  const pickMedia = async () => {
    if (media.length >= MAX_MEDIA) {
      Alert.alert(t("common.holdOn"), t("createProduct.maxMediaReached", { max: MAX_MEDIA }));
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("common.holdOn"), t("createProduct.permissionRequired"));
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

  /* Create */
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
        toValue: 1, useNativeDriver: true, tension: 60, friction: 6,
      }).start();
    } catch (error) {
      const errors = error.response?.data?.errors;
      if (errors) Alert.alert(t("common.error"), Object.values(errors).flat().join("\n"));
      else Alert.alert(
        t("common.error"),
        error.response?.data?.message || error.message || t("common.somethingWentWrong")
      );
    } finally {
      setLoading(false);
    }
  };

  /* Reset */
  const resetForm = () => {
    setName(""); setPrice(""); setCity("");
    setLatitude(null); setLongitude(null);
    setLocationAddress(""); setLocationError("");
    setCondition(""); setDescription(""); setCategoryId(null);
    setMedia([]); setStep(0); setSuccess(false);
    initialPinRef.current = null;
    successScale.setValue(0);
    progressAnim.setValue(1 / STEPS.length);
    slideX.setValue(0);
  };

  const enterStyle = (index) => {
    const a = entranceAnims[index] || new Animated.Value(1);
    return {
      opacity: a,
      transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
    };
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  /* ============================================================ */
  /* Step renderers                                                */
  /* ============================================================ */
  const renderMediaStep = () => (
    <>
      <Animated.View
        style={[
          styles.dropZone,
          { borderColor: T.primaryBorder, backgroundColor: T.primarySoft },
          enterStyle(0),
        ]}
      >
        <TouchableOpacity style={styles.dropZoneInner} onPress={pickMedia} activeOpacity={0.85}>
          <View style={[styles.dropZoneIcon, { backgroundColor: T.primary, shadowColor: T.shadow }]}>
            <ImagePlus size={26} color={WHITE} strokeWidth={2.2} />
          </View>
          <Text style={[styles.dropZoneTitle, { color: T.text }]}>
            {media.length === 0 ? t("createProduct.addPhotos") : t("createProduct.addMore")}
          </Text>
          <Text style={[styles.dropZoneHint, { color: T.textMuted }]}>
            {t("createProduct.slotsLeft", { count: MAX_MEDIA - media.length })}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {media.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaPreview}
          contentContainerStyle={{ paddingTop: 12 }}
        >
          {media.map((item, index) => (
            <Animated.View
              key={`${item.uri}-${index}`}
              style={[
                styles.mediaItem,
                {
                  backgroundColor: T.field,
                  opacity: entranceAnims[Math.min(index + 1, 7)] || 1,
                },
              ]}
            >
              {item.type === "video" ? (
                <View style={[styles.videoPreview, { backgroundColor: "#0F172A" }]}>
                  <Camera size={22} color={WHITE} />
                  <Text style={styles.videoText}>Video</Text>
                </View>
              ) : (
                <Image source={{ uri: item.uri }} style={styles.previewImage} />
              )}

              {index === 0 && (
                <View style={[styles.coverBadge, { backgroundColor: T.primary }]}>
                  <Text style={styles.coverBadgeText}>{t("createProduct.cover")}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: "#0F172A" }]}
                onPress={() => removeMedia(index)}
                hitSlop={6}
              >
                <X size={14} color={WHITE} strokeWidth={3} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      <Animated.View style={[styles.tipCard, { backgroundColor: T.primarySoft }, enterStyle(6)]}>
        <Sparkles size={16} color={T.primary} strokeWidth={2.2} />
        <Text style={[styles.tipText, { color: T.primary }]}>{t("createProduct.photoTip")}</Text>
      </Animated.View>
    </>
  );

  const renderDetailsStep = () => (
    <>
      <Animated.View style={enterStyle(0)}>
        <Text style={[styles.label, { color: T.textMuted }]}>
          {t("createProduct.productName")}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: T.field, borderColor: T.border, color: T.text }]}
          placeholder={t("createProduct.productNamePlaceholder")}
          placeholderTextColor={T.textInactive}
          value={name}
          onChangeText={setName}
        />
      </Animated.View>

      <Animated.View style={enterStyle(1)}>
        <Text style={[styles.label, { color: T.textMuted }]}>{t("createProduct.price")}</Text>
        <View style={styles.priceRow}>
          <View style={[styles.currencyBadge, { backgroundColor: T.primary }]}>
            <Text style={styles.currencyText}>{t("common.currency")}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.priceInput, { backgroundColor: T.field, borderColor: T.border, color: T.text }]}
            placeholder="0"
            placeholderTextColor={T.textInactive}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>
      </Animated.View>

      <Animated.View style={enterStyle(2)}>
        <Text style={[styles.label, { color: T.textMuted }]}>{t("createProduct.category")}</Text>
        {loadingCategories ? (
          <View style={styles.loadingCategory}>
            <ActivityIndicator color={T.primary} />
            <Text style={[styles.loadingText, { color: T.textMuted }]}>
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
                      backgroundColor: selected ? T.primary : T.field,
                      borderColor: selected ? T.primary : T.border,
                    },
                  ]}
                  onPress={() => setCategoryId(category.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: selected ? WHITE : T.text }]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Animated.View>

      <Animated.View style={enterStyle(3)}>
        <Text style={[styles.label, { color: T.textMuted }]}>{t("createProduct.description")}</Text>
        <TextInput
          style={[styles.input, styles.textarea, { backgroundColor: T.field, borderColor: T.border, color: T.text }]}
          placeholder={t("createProduct.descPlaceholder")}
          placeholderTextColor={T.textInactive}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />
      </Animated.View>
    </>
  );

  const renderLocationStep = () => {
    const hasLocation = latitude !== null && longitude !== null;
    if (!initialPinRef.current) {
      initialPinRef.current = hasLocation ? { latitude, longitude } : null;
    }
    const html = buildPickableMapHtml({ pin: initialPinRef.current, palette: T });

    return (
      <>
        <Animated.View style={enterStyle(0)}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: T.textMuted }]}>{t("createProduct.city")}</Text>
            {city.trim() !== "" && (
              <View style={[styles.detectedBadge, { backgroundColor: T.primarySoft }]}>
                <Text style={[styles.detectedBadgeText, { color: T.primary }]}>
                  {t("createProduct.autoFilled")}
                </Text>
              </View>
            )}
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: T.field, borderColor: T.border, color: T.text }]}
            placeholder={t("createProduct.cityPlaceholder")}
            placeholderTextColor={T.textInactive}
            value={city}
            onChangeText={setCity}
          />
        </Animated.View>

        {/* Map header */}
        <Animated.View style={[styles.mapHeader, enterStyle(1)]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mapTitle, { color: T.text }]}>{t("createProduct.dropPin")}</Text>
            <Text style={[styles.mapSubtitle, { color: T.textMuted }]}>
              {t("createProduct.dropPinSub")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.gpsButton, { backgroundColor: T.primary, shadowColor: T.shadow }]}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
            activeOpacity={0.85}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <LocateFixed size={18} color={WHITE} strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Map */}
        <Animated.View
          style={[
            styles.mapContainer,
            { borderColor: T.border, backgroundColor: T.mapBg, shadowColor: T.shadow },
            enterStyle(2),
          ]}
        >
          <WebView
            ref={webRef}
            style={[styles.map, { backgroundColor: T.mapBg }]}
            originWhitelist={["*"]}
            source={{ html, baseUrl: "https://localhost" }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.mapLoading, { backgroundColor: T.mapBg }]}>
                <ActivityIndicator color={T.primary} />
              </View>
            )}
            androidLayerType="hardware"
            setSupportMultipleWindows={false}
            scrollEnabled={false}
            overScrollMode="never"
            bounces={false}
          />

          {/* Hint / dragging badge */}
          <View
            style={[
              styles.mapHint,
              {
                backgroundColor: T.surface,
                borderColor: T.border,
                shadowColor: T.shadow,
              },
            ]}
            pointerEvents="none"
          >
            {mapBrowsing ? (
              <Move size={13} color={T.primary} strokeWidth={2.4} />
            ) : (
              <Hand size={13} color={T.primary} strokeWidth={2.4} />
            )}
            <Text style={[styles.mapHintText, { color: T.text }]} numberOfLines={1}>
              {mapBrowsing ? t("createProduct.browsingMap") : t("createProduct.holdToBrowse")}
            </Text>
          </View>

          {/* Zoom stack */}
          <View style={styles.zoomStack}>
            <TouchableOpacity
              style={[styles.zoomBtn, { backgroundColor: T.surface, borderColor: T.border, shadowColor: T.shadow }]}
              onPress={zoomIn}
              activeOpacity={0.85}
            >
              <Plus size={18} color={T.text} strokeWidth={2.6} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.zoomBtn, { marginTop: 8, backgroundColor: T.surface, borderColor: T.border, shadowColor: T.shadow }]}
              onPress={zoomOut}
              activeOpacity={0.85}
            >
              <Minus size={18} color={T.text} strokeWidth={2.6} />
            </TouchableOpacity>
          </View>

          {/* Recenter — recenters on the placed pin */}
          <TouchableOpacity
            style={[styles.mapCurrentButton, { backgroundColor: T.surface, borderColor: T.border, shadowColor: T.shadow }]}
            onPress={recenter}
            activeOpacity={0.85}
          >
            <Navigation size={17} color={T.primary} strokeWidth={2.4} />
          </TouchableOpacity>
        </Animated.View>

        {/* Selected / empty location */}
        {hasLocation ? (
          <Animated.View
            style={[styles.selectedLocationCard, { backgroundColor: T.surface, borderColor: T.primaryBorder }, enterStyle(3)]}
          >
            <View style={[styles.selectedLocationIcon, { backgroundColor: T.primary }]}>
              <MapPin size={18} color={WHITE} strokeWidth={2.4} />
            </View>
            <View style={styles.selectedLocationContent}>
              <Text style={[styles.selectedLocationTitle, { color: T.text }]}>
                {t("createProduct.pinPlaced")}
              </Text>
              <Text style={[styles.selectedLocationAddress, { color: T.textMuted }]} numberOfLines={2}>
                {locationAddress || city || "Selected location"}
              </Text>
              <Text style={[styles.coordinates, { color: T.textInactive }]}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.refreshLocationButton, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
              hitSlop={6}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color={T.primary} />
              ) : (
                <RefreshCw size={16} color={T.primary} strokeWidth={2.4} />
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            style={[styles.locationEmptyCard, { backgroundColor: T.surface, borderColor: T.border }, enterStyle(3)]}
          >
            <View style={[styles.emptyLocationIcon, { backgroundColor: T.field }]}>
              <MapPin size={18} color={T.textInactive} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyLocationTitle, { color: T.text }]}>
                {t("createProduct.noLocationYet")}
              </Text>
              <Text style={[styles.emptyLocationText, { color: T.textMuted }]}>
                {t("createProduct.tapMapToPlace")}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Error */}
        {locationError !== "" && (
          <Animated.View
            style={[styles.locationWarning, { backgroundColor: T.warningBg, borderColor: T.warningBorder }, enterStyle(4)]}
          >
            <Text style={[styles.locationWarningIcon, { color: T.warningText }]}>⚠</Text>
            <Text style={[styles.locationWarningText, { color: T.warningText }]}>{locationError}</Text>
          </Animated.View>
        )}

        {/* Condition */}
        <Animated.View style={enterStyle(5)}>
          <Text style={[styles.label, { color: T.textMuted }]}>{t("createProduct.condition")}</Text>
          <View style={styles.conditionRow}>
            {CONDITIONS.map(({ value, labelKey, Icon }) => {
              const selected = condition === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.conditionCard,
                    {
                      backgroundColor: selected ? T.primary : T.surface,
                      borderColor: selected ? T.primary : T.border,
                    },
                  ]}
                  onPress={() => setCondition(value)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.conditionIconWrap,
                      {
                        backgroundColor: selected ? "rgba(255,255,255,0.22)" : T.primarySoft,
                      },
                    ]}
                  >
                    <Icon size={18} color={selected ? WHITE : T.primary} strokeWidth={2.3} />
                  </View>
                  <Text style={[styles.conditionText, { color: selected ? WHITE : T.text }]}>
                    {t(labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.mapInfoCard, { backgroundColor: T.primarySoft, borderColor: T.primaryBorder }, enterStyle(6)]}
        >
          <Shield size={16} color={T.primary} strokeWidth={2.4} />
          <Text style={[styles.mapInfoText, { color: T.primary }]}>
            {t("createProduct.locationPrivacy")}
          </Text>
        </Animated.View>
      </>
    );
  };

  const renderReviewStep = () => (
    <>
      <Animated.View
        style={[
          styles.reviewCard,
          { backgroundColor: T.surface, borderColor: T.border, shadowColor: T.shadow },
          enterStyle(0),
        ]}
      >
        {media[0] && media[0].type !== "video" && (
          <Image source={{ uri: media[0].uri }} style={styles.reviewImage} />
        )}
        {media[0] && media[0].type === "video" && (
          <View style={[styles.reviewVideo, { backgroundColor: "#0F172A" }]}>
            <Camera size={28} color={WHITE} />
          </View>
        )}

        <View style={styles.reviewBody}>
          <Text style={[styles.reviewName, { color: T.text }]}>
            {name.trim() || t("createProduct.unnamedProduct")}
          </Text>
          <Text style={[styles.reviewPrice, { color: T.primary }]}>
            {Number(price) || 0} {t("common.currency")}
          </Text>

          <View style={styles.reviewMetaRow}>
            {selectedCategory && (
              <View style={[styles.metaTag, { backgroundColor: T.primarySoft }]}>
                <Text style={[styles.metaTagText, { color: T.primary }]}>{selectedCategory.name}</Text>
              </View>
            )}
            {condition !== "" && (
              <View style={[styles.metaTag, { backgroundColor: T.primarySoft }]}>
                <Text style={[styles.metaTagText, { color: T.primary }]}>
                  {t(CONDITIONS.find((c) => c.value === condition)?.labelKey || "createProduct.condition")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.reviewRow, { backgroundColor: T.surface, borderColor: T.border }, enterStyle(1)]}>
        <View style={styles.reviewLeft}>
          <MapPin size={14} color={T.textMuted} />
          <Text style={[styles.reviewLabel, { color: T.textMuted }]}>
            {t("createProduct.city").replace(" *", "")}
          </Text>
        </View>
        <Text style={[styles.reviewValue, { color: T.text }]}>{city.trim() || "—"}</Text>
      </Animated.View>

      <Animated.View style={[styles.reviewRow, { backgroundColor: T.surface, borderColor: T.border }, enterStyle(2)]}>
        <View style={styles.reviewLeft}>
          <Navigation size={14} color={T.textMuted} />
          <Text style={[styles.reviewLabel, { color: T.textMuted }]}>
            {t("createProduct.coordinates")}
          </Text>
        </View>
        <Text style={[styles.reviewValue, { color: T.text }]} numberOfLines={1}>
          {latitude !== null && longitude !== null
            ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            : "—"}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.reviewRow, { backgroundColor: T.surface, borderColor: T.border }, enterStyle(3)]}>
        <View style={styles.reviewLeft}>
          <Camera size={14} color={T.textMuted} />
          <Text style={[styles.reviewLabel, { color: T.textMuted }]}>{t("createProduct.media")}</Text>
        </View>
        <Text style={[styles.reviewValue, { color: T.text }]}>
          {media.length}{" "}
          {media.length === 1
            ? t("createProduct.mediaCount", { count: 1 })
            : t("createProduct.mediaCount_plural", { count: media.length })}
        </Text>
      </Animated.View>

      {description.trim() !== "" && (
        <Animated.View style={[styles.reviewRow, { backgroundColor: T.surface, borderColor: T.border }, enterStyle(4)]}>
          <View style={styles.reviewLeft}>
            <FileText size={14} color={T.textMuted} />
            <Text style={[styles.reviewLabel, { color: T.textMuted }]}>
              {t("createProduct.description")}
            </Text>
          </View>
          <Text style={[styles.reviewValue, { color: T.text }]} numberOfLines={3}>
            {description.trim()}
          </Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.publishNote, { backgroundColor: T.primarySoft }, enterStyle(5)]}>
        <Rocket size={16} color={T.primary} strokeWidth={2.4} />
        <Text style={[styles.publishNoteText, { color: T.primary }]}>
          {t("createProduct.publishNote")}
        </Text>
      </Animated.View>
    </>
  );

  const stepRenderers = [renderMediaStep, renderDetailsStep, renderLocationStep, renderReviewStep];

  /* Success */
  if (success) {
    return (
      <View style={[styles.successContainer, { backgroundColor: T.bg }]}>
        <Animated.View
          style={[
            styles.successCircle,
            { backgroundColor: T.primary, borderColor: T.primary, shadowColor: T.shadow },
            { transform: [{ scale: successScale }] },
          ]}
        >
          <Check size={44} color={WHITE} strokeWidth={3} />
        </Animated.View>
        <Text style={[styles.successTitle, { color: T.text }]}>
          {t("createProduct.successTitle")}
        </Text>
        <Text style={[styles.successSubtitle, { color: T.textMuted }]}>
          {t("createProduct.successSub")}
        </Text>

        <View style={styles.successActions}>
          <TouchableOpacity
            style={[styles.successPrimary, { backgroundColor: T.primary, shadowColor: T.shadow }]}
            onPress={resetForm}
            activeOpacity={0.9}
          >
            <Plus size={18} color={WHITE} strokeWidth={2.8} />
            <Text style={styles.successPrimaryText}>{t("createProduct.createAnother")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.successSecondary, { backgroundColor: T.surface, borderColor: T.border }]}
            onPress={() => navigation.navigate("Products")}
            activeOpacity={0.9}
          >
            <Text style={[styles.successSecondaryText, { color: T.text }]}>
              {t("createProduct.viewProduct")}
            </Text>
            <ArrowRight size={16} color={T.text} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ============================================================ */
  /* Main                                                          */
  /* ============================================================ */
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: T.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: T.bg }]}>
        {/* Header — clean step indicator */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={[
              styles.backButton,
              { backgroundColor: T.surface, borderColor: T.border, shadowColor: T.shadow },
            ]}
            hitSlop={12}
            activeOpacity={0.85}
          >
            {step === 0 ? (
              <X size={18} color={T.text} strokeWidth={2.6} />
            ) : (
              <ChevronLeft size={18} color={T.text} strokeWidth={2.6} />
            )}
          </TouchableOpacity>

          {/* Segmented steps */}
          <View style={styles.segmentRow}>
            {STEPS.map((s, i) => (
              <View
                key={s.key}
                style={[
                  styles.segment,
                  {
                    backgroundColor: i <= step ? T.primary : T.field,
                    flex: i === step ? 2 : 1,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Titles */}
        <Animated.View
          style={[
            styles.titles,
            {
              opacity: titleFade,
              transform: [
                {
                  translateY: titleFade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.title, { color: T.text }]}>{t(STEPS[step].titleKey)}</Text>
          <Text style={[styles.subtitle, { color: T.textMuted }]}>
            {t(STEPS[step].subtitleKey)}
          </Text>
        </Animated.View>

        {/* Content */}
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

        {/* Footer — single primary CTA with optional back link */}
        <View style={[styles.footer, { backgroundColor: T.surface, borderTopColor: T.border }]}>
          {step > 0 && (
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => goToStep(step - 1)}
              activeOpacity={0.7}
            >
              <ChevronLeft size={16} color={T.textMuted} strokeWidth={2.4} />
              <Text style={[styles.backLinkText, { color: T.textMuted }]}>
                {t("common.back")}
              </Text>
            </TouchableOpacity>
          )}

          {step < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                { backgroundColor: T.primary, shadowColor: T.shadow },
                step === 0 && { flex: 1 },
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
                { backgroundColor: T.primary, shadowColor: T.shadow },
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
                  <Text style={styles.publishText}>{t("createProduct.publishNow")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ============================================================ */
/* Styles — structural only, colors come from T                  */
/* ============================================================ */
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },

  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---------- HEADER ---------- */
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
  segmentRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  segment: {
    height: 6,
    borderRadius: 3,
  },

  titles: { paddingHorizontal: 20, marginTop: 24, marginBottom: 18 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { marginTop: 4, fontSize: 14, fontWeight: "500" },

  content: { paddingHorizontal: 20, paddingBottom: 30 },

  /* ---------- INPUTS ---------- */
  label: {
    fontSize: 11.5,
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

  /* ---------- MEDIA ---------- */
  dropZone: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  dropZoneInner: { alignItems: "center", paddingVertical: 38 },
  dropZoneIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dropZoneTitle: { fontSize: 16, fontWeight: "800" },
  dropZoneHint: { fontSize: 13, marginTop: 4, fontWeight: "500" },

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
  tipText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },

  /* ---------- DETAILS ---------- */
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

  /* ---------- LOCATION ---------- */
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
  mapSubtitle: { fontSize: 12, marginTop: 3, fontWeight: "500" },

  gpsButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  mapContainer: {
    height: 340,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1.5,
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    position: "relative",
  },
  map: { width: "100%", height: "100%" },

  mapHint: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    maxWidth: 180,
  },
  mapHintText: { fontSize: 11, fontWeight: "800" },

  zoomStack: { position: "absolute", top: 14, right: 14 },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  mapCurrentButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  /* ---------- SELECTED / EMPTY LOCATION ---------- */
  selectedLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 13,
    marginBottom: 18,
  },
  selectedLocationIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  selectedLocationContent: { flex: 1 },
  selectedLocationTitle: { fontSize: 14, fontWeight: "900" },
  selectedLocationAddress: { fontSize: 12, marginTop: 3, fontWeight: "500" },
  coordinates: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  refreshLocationButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  locationEmptyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  emptyLocationIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emptyLocationTitle: { fontSize: 14, fontWeight: "800" },
  emptyLocationText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
    fontWeight: "500",
  },

  /* ---------- WARNING ---------- */
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
  locationWarningText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },

  /* ---------- INFO ---------- */
  mapInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 13,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1.5,
  },
  mapInfoText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },

  /* ---------- CONDITION ---------- */
  conditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  conditionCard: {
    width: (width - 60) / 2,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
  },
  conditionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  conditionText: { fontSize: 13, fontWeight: "800" },

  /* ---------- REVIEW ---------- */
  reviewCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1.5,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  reviewMetaRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  metaTag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  metaTagText: { fontSize: 12, fontWeight: "800" },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  reviewLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewLabel: { fontSize: 13, fontWeight: "600" },
  reviewValue: { fontSize: 14, fontWeight: "800", flex: 1, textAlign: "right" },
  publishNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  publishNoteText: { flex: 1, fontSize: 13, fontWeight: "700" },

  /* ---------- FOOTER ---------- */
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
    height: 56,
  },
  backLinkText: { fontSize: 14, fontWeight: "700" },
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
  nextText: { color: WHITE, fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
  publishText: { color: WHITE, fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
  disabled: { opacity: 0.6 },

  /* ---------- SUCCESS ---------- */
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
    fontWeight: "500",
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