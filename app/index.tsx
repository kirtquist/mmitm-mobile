import { useState } from "react";
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

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

  const addMember = () => {
    if (!name || !address) return;
    setMembers([...members, { id: Date.now().toString(), name, address }]);
    setName("");
    setAddress("");
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
          <Text style={styles.memberItem}>
            {item.name} — {item.address}
          </Text>
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

      <Button
        title="Find Midpoint"
        onPress={() => router.push("/results")}
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
  memberItem: { marginVertical: 4 },
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
});
