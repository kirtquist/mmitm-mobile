# Meet in the Middle – Application Overview

Expo/React Native app that helps groups find a central meeting place for coffee, drinks, dinner, or parks. Uses geographic midpoint, Supabase for venues, OSM for POIs, and OSRM for driving routes.

## Features

### Create Party (Home)
- Add members with names and addresses
- Select POI type: Cafe, Pub, Restaurant, Park
- Find Midpoint → suggestions list
- View Map → map with midpoint and nearby venues

### Map
- **With MMITM session:** Origin markers (green), center marker (blue), venue markers, route polylines (OSRM)
- **Without session:** Browse all stops; Settings filters apply
- **Load POIs here:** Fetch OSM POIs for viewport when no Supabase data
- POI types: cafe, bar, pub, biergarten, restaurant, food, park, etc. (see Cloud Function)

### Settings
- User filter toggles for POI types (food, coffee, bar, park, etc.)
- Wifi required, Pets only
- Types shown respect Catalog (admin-curated allowed list)

### Catalog
- Admin UI to curate which POI types are available to users
- Toggle types on/off; stored in AsyncStorage
- Future: gate by admin role when auth is added

### Hamburger Menu
- Catalog, Settings, Logout (clears MMITM session)
- Visible in header on all screens

## Data Flow

| Source        | Use                            |
|---------------|--------------------------------|
| Supabase      | Venues near midpoint (MMITM) or all stops (browse) |
| OSM API       | Load POIs here (Cloud Function) |
| OSRM          | Driving routes origin → midpoint |
| AsyncStorage  | Session, settings, catalog, map region |

## Screens

- `app/index.tsx` – Create Party
- `app/results.tsx` – Suggestions list
- `app/map.native.tsx` – Native map (react-native-maps)
- `app/map.tsx` – Web map (flat list)
- `app/settings.tsx` – User filters
- `app/catalog.tsx` – Admin type curation

## Env Vars

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_OSM_IMPORT_API_URL` | OSM Cloud Function (optional) |
| `EXPO_PUBLIC_OSRM_URL` | OSRM routing (optional) |

## See Also

- [docs/MAP_SCREEN.md](MAP_SCREEN.md) – Map data flow, OSM import
- [docs/OSRM_SETUP.md](OSRM_SETUP.md) – OSRM on NUC
- [FUTURE.md](../FUTURE.md) – Deferred scope (explore/catalog from OSM, auth)
