import "server-only";
import { createClient } from "@supabase/supabase-js";
import { authConfig } from "./config";
/** Billing webhooks only. Never use this client to serve workspace data. */
export function billingAdmin() {
  const { url } = authConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Billing database configuration missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
