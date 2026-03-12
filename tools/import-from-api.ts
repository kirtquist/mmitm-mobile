// tools/import-from-api.ts
// Fetch OSM POIs from the GCP Cloud Function API and upsert into Supabase "stops" table.
//
// Usage (from project root):
//   npx ts-node -r dotenv/config tools/import-from-api.ts [min_lat min_lon max_lat max_lon]
//
// Example:
//   npx ts-node -r dotenv/config tools/import-from-api.ts 45.5 -122.6 46.0 -122.0
//
// Env vars:
//   EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required for Supabase)
//   OSM_IMPORT_API_URL (optional, default: your GCP function URL)

const { createClient } = require("@supabase/supabase-js");
const { TOOLS_CONFIG } = require("./config");

const DEFAULT_API_URL =
  "https://us-west1-edgeshop-2026.cloudfunctions.net/fetch_osm_stops";
const CHUNK_SIZE = 500;

const supabase = createClient(
  TOOLS_CONFIG.supabaseUrl,
  TOOLS_CONFIG.supabaseServiceRoleKey
);

async function fetchStopsFromApi(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number
): Promise<{ name: string; lat: number; lon: number; types: string[]; has_wifi: boolean; pet_friendly: boolean }[]> {
  const baseUrl = process.env.OSM_IMPORT_API_URL || DEFAULT_API_URL;
  const url = `${baseUrl}?min_lat=${minLat}&min_lon=${minLon}&max_lat=${maxLat}&max_lon=${maxLon}`;

  console.log(`Fetching from ${url}...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    stops?: Array<{
      name: string;
      lat: number;
      lon: number;
      types: string[];
      has_wifi: boolean;
      pet_friendly: boolean;
    }>;
    error?: string;
  };
  if (data.error) {
    throw new Error(`API error: ${data.error}`);
  }

  const stops = data.stops ?? [];
  return stops;
}

async function main() {
  const args = process.argv.slice(2);
  const minLat = args[0] ? parseFloat(args[0]) : 45.5;
  const minLon = args[1] ? parseFloat(args[1]) : -122.6;
  const maxLat = args[2] ? parseFloat(args[2]) : 46.0;
  const maxLon = args[3] ? parseFloat(args[3]) : -122.0;

  if (isNaN(minLat) || isNaN(minLon) || isNaN(maxLat) || isNaN(maxLon)) {
    console.error("Usage: import-from-api.ts <min_lat> <min_lon> <max_lat> <max_lon>");
    process.exit(1);
  }

  const stops = await fetchStopsFromApi(minLat, minLon, maxLat, maxLon);
  console.log(`Fetched ${stops.length} stops from API.`);

  if (stops.length === 0) {
    console.log("No stops to import.");
    return;
  }

  const rows = stops.map((s) => ({
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    types: s.types,
    has_wifi: !!s.has_wifi,
    pet_friendly: !!s.pet_friendly,
  }));

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const batch = rows.slice(i, i + CHUNK_SIZE);
    console.log(`Upserting ${i} → ${i + batch.length}...`);
    const { error } = await supabase
      .from("stops")
      .upsert(batch, { onConflict: "name,lat,lon" });
    if (error) throw error;
  }

  console.log("Import complete ✔");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
