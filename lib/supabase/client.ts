import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

// Server-side client that bypasses RLS using service role
// export const supabase = createClient(supabaseUrl, supabaseKey);

// Create a singleton instance of the Supabase client
let supabaseClient: ReturnType<typeof createServerClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
        remove() {},
      },
    });
  }
  return supabaseClient;
}
