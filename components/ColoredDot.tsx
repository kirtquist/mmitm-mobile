// components/ColoredDot.tsx
//
// Small colored circle for legend and stop type indicators.
// Theme-independent (color passed as prop).

import React from "react";
import { View } from "react-native";

type Props = {
  color: string;
  size: number;
};

export function ColoredDot({ color, size }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
    />
  );
}
