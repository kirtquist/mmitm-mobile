// lib/supabase/stops.ts
//
// Fetch stop rows from Supabase and enforce a stable DB → App boundary.
//
// FIXES INCLUDED:
// 1) Stable pagination ordering:
//    - Pagination using range() MUST order by a deterministic key.
//    - Ordering by "name" alone is NOT deterministic because many rows share the same name.
//    - We order by name, then id as a tie-breaker to make pagination stable.
//
// 2) Defensive de-duplication by stop id:
//    - Even with stable ordering, network retries or backend quirks can still produce duplicates.
//    - We harden the boundary: Stop[] returned from this module will never contain duplicate ids.
//
// GOALS PRESERVED:
// - Preserve multi-type arrays exactly as stored.
// - Normalize token formatting (trim + lowercase).
// - Keep unknown types harmless:
//    - known types populate Stop.types (StopType[])
//    - unknown types preserved in Stop.unknownTypes for visibility/debugging

import { STOP_TYPE_META } from "../stops/catalog";
import { Stop, StopType } from "../stops/types";
import { supabase } from "../supabase";

// Normalize DB "types" into string tokens.
// Supports:
// - Postgres array (ideal)
// - JSON array (often returned as JS array already)
// - accidental comma-separated string
function normalizeTypes(raw: any): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof raw === "string") {
    const s = raw.trim();

    // If someone accidentally stored a Postgres-style "{a,b,c}" string,
    // strip braces and then split on comma.
    const cleaned = s.startsWith("{") && s.endsWith("}") ? s.slice(1, -1) : s;

    return cleaned
      .split(",")
      .map((x) => x.replace(/^"+|"+$/g, "").trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

// Runtime guard for known StopType keys (catalog is the source of truth).
function isStopType(x: string): x is StopType {
  return x in STOP_TYPE_META;
}

export async function fetchAllStops(): Promise<Stop[]> {
  console.log("SUPABASE: Starting fetchAllStops...");
  const pageSize = 1000; // typical safe page size for PostgREST/Supabase
  let from = 0;

  // We build a Map keyed by stop id to guarantee uniqueness.
  // This makes the Stops tab immune to duplicate rows caused by unstable pagination.
  const byId = new Map<string, Stop>();

  while (true) {
    const to = from + pageSize - 1;

    console.log(`SUPABASE: Fetching range ${from} to ${to}...`);
    const { data, error } = await supabase
      .from("stops")
      .select("id, name, lat, lon, has_wifi, pet_friendly, types")
      // IMPORTANT:
      // Pagination MUST be deterministic. "name" alone is not unique.
      // Tie-break with id to prevent overlapping pages when names repeat.
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("SUPABASE ERROR:", error.message);
      throw error;
    }

    const rows = data ?? [];
    console.log(`SUPABASE: Received ${rows.length} rows`);
    if (rows.length === 0) break;

    for (const row of rows as any[]) {
      const rawTypes = normalizeTypes(row.types);

      // Keep known types for app behavior (filters/colors/grouping).
      const known = rawTypes.filter(isStopType);

      // Preserve unknown tokens so you can SEE new tags without breaking the app.
      const unknown = rawTypes.filter((t) => !isStopType(t));

      const stop: Stop = {
        id: row.id,
        name: row.name,
        lat: row.lat,
        lon: row.lon,
        hasWifi: !!row.has_wifi,
        petFriendly: !!row.pet_friendly,
        types: known,
        unknownTypes: unknown.length ? unknown : undefined,
      };

      // De-dupe by id. If we see the same id again, last one wins.
      byId.set(stop.id, stop);
    }

    // If we got less than a full page, we’re done.
    if (rows.length < pageSize) break;

    from += pageSize;
  }

  console.log(`SUPABASE: Finished. Total unique stops: ${byId.size}`);
  // Return in deterministic order for UI stability:
  // - by name, then id (matches query ordering)
  return Array.from(byId.values()).sort((a, b) => {
    const n = a.name.localeCompare(b.name);
    if (n !== 0) return n;
    return a.id.localeCompare(b.id);
  });
}

/** Haversine distance in miles between two lat/lon points. */
function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Venue types prioritized for meet-in-the-middle (food, coffee, bars). */
const MMITM_PRIORITY_TYPES = new Set(["food", "coffee", "bar", "grocery"]);

/**
 * Fetch stops within radiusMiles of (lat, lon).
 * Uses fetchAllStops + in-memory haversine filter.
 * Optional: filter to venue types (food, coffee, bar, grocery) for meet-in-the-middle.
 */
export async function fetchStopsNear(
  lat: number,
  lon: number,
  radiusMiles: number,
  options?: { venueTypesOnly?: boolean }
): Promise<Stop[]> {
  const all = await fetchAllStops();
  let near = all.filter(
    (s) => haversineMiles(lat, lon, s.lat, s.lon) <= radiusMiles
  );

  if (options?.venueTypesOnly) {
    near = near.filter((s) =>
      s.types.some((t) => MMITM_PRIORITY_TYPES.has(t))
    );
    // Sort: food/coffee/bar first, then grocery
    const priority = (t: string) =>
      t === "food" || t === "coffee" || t === "bar" ? 0 : 1;
    near.sort((a, b) => {
      const pa = Math.min(...a.types.map(priority));
      const pb = Math.min(...b.types.map(priority));
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
  }

  return near;
}
