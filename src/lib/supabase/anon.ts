import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/supabase/public-env";

export function createSupabaseAnonClient() {
  const env = getPublicEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

