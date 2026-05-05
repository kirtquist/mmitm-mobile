import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { getAppTheme } from "../constants/theme";
import { useAuthContext } from "../hooks/use-auth-context";
import { signOut } from "../lib/auth";
import { authHref } from "../lib/router";
import {
  MAX_MMITM_RADIUS_MILES,
  normalizeMmitmRadiusMiles,
} from "../lib/map/mmitmSession";
import { STOP_TYPE_META, STOP_TYPE_ORDER } from "../lib/stops/catalog";
import type { StopType } from "../lib/stops/types";
import {
  loadSettingsFilters,
  saveSettingsFilters,
  STOP_TYPE_TO_FILTER_KEY,
  type SettingsFilters,
} from "../utils/settingsStorage";
import { loadAllowedTypes } from "../utils/catalogStorage";

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = getAppTheme(colorScheme === "dark");
  const { session } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SettingsFilters | null>(null);
  const [allowedTypes, setAllowedTypes] = useState<StopType[] | null>(null);
  const [radiusDraft, setRadiusDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, allowed] = await Promise.all([
        loadSettingsFilters(),
        loadAllowedTypes(),
      ]);
      setFilters(f);
      setAllowedTypes(allowed);
      setRadiusDraft(String(f.mmitmRadiusMiles));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const typesToShow: StopType[] = allowedTypes && allowedTypes.length > 0
    ? STOP_TYPE_ORDER.filter((t) => allowedTypes.includes(t))
    : (STOP_TYPE_ORDER as unknown as StopType[]);

  const handleToggle = async (type: StopType, value: boolean) => {
    if (!filters) return;
    const key = STOP_TYPE_TO_FILTER_KEY[type];
    const next = { ...filters, [key]: value };
    setFilters(next);
    await saveSettingsFilters(next);
  };

  const handleRadiusSave = async () => {
    if (!filters) return;
    const mmitmRadiusMiles = normalizeMmitmRadiusMiles(radiusDraft);
    const next = { ...filters, mmitmRadiusMiles };
    setFilters(next);
    setRadiusDraft(String(mmitmRadiusMiles));
    await saveSettingsFilters(next);
  };

  if (loading || !filters) {
    return (
      <View style={[styles.center, { backgroundColor: theme.screenBg }]}>
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: theme.subtext }]}>
          Loading settings…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.screenBg }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.section, { borderTopColor: theme.border, marginTop: 0, paddingTop: 0 }]}>
        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>
          Account
        </Text>
        {session?.user?.email ? (
          <>
            <Text style={[styles.accountText, { color: theme.text }]}>
              Signed in as {session.user.email}
            </Text>
            <Pressable
              onPress={async () => {
                const { error } = await signOut();
                if (error) {
                  console.warn("Sign out failed", error.message);
                }
              }}
              style={[styles.authButton, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.authButtonText, { color: theme.iconOnColor }]}>
                Sign Out
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.authButtonRow}>
            <Pressable
              onPress={() =>
                router.push(authHref("login", { next: "/settings" }))
              }
              style={[styles.authButton, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.authButtonText, { color: theme.iconOnColor }]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push(authHref("signup", { next: "/settings" }))
              }
              style={[styles.authButton, { backgroundColor: theme.neutralBg }]}
            >
              <Text style={[styles.authButtonText, { color: theme.text }]}>
                Create Account
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      <Text style={[styles.subtitle, { color: theme.subtext }]}>
        Choose which POI types to show on the map.
      </Text>
      {typesToShow.map((type) => {
        const key = STOP_TYPE_TO_FILTER_KEY[type];
        const value = filters[key] as boolean;
        return (
          <View
            key={type}
            style={[styles.row, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.label, { color: theme.text }]}>
              {STOP_TYPE_META[type].label}
            </Text>
            <Switch
              value={value}
              onValueChange={(v) => handleToggle(type, v)}
              trackColor={{ false: theme.border, true: theme.accent }}
            />
          </View>
        );
      })}
      <View style={[styles.section, { borderTopColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>
          Other filters
        </Text>
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.radiusCopy}>
            <Text style={[styles.label, { color: theme.text }]}>
              MMITM start radius (mi)
            </Text>
            <Text style={[styles.helperText, { color: theme.subtext }]}>
              Expands to 10, 20, then {MAX_MMITM_RADIUS_MILES} miles if no venues
              are found.
            </Text>
          </View>
          <TextInput
            value={radiusDraft}
            onChangeText={setRadiusDraft}
            onBlur={() => {
              void handleRadiusSave();
            }}
            onSubmitEditing={() => {
              void handleRadiusSave();
            }}
            keyboardType="number-pad"
            maxLength={2}
            style={[
              styles.radiusInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.cardBg,
              },
            ]}
            placeholder="5"
            placeholderTextColor={theme.placeholder}
          />
        </View>
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.text }]}>Wifi required</Text>
          <Switch
            value={filters.wifiRequired}
            onValueChange={(v) => {
              const next = { ...filters, wifiRequired: v };
              setFilters(next);
              saveSettingsFilters(next);
            }}
            trackColor={{ false: theme.border, true: theme.accent }}
          />
        </View>
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.text }]}>Pets only</Text>
          <Switch
            value={filters.petsOnly}
            onValueChange={(v) => {
              const next = { ...filters, petsOnly: v };
              setFilters(next);
              saveSettingsFilters(next);
            }}
            trackColor={{ false: theme.border, true: theme.accent }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 14 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  section: { marginTop: 24, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  accountText: { fontSize: 14, marginBottom: 12 },
  authButtonRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  authButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  authButtonText: { fontSize: 14, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16 },
  radiusCopy: { flex: 1, paddingRight: 12 },
  helperText: { fontSize: 12, marginTop: 4 },
  radiusInput: {
    minWidth: 64,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: "center",
  },
});
