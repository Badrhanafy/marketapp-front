import React, { useState, useRef, useEffect, useMemo } from "react";
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

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const RTL = I18nManager.isRTL;

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
  const fieldH = clamp(ms(54), 50, 62);
  const dot = ms(38);

  return {
    ms,
    dot,
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
        justifyContent: "space-between",
        alignItems: "center",
        height: dot,
        marginBottom: ms(24),
        marginHorizontal: ms(6),
      },
      stepTrack: {
        position: "absolute",
        start: dot / 2,
        end: dot / 2,
        top: (dot - 4) / 2,
        height: 4,
        borderRadius: 2,
        backgroundColor: BORDER,
        overflow: "hidden",
      },
      stepTrackFill: { height: "100%", backgroundColor: GREEN },
      dot: {
        width: dot,
        height: dot,
        borderRadius: dot / 2,
        backgroundColor: WHITE,
        borderWidth: 1.5,
        borderColor: BORDER,
        alignItems: "center",
        justifyContent: "center",
      },
      dotActive: {
        backgroundColor: GREEN,
        borderColor: GREEN_SOFT,
        borderWidth: 4,
      },
      dotDone: { backgroundColor: GREEN_TINT, borderColor: GREEN },

      /* Pill inputs */
      input: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        height: fieldH,
        borderRadius: 999,
        paddingHorizontal: ms(20),
        marginBottom: ms(14),
        backgroundColor: WHITE,
        borderWidth: 1.5,
        borderColor: "transparent",
        shadowColor: SLATE,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      },
      inputFocused: { borderColor: GREEN },
      inputField: {
        flex: 1,
        fontSize: ms(15),
        color: SLATE,
        paddingVertical: 0,
        height: "100%",
      },

      spacer: { flex: 1, minHeight: ms(20) },

      /* CTA */
      primaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: clamp(ms(54), 50, 62),
        borderRadius: 999,
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

      loginLink: { marginTop: ms(18), alignItems: "center", paddingVertical: 4 },
      loginLinkText: { fontSize: ms(13), color: MUTED, fontWeight: "600" },
      loginLinkStrong: { color: GREEN, fontWeight: "800" },
    }),
  };
};

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { styles, ms } = useMemo(
    () =>
      createStyles({
        width,
        height,
        insets: { top: insets.top, bottom: insets.bottom },
      }),
    [width, height, insets.top, insets.bottom]
  );

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);

  // Animations
  const slideX = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(1)).current;

  // Animate stepper track when step changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / (STEPS.length - 1),
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim, STEPS.length]);

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

  // ── Per-step validation ──
  const validateStep = (s) => {
    if (s === 0) {
      if (!name.trim()) return t("auth.register.valName");
      if (!email.trim()) return t("auth.register.valEmail");
      if (!/^\S+@\S+\.\S+$/.test(email.trim()))
        return t("auth.register.valEmailValid");
      return null;
    }
    if (s === 1) {
      if (!phone.trim()) return t("auth.register.valPhone");
      if (!city.trim()) return t("auth.register.valCity");
      return null;
    }
    if (s === 2) {
      if (!password) return t("auth.register.valPassword");
      if (password.length < 6) return t("auth.register.valPasswordLength");
      if (password !== confirmPassword)
        return t("auth.register.valPasswordMatch");
      return null;
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      Alert.alert(t("common.holdOn"), err);
      return;
    }
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
    transitionTo(step - 1, -1);
  };

  const handleSubmit = async () => {
    // Final guard across all steps
    for (let i = 0; i < STEPS.length; i++) {
      const err = validateStep(i);
      if (err) {
        Alert.alert(t("common.holdOn"), err);
        transitionTo(i, i > step ? 1 : -1);
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

  // ── Field helpers ──
  const inputRow = ({
    icon: Icon,
    field,
    label,
    trailing,
    ...rest
  }) => (
    <View style={[styles.input, focusedField === field && styles.inputFocused]}>
      <Icon
        size={ms(18)}
        color={focusedField === field ? GREEN : INACTIVE}
        strokeWidth={2.2}
      />
      <TextInput
        accessibilityLabel={label}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField(null)}
        placeholderTextColor={INACTIVE}
        style={styles.inputField}
        {...rest}
      />
      {trailing}
    </View>
  );

  const eyeToggle = (shown, setShown) => (
    <TouchableOpacity onPress={() => setShown((v) => !v)} hitSlop={10}>
      {shown ? (
        <EyeOff size={ms(18)} color={MUTED} />
      ) : (
        <Eye size={ms(18)} color={MUTED} />
      )}
    </TouchableOpacity>
  );

  const isLast = step === STEPS.length - 1;
  const BackIcon = RTL ? ArrowRight : ArrowLeft;
  const NextIcon = RTL ? ArrowLeft : ArrowRight;

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
            {/* Stepper */}
            <View style={styles.stepper}>
              <View style={styles.stepTrack}>
                <Animated.View
                  style={[
                    styles.stepTrackFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>

              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                const Icon = s.icon;
                return (
                  <View
                    key={s.key}
                    style={[
                      styles.dot,
                      active && styles.dotActive,
                      done && styles.dotDone,
                    ]}
                  >
                    {done ? (
                      <Check size={ms(16)} color={GREEN} strokeWidth={3} />
                    ) : (
                      <Icon
                        size={ms(16)}
                        color={active ? WHITE : INACTIVE}
                        strokeWidth={2.2}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Animated step content */}
            <Animated.View
              style={{
                opacity: fadeIn,
                transform: [{ translateX: slideX }],
              }}
            >
              {step === 0 && (
                <>
                  {inputRow({
                    icon: User,
                    field: "name",
                    label: t("auth.register.fullName"),
                    value: name,
                    onChangeText: setName,
                    placeholder: t("auth.register.namePlaceholder"),
                    autoCapitalize: "words",
                  })}
                  {inputRow({
                    icon: Mail,
                    field: "email",
                    label: t("auth.email"),
                    value: email,
                    onChangeText: setEmail,
                    placeholder: t("auth.emailPlaceholder"),
                    keyboardType: "email-address",
                    autoCapitalize: "none",
                    autoCorrect: false,
                  })}
                </>
              )}

              {step === 1 && (
                <>
                  {inputRow({
                    icon: Phone,
                    field: "phone",
                    label: t("auth.register.phone"),
                    value: phone,
                    onChangeText: setPhone,
                    placeholder: t("auth.register.phonePlaceholder"),
                    keyboardType: "phone-pad",
                  })}
                  {inputRow({
                    icon: MapPin,
                    field: "city",
                    label: t("auth.register.city"),
                    value: city,
                    onChangeText: setCity,
                    placeholder: t("auth.register.cityPlaceholder"),
                    autoCapitalize: "words",
                  })}
                </>
              )}

              {step === 2 && (
                <>
                  {inputRow({
                    icon: Lock,
                    field: "password",
                    label: t("auth.password"),
                    value: password,
                    onChangeText: setPassword,
                    placeholder: t("auth.register.passwordHint"),
                    secureTextEntry: !showPassword,
                    trailing: eyeToggle(showPassword, setShowPassword),
                  })}
                  {inputRow({
                    icon: Lock,
                    field: "confirm",
                    label: t("auth.register.confirmPassword"),
                    value: confirmPassword,
                    onChangeText: setConfirmPassword,
                    placeholder: t("auth.register.confirmPasswordPlaceholder"),
                    secureTextEntry: !showConfirm,
                    trailing: eyeToggle(showConfirm, setShowConfirm),
                  })}
                </>
              )}
            </Animated.View>

            {/* Pushes the CTA toward the bottom on tall screens */}
            <View style={styles.spacer} />

            {/* CTA */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              activeOpacity={0.88}
              onPress={handleNext}
              disabled={loading}
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