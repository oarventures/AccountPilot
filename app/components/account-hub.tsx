"use client";
import { useState } from "react";
import type { Demo } from "@/lib/strategy";
import { rank } from "@/lib/strategy";
import {
  Account,
  blankAccount,
  initializeContext,
  linkedOpportunities,
} from "@/lib/context";
import {
  accountGaps,
  accountProgress,
  identityError,
  normalizeDomain,
  ApproachStep,
  AccountStage,
} from "@/lib/accounts";
import ContextWorkspace, { Documents } from "./context-workspace";
const id = () => crypto.randomUUID();
const stages: AccountStage[] = [
  "Target",
  "Researching",
  "Engaged",
  "Qualified",
  "Parked",
];
const views = [
  "Overview",
  "Account plan",
  "People & approach",
  "Activity",
  "Evidence & review",
  "Company details",
] as const;
export default function AccountHub({
  data,
  onChange,
  member = false,
  initialAccount,
  onJournal,
  onNavigate,
}: {
  data: Demo;
  onChange: (d: Demo) => void;
  member?: boolean;
  initialAccount?: string;
  onJournal: () => void;
  onNavigate: (id: string) => void;
}) {
  const context = data.context || initializeContext(data);
  const [selected, setSelected] = useState(initialAccount || "");
  const [view, setView] = useState<(typeof views)[number]>("Overview");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const account = context.accounts.find((a) => a.id === selected);
  const update = (a: Account) =>
    onChange({
      ...data,
      context: {
        ...context,
        accounts: context.accounts.map((x) =>
          x.id === a.id ? { ...a, reviewed: "" } : x,
        ),
      },
    });
  function open(accountId: string) {
    setSelected(accountId);
    setView("Overview");
    setNotice("");
    onNavigate(accountId);
  }
  const filtered = context.accounts.filter((a) =>
    `${a.name} ${a.domain || ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const progress = account ? accountProgress(account) : null;
  const gaps = account ? accountGaps(account) : [];
  const chosen = account?.people.find((p) => p.id === account.primaryContactId);
  const next = account?.steps?.find((s) => s.status === "Planned");
  const linked = account
    ? rank(linkedOpportunities(account, data.opportunities), data.profile)
    : [];
  return (
    <div className="account-hub">
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {!account && (
        <>
          <section className="card form-card">
            <div className="section-title">
              <div>
                <h2>Your accounts</h2>
                <p>
                  One workspace for the company, its account plan, people,
                  deals, and approach.
                </p>
              </div>
              <button
                className="primary"
                onClick={() => setShowCreate(!showCreate)}
              >
                ＋ New account
              </button>
            </div>
            {initialAccount && !account && (
              <p className="error">
                That account is not in this workspace. Select one below; no
                other user’s accounts can be opened here.
              </p>
            )}
            <label className="account-search">
              Find an account
              <input
                type="search"
                placeholder="Company or domain"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </section>
          {showCreate && (
            <section className="card form-card">
              <h2>Add a company</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const name = String(f.get("name")).trim();
                  const domain = String(f.get("domain"));
                  const newId = id();
                  const error = identityError(
                    context.accounts,
                    newId,
                    name,
                    domain,
                  );
                  if (error) {
                    setNotice(error);
                    return;
                  }
                  const a = {
                    ...blankAccount(newId, name),
                    domain: normalizeDomain(domain),
                    stage: "Target" as AccountStage,
                  };
                  onChange({
                    ...data,
                    context: { ...context, accounts: [...context.accounts, a] },
                  });
                  setShowCreate(false);
                  open(newId);
                }}
              >
                <div className="form-grid">
                  <label>
                    Company name
                    <input name="name" required maxLength={100} />
                  </label>
                  <label>
                    Company website or domain
                    <input
                      name="domain"
                      required
                      maxLength={300}
                      placeholder="example.com or https://www.example.com"
                    />
                  </label>
                </div>
                <button className="primary">Create account workspace</button>
              </form>
            </section>
          )}
          {!filtered.length ? (
            <div className="empty card">
              <h3>
                {context.accounts.length
                  ? "No matching accounts"
                  : "Start with one strategic account"}
              </h3>
              <p>
                Create a company record, then attach its plan. You do not need
                to retype the document.
              </p>
              <button className="primary" onClick={() => setShowCreate(true)}>
                Add an account
              </button>
            </div>
          ) : (
            <div className="account-directory">
              {filtered.map((a) => {
                const p = accountProgress(a);
                return (
                  <button
                    className="card account-tile"
                    key={a.id}
                    onClick={() => open(a.id)}
                  >
                    <div>
                      <span className="company-avatar tone-0">
                        {a.name.slice(0, 1)}
                      </span>
                      <span className="badge">{a.stage || "Target"}</span>
                    </div>
                    <h3>{a.name}</h3>
                    <p>{a.domain || "Domain not yet confirmed"}</p>
                    <small>
                      {a.documents.length} documents · {a.people.length} people
                      · {p.done}/{p.total} steps done
                    </small>
                    <span className="open-account">Open account →</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
      {account && progress && (
        <>
          <button
            className="text-button"
            onClick={() => {
              setSelected("");
              onNavigate("");
            }}
          >
            ← All accounts
          </button>
          <header className="account-object-header">
            <div>
              <div className="eyebrow">ACCOUNT WORKSPACE</div>
              <h2>{account.name}</h2>
              <p>
                {account.domain ? (
                  <a
                    href={`https://${account.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {account.domain} (website)
                  </a>
                ) : (
                  "Domain unconfirmed — add it in Company details"
                )}
                {account.industry ? ` · ${account.industry}` : ""}
                {account.location ? ` · ${account.location}` : ""}
              </p>
            </div>
            <div>
              <span className="badge">{account.stage || "Target"}</span>
              <span className="badge">{account.decision || "Undecided"}</span>
            </div>
          </header>
          <nav className="account-tabs" aria-label="Account sections">
            {views.map((v) => (
              <button
                key={v}
                aria-current={view === v ? "page" : undefined}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </nav>
          {view === "Overview" && (
            <>
              <div className="account-summary-grid">
                <section className="card form-card">
                  <div className="eyebrow">ACCOUNT PLAN</div>
                  <h3>
                    {
                      account.documents.filter(
                        (d) => d.purpose === "Account plan",
                      ).length
                    }{" "}
                    plan documents
                  </h3>
                  <p>
                    Read the attached plan and supporting material before
                    acting.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setView("Account plan")}
                  >
                    View or attach account plan →
                  </button>
                </section>
                <section className="card form-card">
                  <div className="eyebrow">EXECUTION PROGRESS</div>
                  <h3>
                    {progress.done} of {progress.total} steps complete
                  </h3>
                  <div className="score-track">
                    <span style={{ width: progress.percent + "%" }} />
                  </div>
                  <p>
                    {progress.blocked
                      ? `${progress.blocked} blocked steps need attention.`
                      : "No blocked steps recorded."}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setView("People & approach")}
                  >
                    Manage the approach →
                  </button>
                </section>
                <section className="card form-card">
                  <div className="eyebrow">NEXT PERSON</div>
                  <h3>{chosen?.name || "Not selected"}</h3>
                  <p>
                    {chosen
                      ? `${chosen.role || "Role unknown"} · ${chosen.path || "Access unconfirmed"}`
                      : "Choose a named person, or record a persona to research. A persona is not confirmed buyer access."}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setView("People & approach")}
                  >
                    Map people and personas →
                  </button>
                </section>
              </div>
              <section className="card form-card account-approach">
                <div className="eyebrow">YOUR STRATEGIC APPROACH</div>
                <h3>
                  {account.hypothesis ||
                    "An approach has not been recorded yet."}
                </h3>
                <div className="brief-grid">
                  <article>
                    <h3>Message hypothesis</h3>
                    <p className="notes">
                      {account.message ||
                        "What account-specific problem should the conversation address?"}
                    </p>
                    <h3>Why this makes sense</h3>
                    <p className="notes">
                      {account.whySolution ||
                        "Link the account’s problem to a specific solution benefit. Label assumptions."}
                    </p>
                  </article>
                  <article>
                    <h3>Next move</h3>
                    <p className="notes">
                      {account.decision === "Pause"
                        ? "Pursuit is paused. Review the decision before taking outreach steps."
                        : next
                          ? `${next.title}: ${next.objective}`
                          : account.nextAction || "No next action recorded."}
                    </p>
                    <h3>When and why</h3>
                    <p className="notes">
                      {account.whyNow || "No buying trigger is confirmed."}
                    </p>
                  </article>
                </div>
                <button
                  className="primary"
                  onClick={() => setView("People & approach")}
                >
                  Define the approach
                </button>
              </section>
              <section className="card form-card">
                <h3>Logical and evidence gaps</h3>
                <p className="muted">
                  This is a completeness check, not AI analysis of the attached
                  plan.
                </p>
                {gaps.length ? (
                  <ul className="gap-list">
                    {gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    No template gaps detected. Check whether the underlying
                    evidence is credible and current.
                  </p>
                )}
              </section>
              <section className="card form-card">
                <h3>Deals at this account</h3>
                {linked.length ? (
                  linked.map((o) => (
                    <div className="linked-deal" key={o.id}>
                      <strong>{o.company}</strong>
                      <span>
                        ${o.value.toLocaleString()} estimated · PILOT{" "}
                        {o.analysis.score}/100
                      </span>
                      <small>
                        PILOT reflects entered deal ratings, not automatically
                        extracted document evidence.
                      </small>
                    </div>
                  ))
                ) : (
                  <p>
                    No deal linked yet. Add or edit an opportunity and select
                    this account.
                  </p>
                )}
              </section>
            </>
          )}
          {view === "Account plan" && (
            <section className="card form-card">
              <h2>Account plan and source material</h2>
              <p className="muted">
                Attach the plan itself. Use document roles to distinguish the
                main plan, research, notes, and slides. Nothing is automatically
                treated as a verified fact.
              </p>
              <Documents
                member={member}
                docs={account.documents}
                context={context}
                label="Account plan documents"
                onChange={(documents) => update({ ...account, documents })}
              />
            </section>
          )}
          {view === "Company details" && (
            <section className="card form-card">
              <h2>Company identity and account details</h2>
              <p className="muted">
                The domain distinguishes same-name businesses. The internal
                account ID remains stable if its website changes. Shared parent
                domains and business units need human review; no automatic merge
                is performed.
              </p>
              <form
                key={
                  account.id +
                  JSON.stringify([account.name, account.domain, account.stage])
                }
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const name = String(f.get("name")).trim();
                  const domain = String(f.get("domain"));
                  const error = identityError(
                    context.accounts,
                    account.id,
                    name,
                    domain,
                  );
                  if (error) {
                    setNotice(error);
                    return;
                  }
                  update({
                    ...account,
                    name,
                    domain: normalizeDomain(domain),
                    industry: String(f.get("industry")).trim(),
                    location: String(f.get("location")).trim(),
                    companySize: String(f.get("size")).trim(),
                    businessUnit: String(f.get("unit")).trim(),
                    owner: String(f.get("owner")).trim(),
                    stage: String(f.get("stage")) as AccountStage,
                  });
                  setNotice("Company details updated.");
                }}
              >
                <div className="form-grid">
                  <label>
                    Company name
                    <input
                      name="name"
                      required
                      maxLength={100}
                      defaultValue={account.name}
                    />
                  </label>
                  <label>
                    Company website or domain
                    <input
                      name="domain"
                      required
                      maxLength={300}
                      defaultValue={account.domain || ""}
                    />
                  </label>
                  <label>
                    Industry
                    <input
                      name="industry"
                      maxLength={200}
                      defaultValue={account.industry || ""}
                    />
                  </label>
                  <label>
                    Headquarters / region
                    <input
                      name="location"
                      maxLength={200}
                      defaultValue={account.location || ""}
                    />
                  </label>
                  <label>
                    Company size / segment
                    <input
                      name="size"
                      maxLength={100}
                      defaultValue={account.companySize || ""}
                      placeholder="e.g. 100–500 employees, unverified"
                    />
                  </label>
                  <label>
                    Business unit / entity
                    <input
                      name="unit"
                      maxLength={200}
                      defaultValue={account.businessUnit || ""}
                    />
                  </label>
                  <label>
                    Account owner
                    <input
                      name="owner"
                      maxLength={100}
                      defaultValue={account.owner || ""}
                    />
                  </label>
                  <label>
                    Account stage
                    <select
                      aria-label="Account stage"
                      name="stage"
                      defaultValue={account.stage || "Target"}
                    >
                      {stages.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button className="primary">Save company details</button>
              </form>
              <p className="muted">
                Internal account ID: {account.id}. Website ownership is not
                independently verified.
              </p>
            </section>
          )}
          {view === "People & approach" && (
            <>
              <section className="card form-card">
                <h2>Account approach</h2>
                <p className="muted">
                  The account plan stays attached. These short execution notes
                  make its current approach visible; they are founder judgments,
                  not generated facts.
                </p>
                <form
                  key={
                    account.id +
                    account.hypothesis +
                    account.message +
                    account.whySolution +
                    account.whyAccount +
                    account.pause +
                    account.whyNow +
                    account.nextAction
                  }
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    update({
                      ...account,
                      hypothesis: String(f.get("hypothesis")).trim(),
                      message: String(f.get("message")).trim(),
                      whySolution: String(f.get("whySolution")).trim(),
                      whyAccount: String(f.get("whyAccount")).trim(),
                      pause: String(f.get("pause")).trim(),
                      whyNow: String(f.get("whyNow")).trim(),
                      nextAction: String(f.get("nextAction")).trim(),
                    });
                    setNotice("Approach updated.");
                  }}
                >
                  <div className="form-grid">
                    {[
                      ["hypothesis", "Main account hypothesis"],
                      ["whyAccount", "Why this account is worth pursuing"],
                      ["message", "Account-specific message"],
                      [
                        "whySolution",
                        "Why this approach makes strategic sense",
                      ],
                      ["whyNow", "Buying trigger / timing evidence"],
                      ["nextAction", "Current next action"],
                      ["pause", "When to pause or disqualify"],
                    ].map(([k, label]) => (
                      <label className="full" key={k}>
                        {label}
                        <textarea
                          aria-label={label}
                          name={k}
                          maxLength={4000}
                          defaultValue={account[k as "hypothesis"]}
                        />
                      </label>
                    ))}
                  </div>
                  <button className="primary">Save approach</button>
                </form>
              </section>
              <section className="card form-card">
                <h2>People and personas</h2>
                <label>
                  Chosen next contact
                  <select
                    aria-label="Chosen next contact"
                    value={account.primaryContactId || ""}
                    onChange={(e) =>
                      update({ ...account, primaryContactId: e.target.value })
                    }
                  >
                    <option value="">Not selected</option>
                    {account.people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.role || "Unknown role"}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="people-cards">
                  {account.people.map((p) => (
                    <article className="stakeholder" key={p.id}>
                      <h3>{p.name}</h3>
                      <p>
                        {p.role || "Role unknown"}
                        {p.persona ? ` · Persona: ${p.persona}` : ""}
                      </p>
                      <p>
                        Access: {p.path || "Unknown"} · Authority:{" "}
                        {p.authority || "Unknown"}
                      </p>
                      {p.email && <p>{p.email}</p>}
                      <button
                        className="text-button"
                        onClick={() => {
                          if (
                            confirm(
                              "Remove this person? Sequence references will be marked unavailable.",
                            )
                          )
                            update({
                              ...account,
                              people: account.people.filter(
                                (x) => x.id !== p.id,
                              ),
                              primaryContactId:
                                account.primaryContactId === p.id
                                  ? ""
                                  : account.primaryContactId,
                            });
                        }}
                      >
                        Remove person
                      </button>
                    </article>
                  ))}
                </div>
                <details>
                  <summary>Add a person or persona to research</summary>
                  <form
                    key={"person-" + account.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      update({
                        ...account,
                        people: [
                          ...account.people,
                          {
                            id: id(),
                            name: String(f.get("person")).trim(),
                            role: String(f.get("role")).trim(),
                            persona: String(f.get("persona")).trim(),
                            email: String(f.get("email")).trim(),
                            path: String(f.get("path")).trim(),
                            authority: String(f.get("authority")).trim(),
                          },
                        ],
                      });
                      e.currentTarget.reset();
                      setNotice(
                        "Person added. Choose the next contact explicitly.",
                      );
                    }}
                  >
                    <div className="form-grid">
                      {[
                        ["person", "Name or role placeholder"],
                        ["role", "Job title / role"],
                        ["persona", "Persona / buying role"],
                        ["email", "Email (optional)"],
                        ["path", "Relationship / introduction path"],
                        ["authority", "Known authority / unknowns"],
                      ].map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            name={key}
                            required={key === "person"}
                            type={key === "email" ? "email" : "text"}
                            maxLength={500}
                          />
                        </label>
                      ))}
                    </div>
                    <button className="primary">Add person</button>
                  </form>
                </details>
              </section>
              <section className="card form-card">
                <h2>Account sequence</h2>
                <p className="muted">
                  An ordered plan of purposeful actions—not an automated
                  outreach campaign. Completing a step does not prove that a
                  deal progressed.
                </p>
                {account.decision === "Pause" && (
                  <p className="notice">
                    This account is paused. Revisit the decision before carrying
                    out outreach.
                  </p>
                )}
                {(account.steps || []).map((step, i) => (
                  <article className="sequence-step" key={step.id}>
                    <div className="step-number">{i + 1}</div>
                    <div>
                      <h3>{step.title}</h3>
                      <p>
                        {step.personId
                          ? account.people.find((p) => p.id === step.personId)
                              ?.name || "Person removed — choose a new target"
                          : step.persona || "Target not specified"}{" "}
                        · {step.channel}
                        {step.due ? ` · ${step.due}` : ""}
                      </p>
                      <p>
                        <strong>Objective:</strong> {step.objective}
                      </p>
                      <p>
                        <strong>Message:</strong>{" "}
                        {step.message || "Not recorded"}
                      </p>
                      <p>
                        <strong>Reason for this step:</strong> {step.rationale}
                      </p>
                      <div className="step-actions">
                        <label>
                          Status
                          <select
                            aria-label={"Status for " + step.title}
                            value={step.status}
                            onChange={(e) =>
                              update({
                                ...account,
                                steps: (account.steps || []).map((x) =>
                                  x.id === step.id
                                    ? {
                                        ...x,
                                        status: e.target
                                          .value as ApproachStep["status"],
                                      }
                                    : x,
                                ),
                              })
                            }
                          >
                            {["Planned", "Done", "Blocked"].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          disabled={i === 0}
                          onClick={() => {
                            const steps = [...(account.steps || [])];
                            [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
                            update({ ...account, steps });
                          }}
                        >
                          Move up
                        </button>
                        <button
                          disabled={i === (account.steps || []).length - 1}
                          onClick={() => {
                            const steps = [...(account.steps || [])];
                            [steps[i + 1], steps[i]] = [steps[i], steps[i + 1]];
                            update({ ...account, steps });
                          }}
                        >
                          Move down
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Remove this sequence step?"))
                              update({
                                ...account,
                                steps: (account.steps || []).filter(
                                  (x) => x.id !== step.id,
                                ),
                              });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {!account.steps?.length && (
                  <p className="empty">
                    No sequence yet. Start with one conversation or research
                    action that resolves an uncertainty.
                  </p>
                )}
                <details>
                  <summary>Add an approach step</summary>
                  <form
                    key={"step-" + account.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const step: ApproachStep = {
                        id: id(),
                        title: String(f.get("title")).trim(),
                        personId: String(f.get("personId")),
                        persona: String(f.get("persona")).trim(),
                        channel: String(
                          f.get("channel"),
                        ) as ApproachStep["channel"],
                        objective: String(f.get("objective")).trim(),
                        message: String(f.get("message")).trim(),
                        rationale: String(f.get("rationale")).trim(),
                        due: String(f.get("due")),
                        status: "Planned",
                      };
                      update({
                        ...account,
                        steps: [...(account.steps || []), step],
                      });
                      e.currentTarget.reset();
                      setNotice("Sequence step added.");
                    }}
                  >
                    <div className="form-grid">
                      <label>
                        Step title
                        <input name="title" required maxLength={200} />
                      </label>
                      <label>
                        Named person
                        <select aria-label="Named person" name="personId">
                          <option value="">Not identified yet</option>
                          {account.people.map((p) => (
                            <option value={p.id} key={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Persona to research (if no person)
                        <input name="persona" maxLength={200} />
                      </label>
                      <label>
                        Channel
                        <select aria-label="Channel" name="channel">
                          {[
                            "Introduction",
                            "Email",
                            "Call",
                            "Meeting",
                            "Research",
                          ].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Target date
                        <input type="date" name="due" />
                      </label>
                      <label className="full">
                        Objective / what to learn
                        <textarea
                          aria-label="Objective / what to learn"
                          name="objective"
                          required
                          maxLength={2000}
                        />
                      </label>
                      <label className="full">
                        Message for this step
                        <textarea
                          aria-label="Message for this step"
                          name="message"
                          maxLength={2000}
                        />
                      </label>
                      <label className="full">
                        Why this step, in this order?
                        <textarea
                          aria-label="Why this step, in this order?"
                          name="rationale"
                          required
                          maxLength={2000}
                        />
                      </label>
                    </div>
                    <button className="primary">Add sequence step</button>
                  </form>
                </details>
              </section>
            </>
          )}
          {view === "Activity" && (
            <section className="card form-card">
              <h2>Progress and decisions</h2>
              <p>
                {progress.percent}% of planned steps complete ·{" "}
                {progress.blocked} blocked
              </p>
              <p>
                Current decision:{" "}
                <strong>{account.decision || "Undecided"}</strong> ·{" "}
                {account.decisionReason || "No reason recorded"}
              </p>
              <p>Review date: {account.reviewDate || "Not scheduled"}</p>
              <h3>Sequence progress</h3>
              {account.steps?.length ? (
                account.steps.map((s, i) => (
                  <div className="activity-row" key={s.id}>
                    <strong>
                      {i + 1}. {s.title}
                    </strong>
                    <span className="badge">{s.status}</span>
                    <p>
                      {s.due || "No date"} · {s.objective}
                    </p>
                  </div>
                ))
              ) : (
                <p>No actions recorded yet.</p>
              )}
              <h3>Decision journal</h3>
              {context.accounts.filter((a) => a.name === account.name).length >
                1 &&
                data.journal.some(
                  (j) => !j.accountId && j.company === account.name,
                ) && (
                  <p className="notice">
                    Some legacy decisions use this shared company name without
                    an account link. They remain in the general journal; choose
                    their Linked account there to associate them safely.
                  </p>
                )}
              {data.journal
                .filter(
                  (j) =>
                    j.accountId === account.id ||
                    (!j.accountId &&
                      j.company === account.name &&
                      context.accounts.filter((a) => a.name === account.name)
                        .length === 1),
                )
                .map((j) => (
                  <article className="activity-row" key={j.id}>
                    <time>{new Date(j.date).toLocaleDateString()}</time>
                    <p className="notes">{j.decision}</p>
                    <p>Outcome: {j.outcome || "Not yet recorded"}</p>
                  </article>
                ))}
              <button className="text-button" onClick={onJournal}>
                Open decision journal to record an outcome
              </button>
            </section>
          )}
          {view === "Evidence & review" && (
            <ContextWorkspace
              key={account.id}
              data={data}
              onChange={onChange}
              view="accounts"
              member={member}
              initialAccount={account.id}
              embedded
              onJournal={onJournal}
            />
          )}
        </>
      )}
    </div>
  );
}
