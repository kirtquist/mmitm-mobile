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

For authenticated-only access, use `--no-allow-unauthenticated` and configure IAM.

## Deploy to Cloud Run (alternative)

Create a `Dockerfile` and deploy as a service if you prefer Cloud Run over Cloud Functions.
