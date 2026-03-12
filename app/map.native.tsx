// app/map.native.tsx
//
// Native map screen: react-native-maps + supercluster clustering.
// - Fetch stops from Supabase
// - Clusters as count bubbles, individual points as colored markers
// - Tap marker → StopDetailsSheet
// - Region persisted in AsyncStorage
// - Meet-in-the-middle: origins + center + POIs in radius (food/coffee/bar)

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Supercluster from "supercluster";
import MapView, { Marker, Region } from "react-native-maps";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ColoredDot } from "../components/ColoredDot";
import { StopMarkerDot } from "../components/map/StopMarkerDot";
import StopDetailsSheet from "../components/StopDetailsSheet";
import { getAppTheme } from "../constants/theme";
import { MAP_PERF } from "../lib/map/mapPerformance";
import { MMITM_SESSION_KEY, type MmitmSession } from "../lib/map/mmitmSession";
import { loadMapRegion, saveMapRegion } from "../lib/map/mapRegionStorage";
import { filterStops } from "../lib/stops/filterStops";
import { PIN_LEGEND_ROWS } from "../lib/stops/pinStyles";
import { Stop } from "../lib/stops/types";
import { getPinColor } from "../lib/stops/utils";
import { fetchOsmStops, regionToApiBbox } from "../lib/api/fetchOsmStops";
import { fetchAllStops, fetchStopsNear } from "../lib/supabase/stops";
import { DOT_SIZES } from "../lib/ui/dotSizes";
import { SPACING } from "../lib/ui/spacing";
import { FONT_SIZES } from "../lib/ui/typography";

const DEFAULT_RADIUS_MILES = 10;

// ---------------------------------------------------------------------------
// Supercluster
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

function regionToBBox(r: Region): [number, number, number, number] {
  const minLon = r.longitude - r.longitudeDelta / 2;
  const maxLon = r.longitude + r.longitudeDelta / 2;
  const minLat = r.latitude - r.latitudeDelta / 2;
  const maxLat = r.latitude + r.latitudeDelta / 2;
  return [minLon, minLat, maxLon, maxLat];
}

function regionToZoom(r: Region): number {
  return Math.round(Math.log2(360 / r.longitudeDelta));
}

const CENTER_MARKER_COLOR = "#007AFF";
const ORIGIN_MARKER_COLOR = "#34C759";

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
  const [mmitmSession, setMmitmSession] = useState<MmitmSession | null>(null);
  const [debouncedRegion, setDebouncedRegion] = useState<Region | null>(null);
  const [loadingOsm, setLoadingOsm] = useState(false);

  const clusterIndex = useRef<Supercluster<{ stopId: string }> | null>(null);
  const [clusterVersion, setClusterVersion] = useState(0);
  // Android: custom Marker views need tracksViewChanges=true to render; flip to false after paint for perf
  const [tracksViewChanges, setTracksViewChanges] = useState(Platform.OS === "android");

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const t = setTimeout(() => setTracksViewChanges(false), 800);
    return () => clearTimeout(t);
  }, []);

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
          const loadFilters = (await import("../utils/settingsStorage"))
            .loadSettingsFilters;
          const f = await loadFilters();
          const sessionRaw = await AsyncStorage.getItem(MMITM_SESSION_KEY);
          const session: MmitmSession | null = sessionRaw
            ? JSON.parse(sessionRaw)
            : null;

          let s: Stop[];

          if (session) {
            s = await fetchStopsNear(
              session.center.lat,
              session.center.lon,
              session.radiusMiles,
              { venueTypesOnly: true }
            );
            if (isActive) setMmitmSession(session);
          } else {
            s = await fetchAllStops();
            if (isActive) setMmitmSession(null);
          }

          if (!isActive) return;

          setFilters(f);
          setStops(s);

          if (session) {
            const r = session.center;
            const delta = 0.15;
            setRegion({
              latitude: r.lat,
              longitude: r.lon,
              latitudeDelta: delta,
              longitudeDelta: delta,
            });
            setDebouncedRegion({
              latitude: r.lat,
              longitude: r.lon,
              latitudeDelta: delta,
              longitudeDelta: delta,
            });
          }
        } catch (e) {
          console.warn("Failed to load map data", e);
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

  const filteredStops: Stop[] = useMemo(() => {
    if (!filters) return [];
    return mmitmSession ? stops : filterStops(stops, filters);
  }, [stops, filters, mmitmSession]);

  useEffect(() => {
    let cancelled = false;
    async function restoreRegion() {
      const stored = await loadMapRegion();
      if (cancelled) return;
      if (!mmitmSession && stored) setRegion(stored);
      setRestored(true);
    }
    restoreRegion();
    return () => {
      cancelled = true;
    };
  }, [mmitmSession]);

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

  const handleRegionChangeComplete = (next: Region) => {
    setRegion(next);
    void saveMapRegion(next);
    setDebouncedRegion(next);
  };

  const initialRegion: Region =
    filteredStops.length > 0
      ? {
          latitude: filteredStops[0].lat,
          longitude: filteredStops[0].lon,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }
      : { latitude: 39.5, longitude: -98.35, latitudeDelta: 25, longitudeDelta: 25 };

  const finalRegion: Region = region ?? initialRegion;

  const clusterTiles = useMemo(() => {
    if (!clusterIndex.current) return [];
    const activeRegion = debouncedRegion ?? finalRegion;
    const bbox = regionToBBox(activeRegion);
    const zoom = regionToZoom(activeRegion);
    return clusterIndex.current.getClusters(bbox, zoom);
  }, [debouncedRegion, finalRegion, clusterVersion]);

  useEffect(() => {
    if (filteredStops.length === 0) return;
    clusterIndex.current = buildClusterIndex(filteredStops);
    setClusterVersion((v) => v + 1);
  }, [filteredStops]);

  useEffect(() => {
    if (region && !debouncedRegion) setDebouncedRegion(region);
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadPoisHere = async () => {
    const activeRegion = debouncedRegion ?? finalRegion;
    setLoadingOsm(true);
    try {
      const bbox = regionToApiBbox(activeRegion);
      const osmStops = await fetchOsmStops(bbox);
      const byKey = new Map<string, Stop>();
      for (const s of stops) byKey.set(s.id, s);
      for (const s of osmStops) byKey.set(s.id, s);
      setStops(Array.from(byKey.values()));
    } catch (e) {
      console.warn("Failed to load POIs from OSM", e);
    } finally {
      setLoadingOsm(false);
    }
  };

  const handleClearMmitm = async () => {
    await AsyncStorage.removeItem(MMITM_SESSION_KEY);
    setMmitmSession(null);
    const s = await fetchAllStops();
    setStops(s);
  };

  if (loading || !filters) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.screenBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: SPACING.sm, color: theme.subtext }}>
          Loading map…
        </Text>
      </View>
    );
  }

  const renderClusters = () =>
    clusterTiles.map((tile) => {
      const isCluster =
        tile.properties &&
        "cluster" in tile.properties &&
        tile.properties.cluster;
      const [lon, lat] = tile.geometry.coordinates;

      if (isCluster) {
        const count = (tile.properties as { point_count: number }).point_count;
        const clusterId = (tile.properties as { cluster_id: number }).cluster_id;
        return (
          <Marker
            key={`cluster-${clusterId}`}
            coordinate={{ latitude: lat, longitude: lon }}
            tracksViewChanges={tracksViewChanges}
            onPress={() => {
              if (clusterIndex.current) {
                const expansionZoom = Math.min(
                  clusterIndex.current.getClusterExpansionZoom(clusterId),
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

      const stopId = (tile.properties as { stopId: string }).stopId;
      const stop = stopById.get(stopId);
      if (!stop) return null;

      const isSelected = stop.id === selectedStop?.id;
      return (
        <Marker
          key={stop.id}
          coordinate={{ latitude: lat, longitude: lon }}
          onPress={() => setSelectedStop(stop)}
          tracksViewChanges={tracksViewChanges || isSelected}
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
        {mmitmSession?.origins.map((o, i) => (
          <Marker
            key={`origin-${i}`}
            coordinate={{ latitude: o.lat, longitude: o.lon }}
            title={o.label}
            tracksViewChanges={tracksViewChanges}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: ORIGIN_MARKER_COLOR,
                borderWidth: 2,
                borderColor: "#fff",
              }}
            />
          </Marker>
        ))}
        {mmitmSession && (
          <Marker
            coordinate={{
              latitude: mmitmSession.center.lat,
              longitude: mmitmSession.center.lon,
            }}
            title="Midpoint"
            tracksViewChanges={tracksViewChanges}
          >
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: CENTER_MARKER_COLOR,
                borderWidth: 2,
                borderColor: "#fff",
              }}
            />
          </Marker>
        )}
        {renderClusters()}
      </MapView>

      {mmitmSession && (
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
          <Text
            style={{
              color: "#ffffff",
              fontWeight: "700",
              fontSize: FONT_SIZES.sm,
            }}
          >
            Meet in the Middle · {filteredStops.length} venues
          </Text>
          <Pressable
            onPress={handleClearMmitm}
            style={{
              paddingHorizontal: SPACING.sm + 2,
              paddingVertical: SPACING.xs + 2,
              borderRadius: SPACING.borderRadius,
              backgroundColor: "rgba(255,255,255,0.15)",
            }}
          >
            <Text
              style={{ color: "#ffffff", fontSize: FONT_SIZES.xs, fontWeight: "600" }}
            >
              Clear
            </Text>
          </Pressable>
        </View>
      )}

      {!mmitmSession && (
        <View
          style={{
            position: "absolute",
            top: SPACING.lg,
            left: SPACING.lg,
            right: SPACING.lg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
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
          <Pressable
            onPress={handleLoadPoisHere}
            disabled={loadingOsm}
            style={{
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.sm,
              borderRadius: SPACING.borderRadius,
              backgroundColor: loadingOsm
                ? "rgba(0,0,0,0.4)"
                : "rgba(0,0,0,0.75)",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: FONT_SIZES.sm, fontWeight: "600" }}>
              {loadingOsm ? "Loading…" : "Load POIs here"}
            </Text>
          </Pressable>
        </View>
      )}

      {!mmitmSession && filteredStops.length === 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "45%",
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <View
            style={{
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.sm + 2,
              borderRadius: SPACING.borderRadius,
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600" }}>
              No stops match your filters.
            </Text>
          </View>
        </View>
      )}

      <View
        pointerEvents="none"
        style={{ position: "absolute", bottom: 110, left: 10 }}
      >
        <View
          style={{
            paddingHorizontal: SPACING.sm + 2,
            paddingVertical: SPACING.sm,
            borderRadius: SPACING.borderRadius,
            backgroundColor: isDark
              ? "rgba(0,0,0,0.75)"
              : "rgba(255,255,255,0.9)",
          }}
        >
          {PIN_LEGEND_ROWS.map((row) => (
            <View
              key={row.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: SPACING.xs,
              }}
            >
              <ColoredDot color={row.color} size={DOT_SIZES.md} />
              <Text style={{ fontSize: FONT_SIZES.xs, color: theme.text }}>
                {row.label}
              </Text>
            </View>
          ))}
          {mmitmSession && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: SPACING.xs,
                }}
              >
                <ColoredDot color={ORIGIN_MARKER_COLOR} size={DOT_SIZES.md} />
                <Text style={{ fontSize: FONT_SIZES.xs, color: theme.text }}>
                  Origin
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <ColoredDot color={CENTER_MARKER_COLOR} size={DOT_SIZES.md} />
                <Text style={{ fontSize: FONT_SIZES.xs, color: theme.text }}>
                  Midpoint
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      <StopDetailsSheet stop={selectedStop} onClose={() => setSelectedStop(null)} />
    </View>
  );
}
