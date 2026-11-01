import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  I18nManager,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  UserPlus,
} from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n.js";

// Required so the Google browser session can hand control back to the app
WebBrowser.maybeCompleteAuthSession();

// ── Google OAuth client IDs (create them in Google Cloud Console) ──
const GOOGLE_WEB_CLIENT_ID = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID = "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";

// ── Palette ──
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#ECFDF5";
const SLATE = "#0F172A";
const MUTED = "#64748B";
const INACTIVE = "#94A3B8";
const WHITE = "#FFFFFF";
const BORDER = "#E2E8F0";
const PAGE_BG = "#F7F9F8";
const RED = "#DC2626";
const AMBER = "#F59E0B";
const ICON_BG = "#F1F5F9";
const GOOGLE_BLUE = "#4285F4";

const FIELD_RADIUS = 18;

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const RTL = I18nManager.isRTL;

const passwordScore = (p) => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};
const SCORE_COLORS = [BORDER, RED, AMBER, GREEN, GREEN_DARK];

/* ------------------------------------------------------------------ */
/* Responsive metrics → styles                                         */
/* ------------------------------------------------------------------ */
const createStyles = ({ width, height, insets }) => {
  const short = Math.min(width, height);
  const isLandscape = width > height;
  const isTablet = short >= 600;
  const isCompact = height < 680 && !isLandscape;

  // Soft scale based on the shortest screen side (390 = baseline phone)
  const s = clamp(short / 390, 0.85, 1.25);
  const ms = (n) => Math.round(n * s);

  const radius = clamp(width * 0.3, 70, 160);
  const headerMin =
    (isLandscape ? 150 : clamp(height * 0.3, isCompact ? 180 : 215, 330)) +
    insets.top;
  const hPad = clamp(width * 0.06, 20, 32);
  const formMax = isTablet ? 520 : 460;
  const logo = isCompact || isLandscape ? ms(54) : ms(70);
  const fieldH = clamp(ms(60), 56, 68);
  const iconBox = ms(36);
  const dot = ms(38);

  return {
    ms,
    dot,
    fieldH,
    iconBox,
    styles: StyleSheet.create({
      container: { flex: 1, backgroundColor: PAGE_BG },
      flex: { flex: 1 },
      scroll: { flexGrow: 1 },

      /* Header */
      header: {
        minHeight: headerMin,
        backgroundColor: GREEN,
        borderBottomStartRadius: radius,
        paddingTop: insets.top + 12,
        paddingBottom: ms(22),
        paddingHorizontal: hPad,
        justifyContent: "space-between",
        overflow: "hidden",
      },
      circleBig: {
        position: "absolute",
        width: width * 0.7,
        height: width * 0.7,
        borderRadius: width * 0.35,
        backgroundColor: WHITE,
        opacity: 0.08,
        top: -width * 0.3,
        end: -width * 0.2,
      },
      circleSmall: {
        position: "absolute",
        width: width * 0.4,
        height: width * 0.4,
        borderRadius: width * 0.2,
        backgroundColor: WHITE,
        opacity: 0.07,
        bottom: -width * 0.1,
        start: -width * 0.1,
      },
      headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      backBtn: {
        width: ms(40),
        height: ms(40),
        borderRadius: ms(14),
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
      },
      stepBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.2)",
      },
      stepBadgeText: {
        color: WHITE,
        fontSize: ms(12),
        fontWeight: "800",
        letterSpacing: 0.4,
      },
      logoWrap: { alignItems: "center", marginVertical: ms(10) },
      logoRing: {
        width: logo,
        height: logo,
        borderRadius: logo / 2,
        borderWidth: 2.5,
        borderColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
      },
      titleBlock: {
        alignItems: "flex-end",
        alignSelf: "flex-end",
        maxWidth: "75%",
      },
      title: {
        color: WHITE,
        fontSize: ms(25),
        fontWeight: "800",
        letterSpacing: -0.4,
        textAlign: RTL ? "left" : "right",
      },
      subtitle: {
        color: "rgba(255,255,255,0.82)",
        fontSize: ms(13),
        fontWeight: "600",
        marginTop: 3,
        textAlign: RTL ? "left" : "right",
      },

      /* Body */
      body: {
        flex: 1,
        width: "100%",
        maxWidth: formMax,
        alignSelf: "center",
        paddingHorizontal: hPad,
        paddingTop: ms(24),
        paddingBottom: Math.max(insets.bottom, 16) + 8,
      },

      /* Stepper */
      stepper: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: ms(26),
      },
      nodeOuter: {
        width: dot,
        height: dot,
        alignItems: "center",
        justifyContent: "center",
      },
      halo: {
        position: "absolute",
        width: dot,
        height: dot,
        borderRadius: dot / 2,
        backgroundColor: GREEN,
      },
      node: {
        width: dot,
        height: dot,
        borderRadius: dot / 2,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
      },
      segment: {
        flex: 1,
        height: 5,
        borderRadius: 3,
        marginHorizontal: ms(8),
        backgroundColor: BORDER,
        overflow: "hidden",
      },
      segmentFill: {
        height: "100%",
        borderRadius: 3,
        backgroundColor: GREEN,
      },

      /* Floating-label field */
      fieldWrap: { marginBottom: ms(14) },
      field: {
        height: fieldH,
        flexDirection: "row",
        alignItems: "center",
        paddingStart: ms(10),
        paddingEnd: ms(14),
        borderRadius: FIELD_RADIUS,
        borderWidth: 1.5,
        backgroundColor: WHITE,
        shadowColor: SLATE,
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      },
      fieldIcon: {
        width: iconBox,
        height: iconBox,
        borderRadius: ms(12),
        alignItems: "center",
        justifyContent: "center",
      },
      fieldBody: {
        flex: 1,
        height: "100%",
        marginStart: ms(12),
        justifyContent: "center",
      },
      fieldLabel: {
        position: "absolute",
        start: 0,
        fontWeight: "600",
      },
      fieldInput: {
        fontSize: ms(15.5),
        fontWeight: "600",
        color: SLATE,
        paddingTop: ms(16),
        paddingBottom: 0,
        paddingVertical: 0,
        height: "100%",
      },
      validBubble: {
        width: ms(22),
        height: ms(22),
        borderRadius: ms(11),
        backgroundColor: GREEN,
        alignItems: "center",
        justifyContent: "center",
      },
      fieldError: {
        color: RED,
        fontSize: ms(12),
        fontWeight: "700",
        marginTop: 6,
        marginStart: 8,
      },

      /* Password strength */
      strengthRow: {
        flexDirection: "row",
        gap: 6,
        marginTop: -ms(4),
        marginBottom: ms(14),
        marginHorizontal: 4,
      },
      strengthBar: { flex: 1, height: 4, borderRadius: 2 },

      spacer: { flex: 1, minHeight: ms(20) },

      /* CTA */
      primaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: clamp(ms(56), 52, 64),
        borderRadius: FIELD_RADIUS,
        backgroundColor: GREEN,
        shadowColor: GREEN_DARK,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
      },
      primaryBtnText: {
        color: WHITE,
        fontSize: ms(15),
        fontWeight: "800",
        letterSpacing: 0.5,
      },
      disabled: { opacity: 0.65 },

      /* Divider + Google */
      divider: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginVertical: ms(16),
      },
      dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
      dividerText: { color: INACTIVE, fontSize: ms(12.5), fontWeight: "700" },
      googleBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        height: clamp(ms(56), 52, 64),
        borderRadius: FIELD_RADIUS,
        backgroundColor: WHITE,
        borderWidth: 1.5,
        borderColor: BORDER,
      },
      googleMark: {
        fontSize: ms(22),
        fontWeight: "900",
        color: GOOGLE_BLUE,
        includeFontPadding: false,
      },
      googleText: { color: SLATE, fontSize: ms(15), fontWeight: "700" },

      loginLink: { marginTop: ms(18), alignItems: "center", paddingVertical: 4 },
      loginLinkText: { fontSize: ms(13), color: MUTED, fontWeight: "600" },
      loginLinkStrong: { color: GREEN, fontWeight: "800" },
    }),
  };
};

/* ------------------------------------------------------------------ */
/* Stepper: nodes joined by segments that fill one after the other     */
/* ------------------------------------------------------------------ */
function Stepper({ steps, step, styles, ms }) {
  const progress = useRef(new Animated.Value(step)).current; // in "step" units
  const pop = useRef(steps.map(() => new Animated.Value(1))).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: step,
      duration: 560,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();

    pop[step].setValue(0.78);
    Animated.spring(pop[step], {
      toValue: 1,
      friction: 4,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, [step, progress, pop]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(halo, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [halo]);

  const clampOpts = { extrapolate: "clamp" };

  return (
    <View style={styles.stepper}>
      {steps.map((s, i) => {
        const done = i < step;
        const active = i === step;
        const reached = i <= step;
        const Icon = s.icon;

        const bg = progress.interpolate({
          inputRange: [i - 1, i],
          outputRange: [WHITE, GREEN],
          ...clampOpts,
        });
        const border = progress.interpolate({
          inputRange: [i - 1, i],
          outputRange: [BORDER, GREEN],
          ...clampOpts,
        });

        return (
          <React.Fragment key={s.key}>
            <Animated.View
              style={[styles.nodeOuter, { transform: [{ scale: pop[i] }] }]}
            >
              {active ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.halo,
                    {
                      opacity: halo.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.35, 0],
                      }),
                      transform: [
                        {
                          scale: halo.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.7],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ) : null}
              <Animated.View
                style={[
                  styles.node,
                  { backgroundColor: bg, borderColor: border },
                ]}
              >
                {done ? (
                  <Check size={ms(17)} color={WHITE} strokeWidth={3} />
                ) : (
                  <Icon
                    size={ms(16)}
                    color={reached ? WHITE : INACTIVE}
                    strokeWidth={2.2}
                  />
                )}
              </Animated.View>
            </Animated.View>

            {i < steps.length - 1 ? (
              <View style={styles.segment}>
                <Animated.View
                  style={[
                    styles.segmentFill,
                    {
                      width: progress.interpolate({
                        inputRange: [i, i + 1],
                        outputRange: ["0%", "100%"],
                        ...clampOpts,
                      }),
                    },
                  ]}
                />
              </View>
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Floating-label field                                                */
/* ------------------------------------------------------------------ */
function Field({
  icon: Icon,
  label,
  value,
  onChangeText,
  error,
  valid,
  trailing,
  inputRef,
  placeholder,
  styles,
  ms,
  fieldH,
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  const focus = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(value ? 1 : 0)).current;
  const raised = focused || !!value;

  useEffect(() => {
    Animated.timing(focus, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, focus]);

  useEffect(() => {
    Animated.timing(float, {
      toValue: raised ? 1 : 0,
      duration: 170,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [raised, float]);

  const borderColor = error
    ? RED
    : focus.interpolate({ inputRange: [0, 1], outputRange: [BORDER, GREEN] });

  const iconBg = error
    ? "#FEE2E2"
    : focus.interpolate({ inputRange: [0, 1], outputRange: [ICON_BG, GREEN] });

  const labelColor = error
    ? RED
    : focus.interpolate({ inputRange: [0, 1], outputRange: [MUTED, GREEN_DARK] });

  const labelTop = float.interpolate({
    inputRange: [0, 1],
    outputRange: [(fieldH - ms(20)) / 2 - 1.5, ms(8)],
  });
  const labelSize = float.interpolate({
    inputRange: [0, 1],
    outputRange: [ms(15), ms(11.5)],
  });

  const iconColor = error ? RED : focused ? WHITE : MUTED;

  return (
    <View style={styles.fieldWrap}>
      <Animated.View style={[styles.field, { borderColor }]}>
        <Animated.View style={[styles.fieldIcon, { backgroundColor: iconBg }]}>
          <Icon size={ms(18)} color={iconColor} strokeWidth={2.2} />
        </Animated.View>

        <View style={styles.fieldBody}>
          <Animated.Text
            pointerEvents="none"
            numberOfLines={1}
            style={[
              styles.fieldLabel,
              { top: labelTop, fontSize: labelSize, color: labelColor },
            ]}
          >
            {label}
          </Animated.Text>
          <TextInput
            ref={inputRef}
            accessibilityLabel={label}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={focused && !value ? placeholder : undefined}
            placeholderTextColor={INACTIVE}
            selectionColor={GREEN}
            style={styles.fieldInput}
            {...rest}
          />
        </View>

        {trailing ||
          (valid ? (
            <View style={styles.validBubble}>
              <Check size={ms(13)} color={WHITE} strokeWidth={3.2} />
            </View>
          ) : null)}
      </Animated.View>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */
export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register, loginWithGoogle } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { styles, ms, fieldH } = useMemo(
    () =>
      createStyles({
        width,
        height,
        insets: { top: insets.top, bottom: insets.bottom },
      }),
    [width, height, insets.top, insets.bottom]
  );

  // Falls back to English when a translation key doesn't exist yet
  const tr = (key, fallback) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  const STEPS = [
    {
      key: "identity",
      icon: User,
      title: t("auth.register.step1Title"),
      subtitle: t("auth.register.step1Subtitle"),
    },
    {
      key: "contact",
      icon: Phone,
      title: t("auth.register.step2Title"),
      subtitle: t("auth.register.step2Subtitle"),
    },
    {
      key: "security",
      icon: Lock,
      title: t("auth.register.step3Title"),
      subtitle: t("auth.register.step3Subtitle"),
    },
  ];

  const [step, setStep] = useState(0);

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const busy = loading || googleLoading;

  // Input refs for the keyboard "next" chain
  const emailRef = useRef(null);
  const cityRef = useRef(null);
  const confirmRef = useRef(null);

  // Animations
  const slideX = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const runShake = () =>
    Animated.sequence(
      [10, -10, 7, -7, 3, 0].map((v) =>
        Animated.timing(shake, {
          toValue: v,
          duration: 55,
          useNativeDriver: true,
        })
      )
    ).start();

  // Slide transition between steps
  const transitionTo = (nextStep, direction = 1) => {
    const outX = direction > 0 ? -40 : 40;

    Animated.parallel([
      Animated.timing(slideX, {
        toValue: outX,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideX.setValue(-outX);
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // ── Per-step validation → { field: message } ──
  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!name.trim()) e.name = t("auth.register.valName");
      if (!email.trim()) e.email = t("auth.register.valEmail");
      else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
        e.email = t("auth.register.valEmailValid");
    }
    if (s === 1) {
      if (!phone.trim()) e.phone = t("auth.register.valPhone");
      if (!city.trim()) e.city = t("auth.register.valCity");
    }
    if (s === 2) {
      if (!password) e.password = t("auth.register.valPassword");
      else if (password.length < 6)
        e.password = t("auth.register.valPasswordLength");
      if (password && password !== confirmPassword)
        e.confirm = t("auth.register.valPasswordMatch");
      else if (!confirmPassword && password)
        e.confirm = t("auth.register.valPasswordMatch");
    }
    return e;
  };

  // Update a field and clear its error
  const bind = (field, setter) => (v) => {
    setter(v);
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      runShake();
      return;
    }
    setErrors({});
    if (step < STEPS.length - 1) {
      transitionTo(step + 1, 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigation?.goBack();
      return;
    }
    setErrors({});
    transitionTo(step - 1, -1);
  };

  const handleSubmit = async () => {
    // Final guard across all steps
    for (let i = 0; i < STEPS.length; i++) {
      const errs = validateStep(i);
      if (Object.keys(errs).length) {
        setErrors(errs);
        if (i !== step) transitionTo(i, i > step ? 1 : -1);
        else runShake();
        return;
      }
    }

    try {
      setLoading(true);
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        password,
        confirm_password: confirmPassword,
      });
    } catch (error) {
      const data = error.response?.data;
      if (data?.errors) {
        const firstError = Object.values(data.errors)[0]?.[0];
        Alert.alert(
          t("auth.register.registrationFailed"),
          firstError || t("auth.register.checkInfo")
        );
      } else {
        Alert.alert(
          t("auth.register.registrationFailed"),
          data?.message || t("auth.somethingWentWrong")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---- Google sign-in ---- */
  const [googleRequest, googleResponse, promptGoogle] =
    Google.useIdTokenAuthRequest({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    });

  const handleGoogleToken = useCallback(
    async (idToken) => {
      if (!idToken || typeof loginWithGoogle !== "function") {
        Alert.alert(
          t("auth.register.registrationFailed"),
          t("auth.somethingWentWrong")
        );
        return;
      }
      try {
        setGoogleLoading(true);
        await loginWithGoogle({ idToken });
      } catch (error) {
        Alert.alert(
          t("auth.register.registrationFailed"),
          error.response?.data?.message || t("auth.somethingWentWrong")
        );
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, t]
  );

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === "success") {
      const idToken =
        googleResponse.params?.id_token ||
        googleResponse.authentication?.idToken;
      handleGoogleToken(idToken);
    } else if (googleResponse.type === "error") {
      Alert.alert(
        t("auth.register.registrationFailed"),
        t("auth.somethingWentWrong")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

  const handleGooglePress = () => {
    if (!googleRequest || busy) return;
    promptGoogle();
  };

  // ── Helpers ──
  const eyeToggle = (shown, setShown) => (
    <TouchableOpacity onPress={() => setShown((v) => !v)} hitSlop={10}>
      {shown ? (
        <EyeOff size={ms(19)} color={MUTED} />
      ) : (
        <Eye size={ms(19)} color={MUTED} />
      )}
    </TouchableOpacity>
  );

  const fieldProps = { styles, ms, fieldH };
  const isLast = step === STEPS.length - 1;
  const BackIcon = RTL ? ArrowRight : ArrowLeft;
  const NextIcon = RTL ? ArrowLeft : ArrowRight;
  const score = passwordScore(password);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Curved header ── */}
          <View style={styles.header}>
            <View style={styles.circleBig} pointerEvents="none" />
            <View style={styles.circleSmall} pointerEvents="none" />

            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                hitSlop={10}
                activeOpacity={0.7}
              >
                <BackIcon size={ms(20)} color={WHITE} strokeWidth={2.4} />
              </TouchableOpacity>

              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  {step + 1}/{STEPS.length}
                </Text>
              </View>
            </View>

            <View style={styles.logoWrap}>
              <View style={styles.logoRing}>
                <UserPlus size={ms(28)} color={WHITE} strokeWidth={2.2} />
              </View>
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                {STEPS[step].title}
              </Text>
              <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
                {STEPS[step].subtitle}
              </Text>
            </View>
          </View>

          {/* ── Body ── */}
          <View style={styles.body}>
            <Stepper steps={STEPS} step={step} styles={styles} ms={ms} />

            {/* Animated step content */}
            <Animated.View
              style={{
                opacity: fadeIn,
                transform: [{ translateX: slideX }, { translateX: shake }],
              }}
            >
              {step === 0 && (
                <>
                  <Field
                    {...fieldProps}
                    icon={User}
                    label={t("auth.register.fullName")}
                    value={name}
                    onChangeText={bind("name", setName)}
                    placeholder={t("auth.register.namePlaceholder")}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    blurOnSubmit={false}
                    error={errors.name}
                    valid={name.trim().length > 1}
                  />
                  <Field
                    {...fieldProps}
                    inputRef={emailRef}
                    icon={Mail}
                    label={t("auth.email")}
                    value={email}
                    onChangeText={bind("email", setEmail)}
                    placeholder={t("auth.emailPlaceholder")}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                    error={errors.email}
                    valid={/^\S+@\S+\.\S+$/.test(email.trim())}
                  />
                </>
              )}

              {step === 1 && (
                <>
                  <Field
                    {...fieldProps}
                    icon={Phone}
                    label={t("auth.register.phone")}
                    value={phone}
                    onChangeText={bind("phone", setPhone)}
                    placeholder={t("auth.register.phonePlaceholder")}
                    keyboardType="phone-pad"
                    error={errors.phone}
                    valid={phone.replace(/\D/g, "").length >= 8}
                  />
                  <Field
                    {...fieldProps}
                    inputRef={cityRef}
                    icon={MapPin}
                    label={t("auth.register.city")}
                    value={city}
                    onChangeText={bind("city", setCity)}
                    placeholder={t("auth.register.cityPlaceholder")}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                    error={errors.city}
                    valid={city.trim().length > 1}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <Field
                    {...fieldProps}
                    icon={Lock}
                    label={t("auth.password")}
                    value={password}
                    onChangeText={bind("password", setPassword)}
                    placeholder={t("auth.register.passwordHint")}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    blurOnSubmit={false}
                    error={errors.password}
                    trailing={eyeToggle(showPassword, setShowPassword)}
                  />

                  {/* Strength meter */}
                  <View style={styles.strengthRow}>
                    {[1, 2, 3, 4].map((n) => (
                      <View
                        key={n}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              score >= n ? SCORE_COLORS[score] : BORDER,
                          },
                        ]}
                      />
                    ))}
                  </View>

                  <Field
                    {...fieldProps}
                    inputRef={confirmRef}
                    icon={Lock}
                    label={t("auth.register.confirmPassword")}
                    value={confirmPassword}
                    onChangeText={bind("confirm", setConfirmPassword)}
                    placeholder={t("auth.register.confirmPasswordPlaceholder")}
                    secureTextEntry={!showConfirm}
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                    error={errors.confirm}
                    trailing={eyeToggle(showConfirm, setShowConfirm)}
                  />
                </>
              )}
            </Animated.View>

            {/* Pushes the CTA toward the bottom on tall screens */}
            <View style={styles.spacer} />

            {/* CTA */}
            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.disabled]}
              activeOpacity={0.88}
              onPress={handleNext}
              disabled={busy}
            >
              {loading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.2}>
                    {isLast ? t("auth.createAccount") : t("common.continue")}
                  </Text>
                  <NextIcon size={ms(16)} color={WHITE} strokeWidth={2.6} />
                </>
              )}
            </TouchableOpacity>

            {/* Google sign-in (first step only) */}
            {step === 0 && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{tr("common.or", "or")}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleBtn, busy && styles.disabled]}
                  activeOpacity={0.85}
                  onPress={handleGooglePress}
                  disabled={busy || !googleRequest}
                >
                  {googleLoading ? (
                    <ActivityIndicator color={GOOGLE_BLUE} />
                  ) : (
                    <>
                      <Text style={styles.googleMark}>G</Text>
                      <Text style={styles.googleText} maxFontSizeMultiplier={1.2}>
                        {tr("auth.continueWithGoogle", "Continue with Google")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Login link */}
            <TouchableOpacity
              style={styles.loginLink}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginLinkText}>
                {t("auth.register.alreadyHaveAccount")}{" "}
                <Text style={styles.loginLinkStrong}>{t("auth.login")}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}