// lib/stops/filterStops.ts
//
// Persistent Settings-based filtering.
//
// IMPORTANT:
// - This operates ONLY on known StopType values (stop.types).
// - Unknown tags (stop.unknownTypes) never influence Settings filtering.

import { SettingsFilters } from "../../utils/settingsStorage";
import { Stop, StopType } from "./types";

export function filterStops(stops: Stop[], filters: SettingsFilters): Stop[] {
  return stops.filter((stop) => {
    if (filters.wifiRequired && !stop.hasWifi) return false;
    if (filters.petsOnly && !stop.petFriendly) return false;

    const hasType = (t: StopType) => stop.types.includes(t);

    if (!filters.includeWeigh && hasType("weigh")) return false;
    if (!filters.includeService && hasType("service")) return false;
    if (!filters.includeGrocery && hasType("grocery")) return false;
    if (!filters.includeGas && hasType("gas")) return false;
    if (!filters.includeFood && hasType("food")) return false;
    if (!filters.includeCoffee && hasType("coffee")) return false;
    if (!filters.includeBar && hasType("bar")) return false;
    if (!filters.includeDogPark && hasType("dogpark")) return false;
    if (!filters.includePropane && hasType("propane")) return false;
    if (!filters.includeDump && hasType("dump")) return false;
    if (!filters.includeRest && hasType("rest")) return false;
    if (!filters.includePark && hasType("park")) return false;
    if (!filters.includeAttractions && hasType("attraction")) return false;

    return true;
  });
}
