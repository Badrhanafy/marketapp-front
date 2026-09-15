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
} from "react-native";
import { Mail, Lock, Eye, EyeOff } from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";

// ── Palette ──
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_TINT = "#ECFDF5";
const SLATE = "#0F172A";
const MUTED = "#64748B";
const INACTIVE = "#94A3B8";
const WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
    } catch (error) {
      Alert.alert(
        "Login failed",
        error.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

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
          <View style={styles.form}>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            {/* EMAIL */}
            <Text style={styles.label}>Email</Text>
            <View
              style={[
                styles.input,
                focusedField === "email" && styles.inputFocused,
              ]}
            >
              <Mail
                size={18}
                color={focusedField === "email" ? GREEN : INACTIVE}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                placeholder="you@example.com"
                placeholderTextColor={INACTIVE}
                style={styles.inputField}
              />
            </View>

            {/* PASSWORD */}
            <Text style={styles.label}>Password</Text>
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
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor={INACTIVE}
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

            {/* LOGIN BUTTON */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.primaryBtnText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* CREATE ACCOUNT */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.secondaryBtnText}>Create account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ------------------------- styles ------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  flex: { flex: 1 },

  scroll: {
    flexGrow: 1,
    justifyContent: "center", // ← centers vertically
    alignItems: "center",     // ← centers horizontally
    paddingHorizontal: 22,
    paddingVertical: 40,
  },

  form: {
    width: "100%",
    maxWidth: 420, // keeps it from stretching too wide on tablets
  },

  subtitle: {
    fontSize: 14,
    color: MUTED,
    fontWeight: "600",
    marginBottom: 28,
    textAlign: "center",
  },

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

  primaryBtn: {
    height: 54,
    borderRadius: 999,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  disabled: { opacity: 0.65 },

  secondaryBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryBtnText: {
    color: GREEN_DARK,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});