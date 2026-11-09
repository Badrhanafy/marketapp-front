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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
} from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

/* ──────────────────────────────────────────────────────────────
   Theme — same fresh grocery palette as the Home screen
   ────────────────────────────────────────────────────────────── */
const PRIMARY = "#1DA058";
const PRIMARY_DARK = "#14784A";
const MINT = "#E3F1DC";
const MINT_SOFT = "#EEF6EA";
const MINT_TINT = "#D6EBDD";

const PAGE_BG = "#FFFFFF";
const WHITE = "#FFFFFF";
const INK = "#14221A";
const INK_SOFT = "#3B4A41";
const MUTED = "#6F7D74";
const INACTIVE = "#9CA8A1";
const BORDER = "rgba(20,34,26,0.10)";

const STRENGTH_COLORS = ["#EF4444", "#F59E0B", "#84CC16", "#1DA058"];

const SOFT_SHADOW = {
  shadowColor: "#14221A",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 3,
};

/* ── Eased gradient: mint that dissolves into the page (no visible edge) ── */
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `#${A.map((v, i) =>
    Math.round(v + (B[i] - v) * k)
      .toString(16)
      .padStart(2, "0")
  ).join("")}`;
};
const buildFade = (from, to, steps = 12) => {
  const colors = [];
  const locations = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const eased = t * t * (3 - 2 * t);
    colors.push(mix(from, to, eased));
    locations.push(t);
  }
  colors[steps] = to;
  return { colors, locations };
};
const HEADER_FADE = buildFade("#CFE8C6", PAGE_BG);

/* ================================================================== */
/* Stepper                                                            */
/* Icon nodes on a track that fills as you progress. Each node pops   */
/* in with a spring, the active one gets a soft halo.                 */
/* ================================================================== */
const NODE = 42;

function Stepper({ steps, step }) {
  const n = steps.length;
  const [width, setWidth] = useState(0);

  const progress = useRef(new Animated.Value(step / (n - 1))).current;
  const reach = useRef(
    steps.map((_, i) => new Animated.Value(i <= step ? 1 : 0))
  ).current;
  const halo = useRef(
    steps.map((_, i) => new Animated.Value(i === step ? 1 : 0))
  ).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: step / (n - 1),
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();

    steps.forEach((_, i) => {
      Animated.spring(reach[i], {
        toValue: i <= step ? 1 : 0,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start();
      Animated.spring(halo[i], {
        toValue: i === step ? 1 : 0,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const inset = width / (n * 2); // center of the first / last node

  return (
    <View style={styles.stepper} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* Track + animated fill */}
      <View style={[styles.track, { left: inset, right: inset }]}>
        <Animated.View
          style={[
            styles.trackFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = i < step;
        const active = i === step;

        return (
          <View key={s.key} style={styles.nodeCol}>
            <View style={styles.nodeBox}>
              {/* halo */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.halo,
                  {
                    opacity: halo[i],
                    transform: [
                      {
                        scale: halo[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.6, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />

              {/* base circle */}
              <View style={styles.nodeBase} />

              {/* filled circle */}
              <Animated.View
                style={[
                  styles.nodeFill,
                  {
                    opacity: reach[i],
                    transform: [
                      {
                        scale: reach[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.55, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />

              {/* icon (grey) cross-fades to icon / check (white) */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.center,
                  {
                    opacity: reach[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                  },
                ]}
              >
                <Icon size={18} color={INACTIVE} strokeWidth={2.2} />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.center, { opacity: reach[i] }]}
              >
                {done ? (
                  <Check size={19} color={WHITE} strokeWidth={3} />
                ) : (
                  <Icon size={18} color={WHITE} strokeWidth={2.4} />
                )}
              </Animated.View>
            </View>

            <Text
              style={[
                styles.nodeLabel,
                (active || done) && styles.nodeLabelOn,
              ]}
              numberOfLines={1}
            >
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ================================================================== */
/* Screen                                                             */
/* ================================================================== */
export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();

  const STEPS = useMemo(
    () => [
      {
        key: "identity",
        icon: User,
        label: t("auth.register.stepLabel1", { defaultValue: "Account" }),
        title: t("auth.register.step1Title"),
        subtitle: t("auth.register.step1Subtitle"),
      },
      {
        key: "contact",
        icon: Phone,
        label: t("auth.register.stepLabel2", { defaultValue: "Contact" }),
        title: t("auth.register.step2Title"),
        subtitle: t("auth.register.step2Subtitle"),
      },
      {
        key: "security",
        icon: Lock,
        label: t("auth.register.stepLabel3", { defaultValue: "Security" }),
        title: t("auth.register.step3Title"),
        subtitle: t("auth.register.step3Subtitle"),
      },
    ],
    [t]
  );

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

  // Content transition (native driver)
  const slideX = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);

  const transitionTo = (nextStep, direction = 1) => {
    if (busy.current) return;
    busy.current = true;
    const outX = direction > 0 ? -32 : 32;

    Animated.parallel([
      Animated.timing(slideX, {
        toValue: outX,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideX.setValue(-outX);
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => {
        busy.current = false;
      });
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

  // ── Password strength (0-4) ──
  const strength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s += 1;
    if (password.length >= 10) s += 1;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) s += 1;
    if (/[^A-Za-z0-9]/.test(password)) s += 1;
    return Math.max(1, s);
  }, [password]);

  const strengthLabel = [
    "",
    t("auth.register.strengthWeak", { defaultValue: "Weak" }),
    t("auth.register.strengthFair", { defaultValue: "Fair" }),
    t("auth.register.strengthGood", { defaultValue: "Good" }),
    t("auth.register.strengthStrong", { defaultValue: "Strong" }),
  ][strength];

  // ── Field helper ──
  const inputRow = ({
    icon: Icon,
    field,
    value,
    onChangeText,
    placeholder,
    right,
    ...rest
  }) => {
    const focused = focusedField === field;
    return (
      <View style={[styles.input, focused && styles.inputFocused]}>
        <Icon size={18} color={focused ? PRIMARY : INACTIVE} strokeWidth={2.2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocusedField(field)}
          onBlur={() => setFocusedField(null)}
          placeholder={placeholder}
          placeholderTextColor={INACTIVE}
          selectionColor={PRIMARY}
          style={styles.inputField}
          {...rest}
        />
        {right}
      </View>
    );
  };

  const eyeButton = (visible, toggle) => (
    <TouchableOpacity onPress={toggle} hitSlop={10}>
      {visible ? (
        <EyeOff size={18} color={MUTED} />
      ) : (
        <Eye size={18} color={MUTED} />
      )}
    </TouchableOpacity>
  );

  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header: mint wash that dissolves into the page ── */}
          <LinearGradient
            colors={HEADER_FADE.colors}
            locations={HEADER_FADE.locations}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.header, { paddingTop: insets.top + 12 }]}
          >
            <View style={styles.topRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                hitSlop={10}
                activeOpacity={0.75}
              >
                <ArrowLeft size={20} color={INK} strokeWidth={2.4} />
              </TouchableOpacity>

              <View style={styles.counterPill}>
                <Text style={styles.counterText}>
                  {step + 1}
                  <Text style={styles.counterTotal}> / {STEPS.length}</Text>
                </Text>
              </View>
            </View>

            <Stepper steps={STEPS} step={step} />
          </LinearGradient>

          {/* ── Animated step content ── */}
          <View style={styles.form}>
            <Animated.View
              style={{ opacity: fadeIn, transform: [{ translateX: slideX }] }}
            >
              <View style={styles.headerBlock}>
                <Text style={styles.title}>{STEPS[step].title}</Text>
                <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>
              </View>

              {step === 0 && (
                <>
                  <Text style={styles.label}>{t("auth.register.fullName")}</Text>
                  {inputRow({
                    icon: User,
                    field: "name",
                    value: name,
                    onChangeText: setName,
                    placeholder: t("auth.register.namePlaceholder"),
                    autoCapitalize: "words",
                  })}

                  <Text style={styles.label}>{t("auth.email")}</Text>
                  {inputRow({
                    icon: Mail,
                    field: "email",
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
                  <Text style={styles.label}>{t("auth.register.phone")}</Text>
                  {inputRow({
                    icon: Phone,
                    field: "phone",
                    value: phone,
                    onChangeText: setPhone,
                    placeholder: t("auth.register.phonePlaceholder"),
                    keyboardType: "phone-pad",
                  })}

                  <Text style={styles.label}>{t("auth.register.city")}</Text>
                  {inputRow({
                    icon: MapPin,
                    field: "city",
                    value: city,
                    onChangeText: setCity,
                    placeholder: t("auth.register.cityPlaceholder"),
                    autoCapitalize: "words",
                  })}
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.label}>{t("auth.password")}</Text>
                  {inputRow({
                    icon: Lock,
                    field: "password",
                    value: password,
                    onChangeText: setPassword,
                    placeholder: t("auth.register.passwordHint"),
                    secureTextEntry: !showPassword,
                    right: eyeButton(showPassword, () =>
                      setShowPassword((s) => !s)
                    ),
                  })}

                  {password.length > 0 && (
                    <View style={styles.strengthRow}>
                      <View style={styles.strengthBars}>
                        {[1, 2, 3, 4].map((i) => (
                          <View
                            key={i}
                            style={[
                              styles.strengthBar,
                              i <= strength && {
                                backgroundColor: STRENGTH_COLORS[strength - 1],
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <Text
                        style={[
                          styles.strengthLabel,
                          { color: STRENGTH_COLORS[strength - 1] },
                        ]}
                      >
                        {strengthLabel}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.label}>
                    {t("auth.register.confirmPassword")}
                  </Text>
                  {inputRow({
                    icon: Lock,
                    field: "confirm",
                    value: confirmPassword,
                    onChangeText: setConfirmPassword,
                    placeholder: t("auth.register.confirmPasswordPlaceholder"),
                    secureTextEntry: !showConfirm,
                    right: eyeButton(showConfirm, () =>
                      setShowConfirm((s) => !s)
                    ),
                  })}
                </>
              )}
            </Animated.View>

            {/* ── CTA ── */}
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
                  <Text style={styles.primaryBtnText}>
                    {isLast ? t("auth.createAccount") : t("common.continue")}
                  </Text>
                  <ArrowRight size={17} color={WHITE} strokeWidth={2.6} />
                </>
              )}
            </TouchableOpacity>

            {/* ── Login link ── */}
            {step === 0 && (
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
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ------------------------- styles ------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },

  /* Header */
  header: { paddingHorizontal: 22, paddingBottom: 34 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    ...SOFT_SHADOW,
  },
  counterPill: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: { fontSize: 14, fontWeight: "900", color: INK },
  counterTotal: { color: MUTED, fontWeight: "700" },

  /* Stepper */
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  track: {
    position: "absolute",
    top: NODE / 2 - 2,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(20,34,26,0.10)",
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
  nodeCol: { flex: 1, alignItems: "center" },
  nodeBox: {
    width: NODE,
    height: NODE,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: NODE + 14,
    height: NODE + 14,
    borderRadius: (NODE + 14) / 2,
    backgroundColor: "rgba(29,160,88,0.18)",
  },
  nodeBase: {
    position: "absolute",
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    ...SOFT_SHADOW,
  },
  nodeFill: {
    position: "absolute",
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: PRIMARY,
  },
  nodeLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: INACTIVE,
  },
  nodeLabelOn: { color: PRIMARY_DARK },

  /* Form */
  form: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: 22,
    marginTop: 4,
  },
  headerBlock: { marginBottom: 22 },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13.5,
    color: MUTED,
    fontWeight: "600",
    marginTop: 5,
    lineHeight: 19,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: INK_SOFT,
    marginBottom: 8,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 16,
    ...SOFT_SHADOW,
  },
  inputFocused: {
    borderColor: PRIMARY,
    backgroundColor: MINT_SOFT,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: INK,
    paddingVertical: 0,
  },

  /* Password strength */
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -6,
    marginBottom: 16,
  },
  strengthBars: { flex: 1, flexDirection: "row", gap: 6 },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(20,34,26,0.10)",
  },
  strengthLabel: { fontSize: 12, fontWeight: "800", minWidth: 44 },

  /* CTA */
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    marginTop: 12,
    shadowColor: PRIMARY_DARK,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  primaryBtnText: {
    color: WHITE,
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  disabled: { opacity: 0.65 },

  loginLink: { marginTop: 22, alignItems: "center" },
  loginLinkText: { fontSize: 13.5, color: MUTED, fontWeight: "600" },
  loginLinkStrong: { color: PRIMARY, fontWeight: "800" },
});