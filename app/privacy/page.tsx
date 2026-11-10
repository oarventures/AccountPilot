import MemberShell from "../components/member-shell";
export default function Privacy() {
  return (
    <MemberShell>
      <section className="card form-card">
        <h1>Your workspace and confidentiality</h1>
        <h2>Separate by user</h2>
        <p>
          Member data is requested under your verified identity. Database
          row-level policies restrict access to the workspace belonging to that
          identity, and require an active paid membership. There is no sharing
          feature.
        </p>
        <h2>What memory means here</h2>
        <p>
          Your saved solution profile, account plans, files, evidence, and
          journal provide continuity across sessions. No AI model is trained on
          these materials, and there are no live AI calls or shared research
          collections.
        </p>
        <h2>Who operates the infrastructure</h2>
        <p>
          Configured authentication and database storage use Supabase. Billing
          uses Stripe; workspace content is not passed to Stripe. The app
          operator and authorized infrastructure administrators may have
          privileged access. Encryption and provider security settings must be
          verified before launch. This is not end-to-end encryption and absolute
          confidentiality cannot be guaranteed.
        </p>
        <h2>Your browser</h2>
        <p>
          The member workspace does not persist account content in browser
          localStorage. It keeps the open workspace in temporary page memory.
          Session cookies identify your account. Sign out before another person
          uses your browser. The optional local fictional demo uses separate
          browser storage and has no user isolation.
        </p>
        <h2>Deletion and retention</h2>
        <p>
          The member workspace offers deletion of its stored workspace. This
          does not cancel billing or delete your authentication account.
          Database backups and provider retention may keep prior versions
          temporarily. Account deletion and retention terms need an operator
          process before launch. If membership lapses, request data access or
          deletion from the operator; retention and billing terms must be
          finalized before accepting customers.
        </p>
        <h2>Current release boundary</h2>
        <p>
          Use synthetic information during setup and testing. Hosted
          authentication, payment, database policies, operational controls, and
          independent security review must be validated before real confidential
          account information is entered.
        </p>
      </section>
    </MemberShell>
  );
}
