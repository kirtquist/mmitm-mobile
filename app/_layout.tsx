// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';

// import { useColorScheme } from '@/hooks/use-color-scheme';

// export const unstable_settings = {
//   anchor: '(tabs)',
// };

// export default function RootLayout() {
//   const colorScheme = useColorScheme();

//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <Stack>
//         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//         <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
//       </Stack>
//       <StatusBar style="auto" />
//     </ThemeProvider>
//   );
// }
import { Stack } from "expo-router";

import { HeaderMenuButton } from "../components/HeaderMenuButton";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerRight: () => <HeaderMenuButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Meet Me in the Middle" }} />
      <Stack.Screen name="results" options={{ title: "Suggestions" }} />
      <Stack.Screen name="map" options={{ title: "Map" }} />
      <Stack.Screen name="place/[id]" options={{ title: "Details" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="catalog" options={{ title: "Catalog" }} />
    </Stack>
  );
}