import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/strategy";
import {
  attachmentError,
  blankAccount,
  brief,
  initializeContext,
  linkedOpportunities,
  migrateDemo,
  saveOpportunity,
  validContext,
} from "../lib/context";
test("legacy migration preserves founder data, opportunity notes and journal", () => {
  const old = seed();
  old.journal = [
    {
      id: "j",
      date: "2026-01-01",
      company: "Example",
      decision: "Wait",
      outcome: "Learned more",
    },
  ];
  const before = JSON.stringify(old);
  const next = migrateDemo(old);
  assert.deepEqual(next.profile, old.profile);
  assert.deepEqual(next.journal, old.journal);
  assert.equal(next.opportunities[0].notes, old.opportunities[0].notes);
  assert.equal(next.opportunities[0].accountId, "north");
  assert.equal(JSON.stringify(old), before);
  assert.deepEqual(migrateDemo(next), next);
  assert.ok(validContext(next.context));
});
test("migration groups opportunities for the same account without dropping deals", () => {
  const old = seed();
  old.opportunities.push({
    ...old.opportunities[0],
    id: "second",
    company: "northstar studio",
  });
  const next = migrateDemo(old);
  assert.equal(next.context!.accounts.length, 4);
  assert.equal(
    linkedOpportunities(next.context!.accounts[0], next.opportunities).length,
    2,
  );
});
test("account research survives removal of its last opportunity", () => {
  const data = migrateDemo(seed());
  data.context!.accounts[0].hypothesis = "Needs validation";
  data.opportunities = [];
  assert.equal(
    migrateDemo(data).context!.accounts[0].hypothesis,
    "Needs validation",
  );
});
test("opportunity save links to an existing account or creates one", () => {
  let data = migrateDemo(seed());
  data = saveOpportunity(data, {
    ...data.opportunities[0],
    id: "new",
    company: "Another deal",
    accountId: "north",
  });
  assert.equal(data.context!.accounts.length, 4);
  assert.equal(
    linkedOpportunities(data.context!.accounts[0], data.opportunities).length,
    2,
  );
  data = saveOpportunity(data, {
    ...data.opportunities[0],
    id: "fresh",
    company: "New Company",
    accountId: undefined,
  });
  assert.equal(data.context!.accounts.length, 5);
});
test("an empty brief exposes uncertainty and invents no people or evidence", () => {
  const data = seed();
  const result = brief(
    blankAccount("a", "Example"),
    initializeContext(data).solution,
    [],
    data.profile,
  );
  assert.equal(result.status, "Explore before committing");
  assert.equal(result.documented.length, 0);
  assert.equal(result.interpretations.length, 0);
  assert.ok(result.questions.some((q) => q.includes("trigger")));
  assert.ok(result.questions.some((q) => q.includes("owns the problem")));
});
test("founder interpretations never count as documented sources", () => {
  const data = seed();
  const context = initializeContext(data);
  const a = context.accounts[0];
  a.evidence = [
    {
      id: "e",
      kind: "Founder interpretation",
      topic: "Timing",
      statement: "Maybe next quarter",
      source: "Guess",
      date: "2026-01-01",
      documentId: "",
      quote: "",
    },
  ];
  const result = brief(a, context.solution, data.opportunities, data.profile);
  assert.equal(result.documented.length, 0);
  assert.equal(result.interpretations.length, 1);
  assert.ok(
    result.questions.some((q) => q === "Record a dated source for timing."),
  );
});
test("attachment constraints reject unsafe extensions, empty and oversized files", () => {
  assert.match(attachmentError("a.html", 100, 0), /Use PDF/);
  assert.match(attachmentError("a.txt", 0, 0), /empty/);
  assert.match(attachmentError("a.pdf", 350001, 0), /350 KB/);
  assert.match(attachmentError("a.docx", 200000, 700000), /800 KB/);
  assert.equal(attachmentError("a.MD", 10, 0), "");
});
test("context validation rejects malformed saved attachment URLs and evidence", () => {
  const c = initializeContext(seed());
  assert.ok(validContext(c));
  assert.equal(validContext({ ...c, version: 99 }), false);
  assert.equal(
    validContext({
      ...c,
      accounts: [{ ...c.accounts[0], people: [{ name: "broken" }] }],
    }),
    false,
  );
  const bad = {
    ...c,
    solution: {
      ...c.solution,
      documents: [
        {
          id: "d",
          name: "x.pdf",
          bytes: 5,
          added: "today",
          dataUrl: "javascript:alert(1)",
          text: "",
        },
      ],
    },
  };
  assert.equal(validContext(bad), false);
});

test("contextual action plan uses only saved founder judgments and keeps capacity warning", async () => {
  const { actionPlan } = await import("../lib/strategy");
  const data = migrateDemo(seed());
  const a = data.context!.accounts[0];
  a.nextAction = "Ask about the recorded incident handoff problem.";
  a.message = "Ask whether handoffs are a priority.";
  a.pause = "No operational owner.";
  a.people = [
    {
      id: "p",
      name: "Fictional Pat",
      role: "Ops owner",
      path: "Warm intro",
      authority: "Unknown",
    },
  ];
  a.primaryContactId = "p";
  const plan = actionPlan(data.opportunities, data.profile, data.context);
  assert.match(plan[0].text, /Founder-entered next action/);
  assert.match(plan[1].text, /Fictional Pat/);
  assert.match(plan[2].text, /message hypothesis/);
  assert.match(plan[3].text, /No operational owner/);
  const constrained = actionPlan(
    [data.opportunities[0]],
    { ...data.profile, capacity: 1 },
    data.context,
  );
  assert.equal(constrained[2].title, "Right-size the commitment");
  assert.match(constrained[2].text, /Reduce scope/);
});

test("account decisions update the account and append an immutable journal entry", async () => {
  const { recordAccountDecision } = await import("../lib/context");
  const data = migrateDemo(seed());
  const before = JSON.stringify(data);
  const next = recordAccountDecision(
    data,
    "north",
    "Pause",
    "No budget owner confirmed",
    "2026-12-01",
    "2026-11-09T00:00:00Z",
    "decision-1",
  );
  assert.equal(JSON.stringify(data), before);
  assert.equal(next.context!.accounts[0].decision, "Pause");
  assert.equal(next.journal[0].id, "decision-1");
  assert.match(next.journal[0].decision, /No budget owner/);
  assert.equal(next.journal[0].outcome, "");
  assert.throws(() =>
    recordAccountDecision(data, "north", "Pursue", " ", "", "now", "x"),
  );
  assert.throws(() =>
    recordAccountDecision(data, "missing", "Pursue", "Reason", "", "now", "x"),
  );
});
test("a recorded pause overrides active outreach in the action plan", async () => {
  const { actionPlan } = await import("../lib/strategy");
  const data = migrateDemo(seed());
  data.context!.accounts[0].decision = "Pause";
  data.context!.accounts[0].decisionReason = "No owner";
  const plan = actionPlan(data.opportunities, data.profile, data.context);
  assert.equal(plan[0].title, "Respect the pause decision");
  assert.match(plan[0].text, /Do not initiate active pursuit/);
  assert.match(plan[2].text, /until the founder explicitly changes/);
});
test("adding stakeholders does not silently select a target", () => {
  const data = migrateDemo(seed());
  const a = data.context!.accounts[0];
  a.people = [
    {
      id: "a",
      name: "Person A",
      role: "Unknown",
      path: "Unknown",
      authority: "Unknown",
    },
  ];
  const result = brief(
    a,
    data.context!.solution,
    data.opportunities,
    data.profile,
  );
  assert.equal(result.primaryContact, undefined);
  assert.ok(
    result.questions.some((q) => q.startsWith("Choose the next contact")),
  );
  a.primaryContactId = "a";
  assert.equal(
    brief(a, data.context!.solution, data.opportunities, data.profile)
      .primaryContact?.name,
    "Person A",
  );
});
test("exported brief retains source distinctions and excludes attached file payloads", async () => {
  const { exportBrief } = await import("../lib/context");
  const data = migrateDemo(seed());
  const a = data.context!.accounts[0];
  a.evidence = [
    {
      id: "x",
      kind: "Founder interpretation",
      topic: "Solution fit",
      statement: "A hypothesis",
      source: "Fictional founder note",
      date: "2026-11-01",
      quote: "Example passage",
      documentId: "",
    },
  ];
  const text = exportBrief(a, data.context!.solution);
  assert.match(text, /Founder interpretation/);
  assert.match(text, /Fictional founder note/);
  assert.match(text, /Not selected; do not infer/);
  assert.doesNotMatch(text, /base64/);
});
