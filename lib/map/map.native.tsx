// app/map.native.tsx
//
// Native map screen — single MapView with manual supercluster clustering.
//
// Why single MapView:
// - ClusteredMapView intercepts children and drops non-Marker elements (Polyline, etc.)
// - A single MapView with supercluster gives full control over what renders
//
// Clustering:
// - supercluster is already in package.json
// - We build the index from filteredStops, then query it on each region change
// - Clusters render as count bubbles; individual points render as StopMarkerDot
//
// Route rendering:
// - Polyline renders as a direct child of MapView (works correctly)
// - Interval ring markers render as Marker children
// - Candidate stops at each interval render as Marker children

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Supercluster from "supercluster";

import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Circle, Marker, Polyline, Region } from "react-native-maps";

import { ColoredDot } from "../components/ColoredDot";
import { StopMarkerDot } from "../components/map/StopMarkerDot";
import StopDetailsSheet from "../components/StopDetailsSheet";

import { getAppTheme } from "../../constants/theme";
import { MAP_PERF } from "../lib/map/mapPerformance";
import { loadMapRegion, saveMapRegion } from "../lib/map/mapRegionStorage";
import { filterStops } from "../lib/stops/filterStops";
import { PIN_LEGEND_ROWS } from "../lib/stops/pinStyles";
import { Stop } from "../lib/stops/types";
import { getPinColor } from "../lib/stops/utils";
import { fetchAllStops } from "../lib/supabase/stops";
import { DOT_SIZES } from "../lib/ui/dotSizes";
import { SPACING } from "../lib/ui/spacing";
import { FONT_SIZES } from "../lib/ui/typography";

import { filterStopsNearIntervals } from "../lib/routing/routeStops";
import { PlannedTrip } from "../lib/routing/types";
import { PLANNED_TRIP_KEY } from "./index";

// ---------------------------------------------------------------------------
// Supercluster setup
// ---------------------------------------------------------------------------
type SCFeature = Supercluster.PointFeature<{ stopId: string }>;

function buildClusterIndex(stops: Stop[]): Supercluster<{ stopId: string }> {
  const index = new Supercluster<{ stopId: string }>({
    radius: 50,
    maxZoom: 14,
    minPoints: 2,
  });

  const features: SCFeature[] = stops.map((s) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [s.lon, s.lat] },
    properties: { stopId: s.id },
  }));

  index.load(features);
  return index;
}

// Convert a map Region to a supercluster bounding box.
function regionToBBox(r: Region): [number, number, number, number] {
  const minLon = r.longitude - r.longitudeDelta / 2;
  const maxLon = r.longitude + r.longitudeDelta / 2;
  const minLat = r.latitude - r.latitudeDelta / 2;
  const maxLat = r.latitude + r.latitudeDelta / 2;
  return [minLon, minLat, maxLon, maxLat];
}

// Approximate zoom level from region delta (good enough for supercluster queries).
function regionToZoom(r: Region): number {
  return Math.round(Math.log2(360 / r.longitudeDelta));
}

const INTERVAL_RING_COLOR = "#FFD700";
const INTERVAL_BADGE_BG = "rgba(0,0,0,0.72)";
const INTERVAL_BADGE_BORDER = "rgba(255,215,0,0.6)";
const INTERVAL_BADGE_TEXT = "#FFD700";

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const theme = getAppTheme(colorScheme === "dark");
  const isDark = colorScheme === "dark";

  const { stopId } = useLocalSearchParams<{ stopId?: string }>();
  const router = useRouter();

  const [filters, setFilters] = useState<any>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [restored, setRestored] = useState(false);
  const [plannedTrip, setPlannedTrip] = useState<PlannedTrip | null>(null);
  const [debouncedRegion, setDebouncedRegion] = useState<Region | null>(null);

  const clusterIndex = useRef<Supercluster<{ stopId: string }> | null>(null);
  const [clusterVersion, setClusterVersion] = useState(0);

  const stopById = useMemo(() => {
    const m = new Map<string, Stop>();
    for (const s of stops) m.set(s.id, s);
    return m;
  }, [stops]);

  // ---------------------------------------------------------------------------
  // Load on focus
  // ---------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        setLoading(true);
        try {
          const f = await (await import("../utils/settingsStorage")).loadSettingsFilters();
          const s = await fetchAllStops();
          const tripRaw = await AsyncStorage.getItem(PLANNED_TRIP_KEY);
          const trip: PlannedTrip | null = tripRaw ? JSON.parse(tripRaw) : null;

          if (!isActive) return;

          setFilters(f);
          setStops(s);
          setPlannedTrip(trip);

          if (trip && trip.route.polyline.length > 0) {
            const lats = trip.route.polyline.map((p) => p.lat);
            const lons = trip.route.polyline.map((p) => p.lon);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLon = Math.min(...lons);
            const maxLon = Math.max(...lons);
            const tripRegion = {
              latitude: (minLat + maxLat) / 2,
              longitude: (minLon + maxLon) / 2,
              latitudeDelta: (maxLat - minLat) * 1.3,
              longitudeDelta: (maxLon - minLon) * 1.3,
            };
            setRegion(tripRegion);
            setDebouncedRegion(tripRegion);          }
        } catch (e) {
          console.warn("Failed to load map data", e);
          if (isActive) Alert.alert("Error", "Failed to load stops.");
        } finally {
          if (isActive) setLoading(false);
        }
      };

      load();
      return () => { isActive = false; };
    }, [])
  );

  // ---------------------------------------------------------------------------
  // Filtered stops + rebuild cluster index
  // ---------------------------------------------------------------------------
  const filteredStops: Stop[] = useMemo(() => {
    if (!filters) return [];
    return filterStops(stops, filters);
  }, [stops, filters]);

  // ---------------------------------------------------------------------------
  // Restore persisted region
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function restoreRegion() {
      const stored = await loadMapRegion();
      if (cancelled) return;
      if (stored) setRegion(stored);
      setRestored(true);
    }
    restoreRegion();
    return () => { cancelled = true; };
  }, []);

  // ---------------------------------------------------------------------------
  // Handle "Open in map" via stopId param
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!stopId || !restored || stops.length === 0) return;
    const target = stops.find((s) => s.id === stopId);
    if (!target) return;
    setRegion({
      latitude: target.lat,
      longitude: target.lon,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
    setSelectedStop(target);
    router.setParams({ stopId: undefined });
  }, [stopId, restored, stops, router]);

  // ---------------------------------------------------------------------------
  // Region change + debounce
  // ---------------------------------------------------------------------------
  const handleRegionChangeComplete = (next: Region) => {
    setRegion(next);
    void saveMapRegion(next);
    setDebouncedRegion(next);
  };

  // ---------------------------------------------------------------------------
  // Initial region fallback
  // ---------------------------------------------------------------------------
  const initialRegion: Region =
    filteredStops.length > 0
      ? { latitude: filteredStops[0].lat, longitude: filteredStops[0].lon, latitudeDelta: 0.3, longitudeDelta: 0.3 }
      : { latitude: 39.5, longitude: -98.35, latitudeDelta: 25, longitudeDelta: 25 };

  const finalRegion: Region = region ?? initialRegion;

  // ---------------------------------------------------------------------------
  // Cluster query
  //
  // Dependencies:
  // - debouncedRegion: updated after each map pan/zoom gesture
  // - finalRegion: used as fallback on first render before any gesture fires,
  //   so stops appear immediately without requiring user interaction
  // - clusterVersion: a counter bumped each time the index is rebuilt;
  //   needed because clusterIndex is a ref (invisible to React's dependency
  //   tracking) — without this, the memo would not re-run after a new index loads
  // ---------------------------------------------------------------------------
  const clusterTiles = useMemo(() => {
    if (!clusterIndex.current) return [];
    // Use finalRegion as fallback so initial render doesn't require user interaction.
    const activeRegion = debouncedRegion ?? finalRegion;
    const bbox = regionToBBox(activeRegion);
    const zoom = regionToZoom(activeRegion);
    return clusterIndex.current.getClusters(bbox, zoom);
    // clusterVersion triggers re-run when a new index is built.
  }, [debouncedRegion, finalRegion, clusterVersion]);

  // ---------------------------------------------------------------------------
  // Polyline coords
  // ---------------------------------------------------------------------------
  const polylineCoords = useMemo(() => {
    if (!plannedTrip) return [];
    return plannedTrip.route.polyline.map((p) => ({
      latitude: p.lat,
      longitude: p.lon,
    }));
  }, [plannedTrip]);

  // In trip mode: filter all stops to those within radiusMiles of the route line.
  // This replaces the old "top 3 candidates per interval" approach.
  const corridorStops = useMemo(() => {
    if (!plannedTrip || filteredStops.length === 0) return [];
    return filterStopsNearIntervals(
      filteredStops,
      plannedTrip.intervals,
      plannedTrip.radiusMiles
    );
  }, [plannedTrip, filteredStops]);
  
  // Use corridor-filtered stops in trip mode, all filtered stops in browse mode.
  const stopsForClustering = plannedTrip ? corridorStops : filteredStops;

  useEffect(() => {
    if (stopsForClustering.length === 0) return;
    clusterIndex.current = buildClusterIndex(stopsForClustering);
    setClusterVersion((v) => v + 1);
  }, [stopsForClustering]);

  // Seed debouncedRegion from the restored persisted region so clusters
  // render immediately on first load without requiring a pan gesture.
  useEffect(() => {
    if (region && !debouncedRegion) {
      setDebouncedRegion(region);
    }
  }, [region]);  // eslint-disable-line react-hooks/exhaustive-deps
  
  // ---------------------------------------------------------------------------
  // Clear trip
  // ---------------------------------------------------------------------------
  const handleClearTrip = async () => {
    await AsyncStorage.removeItem(PLANNED_TRIP_KEY);
    setPlannedTrip(null);
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading || !filters) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.screenBg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: SPACING.sm, color: theme.subtext }}>Loading map…</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render clusters + individual markers (non-trip mode)
  // ---------------------------------------------------------------------------
  const renderClusters = () => {
    return clusterTiles.map((tile) => {
      const isCluster = tile.properties && "cluster" in tile.properties && tile.properties.cluster;
      const [lon, lat] = tile.geometry.coordinates;

      if (isCluster) {
        const count = (tile.properties as any).point_count as number;
        return (
          <Marker
            key={`cluster-${(tile.properties as any).cluster_id}`}
            coordinate={{ latitude: lat, longitude: lon }}
            tracksViewChanges={false}
            onPress={() => {
              if (clusterIndex.current) {
                const expansionZoom = Math.min(
                  clusterIndex.current.getClusterExpansionZoom((tile.properties as any).cluster_id),
                  20
                );
                const delta = 360 / Math.pow(2, expansionZoom);
                setRegion({
                  latitude: lat,
                  longitude: lon,
                  latitudeDelta: delta,
                  longitudeDelta: delta,
                });
              }
            }}
          >
            <View
              style={{
                width: MAP_PERF.MARKER_HIT_SIZE,
                height: MAP_PERF.MARKER_HIT_SIZE,
                borderRadius: MAP_PERF.MARKER_HIT_SIZE / 2,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.6)",
                borderWidth: 2,
                borderColor: "#ffffff",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700" }}>{count}</Text>
            </View>
          </Marker>
        );
      }

      const stopId = (tile.properties as any).stopId as string;
      const stop = stopById.get(stopId);
      if (!stop) return null;

      const isSelected = stop.id === selectedStop?.id;
      return (
        <Marker
          key={stop.id}
          coordinate={{ latitude: lat, longitude: lon }}
          onPress={() => setSelectedStop(stop)}
          tracksViewChanges={isSelected}
        >
          <StopMarkerDot
            color={getPinColor(stop)}
            selected={isSelected}
            sizeKey="lg"
            hitSize={MAP_PERF.MARKER_HIT_SIZE}
          />
        </Marker>
      );
    });
  };

  // ---------------------------------------------------------------------------
  // Render radius circles around each interval point.
  // Shows the user exactly which geographic area is being searched for stops,
  // explaining why stops in nearby cities may or may not appear.
  // Only visible in trip mode.
  // ---------------------------------------------------------------------------
  const renderIntervalCircles = () => {
    if (!plannedTrip) return null;
    return plannedTrip.intervals.map((interval) => (
      <Circle
        key={`circle-${interval.index}`}
        center={{ latitude: interval.target.lat, longitude: interval.target.lon }}
        radius={plannedTrip.radiusMiles * 1609.34}  // convert miles to meters
        strokeColor="rgba(255, 85, 0, 0.4)"
        fillColor="rgba(202, 198, 176, 0.18)"
        strokeWidth={1.5}
      />
    ));
  };

  // ---------------------------------------------------------------------------
  // Render interval target ring markers
  // ---------------------------------------------------------------------------
  // Interval target ring markers
  // Design: small compact badge offset above-right of the route point,
  // Apple Maps waypoint style — unobtrusive but readable.
  // Anchor (0, 1) pins the bottom-left corner of the badge to the coordinate,
  // so the badge floats above-right without covering the stop markers below.
  const renderIntervalRings = () => {
    if (!plannedTrip) return null;
    return plannedTrip.intervals.map((interval) => (
      <Marker
        key={`interval-${interval.index}`}
        coordinate={{ latitude: interval.target.lat, longitude: interval.target.lon }}
        tracksViewChanges={false}
        anchor={{ x: 0, y: 1.0 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: INTERVAL_BADGE_BG,
            borderRadius: SPACING.borderRadius,
            borderWidth: SPACING.bw,
            borderColor: INTERVAL_BADGE_BORDER,
            paddingHorizontal: SPACING.xs,
            paddingVertical: SPACING.xxs,
            // Shadow so badge reads on any map tile color
            shadowColor: "#000",
            shadowOpacity: 0.35,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 3,
          }}
        >
          {/* Color dot — matches legend "Interval Stop" entry */}
          <View
            style={{
              width: DOT_SIZES.sm,
              height: DOT_SIZES.sm,
              borderRadius: DOT_SIZES.sm / 2,
              backgroundColor: INTERVAL_RING_COLOR,
              marginRight: SPACING.xxs,
            }}
          />
          <Text
            style={{
              fontSize: FONT_SIZES.xs,
              fontWeight: "700",
              color: INTERVAL_BADGE_TEXT,
              letterSpacing: 0.2,
            }}
          >
            {interval.targetMiles} mi
          </Text>
        </View>
      </Marker>
    ));
  };
  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        region={finalRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={(e) => {
          const action = e?.nativeEvent?.action;
          if (action === "marker-press") return;
          setSelectedStop(null);
        }}
      >
        {/* Route polyline */}
        {polylineCoords.length > 0 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={theme.accent}
            strokeWidth={4}
          />
        )}

        {/* Trip mode: interval rings + candidate stops */}
        {renderClusters()}
        {plannedTrip && renderIntervalCircles()}
        {plannedTrip && renderIntervalRings()}
      </MapView>

      {/* Trip banner */}
      {plannedTrip && (
        <View
          style={{
            position: "absolute",
            top: SPACING.lg,
            left: SPACING.lg,
            right: SPACING.lg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.sm,
            borderRadius: SPACING.borderRadius,
            backgroundColor: "rgba(0,0,0,0.75)",
          }}
        >
          <View style={{ flex: 1, marginRight: SPACING.sm }}>
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: FONT_SIZES.sm }} numberOfLines={1}>
              {plannedTrip.origin.label.split(",")[0]} → {plannedTrip.destination.label.split(",")[0]}
            </Text>
            <Text style={{ color: "#cccccc", fontSize: FONT_SIZES.xs, marginTop: 2 }}>
              {Math.round(plannedTrip.route.distanceMiles)} mi · {plannedTrip.intervals.length} stop{plannedTrip.intervals.length !== 1 ? "s" : ""} every {plannedTrip.intervalMiles} mi
            </Text>
          </View>
          <Pressable
            onPress={handleClearTrip}
            style={{
              paddingHorizontal: SPACING.sm + 2,
              paddingVertical: SPACING.xs + 2,
              borderRadius: SPACING.borderRadius,
              backgroundColor: "rgba(255,255,255,0.15)",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: FONT_SIZES.xs, fontWeight: "600" }}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* Empty state */}
      {!plannedTrip && filteredStops.length === 0 && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: "45%", left: 0, right: 0, alignItems: "center" }}
        >
          <View
            style={{
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.sm + 2,
              borderRadius: SPACING.borderRadius,
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600" }}>No stops match your filters.</Text>
            <Text style={{ color: "#cccccc", fontSize: FONT_SIZES.xs, marginTop: SPACING.xs }}>
              Try turning off Wi-Fi required or expanding categories.
            </Text>
          </View>
        </View>
      )}

      {/* Legend */}
      <View pointerEvents="none" style={{ position: "absolute", bottom: 110, left: 10 }}>
        <View
          style={{
            paddingHorizontal: SPACING.sm + 2,
            paddingVertical: SPACING.sm,
            borderRadius: SPACING.borderRadius,
            backgroundColor: isDark ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.9)",
          }}
        >
          {PIN_LEGEND_ROWS.map((row) => (
            <View key={row.key} style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs }}>
              <ColoredDot color={row.color} size={DOT_SIZES.md} />
              <Text style={{ fontSize: FONT_SIZES.xs, color: theme.text }}>{row.label}</Text>
            </View>
          ))}
          {plannedTrip && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs }}>
              <ColoredDot color={INTERVAL_RING_COLOR} size={DOT_SIZES.md} />
              <Text style={{ fontSize: FONT_SIZES.xs, color: theme.text }}>Interval Stop</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stop count (non-trip mode) */}
      {!plannedTrip && (
        <View
          style={{
            position: "absolute",
            top: SPACING.lg,
            left: SPACING.lg,
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.xs + 2,
            borderRadius: SPACING.borderRadius,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>
            Stops: {filteredStops.length}
          </Text>
        </View>
      )}

      {/* Details sheet */}
      <StopDetailsSheet stop={selectedStop} onClose={() => setSelectedStop(null)} />
    </View>
  );
}
