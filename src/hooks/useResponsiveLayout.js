import { useMemo } from "react";
import { useWindowDimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Breakpoints:
 * - Small phones:  width < 375 (iPhone SE, smaller Androids)
 * - Standard:      375 <= width < 768 (iPhone 12/13/14/15/16, Pixel, Galaxy S)
 * - Tablets:       768 <= width < 1024 (iPad Mini, iPad 10.2", Galaxy Tab)
 * - Large Tablets: width >= 1024 (iPad Pro 12.9", Desktop / Web)
 */
export const BREAKPOINTS = {
  small: 375,
  tablet: 768,
  largeTablet: 1024,
};

/**
 * Pure calculation function for metrics (can be used inside or outside hooks).
 */
export function getResponsiveMetrics(width, height, insets) {
  const isLandscape = width > height;
  const isSmallDevice = width < BREAKPOINTS.small;
  const isTablet = width >= BREAKPOINTS.tablet;
  const isLargeTablet = width >= BREAKPOINTS.largeTablet;
  const isMediumDevice = !isSmallDevice && !isTablet;

  // Base navigation tab bar height (excluding safe area bottom)
  const tabBarBaseHeight = isTablet ? 64 : isSmallDevice ? 52 : 56;

  // Actual bottom inset from safe area context
  const safeBottom = Math.max(insets?.bottom || 0, 0);

  // Total tab bar height docked at bottom including safe area
  const tabBarTotalHeight = tabBarBaseHeight + safeBottom;

  // Floating center FAB lift above the tab bar top edge
  const tabBarFabLift = isTablet ? 16 : isSmallDevice ? 12 : 14;

  // Center button & icon sizing
  const tabBarCenterSize = isTablet ? 62 : isSmallDevice ? 50 : 54;
  const tabBarIconSize = isTablet ? 23 : isSmallDevice ? 19 : 21;
  const tabBarFabRing = 3;
  const tabBarNotchRadius = tabBarCenterSize / 2 + tabBarFabRing + 4;
  const tabBarCornerRadius = isTablet ? 24 : isSmallDevice ? 18 : 20;

  // Clearance from the very top peak of the tab bar (including floating center button)
  const tabBarClearance = tabBarTotalHeight + tabBarFabLift;

  // Saved margin bottom from content to fixed navigation tabs bar
  // Ensures all cards, texts, inputs, and buttons sit comfortably above the bar
  const contentBottomMargin = tabBarClearance + 16;

  // Ideal scroll container paddingBottom so the last item can scroll well above the tab bar
  const contentPaddingBottom = tabBarClearance + 24;

  // Ideal margin bottom for fixed/sticky footers (e.g. Back/Next buttons in forms)
  const footerBottomMargin = tabBarTotalHeight + 12;

  // Tablet content container maximum width for readable, centered layouts
  const maxContentWidth = isLargeTablet ? 960 : isTablet ? 780 : "100%";

  return {
    width,
    height,
    isLandscape,
    isSmallDevice,
    isMediumDevice,
    isTablet,
    isLargeTablet,
    insets,
    safeBottom,

    // Tab bar dimensions
    tabBarBaseHeight,
    tabBarTotalHeight,
    tabBarFabLift,
    tabBarCenterSize,
    tabBarIconSize,
    tabBarFabRing,
    tabBarNotchRadius,
    tabBarCornerRadius,

    // Layout clearance & margins to the fixed bottom navigation tabs bar
    tabBarClearance,
    contentBottomMargin,
    contentPaddingBottom,
    footerBottomMargin,

    // Tablet layout helpers
    maxContentWidth,
  };
}

/**
 * React hook that dynamically returns responsive metrics and bottom tab bar clearance.
 * Automatically updates on screen rotation, tablet split-view, and window resize.
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(
    () => getResponsiveMetrics(width, height, insets),
    [width, height, insets]
  );
}

export default useResponsiveLayout;
