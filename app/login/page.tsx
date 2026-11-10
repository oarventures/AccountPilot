import MemberShell from "../components/member-shell";
import { LoginForm } from "../components/member-actions";
import { authConfigured } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export default function Login() {
  const enabled = authConfigured();
  return (
    <MemberShell>
      <section className="card form-card auth-card">
        <div className="eyebrow">YOUR ACCOUNT</div>
        <h1>Sign in to AccountPilot</h1>
        {!enabled && (
          <p role="status" className="notice">
            Sign-in is unavailable until the owner configures authentication. Do
            not enter credentials here yet.
          </p>
        )}
        <LoginForm enabled={enabled} />
      </section>
    </MemberShell>
  );
}
