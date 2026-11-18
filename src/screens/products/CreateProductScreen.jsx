import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Easing,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  FileText,
  Wallet,
  Eye,
  Sparkles,
  ThumbsUp,
  Wrench,
  Recycle,
  Star,
  Rocket,
  Shield,
  ArrowRight,
  Pencil,
  Layers,
  Smartphone,
  Shirt,
  Home as HomeIcon,
  Dumbbell,
  BookOpen,
  Car,
  Watch,
  Bike,
  Tag,
  Flame,
  Handshake,
  Map as MapIcon,
} from "lucide-react-native";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { media_URL } from "../../constants/config";
import { useTabBarScroll } from "../../navigation/tabBarScroll";

/* ──────────────────────────────────────────────────────────────
   Theme — same blue system as the HomeScreen
   ────────────────────────────────────────────────────────────── */
const PRIMARY = "#2563EB";
const PRIMARY_DARK = "#1D4ED8";
const PRIMARY_DEEP = "#0A2E9E";
const SKY = "#38A3FF";
const SKY_SOFT = "#7DD3FC";
const BLUE_SOFT = "#EFF6FF";
const BLUE_TINT = "#DBEAFE";

const PAGE_BG = "#F3F6FD";
const WHITE = "#FFFFFF";

const INK = "#0B1B3A";
const INK_SOFT = "#2F4170";
const MUTED = "#64748B";
const STRIKE = "#94A3B8";
const BORDER = "rgba(11, 27, 58, 0.08)";

const OFFER = "#FBBF24";
const OFFER_INK = "#78350F";
const SUCCESS = "#22C55E";
const DANGER = "#EF4444";

const HERO_GRADIENT = [PRIMARY_DEEP, PRIMARY_DARK, SKY];
const CTA_GRADIENT = [PRIMARY_DARK, SKY];
const GLASS = "rgba(255,255,255,0.16)";
const GLASS_BORDER = "rgba(255,255,255,0.28)";
const ON_HERO = "#FFFFFF";
const ON_HERO_SOFT = "rgba(255,255,255,0.82)";

const PAGE_PADDING = 20;
const MAX_MEDIA = 8;
const IMG_RADIUS = 26;
const HERO_RADIUS = 34;

const DEFAULT_POSITION = { latitude: 31.7917, longitude: -7.0926 };
const DEFAULT_ZOOM = 6;

/* ──────────────────────────────────────────────────────────────
   Steps
   ────────────────────────────────────────────────────────────── */
const STEPS = [
  { key: "media", Icon: ImagePlus, title: "Add photos", sub: "Great photos sell faster" },
  { key: "details", Icon: FileText, title: "What are you selling?", sub: "Pick a category and describe it" },
  { key: "price", Icon: Wallet, title: "Price & condition", sub: "Set a fair price buyers will love" },
  { key: "location", Icon: MapPin, title: "Where is it?", sub: "Buyers search near them" },
  { key: "review", Icon: Eye, title: "Preview & publish", sub: "This is how your listing will look" },
];
const LAST = STEPS.length - 1;

const CONDITIONS = [
  { value: "New", labelKey: "products.conditions.new", def: "New", Icon: Sparkles },
  { value: "Like_new", labelKey: "products.conditions.like_new", def: "Like new", Icon: Star },
  { value: "Good", labelKey: "products.conditions.good", def: "Good", Icon: ThumbsUp },
  { value: "Fair", labelKey: "products.conditions.fair", def: "Fair", Icon: Wrench },
  { value: "Poor", labelKey: "products.conditions.poor", def: "Poor", Icon: Recycle },
];

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
const stripSlash = (s) => (s?.endsWith("/") ? s.slice(0, -1) : s || "");

const getCategoryImage = (cat) => {
  if (!cat?.icon) return null;
  const path = cat.icon.startsWith("/") ? cat.icon.slice(1) : cat.icon;
  return `${stripSlash(media_URL)}/storage/${path}`;
};

const getCategoryIcon = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("electronic") || n.includes("phone") || n.includes("tech")) return Smartphone;
  if (n.includes("cloth") || n.includes("fashion") || n.includes("wear") || n.includes("shirt")) return Shirt;
  if (n.includes("home") || n.includes("furniture") || n.includes("house")) return HomeIcon;
  if (n.includes("sport") || n.includes("gym") || n.includes("fitness")) return Dumbbell;
  if (n.includes("book") || n.includes("edu")) return BookOpen;
  if (n.includes("vehicle") || n.includes("car") || n.includes("auto")) return Car;
  if (n.includes("watch") || n.includes("jewel")) return Watch;
  if (n.includes("bike") || n.includes("outdoor") || n.includes("cycle")) return Bike;
  if (n.includes("camera") || n.includes("photo")) return Camera;
  if (n.includes("all")) return Layers;
  return Tag;
};

const cleanNumber = (v) => v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
const formatPrice = (v) => Number(v || 0).toLocaleString();

async function getGps() {
  const enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) throw new Error("services");
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== "granted") throw new Error("denied");
  const cur = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    mayShowUserSettingsDialog: true,
  });
  return cur.coords;
}

async function reverseGeocode(lat, lng) {
  try {
    const list = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const a = list?.[0];
    if (!a) return { city: "", address: "" };
    const city = a.city || a.subregion || a.district || a.region || "";
    const address = [a.street, a.district, city, a.country].filter(Boolean).join(", ");
    return { city, address: address || city };
  } catch (e) {
    return { city: "", address: "" };
  }
}

/* ──────────────────────────────────────────────────────────────
   Map HTML (full-screen picker — tap to drop the pin)
   ────────────────────────────────────────────────────────────── */
const buildMapHtml = (pin) => {
  const hasPin =
    pin && Number.isFinite(Number(pin.latitude)) && Number.isFinite(Number(pin.longitude));
  const center = hasPin
    ? [Number(pin.latitude), Number(pin.longitude)]
    : [DEFAULT_POSITION.latitude, DEFAULT_POSITION.longitude];
  const zoom = hasPin ? 15 : DEFAULT_ZOOM;

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
  .leaflet-container { background: #EAF1FF; font-family: -apple-system, system-ui, Roboto, sans-serif; }
  .leaflet-control-attribution { font-size: 9px; }
  .pin { position: relative; width: 44px; height: 56px; }
  .pin-head { position: absolute; top: 0; left: 2px; width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, ${PRIMARY_DARK}, ${SKY}); border: 3px solid #fff;
    display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 14px rgba(29,78,216,.4); }
  .pin-dot { width: 12px; height: 12px; border-radius: 50%; background: #fff; }
  .pin-tail { position: absolute; bottom: 0; left: 50%; width: 8px; height: 8px; margin-left: -4px;
    background: ${PRIMARY_DARK}; border: 2px solid #fff; border-radius: 50%; }
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var map = L.map('map', { zoomControl: false, attributionControl: true, preferCanvas: true, doubleClickZoom: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  map.setView(${JSON.stringify(center)}, ${zoom});

  var icon = L.divIcon({
    className: '',
    html: '<div class="pin"><div class="pin-head"><div class="pin-dot"></div></div><div class="pin-tail"></div></div>',
    iconSize: [44, 56], iconAnchor: [22, 54]
  });
  var marker = null;

  function post(p) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(p)); }

  function place(lat, lng) {
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng], { icon: icon }).addTo(map);
    post({ type: 'pin', latitude: lat, longitude: lng });
  }

  ${hasPin ? `place(${Number(pin.latitude)}, ${Number(pin.longitude)});` : ""}

  map.on('click', function (e) { place(e.latlng.lat, e.latlng.lng); });

  window.__setPin = function (lat, lng) { place(lat, lng); map.setView([lat, lng], 16, { animate: true }); };
  window.__zoomIn = function () { map.zoomIn(1); };
  window.__zoomOut = function () { map.zoomOut(1); };
  window.__recenter = function () {
    if (marker) { var ll = marker.getLatLng(); map.setView([ll.lat, ll.lng], Math.max(map.getZoom(), 15), { animate: true }); }
  };
  setTimeout(function () { post({ type: 'ready' }); }, 100);
})();
</script></body></html>`;
};

/* ──────────────────────────────────────────────────────────────
   Small building blocks
   ────────────────────────────────────────────────────────────── */
const Field = memo(function Field({ label, hint, error, right, children }) {
  return (
    <View style={styles.field}>
      {label ? (
        <View style={styles.fieldHead}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {right}
        </View>
      ) : null}
      {children}
      {error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const Input = memo(function Input({ error, multiline, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      multiline={multiline}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      placeholderTextColor={STRIKE}
      selectionColor={PRIMARY}
      style={[
        styles.input,
        multiline && styles.textarea,
        focused && styles.inputFocused,
        !!error && styles.inputError,
        style,
      ]}
    />
  );
});

const GradientButton = memo(function GradientButton({
  onPress,
  disabled,
  loading,
  label,
  Icon,
  iconRight = true,
  style,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.ctaWrap, (disabled || loading) && { opacity: 0.7 }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={CTA_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cta}
      >
        {loading ? (
          <ActivityIndicator color={WHITE} />
        ) : (
          <>
            {Icon && !iconRight ? <Icon size={18} color={WHITE} strokeWidth={2.6} /> : null}
            <Text style={styles.ctaText} numberOfLines={1}>
              {label}
            </Text>
            {Icon && iconRight ? <Icon size={18} color={WHITE} strokeWidth={2.8} /> : null}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
});

/* ──────────────────────────────────────────────────────────────
   Stepper header — gradient hero with connected step nodes
   ────────────────────────────────────────────────────────────── */
const Connector = memo(function Connector({ filled }) {
  const a = useRef(new Animated.Value(filled ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: filled ? 1 : 0,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [filled, a]);
  return (
    <View style={styles.connTrack}>
      <Animated.View
        style={[
          styles.connFill,
          { width: a.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
        ]}
      />
    </View>
  );
});

const StepNode = memo(function StepNode({ Icon, state, onPress }) {
  const done = state === "done";
  const active = state === "active";
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!done}
      onPress={onPress}
      hitSlop={6}
      style={styles.nodeHit}
    >
      <View style={[styles.nodeRing, active && styles.nodeRingActive]}>
        <View
          style={[
            styles.node,
            (done || active) && styles.nodeOn,
            active && styles.nodeActive,
          ]}
        >
          {done ? (
            <Check size={16} color={PRIMARY_DARK} strokeWidth={3.2} />
          ) : (
            <Icon
              size={active ? 18 : 16}
              color={active ? PRIMARY_DARK : ON_HERO_SOFT}
              strokeWidth={2.4}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const StepperHeader = memo(function StepperHeader({
  step,
  insets,
  onClose,
  onJump,
  titleStyle,
  t,
}) {
  const current = STEPS[step];
  return (
    <LinearGradient
      colors={HERO_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + 12 }]}
    >
      {/* decorative orbs */}
      <View pointerEvents="none" style={styles.orbA} />
      <View pointerEvents="none" style={styles.orbB} />

      <View style={styles.heroTop}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onClose}
          hitSlop={8}
          style={styles.roundBtn}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? "Close" : "Back"}
        >
          {step === 0 ? (
            <X size={20} color={ON_HERO} strokeWidth={2.6} />
          ) : (
            <ChevronLeft size={20} color={ON_HERO} strokeWidth={2.6} />
          )}
        </TouchableOpacity>

        <Text style={styles.heroEyebrow}>
          {t("createProduct.newListing", { defaultValue: "New listing" })}
        </Text>

        <View style={styles.counterPill}>
          <Text style={styles.counterText}>
            {step + 1}
            <Text style={styles.counterTotal}> / {STEPS.length}</Text>
          </Text>
        </View>
      </View>

      <Animated.View style={titleStyle}>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {t(`createProduct.steps.${current.key}`, { defaultValue: current.title })}
        </Text>
        <Text style={styles.heroSub} numberOfLines={2}>
          {t(`createProduct.steps.${current.key}Sub`, { defaultValue: current.sub })}
        </Text>
      </Animated.View>

      <View style={styles.stepperRow}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            <StepNode
              Icon={s.Icon}
              state={i < step ? "done" : i === step ? "active" : "todo"}
              onPress={() => onJump(i)}
            />
            {i < STEPS.length - 1 ? <Connector filled={i < step} /> : null}
          </React.Fragment>
        ))}
      </View>
    </LinearGradient>
  );
});

/* ──────────────────────────────────────────────────────────────
   Step 1 — Photos
   ────────────────────────────────────────────────────────────── */
const PhotosStep = memo(function PhotosStep({
  media,
  error,
  onPick,
  onRemove,
  onMakeCover,
  winW,
  t,
}) {
  const coverW = winW - PAGE_PADDING * 2;
  const cover = media[0];

  if (media.length === 0) {
    return (
      <>
        <TouchableOpacity activeOpacity={0.9} onPress={onPick} style={styles.dropZone}>
          <LinearGradient
            colors={CTA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dropIcon}
          >
            <ImagePlus size={30} color={WHITE} strokeWidth={2.2} />
          </LinearGradient>
          <Text style={styles.dropTitle}>
            {t("createProduct.addPhotos", { defaultValue: "Add photos or videos" })}
          </Text>
          <Text style={styles.dropHint}>
            {t("createProduct.photoLimit", {
              defaultValue: "Up to {{max}} files · the first one is your cover",
              max: MAX_MEDIA,
            })}
          </Text>
          <View style={styles.dropBtn}>
            <Plus size={16} color={PRIMARY_DARK} strokeWidth={3} />
            <Text style={styles.dropBtnText}>
              {t("createProduct.chooseFromLibrary", { defaultValue: "Choose from library" })}
            </Text>
          </View>
        </TouchableOpacity>
        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        <View style={styles.tipRow}>
          <Sparkles size={16} color={PRIMARY_DARK} strokeWidth={2.4} />
          <Text style={styles.tipText}>
            {t("createProduct.photoTip", {
              defaultValue: "Use natural light and show every angle. Listings with 3+ photos get more views.",
            })}
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <View style={[styles.coverBox, { width: coverW, height: Math.round(coverW * 0.75) }]}>
        {cover.type === "video" ? (
          <View style={[styles.fill, styles.center, { backgroundColor: INK }]}>
            <Camera size={34} color={WHITE} />
            <Text style={styles.videoText}>Video</Text>
          </View>
        ) : (
          <Image source={{ uri: cover.uri }} style={styles.fill} resizeMode="cover" />
        )}
        <View style={styles.coverBadge}>
          <Star size={12} color={OFFER_INK} strokeWidth={2.8} />
          <Text style={styles.coverBadgeText}>
            {t("createProduct.cover", { defaultValue: "Cover" })}
          </Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>
            {media.length}/{MAX_MEDIA}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeBtnLg}
          onPress={() => onRemove(0)}
          hitSlop={8}
          activeOpacity={0.85}
        >
          <X size={16} color={WHITE} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbRow}
      >
        {media.slice(1).map((item, i) => {
          const index = i + 1;
          return (
            <TouchableOpacity
              key={`${item.uri}-${index}`}
              activeOpacity={0.9}
              onPress={() => onMakeCover(index)}
              style={styles.thumb}
            >
              {item.type === "video" ? (
                <View style={[styles.fill, styles.center, { backgroundColor: INK }]}>
                  <Camera size={20} color={WHITE} />
                </View>
              ) : (
                <Image source={{ uri: item.uri }} style={styles.fill} resizeMode="cover" />
              )}
              <TouchableOpacity
                style={styles.removeBtnSm}
                onPress={() => onRemove(index)}
                hitSlop={6}
              >
                <X size={11} color={WHITE} strokeWidth={3.2} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
        {media.length < MAX_MEDIA ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onPick} style={[styles.thumb, styles.thumbAdd]}>
            <Plus size={22} color={PRIMARY_DARK} strokeWidth={2.8} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Text style={styles.fieldHint}>
        {t("createProduct.makeCoverHint", { defaultValue: "Tap a photo to make it your cover." })}
      </Text>
    </>
  );
});

/* ──────────────────────────────────────────────────────────────
   Step 2 — Details
   ────────────────────────────────────────────────────────────── */
const CategoryTile = memo(function CategoryTile({ item, selected, onPress, size }) {
  const [failed, setFailed] = useState(false);
  const image = getCategoryImage(item);
  const Icon = getCategoryIcon(item.name);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item.id)}
      style={[styles.catTile, { width: size }]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.catBox, { width: size, height: size }, selected && styles.catBoxOn]}>
        {image && !failed ? (
          <Image
            source={{ uri: image }}
            style={styles.fill}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.center]}>
            <Icon size={26} color={selected ? PRIMARY_DARK : INK_SOFT} strokeWidth={2} />
          </View>
        )}
        {selected ? (
          <View style={styles.catCheck}>
            <Check size={12} color={WHITE} strokeWidth={3.4} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.catName, selected && styles.catNameOn]} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
});

const DetailsStep = memo(function DetailsStep({
  categories,
  loadingCategories,
  categoryId,
  setCategoryId,
  name,
  setName,
  description,
  setDescription,
  errors,
  winW,
  t,
}) {
  const tile = Math.floor((winW - PAGE_PADDING * 2 - 12 * 2) / 3);
  return (
    <>
      <Field
        label={t("createProduct.category", { defaultValue: "Category" })}
        error={errors.category}
      >
        {loadingCategories ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color={PRIMARY} />
        ) : (
          <View style={styles.catGrid}>
            {categories.map((c) => (
              <CategoryTile
                key={`c-${c.id}`}
                item={c}
                size={tile}
                selected={c.id === categoryId}
                onPress={setCategoryId}
              />
            ))}
          </View>
        )}
      </Field>

      <Field
        label={t("createProduct.productName", { defaultValue: "Title" })}
        error={errors.name}
        right={<Text style={styles.counter}>{name.length}/80</Text>}
      >
        <Input
          value={name}
          onChangeText={setName}
          maxLength={80}
          error={errors.name}
          placeholder={t("createProduct.productNamePlaceholder", {
            defaultValue: "e.g. iPhone 13, 128GB, barely used",
          })}
        />
      </Field>

      <Field
        label={t("createProduct.description", { defaultValue: "Description" })}
        hint={t("createProduct.descHint", {
          defaultValue: "Mention brand, size, age and any flaws. Honest listings sell faster.",
        })}
        right={<Text style={styles.counter}>{description.length}/600</Text>}
      >
        <Input
          multiline
          value={description}
          onChangeText={setDescription}
          maxLength={600}
          textAlignVertical="top"
          placeholder={t("createProduct.descPlaceholder", {
            defaultValue: "Describe your item…",
          })}
        />
      </Field>
    </>
  );
});

/* ──────────────────────────────────────────────────────────────
   Step 3 — Price & condition
   ────────────────────────────────────────────────────────────── */
const PriceStep = memo(function PriceStep({
  price,
  setPrice,
  oldPrice,
  setOldPrice,
  negotiable,
  setNegotiable,
  condition,
  setCondition,
  errors,
  currency,
  t,
}) {
  const cur = Number(price) || 0;
  const old = Number(oldPrice) || 0;
  const pct = old > cur && cur > 0 ? Math.round(((old - cur) / old) * 100) : 0;

  return (
    <>
      <View style={[styles.priceCard, !!errors.price && styles.priceCardError]}>
        <Text style={styles.priceLabel}>
          {t("createProduct.price", { defaultValue: "Your price" })}
        </Text>
        <View style={styles.priceInputRow}>
          <TextInput
            value={price}
            onChangeText={(v) => setPrice(cleanNumber(v))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={BLUE_TINT}
            selectionColor={PRIMARY}
            style={styles.priceInput}
            maxLength={10}
          />
          <Text style={styles.priceCur}>{currency}</Text>
        </View>
        {pct > 0 ? (
          <View style={styles.dealBadge}>
            <Flame size={13} color={OFFER_INK} strokeWidth={2.8} />
            <Text style={styles.dealText}>
              -{pct}% {t("home.off", { defaultValue: "OFF" })}
            </Text>
          </View>
        ) : null}
      </View>
      {errors.price ? <Text style={[styles.fieldError, { marginTop: -6 }]}>{errors.price}</Text> : null}

      <Field
        label={t("createProduct.oldPrice", { defaultValue: "Original price (optional)" })}
        hint={t("createProduct.oldPriceHint", {
          defaultValue: "Add it to show a discount badge on your listing and get featured in Hot deals.",
        })}
        error={errors.oldPrice}
      >
        <View style={styles.inlineInput}>
          <Input
            value={oldPrice}
            onChangeText={(v) => setOldPrice(cleanNumber(v))}
            keyboardType="numeric"
            placeholder="0"
            error={errors.oldPrice}
            style={{ flex: 1 }}
          />
          <View style={styles.curTag}>
            <Text style={styles.curTagText}>{currency}</Text>
          </View>
        </View>
      </Field>

      <View style={styles.toggleRow}>
        <View style={styles.toggleIcon}>
          <Handshake size={18} color={PRIMARY_DARK} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>
            {t("createProduct.negotiable", { defaultValue: "Open to offers" })}
          </Text>
          <Text style={styles.toggleSub}>
            {t("createProduct.negotiableSub", { defaultValue: "Let buyers negotiate the price" })}
          </Text>
        </View>
        <Switch
          value={negotiable}
          onValueChange={setNegotiable}
          trackColor={{ false: BLUE_TINT, true: PRIMARY }}
          thumbColor={WHITE}
          ios_backgroundColor={BLUE_TINT}
        />
      </View>

      <Field
        label={t("createProduct.condition", { defaultValue: "Condition" })}
        error={errors.condition}
      >
        <View style={styles.pillWrap}>
          {CONDITIONS.map(({ value, labelKey, def, Icon }) => {
            const on = condition === value;
            return (
              <TouchableOpacity
                key={value}
                activeOpacity={0.85}
                onPress={() => setCondition(value)}
                style={[styles.pill, on && styles.pillOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Icon size={16} color={on ? WHITE : PRIMARY_DARK} strokeWidth={2.4} />
                <Text style={[styles.pillText, on && styles.pillTextOn]}>
                  {t(labelKey, { defaultValue: def })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Field>
    </>
  );
});

/* ──────────────────────────────────────────────────────────────
   Map picker modal
   ────────────────────────────────────────────────────────────── */
const MapPickerModal = memo(function MapPickerModal({
  visible,
  initial,
  onClose,
  onConfirm,
  insets,
  t,
}) {
  const webRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState(null);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);

  // Build once per opening so tapping doesn't reload the map
  const html = useMemo(
    () => (visible ? buildMapHtml(initial) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible]
  );

  useEffect(() => {
    if (!visible) {
      setReady(false);
      setDraft(null);
      setAddress("");
    }
  }, [visible]);

  const onMessage = useCallback(async (e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "ready") setReady(true);
      if (msg.type === "pin") {
        const lat = Number(msg.latitude);
        const lng = Number(msg.longitude);
        setDraft({ latitude: lat, longitude: lng });
        setAddress("");
        const r = await reverseGeocode(lat, lng);
        setAddress(r.address);
      }
    } catch (_) {}
  }, []);

  const run = (js) => webRef.current?.injectJavaScript(`${js}; true;`);

  const locateMe = async () => {
    try {
      setLocating(true);
      const c = await getGps();
      run(`window.__setPin && window.__setPin(${c.latitude}, ${c.longitude})`);
    } catch (e) {
      Alert.alert(
        t("createProduct.locationTitle", { defaultValue: "Location" }),
        t("createProduct.locationDenied", {
          defaultValue: "We couldn't get your location. Tap the map to drop the pin instead.",
        })
      );
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.mapRoot}>
        {html ? (
          <WebView
            ref={webRef}
            style={styles.mapWeb}
            originWhitelist={["*"]}
            source={{ html, baseUrl: "https://localhost" }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            androidLayerType="hardware"
            setSupportMultipleWindows={false}
            overScrollMode="never"
            bounces={false}
          />
        ) : null}

        {!ready && visible ? (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: BLUE_SOFT }]} pointerEvents="none">
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : null}

        {/* top bar */}
        <View style={[styles.mapTop, { top: insets.top + 10 }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.mapBtn} onPress={onClose} activeOpacity={0.85} hitSlop={8}>
            <X size={20} color={INK} strokeWidth={2.6} />
          </TouchableOpacity>
          <View style={styles.mapChip}>
            <MapPin size={14} color={PRIMARY_DARK} strokeWidth={2.6} />
            <Text style={styles.mapChipText} numberOfLines={1}>
              {t("createProduct.tapToPin", { defaultValue: "Tap the map to drop your pin" })}
            </Text>
          </View>
        </View>

        {/* controls */}
        <View style={[styles.mapControls, { top: insets.top + 70 }]}>
          <TouchableOpacity style={styles.mapBtn} onPress={() => run("window.__zoomIn && window.__zoomIn()")} activeOpacity={0.85}>
            <Plus size={20} color={INK} strokeWidth={2.6} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapBtn} onPress={() => run("window.__zoomOut && window.__zoomOut()")} activeOpacity={0.85}>
            <Minus size={20} color={INK} strokeWidth={2.6} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapBtn} onPress={locateMe} activeOpacity={0.85}>
            {locating ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <LocateFixed size={19} color={PRIMARY_DARK} strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        </View>

        {/* bottom sheet */}
        <View style={[styles.mapSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetGrab} />
          <View style={styles.sheetRow}>
            <View style={styles.sheetIcon}>
              <MapPin size={20} color={PRIMARY_DARK} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>
                {draft
                  ? t("createProduct.pinPlaced", { defaultValue: "Pin placed" })
                  : t("createProduct.noPinYet", { defaultValue: "No pin yet" })}
              </Text>
              <Text style={styles.sheetSub} numberOfLines={2}>
                {draft
                  ? address || `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}`
                  : t("createProduct.tapMapToPlace", { defaultValue: "Tap anywhere on the map." })}
              </Text>
            </View>
          </View>
          <GradientButton
            label={t("createProduct.confirmLocation", { defaultValue: "Confirm location" })}
            Icon={Check}
            disabled={!draft}
            onPress={() => draft && onConfirm(draft)}
          />
        </View>
      </View>
    </Modal>
  );
});

/* ──────────────────────────────────────────────────────────────
   Step 4 — Location
   ────────────────────────────────────────────────────────────── */
const LocationStep = memo(function LocationStep({
  hasLocation,
  latitude,
  longitude,
  address,
  city,
  setCity,
  gettingLocation,
  onGps,
  onOpenMap,
  errors,
  locationError,
  t,
}) {
  return (
    <>
      <View style={styles.locCard}>
        <LinearGradient
          colors={hasLocation ? CTA_GRADIENT : [BLUE_TINT, BLUE_SOFT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.locIcon}
        >
          <MapPin size={26} color={hasLocation ? WHITE : PRIMARY_DARK} strokeWidth={2.3} />
        </LinearGradient>

        <Text style={styles.locTitle}>
          {hasLocation
            ? t("createProduct.pinPlaced", { defaultValue: "Location set" })
            : t("createProduct.noLocationYet", { defaultValue: "Add your location" })}
        </Text>
        <Text style={styles.locSub} numberOfLines={3}>
          {hasLocation
            ? address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            : t("createProduct.locHelp", {
                defaultValue: "Use your GPS or pick the exact spot on the map.",
              })}
        </Text>

        <View style={styles.locActions}>
          <GradientButton
            style={{ flex: 1 }}
            label={
              hasLocation
                ? t("createProduct.updateGps", { defaultValue: "Update" })
                : t("createProduct.useMyLocation", { defaultValue: "Use my location" })
            }
            Icon={LocateFixed}
            iconRight={false}
            loading={gettingLocation}
            onPress={onGps}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenMap}
            style={styles.outlineBtn}
            accessibilityRole="button"
          >
            <MapIcon size={18} color={PRIMARY_DARK} strokeWidth={2.4} />
            <Text style={styles.outlineBtnText}>
              {t("createProduct.pickOnMap", { defaultValue: "Pick on map" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {errors.location ? <Text style={styles.fieldError}>{errors.location}</Text> : null}
      {locationError ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>{locationError}</Text>
        </View>
      ) : null}

      <Field
        label={t("createProduct.city", { defaultValue: "City" })}
        error={errors.city}
        right={
          hasLocation && city.trim() ? (
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>
                {t("createProduct.autoFilled", { defaultValue: "Auto-filled" })}
              </Text>
            </View>
          ) : null
        }
      >
        <Input
          value={city}
          onChangeText={setCity}
          error={errors.city}
          placeholder={t("createProduct.cityPlaceholder", { defaultValue: "Your city" })}
        />
      </Field>

      <View style={styles.tipRow}>
        <Shield size={16} color={PRIMARY_DARK} strokeWidth={2.4} />
        <Text style={styles.tipText}>
          {t("createProduct.locationPrivacy", {
            defaultValue: "Buyers only see your city and approximate distance, never your exact pin.",
          })}
        </Text>
      </View>
    </>
  );
});

/* ──────────────────────────────────────────────────────────────
   Step 5 — Preview + listing strength
   ────────────────────────────────────────────────────────────── */
const ReviewStep = memo(function ReviewStep({
  media,
  name,
  price,
  oldPrice,
  negotiable,
  city,
  categoryName,
  condition,
  description,
  checks,
  score,
  onEdit,
  winW,
  currency,
  t,
}) {
  const cardW = Math.min(Math.round(winW * 0.62), 260);
  const cover = media[0];
  const cur = Number(price) || 0;
  const old = Number(oldPrice) || 0;
  const pct = old > cur && cur > 0 ? Math.round(((old - cur) / old) * 100) : 0;
  const condLabel = CONDITIONS.find((c) => c.value === condition);
  const level =
    score >= 80
      ? t("createProduct.strengthGreat", { defaultValue: "Excellent" })
      : score >= 50
      ? t("createProduct.strengthGood", { defaultValue: "Good" })
      : t("createProduct.strengthBasic", { defaultValue: "Basic" });
  const todo = checks.filter((c) => !c.done);

  return (
    <>
      {/* Live preview — same look as the Home cards */}
      <View style={styles.previewWrap}>
        <View style={{ width: cardW }}>
          <View style={[styles.previewImg, { width: cardW, height: cardW }]}>
            {cover?.type === "video" ? (
              <View style={[styles.fill, styles.center, { backgroundColor: INK }]}>
                <Camera size={32} color={WHITE} />
              </View>
            ) : cover ? (
              <Image source={{ uri: cover.uri }} style={styles.fill} resizeMode="cover" />
            ) : null}
            {pct > 0 ? (
              <View style={styles.offerBadge}>
                <Text style={styles.offerText}>
                  -{pct}% {t("home.off", { defaultValue: "OFF" })}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.previewInfo}>
            {categoryName ? <Text style={styles.pvCategory}>{categoryName}</Text> : null}
            <Text style={styles.pvName} numberOfLines={2}>
              {name.trim() || "—"}
            </Text>
            <View style={styles.pvPriceRow}>
              <Text style={styles.pvPrice}>
                {formatPrice(cur)} <Text style={styles.pvCur}>{currency}</Text>
              </Text>
              {old > cur ? <Text style={styles.pvOld}>{formatPrice(old)}</Text> : null}
            </View>
            <View style={styles.pvMeta}>
              <MapPin size={12} color={PRIMARY} strokeWidth={2.6} />
              <Text style={styles.pvMetaText} numberOfLines={1}>
                {city.trim() || "—"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Listing strength */}
      <View style={styles.strengthCard}>
        <View style={styles.strengthHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.strengthTitle}>
              {t("createProduct.strength", { defaultValue: "Listing strength" })}
            </Text>
            <Text style={styles.strengthSub}>{level}</Text>
          </View>
          <Text style={styles.strengthScore}>{score}%</Text>
        </View>
        <View style={styles.meterTrack}>
          <LinearGradient
            colors={CTA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.meterFill, { width: `${Math.max(score, 6)}%` }]}
          />
        </View>

        {todo.length === 0 ? (
          <View style={styles.doneRow}>
            <Check size={16} color={SUCCESS} strokeWidth={3} />
            <Text style={styles.doneText}>
              {t("createProduct.allGood", { defaultValue: "Your listing is ready to stand out." })}
            </Text>
          </View>
        ) : (
          todo.map((c) => (
            <TouchableOpacity
              key={c.key}
              activeOpacity={0.8}
              onPress={() => onEdit(c.step)}
              style={styles.todoRow}
            >
              <View style={styles.todoDot} />
              <Text style={styles.todoText} numberOfLines={2}>
                {c.label}
              </Text>
              <ChevronRight size={16} color={STRIKE} strokeWidth={2.6} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        {[
          { step: 0, label: t("createProduct.media", { defaultValue: "Photos" }), value: `${media.length}` },
          { step: 1, label: t("createProduct.category", { defaultValue: "Category" }), value: categoryName || "—" },
          {
            step: 2,
            label: t("createProduct.condition", { defaultValue: "Condition" }),
            value: condLabel ? t(condLabel.labelKey, { defaultValue: condLabel.def }) : "—",
          },
          {
            step: 2,
            label: t("createProduct.negotiable", { defaultValue: "Open to offers" }),
            value: negotiable ? t("common.yes", { defaultValue: "Yes" }) : t("common.no", { defaultValue: "No" }),
          },
          { step: 3, label: t("createProduct.city", { defaultValue: "City" }), value: city.trim() || "—" },
          ...(description.trim()
            ? [{ step: 1, label: t("createProduct.description", { defaultValue: "Description" }), value: description.trim() }]
            : []),
        ].map((row, i, arr) => (
          <TouchableOpacity
            key={`${row.label}-${i}`}
            activeOpacity={0.8}
            onPress={() => onEdit(row.step)}
            style={[styles.sumRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={styles.sumLabel}>{row.label}</Text>
            <Text style={styles.sumValue} numberOfLines={2}>
              {row.value}
            </Text>
            <Pencil size={14} color={STRIKE} strokeWidth={2.4} />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
});

/* ==================================================================
   Main screen
   ================================================================== */
export default function CreateProductScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const onTabBarScroll = useTabBarScroll();
  const currency = t("common.currency");

  /* ── Form state ── */
  const [media, setMedia] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryId, setCategoryId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [condition, setCondition] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [mapOpen, setMapOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [stage, setStage] = useState("");
  const [success, setSuccess] = useState(false);

  /* ── Animations ── */
  const contentX = useRef(new Animated.Value(0)).current;
  const contentO = useRef(new Animated.Value(1)).current;
  const titleO = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  const hasLocation = latitude !== null && longitude !== null;
  const selectedCategory = categories.find((c) => c.id === categoryId);

  /* ── Categories ── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/categories");
        if (mounted) setCategories(res.data.categories || res.data.data || []);
      } catch (e) {
        Alert.alert(t("common.error"), "Unable to load categories.");
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [t]);

  /* ── Error helpers ── */
  const clearErr = useCallback(
    (...keys) =>
      setErrors((e) => {
        const n = { ...e };
        keys.forEach((k) => delete n[k]);
        return n;
      }),
    []
  );

  const runShake = useCallback(() => {
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((v) =>
        Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true })
      )
    ).start();
  }, [shake]);

  /* ── Step transition ── */
  const goToStep = useCallback(
    (next) => {
      if (next === step || next < 0 || next > LAST) return;
      const dir = next > step ? 1 : -1;
      Animated.parallel([
        Animated.timing(contentO, { toValue: 0, duration: 130, useNativeDriver: true }),
        Animated.timing(contentX, { toValue: -dir * 28, duration: 130, useNativeDriver: true }),
        Animated.timing(titleO, { toValue: 0, duration: 110, useNativeDriver: true }),
      ]).start(() => {
        setStep(next);
        scrollRef.current?.scrollTo?.({ y: 0, animated: false });
        contentX.setValue(dir * 28);
        Animated.parallel([
          Animated.timing(contentO, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.spring(contentX, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
          Animated.timing(titleO, { toValue: 1, duration: 260, useNativeDriver: true }),
        ]).start();
      });
    },
    [step, contentO, contentX, titleO]
  );

  /* ── Validation ── */
  const validate = useCallback(
    (index) => {
      const e = {};
      if (index === 0 && media.length === 0)
        e.media = t("createProduct.valMedia", { defaultValue: "Add at least one photo." });
      if (index === 1) {
        if (!categoryId) e.category = t("createProduct.valCategory", { defaultValue: "Choose a category." });
        if (name.trim().length < 3) e.name = t("createProduct.valName", { defaultValue: "Enter a title (3+ characters)." });
      }
      if (index === 2) {
        if (!(Number(price) > 0)) e.price = t("createProduct.valPrice", { defaultValue: "Enter a valid price." });
        if (oldPrice && Number(oldPrice) <= Number(price))
          e.oldPrice = t("createProduct.valOldPrice", { defaultValue: "Original price must be higher than your price." });
        if (!condition) e.condition = t("createProduct.valCondition", { defaultValue: "Select the condition." });
      }
      if (index === 3) {
        if (!hasLocation) e.location = t("createProduct.valLocation", { defaultValue: "Set your location to continue." });
        if (!city.trim()) e.city = t("createProduct.valCity", { defaultValue: "Enter your city." });
      }
      setErrors(e);
      if (Object.keys(e).length) {
        runShake();
        return false;
      }
      return true;
    },
    [media.length, categoryId, name, price, oldPrice, condition, hasLocation, city, t, runShake]
  );

  const handleNext = () => {
    if (validate(step)) goToStep(step + 1);
  };
  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
    else navigation.goBack();
  };

  /* ── Media ── */
  const pickMedia = useCallback(async () => {
    if (media.length >= MAX_MEDIA) {
      Alert.alert(
        t("common.holdOn"),
        t("createProduct.maxMediaReached", { max: MAX_MEDIA, defaultValue: "Maximum {{max}} files." })
      );
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
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
    clearErr("media");
  }, [media.length, t, clearErr]);

  const removeMedia = useCallback(
    (i) => setMedia((cur) => cur.filter((_, idx) => idx !== i)),
    []
  );
  const makeCover = useCallback(
    (i) =>
      setMedia((cur) => {
        const next = [...cur];
        const [picked] = next.splice(i, 1);
        return [picked, ...next];
      }),
    []
  );

  /* ── Location ── */
  const applyLocation = useCallback(async (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationError("");
    setErrors((e) => {
      const n = { ...e };
      delete n.location;
      return n;
    });
    const r = await reverseGeocode(lat, lng);
    if (r.city) {
      setCity(r.city);
      setErrors((e) => {
        const n = { ...e };
        delete n.city;
        return n;
      });
    }
    setLocationAddress(r.address || "");
  }, []);

  const useGps = useCallback(async () => {
    try {
      setGettingLocation(true);
      setLocationError("");
      const c = await getGps();
      await applyLocation(c.latitude, c.longitude);
    } catch (e) {
      setLocationError(
        e?.message === "denied"
          ? t("createProduct.gpsDenied", { defaultValue: "Location permission denied. Pick the spot on the map instead." })
          : e?.message === "services"
          ? t("createProduct.gpsOff", { defaultValue: "Location services are off. Turn on GPS or pick on the map." })
          : t("createProduct.gpsFailed", { defaultValue: "Couldn't get your location. Pick the spot on the map instead." })
      );
    } finally {
      setGettingLocation(false);
    }
  }, [applyLocation, t]);

  const confirmMapPin = useCallback(
    async (pin) => {
      setMapOpen(false);
      await applyLocation(pin.latitude, pin.longitude);
    },
    [applyLocation]
  );

  /* ── Listing strength ── */
  const checks = useMemo(
    () => [
      {
        key: "photos",
        step: 0,
        weight: 25,
        done: media.length >= 3,
        label: t("createProduct.chkPhotos", { defaultValue: "Add at least 3 photos" }),
      },
      {
        key: "desc",
        step: 1,
        weight: 25,
        done: description.trim().length >= 40,
        label: t("createProduct.chkDesc", { defaultValue: "Write a description (40+ characters)" }),
      },
      {
        key: "title",
        step: 1,
        weight: 10,
        done: name.trim().length >= 10,
        label: t("createProduct.chkTitle", { defaultValue: "Use a more descriptive title" }),
      },
      {
        key: "old",
        step: 2,
        weight: 15,
        done: Number(oldPrice) > Number(price) && Number(price) > 0,
        label: t("createProduct.chkOld", { defaultValue: "Show the original price to highlight your deal" }),
      },
      {
        key: "loc",
        step: 3,
        weight: 25,
        done: hasLocation,
        label: t("createProduct.chkLoc", { defaultValue: "Pin your location" }),
      },
    ],
    [media.length, description, name, oldPrice, price, hasLocation, t]
  );
  const score = useMemo(
    () => checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0),
    [checks]
  );

  /* ── Publish ── */
  const handlePublish = async () => {
    try {
      setPublishing(true);
      setStage(t("createProduct.stageCreating", { defaultValue: "Creating listing…" }));

      const payload = {
        name: name.trim(),
        price: Number(price),
        category_id: categoryId,
        city: city.trim(),
        latitude,
        longitude,
        condition,
        description: description.trim(),
        negotiable,
      };
      if (Number(oldPrice) > Number(price)) payload.old_price = Number(oldPrice);

      const res = await api.post("/products", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const product = res.data.product || res.data.data;
      if (!product?.id) throw new Error("Product ID was not returned by the server.");

      setStage(t("createProduct.stageUploading", { defaultValue: "Uploading media…" }));
      const form = new FormData();
      media.forEach((item, i) => {
        const uri = item.uri;
        const fileName = item.fileName || uri.split("/").pop() || `media-${Date.now()}-${i}`;
        const mimeType = item.mimeType || (item.type === "video" ? "video/mp4" : "image/jpeg");
        form.append("media[]", { uri, name: fileName, type: mimeType });
      });
      await api.post(`/products/${product.id}/media`, form, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
      Animated.spring(successScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      const errs = error.response?.data?.errors;
      if (errs) Alert.alert(t("common.error"), Object.values(errs).flat().join("\n"));
      else
        Alert.alert(
          t("common.error"),
          error.response?.data?.message || error.message || t("common.somethingWentWrong")
        );
    } finally {
      setPublishing(false);
      setStage("");
    }
  };

  /* ── Reset ── */
  const resetForm = () => {
    setMedia([]);
    setCategoryId(null);
    setName("");
    setDescription("");
    setPrice("");
    setOldPrice("");
    setNegotiable(false);
    setCondition("");
    setCity("");
    setLatitude(null);
    setLongitude(null);
    setLocationAddress("");
    setLocationError("");
    setErrors({});
    setStep(0);
    setSuccess(false);
    successScale.setValue(0);
    contentX.setValue(0);
    contentO.setValue(1);
    titleO.setValue(1);
  };

  /* ==============================================================
     Success
     ============================================================== */
  if (success) {
    return (
      <View style={styles.page}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={HERO_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.successHero, { paddingTop: insets.top + 40 }]}
        >
          <View pointerEvents="none" style={styles.orbA} />
          <View pointerEvents="none" style={styles.orbB} />
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <Check size={46} color={PRIMARY_DARK} strokeWidth={3.4} />
          </Animated.View>
          <Text style={styles.successTitle}>
            {t("createProduct.successTitle", { defaultValue: "Your listing is live!" })}
          </Text>
          <Text style={styles.successSub}>
            {t("createProduct.successSub", { defaultValue: "Buyers near you can find it right now." })}
          </Text>
        </LinearGradient>

        <View style={styles.successBody}>
          <GradientButton
            label={t("createProduct.viewProduct", { defaultValue: "View my listings" })}
            Icon={ArrowRight}
            onPress={() => navigation.navigate("Products")}
          />
          <TouchableOpacity activeOpacity={0.85} onPress={resetForm} style={styles.outlineBtnWide}>
            <Plus size={18} color={PRIMARY_DARK} strokeWidth={2.8} />
            <Text style={styles.outlineBtnText}>
              {t("createProduct.createAnother", { defaultValue: "Sell another item" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ==============================================================
     Main
     ============================================================== */
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <PhotosStep
            media={media}
            error={errors.media}
            onPick={pickMedia}
            onRemove={removeMedia}
            onMakeCover={makeCover}
            winW={winW}
            t={t}
          />
        );
      case 1:
        return (
          <DetailsStep
            categories={categories}
            loadingCategories={loadingCategories}
            categoryId={categoryId}
            setCategoryId={(id) => {
              setCategoryId(id);
              clearErr("category");
            }}
            name={name}
            setName={(v) => {
              setName(v);
              clearErr("name");
            }}
            description={description}
            setDescription={setDescription}
            errors={errors}
            winW={winW}
            t={t}
          />
        );
      case 2:
        return (
          <PriceStep
            price={price}
            setPrice={(v) => {
              setPrice(v);
              clearErr("price", "oldPrice");
            }}
            oldPrice={oldPrice}
            setOldPrice={(v) => {
              setOldPrice(v);
              clearErr("oldPrice");
            }}
            negotiable={negotiable}
            setNegotiable={setNegotiable}
            condition={condition}
            setCondition={(v) => {
              setCondition(v);
              clearErr("condition");
            }}
            errors={errors}
            currency={currency}
            t={t}
          />
        );
      case 3:
        return (
          <LocationStep
            hasLocation={hasLocation}
            latitude={latitude}
            longitude={longitude}
            address={locationAddress}
            city={city}
            setCity={(v) => {
              setCity(v);
              clearErr("city");
            }}
            gettingLocation={gettingLocation}
            onGps={useGps}
            onOpenMap={() => setMapOpen(true)}
            errors={errors}
            locationError={locationError}
            t={t}
          />
        );
      default:
        return (
          <ReviewStep
            media={media}
            name={name}
            price={price}
            oldPrice={oldPrice}
            negotiable={negotiable}
            city={city}
            categoryName={selectedCategory?.name}
            condition={condition}
            description={description}
            checks={checks}
            score={score}
            onEdit={goToStep}
            winW={winW}
            currency={currency}
            t={t}
          />
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <StepperHeader
        step={step}
        insets={insets}
        onClose={handleBack}
        onJump={goToStep}
        titleStyle={{ opacity: titleO }}
        t={t}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
      >
        <Animated.View style={{ opacity: contentO, transform: [{ translateX: contentX }] }}>
          {renderStep()}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step > 0 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => goToStep(step - 1)}
            style={styles.backLink}
            accessibilityRole="button"
          >
            <ChevronLeft size={18} color={MUTED} strokeWidth={2.6} />
            <Text style={styles.backLinkText}>{t("common.back", { defaultValue: "Back" })}</Text>
          </TouchableOpacity>
        ) : null}

        <Animated.View style={{ flex: 1, transform: [{ translateX: shake }] }}>
          {step < LAST ? (
            <GradientButton
              label={t("common.continue", { defaultValue: "Continue" })}
              Icon={ChevronRight}
              onPress={handleNext}
            />
          ) : (
            <GradientButton
              label={
                publishing
                  ? stage
                  : t("createProduct.publishNow", { defaultValue: "Publish listing" })
              }
              Icon={Rocket}
              iconRight={false}
              loading={false}
              disabled={publishing}
              onPress={handlePublish}
            />
          )}
        </Animated.View>
      </View>

      <MapPickerModal
        visible={mapOpen}
        initial={hasLocation ? { latitude, longitude } : null}
        onClose={() => setMapOpen(false)}
        onConfirm={confirmMapPin}
        insets={insets}
        t={t}
      />
    </KeyboardAvoidingView>
  );
}

/* ==================================================================
   Styles
   ================================================================== */
const SOFT_SHADOW = {
  shadowColor: PRIMARY_DARK,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 14,
  elevation: 3,
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  flex: { flex: 1 },
  fill: { width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: PAGE_PADDING, paddingTop: 24, paddingBottom: 28 },

  /* Hero + stepper */
  hero: {
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 24,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
    overflow: "hidden",
  },
  orbA: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -70,
    end: -60,
  },
  orbB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(125,211,252,0.14)",
    bottom: -40,
    start: -30,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  heroEyebrow: { color: ON_HERO_SOFT, fontSize: 13.5, fontWeight: "700", letterSpacing: 0.2 },
  counterPill: {
    minWidth: 54,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  counterText: { color: ON_HERO, fontSize: 14, fontWeight: "900" },
  counterTotal: { color: ON_HERO_SOFT, fontWeight: "700" },
  heroTitle: {
    color: ON_HERO,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 33,
    marginTop: 22,
  },
  heroSub: { color: ON_HERO_SOFT, fontSize: 14, fontWeight: "500", marginTop: 6 },

  stepperRow: { flexDirection: "row", alignItems: "center", marginTop: 22 },
  nodeHit: { alignItems: "center", justifyContent: "center" },
  nodeRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeRingActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  node: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  nodeOn: { backgroundColor: WHITE, borderColor: WHITE },
  nodeActive: { width: 38, height: 38, borderRadius: 19 },
  connTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginHorizontal: -4,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  connFill: { height: "100%", backgroundColor: WHITE, borderRadius: 2 },

  /* Fields */
  field: { marginBottom: 22 },
  fieldHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 14, fontWeight: "800", color: INK, letterSpacing: -0.1 },
  fieldHint: { fontSize: 12.5, fontWeight: "500", color: MUTED, marginTop: 8, lineHeight: 17 },
  fieldError: { fontSize: 12.5, fontWeight: "700", color: DANGER, marginTop: 8 },
  counter: { fontSize: 12, fontWeight: "700", color: STRIKE },
  input: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15.5,
    fontWeight: "600",
    color: INK,
  },
  textarea: { height: 130, paddingTop: 14 },
  inputFocused: { borderColor: PRIMARY },
  inputError: { borderColor: DANGER },

  /* CTA */
  ctaWrap: {
    borderRadius: 28,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  cta: {
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  ctaText: { color: WHITE, fontSize: 16, fontWeight: "900", letterSpacing: 0.1 },
  outlineBtn: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BLUE_SOFT,
    borderWidth: 1.5,
    borderColor: BLUE_TINT,
  },
  outlineBtnWide: {
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BLUE_SOFT,
    borderWidth: 1.5,
    borderColor: BLUE_TINT,
  },
  outlineBtnText: { color: PRIMARY_DARK, fontSize: 14.5, fontWeight: "800" },

  /* Footer */
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: PAGE_BG,
  },
  backLink: { flexDirection: "row", alignItems: "center", height: 56, paddingEnd: 6 },
  backLinkText: { fontSize: 14.5, fontWeight: "800", color: MUTED },

  /* Photos */
  dropZone: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: BLUE_TINT,
    ...SOFT_SHADOW,
  },
  dropIcon: {
    width: 76,
    height: 76,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dropTitle: { fontSize: 18, fontWeight: "900", color: INK, letterSpacing: -0.3 },
  dropHint: { fontSize: 13, fontWeight: "500", color: MUTED, marginTop: 6, textAlign: "center" },
  dropBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: BLUE_SOFT,
  },
  dropBtnText: { fontSize: 13.5, fontWeight: "800", color: PRIMARY_DARK },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: BLUE_SOFT,
  },
  tipText: { flex: 1, fontSize: 12.5, fontWeight: "600", color: INK_SOFT, lineHeight: 18 },

  coverBox: {
    borderRadius: IMG_RADIUS,
    overflow: "hidden",
    backgroundColor: BLUE_TINT,
  },
  videoText: { color: WHITE, fontSize: 12, fontWeight: "800", marginTop: 6 },
  coverBadge: {
    position: "absolute",
    top: 12,
    start: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: OFFER,
  },
  coverBadgeText: { fontSize: 11, fontWeight: "900", color: OFFER_INK },
  countPill: {
    position: "absolute",
    bottom: 12,
    start: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: "rgba(11,27,58,0.62)",
  },
  countPillText: { color: WHITE, fontSize: 11.5, fontWeight: "800" },
  removeBtnLg: {
    position: "absolute",
    top: 12,
    end: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,27,58,0.62)",
  },
  thumbRow: { paddingTop: 12, gap: 10, paddingEnd: 4 },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: BLUE_TINT,
  },
  thumbAdd: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_SOFT,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: BLUE_TINT,
  },
  removeBtnSm: {
    position: "absolute",
    top: 5,
    end: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,27,58,0.7)",
  },

  /* Categories */
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  catTile: { alignItems: "center" },
  catBox: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: BORDER,
  },
  catBoxOn: { borderColor: PRIMARY, backgroundColor: BLUE_SOFT },
  catCheck: {
    position: "absolute",
    top: 7,
    end: 7,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },
  catName: { marginTop: 7, fontSize: 12, fontWeight: "700", color: INK_SOFT, textAlign: "center" },
  catNameOn: { color: PRIMARY_DARK },

  /* Price */
  priceCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 30,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 22,
    ...SOFT_SHADOW,
  },
  priceCardError: { borderColor: DANGER },
  priceLabel: { fontSize: 13, fontWeight: "800", color: MUTED },
  priceInputRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 8, marginTop: 6 },
  priceInput: {
    minWidth: 80,
    fontSize: 46,
    fontWeight: "900",
    color: PRIMARY_DARK,
    letterSpacing: -1.2,
    textAlign: "center",
    padding: 0,
  },
  priceCur: { fontSize: 16, fontWeight: "800", color: MUTED },
  dealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: OFFER,
  },
  dealText: { fontSize: 12, fontWeight: "900", color: OFFER_INK },
  inlineInput: { flexDirection: "row", alignItems: "center", gap: 10 },
  curTag: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_TINT,
  },
  curTagText: { fontSize: 14, fontWeight: "900", color: PRIMARY_DARK },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: WHITE,
    marginBottom: 22,
    ...SOFT_SHADOW,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_TINT,
  },
  toggleTitle: { fontSize: 14.5, fontWeight: "800", color: INK },
  toggleSub: { fontSize: 12, fontWeight: "500", color: MUTED, marginTop: 2 },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  pillOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  pillText: { fontSize: 13.5, fontWeight: "800", color: INK_SOFT },
  pillTextOn: { color: WHITE },

  /* Location */
  locCard: {
    alignItems: "center",
    padding: 22,
    borderRadius: 30,
    backgroundColor: WHITE,
    marginBottom: 16,
    ...SOFT_SHADOW,
  },
  locIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  locTitle: { fontSize: 17, fontWeight: "900", color: INK, letterSpacing: -0.3 },
  locSub: { fontSize: 13, fontWeight: "500", color: MUTED, textAlign: "center", marginTop: 6, lineHeight: 18 },
  locActions: { flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
  warn: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 16,
  },
  warnText: { fontSize: 12.5, fontWeight: "600", color: "#9A3412", lineHeight: 17 },
  autoBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: BLUE_TINT },
  autoBadgeText: { fontSize: 10.5, fontWeight: "900", color: PRIMARY_DARK },

  /* Map modal */
  mapRoot: { flex: 1, backgroundColor: BLUE_SOFT },
  mapWeb: { flex: 1, backgroundColor: BLUE_SOFT },
  mapTop: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    ...SOFT_SHADOW,
    shadowOpacity: 0.18,
  },
  mapChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: WHITE,
    ...SOFT_SHADOW,
    shadowOpacity: 0.18,
  },
  mapChipText: { flex: 1, fontSize: 13, fontWeight: "800", color: INK },
  mapControls: { position: "absolute", end: 16, gap: 10 },
  mapSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 10,
    gap: 14,
    backgroundColor: WHITE,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: INK,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetGrab: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: BLUE_TINT },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_TINT,
  },
  sheetTitle: { fontSize: 15, fontWeight: "900", color: INK },
  sheetSub: { fontSize: 12.5, fontWeight: "500", color: MUTED, marginTop: 2, lineHeight: 17 },

  /* Review */
  previewWrap: { alignItems: "center", marginBottom: 22 },
  previewImg: { borderRadius: IMG_RADIUS, overflow: "hidden", backgroundColor: BLUE_TINT },
  offerBadge: {
    position: "absolute",
    top: 10,
    start: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: OFFER,
  },
  offerText: { fontSize: 10.5, fontWeight: "900", color: OFFER_INK, letterSpacing: 0.2 },
  previewInfo: { paddingTop: 10, paddingHorizontal: 4 },
  pvCategory: { fontSize: 11.5, fontWeight: "700", color: PRIMARY, marginBottom: 2 },
  pvName: { fontSize: 14.5, fontWeight: "700", color: INK, lineHeight: 19, letterSpacing: -0.2 },
  pvPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 6 },
  pvPrice: { fontSize: 16, fontWeight: "900", color: PRIMARY_DARK },
  pvCur: { fontSize: 11, fontWeight: "700", color: MUTED },
  pvOld: { fontSize: 12, fontWeight: "600", color: STRIKE, textDecorationLine: "line-through" },
  pvMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  pvMetaText: { fontSize: 11.5, fontWeight: "600", color: MUTED, flex: 1 },

  strengthCard: {
    padding: 18,
    borderRadius: 26,
    backgroundColor: WHITE,
    marginBottom: 16,
    ...SOFT_SHADOW,
  },
  strengthHead: { flexDirection: "row", alignItems: "center" },
  strengthTitle: { fontSize: 15, fontWeight: "900", color: INK },
  strengthSub: { fontSize: 12.5, fontWeight: "700", color: PRIMARY, marginTop: 2 },
  strengthScore: { fontSize: 26, fontWeight: "900", color: PRIMARY_DARK, letterSpacing: -0.6 },
  meterTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE_TINT,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 6,
  },
  meterFill: { height: "100%", borderRadius: 5 },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  todoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: OFFER },
  todoText: { flex: 1, fontSize: 13, fontWeight: "600", color: INK_SOFT },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8 },
  doneText: { flex: 1, fontSize: 13, fontWeight: "700", color: INK_SOFT },

  summaryCard: {
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: WHITE,
    ...SOFT_SHADOW,
  },
  sumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sumLabel: { fontSize: 13, fontWeight: "600", color: MUTED, width: 96 },
  sumValue: { flex: 1, fontSize: 14, fontWeight: "800", color: INK, textAlign: "right" },

  /* Success */
  successHero: {
    alignItems: "center",
    paddingBottom: 56,
    paddingHorizontal: PAGE_PADDING,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    overflow: "hidden",
  },
  successCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    marginBottom: 24,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  successTitle: { fontSize: 28, fontWeight: "900", color: ON_HERO, letterSpacing: -0.8, textAlign: "center" },
  successSub: { fontSize: 14.5, fontWeight: "500", color: ON_HERO_SOFT, marginTop: 8, textAlign: "center" },
  successBody: { padding: PAGE_PADDING, gap: 12, marginTop: 12 },
});