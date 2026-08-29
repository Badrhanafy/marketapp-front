import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  Package,
  PlusCircle,
  User,
} from "lucide-react-native";
import {
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "../screens/home/HomeScreen";
import ProductsScreen from "../screens/products/ProductsScreen";
import CreateProductScreen from "../screens/products/CreateProductScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Responsive helper functions
const isSmallDevice = SCREEN_WIDTH < 375;
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768;
const isLargeDevice = SCREEN_WIDTH >= 768 && SCREEN_WIDTH < 1024;
const isTablet = SCREEN_WIDTH >= 768;
const isSmallHeight = SCREEN_HEIGHT < 700;
const isLargeHeight = SCREEN_HEIGHT > 900;

// Calculate responsive sizes
const getTabBarHeight = () => {
  if (isTablet) return 80;
  if (isSmallDevice) return 60;
  if (isSmallHeight) return 55;
  return 70;
};

const getTabBarPadding = () => {
  if (isTablet) return 12;
  if (isSmallDevice) return 6;
  if (isSmallHeight) return 4;
  return 10;
};

const getFontSize = () => {
  if (isTablet) return 14;
  if (isSmallDevice) return 11;
  if (isSmallHeight) return 10;
  return 12;
};

const getIconSize = () => {
  if (isTablet) return 28;
  if (isSmallDevice) return 22;
  if (isSmallHeight) return 20;
  return 24;
};

// Custom tab bar icon component
const TabBarIcon = ({ route, focused, color, size }) => {
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

  // Enhanced styling for the Sell button
  if (route.name === "Sell") {
    return (
      <View
        style={[
          styles.sellButtonContainer,
          focused && styles.sellButtonFocused,
        ]}
      >
        <View style={styles.sellButtonInner}>
          <Icon
            size={size + 6}
            color={focused ? "#FFFFFF" : "#3D8B16"}
            strokeWidth={focused ? 2.5 : 2}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <Icon
        size={size}
        color={color}
        strokeWidth={focused ? 2.5 : 2}
      />
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
};

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  const tabBarHeight = getTabBarHeight();
  const tabBarPadding = getTabBarPadding();
  const fontSize = getFontSize();
  const iconSize = getIconSize();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        
        tabBarStyle: {
          height: tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom || tabBarPadding,
          paddingTop: tabBarPadding,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          
          // Shadow for iOS
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          
          // Shadow for Android
          elevation: 8,
        },

        tabBarLabelStyle: {
          fontSize: fontSize,
          fontWeight: "600",
          marginTop: 4,
          ...(isSmallHeight && { 
            fontSize: 9,
            marginTop: 2,
          }),
        },

        tabBarActiveTintColor: "#3D8B16",
        tabBarInactiveTintColor: "#94A3B8",
        
        tabBarItemStyle: {
          paddingVertical: 4,
        },

        tabBarIcon: ({ focused, color, size }) => (
          <TabBarIcon
            route={route}
            focused={focused}
            color={color}
            size={iconSize || size}
          />
        ),
        
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: true,
        tabBarLabelPosition: "below-icon",
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
          tabBarLabelStyle: {
            fontSize: fontSize,
            fontWeight: "700",
            ...(isSmallHeight && { fontSize: 9 }),
          },
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

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minHeight: 30,
    minWidth: 30,
  },
  iconContainerFocused: {
    // Subtle scale effect for focused icons
    transform: [{ scale: 1.1 }],
  },
  activeIndicator: {
    position: "absolute",
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3D8B16",
  },
  sellButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    position: "relative",
  },
  sellButtonFocused: {
    transform: [{ scale: 1.05 }],
  },
  sellButtonInner: {
    width: isTablet ? 56 : isSmallDevice ? 44 : 48,
    height: isTablet ? 56 : isSmallDevice ? 44 : 48,
    borderRadius: isTablet ? 28 : isSmallDevice ? 22 : 24,
    backgroundColor: "#B9FA3C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3D8B16",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});

