import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface AuthData {
  session: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

export const AuthContext = createContext<AuthData>({
  session: null,
  isLoading: true,
  isLoggedIn: false,
});

export const useAuthContext = () => useContext(AuthContext);
