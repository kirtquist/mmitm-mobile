// lib/api/fetchOsmStops.ts
//
// Fetch OSM POIs from the GCP Cloud Function API by bbox.
// Returns stops in app shape (Stop[]) for session merge or display.
//
// API expects bbox: [min_lat, min_lon, max_lat, max_lon]

import { splitStopTypes } from "../stops/types";
import type { Stop } from "../stops/types";

const DEFAULT_API_URL =
  "https://us-west1-edgeshop-2026.cloudfunctions.net/fetch_osm_stops";

/** API response shape */
type ApiStop = {
  name: string;
  lat: number;
  lon: number;
  types: string[];
  has_wifi: boolean;
  pet_friendly: boolean;
};

type ApiResponse = {
  stops?: ApiStop[];
  error?: string;
};

/**
 * Convert map Region to API bbox [min_lat, min_lon, max_lat, max_lon].
 * Map regionToBBox returns [minLon, minLat, maxLon, maxLat]; API needs lat-first.
 */
export function regionToApiBbox(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): [number, number, number, number] {
  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;
  const minLon = region.longitude - region.longitudeDelta / 2;
  const maxLon = region.longitude + region.longitudeDelta / 2;
  return [minLat, minLon, maxLat, maxLon];
}

function osmStopId(s: ApiStop): string {
  return `osm:${s.lat.toFixed(6)}:${s.lon.toFixed(6)}:${s.name}`;
}

function apiStopToAppStop(s: ApiStop): Stop {
  const rawTypes = (s.types ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  const { known, unknown } = splitStopTypes(rawTypes);

  return {
    id: osmStopId(s),
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    hasWifi: !!s.has_wifi,
    petFriendly: !!s.pet_friendly,
    types: known,
    unknownTypes: unknown.length ? unknown : undefined,
  };
}

/**
 * Fetch OSM stops for the given bbox.
 * Bbox: [min_lat, min_lon, max_lat, max_lon].
 */
export async function fetchOsmStops(
  bbox: [number, number, number, number]
): Promise<Stop[]> {
  const [minLat, minLon, maxLat, maxLon] = bbox;
  const baseUrl =
    (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_OSM_IMPORT_API_URL) ||
    DEFAULT_API_URL;
  const url = `${baseUrl}?min_lat=${minLat}&min_lon=${minLon}&max_lat=${maxLat}&max_lon=${maxLon}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSM API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ApiResponse;
  if (data.error) {
    throw new Error(`OSM API error: ${data.error}`);
  }

  const apiStops = data.stops ?? [];
  return apiStops.map(apiStopToAppStop);
}
