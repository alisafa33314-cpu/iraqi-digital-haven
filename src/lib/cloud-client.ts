import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const CLOUD_URL = "https://maeniuozqrionnhmssli.supabase.co";
const CLOUD_PUBLISHABLE_KEY = "sb_publishable_A-6Q--ON6buJy4QrkIHIYA_j_e3JxNO";

function cloudFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(
    typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
  );

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }

  if (headers.get("Authorization") === `Bearer ${CLOUD_PUBLISHABLE_KEY}`) {
    headers.delete("Authorization");
  }
  headers.set("apikey", CLOUD_PUBLISHABLE_KEY);

  return fetch(input, { ...init, headers });
}

export const cloud = createClient<Database>(CLOUD_URL, CLOUD_PUBLISHABLE_KEY, {
  global: { fetch: cloudFetch },
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});