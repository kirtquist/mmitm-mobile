// lib/stops/visibleStops.ts
//
// Shared "what should this screen show?" pipeline for Stops (and can be reused by Map).
//
// This file exists to make it impossible to repeat the previous footgun:
// - "quickType changes, logs say it filtered, but UI still shows unfiltered list"
//
// This module is the *single source of truth* for visibility:
// 1) Apply persisted Settings filters (filterStops)
// 2) Apply ephemeral quick StopType chip (quickType)
// 3) Apply search (stopMatchesQuery)
//
// Every caller should derive *all rows* from the returned Stop[].

import type { Stop, StopType } from "./types";
import type { SettingsFilters } from "../../utils/settingsStorage";

import { filterStops } from "./filterStops";
import { stopMatchesQuery } from "./search";

type Args = {
  stops: Stop[];
  filters: SettingsFilters;
  quickType: StopType | null;
  search: string;
};

export function getVisibleStops({ stops, filters, quickType, search }: Args): Stop[] {
  // 1) Baseline: Settings filters are the truth.
  const base = filterStops(stops, filters);

  // 2) Ephemeral quick filter (StopType 1:1).
  // If a stop has multiple types, any matching type qualifies it.
  const quickFiltered = quickType ? base.filter((s) => s.types.includes(quickType)) : base;

  // 3) Search: name/types/unknownTypes + amenity keyword interpretation.
  const q = search.trim();
  if (!q) return quickFiltered;

  return quickFiltered.filter((s) => stopMatchesQuery(s, q));
}
