// tools/config.ts
// Env-based config for CLI scripts (import-from-api, etc.).
// Load with: npx ts-node -r dotenv/config tools/import-from-api.ts

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

export const TOOLS_CONFIG = {
  supabaseUrl: requireEnv("EXPO_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
};
