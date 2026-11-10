import "server-only";
import Stripe from "stripe";
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");
  if (
    !key.startsWith("sk_test_") &&
    !(
      key.startsWith("sk_live_") &&
      process.env.ACCOUNTPILOT_ALLOW_LIVE_PAYMENTS === "true"
    )
  )
    throw new Error("Live payments have not been enabled.");
  return new Stripe(key, { maxNetworkRetries: 2 });
}
