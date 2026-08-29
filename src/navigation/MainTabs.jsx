import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import {
  Home,
  Package,
  PlusCircle,
  User,
} from "lucide-react-native";

import HomeScreen from "../screens/home/HomeScreen";
import ProductsScreen from "../screens/products/ProductsScreen";
import CreateProductScreen from "../screens/products/CreateProductScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarStyle: {
          position: "absolute",
          bottom: 15,
          left: 15,
          right: 15,
          height: 65,
          borderRadius: 20,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,

          // Shadow
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 8,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },

        tabBarActiveTintColor: "#3D8B16",
        tabBarInactiveTintColor: "#94A3B8",

        tabBarIcon: ({ focused, color, size }) => {
          let Icon;

          switch (route.name) {
            case "Home":
              Icon = Home;
              break;

            case "Products":
              Icon = Package;
              break;

            case "Sell":
              Icon = PlusCircle;
              break;

            case "Profile":
              Icon = User;
              break;

            default:
              Icon = Home;
          }

          return (
            <Icon
              size={size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Home",
        }}
      />

      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: "Products",
        }}
      />

      <Tab.Screen
        name="Sell"
        component={CreateProductScreen}
        options={{
          title: "Sell",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}