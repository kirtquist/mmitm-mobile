import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { geocodeMembers } from "../lib/api/geocodeNominatim";
import { MMITM_SESSION_KEY } from "../lib/map/mmitmSession";
import { geographicMidpoint } from "../lib/map/midpoint";

type Member = {
  id: string;
  name: string;
  address: string;
  
};

const POI_TYPES = ["Cafe", "Pub", "Restaurant", "Park"];

export default function PartySetupScreen() {
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedType, setSelectedType] = useState<string>("Cafe");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const addMember = () => {
    if (!name || !address) return;
    setMembers([...members, { id: Date.now().toString(), name, address }]);
    setName("");
    setAddress("");
  };

  const removeMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  const runGeocodeAndNavigate = async (destination: "results" | "map") => {
    if (members.length < 2) {
      setGeocodeError("Add at least 2 members to find midpoint.");
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const origins = await geocodeMembers(members);
      if (origins.length < 2) {
        setGeocodeError(
          `Could not geocode enough addresses (${origins.length}/2). Try zip codes or full addresses.`
        );
        return;
      }
      const center = geographicMidpoint(origins);
      if (!center) return;

      const session = {
        origins,
        center,
        radiusMiles: 10,
        poiType: selectedType,
      };
      await AsyncStorage.setItem(MMITM_SESSION_KEY, JSON.stringify(session));
      if (destination === "results") {
        router.push("/results");
      } else {
        router.push("/map");
      }
    } catch (e) {
      setGeocodeError(
        e instanceof Error ? e.message : "Geocoding failed. Try again."
      );
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Party</Text>

      <TextInput
        placeholder="Member Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
        style={styles.input}
      />

      <Button title="Add Member" onPress={addMember} />

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Text style={styles.memberItem}>
              {item.name} — {item.address}
            </Text>
            <TouchableOpacity
              onPress={() => removeMember(item.id)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Text style={styles.subtitle}>POI Type</Text>

      <View style={styles.poiRow}>
        {POI_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.poiChip,
              selectedType === type && styles.poiSelected,
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Text>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {geocodeError && (
        <Text style={styles.errorText}>{geocodeError}</Text>
      )}

      {geocoding && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Finding locations…</Text>
        </View>
      )}

      <Button
        title="Find Midpoint"
        onPress={() => runGeocodeAndNavigate("results")}
        disabled={geocoding}
      />

      <Button
        title="View Map"
        onPress={() => runGeocodeAndNavigate("map")}
        disabled={geocoding}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 12 },
  subtitle: { marginTop: 20, fontSize: 18 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginVertical: 8,
    borderRadius: 6,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  memberItem: { flex: 1 },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  deleteButtonText: { color: "#c00", fontSize: 14 },
  poiRow: { flexDirection: "row", gap: 10, marginVertical: 10 },
  poiChip: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
  },
  poiSelected: {
    backgroundColor: "#ddd",
  },
  errorText: {
    color: "#c00",
    marginTop: 8,
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  loadingText: { fontSize: 14 },
});
