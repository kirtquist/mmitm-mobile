// utils/settingsStorage.ts
//
// Persistent filter settings loaded from AsyncStorage.
// Defaults to permissive (include all) so users see stops until they narrow filters.

import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "@mmitm/settings_filters";

export type SettingsFilters = {
  wifiRequired: boolean;
  petsOnly: boolean;
  includeWeigh: boolean;
  includeService: boolean;
  includeGrocery: boolean;
  includeGas: boolean;
  includeFood: boolean;
  includeCoffee: boolean;
  includeBar: boolean;
  includeDogPark: boolean;
  includePropane: boolean;
  includeDump: boolean;
  includeRest: boolean;
  includePark: boolean;
  includeAttractions: boolean;
};

const DEFAULTS: SettingsFilters = {
  wifiRequired: false,
  petsOnly: false,
  includeWeigh: true,
  includeService: true,
  includeGrocery: true,
  includeGas: true,
  includeFood: true,
  includeCoffee: true,
  includeBar: true,
  includeDogPark: true,
  includePropane: true,
  includeDump: true,
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
