// lib/stops/stopIcons.ts
// Central mapping of stop-related UI icons.
// Used by both the Stops tab and Settings tab so icons stay consistent.

import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StopVisualCategory } from "./pinStyles";

// Component alias so both screens can use the same base icon component.
export const StopIconComponent = MaterialCommunityIcons;

// Type-safe name for this icon set.
export type StopIconName = React.ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

// Keys we care about in UI:
//
// - StopVisualCategory: categories that appear on the map / legend
// - "wifi", "pets": UI-only filters that still deserve icons
//
export type StopUiIconKey = StopVisualCategory | "wifi" | "pets";

// Shared mapping from semantic key -> concrete MaterialCommunityIcons name.
// If your Stops tab uses slightly different names, update these to match.
export const STOP_ICON: Record<StopUiIconKey, StopIconName> = {
  // Map categories you already have in PIN_STYLES
  gas: "gas-station",            // fuel pump icon you like
  food: "silverware-fork-knife",
  park: "tree",
  rest: "bed",
  weigh: "scale-bathroom",
  attraction: "star-circle",
  other: "map-marker",

  // UI-only keys
  wifi: "wifi",
  pets: "paw",
};
