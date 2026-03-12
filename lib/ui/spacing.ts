// lib/ui/spacing.ts

export const SPACING = {
  bw: 1,   // borderWidth
  xxs: 2,  // itty bitty gaps
  xs: 4,   // tiny gaps, chip spacing
  sm: 8,   // small gaps between related lines
  md: 12,  // section interior gaps
  lg: 16,  // padding, larger gaps
  xl: 24,  // between sections / blocks

  cardPaddingV: 0,  // vertical padding inside card wrapper
  cardRadius: 12,
  borderRadius: 8,

  iconSize: 28,
  iconRadius: 8, // e.g. 8 or 999 for circle
  iconGlyphSize: 16,
} as const;

export const HIT_TARGET = 44; // The invisible spot size when tapping someting on the screen.