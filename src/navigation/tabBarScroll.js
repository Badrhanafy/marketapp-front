import { useCallback, useEffect, useRef } from "react";

/* ──────────────────────────────────────────────────────────────
   Shared store: screens report scrolling, the tab bar listens.
   ────────────────────────────────────────────────────────────── */
const listeners = new Set();
let hidden = false;

export const getTabBarHidden = () => hidden;

export function setTabBarHidden(next) {
  if (hidden === next) return;
  hidden = next;
  listeners.forEach((fn) => fn(next));
}

export function subscribeTabBar(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ──────────────────────────────────────────────────────────────
   useTabBarScroll
   Returns an `onScroll` handler for any ScrollView / FlatList.
     • scroll down  → bar hides
     • scroll up    → bar shows
     • scroll stops → bar shows (after idleMs)
     • near top     → bar always visible
   ────────────────────────────────────────────────────────────── */
export function useTabBarScroll({
  threshold = 6, // px of travel in one direction before reacting
  idleMs = 260, // show the bar again this long after scrolling stops
  topOffset = 24, // always visible above this scroll position
} = {}) {
  const lastY = useRef(0);
  const travel = useRef(0);
  const timer = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      setTabBarHidden(false);
    },
    []
  );

  return useCallback(
    (e) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = contentOffset.y;
      const maxY = Math.max(contentSize.height - layoutMeasurement.height, 0);

      // iOS rubber-band overscroll: ignore
      if (y < 0 || y > maxY) {
        lastY.current = Math.min(Math.max(y, 0), maxY);
        return;
      }

      const dy = y - lastY.current;
      lastY.current = y;
      if (dy === 0) return;

      // Accumulate travel; reset when direction flips
      if (Math.sign(dy) !== Math.sign(travel.current)) travel.current = 0;
      travel.current += dy;

      if (y <= topOffset) {
        setTabBarHidden(false);
      } else if (travel.current > threshold) {
        setTabBarHidden(true);
      } else if (travel.current < -threshold) {
        setTabBarHidden(false);
      }

      // User stopped scrolling → bring the bar back
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setTabBarHidden(false), idleMs);
    },
    [threshold, idleMs, topOffset]
  );
}