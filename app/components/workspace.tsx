"use client";
import { useEffect, useState, useRef } from "react";

import { actionPlan, Demo, Opportunity, rank, seed } from "@/lib/strategy";
import ContextWorkspace from "./context-workspace";
import AccountHub from "./account-hub";
import { identityError, normalizeDomain } from "@/lib/accounts";
import { loadDemo, storeDemo } from "@/lib/demo-storage";
import { validData, emptyMemberWorkspace } from "@/lib/workspace-data";
import { migrateDemo, saveOpportunity } from "@/lib/context";
const freshDemo = () => migrateDemo(seed());

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const empty = (): Opportunity => ({
  id: crypto.randomUUID(),
  company: "",
  value: 0,
  relationship: 0,
  access: 0,
  pain: 0,
  timing: 0,
  effort: 0,
  notes: "",
});
const tabs = [
  "Overview",
  "Accounts & briefs",
  "Opportunities",
  "Solution context",
  "Founder profile",
  "Decision journal",
] as const;
export default function Workspace({ memberId }: { memberId?: string }) {
  const member = Boolean(memberId);
  const [data, setData] = useState<Demo>(() =>
    member ? migrateDemo(emptyMemberWorkspace()) : freshDemo(),
  );
  const [ready, setReady] = useState(false);
  const [storageOK, setStorageOK] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [accountFocus, setAccountFocus] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<string | null>(null);
  const bypassUnload = useRef(false);
  const [revision, setRevision] = useState(0);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = member && ready && JSON.stringify(data) !== savedSnapshot;
  useEffect(() => {
    if (member) {
      let active = true;
      fetch("/api/workspace", {
        cache: "no-store",
        headers: { "X-AccountPilot-User": memberId! },
      })
        .then(async (response) => {
          const body = await response.json();
          if (active && (response.status === 401 || response.status === 403))
            lockWorkspace(response.status === 403 ? "/membership" : "/login");
          if (!response.ok)
            throw new Error(
              body.error || "Private workspace could not be loaded.",
            );
          if (body.userId !== memberId)
            throw new Error(
              "Your account changed. Sign in again before opening a workspace.",
            );
          const next =
            body.data === null
              ? migrateDemo(emptyMemberWorkspace())
              : validData(body.data)
                ? migrateDemo(body.data)
                : null;
          if (!next)
            throw new Error(
              "Stored workspace has an unsupported format. It has not been overwritten.",
            );
          if (active) {
            setData(next);
            setRevision(body.revision);
            setSavedSnapshot(JSON.stringify(next));
            setReady(true);
          }
        })
        .catch((error) => {
          if (active) {
            setStorageOK(false);
            setMessage(error.message);
            setReady(true);
          }
        });
      return () => {
        active = false;
      };
    }
    let active = true;
    loadDemo()
      .then((saved) => {
        if (!active) return;
        if (saved !== null) {
          if (validData(saved)) setData(migrateDemo(saved));
          else {
            setStorageOK(false);
            setMessage(
              "Saved demo data has an unsupported format. It has not been overwritten.",
            );
          }
        }
      })
      .catch(() => {
        if (active) {
          setStorageOK(false);
          setMessage(
            "Browser storage could not be read. Existing data has not been overwritten; changes are temporary.",
          );
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [memberId]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      if (!bypassUnload.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    if (!member && ready && storageOK)
      storeDemo(data).catch(() => {
        setStorageOK(false);
        setMessage(
          "Browser storage is unavailable or full. Changes are temporary and may be lost on refresh.",
        );
      });
  }, [data, ready, storageOK, member]);
  useEffect(() => {
    const sync = () => {
      const account = new URLSearchParams(window.location.search).get(
        "account",
      );
      if (account) {
        setAccountFocus(account);
        setTab("Accounts & briefs");
      } else setAccountFocus(undefined);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function navigateAccount(accountId: string) {
    setAccountFocus(accountId || undefined);
    const url = new URL(window.location.href);
    if (accountId) url.searchParams.set("account", accountId);
    else url.searchParams.delete("account");
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  function openAccount(opportunity: Opportunity) {
    let accountId =
      opportunity.accountId ||
      data.context?.accounts.find((a) => a.id === opportunity.id)?.id;
    let next = data;
    if (!accountId) {
      next = saveOpportunity(data, opportunity);
      accountId = next.opportunities.find(
        (o) => o.id === opportunity.id,
      )?.accountId;
      setData(next);
    }
    navigateAccount(accountId || "");
    setTab("Accounts & briefs");
    setEditing(null);
  }
  function lockWorkspace(destination = "/login") {
    bypassUnload.current = true;
    setData(migrateDemo(emptyMemberWorkspace()));
    setReady(false);
    setTimeout(() => window.location.replace(destination), 0);
  }
  useEffect(() => {
    if (!member) return;
    let active = true;
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("accountpilot-session")
        : null;
    const check = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/auth/identity", {
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          if (active)
            lockWorkspace(response.status === 403 ? "/membership" : "/login");
          return;
        }
        if (response.ok) {
          const result = await response.json();
          if (active && result.userId !== memberId) lockWorkspace();
        }
      } catch {
        /* A network failure never grants additional access. */
      }
    };
    if (channel)
      channel.onmessage = () => {
        if (active) lockWorkspace();
      };
    window.addEventListener("focus", check);
    const timer = setInterval(check, 60000);
    return () => {
      active = false;
      channel?.close();
      window.removeEventListener("focus", check);
      clearInterval(timer);
    };
  }, [memberId]);
  async function signOutPrivate() {
    if (
      dirty &&
      !confirm(
        "Sign out and discard unsaved changes? Save your private workspace first if you want to keep them.",
      )
    )
      return;
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      const result = await response.json();
      if (!response.ok && response.status !== 401)
        throw new Error(result.error || "Sign-out failed.");
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("accountpilot-session");
        channel.postMessage({ type: "signed-out" });
        channel.close();
      }
      lockWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-out failed.");
    }
  }
  async function savePrivate() {
    if (!member || !ready || !storageOK || saving) return;
    setSaving(true);
    const snapshot = JSON.stringify(data);
    try {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-AccountPilot-User": memberId!,
        },
        body: JSON.stringify({ data, revision }),
      });
      const body = await response.json();
      if (response.status === 401 || response.status === 403)
        lockWorkspace(response.status === 403 ? "/membership" : "/login");
      if (!response.ok)
        throw new Error(body.error || "Workspace was not saved.");
      if (body.userId !== memberId)
        throw new Error("Account changed. Reopen your workspace.");
      setRevision(body.revision);
      setSavedSnapshot(snapshot);
      setMessage("Private workspace saved to your account.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Save failed. Your changes remain unsaved.",
      );
    } finally {
      setSaving(false);
    }
  }

  const ranked = rank(data.opportunities, data.profile);
  const plan = actionPlan(data.opportunities, data.profile, data.context);
  const topAccount = data.context?.accounts.find(
    (a) => a.id === ranked[0]?.accountId,
  );
  const total = data.opportunities.reduce((a, o) => a + o.value, 0);
  async function reset() {
    if (member) {
      if (
        !window.confirm(
          "Delete your stored private workspace? This clears its accounts, attachments and journal. Billing and your login account are not deleted.",
        )
      )
        return;
      try {
        const response = await fetch("/api/workspace", {
          method: "DELETE",
          headers: { "X-AccountPilot-User": memberId! },
        });
        const body = await response.json();
        if (response.status === 401 || response.status === 403)
          lockWorkspace(response.status === 403 ? "/membership" : "/login");
        if (!response.ok) throw new Error(body.error || "Deletion failed.");
        if (body.userId !== memberId)
          throw new Error("Account changed. Reopen the workspace.");
        const empty = migrateDemo(emptyMemberWorkspace());
        setData(empty);
        setRevision(0);
        setSavedSnapshot(JSON.stringify(empty));
        setMessage(
          "Stored workspace deleted. Provider backup retention may still apply.",
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Deletion failed.");
      }
      return;
    }
    if (
      window.confirm(
        "Replace all local opportunities, account plans, attachments, solution context, profile changes, and journal entries with fictional examples?",
      )
    ) {
      setData(freshDemo());
      setStorageOK(true);
      setEditing(null);
      setExpanded(null);
      setMessage("Demo reset to fictional examples.");
    }
  }
  function remove(id: string) {
    if (
      window.confirm("Delete this opportunity? Journal entries will be kept.")
    ) {
      setData({
        ...data,
        opportunities: data.opportunities.filter((o) => o.id !== id),
      });
      setMessage("Opportunity deleted.");
    }
  }
  return (
    <div className="shell">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigateAccount("");
            setTab("Overview");
          }}
        >
          <span className="brandmark" aria-hidden="true">
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 19 19 5M5 5h14v14" />
            </svg>
          </span>
          AccountPilot<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="avatar">F</span>
          <div>
            {member ? "Member workspace" : "Founder workspace"}
            <small>
              {member ? "Your signed-in account" : "Fictional demo business"}
            </small>
          </div>
          <span>⌄</span>
        </div>
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {tabs.map((t, i) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              className={tab === t ? "nav active" : "nav"}
              onClick={() => {
                if (t !== "Accounts & briefs") navigateAccount("");
                setTab(t);
                setEditing(null);
              }}
            >
              <span aria-hidden="true">
                {["▦", "▣", "◎", "◇", "♙", "▤"][i]}
              </span>
              {t}
              {t === "Opportunities" && <b>{data.opportunities.length}</b>}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <span className="spark">✧</span>
          <h3>Clarity over busywork.</h3>
          <p>
            Focus your relationships, time, and energy where they matter most.
          </p>
          <span className="tiny">BUILT FOR FOUNDER-LED SALES</span>
        </div>
        <div className="side-bottom">
          <span className="status-dot" />{" "}
          {member
            ? "Member workspace · Server storage"
            : "Demo only · Browser storage"}
          <button
            onClick={reset}
            disabled={member && (!ready || saving || !storageOK)}
          >
            {member ? "Delete stored workspace" : "↻ Reset demo"}
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span> <strong>{tab}</strong>
          </span>
          <span className="demo-pill">
            {member ? "MEMBER WORKSPACE" : "SAFE LOCAL DEMO"}
          </span>
        </header>
        <div className="content">
          <div className="privacy">
            {member
              ? "Your account workspace. Click Save private workspace to persist changes. Use synthetic data until the hosted security setup has been verified."
              : "Fictional examples only. Everything stays in this browser’s IndexedDB storage. Please don’t enter real user or customer data."}
          </div>
          {member && (
            <div className="private-status">
              <span>
                {!ready
                  ? "Loading private memory…"
                  : !storageOK
                    ? "Storage unavailable; saving is disabled"
                    : dirty
                      ? "Unsaved changes"
                      : "Saved workspace"}
              </span>
              <a href="/membership">Membership and billing</a>
              <a href="/privacy">Data privacy</a>
              <button className="text-button" onClick={signOutPrivate}>
                Sign out
              </button>
              <button
                className="primary"
                disabled={!ready || !storageOK || !dirty || saving}
                onClick={savePrivate}
              >
                {saving ? "Saving…" : "Save private workspace"}
              </button>
            </div>
          )}
          {message && (
            <div className="notice" role="status">
              {message}
              <button
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
              >
                ×
              </button>
            </div>
          )}
          {!ready ? (
            <p role="status">Loading your demo workspace…</p>
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    {tab === "Overview"
                      ? "YOUR NEXT BEST MOVE"
                      : "FOUNDER WORKSPACE"}
                  </div>
                  <h1>
                    {tab === "Overview"
                      ? "A little focus. A lot of potential."
                      : tab}
                  </h1>
                  <p>
                    {tab === "Overview"
                      ? "Turn good relationships into thoughtful growth. Here’s where to focus next."
                      : tab === "Opportunities"
                        ? "Compare the possibilities. Invest in the right conversations."
                        : tab === "Founder profile"
                          ? "Give your strategy a clear starting point."
                          : tab === "Solution context"
                            ? "Explain your offering so every account decision has a clear foundation."
                            : tab === "Accounts & briefs"
                              ? "Connect account evidence, human judgment, and a purposeful next action."
                              : "Make a decision. Capture the learning. Build better instincts."}
                  </p>
                </div>
                {(tab === "Overview" || tab === "Opportunities") && (
                  <button
                    className="primary"
                    onClick={() => {
                      setTab("Opportunities");
                      setEditing(empty());
                    }}
                  >
                    ＋ Add opportunity
                  </button>
                )}
              </section>
              {(tab === "Overview" || tab === "Opportunities") && (
                <>
                  {tab === "Overview" && (
                    <>
                      <section className="getting-started card">
                        <div>
                          <div className="eyebrow">
                            YOUR ACCOUNT STRATEGY WORKFLOW
                          </div>
                          <h2>Turn context into your next decision.</h2>
                          <p className="muted">
                            Start with your solution, build an account plan,
                            then review evidence and choose a next step.
                            Fictional information only.
                          </p>
                        </div>
                        <div className="workflow-steps">
                          <button onClick={() => setTab("Solution context")}>
                            <b>01</b>
                            <span>
                              Describe your solution
                              <small>
                                {data.context?.solution.benefits
                                  ? "Context started"
                                  : "Add benefits and ideal customer"}
                              </small>
                            </span>
                            →
                          </button>
                          <button onClick={() => setTab("Accounts & briefs")}>
                            <b>02</b>
                            <span>
                              Build an account plan
                              <small>
                                {data.context?.accounts.filter(
                                  (a) => a.hypothesis,
                                ).length || 0}{" "}
                                accounts with hypotheses
                              </small>
                            </span>
                            →
                          </button>
                          <button onClick={() => setTab("Accounts & briefs")}>
                            <b>03</b>
                            <span>
                              Choose and review a decision
                              <small>
                                {data.context?.accounts.filter(
                                  (a) =>
                                    a.decision && a.decision !== "Undecided",
                                ).length || 0}{" "}
                                recorded account decisions
                              </small>
                            </span>
                            →
                          </button>
                        </div>
                      </section>
                      <div className="stats">
                        <div>
                          <span>
                            PIPELINE POTENTIAL <span aria-hidden="true">↑</span>
                          </span>
                          <strong>{money(total)}</strong>
                          <small>
                            {data.opportunities.length} opportunities ·
                            estimated, not forecast
                          </small>
                        </div>
                        <div>
                          <span>
                            TOP PRIORITY <span aria-hidden="true">◎</span>
                          </span>
                          <strong className="stat-name">
                            {ranked[0]?.company || "Your next opportunity"}
                          </strong>
                          <small>
                            {ranked[0]
                              ? `${ranked[0].analysis.score}/100 PILOT score · relative priority`
                              : "Add an opportunity to get started"}
                          </small>
                        </div>
                        <div>
                          <span>
                            MONTHLY CAPACITY <span aria-hidden="true">◷</span>
                          </span>
                          <strong>
                            {data.profile.capacity}
                            <em> hours</em>
                          </strong>
                          <small>
                            Your time is an investment. Spend it well.
                          </small>
                        </div>
                      </div>
                      <div className="focus-banner">
                        <div className="focus-icon">✧</div>
                        <div>
                          <span className="eyebrow">PILOT BRIEFING</span>
                          <h2>
                            {ranked[0]
                              ? topAccount?.decision === "Pause"
                                ? `Pursuit paused: ${ranked[0].company}.`
                                : `Start with ${ranked[0].company}.`
                              : "Your next chapter starts with a conversation."}
                          </h2>
                          <p>
                            {ranked[0]
                              ? `${topAccount?.decision === "Pause" ? "Your pause decision takes precedence over its score." : "It ranks highest against your current inputs."} ${ranked[0].analysis.gaps.length ? "Close the evidence gaps before committing." : "Validate your assumptions in the next conversation."}`
                              : "Add a fictional opportunity to see a transparent recommendation."}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (ranked[0]) openAccount(ranked[0]);
                          }}
                        >
                          Open account workspace <span>↑</span>
                        </button>
                      </div>
                    </>
                  )}
                  {editing && (
                    <section className="card form-card">
                      <div className="section-title">
                        <h2>
                          {data.opportunities.some((o) => o.id === editing.id)
                            ? "Edit opportunity"
                            : "New opportunity"}
                        </h2>
                        <button
                          className="text-button"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          let next = saveOpportunity(data, editing);
                          if (!editing.accountId) {
                            const accountId = next.opportunities.find(
                              (o) => o.id === editing.id,
                            )!.accountId!;
                            const domain = String(
                              new FormData(e.currentTarget).get(
                                "newAccountDomain",
                              ) || "",
                            );
                            const error = identityError(
                              data.context?.accounts || [],
                              accountId,
                              editing.company,
                              domain,
                            );
                            if (error) {
                              setMessage(error);
                              return;
                            }
                            next = {
                              ...next,
                              context: {
                                ...next.context!,
                                accounts: next.context!.accounts.map((a) =>
                                  a.id === accountId
                                    ? { ...a, domain: normalizeDomain(domain) }
                                    : a,
                                ),
                              },
                            };
                          }
                          setData(next);
                          setEditing(null);
                          setMessage(
                            "Opportunity saved. Priorities and the action plan have been updated.",
                          );
                        }}
                      >
                        <div className="form-grid">
                          <label className="full">
                            Account workspace
                            <select
                              aria-label="Account workspace"
                              value={editing.accountId || ""}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  accountId: e.target.value || undefined,
                                })
                              }
                            >
                              <option value="">
                                Create a separate account if not linked
                              </option>
                              {data.context?.accounts.map((a) => (
                                <option value={a.id} key={a.id}>
                                  {a.name} · {a.domain || "Domain unconfirmed"}
                                </option>
                              ))}
                            </select>
                          </label>
                          {!editing.accountId && (
                            <label className="full">
                              Company website or domain
                              <input
                                name="newAccountDomain"
                                aria-label="Company website or domain"
                                aria-describedby="new-domain-help"
                                required
                                maxLength={300}
                                placeholder="example.com"
                              />
                              <small id="new-domain-help">
                                For an existing company, select its account
                                above instead.
                              </small>
                            </label>
                          )}
                          <label>
                            Company name
                            <input
                              required
                              maxLength={100}
                              value={editing.company}
                              pattern=".*\S.*"
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  company: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Estimated deal value (USD)
                            <input
                              type="number"
                              min="0"
                              max="1000000000"
                              required
                              value={editing.value}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  value: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          {(
                            [
                              "relationship",
                              "access",
                              "pain",
                              "timing",
                            ] as const
                          ).map((k, i) => (
                            <label key={k}>
                              {
                                [
                                  "Relationship strength",
                                  "Buyer access",
                                  "Evidence of business pain",
                                  "Buying timing",
                                ][i]
                              }
                              <select
                                value={editing[k]}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    [k]: Number(e.target.value),
                                  })
                                }
                              >
                                {[
                                  "Unknown / no evidence",
                                  "1 — Very weak",
                                  "2 — Early signal",
                                  "3 — Some validation",
                                  "4 — Strong validation",
                                  "5 — Confirmed / very strong",
                                ].map((s, j) => (
                                  <option key={j} value={j}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                          <label>
                            Monthly pursuit effort (hours)
                            <input
                              type="number"
                              min="0"
                              max="744"
                              required
                              value={editing.effort}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  effort: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="full">
                            Supporting notes (fictional only)
                            <textarea
                              maxLength={4000}
                              value={editing.notes}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  notes: e.target.value,
                                })
                              }
                              placeholder="What do you know, how do you know it, and what remains unconfirmed?"
                            />
                          </label>
                        </div>
                        <p className="muted">
                          Ratings are your assessments. Use 0 when unknown;
                          stronger ratings should have supporting notes. Timing
                          5 means an explicitly confirmed near-term buying
                          window.
                        </p>
                        <button className="primary" type="submit">
                          Save opportunity
                        </button>
                      </form>
                    </section>
                  )}
                  <section className="card">
                    <div className="section-title">
                      <div>
                        <h2>
                          Your priority shortlist{" "}
                          <span className="count">{ranked.length}</span>
                        </h2>
                        <p>Ranked by PILOT. Guided by your evidence.</p>
                      </div>
                      <span className="tiny">HIGHEST PRIORITY FIRST ↓</span>
                    </div>
                    {ranked.length === 0 ? (
                      <div className="empty">
                        <h3>No opportunities yet</h3>
                        <p>
                          Add a fictional company to start comparing your next
                          moves.
                        </p>
                        <button
                          className="primary"
                          onClick={() => setEditing(empty())}
                        >
                          Add your first opportunity
                        </button>
                      </div>
                    ) : (
                      <div
                        className="table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label="Priority-ranked opportunities; scroll horizontally on small screens"
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>OPPORTUNITY</th>
                              <th>DEAL VALUE</th>
                              <th>PILOT SCORE</th>
                              <th>EVIDENCE</th>
                              <th>
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {ranked.map((o, i) => (
                              <tr key={o.id}>
                                <td>
                                  <div className="company">
                                    <span
                                      className={
                                        "company-avatar tone-" + (i % 4)
                                      }
                                    >
                                      {o.company.slice(0, 1).toUpperCase()}
                                    </span>
                                    <div>
                                      <button
                                        className="company-name"
                                        onClick={() => openAccount(o)}
                                      >
                                        {o.company}
                                      </button>
                                      <small>
                                        {data.context?.accounts.find(
                                          (a) => a.id === o.accountId,
                                        )?.domain || "Domain unconfirmed"}
                                      </small>
                                      <small>
                                        {i === 0
                                          ? "First focus"
                                          : `${o.effort}h estimated pursuit effort`}
                                      </small>
                                    </div>
                                  </div>
                                </td>
                                <td className="deal">{money(o.value)}</td>
                                <td>
                                  <div className="score">
                                    <strong>
                                      <button
                                        className="score-link"
                                        aria-label={
                                          "View PILOT rationale for " +
                                          o.company
                                        }
                                        aria-expanded={expanded === o.id}
                                        onClick={() =>
                                          setExpanded(
                                            expanded === o.id ? null : o.id,
                                          )
                                        }
                                      >
                                        {o.analysis.score}
                                        <small>/100</small>
                                      </button>
                                    </strong>
                                    <div className="score-track">
                                      <span
                                        style={{
                                          width: o.analysis.score + "%",
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span
                                    className={
                                      "badge " +
                                      (o.analysis.confidence === "Higher"
                                        ? "green"
                                        : o.analysis.confidence === "Low"
                                          ? "amber"
                                          : "")
                                    }
                                  >
                                    {o.analysis.confidence}
                                  </span>
                                </td>
                                <td>
                                  <div className="row-actions">
                                    <button
                                      onClick={() =>
                                        setEditing({
                                          id: o.id,
                                          accountId: o.accountId,
                                          company: o.company,
                                          value: o.value,
                                          relationship: o.relationship,
                                          access: o.access,
                                          pain: o.pain,
                                          timing: o.timing,
                                          effort: o.effort,
                                          notes: o.notes,
                                        })
                                      }
                                      aria-label={"Edit " + o.company}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => remove(o.id)}
                                      aria-label={"Delete " + o.company}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {ranked
                      .filter((o) => o.id === expanded)
                      .map((o) => (
                        <div className="rationale" key={o.id}>
                          <h3>{o.company}: why this score?</h3>
                          <div className="pilot-grid">
                            {o.analysis.rationale.map((r, i) => (
                              <div key={r}>
                                <b>{"PILOT"[i]}</b>
                                <p>{r}</p>
                              </div>
                            ))}
                          </div>
                          <p>
                            <strong>
                              Evidence confidence: {o.analysis.confidence}.
                            </strong>{" "}
                            This describes completeness of entered inputs, not
                            their truth or a win probability.
                          </p>
                          {o.analysis.gaps.length > 0 ? (
                            <ul>
                              {o.analysis.gaps.map((g) => (
                                <li key={g}>{g}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>
                              No missing inputs detected. Independently confirm
                              your assumptions.
                            </p>
                          )}
                          <p className="notes">
                            Notes: {o.notes || "No supporting notes recorded."}
                          </p>
                          <button
                            className="text-button"
                            onClick={() => {
                              setAccountFocus(o.accountId);
                              setTab("Accounts & briefs");
                            }}
                          >
                            Open this account’s plan and evidence
                          </button>
                        </div>
                      ))}
                    <details className="method">
                      <summary>How PILOT works · transparent by design</summary>
                      <p>
                        Score = Potential × 25% + Influence × 20% + Likelihood ×
                        25% + Opportunity cost × 15% + Timing × 15%. Each
                        ingredient is 0–100.
                      </p>
                      <p>
                        Potential = estimated value / target deal size × 60,
                        capped at 100. Influence = (relationship + buyer access)
                        × 10. Likelihood = pain evidence × 20. Opportunity cost
                        = max(0, 1 − effort / monthly capacity) × 100. Timing =
                        timing rating × 20. Missing deal size, capacity, or
                        effort earns zero in the affected component. Ties sort
                        by company name, then ID.
                      </p>
                      <p>
                        Confidence is Higher with no missing inputs, Moderate
                        with 1–2 gaps, and Low with 3 or more. Notes are not
                        fact-checked. Revenue goals provide context and do not
                        inflate scores. No AI, external facts, or probability
                        estimates are used.
                      </p>
                    </details>
                  </section>
                  <section className="plan-section">
                    <div className="section-title">
                      <div>
                        <div className="eyebrow">
                          SMALL STEPS, MEANINGFUL MOMENTUM
                        </div>
                        <h2>Your next 30 days</h2>
                        <p>
                          A practical starting point for your highest-ranked
                          opportunity.
                        </p>
                      </div>
                      <span className="plan-tag">30-DAY ACTION PLAN</span>
                    </div>
                    {plan.length ? (
                      <div className="plan-grid">
                        {plan.map((a) => (
                          <article className="plan-card" key={a.week}>
                            <span className="week">WEEK {a.week}</span>
                            <h3>{a.title}</h3>
                            <p>{a.text}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="empty card">
                        Your action plan will appear when you add an
                        opportunity.
                      </div>
                    )}
                  </section>
                </>
              )}
              {tab === "Founder profile" && (
                <section className="card form-card">
                  <h2>Your business, in focus</h2>
                  <p className="muted">
                    Use fictional information. Deal size and capacity shape the
                    priority scores.
                  </p>
                  <form
                    key={JSON.stringify(data.profile)}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      setData({
                        ...data,
                        context: data.context
                          ? {
                              ...data.context,
                              accounts: data.context.accounts.map((a) => ({
                                ...a,
                                reviewed: "",
                              })),
                            }
                          : undefined,
                        profile: {
                          offering: String(f.get("offering")).trim(),
                          buyer: String(f.get("buyer")).trim(),
                          dealSize: Number(f.get("dealSize")),
                          capacity: Number(f.get("capacity")),
                          goal: Number(f.get("goal")),
                        },
                      });
                      setMessage(
                        "Founder profile saved. Your priorities have been recalculated.",
                      );
                    }}
                  >
                    <div className="form-grid">
                      <label className="full">
                        What do you offer?
                        <textarea
                          required
                          name="offering"
                          maxLength={1000}
                          defaultValue={data.profile.offering}
                        />
                      </label>
                      <label className="full">
                        Who is your ideal buyer?
                        <textarea
                          required
                          name="buyer"
                          maxLength={1000}
                          defaultValue={data.profile.buyer}
                        />
                      </label>
                      <label>
                        Target deal size (USD)
                        <input
                          name="dealSize"
                          type="number"
                          min="1"
                          max="1000000000"
                          required
                          defaultValue={data.profile.dealSize}
                        />
                      </label>
                      <label>
                        Monthly sales capacity (hours)
                        <input
                          name="capacity"
                          type="number"
                          min="1"
                          max="744"
                          required
                          defaultValue={data.profile.capacity}
                        />
                      </label>
                      <label>
                        90-day revenue goal (USD)
                        <input
                          name="goal"
                          type="number"
                          min="0"
                          max="1000000000"
                          required
                          defaultValue={data.profile.goal}
                        />
                      </label>
                    </div>
                    <button className="primary">Save founder profile</button>
                  </form>
                </section>
              )}
              {tab === "Decision journal" && (
                <>
                  <section className="card form-card">
                    <h2>Capture a decision</h2>
                    <p className="muted">
                      Keep the reasoning, not just the result. Use fictional
                      examples only.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        setData({
                          ...data,
                          journal: [
                            {
                              id: crypto.randomUUID(),
                              accountId:
                                String(f.get("accountId") || "") || undefined,
                              date: new Date().toISOString(),
                              company:
                                data.context?.accounts.find(
                                  (a) => a.id === String(f.get("accountId")),
                                )?.name || String(f.get("company")).trim(),
                              decision: String(f.get("decision")).trim(),
                              outcome: String(f.get("outcome")).trim(),
                            },
                            ...data.journal,
                          ],
                        });
                        e.currentTarget.reset();
                        setMessage(
                          "Decision recorded. You can update the outcome as you learn.",
                        );
                      }}
                    >
                      <div className="form-grid">
                        <label className="full">
                          Account (optional)
                          <select
                            aria-label="Account (optional)"
                            name="accountId"
                            defaultValue={accountFocus || ""}
                          >
                            <option value="">
                              General decision / not linked
                            </option>
                            {data.context?.accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} · {a.domain || "Domain unconfirmed"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="full">
                          Company / context
                          <input
                            name="company"
                            required
                            maxLength={100}
                            pattern=".*\S.*"
                            list="companies"
                          />
                          <datalist id="companies">
                            {data.opportunities.map((o) => (
                              <option key={o.id} value={o.company} />
                            ))}
                          </datalist>
                        </label>
                        <label className="full">
                          What did you decide, and why?
                          <textarea name="decision" required maxLength={4000} />
                        </label>
                        <label className="full">
                          Outcome / what you learned (optional)
                          <textarea name="outcome" maxLength={4000} />
                        </label>
                      </div>
                      <button className="primary">Record decision</button>
                    </form>
                  </section>
                  <section className="journal-list">
                    {!data.journal.length ? (
                      <div className="empty card">
                        <h3>A fresh page for better decisions.</h3>
                        <p>Your decisions and outcomes will appear here.</p>
                      </div>
                    ) : (
                      data.journal.map((j) => (
                        <article className="card journal-entry" key={j.id}>
                          <div className="section-title">
                            <h2>{j.company}</h2>
                            <time dateTime={j.date}>
                              {new Date(j.date).toLocaleDateString()}
                            </time>
                          </div>
                          <label>
                            Linked account
                            <select
                              aria-label={"Linked account for decision " + j.id}
                              value={j.accountId || ""}
                              onChange={(e) =>
                                setData({
                                  ...data,
                                  journal: data.journal.map((x) =>
                                    x.id === j.id
                                      ? {
                                          ...x,
                                          accountId:
                                            e.target.value || undefined,
                                        }
                                      : x,
                                  ),
                                })
                              }
                            >
                              <option value="">
                                Not linked / general decision
                              </option>
                              {data.context?.accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name} · {a.domain || "Domain unconfirmed"}
                                </option>
                              ))}
                            </select>
                          </label>
                          <p className="notes">{j.decision}</p>
                          <label htmlFor={"outcome-" + j.id}>
                            Outcome / learning
                          </label>
                          <textarea
                            id={"outcome-" + j.id}
                            maxLength={4000}
                            value={j.outcome}
                            onChange={(e) =>
                              setData({
                                ...data,
                                journal: data.journal.map((item) =>
                                  item.id === j.id
                                    ? { ...item, outcome: e.target.value }
                                    : item,
                                ),
                              })
                            }
                          />
                          <small>
                            {j.outcome
                              ? "Outcome updated. Use Save private workspace in member mode to persist it."
                              : "No outcome recorded yet. Return after your next conversation."}
                          </small>
                          <button
                            className="text-button danger"
                            onClick={() => {
                              if (window.confirm("Delete this journal entry?"))
                                setData({
                                  ...data,
                                  journal: data.journal.filter(
                                    (item) => item.id !== j.id,
                                  ),
                                });
                            }}
                          >
                            Delete entry
                          </button>
                        </article>
                      ))
                    )}
                  </section>
                </>
              )}
              {tab === "Solution context" && (
                <ContextWorkspace
                  data={data}
                  onChange={setData}
                  view="solution"
                  member={member}
                  onJournal={() => setTab("Decision journal")}
                />
              )}
              {tab === "Accounts & briefs" && (
                <AccountHub
                  key={accountFocus || "directory"}
                  data={data}
                  onChange={setData}
                  member={member}
                  initialAccount={accountFocus}
                  onNavigate={navigateAccount}
                  onJournal={() => setTab("Decision journal")}
                />
              )}
              <footer>
                <span className="brand-footer">AccountPilot</span>
                <span>Better relationships. Clearer decisions.</span>
                <span>
                  {member
                    ? "Per-user server storage · No AI calls"
                    : "Demo only · Browser storage · No AI calls"}
                </span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
