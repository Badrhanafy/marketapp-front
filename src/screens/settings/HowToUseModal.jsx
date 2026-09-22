// src/components/HowToUseModal.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Dimensions,
  Easing,
  I18nManager,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  UserPlus,
  ShoppingBag,
  MapPin,
  Heart,
  MessageCircle,
  Send,
  Tag,
  Package,
  Bell,
  Settings as SettingsIcon,
  Sparkles,
  Rocket,
} from 'lucide-react-native';

/* -------------------------------------------------------------------------- */
/*  STEP DEFINITIONS                                                          */
/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    key: 'createAccount',
    Icon: UserPlus,
    accent: '#7CE0B8',
    gradient: ['#0B3D2E', '#124C38'],
    image: require('../../../assets/images/howto/step-account.jpg'),
  },
  {
    key: 'browse',
    Icon: ShoppingBag,
    accent: '#8FD8FF',
    gradient: ['#0A2A3D', '#124A6B'],
    image: require('../../../assets/images/howto/step-browse.jpg'),
  },
  {
    key: 'nearby',
    Icon: MapPin,
    accent: '#FFC97A',
    gradient: ['#3D2A0B', '#6B4A12'],
    image: require('../../../assets/images/howto/step-nearby.jpg'),
  },
  {
    key: 'like',
    Icon: Heart,
    accent: '#FF8FA3',
    gradient: ['#3D0B1A', '#6B122A'],
    image: require('../../../assets/images/howto/step-like.jpg'),
  },
  {
    key: 'contact',
    Icon: MessageCircle,
    accent: '#B8A0FF',
    gradient: ['#1D0B3D', '#31126B'],
    image: require('../../../assets/images/howto/step-contact.jpg'),
  },
  {
    key: 'messages',
    Icon: Send,
    accent: '#9FE8FF',
    gradient: ['#0B2A3D', '#12456B'],
    image: require('../../../assets/images/howto/step-messages.jpg'),
  },
  {
    key: 'sell',
    Icon: Tag,
    accent: '#B8E601',
    gradient: ['#1A2A0B', '#3A5B12'],
    image: require('../../../assets/images/howto/step-sell.jpg'),
  },
  {
    key: 'manage',
    Icon: Package,
    accent: '#FFD27A',
    gradient: ['#3D2A0B', '#6B4A12'],
    image: require('../../../assets/images/howto/step-manage.jpg'),
  },
  {
    key: 'notifications',
    Icon: Bell,
    accent: '#FFC97A',
    gradient: ['#3D1A0B', '#6B3112'],
    image: require('../../../assets/images/howto/step-notifications.jpg'),
  },
  {
    key: 'profile',
    Icon: SettingsIcon,
    accent: '#9FD6BE',
    gradient: ['#0B3D2E', '#12523D'],
    image: require('../../../assets/images/howto/step-profile.jpg'),
  },
];

const BRAND = {
  dark: '#0B3D2E',
  deep: '#072A20',
  mid: '#1B6B50',
  soft: '#DCEBE4',
  white: '#FFFFFF',
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/* -------------------------------------------------------------------------- */
/*  MODAL                                                                     */
/* -------------------------------------------------------------------------- */

export default function HowToUseModal({ visible, onClose }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState(false);

  /* ------------------------------ animations ------------------------------ */

  const enterOpacity = useRef(new Animated.Value(0)).current;

  const cardTranslateY = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;

  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  const progress = useRef(new Animated.Value(0)).current;

  /* ------------------------------ entry anim ------------------------------ */

  useEffect(() => {
    if (visible) {
      enterOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardTranslateY.setValue(40);
      cardScale.setValue(0.94);
      iconScale.setValue(0);

      Animated.parallel([
        Animated.timing(enterOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          delay: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [
    visible,
    enterOpacity,
    cardTranslateY,
    cardOpacity,
    cardScale,
    iconScale,
  ]);

  /* ------------------------------ progress -------------------------------- */

  useEffect(() => {
    Animated.timing(progress, {
      toValue: (current + 1) / STEPS.length,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [current, progress]);

  /* ------------------------------ navigation ------------------------------ */

  const animateCardOut = useCallback(
    (direction, onDone) => {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 20,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.95,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        cardOpacity.setValue(0);
        cardTranslateY.setValue(20);
        cardScale.setValue(0.95);
        iconScale.setValue(0);

        onDone?.();

        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 240,
            useNativeDriver: true,
          }),
          Animated.spring(cardTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.spring(cardScale, {
            toValue: 1,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.spring(iconScale, {
            toValue: 1,
            friction: 6,
            tension: 90,
            delay: 120,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [cardOpacity, cardTranslateY, cardScale, iconScale]
  );

  const goNext = useCallback(() => {
    if (current >= STEPS.length - 1) {
      setCompleted(true);
      return;
    }
    animateCardOut('next', () => {
      setCurrent((c) =>
        Math.min(c + 1, STEPS.length - 1)
      );
    });
  }, [current, animateCardOut]);

  const goPrev = useCallback(() => {
    if (current <= 0) return;
    animateCardOut('prev', () => {
      setCurrent((c) => Math.max(c - 1, 0));
    });
  }, [current, animateCardOut]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
      setTimeout(() => {
        setCurrent(0);
        setCompleted(false);
      }, 120);
    });
  }, [enterOpacity, cardOpacity, onClose]);

  /* ------------------------------ data ------------------------------------ */

  const step = STEPS[current];
  const StepIcon = step.Icon;

  const title = t(
    `howToUse.steps.${step.key}.title`,
    step.key
  );

  const description = t(
    `howToUse.steps.${step.key}.description`,
    ''
  );

  const bullets = useMemo(() => {
    const raw = t(
      `howToUse.steps.${step.key}.bullets`,
      { returnObjects: true }
    );
    return Array.isArray(raw) ? raw : [];
  }, [t, step.key]);

  const isFirst = current === 0;
  const isLast = current === STEPS.length - 1;

  const iconRotateDeg = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '8deg'],
  });

  /* ------------------------------ render ---------------------------------- */

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[styles.root, { opacity: enterOpacity }]}
      >
        {/* FULLSCREEN BACKGROUND IMAGE PER STEP */}
        <ImageBackground
          key={step.key}
          source={step.image}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.65)',
              'rgba(0,0,0,0.35)',
              'rgba(0,0,0,0.85)',
            ]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          <LinearGradient
            colors={[
              'transparent',
              step.gradient[0] + 'CC',
            ]}
            locations={[0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        {/* ------------------------------------------------------------- */}
        {/* SAFE-AREA WRAPPER — nothing renders under status bar / home   */}
        {/* indicator. Background image above still bleeds fullscreen.    */}
        {/* ------------------------------------------------------------- */}
        <View
          style={[
            styles.safeArea,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          {/* CLOSE BUTTON */}
          <Pressable
            onPress={handleClose}
            style={styles.closeBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', 'Close')}
          >
            <X size={22} color={BRAND.white} strokeWidth={2.6} />
          </Pressable>

          {/* TOP: progress */}
          <View style={styles.topBar} pointerEvents="none">
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: step.accent,
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {current + 1} / {STEPS.length}
            </Text>
          </View>

          {/* MAIN CONTENT */}
          <View style={styles.contentWrap}>
            <Animated.View
              style={[
                styles.iconWrap,
                {
                  opacity: cardOpacity,
                  transform: [
                    { scale: iconScale },
                    { rotate: iconRotateDeg },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.iconGlow,
                  { backgroundColor: step.accent },
                ]}
              />
              <View
                style={[
                  styles.iconCircle,
                  { borderColor: step.accent },
                ]}
              >
                <StepIcon
                  size={52}
                  color={step.accent}
                  strokeWidth={2}
                />
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.textWrap,
                {
                  opacity: cardOpacity,
                  transform: [
                    { translateY: cardTranslateY },
                    { scale: cardScale },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.stepIndex,
                  { color: step.accent },
                ]}
              >
                {t('howToUse.eyebrow', 'Step')} {current + 1}
              </Text>

              <Text style={styles.title}>{title}</Text>

              {description ? (
                <Text style={styles.description}>
                  {description}
                </Text>
              ) : null}
            </Animated.View>

            {/* Bullets in a translucent glass card */}
            {bullets.length > 0 && (
              <Animated.View
                style={[
                  styles.bulletsCard,
                  {
                    opacity: cardOpacity,
                    transform: [{ scale: cardScale }],
                  },
                ]}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={
                    styles.bulletsScroll
                  }
                >
                  {bullets.map((line, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <View
                        style={[
                          styles.bulletDot,
                          {
                            backgroundColor:
                              step.accent + '22',
                            borderColor:
                              step.accent + '80',
                          },
                        ]}
                      >
                        <Check
                          size={12}
                          color={step.accent}
                          strokeWidth={3}
                        />
                      </View>
                      <Text style={styles.bulletText}>
                        {line}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {/* ACTIONS */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={goPrev}
                disabled={isFirst}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={[
                  styles.btn,
                  styles.btnGhost,
                  isFirst && styles.btnDisabled,
                ]}
              >
                <ChevronLeft
                  size={20}
                  color={BRAND.white}
                  strokeWidth={2.6}
                />
                <Text style={styles.btnGhostText}>
                  {t('common.previous', 'Previous')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goNext}
                activeOpacity={0.9}
                accessibilityRole="button"
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  { backgroundColor: step.accent },
                ]}
              >
                <Text style={styles.btnPrimaryText}>
                  {isLast
                    ? t('howToUse.finish', 'Got it')
                    : t('common.next', 'Next')}
                </Text>
                {isLast ? (
                  <Check
                    size={18}
                    color={BRAND.dark}
                    strokeWidth={3}
                  />
                ) : (
                  <ChevronRight
                    size={20}
                    color={BRAND.dark}
                    strokeWidth={2.8}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Dots */}
            <View style={styles.dots}>
              {STEPS.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === current && [
                      styles.dotActive,
                      { backgroundColor: step.accent },
                    ],
                    idx < current && styles.dotDone,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* COMPLETION OVERLAY */}
        {completed && (
          <CompletedOverlay
            onClose={handleClose}
            insets={insets}
            accent={step.accent}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  COMPLETED                                                                 */
/* -------------------------------------------------------------------------- */

function CompletedOverlay({ onClose, insets, accent }) {
  const { t } = useTranslation();

  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.3)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        delay: 120,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.8,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [scale, opacity, iconScale, ringScale, ringOpacity]);

  return (
    <View
      style={[
        styles.completedWrap,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <Pressable
        style={styles.completedBackdrop}
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.completedCard,
          { opacity, transform: [{ scale }] },
        ]}
      >
        <View style={styles.completedIconWrap}>
          <Animated.View
            style={[
              styles.completedRing,
              {
                borderColor: accent,
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.completedIcon,
              {
                backgroundColor: accent,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Sparkles
              size={40}
              color={BRAND.dark}
              strokeWidth={2.4}
            />
          </Animated.View>
        </View>

        <Text style={styles.completedTitle}>
          {t(
            'howToUse.completed.title',
            "You're all set!"
          )}
        </Text>

        <Text style={styles.completedText}>
          {t(
            'howToUse.completed.text',
            'You now know how to use the app. Enjoy exploring!'
          )}
        </Text>

        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.9}
          accessibilityRole="button"
          style={[
            styles.completedBtn,
            { backgroundColor: accent },
          ]}
        >
          <Text style={styles.completedBtnText}>
            {t(
              'howToUse.completed.cta',
              'Start exploring'
            )}
          </Text>
          <Rocket
            size={18}
            color={BRAND.dark}
            strokeWidth={2.6}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  STYLES                                                                    */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  /* SAFE AREA WRAPPER */
  safeArea: {
    flex: 1,
  },

  /* CLOSE */
  closeBtn: {
    position: 'absolute',
    end: 16,
    top: 14,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  /* TOP BAR */
  topBar: {
    position: 'absolute',
    start: 16,
    end: 76,
    top: 26,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  progressLabel: {
    color: BRAND.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* CONTENT */
  contentWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 90,
    justifyContent: 'center',
  },

  /* ICON */
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  iconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.18,
  },

  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 2,
  },

  /* TEXT */
  textWrap: {
    alignItems: 'center',
  },

  stepIndex: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  title: {
    color: BRAND.white,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  description: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
  },

  /* BULLETS */
  bulletsCard: {
    marginTop: 22,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxHeight: SCREEN_H * 0.36,
    overflow: 'hidden',
  },

  bulletsScroll: {
    paddingVertical: 2,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  bulletDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
    marginTop: 1,
    borderWidth: 1,
  },

  bulletText: {
    flex: 1,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    lineHeight: 21,
  },

  /* ACTIONS */
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 26,
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    gap: 6,
  },

  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },

  btnGhostText: {
    color: BRAND.white,
    fontSize: 15,
    fontWeight: '700',
  },

  btnDisabled: {
    opacity: 0.35,
  },

  btnPrimary: {
    flex: 1,
  },

  btnPrimaryText: {
    color: BRAND.dark,
    fontSize: 15,
    fontWeight: '900',
  },

  /* DOTS */
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  dotActive: {
    width: 22,
  },

  dotDone: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },

  /* COMPLETED */
  completedWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  completedBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },

  completedCard: {
    backgroundColor: BRAND.white,
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },

  completedIconWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  completedRing: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
  },

  completedIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  completedTitle: {
    color: BRAND.dark,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },

  completedText: {
    color: '#3F5B52',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },

  completedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },

  completedBtnText: {
    color: BRAND.dark,
    fontSize: 15,
    fontWeight: '900',
  },
});