// utils/catalogStorage.ts
//
// Admin-curated list of POI types that users can pick from.
// Stored in AsyncStorage. If empty, treat as "all allowed" (full catalog).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { isStopType, type StopType } from "../lib/stops/types";

const ALLOWED_TYPES_KEY = "@mmitm/allowed_types";

/**
 * Load the admin-curated list of allowed types.
 * Returns null if not set (meaning all types are allowed).
 */
export async function loadAllowedTypes(): Promise<StopType[] | null> {
  try {
    const raw = await AsyncStorage.getItem(ALLOWED_TYPES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter(
      (t): t is StopType => isStopType(t)
    );
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

/**
 * Save the admin-curated list of allowed types.
 * Pass empty array to reset to "all allowed" (caller can pass [] to clear).
 */
export async function saveAllowedTypes(types: StopType[]): Promise<void> {
  if (types.length === 0) {
    await AsyncStorage.removeItem(ALLOWED_TYPES_KEY);
    return;
  }
  await AsyncStorage.setItem(ALLOWED_TYPES_KEY, JSON.stringify(types));
}
