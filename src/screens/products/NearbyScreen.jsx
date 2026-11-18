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
  Globe2,
} from "lucide-react-native";

import api from "../../api/client";
import useUserLocation from "../../hooks/useUserLocation";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

/* ──────────────────────────────────────────────────────────────
   THEME — mirrors HomeScreen blue system
   ────────────────────────────────────────────────────────────── */
const PRIMARY = "#2563EB";
const PRIMARY_DARK = "#1D4ED8";
const PRIMARY_DEEP = "#0A2E9E";
const SKY = "#38A3FF";
const BLUE_SOFT = "#EFF6FF";
const BLUE_TINT = "#DBEAFE";

const PAGE_BG = "#F3F6FD";
const WHITE = "#FFFFFF";

const INK = "#0B1B3A";
const MUTED = "#64748B";
const STRIKE = "#94A3B8";
const BORDER = "rgba(11, 27, 58, 0.08)";

const GREEN = "#22C55E";
const GREEN_SOFT = "#DCFCE7";

/* "far" accent (products > 100 km) */
const FAR = "#F59E0B";
const FAR_SOFT = "#FEF3C7";
const FAR_INK = "#92400E";

/* ──────────────────────────────────────────────────────────────
   RADIUS MODEL
   ────────────────────────────────────────────────────────────── */
const DEFAULT_RADIUS = 20;
const FAR_THRESHOLD_KM = 100; // products above this are "far"
const ALL_DISTANCES = "all"; // sentinel: unbounded search
const RADIUS_OPTIONS = [5, 10, 20, 50, 100, ALL_DISTANCES];

const isAllDistances = (r) => r === ALL_DISTANCES;

/** Numeric radius for backend filtering (0 = unbounded). */
const numericRadius = (r) =>
  isAllDistances(r) ? 0 : Number(r) || DEFAULT_RADIUS;

/** UI label. */
const formatRadius = (r) =>
  isAllDistances(r) ? "All" : String(r);

/** Backend query params for the current mode. */
const buildRequestParams = (loc, r) => {
  const params = {
    latitude: loc.latitude,
    longitude: loc.longitude,
  };
  if (!isAllDistances(r)) {
    params.radius = numericRadius(r);
  }
  // In "all" mode we intentionally omit `radius` so the backend
  // returns everything. If your API requires the param, use a
  // planet-sized value instead: params.radius = 100000;
  return params;
};

/** Shared near/far classification — used by BOTH map and cards. */
const getProductFlags = (product) => {
  const dist = Number(product?.distance);
  const hasDistance = Number.isFinite(dist);
  return {
    distanceKm: hasDistance ? dist : null,
    isFar: hasDistance && dist > FAR_THRESHOLD_KM,
  };
};

/* ──────────────────────────────────────────────────────────────
   LAYOUT
   ────────────────────────────────────────────────────────────── */
const MAP_MIN_HEIGHT = 150;
const MAP_MAX_HEIGHT = Dimensions.get("window").height * 0.55;

const SNAP_COLLAPSED = 0.30;
const SNAP_MID = 0.55;
const SNAP_EXPANDED = 0.85;
const SNAPS = [SNAP_COLLAPSED, SNAP_MID, SNAP_EXPANDED];

/* ──────────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────────── */
const resolveMediaUrl = (media) => {
  if (!media?.path) return null;
  const raw = media.path;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const base = api?.defaults?.baseURL?.replace(/\/api\/?$/, "") || "";
  const cleaned = String(raw).replace(/^\/?storage\//, "");
  return `${base}/storage/${cleaned}`;
};

const getProductImage = (p) => resolveMediaUrl(p?.media?.[0]);

const getProductCoordinates = (p) => {
  const lat = Number(p?.latitude);
  const lng = Number(p?.longitude);
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

/* ──────────────────────────────────────────────────────────────
   LEAFLET HTML
   ────────────────────────────────────────────────────────────── */
const buildLeafletHtml = ({ user, products, radius, selectedId }) => {
  const safeUser = user
    ? { latitude: user.latitude, longitude: user.longitude }
    : null;

  const safeProducts = products.map((p) => {
    const { isFar } = getProductFlags(p);
    return {
      id: p.id,
      name: p.name || "",
      price: p.price ?? null,
      lat: Number(p.latitude),
      lng: Number(p.longitude),
      far: isFar,
    };
  });

  // Only draw a circle when the user picked a bounded radius.
  const drawRadiusCircle = !isAllDistances(radius);
  const radiusKm = numericRadius(radius);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-container { background: #E8F0FF; font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; }

    .user-dot { width: 22px; height: 22px; border-radius: 50%; background: rgba(37,99,235,0.22); border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .user-dot-inner { width: 12px; height: 12px; border-radius: 50%; background: ${PRIMARY}; border: 2px solid #fff; }

    .pin { width: 32px; height: 32px; border-radius: 50%; background: ${PRIMARY_DARK}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; border: 2px solid #fff; box-shadow: 0 3px 8px rgba(10,46,158,0.35); transition: transform .15s ease, background .15s ease; }
    .pin.selected { background: ${GREEN}; transform: scale(1.18); box-shadow: 0 4px 12px rgba(34,197,94,0.45); }

    .pin.far { background: ${FAR}; border: 2px dashed #fff; box-shadow: 0 3px 10px rgba(146,64,14,0.4); }
    .pin.far.selected { background: ${FAR_INK}; transform: scale(1.2); }
    .pin.far::after {
      content: ""; position: absolute; inset: -6px; border-radius: 50%;
      border: 2px dashed rgba(245,158,11,0.6);
      animation: pulse 2.2s ease-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 0.9; }
      100% { transform: scale(1.35); opacity: 0; }
    }

    .leaflet-popup-content { margin: 6px 10px; font-size: 12px; font-weight: 700; color: ${INK}; white-space: nowrap; }
    .popup-price { color: ${PRIMARY_DARK}; font-weight: 800; }
    .popup-far { color: ${FAR_INK}; font-size: 10px; font-weight: 800; margin-inline-start: 4px; }
    .leaflet-popup-content-wrapper { border-radius: 10px; background: #fff; box-shadow: 0 4px 14px rgba(10,46,158,0.18); }
    .leaflet-popup-tip { background: #fff; }
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
          L.circle([user.latitude, user.longitude], {
            radius: radiusKm * 1000,
            color: '${PRIMARY}', weight: 2, dashArray: '6 6',
            fillColor: '${PRIMARY}', fillOpacity: 0.06
          }).addTo(map);
        }
        var userIcon = L.divIcon({
          className: '',
          html: '<div class="user-dot"><div class="user-dot-inner"></div></div>',
          iconSize: [22, 22], iconAnchor: [11, 11]
        });
        L.marker([user.latitude, user.longitude], { icon: userIcon, interactive: false }).addTo(map);
        bounds.push([user.latitude, user.longitude]);
      }

      products.forEach(function (p) {
        if (!isFinite(p.lat) || !isFinite(p.lng)) return;
        bounds.push([p.lat, p.lng]);
        var isSelected = p.id === selectedId;
        var label = typeof p.price === 'number' && p.price > 0 ? String(Math.round(p.price)) : '•';
        var cls = 'pin' + (p.far ? ' far' : '') + (isSelected ? ' selected' : '');
        var icon = L.divIcon({
          className: '',
          html: '<div class="' + cls + '">' + label + '</div>',
          iconSize: [32, 32], iconAnchor: [16, 16]
        });
        var marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
        var popupHtml = '<div>' +
          (p.name || 'Product') +
          (p.price ? ' · <span class="popup-price">' + p.price + ' DH</span>' : '') +
          (p.far ? '<span class="popup-far">100+ km</span>' : '') +
          '</div>';
        marker.bindPopup(popupHtml);
        marker.on('click', function () {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pinClick', id: p.id }));
          }
        });
      });

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      else if (bounds.length === 1) map.setView(bounds[0], 13);
      else map.setView([31.7917, -7.0926], 6);

      setTimeout(function () {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }
      }, 100);

      window.__recenterOnUser = function () {
        if (user) map.flyTo([user.latitude, user.longitude], 13, { duration: 0.6 });
      };
      window.__fitAll = function () {
        if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        else if (bounds.length === 1) map.setView(bounds[0], 13);
      };
      window.__invalidateSize = function () {
        setTimeout(function () { map.invalidateSize(); }, 50);
      };
    })();
  </script>
</body>
</html>`;
};

/* ──────────────────────────────────────────────────────────────
   SMALL PRESENTATIONAL PIECES
   ────────────────────────────────────────────────────────────── */
const RadiusPill = ({ value, active, onPress }) => {
  const far = isAllDistances(value);
  const label = `${formatRadius(value)}${far ? "" : " km"}`;
  const bg = active ? (far ? FAR : PRIMARY) : far ? FAR_SOFT : BLUE_SOFT;
  const borderColor = active ? (far ? FAR : PRIMARY) : far ? "#FDE68A" : BLUE_TINT;
  const textColor = active ? WHITE : far ? FAR_INK : PRIMARY_DARK;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.radiusPill, { backgroundColor: bg, borderColor }]}
    >
      <Text style={[styles.radiusPillText, { color: textColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const DistanceBadge = ({ product }) => {
  const { distanceKm, isFar } = getProductFlags(product);
  if (distanceKm == null) return null;

  const bg = isFar ? FAR_SOFT : GREEN_SOFT;
  const ink = isFar ? FAR_INK : PRIMARY_DARK;

  return (
    <View style={[styles.distanceBadge, { backgroundColor: bg }]}>
      {isFar ? (
        <Globe2 size={10} color={ink} strokeWidth={2.5} />
      ) : (
        <Navigation size={10} color={ink} strokeWidth={2.5} />
      )}
      <Text style={[styles.distanceText, { color: ink }]}>
        {distanceKm.toFixed(0)} km
      </Text>
    </View>
  );
};

/* ──────────────────────────────────────────────────────────────
   SCREEN
   ────────────────────────────────────────────────────────────── */
const NearbyScreen = ({ navigation }) => {
  const webRef = useRef(null);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { height: SCREEN_HEIGHT, contentPaddingBottom } = useResponsiveLayout();

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
  const allMode = isAllDistances(radius);

  /* Map height + bottom sheet */
  const mapHeight = useSharedValue(SCREEN_HEIGHT * 0.35);
  const startMapHeight = useSharedValue(0);
  const sheetHeight = useSharedValue(SCREEN_HEIGHT * SNAP_MID);
  const startSheetHeight = useSharedValue(0);

  const notifyMapResize = useCallback(() => {
    webRef.current?.injectJavaScript(
      "window.__invalidateSize && window.__invalidateSize(); true;"
    );
  }, []);
  const onMapResizeEnd = useCallback(() => notifyMapResize(), [notifyMapResize]);

  const mapPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startMapHeight.value = mapHeight.value;
        })
        .onUpdate((e) => {
          mapHeight.value = Math.min(
            MAP_MAX_HEIGHT,
            Math.max(MAP_MIN_HEIGHT, startMapHeight.value + e.translationY)
          );
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
          sheetHeight.value = Math.min(
            max,
            Math.max(min, startSheetHeight.value - e.translationY)
          );
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

  const mapWrapperStyle = useAnimatedStyle(() => ({ height: mapHeight.value }));
  const sheetStyle = useAnimatedStyle(() => ({ height: sheetHeight.value }));

  /* ── Fetch products ── */
  const requestToken = useRef(0);

  const getNearbyProducts = useCallback(async () => {
    if (!location) return;
    const token = ++requestToken.current;

    try {
      setLoadingProducts(true);
      const response = await api.get("/products/nearby", {
        params: buildRequestParams(location, radius),
      });
      if (token !== requestToken.current) return;

      // No client-side filtering. Whatever the backend returns for
      // the requested mode is what we show. Near/far styling is
      // derived per-product in getProductFlags().
      setProducts(extractProductArray(response.data));
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
    const id = setTimeout(getNearbyProducts, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey, radius]);

  /* ── Leaflet ── */
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
      }),
    [locationKey, mapProducts, radius, selectedProductId]
  );

  /* ── WebView messages ── */
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

  /* ── Map controls ── */
  const centerOnUser = useCallback(() => {
    if (!location) return refreshLocation();
    webRef.current?.injectJavaScript(
      "window.__recenterOnUser && window.__recenterOnUser(); true;"
    );
  }, [location, refreshLocation]);

  const fitAllProducts = useCallback(() => {
    webRef.current?.injectJavaScript(
      "window.__fitAll && window.__fitAll(); true;"
    );
  }, []);

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
    (product) =>
      navigation.navigate("ProductDetails", { productId: product.id }),
    [navigation]
  );

  /* ── Product card ── */
  const renderProduct = useCallback(
    ({ item }) => {
      const image = getProductImage(item);
      const { isFar } = getProductFlags(item);
      const isSelected = selectedProductId === item.id;

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => focusProduct(item)}
          style={[
            styles.productCard,
            {
              backgroundColor: isSelected ? BLUE_SOFT : WHITE,
              borderColor: isSelected ? PRIMARY : isFar ? FAR_SOFT : BORDER,
            },
          ]}
        >
          <View style={styles.productImageContainer}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImage}>
                <Tag size={24} color={STRIKE} />
              </View>
            )}
            <DistanceBadge product={item} />
          </View>

          <View style={styles.productInfo}>
            <Text
              numberOfLines={1}
              style={[styles.productName, { color: INK }]}
            >
              {item.name || t("createProduct.unnamedProduct")}
            </Text>
            <Text style={[styles.price, { color: PRIMARY_DARK }]}>
              {item.price
                ? `${Number(item.price).toLocaleString()} ${t(
                    "common.currency"
                  )}`
                : `— ${t("common.currency")}`}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MapPin size={12} color={MUTED} />
                <Text
                  numberOfLines={1}
                  style={[styles.metaText, { color: MUTED }]}
                >
                  {item.city || item.user?.city || t("common.unknown")}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Heart size={12} color={MUTED} />
                <Text style={[styles.metaText, { color: MUTED }]}>
                  {item.likes_count ?? 0}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Eye size={12} color={MUTED} />
                <Text style={[styles.metaText, { color: MUTED }]}>
                  {item.views_count ?? 0}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => openProduct(item)}
            style={styles.openButton}
            hitSlop={8}
          >
            <ChevronRight size={20} color={PRIMARY} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [selectedProductId, focusProduct, openProduct, t]
  );

  /* ── Early states ── */
  if (loadingLocation && !location) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.loadingScreen}>
          <View style={styles.loadingIcon}>
            <LocateFixed size={30} color={PRIMARY} />
          </View>
          <Text style={styles.loadingTitle}>
            {t("nearby.findingLocation")}
          </Text>
          <Text style={styles.loadingSubtitle}>
            {t("nearby.findingLocationSub")}
          </Text>
          <ActivityIndicator
            size="small"
            color={PRIMARY}
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
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.blockerScreen}>
          <View style={styles.blockerIcon}>
            <MapPinned size={34} color={PRIMARY} />
          </View>
          <Text style={styles.blockerTitle}>
            {t("nearby.enableLocation")}
          </Text>
          <Text style={styles.blockerText}>{reason}</Text>
          <View style={styles.blockerButtons}>
            {(servicesOn === false || permission === "denied") && (
              <TouchableOpacity
                style={styles.blockerPrimary}
                onPress={openSettings}
              >
                <SettingsIcon size={16} color={WHITE} />
                <Text style={styles.blockerPrimaryText}>
                  {t("nearby.openSettings")}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.blockerSecondary}
              onPress={refreshLocation}
            >
              <RefreshCw size={16} color={PRIMARY_DARK} />
              <Text style={styles.blockerSecondaryText}>
                {t("common.tryAgain")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  /* ── Derived labels ── */
  const sheetTitle = allMode
    ? t("nearby.allProducts", { defaultValue: "All products" })
    : t("nearby.productsNearYou");

  const sheetSubtitle = allMode
    ? t("nearby.allDistancesSub", {
        defaultValue: "Including products more than 100 km away",
      })
    : t("nearby.withinRadius", {
        radius,
        defaultValue: "Within {{radius}} km",
      });

  const counterLabel = allMode
    ? `All distances · ${mapProducts.length}`
    : t("nearby.nearbyCount", {
        count: mapProducts.length,
        defaultValue: "{{count}} nearby",
      });

  /* ── Main render ── */
  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t("nearby.title")}</Text>
            <View style={styles.headerLocation}>
              <MapPin size={14} color={PRIMARY} fill={BLUE_TINT} />
              <Text style={styles.headerSubtitle}>
                {location
                  ? t("nearby.productsOnMap", {
                      count: mapProducts.length,
                      defaultValue: "{{count}} products on map",
                    })
                  : t("nearby.locating")}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.iconButton}
              onPress={fitAllProducts}
              disabled={mapProducts.length === 0}
            >
              <Navigation size={18} color={PRIMARY_DARK} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.iconButton}
              onPress={refreshLocation}
            >
              {refreshing || loadingProducts ? (
                <ActivityIndicator size="small" color={PRIMARY_DARK} />
              ) : (
                <RefreshCw size={18} color={PRIMARY_DARK} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* RADIUS PILLS */}
        <View style={styles.radiusBar}>
          <Text style={styles.radiusBarLabel}>{t("nearby.radius")}</Text>
          <View style={styles.radiusPills}>
            {RADIUS_OPTIONS.map((r) => (
              <RadiusPill
                key={String(r)}
                value={r}
                active={r === radius}
                onPress={() => setRadius(r)}
              />
            ))}
          </View>
        </View>

        {/* MAP */}
        <Animated.View style={[styles.mapWrapper, mapWrapperStyle]}>
          {location ? (
            <WebView
              ref={webRef}
              style={styles.map}
              originWhitelist={["*"]}
              source={{ html: leafletHtml, baseUrl: "https://localhost" }}
              onMessage={onWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.mapLoading}>
                  <ActivityIndicator color={PRIMARY} />
                </View>
              )}
              androidLayerType="hardware"
              setSupportMultipleWindows={false}
            />
          ) : (
            <View style={styles.mapError}>
              <LocateFixed size={32} color={STRIKE} />
              <Text style={styles.mapErrorText}>
                {t("nearby.waitingLocation")}
              </Text>
              <TouchableOpacity
                onPress={refreshLocation}
                style={styles.mapErrorRetry}
              >
                <RefreshCw size={14} color={WHITE} />
                <Text style={styles.mapErrorRetryText}>
                  {t("common.retry")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.mapControls}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.mapControl}
              onPress={centerOnUser}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <LocateFixed size={20} color={PRIMARY_DARK} />
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.counterBadge,
              { backgroundColor: allMode ? FAR : PRIMARY_DARK },
            ]}
          >
            {allMode ? (
              <Globe2 size={13} color={WHITE} />
            ) : (
              <Search size={13} color={WHITE} />
            )}
            <Text style={styles.counterText}>{counterLabel}</Text>
          </View>

          <GestureDetector gesture={mapPanGesture}>
            <Animated.View style={styles.topHandle} hitSlop={12}>
              <View style={styles.handleBar} />
            </Animated.View>
          </GestureDetector>
        </Animated.View>

        {/* BOTTOM SHEET */}
        <Animated.View
          style={[
            styles.bottomSheet,
            sheetStyle,
            { paddingBottom: insets.bottom },
          ]}
        >
          <GestureDetector gesture={sheetPanGesture}>
            <View style={styles.sheetHandleHitArea} hitSlop={12}>
              <View style={styles.sheetHandle} />
            </View>
          </GestureDetector>

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>{sheetTitle}</Text>
              <Text style={styles.sheetSubtitle}>{sheetSubtitle}</Text>
            </View>
            <View
              style={[
                styles.radiusBadge,
                { backgroundColor: allMode ? FAR_SOFT : GREEN_SOFT },
              ]}
            >
              {allMode ? (
                <Globe2 size={12} color={FAR_INK} />
              ) : (
                <Navigation size={12} color={PRIMARY_DARK} />
              )}
              <Text
                style={[
                  styles.radiusText,
                  { color: allMode ? FAR_INK : PRIMARY_DARK },
                ]}
              >
                {formatRadius(radius)}
                {allMode ? "" : " km"}
              </Text>
            </View>
          </View>

          {loadingProducts ? (
            <View style={styles.productsLoading}>
              <ActivityIndicator color={PRIMARY} size="small" />
              <Text style={styles.productsLoadingText}>
                {t("nearby.searching")}
              </Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Search size={26} color={PRIMARY} />
              </View>
              <Text style={styles.emptyTitle}>
                {t("nearby.noProductsNearby")}
              </Text>
              <Text style={styles.emptySubtitle}>
                {allMode
                  ? t("nearby.noProductsAtAll", {
                      defaultValue:
                        "No products found at any distance.",
                    })
                  : t("nearby.noProductsSub", {
                      radius,
                      defaultValue:
                        "Try expanding your search radius to see more products.",
                    })}
              </Text>
              {!allMode && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.retryButton}
                  onPress={() => {
                    const numeric = RADIUS_OPTIONS.filter(
                      (r) => !isAllDistances(r)
                    );
                    const next =
                      numeric.find((r) => r > numericRadius(radius)) ??
                      ALL_DISTANCES;
                    setRadius(next);
                  }}
                >
                  <Navigation size={15} color={WHITE} />
                  <Text style={styles.retryText}>
                    {t("nearby.expandRadius")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={products}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderProduct}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.productsList,
                { paddingBottom: contentPaddingBottom },
              ]}
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

/* ──────────────────────────────────────────────────────────────
   STYLES
   ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  container: { flex: 1, backgroundColor: PAGE_BG },

  /* Loading */
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },
  loadingIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: BLUE_SOFT,
  },
  loadingTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.3,
  },
  loadingSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
    color: MUTED,
  },

  /* Blocker */
  blockerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: PAGE_BG,
  },
  blockerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: BLUE_SOFT,
  },
  blockerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.4,
  },
  blockerText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
    color: MUTED,
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: PRIMARY_DARK,
  },
  blockerPrimaryText: { color: WHITE, fontWeight: "800", fontSize: 13 },
  blockerSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BLUE_TINT,
    backgroundColor: BLUE_SOFT,
  },
  blockerSecondaryText: {
    fontWeight: "800",
    fontSize: 13,
    color: PRIMARY_DARK,
  },

  /* Header */
  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 14 : 6,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.6,
  },
  headerLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 5,
  },
  headerSubtitle: { fontSize: 12, fontWeight: "600", color: MUTED },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: BLUE_SOFT,
    borderColor: BLUE_TINT,
  },

  /* Radius bar */
  radiusBar: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  radiusBarLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: MUTED,
  },
  radiusPills: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  radiusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  radiusPillText: { fontSize: 11, fontWeight: "800" },

  /* Map */
  mapWrapper: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#E8F0FF",
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F0FF",
  },
  mapError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: PAGE_BG,
  },
  mapErrorText: {
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 20,
    color: MUTED,
  },
  mapErrorRetry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: PRIMARY_DARK,
  },
  mapErrorRetryText: { color: WHITE, fontWeight: "700", fontSize: 12 },
  mapControls: { position: "absolute", right: 15, bottom: 18 },
  mapControl: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    shadowColor: PRIMARY_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
    shadowColor: PRIMARY_DARK,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  counterText: { fontSize: 12, fontWeight: "800", color: WHITE },

  topHandle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  handleBar: {
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "rgba(11,27,58,0.12)",
  },

  /* Bottom sheet */
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    backgroundColor: WHITE,
    shadowColor: PRIMARY_DEEP,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
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
    backgroundColor: STRIKE,
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: MUTED,
    fontWeight: "500",
  },
  radiusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  radiusText: { fontSize: 11, fontWeight: "800" },

  /* Products */
  productsList: { paddingHorizontal: 14, paddingBottom: 25 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 9,
    marginBottom: 10,
    shadowColor: PRIMARY_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  productImageContainer: {
    width: 78,
    height: 78,
    borderRadius: 13,
    overflow: "hidden",
    position: "relative",
    backgroundColor: BLUE_SOFT,
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
  productName: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  price: { fontSize: 15, fontWeight: "900", marginTop: 3 },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontWeight: "600" },
  openButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_SOFT,
  },

  /* Loading / empty */
  productsLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 30,
  },
  productsLoadingText: { fontSize: 13, fontWeight: "600", color: MUTED },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    backgroundColor: BLUE_SOFT,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: INK },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
    color: MUTED,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
    marginTop: 16,
    backgroundColor: PRIMARY_DARK,
  },
  retryText: { color: WHITE, fontWeight: "800", fontSize: 12 },
});