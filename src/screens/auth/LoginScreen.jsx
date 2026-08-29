import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
} from "react-native";

import { useAuth } from "../../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert(
        "Login failed",
        error.response?.data?.message || "Something went wrong"
      );
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 16, marginBottom: 8  }} >Email</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          padding: 12,
          marginBottom: 16,
        }}
      />

      <Text>Password</Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          padding: 12,
          marginBottom: 16,
        }}
      />

     <View style={{ marginTop: 16,gap: 8,flexDirection: "column", justifyContent: "space-arround" }}>
         <Button
        title="Login"
        onPress={handleLogin}
      />
     
      <Button
      style={{ marginTop: 16 }}
        title="Create account"
        onPress={() => navigation.navigate("Register")}
      />
     </View>
    </View>
  );
}