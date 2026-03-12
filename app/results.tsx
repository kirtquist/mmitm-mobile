import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { MMITM_SESSION_KEY, type MmitmSession } from "../lib/map/mmitmSession";

type Place = {
  id: string;
  name: string;
  distance: string;
  rating: number;
};

const MOCK_PLACES: Place[] = [
  { id: "1", name: "River Cafe", distance: "1.2 mi", rating: 4.5 },
  { id: "2", name: "Midway Pub", distance: "0.8 mi", rating: 4.2 },
  { id: "3", name: "Central Park", distance: "1.5 mi", rating: 4.7 },
];

export default function ResultsScreen() {
  const router = useRouter();
  const [session, setSession] = useState<MmitmSession | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      AsyncStorage.getItem(MMITM_SESSION_KEY).then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            setSession(JSON.parse(raw) as MmitmSession);
          } catch {
            setSession(null);
          }
        } else {
          setSession(null);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        {session ? (
          <>
            <Text style={styles.centerLabel}>
              Center: {session.center.lat.toFixed(4)}, {session.center.lon.toFixed(4)}
            </Text>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => router.push("/map")}
            >
              <Text style={styles.mapButtonText}>View on Map</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text>🗺 Map Placeholder</Text>
        )}
      </View>

      <FlatList
        data={MOCK_PLACES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/place/${item.id}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text>{item.distance}</Text>
            <Text>⭐ {item.rating}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  centerLabel: { fontSize: 14 },
  mapButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  mapButtonText: { color: "#fff", fontWeight: "600" },
  card: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  name: { fontSize: 18, fontWeight: "500" },
});
