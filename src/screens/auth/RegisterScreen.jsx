import React, { useState, useRef, useEffect } from "react";
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
 } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from '../../i18n'
// ── Palette ──
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "#DCFCE7";
const GREEN_TINT = "#ECFDF5";
const SLATE = "#0F172A";
const MUTED = "#64748B";
const INACTIVE = "#94A3B8";
const WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register } = useAuth();

  const STEPS = [
    { key: "identity", title: t("auth.register.step1Title"), subtitle: t("auth.register.step1Subtitle") },
    { key: "contact",  title: t("auth.register.step2Title"), subtitle: t("auth.register.step2Subtitle") },
    { key: "security", title: t("auth.register.step3Title"), subtitle: t("auth.register.step3Subtitle") },
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
  const progressAnim = useRef(new Animated.Value(1 / STEPS.length)).current;
  const fadeIn = useRef(new Animated.Value(1)).current;

  // Animate progress bar when step changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [step]);

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
      if (password.length < 6)
        return t("auth.register.valPasswordLength");
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
    // final guard
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
        Alert.alert(t("auth.register.registrationFailed"), firstError || t("auth.register.checkInfo"));
      } else {
        Alert.alert(t("auth.register.registrationFailed"), data?.message || t("auth.somethingWentWrong"));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Field helper ──
  const inputRow = ({ icon: Icon, field, value, onChangeText, placeholder, ...rest }) => (
    <View
      style={[
        styles.input,
        focusedField === field && styles.inputFocused,
      ]}
    >
      <Icon
        size={18}
        color={focusedField === field ? GREEN : INACTIVE}
        strokeWidth={2.2}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField(null)}
        placeholder={placeholder}
        placeholderTextColor={INACTIVE}
        style={styles.inputField}
        {...rest}
      />
    </View>
  );

  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Top bar: back + progress ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={SLATE} strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.stepCounter}>
            {step + 1}/{STEPS.length}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            {/* ── Header ── */}
            <View style={styles.headerBlock}>
              <Text style={styles.stepEyebrow}>
                {t("auth.register.stepOf", { step: step + 1, total: STEPS.length })}
              </Text>
              <Text style={styles.title}>{STEPS[step].title}</Text>
              <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>
            </View>

            {/* ── Step dots ── */}
            <View style={styles.dotsRow}>
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <View key={s.key} style={styles.dotWrap}>
                    <View
                      style={[
                        styles.dot,
                        active && styles.dotActive,
                        done && styles.dotDone,
                      ]}
                    >
                      {done ? (
                        <Check size={12} color={WHITE} strokeWidth={3} />
                      ) : (
                        <Text
                          style={[
                            styles.dotText,
                            active && styles.dotTextActive,
                          ]}
                        >
                          {i + 1}
                        </Text>
                      )}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View
                        style={[
                          styles.dotConnector,
                          done && styles.dotConnectorDone,
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* ── Animated step content ── */}
            <Animated.View
              style={{
                opacity: fadeIn,
                transform: [{ translateX: slideX }],
              }}
            >
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
                  <View
                    style={[
                      styles.input,
                      focusedField === "password" && styles.inputFocused,
                    ]}
                  >
                    <Lock
                      size={18}
                      color={focusedField === "password" ? GREEN : INACTIVE}
                    />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder={t("auth.register.passwordHint")}
                      placeholderTextColor={INACTIVE}
                      secureTextEntry={!showPassword}
                      style={styles.inputField}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((s) => !s)}
                      hitSlop={10}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={MUTED} />
                      ) : (
                        <Eye size={18} color={MUTED} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>{t("auth.register.confirmPassword")}</Text>
                  <View
                    style={[
                      styles.input,
                      focusedField === "confirm" && styles.inputFocused,
                    ]}
                  >
                    <Lock
                      size={18}
                      color={focusedField === "confirm" ? GREEN : INACTIVE}
                    />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedField("confirm")}
                      onBlur={() => setFocusedField(null)}
                      placeholder={t("auth.register.confirmPasswordPlaceholder")}
                      placeholderTextColor={INACTIVE}
                      secureTextEntry={!showConfirm}
                      style={styles.inputField}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirm((s) => !s)}
                      hitSlop={10}
                    >
                      {showConfirm ? (
                        <EyeOff size={18} color={MUTED} />
                      ) : (
                        <Eye size={18} color={MUTED} />
                      )}
                    </TouchableOpacity>
                  </View>
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
                  <ArrowRight size={16} color={WHITE} strokeWidth={2.6} />
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
  container: { flex: 1, backgroundColor: WHITE },
  flex: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: (StatusBar.currentHeight || 0) + 14,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 999,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: "800",
    color: MUTED,
    minWidth: 28,
    textAlign: "right",
  },

  // Scroll & form
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  form: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    marginTop: 8,
  },

  headerBlock: {
    marginBottom: 22,
  },
  stepEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    color: GREEN,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: SLATE,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "600",
    marginTop: 4,
  },

  // Dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
  },
  dotWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: {
    backgroundColor: GREEN_TINT,
    borderColor: GREEN,
  },
  dotDone: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  dotText: {
    fontSize: 12,
    fontWeight: "800",
    color: INACTIVE,
  },
  dotTextActive: {
    color: GREEN_DARK,
  },
  dotConnector: {
    width: 34,
    height: 2,
    backgroundColor: BORDER,
    marginHorizontal: 6,
  },
  dotConnectorDone: {
    backgroundColor: GREEN,
  },

  // Fields
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: SLATE,
    marginBottom: 8,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: GREEN,
    backgroundColor: GREEN_TINT,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: SLATE,
    paddingVertical: 0,
  },

  // CTA
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 999,
    backgroundColor: GREEN,
    marginTop: 12,
    shadowColor: GREEN_DARK,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primaryBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  disabled: { opacity: 0.65 },

  loginLink: {
    marginTop: 20,
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "600",
  },
  loginLinkStrong: {
    color: GREEN,
    fontWeight: "800",
  },
});