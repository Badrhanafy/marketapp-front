
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
const LIST_VERTICAL_PAD = 8;

// =====================================================
// MODULE CACHE
// Shared across component remounts
// =====================================================

let slidersCache = null;
let slidersRequest = null;

const formatSlides = (data) => {
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    key: String(item.id),
    id: item.id,
    image: item.image ? { uri: item.image } : null,
    eyebrow: item.eyebrow || "",
    title: item.title || "",
    cta: item.cta || "",
    route: item.route || null,
  }));
};

const getSliders = async () => {
  if (slidersCache !== null) {
    return slidersCache;
  }

  if (!slidersRequest) {
    slidersRequest = axios
      .get(`${API_URL}/sliders`, {
        timeout: 15000,
      })
      .then((response) => {
        const formatted = formatSlides(
          response.data?.sliders
        );

        slidersCache = formatted;
        return formatted;
      })
      .catch((error) => {
        console.log(
          "BANNER SLIDERS ERROR:",
          error.response?.data || error.message
        );

        return [];
      })
      .finally(() => {
        slidersRequest = null;
      });
  }

  return slidersRequest;
};

// =====================================================
// PRELOAD IMAGES
// =====================================================

const preloadImages = (slides) => {
  slides.forEach((slide) => {
    if (!slide.image?.uri) return;

    Image.prefetch(slide.image.uri).catch(() => {});
  });
};

// =====================================================
// DOTS
// =====================================================

const Dots = memo(function Dots({ count, scrollX, step }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      const next = Math.max(
        0,
        Math.min(count - 1, Math.round(value / step))
      );

      setActive((previous) =>
        previous === next ? previous : next
      );
    });

    return () => scrollX.removeListener(id);
  }, [scrollX, step, count]);

  return (
    <View style={styles.dotsRow} pointerEvents="none">
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === active && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
});

// =====================================================
// SINGLE SLIDE
// =====================================================

const Slide = memo(function Slide({
  slide,
  index,
  width,
  step,
  scrollX,
  onCtaPress,
}) {
  const [imageError, setImageError] = useState(false);

  const animatedStyle = useMemo(() => {
    const inputRange = [
      (index - 1) * step,
      index * step,
      (index + 1) * step,
    ];

    return {
      opacity: scrollX.interpolate({
        inputRange,
        outputRange: [0.82, 1, 0.82],
        extrapolate: "clamp",
      }),

      transform: [
        {
          scale: scrollX.interpolate({
            inputRange,
            outputRange: [0.97, 1, 0.97],
            extrapolate: "clamp",
          }),
        },
      ],
    };
  }, [index, step, scrollX]);

  return (
    <Animated.View
      style={[
        styles.card,
        { width },
        animatedStyle,
      ]}
    >
      <View style={styles.cardInner}>
        {!!slide.image && !imageError && (
          <Image
            source={slide.image}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            fadeDuration={0}
            onError={() => setImageError(true)}
          />
        )}

        <View style={styles.imageOverlay} />

        <View style={styles.bannerText}>
          {!!slide.eyebrow && (
            <Text
              style={styles.bannerEyebrow}
              numberOfLines={1}
            >
              {slide.eyebrow}
            </Text>
          )}

          <Text
            style={styles.bannerTitle}
            numberOfLines={3}
          >
            {slide.title}
          </Text>

          {!!slide.cta && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.bannerCta}
              onPress={() => onCtaPress(slide)}
            >
              <Text style={styles.bannerCtaText}>
                {slide.cta}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
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
  const mountedRef = useRef(false);

  // ===================================================
  // FETCH ONCE + PRELOAD
  // ===================================================

  useEffect(() => {
    mountedRef.current = true;

    const load = async () => {
      const data = await getSliders();

      if (!mountedRef.current) return;

      setApiSlides(data);
      setLoading(false);

      // Preload images without blocking rendering
      preloadImages(data);
    };

    load();

    return () => {
      mountedRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // ===================================================
  // FALLBACK
  // ===================================================

  const slides = useMemo(() => {
    if (apiSlides.length > 0) {
      return apiSlides;
    }

    return (fallbackSlides || []).map((slide) => ({
      key: String(slide.key),
      id: slide.key,
      image: slide.image || null,
      eyebrow: slide.eyebrow || "",
      title: slide.title || "",
      cta: slide.cta || "",
      route: slide.route || null,
    }));
  }, [apiSlides, fallbackSlides]);

  // ===================================================
  // AUTOPLAY
  // ===================================================

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimer();

    if (slides.length <= 1 || pausedRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      if (pausedRef.current) return;

      const next =
        (activeRef.current + 1) % slides.length;

      listRef.current?.scrollToOffset({
        offset: next * step,
        animated: true,
      });

      // Safety fallback if no momentum event fires
      scheduleNext();
    }, SLIDE_DURATION);
  }, [slides.length, step, clearTimer]);

  useEffect(() => {
    if (!loading) {
      scheduleNext();
    }

    return clearTimer;
  }, [loading, scheduleNext, clearTimer]);

  // ===================================================
  // PARENT CONTROLS
  // ===================================================

  useImperativeHandle(
    ref,
    () => ({
      pause: () => {
        pausedRef.current = true;
        clearTimer();
      },

      resume: () => {
        pausedRef.current = false;
        scheduleNext();
      },
    }),
    [clearTimer, scheduleNext]
  );

  // ===================================================
  // SCROLL
  // ===================================================

  const onScroll = useMemo(
    () =>
      Animated.event(
        [
          {
            nativeEvent: {
              contentOffset: {
                x: scrollX,
              },
            },
          },
        ],
        {
          useNativeDriver: true,

          listener: (event) => {
            activeRef.current = Math.max(
              0,
              Math.min(
                slides.length - 1,
                Math.round(
                  event.nativeEvent.contentOffset.x / step
                )
              )
            );
          },
        }
      ),
    [scrollX, step, slides.length]
  );

  const onScrollBeginDrag = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onMomentumScrollEnd = useCallback(
    (event) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / step
      );

      activeRef.current = Math.max(
        0,
        Math.min(slides.length - 1, index)
      );

      scheduleNext();
    },
    [step, slides.length, scheduleNext]
  );

  const onScrollEndDrag = useCallback(() => {
    // Restart timer if the user stops dragging without momentum
    scheduleNext();
  }, [scheduleNext]);

  // ===================================================
  // CTA
  // ===================================================

  const handleCtaPress = useCallback(
    (slide) => {
      if (onCtaPress) {
        onCtaPress(slide);
        return;
      }

      if (slide.route && navigation) {
        navigation.navigate(slide.route);
      }
    },
    [navigation, onCtaPress]
  );

  // ===================================================
  // FLATLIST
  // ===================================================

  const renderItem = useCallback(
    ({ item, index }) => (
      <Slide
        slide={item}
        index={index}
        width={slideWidth}
        step={step}
        scrollX={scrollX}
        onCtaPress={handleCtaPress}
      />
    ),
    [slideWidth, step, scrollX, handleCtaPress]
  );

  const keyExtractor = useCallback(
    (item) => item.key,
    []
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: step,
      offset: step * index,
      index,
    }),
    [step]
  );

  // ===================================================
  // LOADING
  // ===================================================

  if (loading && !slides.length) {
    return (
      <View
        style={[
          styles.loadingWrap,
          { paddingHorizontal: PAGE_PADDING },
        ]}
      >
        <View style={[styles.cardInner, styles.loadingCard]}>
          <ActivityIndicator
            size="large"
            color={WHITE}
          />
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
      <Animated.FlatList
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
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
      />

      {slides.length > 1 && (
        <Dots
          count={slides.length}
          scrollX={scrollX}
          step={step}
        />
      )}
    </View>
  );
});

const Separator = memo(() => (
  <View style={{ width: SLIDE_GAP }} />
));

export default memo(BannerSlider);

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

  card: {
    height: BANNER_HEIGHT,
    borderRadius: 22,
    backgroundColor: GREEN_BANNER,
    ...SOFT_SHADOW,
  },

  cardInner: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: GREEN_BANNER,
    justifyContent: "center",
  },

  loadingCard: {
    height: BANNER_HEIGHT,
    alignItems: "center",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
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
    color: "rgba(255,255,255,0.85)",
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
