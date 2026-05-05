import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useAuthContext } from "../hooks/use-auth-context";

void SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
  const { isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}
