// lib/api/fetchOsrmRoute.ts
//
// OSRM routing API client. Fetches driving route between waypoints.
// Expects EXPO_PUBLIC_OSRM_URL (e.g. http://100.113.182.23:5000 or https://router.project-osrm.org).

export type OsrmRouteResult = {
  polyline: { lat: number; lon: number }[];
  distanceMeters: number;
  durationSeconds: number;
};

/**
 * Fetch driving route from OSRM between 2+ waypoints.
 * Uses lon,lat order (GeoJSON) in the API request.
 * Returns polyline coords, distance (meters), duration (seconds).
 * Returns null on error or empty route (graceful failure).
 */
export async function fetchOsrmRoute(
  waypoints: { lat: number; lon: number }[]
): Promise<OsrmRouteResult | null> {
  const baseUrl = process.env.EXPO_PUBLIC_OSRM_URL?.trim();
  if (!baseUrl) return null;

  if (waypoints.length < 2) return null;

  const coords = waypoints.map((w) => `${w.lon},${w.lat}`).join(";");
  const url = `${baseUrl.replace(/\/$/, "")}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry?: { type: string; coordinates: [number, number][] };
      }>;
    };

    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    if (route.distance === 0 || !route.geometry?.coordinates?.length) return null;

    const polyline = route.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));

    return {
      polyline,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}
