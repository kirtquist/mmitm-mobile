# OSRM Setup on NUC

Self-hosted OSRM routing engine for driving routes (origin → midpoint) in the Meet-in-the-Middle map.

## Prerequisites

- Docker on NUC (Linux)
- ~5GB free disk for us-west extract + processed files
- ~4GB RAM for processing

## NUC Setup (us-west extract)

Run in a dedicated directory (e.g. `~/osrm`):

```bash
mkdir -p ~/osrm && cd ~/osrm

# Remove old data if rebuilding
docker stop osrm 2>/dev/null; docker rm osrm 2>/dev/null
rm -f *.osrm*

# Download US West extract (~3.1 GB)
wget https://download.geofabrik.de/north-america/us-west-latest.osm.pbf

# Pull OSRM v5 (CH algorithm)
docker pull ghcr.io/project-osrm/osrm-backend:v5.27.1

# 1. Extract
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
  osrm-extract -p /opt/car.lua /data/us-west-latest.osm.pbf

# 2. Contract
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
  osrm-contract /data/us-west-latest.osrm

# 3. Run routing server (port 5000)
docker run -d --name osrm -p 5000:5000 -v $(pwd):/data \
  ghcr.io/project-osrm/osrm-backend:v5.27.1 \
  osrm-routed /data/us-west-latest.osrm
```

## Test

```bash
curl "http://localhost:5000/route/v1/driving/-122.74,45.82;-122.68,45.45?overview=full&geometries=geojson"
```

Coordinates are `lon,lat` (GeoJSON order). Ridgefield WA → Portland OR should return a route with `distance` > 0 and `geometry.coordinates`.

## Env Vars

| Variable | Example | Notes |
|----------|---------|-------|
| `EXPO_PUBLIC_OSRM_URL` | `http://100.113.182.23:5000` | NUC IP + port 5000 |
| | `https://router.project-osrm.org` | Public demo (light use) |

Add to `.env.nuc` when using NUC Supabase, or `.env.local` for local dev. Omit or leave empty to skip route drawing.

## Docker Compose (optional)

```yaml
services:
  osrm:
    image: ghcr.io/project-osrm/osrm-backend:v5.27.1
    container_name: osrm
    ports:
      - "5000:5000"
    volumes:
      - ./:/data
    command: osrm-routed /data/us-west-latest.osrm
    restart: unless-stopped
```
