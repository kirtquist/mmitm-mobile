"""
GCP Cloud Function: fetch OSM/Overpass POI data for a bounding box.
Returns stops in the app's schema (name, lat, lon, types, has_wifi, pet_friendly).

Deploy: gcloud functions deploy fetch_osm_stops --gen2 --runtime=python312 \
        --region=us-central1 --source=. --entry-point=fetch_osm_stops \
        --trigger-http --allow-unauthenticated
"""

import json
import logging
import urllib.request
import urllib.parse
from typing import Any

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_TIMEOUT = 90
MAX_LAT_SPAN = 0.5  # ~35mi at mid-latitudes
MAX_LON_SPAN = 0.5

# Maps OSM tags to app stop types (matches tools/import-osm-stops.ts)
TAG_TO_TYPE = {
    ("amenity", "fuel"): "gas",
    ("highway", "rest_area"): "rest",
    ("tourism", "camp_site"): "park",
    ("shop", "supermarket"): "grocery",
    ("amenity", "restaurant"): "food",
    ("amenity", "fast_food"): "food",
    ("leisure", "dog_park"): "dogpark",
    ("shop", "gas"): "propane",  # propane often at gas stations
    ("amenity", "compressed_air"): "propane",
    ("amenity", "car_repair"): "service",
    ("shop", "car_repair"): "service",
    ("highway", "services"): "service",
    ("tourism", "attraction"): "attraction",
    ("tourism", "viewpoint"): "attraction",
}

def _get_city(tags: dict[str, str]) -> str|None:
    """Get city from OSM tags."""
    city = tags.get("addr:city")
    state = tags.get("addr:state")
    if city and state:
        return f"{city}, {state}"
    return city if city else None

def _clamp_bbox(
    min_lat: float, min_lon: float, max_lat: float, max_lon: float
) -> tuple[float, float, float, float]:
    """Limit bbox size to avoid Overpass timeouts."""
    lat_span = max_lat - min_lat
    lon_span = max_lon - min_lon
    if lat_span <= MAX_LAT_SPAN and lon_span <= MAX_LON_SPAN:
        return min_lat, min_lon, max_lat, max_lon
    center_lat = (min_lat + max_lat) / 2
    center_lon = (min_lon + max_lon) / 2
    new_min_lat = center_lat - min(lat_span, MAX_LAT_SPAN) / 2
    new_max_lat = center_lat + min(lat_span, MAX_LAT_SPAN) / 2
    new_min_lon = center_lon - min(lon_span, MAX_LON_SPAN) / 2
    new_max_lon = center_lon + min(lon_span, MAX_LON_SPAN) / 2
    return new_min_lat, new_min_lon, new_max_lat, new_max_lon


def _map_types(tags: dict[str, str]) -> list[str]:
    """Derive app stop types from OSM tags."""
    types = []
    for (k, v), app_type in TAG_TO_TYPE.items():
        if tags.get(k) == v:
            types.append(app_type)
    return list(dict.fromkeys(types))  # preserve order, dedupe


def _derive_name(tags: dict[str, str], osm_id: str) -> str:
    return (
        tags.get("name")
        or tags.get("brand")
        or tags.get("operator")
        or f"OSM Stop {osm_id}"
    )


def _has_wifi(tags: dict[str, str]) -> bool:
    return tags.get("internet_access") in ("wlan", "yes")


def _pet_friendly(tags: dict[str, str]) -> bool:
    return tags.get("dogs") == "yes"


def _extract_center(element: dict) -> tuple[float, float] | None:
    """Get lat, lon from node or way/relation center."""
    if element.get("type") == "node":
        lat = element.get("lat")
        lon = element.get("lon")
        if lat is not None and lon is not None:
            return (float(lat), float(lon))
    elif "center" in element:
        c = element["center"]
        return (float(c["lat"]), float(c["lon"]))
    elif "lat" in element and "lon" in element:
        return (float(element["lat"]), float(element["lon"]))
    return None


def _build_overpass_query(south: float, west: float, north: float, east: float) -> str:
    """Overpass QL for POIs. Uses nwr + out center for ways/relations."""
    bbox = f"({south},{west},{north},{east})"
    return f"""
[out:json][timeout:{OVERPASS_TIMEOUT}];
(
  node["amenity"="fuel"]{bbox};
  node["highway"="rest_area"]{bbox};
  node["tourism"="camp_site"]{bbox};
  node["shop"="supermarket"]{bbox};
  node["amenity"="restaurant"]{bbox};
  node["amenity"="fast_food"]{bbox};
  node["leisure"="dog_park"]{bbox};
  node["amenity"="car_repair"]{bbox};
  node["shop"="car_repair"]{bbox};
  node["tourism"="attraction"]{bbox};
  way["amenity"="fuel"]{bbox};
  way["highway"="rest_area"]{bbox};
  way["tourism"="camp_site"]{bbox};
  way["shop"="supermarket"]{bbox};
  way["amenity"="restaurant"]{bbox};
  way["amenity"="fast_food"]{bbox};
  way["leisure"="dog_park"]{bbox};
  way["amenity"="car_repair"]{bbox};
  way["shop"="car_repair"]{bbox};
  way["tourism"="attraction"]{bbox};
);
out center;
"""


def _query_overpass(south: float, west: float, north: float, east: float) -> dict:
    """Fetch from Overpass API."""
    q = _build_overpass_query(south, west, north, east)
    data = q.encode("utf-8")
    req = urllib.request.Request(
        OVERPASS_URL,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=OVERPASS_TIMEOUT + 10) as resp:
        return json.loads(resp.read().decode())


def _transform_elements(elements: list[dict]) -> list[dict]:
    """Convert Overpass elements to app stops schema."""
    stops = []
    seen = set()  # (lat, lon, name) dedupe

    for el in elements:
        tags = el.get("tags") or {}
        types = _map_types(tags)
        if not types:
            continue

        center = _extract_center(el)
        if not center:
            continue

        lat, lon = center
        name = _derive_name(tags, f"{el.get('type','')}-{el.get('id','')}")
        key = (round(lat, 6), round(lon, 6), name)
        if key in seen:
            continue
        seen.add(key)

        stops.append({
            "name": name,
            "city": _get_city(tags),
            "lat": lat,
            "lon": lon,
            "types": types,
            "has_wifi": _has_wifi(tags),
            "pet_friendly": _pet_friendly(tags),
        })

    return stops


def fetch_osm_stops(request) -> tuple[Any, int]:
    """
    HTTP-triggered Cloud Function.
    Expects JSON body: { "bbox": [min_lat, min_lon, max_lat, max_lon] }
    or query params: min_lat, min_lon, max_lat, max_lon
    """
    # CORS
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        return ("", 204, headers)

    headers = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}

    try:
        bbox = None
        if request.method == "POST" and request.is_json:
            body = request.get_json() or {}
            bbox = body.get("bbox")
        if not bbox:
            bbox = [
                request.args.get("min_lat"),
                request.args.get("min_lon"),
                request.args.get("max_lat"),
                request.args.get("max_lon"),
            ]
        if not bbox or len(bbox) != 4 or any(v is None for v in bbox):
            return (
                json.dumps({"error": "bbox required: [min_lat, min_lon, max_lat, max_lon]"}),
                400,
                headers,
            )

        min_lat, min_lon, max_lat, max_lon = (float(x) for x in bbox)
        min_lat, min_lon, max_lat, max_lon = _clamp_bbox(min_lat, min_lon, max_lat, max_lon)


        data = _query_overpass(min_lat, min_lon, max_lat, max_lon)
        elements = data.get("elements", [])
        stops = _transform_elements(elements)

        return (json.dumps({"stops": stops, "count": len(stops)}), 200, headers)

    except json.JSONDecodeError as e:
        logging.warning("Overpass JSON error: %s", e)
        return (
            json.dumps({"error": "Overpass API returned invalid JSON"}),
            502,
            headers,
        )
    except urllib.error.HTTPError as e:
        logging.warning("Overpass HTTP error: %s", e)
        return (
            json.dumps({"error": f"Overpass API error: {e.code}"}),
            502,
            headers,
        )
    except Exception as e:
        logging.exception("fetch_osm_stops failed")
        return (
            json.dumps({"error": str(e)}),
            500,
            headers,
        )
