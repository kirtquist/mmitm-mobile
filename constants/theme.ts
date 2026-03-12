// constants/theme.ts
// Single source of truth for app theming.
// - Keeps a Colors export for legacy usage.
// - Adds getAppTheme(isDark) for semantic colors used by screens.
// - Device mode is chosen via useColorScheme() in components.

export const tintColorLight = "#0a7ea4";
export const tintColorDark = "#ffffff";

// Legacy-style color map (common in Expo templates).
export const Colors = {
  light: {
    text: "#11181C",
    background: "#ffffff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
} as const;

// Semantic theme used across the app UI.
// This is the API we will use in Stops / Settings / Map / Home.
// Avoid hard-coded neutrals elsewhere (white/gray borders/etc).
export type AppTheme = {
  isDark: boolean;

  // Screen backgrounds (iOS grouped-list style)
  screenBg: string;
  cardBg: string;

  // Text
  text: string;
  subtext: string;

  // Borders / separators
  border: string;

  // Inputs
  inputBg: string;
  inputBorder: string;
  placeholder: string;

  // Sticky headers (must be opaque)
  stickyHeaderBg: string;
  stickyHeaderText: string;

  // Neutral chip/button background (not accent buttons)
  neutralBg: string;

  // Accent (keep one accent; currently iOS blue is fine for links)
  accent: string;

  // high-contrast glyph color
  iconOnColor: string;
};

export function getAppTheme(isDark: boolean): AppTheme {
  // These values are deliberately aligned with iOS grouped UI patterns:
  // - Light grouped background: #f2f2f7
  // - Dark grouped background: near-black + dark cards
  if (!isDark) {
    return {
      isDark: false,
      screenBg: "#f2f2f7",
      cardBg: "#ffffff",
      text: "#000000",
      subtext: "#6d6d72",
      border: "#e5e5ea",
      inputBg: "#ffffff",
      inputBorder: "#d1d5db",
      placeholder: "#6d6d72",
      stickyHeaderBg: "#f2f2f7",
      stickyHeaderText: "#6d6d72",
      neutralBg: "#eeeeee",
      accent: "#007AFF",            // blue-ish
      iconOnColor: "#ffffff",
    };
  }

  return {
    isDark: true,
    screenBg: "#000000",
    cardBg: "#1c1c1e",
    text: "#ffffff",
    subtext: "#9a9a9e",
    border: "#2c2c2e",
    inputBg: "#1c1c1e",
    inputBorder: "#2c2c2e",
    placeholder: "#9a9a9e",
    stickyHeaderBg: "#000000",
    stickyHeaderText: "#9a9a9e",
    neutralBg: "#2c2c2e",
    accent: "#0A84FF",              // iOS dark mode link blue
    iconOnColor: "#ffffff",
  };
}
