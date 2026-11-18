import React, {
  memo,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  FlatList,
  Dimensions,
  Animated,
  Easing,
  Platform,
  I18nManager,
  TextInput,
  Keyboard,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  Search,
  SlidersHorizontal,
  Menu,
  ChevronRight,
  Layers,
  Smartphone,
  Shirt,
  Home,
  Dumbbell,
  BookOpen,
  Car,
  Watch,
  Bike,
  Camera,
  Tag,
  MapPin,
  X,
  Flame,
} from "lucide-react-native";

import logo from "../../../assets/applogowhite.png";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { media_URL } from "../../constants/config";
import NotificationBell from "../../components/NotificationBell";
import BannerSlider from "./BannerSlider";

import backgroundimage from "../../../assets/images/imagesell.jpg";
import imageSell from "../../../assets/images/merchandiser.jpg";
import backgroundimage2 from "../../../assets/images/headerbg.jpg";

/* ──────────────────────────────────────────────────────────────
   Theme — blue gradient system
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
const ONLINE = "#22C55E";

const HERO_GRADIENT = [PRIMARY_DEEP, PRIMARY_DARK, SKY];
const CTA_GRADIENT = [PRIMARY_DARK, SKY];
const GLASS = "rgba(255,255,255,0.16)";
const GLASS_BORDER = "rgba(255,255,255,0.28)";
const ON_HERO = "#FFFFFF";
const ON_HERO_SOFT = "rgba(255,255,255,0.82)";

/* ──────────────────────────────────────────────────────────────
   Layout
   ────────────────────────────────────────────────────────────── */
const PAGE_PADDING = 16;
const SCREEN_W = Dimensions.get("window").width;
const SCREEN_H = Dimensions.get("window").height;

const RAIL_GAP = 14;
const GRID_GAP = 14;
const GRID_ROW_GAP = 22;
const IMG_RADIUS = 26; // rounded "squircle" product image

const CAT_TILE_W = 72;
const CAT_GAP = 14;
const CAT_STEP = CAT_TILE_W + CAT_GAP;

const STICKY_THRESHOLD = 150;
const STICKY_HEIGHT = 64;
const STICKY_BTN = 42;

const HERO_RADIUS = 36;

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
const stripSlash = (s) => (s?.endsWith("/") ? s.slice(0, -1) : s || "");

const getMediaUrl = (mediaItem) => {
  if (!mediaItem?.path) return null;
  const path = mediaItem.path.startsWith("/")
    ? mediaItem.path.slice(1)
    : mediaItem.path;
  return `${stripSlash(media_URL)}/storage/${path}`;
};

const getFirstImage = (product) => {
  const media = product?.media;
  if (!media || media.length === 0) return null;
  const first = media.find((m) => m.type === "image") || media[0];
  return getMediaUrl(first);
};

const getCategoryImage = (cat) => {
  if (!cat?.icon) return null;
  const path = cat.icon.startsWith("/") ? cat.icon.slice(1) : cat.icon;
  return `${stripSlash(media_URL)}/storage/${path}`;
};

const getCategoryIcon = (name, isAll) => {
  if (isAll) return Layers;
  const n = (name || "").toLowerCase();
  if (n.includes("electronic") || n.includes("phone") || n.includes("tech"))
    return Smartphone;
  if (
    n.includes("cloth") ||
    n.includes("fashion") ||
    n.includes("wear") ||
    n.includes("shirt")
  )
    return Shirt;
  if (n.includes("home") || n.includes("furniture") || n.includes("house"))
    return Home;
  if (n.includes("sport") || n.includes("gym") || n.includes("fitness"))
    return Dumbbell;
  if (n.includes("book") || n.includes("edu")) return BookOpen;
  if (n.includes("vehicle") || n.includes("car") || n.includes("auto"))
    return Car;
  if (n.includes("watch") || n.includes("jewel")) return Watch;
  if (n.includes("bike") || n.includes("outdoor") || n.includes("cycle"))
    return Bike;
  if (n.includes("camera") || n.includes("photo")) return Camera;
  return Tag;
};

const getOldPrice = (p) =>
  Number(p?.old_price || p?.compare_price || p?.original_price || 0) || 0;

const getDiscountPct = (p) => {
  if (p?.discount_percent) return Math.round(Number(p.discount_percent));
  const old = getOldPrice(p);
  const cur = Number(p?.price || 0);
  if (old > cur && cur > 0) return Math.round(((old - cur) / old) * 100);
  return 0;
};

const toText = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object") return toText(v.name || v.title || v.city);
  return null;
};

const getCity = (p) =>
  toText(p?.city) ||
  toText(p?.city_name) ||
  toText(p?.location?.city) ||
  toText(p?.location) ||
  toText(p?.user?.city) ||
  toText(p?.seller?.city) ||
  null;

const getCategoryName = (p) =>
  toText(p?.category) || toText(p?.category_name) || null;

const formatPrice = (v) => Number(v || 0).toLocaleString();

/* ──────────────────────────────────────────────────────────────
   Section Header
   ────────────────────────────────────────────────────────────── */
const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  showAction = true,
  icon: IconCmp,
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleBlock}>
        <View style={styles.sectionTitleRow}>
          {IconCmp ? (
            <View style={styles.sectionIcon}>
              <IconCmp size={15} color={PRIMARY_DARK} strokeWidth={2.6} />
            </View>
          ) : (
            <View style={styles.sectionBar} />
          )}
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {!!subtitle && (
          <Text style={styles.sectionSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {showAction && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          hitSlop={8}
          style={styles.seeAllBtn}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.seeAllText}>{actionLabel}</Text>
          <ChevronRight
            size={15}
            color={PRIMARY_DARK}
            strokeWidth={2.8}
            style={styles.rtlFlip}
          />
        </TouchableOpacity>
      )}
    </View>
  );
});

/* ──────────────────────────────────────────────────────────────
   Category tile
   ────────────────────────────────────────────────────────────── */
const CategoryTile = memo(function CategoryTile({ item, selected, onPress }) {
  const [failed, setFailed] = useState(false);
  const isAll = item.id === "all";
  const image = isAll ? null : getCategoryImage(item);
  const Icon = getCategoryIcon(item.name, isAll);

  const handle = useCallback(() => onPress(item), [onPress, item]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handle}
      style={styles.categoryTile}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={item.name}
    >
      <View style={[styles.categoryBox, selected && styles.categoryBoxActive]}>
        {image && !failed ? (
          <Image
            source={{ uri: image }}
            style={styles.fill}
            resizeMode="cover"
            resizeMethod="resize"
            fadeDuration={0}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.center]}>
            <Icon
              size={24}
              color={selected ? PRIMARY_DARK : INK_SOFT}
              strokeWidth={2}
            />
          </View>
        )}
      </View>
      <Text
        style={[styles.categoryName, selected && styles.categoryNameActive]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
});

/* ──────────────────────────────────────────────────────────────
   Product card — borderless, rounded square image,
   info stacked underneath on the page background
   ────────────────────────────────────────────────────────────── */
const ProductCard = memo(function ProductCard({
  item,
  onPress,
  width,
  offLabel,
  currency,
  cityFallback,
}) {
  const [failed, setFailed] = useState(false);
  const image = getFirstImage(item);
  const pct = getDiscountPct(item);
  const oldPrice = getOldPrice(item);
  const city = getCity(item) || cityFallback;
  const category = getCategoryName(item);

  const handle = useCallback(() => onPress(item.id), [onPress, item.id]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handle}
      style={{ width }}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      {/* Rounded square image — no border, no card background */}
      <View style={[styles.cardImageBox, { width, height: width }]}>
        {image && !failed ? (
          <Image
            source={{ uri: image }}
            style={styles.fill}
            resizeMode="cover"
            resizeMethod="resize"
            fadeDuration={0}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.center]}>
            <Camera size={32} color={PRIMARY_DARK} />
          </View>
        )}

        {pct > 0 ? (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>
              -{pct}% {offLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Info below the image */}
      <View style={styles.cardInfo}>
        {category ? (
          <Text style={styles.cardCategory} numberOfLines={1}>
            {category}
          </Text>
        ) : null}

        <Text style={styles.cardName} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceCurrent} numberOfLines={1}>
            {formatPrice(item.price)}{" "}
            <Text style={styles.priceCurrency}>{currency}</Text>
          </Text>
          {oldPrice > Number(item.price) ? (
            <Text style={styles.priceOld} numberOfLines={1}>
              {formatPrice(oldPrice)}
            </Text>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <MapPin size={12} color={PRIMARY} strokeWidth={2.6} />
          <Text style={styles.metaText} numberOfLines={1}>
            {city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

/* ──────────────────────────────────────────────────────────────
   Featured deal
   ────────────────────────────────────────────────────────────── */
const FeaturedDeal = memo(function FeaturedDeal({
  item,
  onPress,
  width,
  offLabel,
  currency,
  ctaLabel,
}) {
  const [failed, setFailed] = useState(false);
  const image = getFirstImage(item);
  const pct = getDiscountPct(item);
  const oldPrice = getOldPrice(item);
  const handle = useCallback(() => onPress(item.id), [onPress, item.id]);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handle}
      style={[styles.featured, { width, height: Math.round(width * 0.58) }]}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      {image && !failed ? (
        <Image
          source={{ uri: image }}
          style={styles.fill}
          resizeMode="cover"
          resizeMethod="resize"
          fadeDuration={0}
          onError={() => setFailed(true)}
        />
      ) : (
        <LinearGradient
          colors={HERO_GRADIENT}
          style={[styles.fill, styles.center]}
        >
          <Camera size={40} color={ON_HERO_SOFT} />
        </LinearGradient>
      )}

      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(10,46,158,0)",
          "rgba(10,46,158,0.55)",
          "rgba(6,24,84,0.92)",
        ]}
        locations={[0.25, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {pct > 0 ? (
        <View style={[styles.offerBadge, styles.featuredBadge]}>
          <Flame size={12} color={OFFER_INK} strokeWidth={2.8} />
          <Text style={styles.offerText}>
            {pct}% {offLabel}
          </Text>
        </View>
      ) : null}

      <View style={styles.featuredBottom} pointerEvents="none">
        <View style={styles.featuredTextBlock}>
          <Text style={styles.featuredName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.featuredPriceRow}>
            <Text style={styles.featuredPrice}>
              {formatPrice(item.price)}{" "}
              <Text style={styles.featuredCurrency}>{currency}</Text>
            </Text>
            {oldPrice > Number(item.price) ? (
              <Text style={styles.featuredOld}>{formatPrice(oldPrice)}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.featuredCta}>
          <Text style={styles.featuredCtaText}>{ctaLabel}</Text>
          <ChevronRight
            size={14}
            color={PRIMARY_DARK}
            strokeWidth={3}
            style={styles.rtlFlip}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

/* ──────────────────────────────────────────────────────────────
   Skeletons + separators
   ────────────────────────────────────────────────────────────── */
const RailSkeleton = memo(function RailSkeleton({ cardW }) {
  return (
    <View style={styles.skeletonRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: cardW }}>
          <View
            style={[styles.skeletonImage, { width: cardW, height: cardW }]}
          />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
      ))}
    </View>
  );
});

const RailSeparator = () => <View style={styles.railSeparator} />;
const CatSeparator = () => <View style={styles.catSeparator} />;

const getCatLayout = (_, index) => ({
  length: CAT_STEP,
  offset: CAT_STEP * index,
  index,
});

const productKey = (item) => `p-${item.id}`;
const categoryKey = (item) => `c-${item.id}`;

/* ──────────────────────────────────────────────────────────────
   Product rail (horizontal scroll)
   ────────────────────────────────────────────────────────────── */
const ProductRail = memo(function ProductRail({
  title,
  subtitle,
  data,
  loading,
  onSeeAll,
  onOpen,
  t,
  cardW,
  showSeeAll = true,
  icon,
  header,
}) {
  const offLabel = t("home.off", { defaultValue: "OFF" });
  const currency = t("common.currency");
  const cityFallback = t("home.cityUnknown", { defaultValue: "City not set" });
  const step = cardW + RAIL_GAP;

  const renderItem = useCallback(
    ({ item }) => (
      <ProductCard
        item={item}
        onPress={onOpen}
        width={cardW}
        offLabel={offLabel}
        currency={currency}
        cityFallback={cityFallback}
      />
    ),
    [onOpen, cardW, offLabel, currency, cityFallback]
  );

  if (!loading && data.length === 0 && !header) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        actionLabel={t("home.seeAll", { defaultValue: "See all" })}
        onAction={onSeeAll}
        showAction={showSeeAll}
      />

      {header}

      {loading && data.length === 0 ? (
        <RailSkeleton cardW={cardW} />
      ) : data.length > 0 ? (
        <FlatList
          data={data}
          horizontal
          renderItem={renderItem}
          keyExtractor={productKey}
          ItemSeparatorComponent={RailSeparator}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
          snapToInterval={step}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
        />
      ) : null}
    </View>
  );
});

/* ──────────────────────────────────────────────────────────────
   Search result row
   ────────────────────────────────────────────────────────────── */
const SearchResultRow = memo(function SearchResultRow({
  item,
  onPress,
  currency,
  cityFallback,
}) {
  const [failed, setFailed] = useState(false);
  const image = getFirstImage(item);
  const city = getCity(item) || cityFallback;
  const category = getCategoryName(item);
  const handle = useCallback(() => onPress(item), [onPress, item]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handle}
      style={styles.resultRow}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={styles.resultThumb}>
        {image && !failed ? (
          <Image
            source={{ uri: image }}
            style={styles.fill}
            resizeMode="cover"
            resizeMethod="resize"
            fadeDuration={0}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.fill, styles.center]}>
            <Camera size={20} color={PRIMARY_DARK} />
          </View>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.resultPrice} numberOfLines={1}>
          {formatPrice(item.price)}{" "}
          <Text style={styles.priceCurrency}>{currency}</Text>
        </Text>
        <View style={styles.metaRow}>
          <MapPin size={12} color={PRIMARY} strokeWidth={2.6} />
          <Text style={styles.metaText} numberOfLines={1}>
            {city}
            {category ? ` · ${category}` : ""}
          </Text>
        </View>
      </View>
      <ChevronRight
        size={18}
        color={STRIKE}
        strokeWidth={2.4}
        style={styles.rtlFlip}
      />
    </TouchableOpacity>
  );
});

/* ──────────────────────────────────────────────────────────────
   Search panel
   ────────────────────────────────────────────────────────────── */
const SearchPanel = memo(function SearchPanel({
  query,
  onChangeQuery,
  inputRef,
  results,
  suggested,
  categories,
  onClose,
  onOpenProduct,
  onOpenCategory,
  topInset,
  bottomInset,
  t,
}) {
  const hasQuery = query.trim().length > 0;
  const data = hasQuery ? results : suggested;
  const currency = t("common.currency");
  const cityFallback = t("home.cityUnknown", { defaultValue: "City not set" });

  const renderItem = useCallback(
    ({ item }) => (
      <SearchResultRow
        item={item}
        onPress={onOpenProduct}
        currency={currency}
        cityFallback={cityFallback}
      />
    ),
    [onOpenProduct, currency, cityFallback]
  );

  const header = hasQuery ? null : (
    <View>
      {categories.length > 0 ? (
        <>
          <Text style={styles.panelLabel}>
            {t("home.browseCategories", { defaultValue: "Browse categories" })}
          </Text>
          <View style={styles.chipWrap}>
            {categories.map((c) => (
              <TouchableOpacity
                key={`chip-${c.id}`}
                activeOpacity={0.85}
                onPress={() => onOpenCategory(c)}
                style={styles.chip}
              >
                <Text style={styles.chipText} numberOfLines={1}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
      {suggested.length > 0 ? (
        <Text style={styles.panelLabel}>
          {t("home.popularNow", { defaultValue: "Popular right now" })}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.panel, { paddingTop: topInset + 10 }]}>
      <View style={styles.panelBar}>
        <View style={styles.panelInput}>
          <Search size={20} color={INK_SOFT} strokeWidth={2.3} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={onChangeQuery}
            placeholder={t("home.searchPlaceholder")}
            placeholderTextColor={MUTED}
            style={styles.panelTextInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={PRIMARY}
          />
          {query.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              hitSlop={8}
              onPress={() => onChangeQuery("")}
              style={styles.panelClear}
              accessibilityRole="button"
              accessibilityLabel="Clear"
            >
              <X size={14} color={WHITE} strokeWidth={3} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={8}
          onPress={onClose}
          accessibilityRole="button"
        >
          <Text style={styles.panelCancel}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={productKey}
        ListHeaderComponent={header}
        ListEmptyComponent={
          hasQuery ? (
            <Text style={styles.panelEmpty}>
              {t("home.noResults", {
                defaultValue: "No results for this search",
              })}
            </Text>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.searchListContent,
          { paddingBottom: bottomInset + 32 },
        ]}
        initialNumToRender={8}
        windowSize={7}
      />
    </View>
  );
});

/* ──────────────────────────────────────────────────────────────
   Avatar
   ────────────────────────────────────────────────────────────── */
const Avatar = memo(function Avatar({ uri, initial, size = 46, showOnline }) {
  const s = size;
  const radius = s / 2;

  return (
    <View style={{ width: s, height: s }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.avatarImg,
            { width: s, height: s, borderRadius: radius },
          ]}
          resizeMode="cover"
          resizeMethod="resize"
        />
      ) : (
        <View
          style={[
            styles.avatarImg,
            styles.center,
            styles.avatarFallback,
            { width: s, height: s, borderRadius: radius },
          ]}
        >
          <Text
            style={[
              styles.avatarInitial,
              { fontSize: Math.round(s * 0.4) },
            ]}
          >
            {initial}
          </Text>
        </View>
      )}
      {showOnline && <View style={styles.onlineDot} />}
    </View>
  );
});

/* ──────────────────────────────────────────────────────────────
   Header — layered scrim for readability over photo
   ────────────────────────────────────────────────────────────── */
const Header = memo(function Header({
  insets,
  user,
  avatarUrl,
  initial,
  t,
  bell,
  headerSearchRef,
  onOpenSearch,
  onOpenSettings,
  onOpenExplore,
}) {
  const rtl = I18nManager.isRTL;

  const baseWash = [
    "rgba(10,46,158,0.72)",
    "rgba(29,78,216,0.55)",
    "rgba(56,163,255,0.30)",
  ];

  const sideScrim = [
    "rgba(10,46,158,0.95)",
    "rgba(10,46,158,0.78)",
    "rgba(10,46,158,0.40)",
    "rgba(10,46,158,0.10)",
    "rgba(10,46,158,0)",
  ];

  const topScrim = [
    "rgba(6,24,84,0.55)",
    "rgba(6,24,84,0.18)",
    "rgba(6,24,84,0)",
  ];

  const bottomScrim = ["rgba(6,24,84,0)", "rgba(6,24,84,0.35)"];

  return (
    <View style={styles.header}>
      <ImageBackground
        source={backgroundimage2}
        resizeMode="cover"
        style={[styles.heroPanel, { paddingTop: insets.top + 14 }]}
        imageStyle={styles.heroImageRadius}
      >
        <LinearGradient
          pointerEvents="none"
          colors={baseWash}
          locations={[0, 0.55, 1]}
          start={{ x: rtl ? 1 : 0, y: 0 }}
          end={{ x: rtl ? 0 : 1, y: 1 }}
          style={styles.heroWash}
        />

        <LinearGradient
          pointerEvents="none"
          colors={sideScrim}
          locations={[0, 0.28, 0.55, 0.8, 1]}
          start={{ x: rtl ? 1 : 0, y: 0 }}
          end={{ x: rtl ? 0 : 1, y: 0 }}
          style={styles.heroWash}
        />

        <LinearGradient
          pointerEvents="none"
          colors={topScrim}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.heroWash}
        />

        <LinearGradient
          pointerEvents="none"
          colors={bottomScrim}
          locations={[0, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.heroBottomFade}
        />

        <View style={styles.panelTop}>
          <View style={styles.identityRow}>
            <Avatar uri={avatarUrl} initial={initial} size={46} showOnline />
            <View style={styles.greetingBlock}>
              <Text style={styles.greetingSmall} numberOfLines={1}>
                {t("home.welcomeBack")}
              </Text>
              <Text style={styles.greetingName} numberOfLines={1}>
                {user?.name || t("home.there")}
              </Text>
            </View>
          </View>

          <View style={styles.panelActions}>
            {bell}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenSettings}
              style={styles.roundBtn}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Menu"
            >
              <Menu size={20} color={ON_HERO} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.headline} numberOfLines={2}>
          {t("products.discoverNear")}
        </Text>
      </ImageBackground>

      <View style={styles.searchFloat}>
        <View ref={headerSearchRef} collapsable={false}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.searchBox}
            onPress={onOpenSearch}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Search size={20} color={INK_SOFT} strokeWidth={2.3} />
            <Text style={styles.searchText} numberOfLines={1}>
              {t("home.searchPlaceholder")}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              hitSlop={8}
              onPress={onOpenExplore}
              accessibilityRole="button"
              accessibilityLabel="Filters"
            >
              <LinearGradient
                colors={CTA_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.filterBtn}
              >
                <SlidersHorizontal size={18} color={WHITE} strokeWidth={2.4} />
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

/* ──────────────────────────────────────────────────────────────
   Sticky bar
   ────────────────────────────────────────────────────────────── */
const StickyBar = memo(function StickyBar({
  insets,
  opacity,
  translateY,
  onOpenSearch,
  onOpenSettings,
  searchRef,
  logoSource,
  bell,
}) {
  return (
    <Animated.View
      style={[
        styles.stickyBar,
        { paddingTop: insets.top + 6, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      <LinearGradient
        pointerEvents="none"
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.stickyGradient}
      />
      <View style={styles.stickyInner}>
        <View style={[styles.stickyCol, styles.stickyColStart]}>
          <View style={styles.stickyActions}>
            <View ref={searchRef} collapsable={false}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onOpenSearch}
                style={styles.roundBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Search"
              >
                <Search size={19} color={ON_HERO} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenSettings}
              style={styles.roundBtn}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Menu"
            >
              <Menu size={20} color={ON_HERO} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.stickyCol, styles.stickyColCenter]}>
          <Image
            source={logoSource}
            style={styles.stickyLogo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="App logo"
          />
        </View>

        <View style={[styles.stickyCol, styles.stickyColEnd]}>{bell}</View>
      </View>
    </Animated.View>
  );
});

/* ==================================================================
   Main screen
   ================================================================== */
export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { unreadCount, refresh: refreshNotifications } = useNotifications();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();

  /* Responsive sizes */
  const cardW = Math.min(Math.max(Math.round(winW * 0.44), 150), 220);
  const gridW = Math.floor((winW - PAGE_PADDING * 2 - GRID_GAP) / 2);
  const wideW = winW - PAGE_PADDING * 2;

  /* ── Banner slides ── */
  const slides = useMemo(
    () => [
      {
        key: "discover",
        image: backgroundimage2,
        eyebrow: t("home.discover"),
        title: t("home.discoverTitle"),
        cta: t("home.exploreNow"),
        route: "Explore",
      },
      {
        key: "sell",
        image: imageSell,
        eyebrow: t("home.sellFaster"),
        title: t("home.sellTitle"),
        cta: t("home.postAd"),
        route: "PostAd",
      },
      {
        key: "shop",
        image: backgroundimage,
        eyebrow: t("home.shopLocal"),
        title: t("home.shopTitle"),
        cta: t("home.browseDeals"),
        route: "Explore",
      },
    ],
    [t]
  );

  const sliderRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  /* ── Data state ── */
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  /* ── Search overlay state ── */
  const containerRef = useRef(null);
  const headerSearchRef = useRef(null);
  const stickySearchRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchOpenRef = useRef(false);
  const searchProgress = useRef(new Animated.Value(0)).current;
  const [searchMounted, setSearchMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [screen, setScreen] = useState({ w: SCREEN_W, h: SCREEN_H });
  const [origin, setOrigin] = useState({
    x: SCREEN_W / 2 - STICKY_BTN / 2,
    y: 60,
    w: STICKY_BTN,
    h: STICKY_BTN,
  });

  /* ── Fetch ── */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/products");
      setProducts(res.data.products?.data || res.data.data || []);
    } catch (err) {
      console.log("HOME PRODUCTS ERROR:", err.response?.data || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setCatLoading(true);
      const res = await api.get("/categories");
      setCategories(res.data.categories || res.data.data || []);
    } catch (err) {
      console.log("CATEGORIES ERROR:", err.response?.data || err.message);
    } finally {
      setCatLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
    fetchCategories();
    refreshNotifications?.();
  }, [fetchProducts, fetchCategories, refreshNotifications]);

  /* ── Derived lists ── */
  const categoryRail = useMemo(
    () => [{ id: "all", name: t("common.all") }, ...categories],
    [categories, t]
  );

  const bestSellers = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 10),
    [products]
  );

  const deals = useMemo(
    () =>
      products
        .map((p) => ({ p, pct: getDiscountPct(p) }))
        .filter((x) => x.pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 10)
        .map((x) => x.p),
    [products]
  );

  /* Newest 4 products → 2 rows × 2 columns */
  const newestRows = useMemo(() => {
    const newest = [...products]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0) ||
          (b.id || 0) - (a.id || 0)
      )
      .slice(0, 4);
    return [newest.slice(0, 2), newest.slice(2, 4)].filter(
      (row) => row.length > 0
    );
  }, [products]);

  /* ── Navigation ── */
  const openProduct = useCallback(
    (id) => navigation.navigate("ProductDetails", { productId: id }),
    [navigation]
  );
  const goExplore = useCallback(
    () => navigation.navigate("Explore"),
    [navigation]
  );
  const goNotifications = useCallback(
    () => navigation.getParent()?.navigate("Notifications"),
    [navigation]
  );
  const goSettings = useCallback(
    () => navigation.navigate("Settings"),
    [navigation]
  );

  /* ── Search overlay ── */
  const openSearch = useCallback(
    (ref) => {
      if (searchOpenRef.current) return;
      const run = (rect) => {
        searchOpenRef.current = true;
        setOrigin(rect);
        setSearchMounted(true);
        Animated.timing(searchProgress, {
          toValue: 1,
          duration: 380,
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) searchInputRef.current?.focus();
        });
      };
      const fallback = {
        x: SCREEN_W / 2 - STICKY_BTN / 2,
        y: 60,
        w: STICKY_BTN,
        h: STICKY_BTN,
      };
      const node = ref?.current;
      if (node?.measureInWindow) {
        node.measureInWindow((x, y, w, h) =>
          run(w > 0 && h > 0 ? { x, y, w, h } : fallback)
        );
      } else {
        run(fallback);
      }
    },
    [searchProgress]
  );

  const closeSearch = useCallback(() => {
    if (!searchOpenRef.current) return;
    searchOpenRef.current = false;
    Keyboard.dismiss();
    Animated.timing(searchProgress, {
      toValue: 0,
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setSearchMounted(false);
        setQuery("");
      }
    });
  }, [searchProgress]);

  const openFromHeader = useCallback(
    () => openSearch(headerSearchRef),
    [openSearch]
  );
  const openFromSticky = useCallback(
    () => openSearch(stickySearchRef),
    [openSearch]
  );

  const handleOpenFromSearch = useCallback(
    (product) => {
      closeSearch();
      openProduct(product.id);
    },
    [closeSearch, openProduct]
  );
  const handleOpenCategory = useCallback(
    (cat) => {
      closeSearch();
      navigation.navigate("CategoryProducts", { categoryName: cat.name });
    },
    [closeSearch, navigation]
  );

  useEffect(() => {
    if (!searchMounted) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeSearch();
      return true;
    });
    return () => sub.remove();
  }, [searchMounted, closeSearch]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) =>
        [p?.name, getCategoryName(p), getCity(p)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [products, query]);

  const onSelectCategory = useCallback(
    (item) => {
      setSelectedCategoryId(item.id);
      if (item.id !== "all")
        navigation.navigate("CategoryProducts", { categoryName: item.name });
    },
    [navigation]
  );

  const renderCategory = useCallback(
    ({ item }) => (
      <CategoryTile
        item={item}
        selected={selectedCategoryId === item.id}
        onPress={onSelectCategory}
      />
    ),
    [selectedCategoryId, onSelectCategory]
  );

  const pauseSlider = useCallback(() => sliderRef.current?.pause(), []);
  const resumeSlider = useCallback(() => sliderRef.current?.resume(), []);

  /* ── User derived ── */
  const avatarUrl = user?.avatar_url || user?.avatar || user?.photo || null;
  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();
  const userCity = toText(user?.city);

  const nearLabel = userCity
    ? t("home.nearCity", { city: userCity, defaultValue: "Near {{city}}" })
    : undefined;

  /* ── Animations ── */
  const stickyHidden = insets.top + STICKY_HEIGHT + 24;
  const stickyTranslate = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD, STICKY_THRESHOLD + 40],
    outputRange: [-stickyHidden, 0],
    extrapolate: "clamp",
  });
  const stickyOpacity = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD, STICKY_THRESHOLD + 40],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const ovTop = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [origin.y, 0],
  });
  const ovLeft = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [origin.x, 0],
  });
  const ovRight = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(screen.w - origin.x - origin.w, 0), 0],
  });
  const ovBottom = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(screen.h - origin.y - origin.h, 0), 0],
  });
  const ovRadius = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.min(origin.w, origin.h) / 2, 0],
  });
  const ovBg = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [WHITE, PAGE_BG],
  });
  const ovContentTop = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-origin.y, 0],
  });
  const ovContentLeft = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-origin.x, 0],
  });
  const ovContentOpacity = searchProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });
  const ovSeedOpacity = searchProgress.interpolate({
    inputRange: [0, 0.22],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY]
  );

  /* ── Bell (shared between header + sticky) ── */
  const bell = useMemo(
    () => (
      <View style={styles.roundBtn}>
        <NotificationBell
          unreadCount={unreadCount || 0}
          iconColor={ON_HERO}
          onPress={goNotifications}
        />
      </View>
    ),
    [unreadCount, goNotifications]
  );

  /* ── Shared strings ── */
  const offLabel = t("home.off", { defaultValue: "OFF" });
  const currency = t("common.currency");
  const cityFallback = t("home.cityUnknown", { defaultValue: "City not set" });
  const viewLabel = t("home.view", { defaultValue: "View" });

  const featuredDeal = deals[0];
  const restDeals = deals.slice(1);

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setScreen({ w: width, h: height });
      }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={pauseSlider}
        onMomentumScrollEnd={resumeSlider}
        onScrollEndDrag={resumeSlider}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={WHITE}
            colors={[PRIMARY]}
            progressBackgroundColor={WHITE}
            progressViewOffset={insets.top + 8}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <Header
          insets={insets}
          user={user}
          avatarUrl={avatarUrl}
          initial={initial}
          t={t}
          bell={bell}
          headerSearchRef={headerSearchRef}
          onOpenSearch={openFromHeader}
          onOpenSettings={goSettings}
          onOpenExplore={goExplore}
        />

        <View style={styles.bannerWrap}>
          <BannerSlider
            ref={sliderRef}
            slides={slides}
            onCtaPress={(s) => s.route && navigation.navigate(s.route)}
          />
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <SectionHeader
            title={t("home.categories", { defaultValue: "Categories" })}
            showAction={false}
          />
          {catLoading && categories.length === 0 ? (
            <ActivityIndicator style={styles.loader} color={PRIMARY} />
          ) : (
            <FlatList
              data={categoryRail}
              horizontal
              renderItem={renderCategory}
              keyExtractor={categoryKey}
              getItemLayout={getCatLayout}
              extraData={selectedCategoryId}
              ItemSeparatorComponent={CatSeparator}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
              initialNumToRender={6}
              maxToRenderPerBatch={4}
              windowSize={5}
              removeClippedSubviews={Platform.OS === "android"}
            />
          )}
        </View>

        {/* Hot deals */}
        <ProductRail
          title={t("home.hotDeals", { defaultValue: "Hot deals" })}
          subtitle={t("home.hotDealsSub", {
            defaultValue: "Biggest discounts right now",
          })}
          icon={Flame}
          data={restDeals}
          loading={false}
          onSeeAll={goExplore}
          onOpen={openProduct}
          t={t}
          cardW={cardW}
          header={
            featuredDeal ? (
              <View style={styles.featuredWrap}>
                <FeaturedDeal
                  item={featuredDeal}
                  onPress={openProduct}
                  width={wideW}
                  offLabel={offLabel}
                  currency={currency}
                  ctaLabel={viewLabel}
                />
              </View>
            ) : null
          }
        />

        {/* Best sellers — horizontal scroll */}
        <ProductRail
          title={t("home.bestSellers", { defaultValue: "Best sellers" })}
          subtitle={nearLabel}
          data={bestSellers}
          loading={loading}
          onSeeAll={goExplore}
          onOpen={openProduct}
          t={t}
          cardW={cardW}
        />

        {/* Just added — 2 rows × 2 columns (newest 4) */}
        {newestRows.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t("home.justAdded", { defaultValue: "Just added" })}
              subtitle={t("home.justAddedSub", {
                defaultValue: "Fresh listings from sellers",
              })}
              actionLabel={t("home.seeAll", { defaultValue: "See all" })}
              onAction={goExplore}
            />
            <View style={styles.gridWrap}>
              {newestRows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.gridRow}>
                  {row.map((item) => (
                    <ProductCard
                      key={productKey(item)}
                      item={item}
                      onPress={openProduct}
                      width={gridW}
                      offLabel={offLabel}
                      currency={currency}
                      cityFallback={cityFallback}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {!loading && products.length === 0 ? (
          <Text style={styles.emptyText}>{t("home.noProductsYet")}</Text>
        ) : null}
      </Animated.ScrollView>

      <StickyBar
        insets={insets}
        opacity={stickyOpacity}
        translateY={stickyTranslate}
        onOpenSearch={openFromSticky}
        onOpenSettings={goSettings}
        searchRef={stickySearchRef}
        logoSource={logo}
        bell={bell}
      />

      {searchMounted && (
        <Animated.View
          style={[
            styles.searchOverlay,
            {
              top: ovTop,
              left: ovLeft,
              right: ovRight,
              bottom: ovBottom,
              borderRadius: ovRadius,
              backgroundColor: ovBg,
            },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ovSeed,
              {
                top: (origin.h - 19) / 2,
                left: (origin.w - 19) / 2,
                opacity: ovSeedOpacity,
              },
            ]}
          >
            <Search size={19} color={INK} strokeWidth={2.4} />
          </Animated.View>

          <Animated.View
            style={[
              styles.ovContent,
              {
                width: screen.w,
                height: screen.h,
                top: ovContentTop,
                left: ovContentLeft,
                opacity: ovContentOpacity,
              },
            ]}
          >
            <SearchPanel
              query={query}
              onChangeQuery={setQuery}
              inputRef={searchInputRef}
              results={searchResults}
              suggested={bestSellers.slice(0, 8)}
              categories={categories}
              onClose={closeSearch}
              onOpenProduct={handleOpenFromSearch}
              onOpenCategory={handleOpenCategory}
              topInset={insets.top}
              bottomInset={insets.bottom}
              t={t}
            />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

/* ==================================================================
   Styles
   ================================================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG, overflow: "visible" },
  fill: { width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  rtlFlip: { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },

  /* Header */
  header: { zIndex: 1000, overflow: "visible" },
  heroPanel: {
    paddingHorizontal: 20,
    paddingBottom: 58,
    backgroundColor: PRIMARY_DEEP,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
    overflow: "hidden",
  },
  heroImageRadius: {
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
  },
  heroBottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
  },

  panelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1001,
    overflow: "visible",
  },
  identityRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingEnd: 12,
  },

  /* Avatar */
  avatarImg: { borderWidth: 2, borderColor: WHITE },
  avatarFallback: { backgroundColor: PRIMARY_DEEP },
  avatarInitial: { color: SKY_SOFT, fontWeight: "900" },
  onlineDot: {
    position: "absolute",
    end: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: ONLINE,
    borderWidth: 2,
    borderColor: WHITE,
  },

  greetingBlock: { flex: 1 },
  greetingSmall: { color: ON_HERO_SOFT, fontSize: 12.5, fontWeight: "600" },
  greetingName: {
    color: ON_HERO,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  panelActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 1002,
    elevation: 20,
    overflow: "visible",
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: "visible",
  },
  headline: {
    color: ON_HERO,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.9,
    lineHeight: 34,
    marginTop: 26,
    paddingEnd: 40,
  },

  /* Floating search */
  searchFloat: { marginTop: -28, paddingHorizontal: 20, zIndex: 1003 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 56,
    paddingStart: 18,
    paddingEnd: 6,
    borderRadius: 28,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  searchText: { flex: 1, fontSize: 14.5, fontWeight: "500", color: MUTED },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  bannerWrap: { backgroundColor: PAGE_BG, marginTop: 22 },

  /* Sticky bar */
  stickyBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: PRIMARY_DARK,
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 5000,
    elevation: 30,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  stickyGradient: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  stickyInner: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: STICKY_HEIGHT - 10,
  },
  stickyCol: { flex: 1 },
  stickyColStart: { alignItems: "flex-start" },
  stickyColCenter: { alignItems: "center" },
  stickyColEnd: { alignItems: "flex-end" },
  stickyActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  stickyLogo: { width: 110, height: 38 },

  /* Search overlay */
  searchOverlay: {
    position: "absolute",
    overflow: "hidden",
    zIndex: 9000,
    elevation: 40,
  },
  ovSeed: { position: "absolute" },
  ovContent: { position: "absolute" },
  panel: { flex: 1, backgroundColor: PAGE_BG },
  panelBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 10,
  },
  panelInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  panelTextInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    fontWeight: "600",
    color: INK,
    paddingVertical: 0,
  },
  panelClear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: STRIKE,
  },
  panelCancel: { fontSize: 14.5, fontWeight: "800", color: PRIMARY_DARK },
  panelLabel: {
    fontSize: 13.5,
    fontWeight: "800",
    color: MUTED,
    marginTop: 18,
    marginBottom: 10,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_SOFT,
    borderWidth: 1,
    borderColor: BLUE_TINT,
  },
  chipText: { fontSize: 13, fontWeight: "700", color: PRIMARY_DARK },
  panelEmpty: { textAlign: "center", color: MUTED, fontSize: 14, marginTop: 40 },
  searchListContent: { paddingHorizontal: PAGE_PADDING, paddingTop: 8 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  resultThumb: {
    width: 60,
    height: 60,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: BLUE_TINT,
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14.5, fontWeight: "700", color: INK },
  resultPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: PRIMARY_DARK,
    marginTop: 2,
  },

  /* Categories */
  categoryList: { paddingHorizontal: PAGE_PADDING, paddingBottom: 2 },
  categoryTile: { width: CAT_TILE_W, alignItems: "center" },
  categoryBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: BORDER,
  },
  categoryBoxActive: { borderColor: PRIMARY, backgroundColor: BLUE_SOFT },
  categoryName: {
    marginTop: 8,
    maxWidth: 78,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    color: INK_SOFT,
  },
  categoryNameActive: { color: PRIMARY_DARK },

  /* Sections */
  section: { marginTop: 28 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: PAGE_PADDING,
    marginBottom: 14,
  },
  sectionTitleBlock: { flex: 1 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE_TINT,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: INK,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
    color: MUTED,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: BLUE_SOFT,
  },
  seeAllText: { fontSize: 13, fontWeight: "800", color: PRIMARY_DARK },

  /* Rails + grid */
  railContent: { paddingHorizontal: PAGE_PADDING, paddingVertical: 4 },
  railSeparator: { width: RAIL_GAP },
  catSeparator: { width: CAT_GAP },
  gridWrap: { gap: GRID_ROW_GAP },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
    paddingHorizontal: PAGE_PADDING,
  },

  /* Product card — no border, no background, no shadow */
  cardImageBox: {
    borderRadius: IMG_RADIUS,
    overflow: "hidden",
    backgroundColor: BLUE_TINT,
  },
  offerBadge: {
    position: "absolute",
    top: 10,
    start: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: OFFER,
  },
  offerText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: OFFER_INK,
    letterSpacing: 0.2,
  },
  cardInfo: { paddingTop: 10, paddingHorizontal: 4 },
  cardCategory: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 2,
  },
  cardName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: INK,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 6,
  },
  priceCurrent: { fontSize: 16, fontWeight: "900", color: PRIMARY_DARK },
  priceCurrency: { fontSize: 11, fontWeight: "700", color: MUTED },
  priceOld: {
    fontSize: 12,
    fontWeight: "600",
    color: STRIKE,
    textDecorationLine: "line-through",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  metaText: { fontSize: 11.5, fontWeight: "600", color: MUTED, flex: 1 },

  /* Featured deal */
  featuredWrap: { paddingHorizontal: PAGE_PADDING, marginBottom: 14 },
  featured: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: PRIMARY_DEEP,
  },
  featuredBadge: { top: 14, start: 14 },
  featuredBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
  },
  featuredTextBlock: { flex: 1 },
  featuredName: {
    fontSize: 17,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.3,
  },
  featuredPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 4,
  },
  featuredPrice: {
    fontSize: 22,
    fontWeight: "900",
    color: SKY_SOFT,
    letterSpacing: -0.4,
  },
  featuredCurrency: { fontSize: 13, fontWeight: "700", color: WHITE },
  featuredOld: {
    fontSize: 13,
    fontWeight: "600",
    color: ON_HERO_SOFT,
    textDecorationLine: "line-through",
  },
  featuredCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: WHITE,
  },
  featuredCtaText: { fontSize: 13, fontWeight: "800", color: PRIMARY_DARK },

  /* Skeletons / loaders */
  skeletonRow: {
    flexDirection: "row",
    paddingHorizontal: PAGE_PADDING,
    gap: RAIL_GAP,
  },
  skeletonImage: { borderRadius: IMG_RADIUS, backgroundColor: BLUE_TINT },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: BLUE_TINT,
    marginTop: 8,
    width: "80%",
  },
  skeletonLineShort: { width: "50%" },
  loader: { marginTop: 24 },
  emptyText: {
    textAlign: "center",
    color: MUTED,
    fontSize: 14,
    marginTop: 32,
  },
});