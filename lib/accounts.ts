import type { Account, Context, Document } from "./context";
export type AccountStage =
  "Target" | "Researching" | "Engaged" | "Qualified" | "Parked";
export type ApproachStep = {
  id: string;
  title: string;
  personId: string;
  persona: string;
  channel: "Introduction" | "Email" | "Call" | "Meeting" | "Research";
  objective: string;
  message: string;
  rationale: string;
  due: string;
  status: "Planned" | "Done" | "Blocked";
};
export function normalizeDomain(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/\s/.test(value))
    throw new Error("Enter a company domain or website URL without spaces.");
  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new Error("Enter a valid domain, such as example.com.");
  }
  const domain = url.hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !domain.includes(".") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(domain) ||
    !domain
      .split(".")
      .every((part) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(part))
  )
    throw new Error(
      "Use a company website domain, not an email, IP address, or non-web link.",
    );
  return domain;
}
export function identityError(
  accounts: Account[],
  id: string,
  name: string,
  domain: string,
) {
  if (!name.trim()) return "Company name is required.";
  let normalized: string;
  try {
    normalized = normalizeDomain(domain);
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid domain.";
  }
  if (!normalized)
    return "Add the company domain to distinguish it from businesses with the same name.";
  if (accounts.some((a) => a.id !== id && a.domain === normalized))
    return `An account for ${normalized} already exists. Open that account instead of creating a duplicate.`;
  return "";
}
export function accountGaps(account: Account): string[] {
  const gaps = [];
  if (!account.domain)
    gaps.push("Confirm the company domain; its name alone is ambiguous.");
  if (!account.documents.some((d) => d.purpose === "Account plan"))
    gaps.push(
      "Attach an account plan or label an existing document as the account plan.",
    );
  if (!account.hypothesis.trim())
    gaps.push("Record the account hypothesis and what would change your mind.");
  if (!account.people.some((p) => p.id === account.primaryContactId))
    gaps.push(
      "Choose the next person to engage; a persona alone is not a confirmed contact.",
    );
  if (!account.message.trim())
    gaps.push("Record an account-specific message hypothesis.");
  if (!(account.steps || []).length)
    gaps.push("Create the first step of the account approach.");
  if (!account.evidence.some((e) => e.kind === "Documented information"))
    gaps.push(
      "Support your approach with a dated source; an attachment alone is not verified evidence.",
    );
  return gaps;
}
export function accountProgress(account: Account) {
  const steps = account.steps || [];
  const done = steps.filter((s) => s.status === "Done").length;
  return {
    total: steps.length,
    done,
    percent: steps.length ? Math.round((done / steps.length) * 100) : 0,
    blocked: steps.filter((s) => s.status === "Blocked").length,
  };
}
export function documentType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return (
    (
      {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        txt: "text/plain",
        md: "text/markdown",
      } as Record<string, string>
    )[ext || ""] || ""
  );
}
export const documentPurposes = [
  "Account plan",
  "Research",
  "Meeting notes",
  "Presentation",
  "Other",
] as const;
export function safeDocumentName(doc: Document) {
  return doc.name.replace(/[\\/]/g, "-");
}
export function missingAccountDomain(context: Context) {
  return context.accounts.filter((a) => !a.domain).length;
}
