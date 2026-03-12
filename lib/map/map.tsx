// app/map.tsx
//   web-safe version – uses Supabase, no react-native-maps
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, useColorScheme, View } from "react-native";
import { getAppTheme } from "../../constants/theme";
import { loadMapRegion, saveMapRegion } from "../lib/map/mapRegionStorage";
import { filterStops } from "../lib/stops/filterStops";
import { supabase } from "../lib/supabase";
import { SPACING } from "../lib/ui/spacing";
import { FONT_SIZES } from "../lib/ui/typography";
import { loadSettingsFilters, SettingsFilters } from "../utils/settingsStorage";

// Match your existing type tags
export type StopType =
  | "weigh"
  | "grocery"
  | "gas"
  | "food"
  | "dogpark"
  | "propane"
  | "dump"
  | "rest"
  | "park"
  | "attraction";

export type Stop = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  hasWifi: boolean;
  petFriendly: boolean;
  types: StopType[];
};

export default function MapScreen() {
  const [filters, setFilters] = useState<SettingsFilters | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  // Store what *web map* should show (even if it’s not a real map, this is your “viewport”)
  const [webRegion, setWebRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const { stopId } = useLocalSearchParams<{ stopId?: string }>();
  
  const handleWebRegionChange = (next: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => {
    setWebRegion(next);
    void saveMapRegion(next);
  };
  const colorScheme = useColorScheme();
  const theme = getAppTheme(colorScheme === "dark");
  
  // Load filters + stops whenever this screen gains focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        setLoading(true);
        try {
          // 1) Load settings filters from AsyncStorage
          const f = await loadSettingsFilters();

          // 2) Load stops from Supabase
          const { data, error } = await supabase
            .from("stops")
            .select("id, name, lat, lon, has_wifi, pet_friendly, types");

          if (error) {
            throw error;
          }

          if (isActive) {
            setFilters(f);

            if (data) {
              const mapped: Stop[] = data.map((row: any) => ({
                id: row.id,
                name: row.name,
                lat: row.lat,
                lon: row.lon,
                hasWifi: row.has_wifi,
                petFriendly: row.pet_friendly,
                types: (row.types || []) as StopType[],
              }));
              setStops(mapped);
            }
          }
        } catch (e) {
          console.warn("Failed to load filters or stops from Supabase", e);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      load();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    let cancelled = false;
  
    async function restore() {
      // Screen is “ready” after first render
      setMapReady(true);
  
      // IMPORTANT: if we’re opening the map to focus a stop, do NOT restore last region.
      if (stopId) return;
  
      const stored = await loadMapRegion();
      if (cancelled || !stored) return;
  
      setWebRegion(stored);
    }
  
    restore();
  
    return () => {
      cancelled = true;
    };
  }, [stopId]);


  const filteredStops: Stop[] = useMemo(() => {
    if (!filters) return [];
    return filterStops(stops, filters);
  }, [stops, filters]);

  useEffect(() => {
    if (!stopId) return;
    if (!mapReady) return;
    if (!filteredStops || filteredStops.length === 0) return;
  
    const target = filteredStops.find((s) => s.id === stopId);
    if (!target) return;
  
    // Set the viewport to the stop location (web equivalent of animateToRegion)
    const next = {
      latitude: target.lat,
      longitude: target.lon,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  
    setWebRegion(next);
  
    // Persist so next time “normal open” starts here
    void saveMapRegion(next);
  }, [stopId, mapReady, filteredStops]);

  const regionToShow =
    webRegion ??
    (filteredStops.length > 0
      ? {
          latitude: filteredStops[0].lat,
          longitude: filteredStops[0].lon,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }
      : {
          latitude: 45.0,
          longitude: -122.9,
          latitudeDelta: 1,
          longitudeDelta: 1,
        });

  if (loading || !filters) {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: SPACING.sm, color: "gray" }}>
          Loading map filters & stops…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: SPACING.lg }}>
      <Text
        style={{
          fontSize: FONT_SIZES.lg,
          fontWeight: "600",
          marginBottom: SPACING.sm,
        }}
      >
        Stops matching your settings (Web): {filteredStops.length}
      </Text>

      {/* Debug/placeholder view of the “map region” we would show on web */}
      <Text
        style={{
          fontSize: FONT_SIZES.sm,
          marginBottom: SPACING.md,
        }}
      >
        Center: {regionToShow.latitude.toFixed(4)},{" "}
        {regionToShow.longitude.toFixed(4)}
        {"\n"}
        Zoom: {regionToShow.latitudeDelta.toFixed(4)} /{" "}
        {regionToShow.longitudeDelta.toFixed(4)}
      </Text>

      {/* Optional: simulate a move, which will also save to storage */}
      {/* This gives you a way to exercise handleWebRegionChange even without a real map */}
      <Text
        style={{
          fontSize: FONT_SIZES.xs,
          marginBottom: SPACING.sm,
          color: "gray",
        }}
      >
        (Web placeholder: when you have a real map, call handleWebRegionChange
        from its “viewport changed” event.)
      </Text>

      {/* Existing list of stops, if you already render one, stays below this */}
      <FlatList
        data={filteredStops}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              marginBottom: SPACING.md,
              padding: SPACING.md,
              borderRadius: 10,
              backgroundColor: theme.screenBg,
            }}
          >
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                fontWeight: "600",
                marginBottom: SPACING.xs,
              }}
            >
              {item.name}
            </Text>
            <Text style={{ fontSize: FONT_SIZES.xs, color: theme.placeholder }}>
              Lat: {item.lat.toFixed(4)} · Lon: {item.lon.toFixed(4)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
