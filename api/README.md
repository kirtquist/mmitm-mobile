# OSM Overpass API – GCP Cloud Function

Fetches POI data from OpenStreetMap via the Overpass API for a given bounding box. Returns stops in the app schema (name, lat, lon, types, has_wifi, pet_friendly).

## Request

**POST** with JSON body:
```json
{ "bbox": [min_lat, min_lon, max_lat, max_lon] }
```

**GET** with query params:
```
?min_lat=45.5&min_lon=-122.6&max_lat=46.0&max_lon=-122.0
```

## Response

```json
{
  "stops": [
    {
      "name": "Shell",
      "lat": 45.52,
      "lon": -122.68,
      "types": ["gas"],
      "has_wifi": false,
      "pet_friendly": false
    }
  ],
  "count": 123
}
```

## Deploy to GCP Cloud Functions (2nd gen)

```bash
cd api
gcloud functions deploy fetch_osm_stops \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=fetch_osm_stops \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=120s
```
```powershell
cd api
gcloud functions deploy fetch_osm_stops --gen2 --runtime=python312 --region=us-west1 --source=. --entry-point=fetch_osm_stops --trigger-http --allow-unauthenticated --timeout=120s
```
For authenticated-only access, use `--no-allow-unauthenticated` and configure IAM.

## Geocode

Proxies Nominatim geocoding for web (avoids CORS). Same function, routed by `q`:

**GET** or **POST** with `q`:
```
?q=98642
```
or POST body: `{ "q": "98642" }`

**Response** (success):
```json
{ "lat": 45.793, "lon": -122.693, "display_name": "98642, Clark County, Washington, United States" }
```

**Response** (no result): `{ "result": null }`

The app uses this on web; native calls Nominatim directly (no CORS). Uses `EXPO_PUBLIC_OSM_IMPORT_API_URL` as base URL.

## Explore mode

`?explore=1` (or `true`, `yes`): returns all amenity, shop, leisure POIs in raw tag format for inspection. No type filtering.

## POI types (OSM → app)

Parks: `leisure=park`, `leisure=nature_reserve`, `leisure=garden`, `tourism=camp_site`. In OSM, parks are usually **ways** (polygons); we query both `node` and `way` with `out center` for ways. Other POIs (fuel, restaurant, etc.) are often nodes; including both node and way maximizes coverage.

## Overpass QL gotchas

- **No comments** – Overpass QL does not support `#` comments. They break the query.
- **Bbox format** – `(south, west, north, east)` in the query. Overpass Turbo uses `{{bbox}}` for the current map view (template, not raw API).

## Troubleshooting

- **400** – bbox required. Send `[min_lat, min_lon, max_lat, max_lon]` in body or as query params.
- **502** – Overpass API error or invalid query (e.g. syntax from commented lines).

## Deploy to Cloud Run (alternative)

Create a `Dockerfile` and deploy as a service if you prefer Cloud Run over Cloud Functions.
