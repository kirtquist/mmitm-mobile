// lib/stops/search.ts
//
// Shared search helpers for Stops/Map.
//
// Goals:
// - Match what users see in the UI (Wi-Fi / Pet friendly) even when those are booleans.
// - Avoid fragile substring rules in screen files.
// - Keep behavior conservative and predictable.
// - Keep unknown types searchable (e.g. "hippo") without breaking the app.

import type { Stop } from "./types";

/** Normalize user query into a comparable form. */
export function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Tokenize a normalized query into words. */
export function tokenizeQuery(qNorm: string): string[] {
  return qNorm.split(" ").filter(Boolean);
}

/**
 * Determine whether the query is explicitly asking for Wi-Fi.
 *
 * Accepted spellings:
 * - "wifi"
 * - "wi-fi"
 * - "wi fi"
 */
export function queryWantsWifi(qNorm: string, tokens: string[]): boolean {
  if (qNorm.includes("wifi") || qNorm.includes("wi-fi")) return true;

  // Handle "wi fi" as two tokens.
  if (tokens.length >= 2 && tokens[0] === "wi" && tokens[1] === "fi") return true;

  return false;
}

/**
 * Determine whether the query is explicitly asking for pets / pet friendly.
 *
 * Rules:
 * - Any token starting with "pet" matches:
 *   pet, pets, petsmart, pet-friendly, petfriendly, etc.
 * - Phrase matches:
 *   "pet friendly", "pet-friendly", "petfriendly"
 * - Exact single token "friendly" also matches (because it appears as UI text).
 *
 * IMPORTANT:
 * - We do NOT treat "friendly" as a general adjective; only exact token "friendly".
 */
export function queryWantsPets(qNorm: string, tokens: string[]): boolean {
  if (
    qNorm.includes("pet friendly") ||
    qNorm.includes("pet-friendly") ||
    qNorm.includes("petfriendly")
  ) {
    return true;
  }

  if (tokens.some((t) => t.startsWith("pet"))) return true;

  // Allow typing the visible UI word.
  if (tokens.length === 1 && tokens[0] === "friendly") return true;

  return false;
}

/**
 * Standard predicate: does this stop match the user query?
 *
 * Matching tiers:
 * 1) Name + known types + unknown types
 * 2) Amenity keyword interpretation (wifi/pets)
 */
export function stopMatchesQuery(stop: Stop, query: string): boolean {
  const qNorm = normalizeQuery(query);
  if (!qNorm) return true;

  // 1) Name + type strings (known + unknown)
  const nameOrTypeMatch =
    stop.name.toLowerCase().includes(qNorm) ||
    stop.types.some((t) => t.toLowerCase().includes(qNorm)) ||
    (stop.unknownTypes ?? []).some((t) => t.toLowerCase().includes(qNorm));

  if (nameOrTypeMatch) return true;

  // 2) Amenity keywords
  const tokens = tokenizeQuery(qNorm);
  const wantsWifi = queryWantsWifi(qNorm, tokens);
  const wantsPets = queryWantsPets(qNorm, tokens);

  return (wantsWifi && stop.hasWifi) || (wantsPets && stop.petFriendly);
}
