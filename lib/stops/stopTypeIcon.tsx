import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StopType } from "./types";

type Props = {
  type?: StopType;
  size: number;
  color: string;
};

export function StopTypeGlyph({ type, size, color }: Props) {
  const iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"] =
    (() => {
      switch (type) {
        case "gas":
          return "gas-station";
        case "grocery":
          return "cart";
        case "food":
          return "silverware-fork-knife";
        case "coffee":
          return "coffee";
        case "bar":
          return "glass-cocktail";
        case "dogpark":
          return "paw";
        case "park":
          return "tree";
        case "rest":
          return "bed";
        case "attraction":
          return "star";
        default:
          return "map-marker";
      }
    })();

  return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
}
