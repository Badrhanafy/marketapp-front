import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Share,
  Alert,
  Modal,
  Pressable,
  PanResponder,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import api from "../../api/client";
import { media_URL } from "../../constants/config";
import {
  ChevronLeft,
  Heart,
  Eye,
  Star,
  MapPin,
  Calendar,
  Tag,
  Play,
  Share2,
  MessageCircle,
  CheckCircle2,
  Clock,
  X,
  Package,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_WIDTH * 0.9;
const SHEET_COLLAPSED = 100;
const SHEET_EXPANDED = 340;

function VideoPlayer({ url, style, nativeControls = true, paused = false }) {
  const player = useVideoPlayer(url, (player) => {
    player.loop = false;
    if (!paused) player.play();
  });
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);
  return (
    <VideoView player={player} style={style} contentFit="cover" nativeControls={nativeControls} />
  );
}

// =========================
// INFINITE MARQUEE
// =========================
function Marquee({ children, duration = 15000 }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [setWidth, setSetWidth] = useState(0);

  useEffect(() => {
    if (setWidth > 0) {
      Animated.loop(
        Animated.timing(translateX, {
          toValue: -setWidth,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [setWidth, duration]);

  return (
    <View style={styles.marqueeTrack}>
      <Animated.View style={[styles.marqueeContent, { transform: [{ translateX }] }]}>
        <View onLayout={(e) => setSetWidth(e.nativeEvent.layout.width)} style={styles.marqueeSet}>
          {children}
        </View>
        <View style={styles.marqueeSet}>{children}</View>
      </Animated.View>
    </View>
  );
}

export default function ProductDetailsScreen({ route, navigation }) {
  const { productId } = route.params;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
  const sheetOpen = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchProduct = useCallback(async () => {
    try {
      const response = await api.get(`/products/${productId}`);
      setProduct(response.data.product || response.data.data || response.data);
    } catch (error) {
      console.log("PRODUCT DETAILS ERROR:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (!loading && product) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    }
  }, [loading, product]);

  // Sheet Pan
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        const base = sheetOpen.current ? SHEET_EXPANDED : SHEET_COLLAPSED;
        const val = base - gs.dy;
        if (val >= SHEET_COLLAPSED && val <= SHEET_EXPANDED) sheetAnim.setValue(val);
      },
      onPanResponderRelease: (_, gs) => {
        const threshold = (SHEET_EXPANDED + SHEET_COLLAPSED) / 2;
        const base = sheetOpen.current ? SHEET_EXPANDED : SHEET_COLLAPSED;
        const val = base - gs.dy;
        if (gs.vy < -0.5 || val > threshold) openSheet();
        else if (gs.vy > 0.5 || val <= threshold) closeSheet();
        else {
          Animated.spring(sheetAnim, {
            toValue: sheetOpen.current ? SHEET_EXPANDED : SHEET_COLLAPSED,
            useNativeDriver: false,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const openSheet = () => {
    sheetOpen.current = true;
    Animated.spring(sheetAnim, { toValue: SHEET_EXPANDED, useNativeDriver: false, friction: 8, tension: 40 }).start();
  };
  const closeSheet = () => {
    sheetOpen.current = false;
    Animated.spring(sheetAnim, { toValue: SHEET_COLLAPSED, useNativeDriver: false, friction: 8, tension: 40 }).start();
  };
  const toggleSheet = () => (sheetOpen.current ? closeSheet() : openSheet());

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT - 110],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const getMediaUrl = useCallback((mediaItem) => {
    if (!mediaItem?.path) return null;
    const base = media_URL?.endsWith("/") ? media_URL.slice(0, -1) : media_URL || "";
    const path = mediaItem.path.startsWith("/") ? mediaItem.path.slice(1) : mediaItem.path;
    return `${base}/storage/${path}`;
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  const getConditionLabel = (condition) => {
    const map = { new: "Brand New", like_new: "Like New", good: "Good", fair: "Fair", poor: "Poor" };
    return map[condition] || condition;
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "available": return { dot: "#B9FA3C", text: "#059669" };
      case "sold": return { dot: "#EF4444", text: "#DC2626" };
      case "reserved": return { dot: "#FBBF24", text: "#D97706" };
      default: return { dot: "#94A3B8", text: "#64748B" };
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${product?.name} for ${product?.price} DH` });
    } catch (err) { console.log(err); }
  };

  const openViewer = (index) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewerViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setViewerIndex(viewableItems[0].index);
  }).current;
  const viewerViewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderMediaItem = ({ item, index }) => {
    const url = getMediaUrl(item);
    if (!url) {
      return (
        <View style={[styles.mediaSlide, styles.noMedia]}>
          <Package size={40} color="#CBD5E1" />
        </View>
      );
    }
    const isVideo = item.type === "video";
    return (
      <TouchableOpacity style={styles.mediaSlide} activeOpacity={0.95} onPress={() => openViewer(index)}>
        {isVideo ? (
          <>
            <VideoPlayer url={url} style={styles.mediaImage} nativeControls={false} paused={true} />
            <View style={styles.videoIndicator} pointerEvents="none">
              <View style={styles.playCircle}>
                <Play size={20} color="#04045E" fill="#04045E" />
              </View>
            </View>
          </>
        ) : (
          <Image source={{ uri: url }} style={styles.mediaImage} resizeMode="cover" />
        )}
      </TouchableOpacity>
    );
  };

  const renderViewerItem = ({ item }) => {
    const url = getMediaUrl(item);
    if (!url) return null;
    const isVideo = item.type === "video";
    return (
      <View style={styles.viewerSlide}>
        {isVideo ? (
          <VideoPlayer url={url} style={styles.viewerMedia} nativeControls={true} />
        ) : (
          <Image source={{ uri: url }} style={styles.viewerMedia} resizeMode="contain" />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#04045E" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Text style={styles.errorTitle}>Product not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const media = product.media || [];
  const statusStyle = getStatusStyle(product.status);

  const marqueeItems = [
    { icon: Eye, value: product.views_count || 0, label: "Views", color: "#04045E" },
    { icon: Heart, value: product.likes_count || 0, label: "Likes", color: "#DC2626" },
    { icon: Star, value: parseFloat(product.rating_avg || 0).toFixed(1), label: "Rating", color: "#04045E" },
    { icon: Calendar, value: formatDate(product.created_at), label: "Posted", color: "#3F6212" },
    { icon: MapPin, value: product.city || "Unknown", label: "Location", color: "#04045E" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

     

      {/* Hero */}
      <View style={styles.heroContainer}>
        {media.length > 0 ? (
          <>
            <Animated.FlatList
              data={media}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderMediaItem}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              scrollEventThrottle={16}
            />
            <LinearGradient colors={["transparent", "rgba(255,255,255,0.95)"]} style={styles.heroFade} />
          </>
        ) : (
          <View style={[styles.mediaSlide, styles.noMedia]}>
            <Package size={48} color="#CBD5E1" />
          </View>
        )}

        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color="#04045E" />
          </TouchableOpacity>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Share2 size={18} color="#04045E" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, isLiked && styles.iconButtonActive]}
              onPress={() => setIsLiked((v) => !v)}
            >
              <Heart size={18} color={isLiked ? "#DC2626" : "#04045E"} fill={isLiked ? "#DC2626" : "none"} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.pagination}>
          {media.map((_, index) => (
            <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      </View>

      {/* Main Content */}
      <Animated.ScrollView
        style={[styles.contentScroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
            <View style={styles.priceBlock}>
              <Text style={styles.priceCurrency}>DH</Text>
              <Text style={styles.price}>{parseFloat(product.price).toFixed(0)}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
              <Text style={[styles.metaText, { color: statusStyle.text }]}>{product.status}</Text>
            </View>
            <Text style={styles.metaDivider}>•</Text>
            <View style={styles.metaItem}>
              <Tag size={12} color="#64748B" />
              <Text style={styles.metaText}>{product.category?.name || "Other"}</Text>
            </View>
            <Text style={styles.metaDivider}>•</Text>
            <View style={styles.metaItem}>
              <CheckCircle2 size={12} color="#64748B" />
              <Text style={styles.metaText}>{getConditionLabel(product.condition)}</Text>
            </View>
          </View>
        </View>

        {/* ===== MARQUEE STATS — Vertical Line Separators ===== */}
        <View style={styles.marqueeSection}>
          <Marquee duration={15000}>
            {marqueeItems.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === marqueeItems.length - 1;
              return (
                <View
                  key={index}
                  style={[
                    styles.marqueeItem,
                    !isLast && styles.marqueeItemBordered,
                  ]}
                >
                  <Icon size={15} color={item.color} strokeWidth={2.5} />
                  <View style={styles.marqueeTextBox}>
                    <Text style={[styles.marqueeValue, { color: item.color }]}>{item.value}</Text>
                    <Text style={styles.marqueeLabel}>{item.label}</Text>
                  </View>
                </View>
              );
            })}
          </Marquee>
        </View>

        {/* Seller */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerCard}>
            <View style={styles.sellerLeft}>
              <View style={styles.avatarRing}>
                <View style={styles.sellerAvatar}>
                  {product.user?.avatar ? (
                    <Image source={{ uri: product.user.avatar }} style={styles.sellerAvatarImg} />
                  ) : (
                    <Text style={styles.sellerAvatarText}>
                      {(product.user?.name || "U").charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.verifiedRing}>
                  <ShieldCheck size={14} color="#04045E" />
                </View>
              </View>
              <View style={styles.sellerTextBox}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{product.user?.name || "Seller"}</Text>
                  <View style={styles.verifiedBadge}>
                    <CheckCircle2 size={10} color="#04045E" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </View>
                <Text style={styles.sellerMeta}>{product.user?.city || "Unknown location"}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.sellerAction} activeOpacity={0.8}>
              <MessageCircle size={18} color="#04045E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descSection}>
          <View style={styles.descHeader}>
            <View style={styles.descAccentLine} />
            <Text style={styles.descTitle}>About this item</Text>
          </View>
          <View style={styles.descBody}>
            <Text style={styles.description} numberOfLines={descExpanded ? undefined : 4}>
              {product.description || "No description available for this product."}
            </Text>
            {(product.description?.length || 0) > 140 && (
              <TouchableOpacity
                style={styles.readMoreBtn}
                onPress={() => setDescExpanded(!descExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.readMoreText}>
                  {descExpanded ? "Show less" : "Read full description"}
                </Text>
                {descExpanded ? (
                  <ChevronUp size={14} color="#04045E" />
                ) : (
                  <ChevronDown size={14} color="#04045E" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Verified Seal */}
        <View style={styles.sealSection}>
          <LinearGradient
            colors={["rgba(185,250,60,0.08)", "rgba(185,250,60,0.02)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sealCard}
          >
            <View style={styles.sealIconWrap}>
              <ShieldCheck size={24} color="#B9FA3C" />
            </View>
            <View style={styles.sealTextBox}>
              <Text style={styles.sealTitle}>Verified Listing</Text>
              <Text style={styles.sealSub}>
                This product has been reviewed and authenticated by our team.
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 140 }} />
      </Animated.ScrollView>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, { height: sheetAnim }]}>
        <View style={styles.sheetHandleBar} {...panResponder.panHandlers}>
          <View style={styles.sheetHandle} />
        </View>

        <View style={styles.sheetCollapsed}>
          <View style={styles.sheetCollapsedLeft}>
            <Text style={styles.sheetLabel}>Total Price</Text>
            <View style={styles.sheetPriceRow}>
              <Text style={styles.sheetPriceValue}>{parseFloat(product.price).toFixed(0)}</Text>
              <Text style={styles.sheetPriceCurrency}> DH</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.sheetCta} activeOpacity={0.85} onPress={openSheet}>
            <MessageCircle size={20} color="#04045E" />
            <Text style={styles.sheetCtaText}>Contact</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sheetExpanded}>
          <Text style={styles.sheetTitle}>Contact Seller</Text>
          <Text style={styles.sheetSubtitle}>Choose your preferred method</Text>

          <View style={styles.sheetActionsRow}>
            <TouchableOpacity
              style={[styles.sheetActionBtn, styles.sheetActionPrimary]}
              activeOpacity={0.8}
              onPress={() => Alert.alert("Chat", "Opening chat...")}
            >
              <MessageCircle size={24} color="#04045E" />
              <Text style={styles.sheetActionLabel}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetActionBtn, styles.sheetActionSecondary]}
              activeOpacity={0.8}
              onPress={() => Alert.alert("Call", "Calling seller...")}
            >
              <Phone size={24} color="#04045E" />
              <Text style={styles.sheetActionLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetActionBtn, styles.sheetActionSecondary]}
              activeOpacity={0.8}
              onPress={() => Alert.alert("Email", "Sending email...")}
            >
              <Mail size={24} color="#04045E" />
              <Text style={styles.sheetActionLabel}>Email</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.sheetCancel} activeOpacity={0.8} onPress={closeSheet}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Fullscreen Viewer */}
      <Modal visible={viewerVisible} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <Pressable style={styles.viewerCloseBtn} onPress={() => setViewerVisible(false)}>
            <X size={22} color="#fff" />
          </Pressable>
          <View style={styles.viewerCounter}>
            <Text style={styles.viewerCounterText}>
              {viewerIndex + 1} <Text style={{ color: "rgba(255,255,255,0.35)" }}>/</Text> {media.length}
            </Text>
          </View>
          <Animated.FlatList
            data={media}
            keyExtractor={(item) => `viewer-${item.id}`}
            renderItem={renderViewerItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onViewableItemsChanged={onViewerViewableItemsChanged}
            viewabilityConfig={viewerViewabilityConfig}
            scrollEventThrottle={16}
          />
          <View style={styles.viewerPagination}>
            {media.map((_, index) => (
              <View key={`v-dot-${index}`} style={[styles.viewerDot, index === viewerIndex && styles.viewerDotActive]} />
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // ── Sticky Header ────────────────────────────────────────
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(4,4,94,0.06)",
  },
  stickyHeaderInner: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stickyBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  stickyTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#04045E" },
  stickyPriceBadge: {
    backgroundColor: "#B9FA3C",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  stickyPrice: { fontSize: 13, fontWeight: "900", color: "#04045E" },

  // ── Hero ──────────────────────────────────────────────────
  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: "#F8FAFC",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  mediaSlide: { width: SCREEN_WIDTH, height: HERO_HEIGHT },
  mediaImage: { width: SCREEN_WIDTH, height: HERO_HEIGHT },
  videoIndicator: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#B9FA3C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#04045E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  noMedia: { alignItems: "center", justifyContent: "center" },
  heroFade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 100 },

  // ── Top Bar ───────────────────────────────────────────────
  topBar: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topBarRight: { flexDirection: "row", gap: 10 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#04045E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconButtonActive: { backgroundColor: "#FEF2F2" },

  // ── Pagination ────────────────────────────────────────────
  pagination: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    zIndex: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { width: 22, borderRadius: 3, backgroundColor: "#B9FA3C" },

  // ── Content ──────────────────────────────────────────────
  contentScroll: { flex: 1, zIndex: 2 },
  contentContainer: { paddingTop: 24, paddingHorizontal: 20 },

  // ── Title ────────────────────────────────────────────────
  titleSection: { marginBottom: 20 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  name: {
    flex: 1,
    fontSize: 26,
    fontWeight: "900",
    color: "#0606a2",
    lineHeight: 32,
    letterSpacing: -0.6,
    paddingRight: 14,
  },
  priceBlock: { alignItems: "flex-end" },
  priceCurrency: { fontSize: 13, fontWeight: "800", color: "#64748B", marginBottom: 2 },
  price: { fontSize: 30, fontWeight: "900", color: "#04045E", letterSpacing: -1 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  metaText: { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  metaDivider: { color: "#CBD5E1", fontSize: 13, fontWeight: "700" },

  // ── Marquee — Clean Vertical Line Separators ─────────────
  marqueeSection: {
    marginBottom: 28,
    marginHorizontal: -20,
    backgroundColor: "#FFFFFF",
  },
  marqueeTrack: {
    overflow: "hidden",
    paddingVertical: 2,
  },
  marqueeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  marqueeSet: {
    flexDirection: "row",
    alignItems: "center",
  },
  marqueeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  marqueeItemBordered: {
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  marqueeTextBox: {
    gap: 2,
  },
  marqueeValue: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  marqueeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Seller ───────────────────────────────────────────────
  sellerSection: { marginBottom: 24 },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f2f3f759",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(11, 11, 208, 0.35)",
  },
  sellerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarRing: {
    position: "relative",
    padding: 3,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#B9FA3C",
  },
  sellerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#04045E",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sellerAvatarImg: { width: 52, height: 52 },
  sellerAvatarText: { color: "#B9FA3C", fontSize: 20, fontWeight: "900" },
  verifiedRing: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#B9FA3C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  sellerTextBox: { gap: 4 },
  sellerNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sellerName: { fontSize: 16, fontWeight: "900", color: "#04045E", letterSpacing: -0.2 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#B9FA3C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedText: { fontSize: 10, fontWeight: "900", color: "#04045E" },
  sellerMeta: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  sellerAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(185,250,60,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Description ───────────────────────────────────────────
  descSection: { marginBottom: 24 },
  descHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  descAccentLine: {
    width: 4,
    height: 28,
    backgroundColor: "#B9FA3C",
    borderRadius: 2,
  },
  descTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#04045E",
    letterSpacing: -0.4,
  },
  descBody: { paddingLeft: 16 },
  description: {
    color: "#475569",
    lineHeight: 26,
    fontSize: 15,
    fontWeight: "500",
  },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(4,4,94,0.04)",
    borderRadius: 10,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#04045E",
  },

  // ── Verified Seal ────────────────────────────────────────
  sealSection: { marginBottom: 20 },
  sealCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "rgba(185,250,60,0.15)",
  },
  sealIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(185,250,60,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sealTextBox: { flex: 1 },
  sealTitle: { fontSize: 15, fontWeight: "900", color: "#04045E", marginBottom: 3 },
  sealSub: { fontSize: 13, fontWeight: "600", color: "#64748B", lineHeight: 18 },

  // ── Bottom Sheet ─────────────────────────────────────────
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#04045E",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(4,4,94,0.06)",
    zIndex: 100,
  },
  sheetHandleBar: { width: "100%", alignItems: "center", paddingVertical: 12 },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E2E8F0" },
  sheetCollapsed: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  sheetCollapsedLeft: { flex: 1 },
  sheetLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sheetPriceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 2 },
  sheetPriceValue: { fontSize: 22, fontWeight: "900", color: "#04045E", letterSpacing: -0.5 },
  sheetPriceCurrency: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  sheetCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#B9FA3C",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#B9FA3C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  sheetCtaText: { color: "#04045E", fontSize: 15, fontWeight: "900" },

  sheetExpanded: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30 },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: "#04045E", textAlign: "center", marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, fontWeight: "600", color: "#94A3B8", textAlign: "center", marginBottom: 24 },
  sheetActionsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  sheetActionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  sheetActionPrimary: {
    backgroundColor: "#B9FA3C",
    borderColor: "rgba(185,250,60,0.3)",
    shadowColor: "#0d0e0c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  sheetActionSecondary: { backgroundColor: "#FAFBFF", borderColor: "rgba(4,4,94,0.08)" },
  sheetActionLabel: { fontSize: 13, fontWeight: "800", color: "#04045E" },
  sheetCancel: { alignItems: "center", paddingVertical: 12, borderRadius: 14, backgroundColor: "#F1F5F9" },
  sheetCancelText: { fontSize: 14, fontWeight: "800", color: "#64748B" },

  // ── Center States ───────────────────────────────────────
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  loadingText: { marginTop: 14, color: "#64748B", fontSize: 15, fontWeight: "600" },
  errorTitle: { fontSize: 18, fontWeight: "800", color: "#04045E", marginBottom: 20 },
  retryButton: { paddingHorizontal: 28, paddingVertical: 13, backgroundColor: "#04045E", borderRadius: 14 },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // ── Fullscreen Viewer ───────────────────────────────────
  viewerContainer: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  viewerSlide: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: "center", alignItems: "center" },
  viewerMedia: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.85 },
  viewerCloseBtn: {
    position: "absolute",
    top: 52,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  viewerCounter: { position: "absolute", top: 60, left: 0, right: 0, alignItems: "center", zIndex: 90 },
  viewerCounterText: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  viewerPagination: {
    position: "absolute",
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    zIndex: 100,
  },
  viewerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  viewerDotActive: { backgroundColor: "#B9FA3C", width: 22, borderRadius: 4 },
});