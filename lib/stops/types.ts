// lib/stops/types.ts
//
// Canonical stop type domain model.
//
// IMPORTANT:
// - The database may contain unknown type strings (future OSM tags, typos, etc.).
// - The app must NOT break when unknown types appear.
// - Behavioral logic (filters, grouping, colors) operates ONLY on known StopType values.
// - Unknown strings are preserved separately for visibility/debugging.

export const ALL_STOP_TYPES = [
  "weigh",
  "service",
  "grocery",
  "gas",
  "food",
  "coffee",
  "bar",
  "dogpark",
  "propane",
  "dump",
  "rest",
  "park",
  "attraction",
] as const;

export type StopType = (typeof ALL_STOP_TYPES)[number];

const STOP_TYPE_SET = new Set<string>(ALL_STOP_TYPES);

/** Runtime guard: true only for known canonical StopType values. */
export function isStopType(x: unknown): x is StopType {
  return typeof x === "string" && STOP_TYPE_SET.has(x);
}

/** Split DB tokens into known vs unknown without throwing. */
export function splitStopTypes(raw: string[]): { known: StopType[]; unknown: string[] } {
  const known: StopType[] = [];
  const unknown: string[] = [];

  for (const t of raw) {
    if (isStopType(t)) known.push(t);
    else unknown.push(t);
  }

  return { known, unknown };
}

export type Stop = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  hasWifi: boolean;
  petFriendly: boolean;

  // Known/recognized stop types used for all core logic.
  types: StopType[];

  // Unknown/raw DB types retained ONLY so you can see new incoming tags safely.
  unknownTypes?: string[];
};
