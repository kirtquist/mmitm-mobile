// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

console.log("SUPABASE_INIT: URL:", SUPABASE_URL);
console.log("SUPABASE_INIT: KEY:", SUPABASE_ANON_KEY ? "Present" : "MISSING");

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
