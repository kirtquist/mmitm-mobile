import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from "react-native";
import { getAppTheme } from "../../constants/theme";
import { useAuthContext } from "../../hooks/use-auth-context";
import { authHref, href } from "../../lib/router";

function getIsRecoveryFromUrl(): boolean {
  if (typeof window !== "undefined" && window.location?.hash) {
    return window.location.hash.includes("type=recovery");
  }

  return false;
}

export default function AuthRedirectScreen() {
  const colorScheme = useColorScheme();
  const theme = getAppTheme(colorScheme === "dark");
  const { isLoggedIn, isLoading } = useAuthContext();
  const isRecoveryRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (isRecoveryRef.current === null) {
      isRecoveryRef.current = getIsRecoveryFromUrl();
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (isLoggedIn && isRecoveryRef.current) {
      router.replace(authHref("reset-password"));
      return;
    }

    if (isLoggedIn) {
      router.replace(href("/settings"));
      return;
    }

    router.replace(authHref("login"));
  }, [isLoading, isLoggedIn]);

  return (
    <View style={[styles.container, { backgroundColor: theme.screenBg }]}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={[styles.text, { color: theme.subtext }]}>
        Completing sign in...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  text: { fontSize: 16 },
});
