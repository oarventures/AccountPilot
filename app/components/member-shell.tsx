import Link from "next/link";
export default function MemberShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="member-shell">
      <header>
        <Link className="brand" href="/">
          ↗ AccountPilot.
        </Link>
        <nav aria-label="Membership navigation">
          <Link href="/membership">Membership</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <span>Account-specific judgment. Your own workspace.</span>
        <Link href="/privacy">Data and confidentiality</Link>
      </footer>
    </div>
  );
}
