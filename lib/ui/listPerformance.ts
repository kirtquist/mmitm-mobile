// lib/ui/listPerformance.ts
//
// Centralized performance tuning constants for large virtualized lists
// (FlatList / SectionList via StickyGroupedList).
//
// These values are tuned for:
// - iOS-first UX
// - older hardware tolerance
// - large datasets (hundreds–thousands of rows)
//
// IMPORTANT:
// These are behavioral constants, not layout constants.
// Do not inline these numbers in screens.

export const LIST_PERFORMANCE = {
  /**
   * Number of rows rendered on initial mount.
   * Lower = faster first paint, higher = fewer blank rows.
   */
  INITIAL_RENDER_COUNT: 10,

  /**
   * Number of "screens" worth of content kept mounted.
   * 5 is a good balance between memory and scroll smoothness.
   */
  WINDOW_SIZE: 5,

  /**
   * Maximum number of rows rendered per batch.
   * Lower reduces frame drops on slow devices.
   */
  MAX_RENDER_PER_BATCH: 8,

  /**
   * Time (ms) between render batches.
   * Higher spreads work across frames, improving responsiveness.
   */
  BATCH_UPDATE_PERIOD_MS: 75,

  /**
   * Unmount rows that are outside the viewport.
   * Strongly recommended for long lists.
   */
  REMOVE_CLIPPED_SUBVIEWS: true,
} as const;
