import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("THIEU_SUPABASE_ENV");
  process.exit(1);
}

const client = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { data, error } = await client
  .from("roles")
  .select("name")
  .order("name", { ascending: true });

if (error) {
  console.error("SUPABASE_FAIL", error.message);
  process.exit(1);
}

console.log("SUPABASE_OK");
console.log("ROLES:", (data ?? []).map((x) => x.name).join(","));

