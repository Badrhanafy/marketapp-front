import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
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
  ImageBackground,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
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
} from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

/* ── Theme ── */
const LIME = "#B8E601";
const LIME_PRESSED = "#A6D100";
const INK = "#0B1220";
const WHITE = "#FFFFFF";
const ON_DARK = "#FFFFFF";
const ON_DARK_SOFT = "rgba(255,255,255,0.72)";
const MUTED = "#4B5A52";
const INACTIVE = "#8A968F";
const GREEN = "#1DA058";
const STRENGTH_COLORS = ["#EF4444", "#F59E0B", "#84CC16", "#1DA058"];

const MAX_W = 440;
const BG_IMAGE = require("../../../assets/loginback.jpg");

/* ================================================================== */
/* Field — its OWN component with its OWN focus / show-password state. */
/* Defined at module level so its identity is stable: typing in the    */
/* parent never remounts the TextInput (this was the "can't type" bug).*/
/* ================================================================== */
const Field = memo(function Field({
  icon: Icon,
  label,
  secure,
  compact,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.input,
          compact && styles.inputCompact,
          focused && styles.inputFocused,
        ]}
      >
        <Icon size={18} color={focused ? GREEN : INACTIVE} strokeWidth={2.2} />
        <TextInput
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={INACTIVE}
          selectionColor={GREEN}
          style={styles.inputField}
          secureTextEntry={secure ? !visible : false}
          autoCapitalize={secure ? "none" : inputProps.autoCapitalize}
          {...inputProps}
        />
        {secure && (
          <TouchableOpacity onPress={() => setVisible((v) => !v)} hitSlop={10}>
            {visible ? (
              <EyeOff size={18} color={MUTED} />
            ) : (
              <Eye size={18} color={MUTED} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

/* ================================================================== */
/* Stepper                                                            */
/* ================================================================== */
const NODE = 42;

const Stepper = memo(function Stepper({ steps, step }) {
  const n = steps.length;
  const [width, setWidth] = useState(0);

  const progress = useRef(new Animated.Value(step / (n - 1))).current;
  const reach = useRef(
    steps.map((_, i) => new Animated.Value(i <= step ? 1 : 0))
  ).current;
  const halo = useRef(
    steps.map((_, i) => new Animated.Value(i === step ? 1 : 0))
  ).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const checkDraw = useRef(
    steps.map((_, i) => new Animated.Value(i < step ? 1 : 0))
  ).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: step / (n - 1),
      duration: 620,
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
      Animated.timing(checkDraw[i], {
        toValue: i < step ? 1 : 0,
        duration: 320,
        delay: i < step ? 120 : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const inset = width / (n * 2);

  return (
    <View
      style={styles.stepper}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.track, { left: inset, right: inset }]}>
        <Animated.View
          style={[
            styles.trackFillWrap,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={[GREEN, LIME]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.trackFill}
          />
        </Animated.View>
      </View>

      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = i < step;
        const active = i === step;

        return (
          <View key={s.key} style={styles.nodeCol}>
            <View style={styles.nodeBox}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.halo,
                  {
                    opacity: Animated.multiply(
                      halo[i],
                      pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.55, 1],
                      })
                    ),
                    transform: [
                      {
                        scale: Animated.multiply(
                          halo[i],
                          pulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.18],
                          })
                        ),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.nodeBase} />
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
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.center,
                  {
                    opacity: reach[i].interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: [1, 0, 0],
                    }),
                  },
                ]}
              >
                <Icon size={17} color={ON_DARK_SOFT} strokeWidth={2.2} />
              </Animated.View>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.center,
                  { opacity: done ? 0 : reach[i] },
                ]}
              >
                <Icon size={17} color={INK} strokeWidth={2.4} />
              </Animated.View>
              {done && (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.center,
                    { opacity: checkDraw[i] },
                  ]}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                      d="M5 12.5 L10 17.5 L19 7.5"
                      stroke={INK}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                </Animated.View>
              )}
            </View>
            <Text
              style={[styles.nodeLabel, (active || done) && styles.nodeLabelOn]}
              numberOfLines={1}
            >
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
});

/* ================================================================== */
/* Screen                                                             */
/* ================================================================== */
export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Responsive spacing — scales with screen, never touches the edges
  const small = screenW < 360 || screenH < 640;
  const H_PAD = Math.max(16, Math.round(screenW * 0.05)) +
    Math.max(insets.left, insets.right); // also respects landscape notches
  const cardPad = small ? 16 : 22;

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

  // Form state (a plain object would also work; separate setters are stable)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const slideX = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(1)).current;
  const animating = useRef(false);

  const transitionTo = useCallback(
    (nextStep, direction = 1) => {
      if (animating.current) return;
      animating.current = true;
      const outX = direction > 0 ? -28 : 28;

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
          animating.current = false;
        });
      });
    },
    [fadeIn, slideX]
  );

  const validateStep = useCallback(
    (s) => {
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
    },
    [name, email, phone, city, password, confirmPassword, t]
  );

  const handleSubmit = useCallback(async () => {
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
  }, [
    STEPS,
    validateStep,
    transitionTo,
    step,
    register,
    name,
    email,
    phone,
    city,
    password,
    confirmPassword,
    t,
  ]);

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      Alert.alert(t("common.holdOn"), err);
      return;
    }
    if (step < STEPS.length - 1) transitionTo(step + 1, 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step === 0) {
      navigation?.goBack();
      return;
    }
    transitionTo(step - 1, -1);
  };

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

  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background image + overlay */}
      <ImageBackground
        source={BG_IMAGE}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.65)", "rgba(0,0,0,0.80)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.greenTint} />
      </ImageBackground>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: H_PAD,
              paddingTop: insets.top + (small ? 8 : 14),
              paddingBottom: insets.bottom + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.column}>
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={handleBack}
                hitSlop={10}
                activeOpacity={0.75}
              >
                <ArrowLeft size={20} color={WHITE} strokeWidth={2.4} />
              </TouchableOpacity>

              <View style={styles.counterPill}>
                <Text style={styles.counterText}>
                  {step + 1}
                  <Text style={styles.counterTotal}> / {STEPS.length}</Text>
                </Text>
              </View>
            </View>

            <View style={[styles.stepperWrap, small && { marginBottom: 16 }]}>
              <Stepper steps={STEPS} step={step} />
            </View>

            {/* ── GLASS CARD: half-transparent + backdrop blur ── */}
            <View style={styles.cardShell}>
              {/* Blur is a BACKGROUND layer, sibling of the content — inputs
                  are not children of BlurView, so focus/typing is unaffected */}
              <BlurView
                intensity={45}
                tint="light"
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.glassTint} />
              <View pointerEvents="none" style={styles.glassHighlight} />

              <View
                style={{
                  paddingHorizontal: cardPad,
                  paddingTop: cardPad + 4,
                  paddingBottom: cardPad + 2,
                }}
              >
                <Animated.View
                  style={{ opacity: fadeIn, transform: [{ translateX: slideX }] }}
                >
                  <View style={styles.headerBlock}>
                    <Text style={[styles.title, small && { fontSize: 22 }]}>
                      {STEPS[step].title}
                    </Text>
                    <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>
                  </View>

                  {step === 0 && (
                    <>
                      <Field
                        icon={User}
                        label={t("auth.register.fullName")}
                        value={name}
                        onChangeText={setName}
                        placeholder={t("auth.register.namePlaceholder")}
                        autoCapitalize="words"
                        compact={small}
                      />
                      <Field
                        icon={Mail}
                        label={t("auth.email")}
                        value={email}
                        onChangeText={setEmail}
                        placeholder={t("auth.emailPlaceholder")}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        compact={small}
                      />
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <Field
                        icon={Phone}
                        label={t("auth.register.phone")}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder={t("auth.register.phonePlaceholder")}
                        keyboardType="phone-pad"
                        compact={small}
                      />
                      <Field
                        icon={MapPin}
                        label={t("auth.register.city")}
                        value={city}
                        onChangeText={setCity}
                        placeholder={t("auth.register.cityPlaceholder")}
                        autoCapitalize="words"
                        compact={small}
                      />
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <Field
                        icon={Lock}
                        label={t("auth.password")}
                        value={password}
                        onChangeText={setPassword}
                        placeholder={t("auth.register.passwordHint")}
                        secure
                        compact={small}
                      />

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

                      <Field
                        icon={Lock}
                        label={t("auth.register.confirmPassword")}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder={t("auth.register.confirmPasswordPlaceholder")}
                        secure
                        compact={small}
                      />
                    </>
                  )}
                </Animated.View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.disabled]}
                  activeOpacity={0.88}
                  onPress={handleNext}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={INK} />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>
                        {isLast ? t("auth.createAccount") : t("common.continue")}
                      </Text>
                      <ArrowRight size={17} color={INK} strokeWidth={2.6} />
                    </>
                  )}
                </TouchableOpacity>

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
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ------------------------- styles ------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },

  greenTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 90, 50, 0.18)",
  },

  scrollContent: { flexGrow: 1, alignItems: "center" },
  // One width rule for everything: full available width, capped on tablets.
  column: { width: "100%", maxWidth: MAX_W },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterPill: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: { fontSize: 14, fontWeight: "900", color: ON_DARK },
  counterTotal: { color: ON_DARK_SOFT, fontWeight: "700" },

  stepperWrap: { marginBottom: 24 },

  /* stepper */
  stepper: { flexDirection: "row", alignItems: "flex-start" },
  track: {
    position: "absolute",
    top: NODE / 2 - 2,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  trackFillWrap: { height: "100%", borderRadius: 2, overflow: "hidden" },
  trackFill: { flex: 1, borderRadius: 2 },
  nodeCol: { flex: 1, alignItems: "center" },
  nodeBox: {
    width: NODE,
    height: NODE,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: NODE + 16,
    height: NODE + 16,
    borderRadius: (NODE + 16) / 2,
    backgroundColor: "rgba(184,230,1,0.28)",
  },
  nodeBase: {
    position: "absolute",
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  nodeFill: {
    position: "absolute",
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: LIME,
  },
  nodeLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.3,
  },
  nodeLabelOn: { color: ON_DARK },

  /* ── glass card ── */
  cardShell: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden", // clips the blur to the rounded shape
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,255,255,0.10)", // fallback if blur unsupported
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.38)", // the "half transparent" layer
  },
  glassHighlight: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
  },

  headerBlock: { marginBottom: 18 },
  title: {
    fontSize: 25,
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
    fontSize: 12.5,
    fontWeight: "800",
    color: INK,
    marginBottom: 8,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
  },
  inputCompact: { height: 46, borderRadius: 14, marginBottom: 10 },
  inputFocused: {
    borderColor: GREEN,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: INK,
    paddingVertical: 0,
    height: "100%",
  },

  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -4,
    marginBottom: 14,
  },
  strengthBars: { flex: 1, flexDirection: "row", gap: 6 },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(11,18,32,0.12)",
  },
  strengthLabel: { fontSize: 12, fontWeight: "800", minWidth: 44 },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
    backgroundColor: LIME,
    marginTop: 8,
    shadowColor: LIME_PRESSED,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  primaryBtnText: {
    color: INK,
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  disabled: { opacity: 0.65 },

  loginLink: { marginTop: 18, alignItems: "center" },
  loginLinkText: { fontSize: 13, color: MUTED, fontWeight: "600" },
  loginLinkStrong: { color: GREEN, fontWeight: "800" },
});