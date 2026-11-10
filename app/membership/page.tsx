import Link from "next/link";
import MemberShell from "../components/member-shell";
import { MemberAction } from "../components/member-actions";
import { authConfigured, billingConfigured } from "@/lib/server/config";
import { identity, AccessError } from "@/lib/server/access";
import { hasPaidAccess, type Membership } from "@/lib/membership-policy";
export const dynamic = "force-dynamic";
export default async function MembershipPage() {
  let signedIn = false;
  let membership: Membership | null = null;
  let checkFailed = false;
  if (authConfigured()) {
    try {
      const { client, user } = await identity();
      signedIn = true;
      const { data, error } = await client
        .from("memberships")
        .select("status,access_until,stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) checkFailed = true;
      else membership = data;
    } catch (error) {
      if (!(error instanceof AccessError && error.status === 401))
        checkFailed = true;
    }
  }
  const active = hasPaidAccess(membership);
  return (
    <MemberShell>
      <section className="card form-card membership-card">
        <div className="eyebrow">MEMBER ACCESS</div>
        <h1>
          {active
            ? "Your membership is active"
            : "A paid membership unlocks your workspace."}
        </h1>
        <p>
          Keep a private workspace for your solution context, accounts, source
          material, and decisions. Subscription price and billing frequency are
          shown in Stripe Checkout before you pay.
        </p>
        {!billingConfigured() && (
          <p className="notice" role="status">
            Billing is not activated. This page cannot collect payments yet.
          </p>
        )}
        {checkFailed && (
          <p role="status">
            Membership could not be verified. Access stays locked until
            verification succeeds.
          </p>
        )}
        {active ? (
          <>
            <p>
              Access verified through{" "}
              {new Date(membership!.access_until!).toLocaleDateString()}.
            </p>
            <Link className="primary" href="/app">
              Open your member workspace
            </Link>
          </>
        ) : signedIn ? (
          <>
            <MemberAction
              endpoint="/api/billing/checkout"
              disabled={!billingConfigured() || checkFailed}
            >
              Continue to secure checkout
            </MemberAction>
            <p className="muted">
              Returning from checkout does not unlock access by itself. Stripe
              must confirm payment to the server. Refresh this page after
              confirmation.
            </p>
            <Link className="text-button" href="/membership">
              Refresh membership status
            </Link>
          </>
        ) : (
          <Link className="primary" href="/login">
            Sign in or create an account
          </Link>
        )}
        {signedIn && (
          <div className="member-controls">
            {membership?.stripe_customer_id && (
              <MemberAction
                endpoint="/api/billing/portal"
                disabled={!billingConfigured()}
              >
                Manage or cancel subscription
              </MemberAction>
            )}
            <MemberAction endpoint="/api/auth/signout">Sign out</MemberAction>
          </div>
        )}
        <p className="muted">
          Test mode is the default. Do not use real payment details with Stripe
          test mode. No workspace content is sent to Stripe; billing uses your
          user ID and billing email.
        </p>
      </section>
    </MemberShell>
  );
}
