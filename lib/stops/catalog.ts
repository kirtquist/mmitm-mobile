// lib/stops/catalog.ts
//
// Canonical stop type catalog.
//
// Single source of truth for StopType semantics:
//
// - Canonical ordering of StopType values (grouping + primary selection).
// - Per-type metadata (labels + visual category bucket).
// - Helpers so callers do not reimplement:
//    - primary type selection
//    - StopType -> visual bucket mapping
//    - label lookup
//
// Notes:
// - StopType = semantic type (what the stop is).
// - StopVisualCategory = visual bucket (how it is colored).
// - Multiple StopType values may map to the same visual bucket.
// - Actual bucket styles (colors, legend order) live in pinStyles.ts.

import { StopVisualCategory } from "./pinStyles";
import { StopType, isStopType } from "./types";

export type StopTypeMeta = Readonly<{
  label: string;
  visual: StopVisualCategory;
}>;

export const STOP_TYPE_ORDER: readonly StopType[] = [
  "gas",
  // "propane",
  "grocery",
  "food",
  "coffee",
  "bar",
  "dogpark",
  "park",
  "rest",
  // "dump",
  // "service",
  // "weigh",
  "attraction",
] as const;

export const STOP_TYPE_META: Readonly<Record<StopType, StopTypeMeta>> = {
  gas: { label: "Fuel & Gas", visual: "gas" },
  // propane: { label: "Propane", visual: "gas" },

  grocery: { label: "Groceries", visual: "food" },
  food: { label: "Food", visual: "food" },
  coffee: { label: "Coffee / Cafe", visual: "food" },
  bar: { label: "Bar", visual: "food" },

  dogpark: { label: "Dog Parks", visual: "park" },
  park: { label: "Parks", visual: "park" },

  rest: { label: "Rest Areas", visual: "rest" },
  // dump: { label: "Dump Stations", visual: "rest" },

  // service: { label: "Repair Shops", visual: "weigh" },
  // weigh: { label: "Weigh Stations", visual: "weigh" },

  attraction: { label: "Attractions", visual: "attraction" },
} as const;

/**
 * Returns the "primary" StopType from a stop's type array.
 *
 * Rules:
 * - Uses STOP_TYPE_ORDER to pick the highest-priority type that exists.
 * - Ignores unknown tags.
 * - Returns undefined if no recognized type exists.
 */
export function getPrimaryStopType(types: readonly (StopType | string)[]): StopType | undefined {
  if (!types || types.length === 0) return undefined;

  // Keep only recognized StopType tokens.
  const set = new Set<StopType>();
  for (const t of types) {
    if (isStopType(t)) set.add(t);
  }

  for (const t of STOP_TYPE_ORDER) {
    if (set.has(t)) return t;
  }

  return undefined;
}

/** StopType -> visual bucket (PIN_STYLES key). */
export function stopTypeToVisualCategory(type: StopType): StopVisualCategory {
  return STOP_TYPE_META[type].visual;
}

/** Canonical label for UI. */
export function stopTypeLabel(type: StopType): string {
  return STOP_TYPE_META[type].label;
}

/** For UIs that want the colorKey derived from StopType. */
export function colorKeyForStopType(type: StopType): StopVisualCategory {
  return stopTypeToVisualCategory(type);
}
