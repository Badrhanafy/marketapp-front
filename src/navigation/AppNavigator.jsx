import React from "react";

import {
  NavigationContainer,
} from "@react-navigation/native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import MyProductsScreen from "../screens/profile/MyProductsScreen";
import MyProductDetailsScreen from "../screens/profile/MyProductDetailsScreen";
import MainTabs from "./MainTabs";
import CategoryProductsScreen from "../screens/products/CategoryProductsScreen";
import ProductDetailsScreen from "../screens/products/ProductDetailsScreen";
const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator>
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
  <Stack.Screen name="CategoryProducts" component={CategoryProductsScreen} />
    </Stack.Navigator>
  );
};

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}