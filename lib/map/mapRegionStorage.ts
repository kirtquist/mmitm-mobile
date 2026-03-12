// lib/map/mapRegionStorage.ts
//
// Persist and restore last map region (center + deltas) in AsyncStorage.
// Map restores on return so users resume where they left off.

import AsyncStorage from "@react-native-async-storage/async-storage";

const MAP_REGION_KEY = "@mmitm/map_region";

export type StoredMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export async function loadMapRegion(): Promise<StoredMapRegion | null> {
  try {
    const raw = await AsyncStorage.getItem(MAP_REGION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMapRegion;
    if (
      typeof parsed?.latitude !== "number" ||
      typeof parsed?.longitude !== "number" ||
      typeof parsed?.latitudeDelta !== "number" ||
      typeof parsed?.longitudeDelta !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveMapRegion(region: StoredMapRegion): Promise<void> {
  try {
    await AsyncStorage.setItem(MAP_REGION_KEY, JSON.stringify(region));
  } catch (e) {
    console.warn("Failed to save map region", e);
  }
}
