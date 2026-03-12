import { supabase } from "../supabase";

export async function isFavorite(userId: string, stopId: string) {
  const { data } = await supabase
    .from("user_stop_favorites")
    .select("*")
    .eq("user_id", userId)
    .eq("stop_id", stopId)
    .maybeSingle();

  return !!data;
}

export async function addFavorite(userId: string, stopId: string) {
  await supabase.from("user_stop_favorites")
    .insert({ user_id: userId, stop_id: stopId });
}

export async function removeFavorite(userId: string, stopId: string) {
  await supabase.from("user_stop_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("stop_id", stopId);
}
