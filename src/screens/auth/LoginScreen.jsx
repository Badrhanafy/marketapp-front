import React, { useState } from "react";
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
  ImageBackground,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import logo from "../../../assets/applogo.jpg";
import { useAuth } from "../../context/AuthContext";

// ── Background image (swap for your own) ──
const BG_IMAGE = require("../../../assets/loginback.jpg");

// ── Palette ──
const LIME = "#B8E601";
const LIME_PRESSED = "#A6D100";
const INK = "#0B1220";
const WHITE = "#FFFFFF";
const ON_DARK = "#FFFFFF";
const ON_DARK_SOFT = "rgba(255,255,255,0.72)";
const LINE = "rgba(255,255,255,0.45)";

const SIDE = 28;
const MAX_W = 420;

/* Google "G" logo */
const GoogleLogo = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>
);

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const busy = loading || googleLoading;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t("auth.missingFieldsTitle"), t("auth.missingFieldsMsg"));
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (error) {
  console.log("========== LOGIN ERROR ==========");
  console.log("Message:", error.message);
  console.log("Code:", error.code);
  console.log("Response:", error.response?.data);
  console.log("Status:", error.response?.status);
  console.log("Request:", error.request);
  console.log("URL:", error.config?.baseURL);
  console.log("=================================");

  Alert.alert(
    "Login Error",
    `${error.code || ""}\n${error.message}`
  );
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

  const renderField = ({ name, value, onChangeText, placeholder, inputProps, trailing }) => {
    const focused = focusedField === name;
    return (
      <View style={styles.fieldBlock}>
        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocusedField(name)}
            onBlur={() => setFocusedField(null)}
            placeholder={placeholder}
            placeholderTextColor={ON_DARK_SOFT}
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── BACKGROUND IMAGE ── */}
      <ImageBackground
        source={BG_IMAGE}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* ── DARK OVERLAY (for readability) ── */}
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.55)",
            "rgba(0,0,0,0.65)",
            "rgba(0,0,0,0.80)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle green tint to keep brand feel */}
        <View pointerEvents="none" style={styles.greenTint} />
      </ImageBackground>

      {/* Soft decorative shapes on top of overlay */}
      <View pointerEvents="none" style={styles.blobA} />
      <View pointerEvents="none" style={styles.blobB} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 22 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.column}>
            {/* LOGO + TITLE */}
            <View style={styles.brand}>
              <View style={styles.logoCard}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                {t("auth.welcomeBack")}
              </Text>
              <Text style={styles.subtitle}>{t("auth.signInToContinue")}</Text>
            </View>

            {/* FIELDS */}
            {renderField({
              name: "email",
              value: email,
              onChangeText: setEmail,
              placeholder: t("auth.email"),
              inputProps: {
                autoCapitalize: "none",
                keyboardType: "email-address",
                autoCorrect: false,
                autoComplete: "email",
                textContentType: "emailAddress",
                returnKeyType: "next",
              },
            })}

            {renderField({
              name: "password",
              value: password,
              onChangeText: setPassword,
              placeholder: t("auth.password"),
              inputProps: {
                secureTextEntry: !showPassword,
                autoCapitalize: "none",
                autoComplete: "password",
                textContentType: "password",
                returnKeyType: "go",
                onSubmitEditing: handleLogin,
              },
              trailing: (
                <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={12}>
                  {showPassword ? (
                    <EyeOff size={19} color={ON_DARK_SOFT} />
                  ) : (
                    <Eye size={19} color={ON_DARK_SOFT} />
                  )}
                </TouchableOpacity>
              ),
            })}

            {/* SIGN IN */}
            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.disabled]}
              activeOpacity={0.88}
              onPress={handleLogin}
              disabled={busy}
            >
              {loading ? (
                <ActivityIndicator color={INK} />
              ) : (
                <Text style={styles.primaryBtnText}>{t("auth.login")}</Text>
              )}
            </TouchableOpacity>

            {/* GOOGLE */}
            <TouchableOpacity
              style={[styles.googleBtn, busy && styles.disabled]}
              activeOpacity={0.88}
              onPress={handleGoogle}
              disabled={busy}
            >
              {googleLoading ? (
                <ActivityIndicator color={INK} />
              ) : (
                <>
                  <GoogleLogo size={18} />
                  <Text style={styles.googleBtnText}>{t("auth.continueWithGoogle")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* BOTTOM ROW: create account | forgot password */}
          <View style={[styles.column, styles.bottomRow]}>
            <TouchableOpacity onPress={() => navigation.navigate("Register")} hitSlop={10}>
              <Text style={styles.bottomLink}>{t("auth.createAccount")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate?.("ForgotPassword")}
              hitSlop={10}
            >
              <Text style={styles.bottomLink}>{t("auth.forgotPassword")}</Text>
            </TouchableOpacity>
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

  /* subtle green brand tint over the dark overlay */
  greenTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 90, 50, 0.18)",
  },

  /* decorative shapes */
  blobA: {
    position: "absolute",
    top: -90,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(184,230,1,0.08)",
  },
  blobB: {
    position: "absolute",
    bottom: -110,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  scroll: {
    flexGrow: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIDE,
  },
  column: { width: "100%", maxWidth: MAX_W },

  /* brand */
  brand: { alignItems: "center", marginBottom: 44 },
  logoCard: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: WHITE,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  logo: { width: "100%", height: "100%" },
  title: {
    fontSize: 44,
    fontWeight: "200",
    color: ON_DARK,
    letterSpacing: 0.5,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14.5,
    color: ON_DARK_SOFT,
    fontWeight: "400",
    textAlign: "center",
  },

  /* fields: underline only */
  fieldBlock: { marginBottom: 22 },
  inputRow: { flexDirection: "row", alignItems: "center", height: 40 },
  inputField: {
    flex: 1,
    fontSize: 17,
    color: ON_DARK,
    paddingVertical: 0,
    height: "100%",
  },
  underline: { height: 1, backgroundColor: LINE, marginTop: 4 },
  underlineActive: { height: 2, backgroundColor: LIME },

  /* buttons */
  primaryBtn: {
    height: 54,
    borderRadius: 6,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: LIME_PRESSED,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  primaryBtnText: {
    color: INK,
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  googleBtn: {
    height: 54,
    borderRadius: 6,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 14,
  },
  googleBtnText: {
    color: INK,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  disabled: { opacity: 0.6 },

  /* bottom links */
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
  },
  bottomLink: {
    fontSize: 13.5,
    color: ON_DARK,
    fontWeight: "500",
    opacity: 0.9,
  },
});