// lib/api/geocodeNominatim.ts
//
// OpenStreetMap Nominatim geocoding. Converts addresses (e.g. zip codes) to lat/lon.
// Usage policy: 1 request per second; unique User-Agent required.
// Web uses GCP Cloud Function proxy (avoids CORS); native calls Nominatim directly.

import { Platform } from "react-native";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const RATE_LIMIT_MS = 1100;

const DEFAULT_GEOCODE_API_URL =
  "https://us-west1-edgeshop-2026.cloudfunctions.net/fetch_osm_stops";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type GeocodedResult = {
  lat: number;
  lon: number;
  displayName: string;
};

type GeocodeApiResponse =
  | { lat: number; lon: number; display_name: string }
  | { result: null };

/**
 * Geocode via GCP Cloud Function proxy (for web; avoids CORS).
 */
async function geocodeAddressViaApi(query: string): Promise<GeocodedResult | null> {
  const q = query.trim();
  if (!q) return null;

  const baseUrl =
    (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_OSM_IMPORT_API_URL) ||
    DEFAULT_GEOCODE_API_URL;
  const url = `${baseUrl}?q=${encodeURIComponent(q)}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as GeocodeApiResponse;
  if ("result" in data && data.result === null) return null;
  if (!("lat" in data) || !("lon" in data)) return null;

  const lat = Number(data.lat);
  const lon = Number(data.lon);
  if (isNaN(lat) || isNaN(lon)) return null;

  return {
    lat,
    lon,
    displayName: "display_name" in data ? (data.display_name ?? q) : q,
  };
}

/**
 * Geocode directly via Nominatim (for native; no CORS).
 */
async function geocodeAddressNominatim(query: string): Promise<GeocodedResult | null> {
  const q = query.trim();
  if (!q) return null;

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "MeetInTheMiddle/1.0" },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const first = data?.[0];
  if (!first) return null;

  const lat = parseFloat(first.lat);
  const lon = parseFloat(first.lon);
  if (isNaN(lat) || isNaN(lon)) return null;

  return {
    lat,
    lon,
    displayName: first.display_name ?? q,
  };
}

/**
 * Geocode a single address/query. Returns first result or null.
 * Uses API proxy on web (CORS workaround), direct Nominatim on native.
 */
export async function geocodeAddress(query: string): Promise<GeocodedResult | null> {
  if (Platform.OS === "web") {
    return geocodeAddressViaApi(query);
  }
  return geocodeAddressNominatim(query);
}

export type GeocodedOrigin = { lat: number; lon: number; label: string };

/**
 * Geocode multiple addresses with ~1s delay between calls (Nominatim rate limit).
 * Returns origins for successful lookups; skips failures.
 */
export async function geocodeMembers(
  members: { name: string; address: string }[]
): Promise<GeocodedOrigin[]> {
  const origins: GeocodedOrigin[] = [];

  for (let i = 0; i < members.length; i++) {
    if (i > 0) await delay(RATE_LIMIT_MS);

    const member = members[i];
    const result = await geocodeAddress(member.address);
    if (result) {
      origins.push({
        lat: result.lat,
        lon: result.lon,
        label: member.name || result.displayName,
      });
    }
  }

  return origins;
}
