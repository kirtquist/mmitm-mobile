// utils/settingsStorage.ts
//
// Persistent filter settings loaded from AsyncStorage.
// Defaults to permissive (include all) so users see stops until they narrow filters.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StopType } from "../lib/stops/types";

const SETTINGS_KEY = "@mmitm/settings_filters";

/** Map StopType to the SettingsFilters include key. */
export const STOP_TYPE_TO_FILTER_KEY: Record<StopType, keyof SettingsFilters> = {
  // weigh: "includeWeigh",
  // service: "includeService",
  grocery: "includeGrocery",
  gas: "includeGas",
  food: "includeFood",
  coffee: "includeCoffee",
  bar: "includeBar",
  dogpark: "includeDogPark",
  // propane: "includePropane",
  // dump: "includeDump",
  rest: "includeRest",
  park: "includePark",
  attraction: "includeAttractions",
};

export type SettingsFilters = {
  wifiRequired: boolean;
  petsOnly: boolean;
  // includeWeigh: boolean;
  // includeService: boolean;
  includeGrocery: boolean;
  includeGas: boolean;
  includeFood: boolean;
  includeCoffee: boolean;
  includeBar: boolean;
  includeDogPark: boolean;
  // includePropane: boolean;
  // includeDump: boolean;
  includeRest: boolean;
  includePark: boolean;
  includeAttractions: boolean;
};

const DEFAULTS: SettingsFilters = {
  wifiRequired: false,
  petsOnly: false,
  // includeWeigh: true,
  // includeService: true,
  includeGrocery: true,
  includeGas: true,
  includeFood: true,
  includeCoffee: true,
  includeBar: true,
  includeDogPark: true,
  // includePropane: true,
  // includeDump: true,
  includeRest: true,
  includePark: true,
  includeAttractions: true,
};

export async function loadSettingsFilters(): Promise<SettingsFilters> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SettingsFilters>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettingsFilters(filters: SettingsFilters): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(filters));
}
