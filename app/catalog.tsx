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
import { loadAllowedTypes, saveAllowedTypes } from "../utils/catalogStorage";

export default function CatalogScreen() {
  const colorScheme = useColorScheme();
  const theme = getAppTheme(colorScheme === "dark");
  const [loading, setLoading] = useState(true);
  const [allowedSet, setAllowedSet] = useState<Set<StopType>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const allowed = await loadAllowedTypes();
      if (!allowed || allowed.length === 0) {
        setAllowedSet(new Set(STOP_TYPE_ORDER));
      } else {
        setAllowedSet(new Set(allowed));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (type: StopType, enabled: boolean) => {
    const next = new Set(allowedSet);
    if (enabled) {
      next.add(type);
    } else {
      next.delete(type);
    }
    setAllowedSet(next);
    const arr = Array.from(next) as StopType[];
    await saveAllowedTypes(arr.length === 0 ? (STOP_TYPE_ORDER as unknown as StopType[]) : arr);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.screenBg }]}>
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: theme.subtext }]}>
          Loading catalog…
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
        Choose which POI types are available for users in Settings. When all are enabled, users see the full catalog.
      </Text>
      {STOP_TYPE_ORDER.map((type) => (
        <View
          key={type}
          style={[styles.row, { borderBottomColor: theme.border }]}
        >
          <Text style={[styles.label, { color: theme.text }]}>
            {STOP_TYPE_META[type].label}
          </Text>
          <Switch
            value={allowedSet.has(type)}
            onValueChange={(v) => handleToggle(type, v)}
            trackColor={{ false: theme.border, true: theme.accent }}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 14 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16 },
});
