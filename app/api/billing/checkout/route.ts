import {
  identity,
  sameOrigin,
  json,
  apiError,
  AccessError,
} from "@/lib/server/access";
import { billingConfigured, appUrl } from "@/lib/server/config";
import { stripeClient } from "@/lib/server/stripe";
import { hasPaidAccess } from "@/lib/membership-policy";
export async function POST(request: Request) {
  try {
    const { client, user } = await identity();
    sameOrigin(request);
    if (!billingConfigured())
      throw new AccessError(503, "Billing setup is not complete.");
    const { data, error } = await client
      .from("memberships")
      .select("status,access_until,stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new AccessError(503, "Membership could not be checked.");
    if (hasPaidAccess(data))
      throw new AccessError(409, "Your membership is already active.");
    const stripe = stripeClient();
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!);
    if (
      !price.active ||
      !price.recurring ||
      !price.unit_amount ||
      price.unit_amount <= 0
    )
      throw new AccessError(503, "A paid recurring price must be configured.");
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: price.id, quantity: 1 }],
        client_reference_id: user.id,
        subscription_data: { metadata: { accountpilot_user_id: user.id } },
        ...(data?.stripe_customer_id
          ? { customer: data.stripe_customer_id }
          : { customer_email: user.email }),
        success_url: appUrl() + "/membership?checkout=returned",
        cancel_url: appUrl() + "/membership",
        allow_promotion_codes: false,
      },
      {
        idempotencyKey: `accountpilot-checkout-${user.id}-${Math.floor(Date.now() / 300000)}`,
      },
    );
    if (!session.url)
      throw new AccessError(503, "Checkout could not be opened.");
    return json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}
