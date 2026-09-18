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
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const DEFAULT_RADIUS = 20;
const RADIUS_OPTIONS = [5, 10, 20, 50, 100];

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

// ============================================================
// LEAFLET HTML
// ============================================================

const buildLeafletHtml = ({ user, products, radius, selectedId }) => {
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-container { background: #E5E7EB; font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; }
    .user-dot { width: 22px; height: 22px; border-radius: 50%; background: rgba(37,99,235,0.25); border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .user-dot-inner { width: 12px; height: 12px; border-radius: 50%; background: #2563EB; border: 2px solid #fff; }
    .pin { width: 30px; height: 30px; border-radius: 50%; background: #16A34A; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; border: 2px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.28); transition: transform .15s ease, background .15s ease; }
    .pin.selected { background: #0F7C36; transform: scale(1.18); }
    .leaflet-popup-content { margin: 6px 10px; font-size: 12px; font-weight: 700; color: #111827; white-space: nowrap; }
    .popup-price { color: #16A34A; font-weight: 800; }
    .leaflet-popup-content-wrapper { border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var user = ${JSON.stringify(safeUser)};
      var products = ${JSON.stringify(safeProducts)};
      var radiusKm = ${Number(radius) || 20};
      var selectedId = ${selectedId ?? "null"};

      var map = L.map('map', { zoomControl: false, attributionControl: true, preferCanvas: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

      var bounds = [];

      if (user && isFinite(user.latitude) && isFinite(user.longitude)) {
        L.circle([user.latitude, user.longitude], { radius: radiusKm * 1000, color: 'rgba(22,163,74,0.55)', weight: 1.5, fillColor: 'rgba(22,163,74,0.10)', fillOpacity: 1 }).addTo(map);
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

  const onMapResizeEnd = useCallback(
    () => {
      notifyMapResize();
    },
    [notifyMapResize]
  );

  // Top handle: drag vertically to resize map
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

  // Bottom handle: drag up/down to resize the bottom sheet
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
    try {
      setLoadingProducts(true);
      const response = await api.get("/products/nearby", {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius,
        },
      });
      if (token !== requestToken.current) return;
      setProducts(extractProductArray(response.data));
    } catch (error) {
      if (token !== requestToken.current) return;
      console.log(
        "NEARBY PRODUCTS ERROR:",
        error?.response?.data || error.message
      );
      Alert.alert("Nearby products", "Unable to load nearby products.");
      setProducts([]);
    } finally {
      if (token === requestToken.current) setLoadingProducts(false);
    }
  }, [location, radius]);

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
      }),
    [locationKey, mapProducts, radius, selectedProductId]
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
          isSelected && styles.productCardSelected,
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
              <Tag size={24} color="#9CA3AF" />
            </View>
          )}
          {distance && (
            <View style={styles.distanceBadge}>
              <Navigation size={10} color="#166534" strokeWidth={2.5} />
              <Text style={styles.distanceText}>{distance} km</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text numberOfLines={1} style={styles.productName}>
            {item.name || "Unnamed product"}
          </Text>
          <Text style={styles.price}>
            {item.price
              ? `${Number(item.price).toLocaleString()} DH`
              : "— DH"}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={12} color="#6B7280" />
              <Text numberOfLines={1} style={styles.metaText}>
                {item.city || item.user?.city || "Unknown"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Heart size={12} color="#6B7280" />
              <Text style={styles.metaText}>{item.likes_count ?? 0}</Text>
            </View>
            <View style={styles.metaItem}>
              <Eye size={12} color="#6B7280" />
              <Text style={styles.metaText}>{item.views_count ?? 0}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => openProduct(item)}
          style={styles.openButton}
          hitSlop={8}
        >
          <ChevronRight size={20} color="#16A34A" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // =========================================================
  // LOADING / BLOCKER
  // =========================================================
  if (loadingLocation && !location) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingScreen}>
          <View style={styles.loadingIcon}>
            <LocateFixed size={30} color="#16A34A" />
          </View>
          <Text style={styles.loadingTitle}>Finding your location</Text>
          <Text style={styles.loadingSubtitle}>
            This usually takes a few seconds.
          </Text>
          <ActivityIndicator size="small" color="#16A34A" style={{ marginTop: 20 }} />
        </View>
      </GestureHandlerRootView>
    );
  }

  const showBlocker =
    !location &&
    (permission === "denied" || servicesOn === false || !!locationError);

  if (showBlocker) {
    const reason = !servicesOn
      ? "Location services are turned off on this device."
      : permission === "denied"
      ? "Location permission was denied."
      : locationError || "GPS fix unavailable.";

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.blockerScreen}>
          <View style={styles.blockerIcon}>
            <MapPinned size={34} color="#16A34A" />
          </View>
          <Text style={styles.blockerTitle}>Enable location</Text>
          <Text style={styles.blockerText}>{reason}</Text>
          <View style={styles.blockerButtons}>
            {(servicesOn === false || permission === "denied") && (
              <TouchableOpacity
                style={styles.blockerPrimary}
                onPress={openSettings}
              >
                <SettingsIcon size={16} color="#FFFFFF" />
                <Text style={styles.blockerPrimaryText}>Open settings</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.blockerSecondary}
              onPress={refreshLocation}
            >
              <RefreshCw size={16} color="#166534" />
              <Text style={styles.blockerSecondaryText}>Try again</Text>
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
    <GestureHandlerRootView style={styles.root}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Nearby</Text>
            <View style={styles.headerLocation}>
              <MapPin size={14} color="#16A34A" fill="#DCFCE7" />
              <Text style={styles.headerSubtitle}>
                {location
                  ? `${mapProducts.length} product${
                      mapProducts.length !== 1 ? "s" : ""
                    } on the map`
                  : "Locating…"}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.iconButton}
              onPress={fitAllProducts}
              disabled={mapProducts.length === 0}
            >
              <Navigation size={18} color="#16A34A" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.iconButton}
              onPress={refreshLocation}
            >
              {refreshing || loadingProducts ? (
                <ActivityIndicator size="small" color="#16A34A" />
              ) : (
                <RefreshCw size={18} color="#16A34A" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* RADIUS PILLS */}
        <View style={styles.radiusBar}>
          <Text style={styles.radiusBarLabel}>Radius</Text>
          <View style={styles.radiusPills}>
            {RADIUS_OPTIONS.map((r) => {
              const active = r === radius;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRadius(r)}
                  activeOpacity={0.8}
                  style={[styles.radiusPill, active && styles.radiusPillActive]}
                >
                  <Text
                    style={[
                      styles.radiusPillText,
                      active && styles.radiusPillTextActive,
                    ]}
                  >
                    {r} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* MAP — resizable */}
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
                  <ActivityIndicator color="#16A34A" />
                </View>
              )}
              androidLayerType="hardware"
              setSupportMultipleWindows={false}
            />
          ) : (
            <View style={styles.mapError}>
              <LocateFixed size={32} color="#9CA3AF" />
              <Text style={styles.mapErrorText}>Waiting for location…</Text>
              <TouchableOpacity
                onPress={refreshLocation}
                style={styles.mapErrorRetry}
              >
                <RefreshCw size={14} color="#FFFFFF" />
                <Text style={styles.mapErrorRetryText}>Retry</Text>
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
                <ActivityIndicator size="small" color="#166534" />
              ) : (
                <LocateFixed size={20} color="#166534" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.counterBadge}>
            <Search size={13} color="#166534" />
            <Text style={styles.counterText}>
              {mapProducts.length} nearby
            </Text>
          </View>

          {/* TOP drag handle — resize map vertically */}
          <GestureDetector gesture={mapPanGesture}>
            <Animated.View style={styles.topHandle} hitSlop={12}>
              <View style={styles.handleBar} />
            </Animated.View>
          </GestureDetector>
        </Animated.View>

        {/* BOTTOM SHEET — resizable */}
        <Animated.View
          style={[
            styles.bottomSheet,
            sheetStyle,
            { paddingBottom: insets.bottom },
          ]}
        >
          {/* BOTTOM drag handle */}
          <GestureDetector gesture={sheetPanGesture}>
            <View style={styles.sheetHandleHitArea} hitSlop={12}>
              <View style={styles.sheetHandle} />
            </View>
          </GestureDetector>

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Products near you</Text>
              <Text style={styles.sheetSubtitle}>Within {radius} km</Text>
            </View>
            <View style={styles.radiusBadge}>
              <Navigation size={12} color="#166534" />
              <Text style={styles.radiusText}>{radius} km</Text>
            </View>
          </View>

          {loadingProducts ? (
            <View style={styles.productsLoading}>
              <ActivityIndicator color="#16A34A" size="small" />
              <Text style={styles.productsLoadingText}>
                Searching nearby products...
              </Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Search size={26} color="#16A34A" />
              </View>
              <Text style={styles.emptyTitle}>No products nearby</Text>
              <Text style={styles.emptySubtitle}>
                We couldn't find available products within {radius} km of your
                location.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.retryButton}
                onPress={() => {
                  const next =
                    RADIUS_OPTIONS.find((r) => r > radius) ?? radius;
                  setRadius(next);
                }}
              >
                <Navigation size={15} color="#FFFFFF" />
                <Text style={styles.retryText}>Expand radius</Text>
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
// STYLES
// =========================================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },

  // LOADING
  loadingScreen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },
  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loadingTitle: { fontSize: 21, fontWeight: "800", color: "#111827" },
  loadingSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },

  // BLOCKER
  blockerScreen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  blockerIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  blockerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  blockerText: {
    fontSize: 14,
    color: "#6B7280",
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
    backgroundColor: "#16A34A",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 13,
  },
  blockerPrimaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  blockerSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  blockerSecondaryText: { color: "#166534", fontWeight: "800", fontSize: 13 },

  // HEADER
  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 14 : 6,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  headerLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 5,
  },
  headerSubtitle: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },

  // RADIUS
  radiusBar: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  radiusBarLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  radiusPills: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  radiusPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  radiusPillActive: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  radiusPillText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  radiusPillTextActive: { color: "#FFFFFF" },

  // MAP
  mapWrapper: {
    position: "relative",
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  map: { ...StyleSheet.absoluteFillObject, backgroundColor: "#E5E7EB" },
  mapError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    gap: 10,
  },
  mapErrorText: {
    color: "#6B7280",
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
    backgroundColor: "#16A34A",
    marginTop: 4,
  },
  mapErrorRetryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  mapControls: { position: "absolute", right: 15, bottom: 18 },
  mapControl: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
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
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  counterText: { fontSize: 12, fontWeight: "700", color: "#166534" },

  // Top drag handle (map bottom edge)
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
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  // BOTTOM SHEET
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    shadowColor: "#000",
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
    backgroundColor: "#D1D5DB",
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sheetSubtitle: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  radiusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
  },
  radiusText: { fontSize: 11, fontWeight: "700", color: "#166534" },

  // PRODUCTS
  productsList: { paddingHorizontal: 14, paddingBottom: 25 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 17,
    padding: 9,
    marginBottom: 10,
  },
  productCardSelected: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  productImageContainer: {
    width: 78,
    height: 78,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
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
    backgroundColor: "#DCFCE7",
  },
  distanceText: { fontSize: 9, fontWeight: "800", color: "#166534" },
  productInfo: { flex: 1, marginLeft: 11, marginRight: 6 },
  productName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16A34A",
    marginTop: 3,
  },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  openButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },

  // LOADING / EMPTY
  productsLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 30,
  },
  productsLoadingText: { color: "#6B7280", fontSize: 13, fontWeight: "600" },
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
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
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
    backgroundColor: "#16A34A",
    marginTop: 16,
  },
  retryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
});