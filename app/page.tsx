"use client";
import { useEffect, useState } from "react";
import { actionPlan, Demo, Opportunity, rank, seed } from "@/lib/strategy";
const KEY = "accountpilot.demo.v1";
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
  "Opportunities",
  "Founder profile",
  "Decision journal",
] as const;
function validData(value: unknown): value is Demo {
  if (!value || typeof value !== "object") return false;
  const d = value as Demo;
  return (
    !!d.profile &&
    ["offering", "buyer"].every(
      (k) => typeof d.profile[k as "offering" | "buyer"] === "string",
    ) &&
    ["dealSize", "capacity", "goal"].every(
      (k) =>
        typeof d.profile[k as "dealSize" | "capacity" | "goal"] === "number" &&
        Number.isFinite(d.profile[k as "dealSize" | "capacity" | "goal"]) &&
        d.profile[k as "dealSize" | "capacity" | "goal"] >= 0,
    ) &&
    Array.isArray(d.opportunities) &&
    d.opportunities.every(
      (o) =>
        o &&
        typeof o.id === "string" &&
        typeof o.company === "string" &&
        typeof o.notes === "string" &&
        ["value", "relationship", "access", "pain", "timing", "effort"].every(
          (k) =>
            typeof o[k as "value"] === "number" &&
            Number.isFinite(o[k as "value"]) &&
            o[k as "value"] >= 0,
        ) &&
        ["relationship", "access", "pain", "timing"].every(
          (k) => o[k as "relationship"] <= 5,
        ),
    ) &&
    Array.isArray(d.journal) &&
    d.journal.every(
      (j) =>
        j &&
        ["id", "date", "company", "decision", "outcome"].every(
          (k) => typeof j[k as "id"] === "string",
        ),
    )
  );
}
export default function Home() {
  const [data, setData] = useState<Demo>(seed);
  const [ready, setReady] = useState(false);
  const [storageOK, setStorageOK] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (validData(parsed)) setData(parsed);
        else {
          setStorageOK(false);
          setMessage(
            "Saved demo data has an unsupported format. Reset the demo to start again.",
          );
        }
      }
    } catch {
      setStorageOK(false);
      setMessage(
        "Browser storage could not be read. Changes are temporary until storage is available or the demo is reset.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && storageOK) {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        setStorageOK(false);
        setMessage(
          "Browser storage is unavailable or full. Changes are temporary and will be lost on refresh.",
        );
      }
    }
  }, [data, ready, storageOK]);
  const ranked = rank(data.opportunities, data.profile);
  const plan = actionPlan(data.opportunities, data.profile);
  const total = data.opportunities.reduce((a, o) => a + o.value, 0);
  function reset() {
    if (
      window.confirm(
        "Replace all local opportunities, profile changes, and journal entries with fictional examples?",
      )
    ) {
      setData(seed());
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
            Founder workspace<small>Fictional demo business</small>
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
                setTab(t);
                setEditing(null);
              }}
            >
              <span aria-hidden="true">{["▦", "◎", "♙", "▤"][i]}</span>
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
          <span className="status-dot" /> Demo only · Local storage
          <button onClick={reset}>↻ Reset demo</button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span> <strong>{tab}</strong>
          </span>
          <span className="demo-pill">◉ &nbsp; SAFE DEMO</span>
        </header>
        <div className="content">
          <div className="privacy">
            Fictional examples only. Everything stays in this browser’s
            localStorage. Please don’t enter real user or customer data.
          </div>
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
                              ? `Start with ${ranked[0].company}.`
                              : "Your next chapter starts with a conversation."}
                          </h2>
                          <p>
                            {ranked[0]
                              ? `It ranks highest against your current inputs. ${ranked[0].analysis.gaps.length ? "Close the evidence gaps before committing." : "Validate your assumptions in the next conversation."}`
                              : "Add a fictional opportunity to see a transparent recommendation."}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setTab("Opportunities");
                            if (ranked[0]) setExpanded(ranked[0].id);
                          }}
                        >
                          Explore the rationale <span>↑</span>
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
                          setData({
                            ...data,
                            opportunities: [
                              ...data.opportunities.filter(
                                (o) => o.id !== editing.id,
                              ),
                              { ...editing, company: editing.company.trim() },
                            ],
                          });
                          setEditing(null);
                          setMessage(
                            "Opportunity saved. Priorities and the action plan have been updated.",
                          );
                        }}
                      >
                        <div className="form-grid">
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
                                        aria-expanded={expanded === o.id}
                                        onClick={() =>
                                          setExpanded(
                                            expanded === o.id ? null : o.id,
                                          )
                                        }
                                      >
                                        {o.company}
                                      </button>
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
                                      {o.analysis.score}
                                      <small>/100</small>
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
                              date: new Date().toISOString(),
                              company: String(f.get("company")).trim(),
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
                              ? "Outcome saved in this browser as you type."
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
              <footer>
                <span className="brand-footer">AccountPilot</span>
                <span>Better relationships. Clearer decisions.</span>
                <span>Demo only · Browser local storage · No AI calls</span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
