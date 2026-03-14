import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { getAppTheme } from "../constants/theme";
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
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SettingsFilters | null>(null);
  const [allowedTypes, setAllowedTypes] = useState<StopType[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, allowed] = await Promise.all([
        loadSettingsFilters(),
        loadAllowedTypes(),
      ]);
      setFilters(f);
      setAllowedTypes(allowed);
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16 },
});
