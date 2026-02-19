import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

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

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text>🗺 Map Placeholder</Text>
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
  },
  card: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  name: { fontSize: 18, fontWeight: "500" },
});
