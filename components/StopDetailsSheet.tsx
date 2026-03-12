// components/StopDetailsSheet.tsx
//
// Bottom sheet showing details for the currently selected stop.
//
// Goals:
// - Fully theme-driven neutrals via getAppTheme()
// - Consistent spacing + typography via SPACING and FONT_SIZES
// - Keep favorites toggle (Supabase user_stop_favorites)
// - Keep Wi-Fi / Pets amenity chips
// - Show a small type-color dot next to stop name for visual consistency
// - Keep file lightweight (no extra libraries)

import React, { useEffect, useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";

import { getAppTheme } from "../constants/theme";
import { SPACING } from "../lib/ui/spacing";
import { FONT_SIZES } from "../lib/ui/typography";

import { Stop } from "../lib/stops/types";
import { formatTypes, getPinColor } from "../lib/stops/utils";

import { supabase } from "../lib/supabase";
import { addFavorite, isFavorite, removeFavorite } from "../lib/supabase/favorites";

import { DOT_SIZES } from "../lib/ui/dotSizes";
import { ColoredDot } from "./ColoredDot";

type Props = {
  stop: Stop | null;
  onClose: () => void;
};

export default function StopDetailsSheet({ stop, onClose }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = getAppTheme(isDark);

  // Favorites state (per-user)
  const [favorite, setFavorite] = useState(false);

  // Load favorite status whenever stop changes
  useEffect(() => {
    async function loadFav() {
      if (!stop) return;

      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        setFavorite(false);
        return;
      }

      try {
        const fav = await isFavorite(user.id, stop.id);
        setFavorite(fav);
      } catch (e) {
        console.warn("Failed to load favorite state", e);
      }
    }

    loadFav();
  }, [stop]);

  // If no stop selected, render nothing
  if (!stop) return null;

  // Type color for dot / accents
  const typeColor = getPinColor(stop);

  // Drag handle uses border token (neutral)
  const handleColor = theme.border;

  // Amenity chip palette:
  // These are semantic accent colors (not neutral surfaces).
  // We keep them as-is because they represent features, not theme background.
  const AMENITY = {
    wifi: { label: "Wi-Fi", fg: "#3498db", bg: "rgba(52,152,219,0.15)" },
    pets: { label: "Pet Friendly", fg: "#2ecc71", bg: "rgba(46,204,113,0.15)" },
  } as const;

  // Small chip component (amenities)
  const AmenityChip = ({ label, fg, bg }: { label: string; fg: string; bg: string }) => (
    <View
      style={{
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: SPACING.xs + 1,
        borderRadius: SPACING.borderRadius,
        backgroundColor: bg,
        marginRight: SPACING.sm,
        marginBottom: SPACING.xs,
      }}
    >
      <Text style={{ color: fg, fontSize: FONT_SIZES.xs, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,

        padding: SPACING.lg,
        paddingBottom: SPACING.xl,

        borderTopLeftRadius: SPACING.cardRadius,
        borderTopRightRadius: SPACING.cardRadius,

        backgroundColor: theme.cardBg,

        // Shadow is an overlay effect; acceptable as literal
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -4 },
      }}
    >
      {/* Drag handle (tap-to-dismiss)
          UX rationale:
          - iOS and Android bottom sheets commonly dismiss via swipe-down and/or tapping the handle.
          - Since this sheet is a lightweight absolute overlay (not a gesture-driven sheet),
            we make the handle itself a direct dismiss affordance to match user expectations
            and remove the need for a redundant in-sheet "Close" button. */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close stop details"
        hitSlop={SPACING.lg}
        style={{ alignSelf: "center", marginBottom: SPACING.sm }}
      >
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: handleColor,
          }}
        />
      </Pressable>

      {/* Title row: dot + name */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: SPACING.sm,
        }}
      >
        <ColoredDot color={typeColor} size={DOT_SIZES.md} />
        <Text
          style={{
            color: theme.text,
            fontSize: FONT_SIZES.lg,
            fontWeight: "600",
          }}
        >
          {stop.name}
        </Text>
      </View>

      {/* Type line */}
      <Text
        style={{
          color: theme.subtext,
          fontSize: FONT_SIZES.sm,
          marginBottom: SPACING.sm,
        }}
      >
        {formatTypes(stop.types, stop.unknownTypes)}
      </Text>

      {/* Amenity chips */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: SPACING.sm }}>
        {stop.hasWifi && (
          <AmenityChip label={AMENITY.wifi.label} fg={AMENITY.wifi.fg} bg={AMENITY.wifi.bg} />
        )}
        {stop.petFriendly && (
          <AmenityChip label={AMENITY.pets.label} fg={AMENITY.pets.fg} bg={AMENITY.pets.bg} />
        )}
      </View>

      {/* Lat/Lon */}
      <Text
        style={{
          color: theme.subtext,
          fontSize: FONT_SIZES.xs,
          marginBottom: SPACING.md,
        }}
      >
        Lat: {stop.lat.toFixed(4)} · Lon: {stop.lon.toFixed(4)}
      </Text>

      {/* Favorite button (theme-correct neutrals) */}
      <Pressable
        onPress={async () => {
          const { data } = await supabase.auth.getUser();
          const user = data?.user;
          if (!user) return alert("Login required for favorites");

          try {
            if (favorite) {
              await removeFavorite(user.id, stop.id);
              setFavorite(false);
            } else {
              await addFavorite(user.id, stop.id);
              setFavorite(true);
            }
          } catch (e) {
            console.warn("Favorite toggle failed", e);
          }
        }}
        style={{
          marginBottom: SPACING.lg,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
          borderRadius: SPACING.borderRadius,

          // Use theme neutral for non-favorited state
          backgroundColor: favorite ? "#ffd70055" : theme.neutralBg,
        }}
      >
        <Text style={{ fontSize: FONT_SIZES.md, color: theme.text }}>
          {favorite ? "★ Favorited" : "☆ Add to Favorites"}
        </Text>
      </Pressable>
    </View>
  );
}
