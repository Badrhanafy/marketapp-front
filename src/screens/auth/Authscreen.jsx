import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
  Switch,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Eye, EyeOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import logo from "../../../assets/applogo.jpg";
import { useAuth } from "../../context/AuthContext";

/* ── Palette ── */
const LIME = "#B8E601";
const LIME_PRESSED = "#A6D100";
const INK = "#0B1220";
const WHITE = "#FFFFFF";
const CARD = "#1C1B1F";
const ON_CARD = "#F5F5F5";
const ON_CARD_MUTED = "#8E8E93";
const LINE = "rgba(255,255,255,0.14)";
const PILL = "#E7E7EA";
const TRACK = "rgba(255,255,255,0.10)";

const FIELD_H = 74; // fixed height of one field block (needed to animate collapse)
const FORGOT_H = 30;
const GOOGLE_H = 52 + 14;
const REMEMBER_H = 56;

const GoogleLogo = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>
);

/* ================================================================== */
/* Collapse: animates height + opacity (+ small slide) from `v` 0 → 1 */
/* ================================================================== */
function Collapse({ v, height, children }) {
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        overflow: "hidden",
        height: v.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
        opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }),
        transform: [
          {
            translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/* ================================================================== */
/* Screen                                                             */
/* ================================================================== */
export default function AuthScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { login, register, loginWithGoogle } = useAuth();

  // mode: 0 = login, 1 = sign up
  const initial = route?.params?.mode === "register" ? 1 : 0;
  const [mode, setMode] = useState(initial);
  const isSignup = mode === 1;

  // form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const busy = loading || googleLoading;

  /* ── animation: p = 0 (login) → 1 (sign up) ── */
  const p = useRef(new Animated.Value(initial)).current;
  const signupV = p; // visible when signing up
  const loginV = useRef(p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: mode,
      duration: 460,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false, // height / color animations
    }).start();
  }, [mode]);

  /* segmented toggle */
  const [trackW, setTrackW] = useState(0);
  const pillW = Math.max(0, (trackW - 8) / 2);
  const pillX = p.interpolate({ inputRange: [0, 1], outputRange: [0, pillW] });
  const loginLabelColor = p.interpolate({ inputRange: [0, 1], outputRange: [INK, ON_CARD_MUTED] });
  const signupLabelColor = p.interpolate({ inputRange: [0, 1], outputRange: [ON_CARD_MUTED, INK] });

  const switchMode = (next) => {
    if (next === mode || busy) return;
    setShowPassword(false);
    setShowConfirm(false);
    setFocusedField(null);
    setMode(next);
  };

  /* ── validation ── */
  const validate = () => {
    if (!isSignup) {
      if (!email.trim() || !password)
        return [t("auth.missingFieldsTitle"), t("auth.missingFieldsMsg")];
      return null;
    }
    const hold = t("common.holdOn");
    if (!name.trim()) return [hold, t("auth.register.valName")];
    if (!email.trim()) return [hold, t("auth.register.valEmail")];
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return [hold, t("auth.register.valEmailValid")];
    if (!phone.trim()) return [hold, t("auth.register.valPhone")];
    if (!city.trim()) return [hold, t("auth.register.valCity")];
    if (!password) return [hold, t("auth.register.valPassword")];
    if (password.length < 6) return [hold, t("auth.register.valPasswordLength")];
    if (password !== confirmPassword) return [hold, t("auth.register.valPasswordMatch")];
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert(err[0], err[1]);
      return;
    }
    try {
      setLoading(true);
      if (!isSignup) {
        await login(email.trim(), password, remember);
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
          password,
          confirm_password: confirmPassword,
        });
      }
    } catch (error) {
      const data = error.response?.data;
      if (isSignup && data?.errors) {
        const first = Object.values(data.errors)[0]?.[0];
        Alert.alert(t("auth.register.registrationFailed"), first || t("auth.register.checkInfo"));
      } else {
        Alert.alert(
          isSignup ? t("auth.register.registrationFailed") : t("auth.loginFailed"),
          data?.message || t("auth.somethingWentWrong")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      if (typeof loginWithGoogle !== "function") {
        throw new Error("loginWithGoogle is not implemented in AuthContext");
      }
      await loginWithGoogle();
    } catch (error) {
      Alert.alert(
        t("auth.loginFailed"),
        error.response?.data?.message || t("auth.somethingWentWrong")
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ── field helper ── */
  const field = ({ name: key, label, value, onChangeText, trailing, ...inputProps }) => {
    const focused = focusedField === key;
    return (
      <View style={styles.fieldBlock}>
        <Text style={[styles.label, focused && { color: LIME }]}>{label}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocusedField(key)}
            onBlur={() => setFocusedField(null)}
            placeholderTextColor={ON_CARD_MUTED}
            selectionColor={LIME}
            style={styles.inputField}
            {...inputProps}
          />
          {trailing}
        </View>
        <View style={[styles.underline, focused && styles.underlineActive]} />
      </View>
    );
  };

  const eye = (visible, toggle) => (
    <TouchableOpacity onPress={toggle} hitSlop={12}>
      {visible ? (
        <EyeOff size={18} color={ON_CARD_MUTED} />
      ) : (
        <Eye size={18} color={ON_CARD_MUTED} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* LOGO */}
          <View style={styles.brand}>
            <Image source={logo} style={styles.logo} resizeMode="cover" />
          </View>

          {/* CARD */}
          <View style={styles.card}>
            {/* Segmented toggle */}
            <View style={styles.track} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
              <Animated.View
                style={[styles.pill, { width: pillW, transform: [{ translateX: pillX }] }]}
              />
              <TouchableOpacity style={styles.tab} activeOpacity={0.8} onPress={() => switchMode(0)}>
                <Animated.Text style={[styles.tabText, { color: loginLabelColor }]}>
                  {t("auth.login")}
                </Animated.Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tab} activeOpacity={0.8} onPress={() => switchMode(1)}>
                <Animated.Text style={[styles.tabText, { color: signupLabelColor }]}>
                  {t("auth.register.signUp", { defaultValue: "Sign up" })}
                </Animated.Text>
              </TouchableOpacity>
            </View>

            {/* Sign-up only: name */}
            <Collapse v={signupV} height={FIELD_H}>
              {field({
                name: "name",
                label: t("auth.register.fullName"),
                value: name,
                onChangeText: setName,
                autoCapitalize: "words",
                editable: isSignup,
              })}
            </Collapse>

            {/* Shared: email */}
            {field({
              name: "email",
              label: t("auth.email"),
              value: email,
              onChangeText: setEmail,
              autoCapitalize: "none",
              keyboardType: "email-address",
              autoCorrect: false,
              autoComplete: "email",
              textContentType: "emailAddress",
            })}

            {/* Sign-up only: phone + city */}
            <Collapse v={signupV} height={FIELD_H}>
              {field({
                name: "phone",
                label: t("auth.register.phone"),
                value: phone,
                onChangeText: setPhone,
                keyboardType: "phone-pad",
                editable: isSignup,
              })}
            </Collapse>
            <Collapse v={signupV} height={FIELD_H}>
              {field({
                name: "city",
                label: t("auth.register.city"),
                value: city,
                onChangeText: setCity,
                autoCapitalize: "words",
                editable: isSignup,
              })}
            </Collapse>

            {/* Shared: password */}
            {field({
              name: "password",
              label: t("auth.password"),
              value: password,
              onChangeText: setPassword,
              secureTextEntry: !showPassword,
              autoCapitalize: "none",
              autoComplete: isSignup ? "password-new" : "password",
              textContentType: isSignup ? "newPassword" : "password",
              trailing: eye(showPassword, () => setShowPassword((s) => !s)),
            })}

            {/* Sign-up only: confirm */}
            <Collapse v={signupV} height={FIELD_H}>
              {field({
                name: "confirm",
                label: t("auth.register.confirmPassword"),
                value: confirmPassword,
                onChangeText: setConfirmPassword,
                secureTextEntry: !showConfirm,
                autoCapitalize: "none",
                editable: isSignup,
                trailing: eye(showConfirm, () => setShowConfirm((s) => !s)),
              })}
            </Collapse>

            {/* Login only: forgot password */}
            <Collapse v={loginV} height={FORGOT_H}>
              <TouchableOpacity
                style={styles.forgotWrap}
                hitSlop={8}
                onPress={() => navigation?.navigate?.("ForgotPassword")}
              >
                <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
              </TouchableOpacity>
            </Collapse>

            {/* Primary button — label cross-fades */}
            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.disabled]}
              activeOpacity={0.9}
              onPress={handleSubmit}
              disabled={busy}
            >
              {loading ? (
                <ActivityIndicator color={INK} />
              ) : (
                <View style={styles.btnLabelBox}>
                  <Animated.Text style={[styles.primaryBtnText, styles.btnLabelAbs, { opacity: loginV }]}>
                    {t("auth.login")}
                  </Animated.Text>
                  <Animated.Text style={[styles.primaryBtnText, styles.btnLabelAbs, { opacity: signupV }]}>
                    {t("auth.register.signUp", { defaultValue: "Sign up" })}
                  </Animated.Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Login only: Google */}
            <Collapse v={loginV} height={GOOGLE_H}>
              <TouchableOpacity
                style={[styles.googleBtn, busy && styles.disabled]}
                activeOpacity={0.7}
                onPress={handleGoogle}
                disabled={busy}
              >
                {googleLoading ? (
                  <ActivityIndicator color={ON_CARD} />
                ) : (
                  <>
                    <GoogleLogo />
                    <Text style={styles.googleBtnText}>{t("auth.continueWithGoogle")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </Collapse>
          </View>

          {/* Remember me — below the card, login only */}
          <Collapse v={loginV} height={REMEMBER_H}>
            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>
                {t("auth.rememberMe", { defaultValue: "Remember me" })}
              </Text>
              <Switch
                value={remember}
                onValueChange={setRemember}
                trackColor={{ false: "#D1D5DB", true: LIME }}
                thumbColor={WHITE}
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </Collapse>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ------------------------- styles ------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  brand: { alignItems: "center", marginBottom: 24 },
  logo: { width: 64, height: 64, borderRadius: 20 },

  /* card */
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: CARD,
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },

  /* segmented toggle */
  track: {
    flexDirection: "row",
    height: 44,
    borderRadius: 22,
    backgroundColor: TRACK,
    padding: 4,
    marginBottom: 22,
  },
  pill: {
    position: "absolute",
    top: 4,
    left: 4,
    height: 36,
    borderRadius: 18,
    backgroundColor: PILL,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 14, fontWeight: "700" },

  /* fields */
  fieldBlock: { height: FIELD_H, justifyContent: "flex-start", paddingTop: 6 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: ON_CARD_MUTED,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  inputRow: { flexDirection: "row", alignItems: "center", height: 30 },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: ON_CARD,
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  underline: { height: 1.5, backgroundColor: LINE, borderRadius: 1, marginTop: 8 },
  underlineActive: { backgroundColor: LIME },

  forgotWrap: { alignSelf: "flex-end", paddingTop: 4 },
  forgotText: { fontSize: 13, fontWeight: "700", color: LIME },

  /* primary */
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 14,
    shadowColor: LIME_PRESSED,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  btnLabelBox: { width: 140, height: 22, alignItems: "center", justifyContent: "center" },
  btnLabelAbs: { position: "absolute", textAlign: "center", width: "100%" },
  primaryBtnText: { color: INK, fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  disabled: { opacity: 0.6 },

  /* google */
  googleBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  googleBtnText: { color: ON_CARD, fontSize: 15, fontWeight: "700" },

  /* remember me */
  rememberRow: {
    height: REMEMBER_H,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 8,
  },
  rememberText: { fontSize: 13, fontWeight: "700", color: INK },
});