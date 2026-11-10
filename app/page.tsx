import Link from "next/link";
import MemberShell from "./components/member-shell";
import { authConfigured, billingConfigured } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export default function Home() {
  const configured = authConfigured() && billingConfigured();
  const demo =
    process.env.NODE_ENV !== "production" &&
    process.env.ACCOUNTPILOT_ENABLE_LOCAL_DEMO === "true";
  return (
    <MemberShell>
      <section className="membership-hero">
        <div className="eyebrow">ACCOUNT STRATEGY · PRIVATE MEMBERSHIP</div>
        <h1>Turn account context into your next best decision.</h1>
        <p>
          Your solution knowledge, account research, relationships, and founder
          judgment—in a workspace assigned to your signed-in account.
        </p>
        <div className="hero-actions">
          <Link className="primary" href="/app">
            Enter member workspace
          </Link>
          <Link className="text-button" href="/membership">
            View membership
          </Link>
        </div>
      </section>
      <div className="member-features">
        <article className="card form-card">
          <h2>Context that stays with you</h2>
          <p>
            Save your solution, target accounts, research, and decisions. Your
            next session resumes from your saved workspace.
          </p>
        </article>
        <article className="card form-card">
          <h2>Paid access enforced by the server</h2>
          <p>
            Signing in alone does not unlock the workspace. Access requires a
            verified, unexpired subscription.
          </p>
        </article>
        <article className="card form-card">
          <h2>Separate user workspaces</h2>
          <p>
            Database access rules restrict each user to their own data. No
            cross-user sharing or live AI processing is implemented.
          </p>
        </article>
      </div>
      {!configured && (
        <div className="notice" role="status">
          Membership and billing are not activated. No payment can be collected
          and no private member workspace can be opened until setup is complete.
        </div>
      )}
      {demo && (
        <p>
          <Link className="text-button" href="/demo">
            Open local fictional demo (development only)
          </Link>
        </p>
      )}
      <p className="muted">
        This implementation requires provider setup and security validation
        before real confidential information is entered. It does not promise
        absolute confidentiality.
      </p>
    </MemberShell>
  );
}
