// src/hooks/useUserLocation.js
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import * as Location from "expo-location";

// ============================================================
// useUserLocation
// ------------------------------------------------------------
// Robust hook that returns the user's GPS coordinates with:
//   • Permission handling (request + status)
//   • Location-services check
//   • Instant "last known" position for fast first paint
//   • Accuracy ladder: High → Balanced → Low (each with timeout)
//   • Manual refresh + open-settings helpers
//   • Safe against unmount during async work
//
// Returns:
//   {
//     location:    { latitude, longitude, accuracy } | null,
//     loading:     boolean,           // first acquisition in progress
//     refreshing:  boolean,           // manual refresh in progress
//     error:       string | null,
//     permission:  'granted' | 'denied' | 'undetermined' | null,
//     servicesOn:  boolean | null,
//     refresh:     () => Promise<coords | null>,
//     openSettings:() => void,
//   }
// ============================================================

const ACCURACY_LADDER = [
  { accuracy: Location.Accuracy.High,     timeout: 15000, label: "high" },
  { accuracy: Location.Accuracy.Balanced, timeout: 12000, label: "balanced" },
  { accuracy: Location.Accuracy.Low,      timeout: 8000,  label: "low" },
];

export default function useUserLocation() {
  const [location, setLocation]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);
  const [permission, setPermission] = useState(null);
  const [servicesOn, setServicesOn] = useState(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // --------------------------------------------------------
  // getCurrentPositionAsync wrapped with a hard timeout
  // --------------------------------------------------------
  const getPositionWithTimeout = (accuracy, timeout) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`timeout-${accuracy}`)),
        timeout
      );

      Location.getCurrentPositionAsync({
        accuracy,
        mayShowUserSettingsDialog: true,
      })
        .then((pos) => {
          clearTimeout(timer);
          resolve(pos);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });

  // --------------------------------------------------------
  // Core acquisition
  // --------------------------------------------------------
  const acquire = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        // 1) Are location services enabled at all?
        const enabled = await Location.hasServicesEnabledAsync();
        if (mounted.current) setServicesOn(enabled);

        if (!enabled) {
          if (mounted.current) {
            setError(
              "Location services are turned off. Enable GPS in your device settings."
            );
          }
          return null;
        }

        // 2) Foreground permission (request if needed)
        let perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== "granted") {
          perm = await Location.requestForegroundPermissionsAsync();
        }
        if (mounted.current) setPermission(perm.status);

        if (perm.status !== "granted") {
          if (mounted.current) {
            setError(
              "Location permission was denied. Enable it in settings to see nearby products."
            );
          }
          return null;
        }

        // 3) Instant win: last known position (fast, no wait)
        try {
          const last = await Location.getLastKnownPositionAsync({
            maxAge: 1000 * 60 * 5, // accept up to 5 min old
            requiredAccuracy: 5000, // <= 5 km
          });
          if (last?.coords && mounted.current) {
            setLocation({
              latitude: last.coords.latitude,
              longitude: last.coords.longitude,
              accuracy: last.coords.accuracy,
            });
          }
        } catch (e) {
          console.log("last-known-position miss:", e?.message);
        }

        // 4) Fresh fix — walk the accuracy ladder
        let fresh = null;
        for (const step of ACCURACY_LADDER) {
          try {
            fresh = await getPositionWithTimeout(step.accuracy, step.timeout);
            console.log(`✅ GPS fixed at ${step.label} accuracy`);
            break;
          } catch (e) {
            console.log(`⚠️ GPS ${step.label} failed:`, e?.message);
          }
        }

        if (!fresh?.coords) {
          // If we at least have a stale fix, keep it and don't error
          if (location) {
            console.log("Using stale last-known location");
            return location;
          }
          if (mounted.current) {
            setError(
              "Couldn't get a GPS fix. Move near a window or try again in a moment."
            );
          }
          return null;
        }

        const coords = {
          latitude: fresh.coords.latitude,
          longitude: fresh.coords.longitude,
          accuracy: fresh.coords.accuracy,
        };
        if (mounted.current) setLocation(coords);
        return coords;
      } catch (err) {
        console.log("LOCATION ACQUISITION ERROR:", err);
        if (mounted.current) {
          setError(
            err?.message?.includes("timeout")
              ? "GPS timed out. Try again or move outdoors."
              : "Unable to get your location right now."
          );
        }
        return null;
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [location]
  );

  // --------------------------------------------------------
  // Public: manual refresh
  // --------------------------------------------------------
  const refresh = useCallback(async () => {
    setRefreshing(true);
    return acquire({ silent: true });
  }, [acquire]);

  // --------------------------------------------------------
  // Public: open OS settings for this app
  // --------------------------------------------------------
  const openSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:").catch(() => Linking.openSettings());
    } else {
      Linking.openSettings();
    }
  }, []);

  // First run
  useEffect(() => {
    acquire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    location,
    loading,
    refreshing,
    error,
    permission,
    servicesOn,
    refresh,
    openSettings,
  };
}