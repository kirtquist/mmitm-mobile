import * as Linking from "expo-linking";

export function getAuthRedirectUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/redirect`;
  }

  const configuredBase = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configuredBase) {
    return `${configuredBase}/redirect`;
  }

  return Linking.createURL("/redirect");
}
