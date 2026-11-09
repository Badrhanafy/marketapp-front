import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  FlatList,
  I18nManager,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";

import axios from "axios";

import { API_URL } from "../../constants/config";

// =====================================================
// CONFIG
// =====================================================

const GREEN_BANNER = "#1F7A45";
const WHITE = "#FFFFFF";
const YELLOW = "#FFD21F";
const INK = "#14201A";

const RTL = I18nManager.isRTL;

const PAGE_PADDING = 16;
const SLIDE_GAP = 12;
const BANNER_HEIGHT = 150;
const SLIDE_DURATION = 5000;
const LIST_VERTICAL_PAD = 8; // room so the card shadow is not clipped

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// =====================================================
// DOTS — isolated so only they re-render on slide change
// =====================================================

const Dots = memo(function Dots({ count, scrollX, step }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      const next = Math.max(0, Math.min(count - 1, Math.round(value / step)));
      setActive((prev) => (prev === next ? prev : next));
    });
    return () => scrollX.removeListener(id);
  }, [scrollX, step, count]);

  return (
    <View style={styles.dotsRow} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
});

// =====================================================
// SINGLE SLIDE — memoized, no overlay, no per-frame work
// =====================================================

const Slide = memo(function Slide({ slide, width, onCtaPress }) {
  const [imageError, setImageError] = useState(false);

  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.cardInner}>
        {slide.image && !imageError ? (
          <Image
            source={slide.image}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            fadeDuration={0}
            onError={() => setImageError(true)}
          />
        ) : null}

        <View style={styles.bannerText}>
          {!!slide.eyebrow && (
            <Text style={styles.bannerEyebrow} numberOfLines={1}>
              {slide.eyebrow}
            </Text>
          )}

          <Text style={styles.bannerTitle} numberOfLines={3}>
            {slide.title}
          </Text>

          {!!slide.cta && (
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.bannerCta}
              onPress={() => onCtaPress(slide)}
            >
              <Text style={styles.bannerCtaText}>{slide.cta}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

// =====================================================
// BANNER SLIDER
// =====================================================

const BannerSlider = forwardRef(function BannerSlider(
  { navigation, onCtaPress, slides: fallbackSlides },
  ref
) {
  const { width: screenWidth } = useWindowDimensions();
  const slideWidth = screenWidth - PAGE_PADDING * 2;
  const step = slideWidth + SLIDE_GAP;

  const [apiSlides, setApiSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const activeRef = useRef(0);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);
  const mountedRef = useRef(true);

  // ===================================================
  // FETCH SLIDERS FROM LARAVEL
  // ===================================================

  const fetchSliders = useCallback(async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}/sliders`);
      const data = response.data?.sliders;

      if (!Array.isArray(data)) {
        if (mountedRef.current) setApiSlides([]);
        return;
      }

      const formatted = data.map((item) => ({
        key: String(item.id),
        id: item.id,
        image: item.image ? { uri: item.image } : null,
        eyebrow: item.eyebrow || "",
        title: item.title || "",
        cta: item.cta || "",
        route: item.route || null,
      }));

      if (mountedRef.current) {
        setApiSlides(formatted);
        activeRef.current = 0;
      }
    } catch (error) {
      console.log("BANNER SLIDERS ERROR:", error.response?.data || error.message);
      if (mountedRef.current) setApiSlides([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchSliders();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchSliders]);

  // API slides win; the screen's static slides are only a fallback
  const slides = useMemo(() => {
    if (apiSlides.length) return apiSlides;
    return (fallbackSlides || []).map((s) => ({
      key: String(s.key),
      id: s.key,
      image: s.image || null,
      eyebrow: s.eyebrow || "",
      title: s.title || "",
      cta: s.cta || "",
      route: s.route || null,
    }));
  }, [apiSlides, fallbackSlides]);

  // ===================================================
  // AUTOPLAY (native scroll, so it slides like a swipe)
  // ===================================================

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoPlay = useCallback(() => {
    clearTimer();
    if (slides.length <= 1 || pausedRef.current) return;

    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const next = (activeRef.current + 1) % slides.length;
      listRef.current?.scrollToOffset({
        offset: next * step,
        animated: true,
      });
    }, SLIDE_DURATION);
  }, [slides.length, step, clearTimer]);

  useEffect(() => {
    startAutoPlay();
    return clearTimer;
  }, [startAutoPlay, clearTimer]);

  // Parent screen can pause while the page scrolls, resume afterwards
  useImperativeHandle(
    ref,
    () => ({
      pause: () => {
        pausedRef.current = true;
        clearTimer();
      },
      resume: () => {
        pausedRef.current = false;
        startAutoPlay();
      },
    }),
    [clearTimer, startAutoPlay]
  );

  // ===================================================
  // SCROLL HANDLING
  // ===================================================

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (e) => {
          // cheap ref write only — no setState per frame
          activeRef.current = Math.round(e.nativeEvent.contentOffset.x / step);
        },
      }),
    [scrollX, step]
  );

  const onScrollBeginDrag = useCallback(() => clearTimer(), [clearTimer]);
  const onMomentumScrollEnd = useCallback(() => {
    if (!pausedRef.current) startAutoPlay();
  }, [startAutoPlay]);

  // ===================================================
  // CTA NAVIGATION
  // ===================================================

  const handleCtaPress = useCallback(
    (slide) => {
      if (onCtaPress) {
        onCtaPress(slide);
        return;
      }
      if (slide.route && navigation) navigation.navigate(slide.route);
    },
    [navigation, onCtaPress]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <Slide slide={item} width={slideWidth} onCtaPress={handleCtaPress} />
    ),
    [slideWidth, handleCtaPress]
  );

  const keyExtractor = useCallback((item) => item.key, []);

  const getItemLayout = useCallback(
    (_, index) => ({ length: step, offset: step * index, index }),
    [step]
  );

  // ===================================================
  // STATES
  // ===================================================

  if (loading && !slides.length) {
    return (
      <View style={[styles.loadingWrap, { paddingHorizontal: PAGE_PADDING }]}>
        <View style={[styles.cardInner, styles.loadingCard]}>
          <ActivityIndicator size="large" color={WHITE} />
        </View>
      </View>
    );
  }

  if (!slides.length) return null;

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <View style={styles.wrap}>
      <AnimatedFlatList
        ref={listRef}
        data={slides}
        horizontal
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
      />

      {slides.length > 1 && (
        <Dots count={slides.length} scrollX={scrollX} step={step} />
      )}
    </View>
  );
});

const Separator = () => <View style={{ width: SLIDE_GAP }} />;

export default BannerSlider;

// =====================================================
// STYLES
// =====================================================

const SOFT_SHADOW = {
  shadowColor: "#0B2A1A",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 3,
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 0,
  },

  loadingWrap: {
    paddingVertical: LIST_VERTICAL_PAD,
  },

  listContent: {
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: LIST_VERTICAL_PAD,
  },

  // Outer view carries the shadow, inner view clips the image
  card: {
    height: BANNER_HEIGHT,
    borderRadius: 22,
    backgroundColor: GREEN_BANNER,
    ...SOFT_SHADOW,
  },

  cardInner: {
    flex: 1,
    height: BANNER_HEIGHT,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: GREEN_BANNER,
    justifyContent: "center",
  },

  loadingCard: {
    alignItems: "center",
  },

  bannerText: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    paddingHorizontal: 18,
    alignItems: RTL ? "flex-end" : "flex-start",
  },

  bannerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.8)",
  },

  bannerTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
    letterSpacing: -0.4,
    color: WHITE,
    maxWidth: "70%",
    textAlign: RTL ? "right" : "left",
  },

  bannerCta: {
    alignSelf: RTL ? "flex-end" : "flex-start",
    marginTop: 12,
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: YELLOW,
  },

  bannerCtaText: {
    fontSize: 13,
    fontWeight: "900",
    color: INK,
  },

  dotsRow: {
    position: "absolute",
    end: PAGE_PADDING + 14,
    bottom: LIST_VERTICAL_PAD + 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },

  dotActive: {
    width: 16,
    backgroundColor: WHITE,
  },
});