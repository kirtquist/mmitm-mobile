// lib/api/geocodeNominatim.ts
//
// OpenStreetMap Nominatim geocoding. Converts addresses (e.g. zip codes) to lat/lon.
// Usage policy: 1 request per second; unique User-Agent required.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const RATE_LIMIT_MS = 1100;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type GeocodedResult = {
  lat: number;
  lon: number;
  displayName: string;
};

/**
 * Geocode a single address/query. Returns first result or null.
 */
export async function geocodeAddress(
  query: string
): Promise<GeocodedResult | null> {
  const q = query.trim();
  if (!q) return null;

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "MeetInTheMiddle/1.0",
    },
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
