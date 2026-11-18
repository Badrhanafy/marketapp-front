import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_COUNT = 5;

/* Metrics shared by the custom tab bar and by every screen that needs to
   clear it. Keep this file free of screen imports to avoid require cycles. */
export function getMetrics(width, height, bottomInset) {
  const shortSide = Math.min(width, height);
  const isTablet = shortSide >= 600;
  const isSmall = width < 360;
  const isLandscape = width > height;
  const isCompact = !isTablet && (height < 500 || isLandscape);

  const barContent = isTablet ? 82 : isCompact ? 60 : isSmall ? 68 : 72;
  const ballSize = isTablet ? 60 : isCompact ? 46 : isSmall ? 50 : 54;
  const iconSize = isTablet ? 26 : isCompact || isSmall ? 22 : 24;
  const labelSize = isTablet ? 12 : isSmall ? 10 : 11;
  const corner = isTablet ? 28 : isSmall ? 22 : 26;
  const tabSize = isTablet ? 52 : 46;
  const gap = 4; // thin ring of background between ball and notch
  const jump = isCompact ? 8 : 12; // small lift while sliding

  const inset = Math.max(bottomInset || 0, 0);
  const barHeight = barContent + inset;

  const notchR = ballSize / 2 + 6;
  const scoopHalf = notchR * 1.9;
  // Deep notch: the ball sits INSIDE the curve, only ~1/4 of it above the bar edge
  const restDepth = Math.round(notchR * 1.38);

  const ballAbove = ballSize + gap - restDepth;
  const headroom = ballAbove + jump + 12;

  const rowWidth = Math.min(width, isTablet ? 680 : width);
  const rowLeft = (width - rowWidth) / 2;
  const tabWidth = rowWidth / TAB_COUNT;

  return {
    width,
    barContent,
    barHeight,
    ballSize,
    iconSize,
    labelSize,
    corner,
    tabSize,
    gap,
    jump,
    inset,
    notchR,
    scoopHalf,
    restDepth,
    headroom,
    rowWidth,
    rowLeft,
    tabWidth,
    sceneBottomSpace: barHeight,
  };
}

/* Space to reserve at the bottom of every screen:
   bar height + the part of the ball above the bar + a responsive margin. */
export function useTabBarSpace(extra = 0) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const m = getMetrics(width, height, insets.bottom);
  const shortSide = Math.min(width, height);
  const isTablet = shortSide >= 600;
  const isCompact = !isTablet && (height < 500 || width > height);
  const margin = isTablet
    ? 28
    : isCompact
    ? 12
    : Math.round(Math.max(16, height * 0.025));
  const overhang = Math.max(m.ballSize + m.gap - m.restDepth, 0);
  return m.barHeight + overhang + margin + extra;
}