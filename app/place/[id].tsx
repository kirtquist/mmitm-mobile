import { View, Text, StyleSheet, Button } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function PlaceDetailsScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Place Details</Text>
      <Text>Place ID: {id}</Text>

      <Text style={styles.section}>Why this place?</Text>
      <Text>
        Close to midpoint and highly rated.
      </Text>

      <Button title="Open in Maps" onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 10 },
  section: { marginTop: 20, fontSize: 18 },
});
