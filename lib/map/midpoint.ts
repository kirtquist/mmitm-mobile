// lib/map/midpoint.ts
//
// Geographic midpoint from 2+ locations.
// Used for meet-in-the-middle: center = average of origin coordinates.

export type LatLon = { lat: number; lon: number };

/**
 * Compute geographic center (centroid) from 2+ points.
 * Simple arithmetic mean; for spherical accuracy use weighted average by cos(lat).
 */
export function geographicMidpoint(points: LatLon[]): LatLon | null {
  if (!points || points.length === 0) return null;
  if (points.length === 1) return { lat: points[0].lat, lon: points[0].lon };

  const n = points.length;
  let sumLat = 0;
  let sumLon = 0;
  for (const p of points) {
    sumLat += p.lat;
    sumLon += p.lon;
  }
  return {
    lat: sumLat / n,
    lon: sumLon / n,
  };
}
