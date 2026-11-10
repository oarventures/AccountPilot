import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDomain,
  identityError,
  accountGaps,
  accountProgress,
  documentType,
} from "../lib/accounts";
import {
  blankAccount,
  migrateDemo,
  saveOpportunity,
  validContext,
  attachmentError,
} from "../lib/context";
import { seed } from "../lib/strategy";
test("domains canonicalize website URLs without guessing the parent business", () => {
  assert.equal(
    normalizeDomain(" https://WWW.Example.com/path?ref=1 "),
    "example.com",
  );
  assert.equal(normalizeDomain("sales.example.com"), "sales.example.com");
  assert.equal(normalizeDomain("example.com."), "example.com");
  assert.equal(
    normalizeDomain("https://bücher.example"),
    "xn--bcher-kva.example",
  );
});
test("non-company links and credentials are not accepted as account identity", () => {
  for (const input of [
    "javascript:alert(1)",
    "https://user:pass@example.com",
    "user@example.com",
    "localhost",
    "127.0.0.1",
    "has spaces.com",
  ])
    assert.throws(() => normalizeDomain(input));
});
test("same-name businesses are allowed when their domains differ", () => {
  const a = { ...blankAccount("a", "Same Name"), domain: "first.example" };
  assert.equal(identityError([a], "b", "Same Name", "second.example"), "");
  assert.match(
    identityError([a], "b", "Other Name", "https://www.first.example"),
    /already exists/,
  );
  assert.equal(identityError([a], "a", "Renamed", "first.example"), "");
});
test("an account keeps its stable ID when its company domain changes", () => {
  const a = { ...blankAccount("stable", "Company"), domain: "old.example" };
  const changed = { ...a, domain: normalizeDomain("new.example") };
  assert.equal(changed.id, a.id);
  assert.equal(identityError([a], a.id, a.name, changed.domain), "");
});
test("saving a new same-name opportunity does not silently merge accounts", () => {
  const data = migrateDemo(seed());
  const saved = saveOpportunity(data, {
    ...data.opportunities[0],
    id: "new-deal",
    accountId: undefined,
  });
  assert.equal(saved.context!.accounts.length, 5);
  assert.notEqual(
    saved.opportunities.at(-1)!.accountId,
    saved.opportunities[0].accountId,
  );
});
test("domain and attachment role are required for a useful account completeness check", () => {
  const a = blankAccount("a", "Example");
  assert.ok(accountGaps(a).some((g) => g.includes("domain")));
  assert.ok(accountGaps(a).some((g) => g.includes("Attach an account plan")));
  assert.deepEqual(accountProgress(a), {
    total: 0,
    done: 0,
    percent: 0,
    blocked: 0,
  });
});
test("sequence progress is based on actual step status, not deal scoring", () => {
  const a = blankAccount("a", "Example");
  const step = {
    id: "s",
    title: "Discover",
    personId: "",
    persona: "Ops",
    channel: "Meeting" as const,
    objective: "Learn",
    message: "",
    rationale: "Validate first",
    due: "",
    status: "Planned" as const,
  };
  a.steps = [
    { ...step, status: "Done" },
    { ...step, id: "2", status: "Blocked" },
    { ...step, id: "3" },
  ];
  assert.deepEqual(accountProgress(a), {
    total: 3,
    done: 1,
    percent: 33,
    blocked: 1,
  });
});
test("saved context rejects duplicate domains and invalid sequence states", () => {
  const data = migrateDemo(seed());
  const c = data.context!;
  c.accounts[0].domain = "same.example";
  c.accounts[1].domain = "same.example";
  assert.equal(validContext(c), false);
  c.accounts[1].domain = "different.example";
  assert.equal(validContext(c), true);
  assert.equal(
    validContext({
      ...c,
      accounts: [{ ...c.accounts[0], steps: [{ status: "Pretend done" }] }],
    }),
    false,
  );
});
test("Word and PowerPoint attachments have explicit MIME types and bounded size", () => {
  assert.equal(
    documentType("plan.PPTX"),
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  );
  assert.equal(documentType("plan.doc"), "application/msword");
  assert.equal(attachmentError("plan.pptx", 1500000, 0), "");
  assert.match(attachmentError("huge.pdf", 5000001, 0), /5 MB/);
  assert.match(attachmentError("more.docx", 2000000, 7000000), /8 MB/);
});
