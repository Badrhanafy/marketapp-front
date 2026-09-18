import React from "react";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import NotificationsScreen from "../screens/notifications/NotificationsScreen";

import { useAuth } from "../context/AuthContext";
import MainTabs from '../navigation/MainTabs'
import RateUsScreen from "../components/RateUsScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

import MyProductsScreen from "../screens/profile/MyProductsScreen";
import MyProductDetailsScreen from "../screens/profile/MyProductDetailsScreen";

import NearbyScreen from "../screens/products/NearbyScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";

import CategoryProductsScreen from "../screens/products/CategoryProductsScreen";
import ProductDetailsScreen from "../screens/products/ProductDetailsScreen";
import WelcomeScreen from "../screens/auth/Welcomscreens";

import ChatListScreen from "../screens/chat/ChatListScreen";
import ChatScreen from "../screens/chat/ChatScreen";

import FloatingChatButton from "../components/FloatingChatButton";

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef();

/* =========================================================
   AUTH STACK
========================================================= */

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
      />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
      />
    </Stack.Navigator>
  );
};

/* =========================================================
   APP STACK
========================================================= */

const AppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
      />

      <Stack.Screen
        name="MyProducts"
        component={MyProductsScreen}
      />

      <Stack.Screen
        name="MyProductDetails"
        component={MyProductDetailsScreen}
      />

      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
      />

      <Stack.Screen
        name="CategoryProducts"
        component={CategoryProductsScreen}
      />

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />

      <Stack.Screen
        name="Nearby"
        component={NearbyScreen}
      />

      <Stack.Screen
        name="CTA"
        component={RateUsScreen}
      />

      {/* CHAT */}

      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
      />

      <Stack.Screen
        name="Chat"
        component={ChatScreen}
      />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

/* =========================================================
   APP NAVIGATOR
========================================================= */

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <AppStack /> : <AuthStack />}

      {user && <FloatingChatButton />}
    </NavigationContainer>
  );
}