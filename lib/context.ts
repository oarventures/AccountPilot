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
export type Account = {
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
