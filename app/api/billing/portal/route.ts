import {
  identity,
  sameOrigin,
  json,
  apiError,
  AccessError,
} from "@/lib/server/access";
import { appUrl } from "@/lib/server/config";
import { stripeClient } from "@/lib/server/stripe";
export async function POST(request: Request) {
  try {
    const { client, user } = await identity();
    sameOrigin(request);
    const { data, error } = await client
      .from("memberships")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data?.stripe_customer_id)
      throw new AccessError(403, "No billing account is available.");
    const session = await stripeClient().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: appUrl() + "/membership",
    });
    return json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}
