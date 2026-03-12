// lib/stops/stopTypeIcon.tsx
//
// Shared icon mapping for stop "types".
// Single source of truth for:
// - Which Lucide icon represents which StopType
// - Ensures consistency across Stops tab and (optionally) Settings
// - glyph mapping only; color comes from catalog/pinStyles via callers
//
// NOTE: We only render the glyph here. The colored chip background is handled
// by <IconChip>, which receives bgColor separately.
//
// NOTE: There are a few more icons in components/icon.ts currently they are
// only used on the home page and to display the tabs themselves at the bottom
// of the app.

import {
  Bed,
  //  Dog,
  Fuel,
  MapPin,
  PawPrint,
  Scale,
  ShoppingCart,
  Star,
  Toilet,
  Trees,
  Utensils,
  Wrench,
} from "lucide-react-native";
import React from "react";
import { StopType } from "./types";

type Props = {
  type?: StopType; // can be undefined
  size: number;
  color: string;
};

export function StopTypeGlyph({ type, size, color }: Props) {
  switch (type) {
    case "service":
      return <Wrench size={size} color={color} />;
    case "gas":
    case "propane":
      return <Fuel size={size} color={color} />;
    case "grocery":
      return <ShoppingCart size={size} color={color} />;
    case "food":
      return <Utensils size={size} color={color} />;
    case "dogpark":
      return <PawPrint size={size} color={color} />;
    case "weigh":
      return <Scale size={size} color={color} />;
    case "park":
      return <Trees size={size} color={color} />;
    case "rest":
      return <Bed size={size} color={color} />;
    case "dump":
      return <Toilet size={size} color={color} />;
    case "attraction":
      return <Star size={size} color={color} />;
    default:
      return <MapPin size={size} color={color} />;
  }
}
