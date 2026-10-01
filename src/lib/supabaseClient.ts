import { createClient } from "@supabase/supabase-js";

const env = import.meta.env;
const supabaseUrl = env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your project's values.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
