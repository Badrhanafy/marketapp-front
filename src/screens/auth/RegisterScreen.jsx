import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ScrollView,
} from "react-native";

import { useAuth } from "../../context/AuthContext";

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !name ||
      !email ||
      !phone ||
      !city ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await register({
        name,
        email,
        phone,
        city,
        password,
        confirm_password: confirmPassword,
      });

    } catch (error) {
      const data = error.response?.data;

      if (data?.errors) {
        const firstError = Object.values(data.errors)[0]?.[0];

        Alert.alert(
          "Registration failed",
          firstError || "Please check your information."
        );
      } else {
        Alert.alert(
          "Registration failed",
          data?.message || "Something went wrong."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 24,
        justifyContent: "center",
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={{
          fontSize: 30,
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        Create Account
      </Text>

      <Text
        style={{
          fontSize: 16,
          color: "#666",
          marginBottom: 30,
        }}
      >
        Create your marketplace account
      </Text>

      {/* Name */}
      <Text>Name</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoCapitalize="words"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginTop: 6,
          marginBottom: 16,
        }}
      />

      {/* Email */}
      <Text>Email</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="example@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginTop: 6,
          marginBottom: 16,
        }}
      />

      {/* Phone */}
      <Text>Phone</Text>

      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="06XXXXXXXX"
        keyboardType="phone-pad"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginTop: 6,
          marginBottom: 16,
        }}
      />

      {/* City */}
      <Text>City</Text>

      <TextInput
        value={city}
        onChangeText={setCity}
        placeholder="Laayoune"
        autoCapitalize="words"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginTop: 6,
          marginBottom: 16,
        }}
      />

      {/* Password */}
      <Text>Password</Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginTop: 6,
          marginBottom: 16,
        }}
      />

      {/* Confirm Password */}
      <Text>Confirm Password</Text>

      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="••••••••"
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginTop: 6,
          marginBottom: 24,
        }}
      />

      <Button
        title={loading ? "Creating account..." : "Create Account"}
        onPress={handleRegister}
        disabled={loading}
      />

      <View style={{ marginTop: 16 }}>
        <Button
          title="Already have an account? Login"
          onPress={() => navigation.navigate("Login")}
        />
      </View>
    </ScrollView>
  );
}