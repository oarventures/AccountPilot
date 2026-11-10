import "server-only";
export function authConfigured() {
  return (
    process.env.ACCOUNTPILOT_MEMBERSHIP_ENABLED === "true" &&
    !!process.env.SUPABASE_URL &&
    !!process.env.SUPABASE_PUBLISHABLE_KEY &&
    !!process.env.APP_URL
  );
}
export function appUrl() {
  const raw = process.env.APP_URL;
  if (!raw) throw new Error("Membership configuration is missing.");
  const url = new URL(raw);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("APP_URL requires HTTPS outside localhost.");
  return url.origin;
}
export function authConfig() {
  if (!authConfigured()) throw new Error("Membership is not configured.");
  return {
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_PUBLISHABLE_KEY!,
  };
}
export function billingConfigured() {
  return (
    authConfigured() &&
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.STRIPE_PRICE_ID &&
    !!process.env.STRIPE_WEBHOOK_SECRET &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    (process.env.STRIPE_SECRET_KEY!.startsWith("sk_test_") ||
      (process.env.STRIPE_SECRET_KEY!.startsWith("sk_live_") &&
        process.env.ACCOUNTPILOT_ALLOW_LIVE_PAYMENTS === "true"))
  );
}
