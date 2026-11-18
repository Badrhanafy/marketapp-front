import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";

import {
  View,
  Text,
  Image,
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
  Linking,
  FlatList,
  TextInput
} from "react-native";

import { VideoView, useVideoPlayer } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import api from "../../api/client";
import { media_URL } from "../../constants/config";

import {
  ChevronLeft,
  Heart,
  Eye,
  MapPin,
  Calendar,
  Tag,
  Play,
  Share2,
  MessageCircle,
  CheckCircle2,
  X,
  Package,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  RotateCcw,
  Flag
} from "lucide-react-native";
import LoadingScreen from "../LoadingScreen";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const HERO_HEIGHT = 380;
const VIEWER_MEDIA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.8);

const SHEET_COLLAPSED = 100;
const SHEET_EXPANDED = 340;

const NAVY = "#04045E";
const LIME = "#B9FA3C";

/* =========================================================
   MEDIA HELPERS (pure functions – no hooks needed)
========================================================= */

// Regex based on purpose: RN's URL polyfill does not implement
// getters like .origin / .hostname reliably.
const getOrigin = (url) => {
  const match = String(url || "")
    .trim()
    .match(/^(https?:\/\/[^/?#]+)/i);
  return match ? match[1] : "";
};

const SERVER_ORIGIN = getOrigin(media_URL);

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp|mkv)(\?.*)?$/i;

const getMediaUrl = (item) => {
  if (!item) return null;

  const raw =
    item.url ||
    item.media_url ||
    item.full_url ||
    item.path ||
    item.file_path ||
    item.filename;

  if (!raw) return null;

  const value = String(raw).trim();

  // Absolute URL
  if (/^https?:\/\//i.test(value)) {
    const match = value.match(
      /^https?:\/\/[^/?#]+(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i
    );

    const host = value.match(/^https?:\/\/([^/?#]+)/i)?.[1] || "";

    // Normalize local API URLs to the Laravel API origin
    if (
      /localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.8\.28/i.test(host)
    ) {
      return `${SERVER_ORIGIN}${match?.[1] || ""}${match?.[2] || ""}${match?.[3] || ""}`;
    }

    return value;
  }

  // Relative path
  const cleanPath = value
    .replace(/^\/+/, "")
    .replace(/^storage\//i, "");

  return `${SERVER_ORIGIN}/storage/${cleanPath}`;
};

const isVideoItem = (item, url) =>
  item?.type === "video" ||
  String(item?.mime_type || item?.mime || "").startsWith("video/") ||
  VIDEO_EXT.test(url || "");

/* =========================================================
   IMAGE WITH LOADER + ERROR / RETRY
========================================================= */

function MediaImage({ uri, style, resizeMode = "cover" }) {
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus("loading");
    setAttempt(0);
  }, [uri]);

  return (
    <View style={[style, styles.mediaBox]}>
      {status !== "error" && (
        <Image
          key={attempt}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onLoad={() => setStatus("ok")}
          onError={(e) => {
            console.log("IMAGE ERROR:", uri, e?.nativeEvent?.error);
            setStatus("error");
          }}
        />
      )}

      {status === "loading" && (
        <View style={styles.mediaOverlay} pointerEvents="none">
          <ActivityIndicator color={NAVY} />
        </View>
      )}

      {status === "error" && (
        <TouchableOpacity
          style={styles.mediaOverlay}
          activeOpacity={0.8}
          onPress={() => {
            setStatus("loading");
            setAttempt((a) => a + 1);
          }}
        >
          <Package size={36} color="#94A3B8" />
          <View style={styles.retryPill}>
            <RotateCcw size={13} color={NAVY} />
            <Text style={styles.retryPillText}>Retry</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* =========================================================
   VIDEO PLAYER
========================================================= */

function VideoPlayer({
  url,
  style,
  nativeControls = true,
  paused = false,
  muted = false,
}) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = muted;
  });

  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "error") {
        console.log("VIDEO ERROR:", url, error?.message || error);
      }
    });
    return () => sub.remove();
  }, [player, url]);

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={nativeControls ? "contain" : "cover"}
      nativeControls={nativeControls}
    />
  );
}

/* =========================================================
   MARQUEE
========================================================= */

function Marquee({ children, duration = 15000 }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [setWidth, setSetWidth] = useState(0);

  useEffect(() => {
    if (setWidth <= 0) return;

    translateX.setValue(0);

    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -setWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [setWidth, duration, translateX]);

  return (
    <View style={styles.marqueeTrack}>
      <Animated.View
        style={[styles.marqueeContent, { transform: [{ translateX }] }]}
      >
        <View
          onLayout={(e) => setSetWidth(e.nativeEvent.layout.width)}
          style={styles.marqueeSet}
        >
          {children}
        </View>
        <View style={styles.marqueeSet}>{children}</View>
      </Animated.View>
    </View>
  );
}

/* =========================================================
   PRODUCT DETAILS
========================================================= */

export default function ProductDetailsScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { productId } = route.params;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [chatLoading, setChatLoading] = useState(false);
const [reportVisible, setReportVisible] = useState(false);
const [reportReason, setReportReason] = useState("");
const [reportDescription, setReportDescription] = useState("");
const [reportLoading, setReportLoading] = useState(false);

const reportReasons = [
  { value: "scam", label: "Scam or fraud" },
  { value: "fake_identity", label: "Fake identity" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate_behavior", label: "Inappropriate behavior" },
  { value: "spam", label: "Spam" },
  { value: "suspicious_account", label: "Suspicious account" },
  { value: "other", label: "Other" },
];

const submitSellerReport = async () => {
  if (!sellerId || !reportReason || reportLoading) return;

  try {
    setReportLoading(true);

    await api.post("/user-reports", {
      reported_user_id: Number(sellerId),
      reason: reportReason,
      description: reportDescription.trim() || null,
    });

    setReportVisible(false);
    setReportReason("");
    setReportDescription("");

    Alert.alert(
      "Report submitted",
      "Thank you. Our team will review your report."
    );
  } catch (error) {
    console.log(
      "SELLER REPORT ERROR:",
      error.response?.data || error.message
    );

    Alert.alert(
      "Unable to submit report",
      error.response?.data?.message ||
        "Something went wrong. Please try again."
    );
  } finally {
    setReportLoading(false);
  }
};
  /* ---------------- animations ---------------- */

  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
  const sheetOpen = useRef(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  /* ---------------- fetch ---------------- */

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${productId}`);
      const p = response.data?.product;

      setProduct(p);
      setIsLiked(p?.is_liked === true);
      setLikesCount(Number(p?.likes_count ?? 0));
    } catch (error) {
      console.log(
        "PRODUCT DETAILS ERROR:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (!loading && product) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, product, fadeAnim]);

  /* ---------------- media list (resolved once) ---------------- */

  const mediaList = useMemo(() => {
    const raw = Array.isArray(product?.media) ? product.media : [];

    return raw
      .map((item, i) => {
        const url = getMediaUrl(item);
        return {
          key: String(item?.id ?? `m-${i}`),
          url,
          isVideo: isVideoItem(item, url),
        };
      })
      .filter((m) => !!m.url);
  }, [product]);
console.log("MEDIA CONFIG:", media_URL);
console.log("MEDIA LIST:", mediaList);
console.log("SERVER ORIGIN:", SERVER_ORIGIN);
  /* ---------------- open chat ---------------- */

  const openChat = useCallback(async () => {
    if (chatLoading) return;

    const currentProductId = product?.id ? Number(product.id) : null;
    const currentSellerId = product?.user?.id ?? product?.user_id ?? null;

    if (!currentProductId) {
      Alert.alert(
        t("common.error"),
        t("productDetails.cantOpenConv", "Product information is not available.")
      );
      return;
    }

    if (!currentSellerId) {
      Alert.alert(
        t("common.error"),
        t(
          "productDetails.sellerUnavailable",
          "Seller information is not available."
        )
      );
      return;
    }

    setChatLoading(true);

    try {
      // Conversation is ONLY buyer <-> seller (no product_id here)
      const response = await api.post("/conversations", {
        seller_id: Number(currentSellerId),
      });

      const conversation =
        response.data?.conversation ?? response.data?.data ?? null;

      const conversationId =
        conversation?.id ??
        response.data?.conversation_id ??
        response.data?.id ??
        null;

      if (!conversationId) {
        throw new Error("Conversation ID was not returned by the server.");
      }

      navigation.navigate("Chat", {
        conversationId: Number(conversationId),
        productId: currentProductId,
        sellerId: Number(currentSellerId),
        product,
        fromProductDetails: true,
      });
    } catch (error) {
      console.log(
        "CREATE / OPEN CHAT ERROR:",
        error.response?.data || error.message || error
      );

      if (error.response?.status === 401) {
        Alert.alert(
          t("productDetails.signInRequired"),
          t("productDetails.signInToContact")
        );
        return;
      }

      if (error.response?.status === 422) {
        Alert.alert(
          t("productDetails.cannotStartChat"),
          error.response?.data?.message || t("productDetails.invalidChatData")
        );
        return;
      }

      Alert.alert(
        t("productDetails.chatError"),
        error.response?.data?.message || t("productDetails.cantOpenConv")
      );
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, product, navigation, t]);

  /* ---------------- like ---------------- */

  const runHeartPop = () => {
    heartScale.setValue(0.8);
    Animated.spring(heartScale, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const toggleLike = useCallback(async () => {
    if (likeLoading) return;

    const previousLiked = isLiked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;

    setIsLiked(nextLiked);
    setLikesCount(previousCount + (nextLiked ? 1 : -1));
    runHeartPop();
    setLikeLoading(true);

    try {
      const response = await api.post(`/products/${productId}/like`);
      setIsLiked(response.data?.liked === true);
      setLikesCount(Number(response.data?.likes_count ?? 0));
    } catch (error) {
      console.log("LIKE ERROR:", error.response?.data || error.message);

      setIsLiked(previousLiked);
      setLikesCount(previousCount);

      if (error.response?.status === 401) {
        Alert.alert(
          t("productDetails.signInRequired"),
          t("productDetails.signInToLike")
        );
      } else {
        Alert.alert(t("common.error"), t("productDetails.likeError"));
      }
    } finally {
      setLikeLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likeLoading, isLiked, likesCount, productId, t]);

  /* ---------------- bottom sheet ---------------- */

  const openSheet = () => {
    sheetOpen.current = true;
    Animated.spring(sheetAnim, {
      toValue: SHEET_EXPANDED,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  const closeSheet = () => {
    sheetOpen.current = false;
    Animated.spring(sheetAnim, {
      toValue: SHEET_COLLAPSED,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,

      onPanResponderMove: (_, gs) => {
        const base = sheetOpen.current ? SHEET_EXPANDED : SHEET_COLLAPSED;
        const value = base - gs.dy;

        if (value >= SHEET_COLLAPSED && value <= SHEET_EXPANDED) {
          sheetAnim.setValue(value);
        }
      },

      onPanResponderRelease: (_, gs) => {
        const threshold = (SHEET_EXPANDED + SHEET_COLLAPSED) / 2;
        const base = sheetOpen.current ? SHEET_EXPANDED : SHEET_COLLAPSED;
        const value = base - gs.dy;

        if (gs.vy < -0.5 || value > threshold) {
          openSheet();
        } else {
          closeSheet();
        }
      },
    })
  ).current;

  /* ---------------- helpers ---------------- */

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getConditionLabel = (condition) => {
    const map = {
      new: t("products.conditions.new", "New"),
      like_new: t("products.conditions.like_new", "Like New"),
      good: t("products.conditions.good", "Good"),
      fair: t("products.conditions.fair", "Fair"),
      poor: t("products.conditions.poor", "Poor"),
    };
    return map[condition] || condition;
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return { dot: LIME, text: "#059669" };
      case "sold":
        return { dot: "#EF4444", text: "#DC2626" };
      case "reserved":
        return { dot: "#FBBF24", text: "#D97706" };
      default:
        return { dot: "#94A3B8", text: "#64748B" };
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${product?.name} - ${product?.price} DH`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleCall = () => {
    const phone = product?.user?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert(
        t("productDetails.call", "Call"),
        t("productDetails.noPhone", "The seller has not shared a phone number.")
      );
    }
  };

  const handleEmail = () => {
    const email = product?.user?.email;
    if (email) {
      Linking.openURL(
        `mailto:${email}?subject=${encodeURIComponent(product?.name || "")}`
      );
    } else {
      Alert.alert(
        t("productDetails.email", "Email"),
        t("productDetails.noEmail", "The seller has not shared an email.")
      );
    }
  };

  /* ---------------- viewer ---------------- */

  const openViewer = (index) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const onHeroScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: false,
      }),
    [scrollX]
  );

  const onHeroMomentumEnd = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  }, []);

  const onViewerMomentumEnd = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setViewerIndex(index);
  }, []);

  const getItemLayout = useCallback(
    (_, index) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  /* ---------------- media renderers ---------------- */

  const renderMediaItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.mediaSlide}
      activeOpacity={0.95}
      onPress={() => openViewer(index)}
    >
      {item.isVideo ? (
        <>
          <VideoPlayer
            url={item.url}
            style={styles.mediaFill}
            nativeControls={false}
            paused
            muted
          />
          <View style={styles.videoIndicator} pointerEvents="none">
            <View style={styles.playCircle}>
              <Play size={20} color={NAVY} fill={NAVY} />
            </View>
          </View>
        </>
      ) : (
        <MediaImage uri={item.url} style={styles.mediaFill} />
      )}
    </TouchableOpacity>
  );

  const renderViewerItem = ({ item, index }) => (
    <View style={styles.viewerSlide}>
      {item.isVideo ? (
        <VideoPlayer
          url={item.url}
          style={styles.viewerMedia}
          nativeControls
          paused={index !== viewerIndex}
        />
      ) : (
        <MediaImage
          uri={item.url}
          style={styles.viewerMedia}
          resizeMode="contain"
        />
      )}
    </View>
  );

  /* ---------------- loading / not found ---------------- */

  if (loading) {
    return (
      <View style={styles.center}>
       <View style={{width:100}}>
            <LoadingScreen visible={loading} />
       </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Text style={styles.errorTitle}>{t("productDetails.notFound")}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryText}>{t("productDetails.goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  

  /* ---------------- data ---------------- */

  const statusStyle = getStatusStyle(product.status);
  const sellerId = product?.user?.id ?? product?.user_id ?? null;

  const marqueeItems = [
    {
      icon: Eye,
      value: product.views_count || 0,
      label: t("productDetails.views"),
      color: NAVY,
    },
    {
      icon: Heart,
      value: likesCount,
      label: t("productDetails.likes"),
      color: "#DC2626",
    },
    {
      icon: Calendar,
      value: formatDate(product.created_at),
      label: t("productDetails.posted"),
      color: "#3F6212",
    },
    {
      icon: MapPin,
      value: product.city || t("home.all", "Unknown"),
      label: t("productDetails.location"),
      color: NAVY,
    },
  ];

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ================= HERO ================= */}

      <View style={styles.heroContainer}>
        {mediaList.length > 0 ? (
          <>
            <FlatList
              data={mediaList}
              keyExtractor={(item) => item.key}
              renderItem={renderMediaItem}
              horizontal
              pagingEnabled
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              getItemLayout={getItemLayout}
              onScroll={onHeroScroll}
              onMomentumScrollEnd={onHeroMomentumEnd}
              scrollEventThrottle={16}
              style={styles.heroList}
              initialNumToRender={2}
              windowSize={3}
            />

            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.95)"]}
              style={styles.heroFade}
              pointerEvents="none"
            />
          </>
        ) : (
          <View style={[styles.mediaSlide, styles.noMedia]}>
            <Package size={48} color="#CBD5E1" />
          </View>
        )}

        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={22} color={NAVY} />
          </TouchableOpacity>

          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Share2 size={18} color={NAVY} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleLike}
              disabled={likeLoading}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Heart
                  size={20}
                  color={isLiked ? "#DC2626" : NAVY}
                  fill={isLiked ? "#DC2626" : "none"}
                  strokeWidth={2}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* PAGINATION (animated dots) */}
        {mediaList.length > 1 && (
          <View style={styles.pagination} pointerEvents="none">
            {mediaList.map((m, index) => {
              const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
              ];

              const width = scrollX.interpolate({
                inputRange,
                outputRange: [6, 22, 6],
                extrapolate: "clamp",
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.45, 1, 0.45],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={m.key}
                  style={[styles.dot, { width, opacity }]}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* ================= MAIN CONTENT ================= */}

      <Animated.ScrollView
        style={[styles.contentScroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* TITLE */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>

            <View style={styles.priceBlock}>
              <Text style={styles.priceCurrency}>DH</Text>
              <Text style={styles.price}>
                {parseFloat(product.price).toFixed(0)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <View
                style={[styles.statusDot, { backgroundColor: statusStyle.dot }]}
              />
              <Text style={[styles.metaText, { color: statusStyle.text }]}>
                {product.status
                  ? t(`products.status.${product.status.toLowerCase()}`, {
                      defaultValue: product.status,
                    })
                  : ""}
              </Text>
            </View>

            <Text style={styles.metaDivider}>•</Text>

            <View style={styles.metaItem}>
              <Tag size={12} color="#64748B" />
              <Text style={styles.metaText}>
                {product.category?.name || t("common.other", "Other")}
              </Text>
            </View>

            <Text style={styles.metaDivider}>•</Text>

            <View style={styles.metaItem}>
              <CheckCircle2 size={12} color="#64748B" />
              <Text style={styles.metaText}>
                {getConditionLabel(product.condition)}
              </Text>
            </View>
          </View>
        </View>

        {/* MARQUEE */}
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
                    <Text style={[styles.marqueeValue, { color: item.color }]}>
                      {item.value}
                    </Text>
                    <Text style={styles.marqueeLabel}>{item.label}</Text>
                  </View>
                </View>
              );
            })}
          </Marquee>
        </View>

        {/* SELLER */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerCard}>
            <View style={styles.sellerLeft}>
              <View style={styles.avatarRing}>
                <View style={styles.sellerAvatar}>
                  {product.user?.avatar ? (
                    <Image
                      source={{ uri: product.user.avatar }}
                      style={styles.sellerAvatarImg}
                    />
                  ) : (
                    <Text style={styles.sellerAvatarText}>
                      {(product.user?.name || "U").charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.verifiedRing}>
                  <ShieldCheck size={14} color={NAVY} />
                </View>
              </View>

              <View style={styles.sellerTextBox}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>
                    {product.user?.name ||
                      t("productDetails.seller", "Seller")}
                  </Text>

                  <View style={styles.verifiedBadge}>
                    <CheckCircle2 size={10} color={NAVY} />
                    <Text style={styles.verifiedText}>
                      {t("productDetails.verified", "Verified")}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sellerMeta}>
                  {product.user?.city ||
                    t("productDetails.unknownLocation", "Unknown location")}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.sellerAction,
                !sellerId && styles.sellerActionDisabled,
              ]}
              activeOpacity={0.8}
              disabled={chatLoading || !sellerId}
              onPress={openChat}
            >
              {chatLoading ? (
                <ActivityIndicator size="small" color={NAVY} />
              ) : (
                <MessageCircle size={18} color={NAVY} />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "flex-end",
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
  }}
  activeOpacity={0.7}
  onPress={() => setReportVisible(true)}
>
  <Flag size={15} color="#DC2626" />
  <Text style={{
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
  }}>
    Report Seller
  </Text>
</TouchableOpacity>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.descSection}>
          <View style={styles.descHeader}>
            <View style={styles.descAccentLine} />
            <Text style={styles.descTitle}>
              {t("productDetails.aboutItem", "About this item")}
            </Text>
          </View>

          <View style={styles.descBody}>
            <Text
              style={styles.description}
              numberOfLines={descExpanded ? undefined : 4}
            >
              {product.description ||
                t(
                  "productDetails.noDescription",
                  "No description available for this product."
                )}
            </Text>

            {(product.description?.length || 0) > 140 && (
              <TouchableOpacity
                style={styles.readMoreBtn}
                onPress={() => setDescExpanded(!descExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.readMoreText}>
                  {descExpanded
                    ? t("productDetails.showLess", "Show less")
                    : t("productDetails.readFull", "Read full description")}
                </Text>

                {descExpanded ? (
                  <ChevronUp size={14} color={NAVY} />
                ) : (
                  <ChevronDown size={14} color={NAVY} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* VERIFIED */}
        <View style={styles.sealSection}>
          <LinearGradient
            colors={["rgba(185,250,60,0.08)", "rgba(185,250,60,0.02)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sealCard}
          >
            <View style={styles.sealIconWrap}>
              <ShieldCheck size={24} color={LIME} />
            </View>

            <View style={styles.sealTextBox}>
              <Text style={styles.sealTitle}>
                {t("productDetails.verifiedListing", "Verified Listing")}
              </Text>
              <Text style={styles.sealSub}>
                {t(
                  "productDetails.verifiedDesc",
                  "This product has been reviewed and authenticated by our team."
                )}
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 140 }} />
      </Animated.ScrollView>

      {/* ================= BOTTOM SHEET ================= */}

      <Animated.View style={[styles.sheet, { height: sheetAnim }]}>
        <View style={styles.sheetHandleBar} {...panResponder.panHandlers}>
          <View style={styles.sheetHandle} />
        </View>

        {/* COLLAPSED */}
        <View style={styles.sheetCollapsed}>
          <View style={styles.sheetCollapsedLeft}>
            <Text style={styles.sheetLabel}>
              {t("productDetails.totalPrice", "Total Price")}
            </Text>

            <View style={styles.sheetPriceRow}>
              <Text style={styles.sheetPriceValue}>
                {parseFloat(product.price).toFixed(0)}
              </Text>
              <Text style={styles.sheetPriceCurrency}> DH</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sheetCta}
            activeOpacity={0.85}
            disabled={chatLoading}
            onPress={openSheet}
          >
            <MessageCircle size={20} color={NAVY} />
            <Text style={styles.sheetCtaText}>
              {t("productDetails.contact", "Contact")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* EXPANDED */}
        <View style={styles.sheetExpanded}>
          <Text style={styles.sheetTitle}>
            {t("productDetails.contactSeller", "Contact Seller")}
          </Text>

          <Text style={styles.sheetSubtitle}>
            {t("productDetails.chooseMethod", "Choose your preferred method")}
          </Text>

          <View style={styles.sheetActionsRow}>
            <TouchableOpacity
              style={[styles.sheetActionBtn, styles.sheetActionPrimary]}
              activeOpacity={0.8}
              disabled={chatLoading || !sellerId}
              onPress={openChat}
            >
              {chatLoading ? (
                <ActivityIndicator size="small" color={NAVY} />
              ) : (
                <MessageCircle size={24} color={NAVY} />
              )}
              <Text style={styles.sheetActionLabel}>
                {chatLoading
                  ? t("productDetails.openingChat", "Opening...")
                  : t("productDetails.chat", "Chat")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetActionBtn, styles.sheetActionSecondary]}
              activeOpacity={0.8}
              onPress={handleCall}
            >
              <Phone size={24} color={NAVY} />
              <Text style={styles.sheetActionLabel}>
                {t("productDetails.call", "Call")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetActionBtn, styles.sheetActionSecondary]}
              activeOpacity={0.8}
              onPress={handleEmail}
            >
              <Mail size={24} color={NAVY} />
              <Text style={styles.sheetActionLabel}>
                {t("productDetails.email", "Email")}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.sheetCancel}
            activeOpacity={0.8}
            onPress={closeSheet}
          >
            <Text style={styles.sheetCancelText}>
              {t("common.cancel", "Cancel")}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ================= FULLSCREEN VIEWER ================= */}

      <Modal
        visible={viewerVisible}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />

          <FlatList
            data={mediaList}
            keyExtractor={(item) => `viewer-${item.key}`}
            renderItem={renderViewerItem}
            extraData={viewerIndex}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(
              viewerIndex,
              Math.max(mediaList.length - 1, 0)
            )}
            getItemLayout={getItemLayout}
            onMomentumScrollEnd={onViewerMomentumEnd}
            style={styles.viewerList}
            windowSize={3}
          />

          <Pressable
            style={styles.viewerCloseBtn}
            onPress={() => setViewerVisible(false)}
          >
            <X size={22} color="#fff" />
          </Pressable>

          <View style={styles.viewerCounter} pointerEvents="none">
            <Text style={styles.viewerCounterText}>
              {viewerIndex + 1}{" "}
              <Text style={{ color: "rgba(255,255,255,0.35)" }}>/</Text>{" "}
              {mediaList.length}
            </Text>
          </View>

          <View style={styles.viewerPagination} pointerEvents="none">
            {mediaList.map((m, index) => (
              <View
                key={`v-dot-${m.key}`}
                style={[
                  styles.viewerDot,
                  index === viewerIndex && styles.viewerDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </Modal>
      <Modal
  visible={reportVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setReportVisible(false)}
>
  <Pressable
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    }}
    onPress={() => setReportVisible(false)}
  >
    <Pressable
      onPress={(e) => e.stopPropagation()}
      style={{
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 22,
        paddingBottom: 35,
      }}
    >
      <View style={{
        width: 42,
        height: 5,
        borderRadius: 5,
        backgroundColor: "#E2E8F0",
        alignSelf: "center",
        marginBottom: 22,
      }} />

      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
      }}>
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: "#FEF2F2",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Flag size={21} color="#DC2626" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 19,
            fontWeight: "900",
            color: NAVY,
          }}>
            Report Seller
          </Text>

          <Text style={{
            fontSize: 12,
            color: "#94A3B8",
            marginTop: 3,
          }}>
            Help us keep SOUMA safe
          </Text>
        </View>
      </View>

      <Text style={{
        color: "#475569",
        fontSize: 13,
        fontWeight: "700",
        marginTop: 20,
        marginBottom: 12,
      }}>
        Why are you reporting this seller?
      </Text>

      {reportReasons.map((reason) => {
        const selected = reportReason === reason.value;

        return (
          <TouchableOpacity
            key={reason.value}
            activeOpacity={0.7}
            onPress={() => setReportReason(reason.value)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 13,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selected ? NAVY : "#E2E8F0",
              backgroundColor: selected ? "#F1F5F9" : "#FFFFFF",
              marginBottom: 8,
            }}
          >
            <Text style={{
              color: NAVY,
              fontSize: 13,
              fontWeight: selected ? "800" : "600",
            }}>
              {reason.label}
            </Text>

            <View style={{
              width: 19,
              height: 19,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: selected ? NAVY : "#CBD5E1",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {selected && (
                <View style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: NAVY,
                }} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={{
        color: "#475569",
        fontSize: 13,
        fontWeight: "700",
        marginTop: 12,
        marginBottom: 9,
      }}>
        Additional details (optional)
      </Text>

      <TextInput
        value={reportDescription}
        onChangeText={setReportDescription}
        placeholder="Tell us more about the issue..."
        placeholderTextColor="#94A3B8"
        multiline
        maxLength={1000}
        textAlignVertical="top"
        style={{
          minHeight: 95,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 14,
          padding: 13,
          color: NAVY,
          fontSize: 13,
          backgroundColor: "#F8FAFC",
        }}
      />

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!reportReason || reportLoading}
        onPress={submitSellerReport}
        style={{
          height: 52,
          borderRadius: 15,
          backgroundColor: !reportReason ? "#CBD5E1" : "#DC2626",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 20,
        }}
      >
        {reportLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: "900",
          }}>
            Submit Report
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setReportVisible(false)}
        style={{
          alignItems: "center",
          paddingVertical: 13,
          marginTop: 5,
        }}
      >
        <Text style={{
          color: "#64748B",
          fontSize: 13,
          fontWeight: "700",
        }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </Pressable>
  </Pressable>
</Modal>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* ---------- hero / media ---------- */

  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },

  heroList: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },

  // EXPLICIT pixel width: "100%" inside a horizontal FlatList collapses to 0
  mediaSlide: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: "#F1F5F9",
  },

  mediaFill: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },

  mediaBox: {
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },

  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  retryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: LIME,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  retryPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: NAVY,
  },

  videoIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },

  noMedia: {
    alignItems: "center",
    justifyContent: "center",
  },

  heroFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },

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

  topBarRight: {
    flexDirection: "row",
    gap: 10,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

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

  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: LIME,
  },

  /* ---------- content ---------- */

  contentScroll: {
    flex: 1,
    zIndex: 2,
  },

  contentContainer: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },

  titleSection: {
    marginBottom: 20,
  },

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
    color: "#0606A2",
    lineHeight: 32,
    letterSpacing: -0.6,
    paddingRight: 14,
  },

  priceBlock: {
    alignItems: "flex-end",
  },

  priceCurrency: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 2,
  },

  price: {
    fontSize: 30,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -1,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  metaText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  metaDivider: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
  },

  /* ---------- marquee ---------- */

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

  /* ---------- seller ---------- */

  sellerSection: {
    marginBottom: 24,
  },

  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F2F3F759",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(11,11,208,0.35)",
  },

  sellerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  avatarRing: {
    position: "relative",
    padding: 3,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: LIME,
  },

  sellerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  sellerAvatarImg: {
    width: 52,
    height: 52,
  },

  sellerAvatarText: {
    color: LIME,
    fontSize: 20,
    fontWeight: "900",
  },

  verifiedRing: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  sellerTextBox: {
    gap: 4,
    flex: 1,
  },

  sellerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  sellerName: {
    fontSize: 16,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.2,
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: LIME,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  verifiedText: {
    fontSize: 10,
    fontWeight: "900",
    color: NAVY,
  },

  sellerMeta: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },

  sellerAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(185,250,60,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  sellerActionDisabled: {
    opacity: 0.5,
  },

  /* ---------- description ---------- */

  descSection: {
    marginBottom: 24,
  },

  descHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  descAccentLine: {
    width: 4,
    height: 28,
    backgroundColor: LIME,
    borderRadius: 2,
  },

  descTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.4,
  },

  descBody: {
    paddingLeft: 16,
  },

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
    color: NAVY,
  },

  /* ---------- seal ---------- */

  sealSection: {
    marginBottom: 20,
  },

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

  sealTextBox: {
    flex: 1,
  },

  sealTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: NAVY,
    marginBottom: 3,
  },

  sealSub: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 18,
  },

  /* ---------- sheet ---------- */

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(4,4,94,0.06)",
    zIndex: 100,
  },

  sheetHandleBar: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
  },

  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },

  sheetCollapsed: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },

  sheetCollapsedLeft: {
    flex: 1,
  },

  sheetLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  sheetPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 2,
  },

  sheetPriceValue: {
    fontSize: 22,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.5,
  },

  sheetPriceCurrency: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  sheetCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: LIME,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },

  sheetCtaText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: "900",
  },

  sheetExpanded: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: NAVY,
    textAlign: "center",
    marginBottom: 4,
  },

  sheetSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 24,
  },

  sheetActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  sheetActionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1.5,
  },

  sheetActionPrimary: {
    backgroundColor: LIME,
    borderColor: "rgba(185,250,60,0.3)",
    shadowColor: "#0D0E0C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },

  sheetActionSecondary: {
    backgroundColor: "#FAFBFF",
    borderColor: "rgba(4,4,94,0.08)",
  },

  sheetActionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: NAVY,
  },

  sheetCancel: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },

  sheetCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
  },

  /* ---------- states ---------- */

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  loadingText: {
    marginTop: 14,
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 20,
  },

  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    backgroundColor: NAVY,
    borderRadius: 14,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  /* ---------- fullscreen viewer ---------- */

  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  viewerList: {
    flex: 1,
  },

  // Explicit pixel sizes – percentages collapse in horizontal lists
  viewerSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },

  viewerMedia: {
    width: SCREEN_WIDTH,
    height: VIEWER_MEDIA_HEIGHT,
    backgroundColor: "#000",
  },

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

  viewerCounter: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 90,
  },

  viewerCounterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },

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

  viewerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  viewerDotActive: {
    backgroundColor: LIME,
    width: 22,
    borderRadius: 4,
  },
});