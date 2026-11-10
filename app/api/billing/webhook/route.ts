import type Stripe from "stripe";
import { stripeClient } from "@/lib/server/stripe";
import { billingAdmin } from "@/lib/server/admin";
import { json, readRawText } from "@/lib/server/access";
export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    return json({ error: "Webhook is not configured." }, 503);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing signature." }, 400);
  let event: Stripe.Event;
  let stripe: ReturnType<typeof stripeClient>;
  try {
    stripe = stripeClient();
    const raw = await readRawText(request, 500000);
    if (raw.length > 500000) return json({ error: "Event too large." }, 413);
    event = stripe.webhooks.constructEvent(
      raw,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return json({ error: "Invalid webhook signature or configuration." }, 400);
  }
  try {
    let subscriptionId: string | undefined;
    if (event.type.startsWith("customer.subscription."))
      subscriptionId = (event.data.object as Stripe.Subscription).id;
    else if (
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      const invoice = event.data.object as Stripe.Invoice;
      const reference = invoice.parent?.subscription_details?.subscription;
      subscriptionId =
        typeof reference === "string" ? reference : reference?.id;
    }
    if (!subscriptionId) return json({ received: true });
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice"],
    });
    const userId = subscription.metadata.accountpilot_user_id;
    if (
      !userId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      )
    )
      return json({ received: true });
    const item = subscription.items.data.find(
      (i) => i.price.id === process.env.STRIPE_PRICE_ID,
    );
    const invoice = subscription.latest_invoice;
    const paid =
      subscription.status === "active" &&
      !!item &&
      !!invoice &&
      typeof invoice !== "string" &&
      invoice.status === "paid" &&
      invoice.amount_paid > 0;
    const customer =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const { error } = await billingAdmin().rpc("apply_subscription_event", {
      p_event_id: event.id,
      p_user_id: userId,
      p_customer_id: customer,
      p_subscription_id: subscription.id,
      p_status: paid ? "active" : "inactive",
      p_access_until: paid
        ? new Date(item!.current_period_end * 1000).toISOString()
        : null,
      p_subscription_created: subscription.created,
      p_event_created: event.created,
    });
    if (error) throw error;
    return json({ received: true });
  } catch {
    return json(
      { error: "Billing update could not be applied. Retry required." },
      503,
    );
  }
}
