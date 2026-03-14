# Meet in the Middle

Expo/React Native app that helps groups find a central place to meet for coffee, drinks, dinner, or parks. Uses geographic midpoint, Supabase, OSM POIs, and OSRM for driving routes.

## Features

- **Create Party** – Add members with addresses, select POI type (Cafe, Pub, Restaurant, Park), find midpoint
- **Map** – View midpoint, origin markers, venue POIs, and driving routes (OSRM)
- **Load POIs here** – Fetch OSM venues for the viewport when Supabase has no data
- **Settings** – User filters for POI types (food, coffee, bar, etc.), wifi, pets
- **Catalog** – Admin UI to curate which POI types are available
- **Hamburger menu** – Catalog, Settings, Logout

## Get started

1. Install dependencies
   ```bash
   npm install
   ```

2. Configure env (copy `.env.example` or create `.env.local`):
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Optional: `EXPO_PUBLIC_OSM_IMPORT_API_URL`, `EXPO_PUBLIC_OSRM_URL`

3. Start the app
   ```bash
   npx expo start
   ```

   Or with env file: `npx env-cmd -f .env.nuc npx expo start --tunnel`

## Docs

- [docs/APPLICATION.md](docs/APPLICATION.md) – App overview, features, screens
- [docs/MAP_SCREEN.md](docs/MAP_SCREEN.md) – Map data flow, OSM import
- [docs/OSRM_SETUP.md](docs/OSRM_SETUP.md) – OSRM routing on NUC
- [FUTURE.md](FUTURE.md) – Deferred scope (auth, explore/catalog from OSM)
