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
        onChangeText=
