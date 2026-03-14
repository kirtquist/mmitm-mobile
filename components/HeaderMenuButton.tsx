import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getAppTheme } from "../constants/theme";
import { MMITM_SESSION_KEY } from "../lib/map/mmitmSession";

type MenuItem = {
  label: string;
  route: string;
  onPress?: () => void;
};

export function HeaderMenuButton() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const colorScheme = useColorScheme();
  const theme = getAppTheme(colorScheme === "dark");

  const handleCatalog = () => {
    setVisible(false);
    router.push("/catalog");
  };

  const handleSettings = () => {
    setVisible(false);
    router.push("/settings");
  };

  const handleLogout = async () => {
    setVisible(false);
    await AsyncStorage.removeItem(MMITM_SESSION_KEY);
    router.replace("/");
  };

  const menuItems: MenuItem[] = [
    { label: "Catalog", route: "/catalog", onPress: handleCatalog },
    { label: "Settings", route: "/settings", onPress: handleSettings },
    { label: "Logout", route: "/", onPress: handleLogout },
  ];

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.iconButtonPressed,
        ]}
        accessibilityLabel="Open menu"
        accessibilityRole="button"
      >
        <Ionicons
          name="menu"
          size={24}
          color={colorScheme === "dark" ? "#fff" : "#000"}
        />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={[styles.menuCard, { backgroundColor: theme.cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            {menuItems.map((item) => (
              <Pressable
                key={item.route}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: theme.border },
                ]}
              >
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    marginRight: 8,
    padding: 8,
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16,
  },
  menuCard: {
    minWidth: 160,
    borderRadius: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
});
