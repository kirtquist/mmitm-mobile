// lib/map/mmitmSession.ts
//
// Shared meet-in-the-middle session type and storage key.

export const MMITM_SESSION_KEY = "@mmitm/session";
export const DEFAULT_MMITM_RADIUS_MILES = 5;
export const MAX_MMITM_RADIUS_MILES = 50;
export const MMITM_RADIUS_EXPANSION_STEPS_MILES = [10, 20, 50] as const;

export type MmitmOrigin = { lat: number; lon: number; label: string };

export type MmitmSession = {
  origins: MmitmOrigin[];
  center: { lat: number; lon: number };
  radiusMiles: number;
  poiType?: string;  // Create Party: Cafe, Pub, Restaurant, Park
};

export function normalizeMmitmRadiusMiles(value: unknown): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return DEFAULT_MMITM_RADIUS_MILES;
  return Math.min(MAX_MMITM_RADIUS_MILES, Math.max(1, parsed));
}

export function getMmitmRadiusSearchSequence(startRadiusMiles: number): number[] {
  const normalizedStart = normalizeMmitmRadiusMiles(startRadiusMiles);
  const radii = [normalizedStart];
  for (const radius of MMITM_RADIUS_EXPANSION_STEPS_MILES) {
    if (radius > normalizedStart) radii.push(radius);
  }
  return radii;
}
