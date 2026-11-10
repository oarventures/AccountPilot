import type { Demo, Opportunity, Profile } from "./strategy";
export type Document = {
  id: string;
  name: string;
  bytes: number;
  added: string;
  dataUrl: string;
  text: string;
};
export type Solution = {
  overview: string;
  benefits: string;
  idealCustomer: string;
  differentiators: string;
  proof: string;
  limitations: string;
  documents: Document[];
};
export type Evidence = {
  id: string;
  kind: "Documented information" | "Founder interpretation" | "Open question";
  topic: "Account fit" | "Solution fit" | "Timing" | "People";
  statement: string;
  source: string;
  date: string;
  documentId: string;
  quote: string;
};
export type Stakeholder = {
  id: string;
  name: string;
  role: string;
  path: string;
  authority: string;
};
export type AccountDecision = "Undecided" | "Pursue" | "Nurture" | "Pause";
export type Account = {
  primaryContactId?: string;
  decision?: AccountDecision;
  decisionReason?: string;
  reviewDate?: string;
  id: string;
  name: string;
  whyAccount: string;
  whySolution: string;
  whyNow: string;
  hypothesis: string;
  nextAction: string;
  message: string;
  pause: string;
  documents: Document[];
  evidence: Evidence[];
  people: Stakeholder[];
  reviewed: string;
};
export type Context = { version: 1; solution: Solution; accounts: Account[] };
export const accountFields = [
  ["whyAccount", "Why this account?"],
  ["whySolution", "Why this solution?"],
  ["whyNow", "Why now?"],
  ["hypothesis", "Our hypothesis / what would change our mind"],
  ["nextAction", "Next action and what it should validate"],
  ["message", "Account-specific message hypothesis"],
  ["pause", "Reasons to pause or disqualify"],
] as const;
export function blankAccount(id: string, name: string): Account {
  return {
    id,
    name,
    whyAccount: "",
    whySolution: "",
    whyNow: "",
    hypothesis: "",
    nextAction: "",
    message: "",
    pause: "",
    documents: [],
    evidence: [],
    people: [],
    reviewed: "",
    primaryContactId: "",
    decision: "Undecided",
    decisionReason: "",
    reviewDate: "",
  };
}
export function initializeContext(data: Demo): Context {
  const accounts: Account[] = [];
  for (const o of data.opportunities)
    if (!accounts.some((a) => a.name.toLowerCase() === o.company.toLowerCase()))
      accounts.push(blankAccount(o.accountId || o.id, o.company));
  return {
    version: 1,
    solution: {
      overview: data.profile.offering,
      idealCustomer: data.profile.buyer,
      benefits: "",
      differentiators: "",
      proof: "",
      limitations: "",
      documents: [],
    },
    accounts,
  };
}
export function linkedOpportunities(
  account: Account,
  opportunities: Opportunity[],
) {
  return opportunities.filter(
    (o) => o.accountId === account.id || (!o.accountId && o.id === account.id),
  );
}
export function brief(
  account: Account,
  solution: Solution,
  opportunities: Opportunity[],
  profile: Profile,
) {
  const linked = linkedOpportunities(account, opportunities);
  const questions: string[] = [];
  if (!solution.overview.trim() || !solution.benefits.trim())
    questions.push(
      "Describe the offering and its benefits before judging solution fit.",
    );
  if (!account.whyAccount.trim())
    questions.push(
      "Why is this account worth pursuing, and what could disqualify it?",
    );
  if (!account.whySolution.trim())
    questions.push(
      "Which specific account problem connects to which solution benefit?",
    );
  if (!account.whyNow.trim())
    questions.push("Is there a confirmed trigger or buying window?");
  const primaryContact = account.people.find(
    (p) => p.id === account.primaryContactId,
  );
  if (account.people.length && !primaryContact)
    questions.push(
      "Choose the next contact explicitly; adding a person does not make them the target.",
    );
  if (!account.people.length)
    questions.push("Who owns the problem, and how can you reach them?");
  if (!account.hypothesis.trim())
    questions.push(
      "State your account hypothesis and what would change your mind.",
    );
  if (!account.message.trim())
    questions.push(
      "Draft an account-specific message hypothesis grounded in the recorded evidence.",
    );
  if (!account.nextAction.trim())
    questions.push(
      "What is the smallest next action that would reduce uncertainty?",
    );
  for (const topic of [
    "Account fit",
    "Solution fit",
    "Timing",
    "People",
  ] as const)
    if (
      !account.evidence.some(
        (e) =>
          e.kind === "Documented information" &&
          e.topic === topic &&
          e.source.trim() &&
          e.date,
      )
    )
      questions.push(`Record a dated source for ${topic.toLowerCase()}.`);
  if (!account.pause.trim())
    questions.push(
      "What evidence would make you pause or disqualify this account?",
    );
  if (linked.some((o) => o.effort > profile.capacity))
    questions.push(
      "A linked opportunity exceeds your monthly sales capacity; reduce scope or defer.",
    );
  return {
    linked,
    primaryContact,
    questions,
    documented: account.evidence.filter(
      (e) => e.kind === "Documented information",
    ),
    interpretations: account.evidence.filter(
      (e) => e.kind === "Founder interpretation",
    ),
    open: account.evidence.filter((e) => e.kind === "Open question"),
    status: !account.nextAction.trim()
      ? "Explore before committing"
      : questions.length
        ? "Validate before pursuing"
        : "Ready for founder review",
  };
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof v[k] === "string");
function documents(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every(
      (d) =>
        object(d) &&
        strings(d, ["id", "name", "added", "dataUrl", "text"]) &&
        typeof d.bytes === "number" &&
        d.bytes >= 0 &&
        d.bytes <= 350000 &&
        typeof d.dataUrl === "string" &&
        /^data:(application\/(pdf|vnd.openxmlformats-officedocument.wordprocessingml.document)|text\/(plain|markdown));base64,[A-Za-z0-9+/=]*$/.test(
          d.dataUrl,
        ),
    )
  );
}
export function validContext(v: unknown): v is Context {
  return (
    object(v) &&
    v.version === 1 &&
    object(v.solution) &&
    strings(v.solution, [
      "overview",
      "benefits",
      "idealCustomer",
      "differentiators",
      "proof",
      "limitations",
    ]) &&
    documents(v.solution.documents) &&
    Array.isArray(v.accounts) &&
    v.accounts.every(
      (a) =>
        object(a) &&
        (a.primaryContactId === undefined ||
          typeof a.primaryContactId === "string") &&
        (a.decision === undefined ||
          (typeof a.decision === "string" &&
            ["Undecided", "Pursue", "Nurture", "Pause"].includes(
              a.decision,
            ))) &&
        (a.decisionReason === undefined ||
          typeof a.decisionReason === "string") &&
        (a.reviewDate === undefined || typeof a.reviewDate === "string") &&
        strings(a, [
          "id",
          "name",
          "whyAccount",
          "whySolution",
          "whyNow",
          "hypothesis",
          "nextAction",
          "message",
          "pause",
          "reviewed",
        ]) &&
        documents(a.documents) &&
        Array.isArray(a.people) &&
        a.people.every(
          (p) =>
            object(p) &&
            strings(p, ["id", "name", "role", "path", "authority"]),
        ) &&
        Array.isArray(a.evidence) &&
        a.evidence.every(
          (e) =>
            object(e) &&
            strings(e, [
              "id",
              "kind",
              "topic",
              "statement",
              "source",
              "date",
              "documentId",
              "quote",
            ]) &&
            [
              "Documented information",
              "Founder interpretation",
              "Open question",
            ].includes(String(e.kind)) &&
            ["Account fit", "Solution fit", "Timing", "People"].includes(
              String(e.topic),
            ),
        ),
    )
  );
}
export function allDocuments(context: Context) {
  return [
    ...context.solution.documents,
    ...context.accounts.flatMap((a) => a.documents),
  ];
}
export const MAX_FILE = 350000,
  MAX_TOTAL = 800000;
export function attachmentError(name: string, bytes: number, total: number) {
  if (!/\.(pdf|docx|txt|md)$/i.test(name))
    return "Use PDF, DOCX, TXT, or Markdown files.";
  if (bytes === 0) return "This file is empty.";
  if (bytes > MAX_FILE)
    return "Each file must be 350 KB or smaller for this browser-only demo.";
  if (bytes + total > MAX_TOTAL)
    return "Attachments are limited to 800 KB total. Remove a file before adding another.";
  return "";
}
/** Upgrade the original browser demo without replacing profile, notes, or journal entries. */
export function migrateDemo(data: Demo): Demo {
  const context = data.context || initializeContext(data);
  return {
    ...data,
    context,
    opportunities: data.opportunities.map((o) => ({
      ...o,
      accountId:
        o.accountId ||
        context.accounts.find(
          (a) => a.name.toLowerCase() === o.company.toLowerCase(),
        )?.id,
    })),
  };
}
export function saveOpportunity(data: Demo, opportunity: Opportunity): Demo {
  const current = migrateDemo(data);
  const context = current.context!;
  const name = opportunity.company.trim();
  let account =
    context.accounts.find((a) => a.id === opportunity.accountId) ||
    context.accounts.find((a) => a.name.toLowerCase() === name.toLowerCase());
  let next = context;
  if (!account) {
    account = blankAccount(opportunity.id, name);
    next = { ...context, accounts: [...context.accounts, account] };
  }
  return {
    ...current,
    context: {
      ...next,
      accounts: next.accounts.map((a) =>
        a.id === account.id ? { ...a, reviewed: "" } : a,
      ),
    },
    opportunities: [
      ...current.opportunities.filter((o) => o.id !== opportunity.id),
      { ...opportunity, company: name, accountId: account.id },
    ],
  };
}

export function recordAccountDecision(
  data: Demo,
  accountId: string,
  decision: AccountDecision,
  reason: string,
  reviewDate: string,
  now: string,
  id: string,
): Demo {
  const current = migrateDemo(data);
  const account = current.context!.accounts.find((a) => a.id === accountId);
  if (!account) throw new Error("Select an existing account.");
  if (!["Pursue", "Nurture", "Pause"].includes(decision) || !reason.trim())
    throw new Error("Choose pursue, nurture, or pause and record your reason.");
  return {
    ...current,
    context: {
      ...current.context!,
      accounts: current.context!.accounts.map((a) =>
        a.id === accountId
          ? {
              ...a,
              decision,
              decisionReason: reason.trim(),
              reviewDate,
              reviewed: now,
            }
          : a,
      ),
    },
    journal: [
      {
        id,
        date: now,
        company: account.name,
        decision: `${decision} — ${reason.trim()}\nNext action: ${account.nextAction || "Not recorded"}\nReview date: ${reviewDate || "Not scheduled"}`,
        outcome: "",
      },
      ...current.journal,
    ],
  };
}
export function exportBrief(account: Account, solution: Solution): string {
  const documents = [...solution.documents, ...account.documents];
  const contact = account.people.find((p) => p.id === account.primaryContactId);
  return [
    `# ${account.name} — AccountPilot brief`,
    "Demo only. Founder-entered information; not independently verified. No AI synthesis.",
    `## Decision\n${account.decision || "Undecided"}\n${account.decisionReason || "No reason recorded"}\nReview date: ${account.reviewDate || "Not scheduled"}`,
    `## Solution context\nOverview: ${solution.overview || "Not recorded"}\nBenefits: ${solution.benefits || "Not recorded"}\nIdeal customer: ${solution.idealCustomer || "Not recorded"}\nDifferentiators: ${solution.differentiators || "Not recorded"}\nProof: ${solution.proof || "Not recorded"}\nLimitations: ${solution.limitations || "Not recorded"}`,
    ...accountFields.map(
      ([key, label]) => `## ${label}\n${account[key] || "Not recorded"}`,
    ),
    `## Selected next contact\n${contact ? `${contact.name} — ${contact.role || "Role unknown"}\nAccess: ${contact.path || "Unknown"}\nAuthority: ${contact.authority || "Unknown"}` : "Not selected; do not infer a target."}`,
    `## Evidence, interpretations and questions\n${account.evidence.length ? account.evidence.map((e) => `### ${e.kind} — ${e.topic}\n${e.statement}\nSource: ${e.source || "Not recorded"}; date: ${e.date || "Not recorded"}${e.documentId ? "\nAttachment: " + (documents.find((d) => d.id === e.documentId)?.name || "Unavailable") : ""}${e.quote ? "\nFounder-entered passage (verify source): " + e.quote : ""}`).join("\n\n") : "No entries recorded."}`,
  ].join("\n\n");
}
