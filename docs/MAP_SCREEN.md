# Map Screen

## Overview

Native map screen with POI clustering and meet-in-the-middle support. Uses `react-native-maps` + `supercluster` on native; web shows a simple stop list (no MapView).

## Supabase Table

`stops` columns:

| Column      | Type     | Description                    |
|------------|----------|--------------------------------|
| id         | uuid     | Primary key                    |
| name       | text     | Stop name                      |
| lat        | double   | Latitude                       |
| lon        | double   | Longitude                      |
| types      | text[]   | Tags: gas, food, coffee, bar, etc. |
| has_wifi   | boolean  | Wi‑Fi available                |
| pet_friendly | boolean | Pet friendly                   |

## Data Flow

- **fetchAllStops()** (`lib/supabase/stops.ts`) – paginated, returns all stops
- **fetchStopsNear(lat, lon, radiusMiles, { venueTypesOnly?, preferredTypes? })** – stops within radius; `preferredTypes` filters by Create Party POI type (Cafe→coffee, Pub→bar, Restaurant→food, Park→park)
- **filterStops(stops, filters, allowedTypes?)** – applies Settings filters; optional `allowedTypes` from Catalog
- Supercluster index built in‑memory from `filteredStops`; queried by viewport bbox/zoom on region change

## Native Map (`app/map.native.tsx`)

- **Clusters** – count bubbles; tap to zoom
- **Markers** – individual POIs with pin color from `lib/stops/pinStyles`
- **Stop details** – tap marker → bottom sheet (`StopDetailsSheet`)

## Web Fallback (`app/map.tsx`)

- Flat list of stops; no MapView
- Region stored in AsyncStorage for parity with native behavior

## OSM Import by Viewport

- **"Load POIs here"** button on both native and web map
- Uses current viewport (region) to build bbox → calls OSM API (GCP Cloud Function)
- `lib/api/fetchOsmStops.ts`: `fetchOsmStops(bbox)`, `regionToApiBbox(region)`
- Option A (implemented): merge API stops into in-memory state for session; no DB write
- API URL: `EXPO_PUBLIC_OSM_IMPORT_API_URL` or default GCP function URL
- CLI import: `npx ts-node -r dotenv/config tools/import-from-api.ts [min_lat min_lon max_lat max_lon]` — uses `tools/config.ts` (env: `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

## Region Persistence

`lib/map/mapRegionStorage.ts` – `loadMapRegion()` / `saveMapRegion()` persist last map region in AsyncStorage. Map restores on return.

## Meet-in-the-Middle

1. Geocode member addresses: `lib/api/geocodeNominatim.ts` (`geocodeMembers`, `geocodeAddress`). Web uses GCP Cloud Function proxy (`?q=`); native calls Nominatim directly. Nominatim rate limit: 1 req/sec.
2. Compute center: `geographicMidpoint(origins)` (`lib/map/midpoint.ts`)
3. Persist session in AsyncStorage under `@mmitm/session`:
   ```ts
   { origins, center, radiusMiles, poiType?: "Cafe"|"Pub"|"Restaurant"|"Park" }
   ```
4. Map screen: if session present → show origin markers (green), center marker (blue), route polylines (OSRM), POIs from `fetchStopsNear(center, radius, { preferredTypes } or { venueTypesOnly: true })`
5. `poiType` filters venues: Cafe→coffee, Pub→bar, Restaurant→food, Park→park

To wire from index: after geocoding member addresses, call `geographicMidpoint(points)`, build the session object, `AsyncStorage.setItem(MMITM_SESSION_KEY, JSON.stringify(session))`, then `router.push('/map')`.

## Pin Styles

`lib/stops/pinStyles.ts` – mapping for visual categories (gas, food, park, rest, weigh, attraction, other). Theme-aware via `getAppTheme()`.

## Types

- `lib/stops/types.ts` – Stop, StopType (includes `coffee`, `bar`)
- `lib/stops/catalog.ts` – StopType → visual category mapping

## Troubleshooting

### Stops not visible

The app loads from **Supabase**, not directly from the Cloud Function. Stops appear only if: (1) Supabase has data (run `tools/import-from-api.ts` with the relevant bbox), or (2) you use "Load POIs here" to merge OSM POIs into session state (in-memory only). MMITM session uses `fetchStopsNear(center, radius)`; browse mode uses `fetchAllStops()`.

### Map crashes on iOS (Expo Go)

Random native crashes with no JS console errors are common with `react-native-maps` in Expo Go. Likely causes: too many Markers, `tracksViewChanges` on many markers, or memory pressure. Mitigations: cap rendered markers (e.g. 200–300), use `tracksViewChanges={false}` except for the selected marker, or run a dev build (`npx expo run:ios`) instead of Expo Go. Check Xcode/Console.app device logs for native crash traces.
