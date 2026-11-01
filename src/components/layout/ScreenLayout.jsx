import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { useTheme } from "../../context/ThemeContext";

/**
 * ScreenLayout provides a responsive container for screens.
 * Automatically saves a bottom margin/padding from the screen content
 * to the fixed bottom navigation tabs bar, ensuring no content is clipped
 * or obscured on any screen size.
 *
 * Props:
 * - children: Screen content
 * - scrollable: Boolean. If true, wraps children in a ScrollView
 * - hasTabBar: Boolean (default true). If true, saves margin bottom for the tab bar
 * - style: ViewStyle for the outer container
 * - contentContainerStyle: ViewStyle for scrollable content or inner container
 * - extraBottomMargin: Number. Extra margin to add beyond the tab bar clearance
 * - centerOnTablet: Boolean (default true). Centers and constrains content on tablets
 * - scrollProps: Additional props passed to ScrollView if scrollable is true
 */
export default function ScreenLayout({
  children,
  scrollable = false,
  hasTabBar = true,
  style,
  contentContainerStyle,
  extraBottomMargin = 0,
  centerOnTablet = true,
  scrollProps = {},
}) {
  const { colors } = useTheme();
  const {
    isTablet,
    maxContentWidth,
    contentPaddingBottom,
    contentBottomMargin,
  } = useResponsiveLayout();

  const bottomSpacing = hasTabBar
    ? (scrollable ? contentPaddingBottom : contentBottomMargin) + extraBottomMargin
    : extraBottomMargin;

  const tabletWrapperStyle =
    centerOnTablet && isTablet
      ? {
          maxWidth: maxContentWidth,
          width: "100%",
          alignSelf: "center",
        }
      : { width: "100%" };

  if (scrollable) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background || "transparent" },
          style,
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
          contentContainerStyle={[
            styles.scrollContent,
            tabletWrapperStyle,
            { paddingBottom: bottomSpacing },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background || "transparent" },
        style,
      ]}
    >
      <View
        style={[
          styles.content,
          tabletWrapperStyle,
          hasTabBar ? { paddingBottom: bottomSpacing } : null,
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
