"use client";
import { useState } from "react";
import type { Demo } from "@/lib/strategy";
import { scoreOpportunity } from "@/lib/strategy";
import {
  Account,
  Context,
  Document,
  Evidence,
  accountFields,
  allDocuments,
  attachmentError,
  blankAccount,
  brief,
  initializeContext,
  exportBrief,
  recordAccountDecision,
  AccountDecision,
} from "@/lib/context";
const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const solutionFields = [
  ["overview", "Solution overview"],
  ["benefits", "Benefits and business outcomes"],
  ["idealCustomer", "Ideal customer profile"],
  ["differentiators", "Differentiators and alternatives"],
  ["proof", "Proof points (with sources)"],
  ["limitations", "Limitations / poor-fit customers"],
] as const;
function saveFile(doc: Document) {
  const encoded = doc.dataUrl.split(",")[1];
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(
    new Blob([bytes], { type: doc.dataUrl.slice(5, doc.dataUrl.indexOf(";")) }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Documents({
  member = false,
  docs,
  context,
  onChange,
  label,
}: {
  member?: boolean;
  docs: Document[];
  context: Context;
  onChange: (docs: Document[]) => void;
  label: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="document-section">
      <h3>{label}</h3>
      <p className="muted">
        {member
          ? "Files are stored in your account when you save the private workspace. "
          : "Fictional files only. Stored in this browser, never uploaded to a server. "}
        PDF/DOCX are attachments only; their contents are not read or analyzed.
        TXT/Markdown can be read as plain text. Maximum 350 KB per file, 800 KB
        across the workspace.
      </p>
      <label>
        Attach a fictional document
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          disabled={busy}
          onChange={async (e) => {
            const input = e.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            setError("");
            const problem = attachmentError(
              file.name,
              file.size,
              allDocuments(context).reduce((n, d) => n + d.bytes, 0),
            );
            if (problem) {
              setError(problem);
              input.value = "";
              return;
            }
            setBusy(true);
            try {
              const buffer = new Uint8Array(await file.arrayBuffer());
              const ext = file.name.split(".").pop()?.toLowerCase();
              if (
                ext === "pdf" &&
                new TextDecoder().decode(buffer.slice(0, 5)) !== "%PDF-"
              )
                throw new Error("This file does not have a PDF header.");
              if (ext === "docx" && (buffer[0] !== 80 || buffer[1] !== 75))
                throw new Error(
                  "This file does not have a DOCX archive header.",
                );
              const type =
                ext === "pdf"
                  ? "application/pdf"
                  : ext === "docx"
                    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    : ext === "md"
                      ? "text/markdown"
                      : "text/plain";
              const text =
                ext === "txt" || ext === "md"
                  ? new TextDecoder().decode(buffer)
                  : "";
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(String(r.result));
                r.onerror = () =>
                  reject(new Error("Could not read this file."));
                r.readAsDataURL(new Blob([buffer], { type }));
              });
              onChange([
                ...docs,
                {
                  id: uid(),
                  name: file.name,
                  bytes: file.size,
                  added: new Date().toISOString(),
                  dataUrl,
                  text,
                },
              ]);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Could not read the file.",
              );
            } finally {
              setBusy(false);
              input.value = "";
            }
          }}
        />
      </label>
      {busy && <p role="status">Reading file into this workspace…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!docs.length && (
        <p className="muted">
          No documents attached yet. You can write the context below without
          attaching a file.
        </p>
      )}
      <ul className="document-list">
        {docs.map((d) => (
          <li key={d.id}>
            <div>
              <strong>{d.name}</strong>
              <small>
                {Math.ceil(d.bytes / 1000)} KB · added {d.added.slice(0, 10)} ·{" "}
                {d.text
                  ? "Plain text available"
                  : "Attachment only; not analyzed"}
              </small>
              {d.text && (
                <details>
                  <summary>Read plain text</summary>
                  <pre className="document-text">{d.text}</pre>
                </details>
              )}
            </div>
            <div className="row-actions">
              <button onClick={() => saveFile(d)}>Download</button>
              <button
                aria-label={"Remove " + d.name}
                onClick={() => {
                  if (
                    confirm(
                      "Remove this attachment? Evidence notes are retained, but its file citation will be marked unavailable.",
                    )
                  )
                    onChange(docs.filter((x) => x.id !== d.id));
                }}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
export default function ContextWorkspace({
  data,
  onChange,
  view,
  onJournal,
  initialAccount,
  member = false,
}: {
  data: Demo;
  onChange: (data: Demo) => void;
  view: "solution" | "accounts";
  onJournal: () => void;
  initialAccount?: string;
  member?: boolean;
}) {
  const context = data.context || initializeContext(data);
  const [selected, setSelected] = useState(
    initialAccount || context.accounts[0]?.id || "",
  );
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"plan" | "brief">("plan");
  const account = context.accounts.find((a) => a.id === selected);
  const update = (next: Context) => onChange({ ...data, context: next });
  const updateAccount = (next: Account) =>
    update({
      ...context,
      accounts: context.accounts.map((a) => (a.id === next.id ? next : a)),
    });
  const evidenceDocs = account
    ? [...context.solution.documents, ...account.documents]
    : [];
  function citation(e: Evidence) {
    const doc = evidenceDocs.find((d) => d.id === e.documentId);
    return (
      <>
        <span>
          {e.source || "No source recorded"} · {e.date || "No source date"}
        </span>
        {e.documentId && (
          <span> · {doc ? doc.name : "Attachment removed / unavailable"}</span>
        )}
        {e.quote && (
          <blockquote className="notes">
            “{e.quote}”
            <small>
              {doc?.text
                ? doc.text.includes(e.quote)
                  ? "Exact passage found in the attached plain-text file."
                  : "Passage not found in attached text; verify this citation."
                : "Founder-entered passage; not independently verified."}
            </small>
          </blockquote>
        )}
      </>
    );
  }
  const strategy = account
    ? brief(account, context.solution, data.opportunities, data.profile)
    : null;
  return (
    <div className="context-workspace">
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {view === "solution" ? (
        <>
          <section className="card form-card">
            <h2>Your solution context</h2>
            <p className="muted">
              Explain what you sell, who benefits, and where it does not fit.
              This is separate from your founder’s capacity and revenue goals.
              Briefs use these saved inputs; no AI or automatic document
              synthesis is involved.
            </p>
            <form
              key={JSON.stringify(context.solution)}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const solution = { ...context.solution };
                for (const [key] of solutionFields)
                  solution[key] = String(f.get(key)).trim();
                update({
                  ...context,
                  solution,
                  accounts: context.accounts.map((a) => ({
                    ...a,
                    reviewed: "",
                  })),
                });
                setNotice(
                  "Solution context updated. Account briefs now use these inputs. In member mode, click Save private workspace to persist.",
                );
              }}
            >
              <div className="form-grid">
                {solutionFields.map(([key, label]) => (
                  <label key={key} className="full">
                    {label}
                    <textarea
                      aria-label={label}
                      name={key}
                      maxLength={8000}
                      defaultValue={context.solution[key]}
                      placeholder="Use fictional information and identify assumptions."
                    />
                  </label>
                ))}
              </div>
              <button className="primary">Save solution context</button>
            </form>
          </section>
          <section className="card form-card">
            <Documents
              member={member}
              docs={context.solution.documents}
              context={context}
              label="Solution documents and one-pagers"
              onChange={(documents) =>
                update({
                  ...context,
                  solution: { ...context.solution, documents },
                  accounts: context.accounts.map((a) => ({
                    ...a,
                    reviewed: "",
                  })),
                })
              }
            />
          </section>
        </>
      ) : (
        <>
          <section className="card form-card">
            <div className="section-title">
              <div>
                <h2>Account workspaces</h2>
                <p>
                  An account keeps its plan, evidence, and people across
                  multiple opportunities.
                </p>
              </div>
            </div>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const name = String(f.get("name")).trim();
                if (!name) return;
                if (
                  context.accounts.some(
                    (a) => a.name.toLowerCase() === name.toLowerCase(),
                  )
                ) {
                  setNotice(
                    "An account with this name already exists. Select it below.",
                  );
                  return;
                }
                const a = blankAccount(uid(), name);
                update({ ...context, accounts: [...context.accounts, a] });
                setSelected(a.id);
                setMode("plan");
                setNotice("Account created. Add its plan and evidence.");
                e.currentTarget.reset();
              }}
            >
              <label>
                New fictional account name
                <input name="name" required maxLength={100} />
              </label>
              <button className="primary">Create account</button>
            </form>
            {context.accounts.length ? (
              <label className="account-select">
                Select account
                <select
                  aria-label="Select account"
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setNotice("");
                  }}
                >
                  <option value="">Choose an account</option>
                  {context.accounts.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="empty">
                No accounts yet. Create one above to start a plan.
              </p>
            )}
          </section>
          {account && strategy && (
            <>
              <div className="account-heading">
                <div>
                  <h2>{account.name}</h2>
                  <p className="muted">
                    {strategy.linked.length} linked opportunities ·{" "}
                    {account.reviewed
                      ? "Last founder review: " +
                        new Date(account.reviewed).toLocaleString()
                      : "Not yet reviewed by founder"}
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    className={mode === "plan" ? "primary" : ""}
                    onClick={() => setMode("plan")}
                  >
                    Account plan
                  </button>
                  <button
                    className={mode === "brief" ? "primary" : ""}
                    onClick={() => setMode("brief")}
                  >
                    Strategic brief
                  </button>
                </div>
              </div>
              <section className="card form-card decision-card">
                <div className="section-title">
                  <div>
                    <h2>Your decision and next contact</h2>
                    <p>
                      Current decision:{" "}
                      <strong>{account.decision || "Undecided"}</strong>
                      {account.reviewDate
                        ? ` · Review on ${account.reviewDate}`
                        : " · No review date set"}
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob([exportBrief(account, context.solution)], {
                          type: "text/markdown;charset=utf-8",
                        }),
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${account.name.replace(/[^a-z0-9-]/gi, "-")}-brief.md`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    Download account brief
                  </button>
                </div>
                <label className="account-select">
                  Chosen next contact
                  <select
                    aria-label="Chosen next contact"
                    value={account.primaryContactId || ""}
                    onChange={(e) =>
                      updateAccount({
                        ...account,
                        primaryContactId: e.target.value,
                        reviewed: "",
                      })
                    }
                  >
                    <option value="">
                      Not selected — needs founder judgment
                    </option>
                    {account.people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.role || "Role unknown"}
                      </option>
                    ))}
                  </select>
                </label>
                <form
                  key={
                    account.id +
                    account.decision +
                    account.decisionReason +
                    account.reviewDate
                  }
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    try {
                      onChange(
                        recordAccountDecision(
                          data,
                          account.id,
                          String(f.get("decision")) as AccountDecision,
                          String(f.get("reason")),
                          String(f.get("reviewDate")),
                          new Date().toISOString(),
                          uid(),
                        ),
                      );
                      setNotice(
                        "Decision saved and recorded in your journal. Review dates are reminders for you, not automatic notifications.",
                      );
                    } catch (error) {
                      setNotice(
                        error instanceof Error
                          ? error.message
                          : "Could not record decision.",
                      );
                    }
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Pursuit decision
                      <select
                        aria-label="Pursuit decision"
                        name="decision"
                        defaultValue={
                          account.decision === "Undecided"
                            ? ""
                            : account.decision || ""
                        }
                        required
                      >
                        <option value="" disabled>
                          Choose your decision
                        </option>
                        <option>Pursue</option>
                        <option>Nurture</option>
                        <option>Pause</option>
                      </select>
                    </label>
                    <label>
                      Review date (optional)
                      <input
                        type="date"
                        name="reviewDate"
                        defaultValue={account.reviewDate || ""}
                      />
                    </label>
                    <label className="full">
                      Reason for this decision
                      <textarea
                        aria-label="Reason for this decision"
                        name="reason"
                        required
                        maxLength={4000}
                        defaultValue={account.decisionReason || ""}
                      />
                    </label>
                  </div>
                  <button className="primary">Save decision to journal</button>
                </form>
              </section>
              {mode === "plan" ? (
                <>
                  <section className="card form-card">
                    <h2>The account plan</h2>
                    <p className="muted">
                      Save your reasoning explicitly. These are founder
                      judgments, not verified facts. Attach a longer account
                      plan below and capture the relevant passages as evidence.
                    </p>
                    <form
                      key={
                        account.id +
                        JSON.stringify(accountFields.map(([k]) => account[k]))
                      }
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const a = { ...account, reviewed: "" };
                        for (const [key] of accountFields)
                          a[key] = String(f.get(key)).trim();
                        a.name = String(f.get("accountName")).trim();
                        if (!a.name) return;
                        updateAccount(a);
                        setNotice(
                          "Account plan updated. Review its strategic brief next. In member mode, click Save private workspace to persist.",
                        );
                      }}
                    >
                      <div className="form-grid">
                        <label className="full">
                          Account name
                          <input
                            name="accountName"
                            required
                            maxLength={100}
                            defaultValue={account.name}
                          />
                        </label>
                        {accountFields.map(([key, label]) => (
                          <label className="full" key={key}>
                            {label}
                            <textarea
                              aria-label={label}
                              name={key}
                              maxLength={8000}
                              defaultValue={account[key]}
                            />
                          </label>
                        ))}
                      </div>
                      <button className="primary">Save account plan</button>
                    </form>
                  </section>
                  <section className="card form-card">
                    <Documents
                      member={member}
                      context={context}
                      docs={account.documents}
                      label="Account plans and research attachments"
                      onChange={(documents) =>
                        updateAccount({ ...account, documents, reviewed: "" })
                      }
                    />
                  </section>
                  <section className="card form-card">
                    <h2>Evidence, interpretation, and open questions</h2>
                    <p className="muted">
                      “Documented” means you recorded a source, not that
                      AccountPilot verified it. A source date helps you judge
                      freshness. Evidence never silently changes PILOT ratings.
                    </p>
                    <form
                      key={"evidence-" + account.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const kind = String(f.get("kind")) as Evidence["kind"];
                        const item: Evidence = {
                          id: uid(),
                          kind,
                          topic: String(f.get("topic")) as Evidence["topic"],
                          statement: String(f.get("statement")).trim(),
                          source: String(f.get("source")).trim(),
                          date: String(f.get("date")),
                          documentId: String(f.get("documentId")),
                          quote: String(f.get("quote")).trim(),
                        };
                        if (!item.statement) return;
                        if (
                          kind === "Documented information" &&
                          (!item.source || !item.date)
                        ) {
                          setNotice(
                            "Documented information needs a source description and source date.",
                          );
                          return;
                        }
                        updateAccount({
                          ...account,
                          evidence: [...account.evidence, item],
                          reviewed: "",
                        });
                        setNotice("Evidence entry saved.");
                        e.currentTarget.reset();
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Entry type
                          <select name="kind" aria-label="Entry type">
                            <option>Documented information</option>
                            <option>Founder interpretation</option>
                            <option>Open question</option>
                          </select>
                        </label>
                        <label>
                          Topic
                          <select name="topic" aria-label="Topic">
                            <option>Account fit</option>
                            <option>Solution fit</option>
                            <option>Timing</option>
                            <option>People</option>
                          </select>
                        </label>
                        <label className="full">
                          Statement / question
                          <textarea
                            aria-label="Statement / question"
                            name="statement"
                            required
                            maxLength={4000}
                          />
                        </label>
                        <label>
                          Source description (required for documented
                          information)
                          <input
                            name="source"
                            maxLength={500}
                            placeholder="e.g. Fictional discovery notes, page 2"
                          />
                        </label>
                        <label>
                          Source date (required for documented information)
                          <input type="date" name="date" max={today()} />
                        </label>
                        <label className="full">
                          Related attachment (optional)
                          <select
                            name="documentId"
                            aria-label="Related attachment (optional)"
                          >
                            <option value="">
                              No attachment / external source described above
                            </option>
                            {evidenceDocs.map((d) => (
                              <option value={d.id} key={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="full">
                          Supporting passage (optional)
                          <textarea
                            aria-label="Supporting passage (optional)"
                            name="quote"
                            maxLength={4000}
                            placeholder="Copy a relevant passage. PDF and DOCX passages must be entered manually."
                          />
                        </label>
                      </div>
                      <button className="primary">Add evidence entry</button>
                    </form>
                    <div className="evidence-list">
                      {!account.evidence.length && (
                        <p className="muted">
                          No evidence recorded. Start with a source or an open
                          question.
                        </p>
                      )}
                      {account.evidence.map((e) => (
                        <article key={e.id}>
                          <span className="badge">
                            {e.kind} · {e.topic}
                          </span>
                          <p className="notes">{e.statement}</p>
                          <div className="muted">{citation(e)}</div>
                          <button
                            className="text-button"
                            onClick={() => {
                              if (confirm("Delete this evidence entry?"))
                                updateAccount({
                                  ...account,
                                  evidence: account.evidence.filter(
                                    (x) => x.id !== e.id,
                                  ),
                                  reviewed: "",
                                });
                            }}
                          >
                            Delete evidence entry
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                  <section className="card form-card">
                    <h2>People and relationship paths</h2>
                    <p className="muted">
                      Use fictional names. Unknown authority should remain
                      unknown.
                    </p>
                    <form
                      key={"people-" + account.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const p = {
                          id: uid(),
                          name: String(f.get("person")).trim(),
                          role: String(f.get("role")).trim(),
                          path: String(f.get("path")).trim(),
                          authority: String(f.get("authority")).trim(),
                        };
                        if (!p.name) return;
                        updateAccount({
                          ...account,
                          people: [...account.people, p],
                          reviewed: "",
                        });
                        e.currentTarget.reset();
                        setNotice("Stakeholder added.");
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Person / role placeholder
                          <input name="person" required maxLength={100} />
                        </label>
                        <label>
                          Role in the account
                          <input name="role" maxLength={200} />
                        </label>
                        <label>
                          Relationship / introduction path
                          <input name="path" maxLength={500} />
                        </label>
                        <label>
                          Buying authority / what is unknown
                          <input name="authority" maxLength={500} />
                        </label>
                      </div>
                      <button className="primary">Add stakeholder</button>
                    </form>
                    {!account.people.length && (
                      <p className="muted">No stakeholder mapped yet.</p>
                    )}
                    {account.people.map((p) => (
                      <article className="stakeholder" key={p.id}>
                        <h3>{p.name}</h3>
                        <p>
                          Role: {p.role || "Unknown"} · Access:{" "}
                          {p.path || "Unknown"} · Authority:{" "}
                          {p.authority || "Unknown"}
                        </p>
                        <button
                          className="text-button"
                          onClick={() => {
                            if (confirm("Remove this stakeholder?"))
                              updateAccount({
                                ...account,
                                primaryContactId:
                                  account.primaryContactId === p.id
                                    ? ""
                                    : account.primaryContactId,
                                people: account.people.filter(
                                  (x) => x.id !== p.id,
                                ),
                                reviewed: "",
                              });
                          }}
                        >
                          Remove stakeholder
                        </button>
                      </article>
                    ))}
                  </section>
                </>
              ) : (
                <>
                  <section className="card form-card">
                    <div className="eyebrow">
                      FOUNDER-REVIEWED JUDGMENT · NO AI
                    </div>
                    <h2>{strategy.status}</h2>
                    <p className="muted">
                      This brief organizes your saved inputs. It does not read
                      PDF/DOCX files, infer facts, generate research, or decide
                      whether you should buy or sell. PILOT scores summarize
                      your separate opportunity ratings; supporting evidence
                      must be reviewed by you.
                    </p>
                    <div className="brief-grid">
                      <article>
                        <h3>Solution context</h3>
                        {solutionFields.map(([k, label]) => (
                          <p key={k}>
                            <strong>{label}:</strong>{" "}
                            {context.solution[k] || "Not recorded"}
                          </p>
                        ))}
                      </article>
                      <article>
                        <h3>Account judgment</h3>
                        {accountFields.map(([k, label]) => (
                          <p className="notes" key={k}>
                            <strong>{label}:</strong>{" "}
                            {account[k] ||
                              "Not recorded — needs founder judgment"}
                          </p>
                        ))}
                      </article>
                    </div>
                    <h3>Who to engage</h3>
                    {account.people.length ? (
                      account.people.map((p) => (
                        <p key={p.id}>
                          {p.name} · {p.role || "Role unknown"} ·{" "}
                          {p.path || "Access unknown"} ·{" "}
                          {p.authority || "Authority unknown"}
                        </p>
                      ))
                    ) : (
                      <p>
                        No person or relationship path recorded. Identify the
                        problem owner before selecting a target.
                      </p>
                    )}
                    {(["documented", "interpretations", "open"] as const).map(
                      (key, i) => (
                        <section className="brief-evidence" key={key}>
                          <h3>
                            {
                              [
                                "What we have documented (source not independently verified)",
                                "What we think — founder interpretations",
                                "What we need to learn — recorded questions",
                              ][i]
                            }
                          </h3>
                          {strategy[key].length ? (
                            strategy[key].map((e) => (
                              <article key={e.id}>
                                <strong>{e.topic}</strong>
                                <p className="notes">{e.statement}</p>
                                <div className="muted">{citation(e)}</div>
                              </article>
                            ))
                          ) : (
                            <p>No entries recorded.</p>
                          )}
                        </section>
                      ),
                    )}
                    <h3>Additional evidence gaps</h3>
                    {strategy.questions.length ? (
                      <ul>
                        {strategy.questions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        No template gaps detected. This does not validate the
                        evidence or guarantee a good opportunity.
                      </p>
                    )}
                    <h3>Linked opportunities and PILOT summary</h3>
                    {strategy.linked.length ? (
                      strategy.linked.map((o) => {
                        const r = scoreOpportunity(o, data.profile);
                        return (
                          <details className="method" key={o.id}>
                            <summary>
                              {o.company} · {r.score}/100 · {r.confidence} input
                              completeness
                            </summary>
                            {r.rationale.map((s) => (
                              <p key={s}>{s}</p>
                            ))}
                            {r.gaps.map((g) => (
                              <p key={g}>Gap: {g}</p>
                            ))}
                          </details>
                        );
                      })
                    ) : (
                      <p>
                        No linked opportunities. Use the opportunity editor to
                        associate a deal with this account.
                      </p>
                    )}
                    <div className="brief-actions">
                      <button
                        className="primary"
                        onClick={() => {
                          updateAccount({
                            ...account,
                            reviewed: new Date().toISOString(),
                          });
                          setNotice(
                            "Founder review recorded. This is an acknowledgment, not automatic verification.",
                          );
                        }}
                      >
                        Mark brief reviewed
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          onChange({
                            ...data,
                            journal: [
                              {
                                id: uid(),
                                date: new Date().toISOString(),
                                company: account.name,
                                decision: `Account review — ${account.name}\nHypothesis: ${account.hypothesis || "Not recorded"}\nNext action: ${account.nextAction || "Not recorded"}\nMessage hypothesis: ${account.message || "Not recorded"}\nPause condition: ${account.pause || "Not recorded"}\nOpen template gaps: ${strategy.questions.length}`,
                                outcome: "",
                              },
                              ...data.journal,
                            ],
                          });
                          onJournal();
                        }}
                      >
                        Record brief snapshot in decision journal
                      </button>
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
