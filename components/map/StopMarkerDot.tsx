// components/map/StopMarkerDot.tsx
//
// Purpose:
// - Render the map marker "dot" used inside react-native-maps <Marker> children.
// - This is NOT the same as the tiny UI dot used in lists/labels.
// - Map markers need special behavior:
//   - Larger invisible hit target (finger friendly)
//   - Selected ring + shadow highlight (without changing category color)
//   - No hidden margins (unlike some UI dots that may include spacing)
//
// This component is purely visual + hit target sizing.
// It does NOT handle selection state changes, map refs, or tracksViewChanges.
// Those concerns belong to the map screen.

import React from "react";
import { View } from "react-native";
import { DOT_SIZES } from "../../lib/ui/dotSizes";
import { HIT_TARGET } from "../../lib/ui/spacing";

type Props = {
  // Category fill color (e.g., getPinColor(stop))
  color: string;

  // Whether this marker is selected
  selected: boolean;

  // Visual dot size token (defaults to "lg")
  // NOTE: This is the visual dot/ring size, not the hit target.
  sizeKey?: keyof typeof DOT_SIZES;

  // Tap target size in px (invisible); defaults to 44 (common iOS target)
  hitSize?: number;
};

export function StopMarkerDot({
  color,
  selected,
  sizeKey = "lg",
  hitSize = HIT_TARGET,
}: Props) {
  const size = DOT_SIZES[sizeKey];

  // Ring thickness for selected state
  const ringWidth = 2;

  // Inner fill size (keep breathing room so the ring is visible and not cramped)
  const inner = Math.max(6, size - ringWidth * 2 - 4);

  return (
    // Invisible hit target (finger friendly)
    // Important: this is what makes the marker easy to tap without enlarging
    // the visible dot itself.
    <View
      style={{
        width: hitSize,
        height: hitSize,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
      }}
    >
      {selected ? (
        // Selected: white ring + subtle shadow, category color remains the fill.
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor: "#ffffff",
            alignItems: "center",
            justifyContent: "center",

            // Subtle shadow so the ring reads on any map tile background
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },

            // Android shadow
            elevation: 3,
          }}
        >
          <View
            style={{
              width: inner,
              height: inner,
              borderRadius: inner / 2,
              backgroundColor: color,
            }}
          />
        </View>
      ) : (
        // Normal: plain category dot
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          }}
        />
      )}
    </View>
  );
}
