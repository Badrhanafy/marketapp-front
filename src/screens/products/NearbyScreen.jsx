// screens/nearby/NearbyScreen.js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Tag,
  ChevronRight,
  Heart,
  Eye,
  Settings as SettingsIcon,
  MapPinned,
} from "lucide-react-native";

import api from "../../api/client";
import useUserLocation from "../../hooks/useUserLocation";
import { useTheme } from "../../context/ThemeContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const DEFAULT_RADIUS = 20;

// Numeric radii + the special "100+" sentinel meaning "over 100 km"
const OVER_100 = "100+";
const RADIUS_OPTIONS = [5, 10, 20, 50, 100, OVER_100];

const isOver100 = (r) => r === OVER_100;
const numericRadius = (r) => (isOver100(r) ? 100 : Number(r) || DEFAULT_RADIUS);

// Bottom sheet snap points (fractions of screen height)
const SNAP_COLLAPSED = 0.30;
const SNAP_MID = 0.55;
const SNAP_EXPANDED = 0.85;
const SNAPS = [SNAP_COLLAPSED, SNAP_MID, SNAP_EXPANDED];

// Top map drag constraints
const MAP_MIN_HEIGHT = SCREEN_HEIGHT * 0.20;
const MAP_MAX_HEIGHT = SCREEN_HEIGHT * 0.65;

// ============================================================
// HELPERS
// ============================================================

const resolveMediaUrl = (media) => {
  if (!media) return null;
  const raw = media.path;
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const base = api?.defaults?.baseURL?.replace(/\/api\/?$/, "") || "";
  const cleaned = String(raw).replace(/^\/?storage\//, "");
  return `${base}/storage/${cleaned}`;
};

const getProductImage = (product) => resolveMediaUrl(product?.media?.[0]);

const getProductCoordinates = (product) => {
  const lat = Number(product?.latitude);
  const lng = Number(product?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
};

const extractProductArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.products?.data)) return payload.products.data;
  return [];
};

const coordKey = (loc) =>
  loc ? `${loc.latitude.toFixed(5)},${loc.longitude.toFixed(5)}` : "";

// Format the radius for UI (returns e.g. "20" or "100+")
const formatRadius = (r) => (isOver100(r) ? "100+" : String(r));

// ============================================================
// LEAFLET HTML — theme-aware
// ============================================================

const buildLeafletHtml = ({ user, products, radius, selectedId, theme }) => {
  const safeUser = user
    ? { latitude: user.latitude, longitude: user.longitude }
    : null;

  const safeProducts = products.map((p) => ({
    id: p.id,
    name: p.name || "",
    price: p.price ?? null,
    lat: Number(p.latitude),
    lng: Number(p.longitude),
    city: p.city || p.user?.city || "",
  }));

  const drawRadiusCircle = !isOver100(radius);
  const radiusKm = numericRadius(radius);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-container { background: ${theme.mapBg}; font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; }
    .user-dot { width: 22px; height: 22px; border-radius: 50%; background: rgba(37,99,235,0.25); border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .user-dot-inner { width: 12px; height: 12px; border-radius: 50%; background: #2563EB; border: 2px solid #fff; }
    .pin { width: 30px; height: 30px; border-radius: 50%; background: ${theme.mapPinColor}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; border: 2px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.28); transition: transform .15s ease, background .15s ease; }
    .pin.selected { background: ${theme.mapPinSelected}; transform: scale(1.18); }
    .leaflet-popup-content { margin: 6px 10px; font-size: 12px; font-weight: 700; color: ${theme.popupText}; white-space: nowrap; }
    .popup-price { color: ${theme.mapPinColor}; font-weight: 800; }
    .leaflet-popup-content-wrapper { border-radius: 10px; background: ${theme.popupBg}; box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
    .leaflet-popup-tip { background: ${theme.popupBg}; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var user = ${JSON.stringify(safeUser)};
      var products = ${JSON.stringify(safeProducts)};
      var radiusKm = ${radiusKm};
      var drawRadiusCircle = ${drawRadiusCircle};
      var selectedId = ${selectedId ?? "null"};

      var map = L.map('map', { zoomControl: false, attributionControl: true, preferCanvas: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

      var bounds = [];

      if (user && isFinite(user.latitude) && isFinite(user.longitude)) {
        if (drawRadiusCircle) {
          L.circle([user.latitude, user.longitude], { radius: radiusKm * 1000, color: '${theme.radiusCircle}', weight: 1.5, fillColor: '${theme.radiusCircleFill}', fillOpacity: 1 }).addTo(map);
        }
        var userIcon = L.divIcon({ className: '', html: '<div class="user-dot"><div class="user-dot-inner"></div></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
        L.marker([user.latitude, user.longitude], { icon: userIcon, interactive: false }).addTo(map);
        bounds.push([user.latitude, user.longitude]);
      }

      products.forEach(function (p) {
        if (!isFinite(p.lat) || !isFinite(p.lng)) return;
        bounds.push([p.lat, p.lng]);
        var isSelected = p.id === selectedId;
        var label = typeof p.price === 'number' && p.price > 0 ? String(Math.round(p.price)) : '•';
        var icon = L.divIcon({ className: '', html: '<div class="pin ' + (isSelected ? 'selected' : '') + '">' + label + '</div>', iconSize: [30, 30], iconAnchor: [15, 30] });
        var marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
        var popupHtml = '<div>' + (p.name || 'Product') + (p.price ? ' · <span class="popup-price">' + p.price + ' DH</span>' : '') + '</div>';
        marker.bindPopup(popupHtml);
        marker.on('click', function () {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pinClick', id: p.id }));
        });
      });

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      else if (bounds.length === 1) map.setView(bounds[0], 13);
      else map.setView([31.7917, -7.0926], 6);

      setTimeout(function () {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      }, 100);

      window.__recenterOnUser = function () { if (user) map.flyTo([user.latitude, user.longitude], 13, { duration: 0.6 }); };
      window.__fitAll = function () {
        if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        else if (bounds.length === 1) map.setView(bounds[0], 13);
      };
      window.__invalidateSize = function () { setTimeout(function () { map.invalidateSize(); }, 50); };
    })();
  </script>
</body>
</html>`;
};

// ============================================================
// SCREEN
// ============================================================

const NearbyScreen = ({ navigation }) => {
  const webRef = useRef(null);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  /*
  |--------------------------------------------------------------------------
  | Theme bundle
  |--------------------------------------------------------------------------
  */
  const theme = useMemo(
    () => ({
      pageBg: colors.background,
      surface: colors.surface,
      surfaceAlt: colors.surfaceSecondary,
      cardBg: colors.surface,

      titleText: colors.text,
      bodyText: colors.textSecondary,
      mutedText: colors.inactive,

      border: colors.border,
      borderSoft: isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9",

      primary: colors.primary,
      icon: colors.icon,

      greenSoft: isDark ? "rgba(34,197,94,0.14)" : "#DCFCE7",
      greenTint: isDark ? "rgba(34,197,94,0.10)" : "#F0FDF4",
      greenBorder: isDark ? "rgba(34,197,94,0.28)" : "#DCFCE7",

      mapBg: isDark ? "#0F172A" : "#E5E7EB",
      mapPinColor: colors.primary,
      mapPinSelected: isDark ? "#22C55E" : "#0F7C36",
      radiusCircle: isDark
        ? "rgba(34,197,94,0.55)"
        : "rgba(22,163,74,0.55)",
      radiusCircleFill: isDark
        ? "rgba(34,197,94,0.10)"
        : "rgba(22,163,74,0.10)",
      popupBg: isDark ? colors.surface : "#FFFFFF",
      popupText: colors.text,

      distanceBg: isDark ? "rgba(34,197,94,0.20)" : "#DCFCE7",
      iconCircleBg: isDark ? "rgba(34,197,94,0.16)" : "#DCFCE7",
      shadow: isDark ? "#000000" : "#0F172A",
    }),
    [colors, isDark]
  );

  const {
    location,
    loading: loadingLocation,
    refreshing,
    error: locationError,
    permission,
    servicesOn,
    refresh: refreshLocation,
    openSettings,
  } = useUserLocation();

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [mapReady, setMapReady] = useState(false);

  const locationKey = coordKey(location);

  // -------- MAP HEIGHT (top draggable handle) --------
  const mapHeight = useSharedValue(SCREEN_HEIGHT * 0.35);
  const startMapHeight = useSharedValue(0);

  // -------- BOTTOM SHEET (bottom draggable handle) --------
  const sheetHeight = useSharedValue(SCREEN_HEIGHT * SNAP_MID);
  const startSheetHeight = useSharedValue(0);

  const notifyMapResize = useCallback(() => {
    webRef.current?.injectJavaScript(
      "window.__invalidateSize && window.__invalidateSize(); true;"
    );
  }, []);

  const onMapResizeEnd = useCallback(() => {
    notifyMapResize();
  }, [notifyMapResize]);

  const mapPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startMapHeight.value = mapHeight.value;
        })
        .onUpdate((e) => {
          const next = Math.min(
            MAP_MAX_HEIGHT,
            Math.max(MAP_MIN_HEIGHT, startMapHeight.value + e.translationY)
          );
          mapHeight.value = next;
        })
        .onEnd(() => {
          const stops = [
            SCREEN_HEIGHT * 0.22,
            SCREEN_HEIGHT * 0.35,
            SCREEN_HEIGHT * 0.5,
          ];
          let closest = stops[0];
          let best = Infinity;
          for (const s of stops) {
            const d = Math.abs(mapHeight.value - s);
            if (d < best) {
              best = d;
              closest = s;
            }
          }
          mapHeight.value = withSpring(closest, {
            damping: 20,
            stiffness: 180,
          });
          runOnJS(onMapResizeEnd)();
        }),
    [mapHeight, startMapHeight, onMapResizeEnd]
  );

  const sheetPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startSheetHeight.value = sheetHeight.value;
        })
        .onUpdate((e) => {
          const min = SCREEN_HEIGHT * SNAP_COLLAPSED;
          const max = SCREEN_HEIGHT * SNAP_EXPANDED;
          const next = Math.min(
            max,
            Math.max(min, startSheetHeight.value - e.translationY)
          );
          sheetHeight.value = next;
        })
        .onEnd((e) => {
          const velocity = e.velocityY;
          let target;
          if (velocity < -500) {
            const candidates = SNAPS.filter(
              (s) => s * SCREEN_HEIGHT > sheetHeight.value + 10
            );
            target = (candidates[0] ?? SNAP_EXPANDED) * SCREEN_HEIGHT;
          } else if (velocity > 500) {
            const candidates = SNAPS.filter(
              (s) => s * SCREEN_HEIGHT < sheetHeight.value - 10
            ).reverse();
            target = (candidates[0] ?? SNAP_COLLAPSED) * SCREEN_HEIGHT;
          } else {
            let closest = SNAP_MID * SCREEN_HEIGHT;
            let best = Infinity;
            for (const s of SNAPS) {
              const d = Math.abs(sheetHeight.value - s * SCREEN_HEIGHT);
              if (d < best) {
                best = d;
                closest = s * SCREEN_HEIGHT;
              }
            }
            target = closest;
          }
          sheetHeight.value = withSpring(target, {
            damping: 22,
            stiffness: 200,
          });
        }),
    [sheetHeight, startSheetHeight]
  );

  const mapWrapperStyle = useAnimatedStyle(() => ({
    height: mapHeight.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  // =========================================================
  // FETCH PRODUCTS
  // =========================================================
  const requestToken = useRef(0);

  const getNearbyProducts = useCallback(async () => {
    if (!location) return;
    const token = ++requestToken.current;
    const over100 = isOver100(radius);
    try {
      setLoadingProducts(true);

      // For "100+" we ask the backend for products with a minimum radius.
      // If the backend does not support `min_radius`, we still pass `radius: 100`
      // so it returns a large candidate set, then filter client-side below.
      const params = {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: numericRadius(radius),
      };
      if (over100) {
        params.min_radius = numericRadius(radius);
      }

      const response = await api.get("/products/nearby", { params });
      if (token !== requestToken.current) return;

      let list = extractProductArray(response.data);

      // Client-side safety net: if the backend ignored `min_radius`,
      // keep only products whose distance is > 100 km.
      if (over100) {
        list = list.filter((p) => {
          const d = Number(p.distance);
          return Number.isFinite(d) ? d > 100 : true; // keep if unknown
        });
      }

      setProducts(list);
    } catch (error) {
      if (token !== requestToken.current) return;
      console.log(
        "NEARBY PRODUCTS ERROR:",
        error?.response?.data || error.message
      );
      Alert.alert(t("nearby.title"), t("nearby.noProductsNearby"));
      setProducts([]);
    } finally {
      if (token === requestToken.current) setLoadingProducts(false);
    }
  }, [location, radius, t]);

  useEffect(() => {
    if (!location) return;
    const t = setTimeout(() => getNearbyProducts(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey, radius]);

  // =========================================================
  // LEAFLET HTML
  // =========================================================
  const mapProducts = useMemo(
    () => products.filter((p) => !!getProductCoordinates(p)),
    [products]
  );

  const leafletHtml = useMemo(
    () =>
      buildLeafletHtml({
        user: location,
        products: mapProducts,
        radius,
        selectedId: selectedProductId,
        theme,
      }),
    [locationKey, mapProducts, radius, selectedProductId, theme]
  );

  // =========================================================
  // WEBVIEW MESSAGES
  // =========================================================
  const onWebViewMessage = useCallback(
    (event) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg?.type === "ready") {
          setMapReady(true);
          return;
        }
        if (msg?.type === "pinClick" && msg.id != null) {
          setSelectedProductId(msg.id);
          const idx = products.findIndex((p) => p.id === msg.id);
          if (idx >= 0 && listRef.current?.scrollToIndex) {
            try {
              listRef.current.scrollToIndex({
                index: idx,
                animated: true,
                viewPosition: 0.5,
              });
            } catch (_) {}
          }
          sheetHeight.value = withSpring(SCREEN_HEIGHT * SNAP_MID, {
            damping: 22,
            stiffness: 200,
          });
        }
      } catch (_) {}
    },
    [products, sheetHeight]
  );

  // =========================================================
  // MAP CONTROLS
  // =========================================================
  const centerOnUser = useCallback(() => {
    if (!location) {
      refreshLocation();
      return;
    }
    webRef.current?.injectJavaScript(
      "window.__recenterOnUser && window.__recenterOnUser(); true;"
    );
  }, [location, refreshLocation]);

  const fitAllProducts = useCallback(() => {
    webRef.current?.injectJavaScript(
      "window.__fitAll && window.__fitAll(); true;"
    );
  }, []);

  // =========================================================
  // PRODUCT FOCUS / OPEN
  // =========================================================
  const focusProduct = useCallback(
    (product) => {
      setSelectedProductId(product.id);
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx >= 0 && listRef.current?.scrollToIndex) {
        try {
          listRef.current.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.5,
          });
        } catch (_) {}
      }
    },
    [products]
  );

  const openProduct = useCallback(
    (product) => {
      navigation.navigate("ProductDetails", { productId: product.id });
    },
    [navigation]
  );

  // =========================================================
  // RENDER CARD
  // =========================================================
  const renderProduct = ({ item }) => {
    const image = getProductImage(item);
    const distance = Number.isFinite(Number(item.distance))
      ? Number(item.distance).toFixed(1)
      : null;
    const isSelected = selectedProductId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => focusProduct(item)}
        style={[
          styles.productCard,
          {
            backgroundColor: isSelected ? theme.greenTint : theme.cardBg,
            borderColor: isSelected ? theme.primary : theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.productImageContainer,
            { backgroundColor: theme.surfaceAlt },
          ]}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Tag size={24} color={theme.mutedText} />
            </View>
          )}
          {distance && (
            <View
              style={[
                styles.distanceBadge,
                { backgroundColor: theme.distanceBg },
              ]}
            >
              <Navigation
                size={10}
                color={theme.primary}
                strokeWidth={2.5}
              />
              <Text
                style={[styles.distanceText, { color: theme.primary }]}
              >
                {distance} km
              </Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text
            numberOfLines={1}
            style={[styles.productName, { color: theme.titleText }]}
          >
            {item.name || t("createProduct.unnamedProduct")}
          </Text>
          <Text style={[styles.price, { color: theme.primary }]}>
            {item.price
              ? `${Number(item.price).toLocaleString()} ${t("common.currency")}`
              : `— ${t("common.currency")}`}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={12} color={theme.mutedText} />
              <Text
                numberOfLines={1}
                style={[styles.metaText, { color: theme.mutedText }]}
              >
                {item.city || item.user?.city || t("common.unknown")}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Heart size={12} color={theme.mutedText} />
              <Text
                style={[styles.metaText, { color: theme.mutedText }]}
              >
                {item.likes_count ?? 0}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Eye size={12} color={theme.mutedText} />
              <Text
                style={[styles.metaText, { color: theme.mutedText }]}
              >
                {item.views_count ?? 0}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => openProduct(item)}
          style={[
            styles.openButton,
            { backgroundColor: theme.greenTint },
          ]}
          hitSlop={8}
        >
          <ChevronRight size={20} color={theme.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // =========================================================
  // LOADING / BLOCKER
  // =========================================================
  if (loadingLocation && !location) {
    return (
      <GestureHandlerRootView
        style={[styles.root, { backgroundColor: theme.pageBg }]}
      >
        <View
          style={[styles.loadingScreen, { backgroundColor: theme.pageBg }]}
        >
          <View
            style={[
              styles.loadingIcon,
              { backgroundColor: theme.iconCircleBg },
            ]}
          >
            <LocateFixed size={30} color={theme.primary} />
          </View>
          <Text style={[styles.loadingTitle, { color: theme.titleText }]}>
            {t("nearby.findingLocation")}
          </Text>
          <Text
            style={[styles.loadingSubtitle, { color: theme.mutedText }]}
          >
            {t("nearby.findingLocationSub")}
          </Text>
          <ActivityIndicator
            size="small"
            color={theme.primary}
            style={{ marginTop: 20 }}
          />
        </View>
      </GestureHandlerRootView>
    );
  }

  const showBlocker =
    !location &&
    (permission === "denied" || servicesOn === false || !!locationError);

  if (showBlocker) {
    const reason = !servicesOn
      ? t("nearby.locationDisabled")
      : permission === "denied"
      ? t("nearby.permissionDenied")
      : locationError || t("nearby.gpsUnavailable");

    return (
      <GestureHandlerRootView
        style={[styles.root, { backgroundColor: theme.pageBg }]}
      >
        <View
          style={[styles.blockerScreen, { backgroundColor: theme.pageBg }]}
        >
          <View
            style={[
              styles.blockerIcon,
              { backgroundColor: theme.iconCircleBg },
            ]}
          >
            <MapPinned size={34} color={theme.primary} />
          </View>
          <Text style={[styles.blockerTitle, { color: theme.titleText }]}>
            {t("nearby.enableLocation")}
          </Text>
          <Text style={[styles.blockerText, { color: theme.mutedText }]}>
            {reason}
          </Text>
          <View style={styles.blockerButtons}>
            {(servicesOn === false || permission === "denied") && (
              <TouchableOpacity
                style={[
                  styles.blockerPrimary,
                  { backgroundColor: theme.primary },
                ]}
                onPress={openSettings}
              >
                <SettingsIcon size={16} color="#FFFFFF" />
                <Text style={styles.blockerPrimaryText}>
                  {t("nearby.openSettings")}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.blockerSecondary,
                {
                  backgroundColor: theme.greenTint,
                  borderColor: theme.greenBorder,
                },
              ]}
              onPress={refreshLocation}
            >
              <RefreshCw size={16} color={theme.primary} />
              <Text
                style={[
                  styles.blockerSecondaryText,
                  { color: theme.primary },
                ]}
              >
                {t("common.tryAgain")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================
  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: theme.pageBg }]}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: theme.pageBg, paddingTop: insets.top },
        ]}
      >
        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.surface,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View>
            <Text style={[styles.headerTitle, { color: theme.titleText }]}>
              {t("nearby.title")}
            </Text>
            <View style={styles.headerLocation}>
              <MapPin
                size={14}
                color={theme.primary}
                fill={theme.greenSoft}
              />
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: theme.mutedText },
                ]}
              >
                {location
                  ? t("nearby.productsOnMap", { count: mapProducts.length })
                  : t("nearby.locating")}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.iconButton,
                {
                  backgroundColor: theme.greenTint,
                  borderColor: theme.greenBorder,
                },
              ]}
              onPress={fitAllProducts}
              disabled={mapProducts.length === 0}
            >
              <Navigation size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.iconButton,
                {
                  backgroundColor: theme.greenTint,
                  borderColor: theme.greenBorder,
                },
              ]}
              onPress={refreshLocation}
            >
              {refreshing || loadingProducts ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <RefreshCw size={18} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* RADIUS PILLS */}
        <View
          style={[
            styles.radiusBar,
            {
              backgroundColor: theme.surface,
              borderBottomColor: theme.borderSoft,
            },
          ]}
        >
          <Text
            style={[styles.radiusBarLabel, { color: theme.mutedText }]}
          >
            {t("nearby.radius")}
          </Text>
          <View style={styles.radiusPills}>
            {RADIUS_OPTIONS.map((r) => {
              const active = r === radius;
              const label = `${formatRadius(r)} km`;
              return (
                <TouchableOpacity
                  key={String(r)}
                  onPress={() => setRadius(r)}
                  activeOpacity={0.8}
                  style={[
                    styles.radiusPill,
                    {
                      backgroundColor: active
                        ? theme.primary
                        : theme.surfaceAlt,
                      borderColor: active
                        ? theme.primary
                        : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.radiusPillText,
                      {
                        color: active ? "#FFFFFF" : theme.bodyText,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* MAP — resizable */}
        <Animated.View
          style={[
            styles.mapWrapper,
            { backgroundColor: theme.mapBg },
            mapWrapperStyle,
          ]}
        >
          {location ? (
            <WebView
              ref={webRef}
              style={[styles.map, { backgroundColor: theme.mapBg }]}
              originWhitelist={["*"]}
              source={{ html: leafletHtml, baseUrl: "https://localhost" }}
              onMessage={onWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View
                  style={[
                    styles.mapLoading,
                    { backgroundColor: theme.mapBg },
                  ]}
                >
                  <ActivityIndicator color={theme.primary} />
                </View>
              )}
              androidLayerType="hardware"
              setSupportMultipleWindows={false}
            />
          ) : (
            <View
              style={[
                styles.mapError,
                { backgroundColor: theme.surfaceAlt },
              ]}
            >
              <LocateFixed size={32} color={theme.mutedText} />
              <Text
                style={[styles.mapErrorText, { color: theme.mutedText }]}
              >
                {t("nearby.waitingLocation")}
              </Text>
              <TouchableOpacity
                onPress={refreshLocation}
                style={[
                  styles.mapErrorRetry,
                  { backgroundColor: theme.primary },
                ]}
              >
                <RefreshCw size={14} color="#FFFFFF" />
                <Text style={styles.mapErrorRetryText}>
                  {t("common.retry")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.mapControls}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.mapControl,
                {
                  backgroundColor: theme.surface,
                  shadowColor: theme.shadow,
                },
              ]}
              onPress={centerOnUser}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <LocateFixed size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.counterBadge,
              {
                backgroundColor: theme.surface,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <Search size={13} color={theme.primary} />
            <Text
              style={[styles.counterText, { color: theme.primary }]}
            >
              {t("nearby.nearbyCount", { count: mapProducts.length })}
            </Text>
          </View>

          {/* TOP drag handle — resize map vertically */}
          <GestureDetector gesture={mapPanGesture}>
            <Animated.View style={styles.topHandle} hitSlop={12}>
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: theme.surface },
                ]}
              />
            </Animated.View>
          </GestureDetector>
        </Animated.View>

        {/* BOTTOM SHEET — resizable */}
        <Animated.View
          style={[
            styles.bottomSheet,
            sheetStyle,
            {
              backgroundColor: theme.surface,
              shadowColor: theme.shadow,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* BOTTOM drag handle */}
          <GestureDetector gesture={sheetPanGesture}>
            <View style={styles.sheetHandleHitArea} hitSlop={12}>
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: theme.border },
                ]}
              />
            </View>
          </GestureDetector>

          <View style={styles.sheetHeader}>
            <View>
              <Text
                style={[styles.sheetTitle, { color: theme.titleText }]}
              >
                {t("nearby.productsNearYou")}
              </Text>
              <Text
                style={[styles.sheetSubtitle, { color: theme.mutedText }]}
              >
                {isOver100(radius)
                  ? `Over ${numericRadius(radius)} km away`
                  : t("nearby.withinRadius", { radius })}
              </Text>
            </View>
            <View
              style={[
                styles.radiusBadge,
                { backgroundColor: theme.greenTint },
              ]}
            >
              <Navigation size={12} color={theme.primary} />
              <Text
                style={[styles.radiusText, { color: theme.primary }]}
              >
                {formatRadius(radius)} km
              </Text>
            </View>
          </View>

          {loadingProducts ? (
            <View style={styles.productsLoading}>
              <ActivityIndicator color={theme.primary} size="small" />
              <Text
                style={[
                  styles.productsLoadingText,
                  { color: theme.mutedText },
                ]}
              >
                {t("nearby.searching")}
              </Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.iconCircleBg },
                ]}
              >
                <Search size={26} color={theme.primary} />
              </View>
              <Text
                style={[styles.emptyTitle, { color: theme.titleText }]}
              >
                {t("nearby.noProductsNearby")}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: theme.mutedText },
                ]}
              >
                {isOver100(radius)
                  ? `No products found over ${numericRadius(radius)} km away.`
                  : t("nearby.noProductsSub", { radius })}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.retryButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => {
                  // Skip the "100+" sentinel when expanding.
                  const numeric = RADIUS_OPTIONS.filter(
                    (r) => typeof r === "number"
                  );
                  const next =
                    numeric.find((r) => r > numericRadius(radius)) ??
                    OVER_100;
                  setRadius(next);
                }}
              >
                <Navigation size={15} color="#FFFFFF" />
                <Text style={styles.retryText}>
                  {t("nearby.expandRadius")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={products}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderProduct}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  listRef.current?.scrollToOffset({
                    offset: info.averageItemLength * info.index,
                    animated: true,
                  });
                }, 100);
              }}
            />
          )}
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
};

export default NearbyScreen;

// =========================================================
// STYLES  (structural only — colors come from the theme)
// =========================================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },

  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },
  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loadingTitle: { fontSize: 21, fontWeight: "800" },
  loadingSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },

  blockerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  blockerIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  blockerTitle: { fontSize: 22, fontWeight: "800" },
  blockerText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  blockerButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  blockerPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 13,
  },
  blockerPrimaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  blockerSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
  },
  blockerSecondaryText: { fontWeight: "800", fontSize: 13 },

  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 14 : 6,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: "800" },
  headerLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 5,
  },
  headerSubtitle: { fontSize: 12, fontWeight: "500" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  radiusBar: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
  },
  radiusBarLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  radiusPills: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  radiusPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  radiusPillText: { fontSize: 11, fontWeight: "700" },

  mapWrapper: {
    position: "relative",
    overflow: "hidden",
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mapErrorText: {
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  mapErrorRetry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  mapErrorRetryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  mapControls: { position: "absolute", right: 15, bottom: 18 },
  mapControl: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  counterBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    height: 34,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 17,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  counterText: { fontSize: 12, fontWeight: "700" },

  topHandle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  handleBar: {
    width: 46,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  sheetHandleHitArea: {
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 18, fontWeight: "800" },
  sheetSubtitle: { marginTop: 3, fontSize: 12 },
  radiusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  radiusText: { fontSize: 11, fontWeight: "700" },

  productsList: { paddingHorizontal: 14, paddingBottom: 25 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 17,
    padding: 9,
    marginBottom: 10,
  },
  productImageContainer: {
    width: 78,
    height: 78,
    borderRadius: 13,
    overflow: "hidden",
    position: "relative",
  },
  productImage: { width: "100%", height: "100%" },
  noImage: { flex: 1, alignItems: "center", justifyContent: "center" },
  distanceBadge: {
    position: "absolute",
    left: 5,
    bottom: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distanceText: { fontSize: 9, fontWeight: "800" },
  productInfo: { flex: 1, marginLeft: 11, marginRight: 6 },
  productName: { fontSize: 14, fontWeight: "800" },
  price: { fontSize: 15, fontWeight: "800", marginTop: 3 },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontWeight: "600" },
  openButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  productsLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 30,
  },
  productsLoadingText: { fontSize: 13, fontWeight: "600" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  retryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
});