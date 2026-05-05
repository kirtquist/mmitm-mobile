import type { AuthError } from "@supabase/supabase-js";
import { getAuthRedirectUrl } from "./auth-redirect-url";
import { supabase } from "./supabase";

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signUpWithEmail(email: string, password: string) {
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(redirectTo && { emailRedirectTo: redirectTo }),
    },
  });

  return { error, session: data.session };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPasswordForEmail(email: string) {
  const redirectTo = getAuthRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || undefined,
  });
  return { error };
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

export function getAuthErrorMessage(error: AuthError | null): string {
  if (!error) return "";

  switch (error.message) {
    case "Invalid login credentials":
      return "Invalid email or password.";
    case "Email not confirmed":
      return "Please check your email to confirm your account.";
    case "User already registered":
      return "An account with this email already exists.";
    case "Password should be at least 6 characters":
      return "Password must be at least 6 characters.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}
