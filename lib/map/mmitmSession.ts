// lib/map/mmitmSession.ts
//
// Shared meet-in-the-middle session type and storage key.

export const MMITM_SESSION_KEY = "@mmitm/session";

export type MmitmOrigin = { lat: number; lon: number; label: string };

export type MmitmSession = {
  origins: MmitmOrigin[];
  center: { lat: number; lon: number };
  radiusMiles: number;
  poiType?: string;  // Create Party: Cafe, Pub, Restaurant, Park
};
