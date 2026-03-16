// lib/stops/pinStyles.ts
//
// Single source of truth for *visual buckets* (not semantic stop types).
//
// Responsibilities:
// - Define the palette + label for each StopVisualCategory.
// - Define the legend ordering for those categories.
//
// NOTES:
// - Stop types (StopType) are semantic and live in catalog.ts.
// - Stop types map to these visual categories via stopTypeToVisualCategory().
// - Do NOT introduce additional type->color mappings outside of catalog.ts + PIN_STYLES.

export const PIN_STYLES = {
  gas:        { color: "#e67e22", label: "Gas / Propane" },
  food:       { color: "#e74c3c", label: "Food / Grocery" },
  park:       { color: "#27ae60", label: "Parks / Dog Parks" },
  pub:        { color: "#95a5a6", label: "Pubs / Bars" },
  rest:       { color: "#95a5a6", label: "Rest Areas" },
  // weigh:      { color: "#9b59b6", label: "Repair Shop / Weigh Stations" },
  attraction: { color: "#2980b9", label: "Attractions" },
  other:      { color: "#34495e", label: "Other Stops" },
} as const;

export type StopVisualCategory = keyof typeof PIN_STYLES;

// Legend ordering is a *visual* concern, so it lives here.
export const PIN_LEGEND_ORDER: readonly StopVisualCategory[] = [
  "gas",
  "food",
  "park",
  "pub",
  "rest",
  // "weigh",
  "attraction",
  "other",
] as const;

// -----------------------------------------------------------------------------
// Legend rows helper
//
// Purpose:
// - Provide a single, canonical “legend row” shape for any UI that needs the map
//   legend (or similar).
// - Eliminates duplicated "const style = PIN_STYLES[key]" logic in render code.
// - Ensures legend ordering always stays in sync with PIN_LEGEND_ORDER.
// -----------------------------------------------------------------------------

export type PinLegendRow = Readonly<{
  key: StopVisualCategory;
  label: string;
  color: string;
}>;

/**
 * Prebuilt legend rows in canonical order.
 * Use this in UI instead of mapping PIN_LEGEND_ORDER + PIN_STYLES manually.
 */
export const PIN_LEGEND_ROWS: readonly PinLegendRow[] = PIN_LEGEND_ORDER.map(
  (key) => ({
    key,
    label: PIN_STYLES[key].label,
    color: PIN_STYLES[key].color,
  })
);