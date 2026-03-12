// lib/stops/utils.ts
//
// Stop utilities.
// IMPORTANT:
// - StopType semantics come from catalog.ts.
// - Visual buckets come from pinStyles.ts.
// - Unknown tags are display-only; they must never break core logic.

import { getPrimaryStopType, STOP_TYPE_META, stopTypeToVisualCategory } from "./catalog";
import { PIN_STYLES } from "./pinStyles";
import { Stop, StopType } from "./types";

export function getPinColor(stop: Stop) {
  // Canonical primary selection (never use stop.types[0]).
  const primary = getPrimaryStopType(stop.types) ?? ("rest" as StopType);
  const visual = stopTypeToVisualCategory(primary);
  return PIN_STYLES[visual].color;
}

/**
 * Format types for display:
 * - Known StopTypes use canonical labels (catalog).
 * - Unknown tags show as TitleCase fallback so you can see "hippo", etc.
 */
export function formatTypes(types: StopType[], unknownTypes: string[] = []): string {
  const known = types.map((t) => STOP_TYPE_META[t].label);

  const unknown = unknownTypes.map((t) => {
    const s = String(t).trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  });

  return [...known, ...unknown].join(" · ");
}
