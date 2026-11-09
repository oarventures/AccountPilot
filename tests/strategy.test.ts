import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreOpportunity, rank, seed, actionPlan } from "../lib/strategy";
const { profile, opportunities } = seed();
const base = opportunities[0];
test("known inputs produce the documented weighted score", () => {
  const r = scoreOpportunity(base, profile);
  assert.deepEqual(r.parts, [76.8, 80, 80, 70, 80]);
  assert.equal(r.score, 78);
  assert.equal(r.confidence, "Higher");
});
test("unknown inputs earn zero and expose evidence gaps", () => {
  const r = scoreOpportunity(
    {
      ...base,
      value: 0,
      relationship: 0,
      access: 0,
      pain: 0,
      timing: 0,
      effort: 0,
      notes: "",
    },
    profile,
  );
  assert.equal(r.score, 0);
  assert.equal(r.confidence, "Low");
  assert.equal(r.gaps.length, 7);
});
test("zero capacity or target avoids division by zero", () => {
  const r = scoreOpportunity(base, { ...profile, capacity: 0, dealSize: 0 });
  assert.equal(r.parts[0], 0);
  assert.equal(r.parts[3], 0);
  assert.ok(Number.isFinite(r.score));
  assert.equal(r.gaps.length, 2);
});
test("oversized opportunities and impossible ratings remain bounded", () => {
  const r = scoreOpportunity(
    {
      ...base,
      value: 1e12,
      relationship: 100,
      access: 100,
      pain: 100,
      timing: 100,
      effort: 1000,
    },
    profile,
  );
  assert.equal(r.parts[0], 100);
  assert.equal(r.parts[3], 0);
  assert.ok(r.score >= 0 && r.score <= 100);
});
test("missing effort cannot look like free capacity", () => {
  assert.equal(scoreOpportunity({ ...base, effort: 0 }, profile).parts[3], 0);
});
test("negative and nonfinite ratings never inflate score", () => {
  const r = scoreOpportunity(
    {
      ...base,
      value: NaN,
      relationship: -5,
      access: Infinity,
      pain: NaN,
      timing: -1,
    },
    profile,
  );
  assert.deepEqual(r.parts.slice(0, 3), [0, 0, 0]);
  assert.equal(r.parts[4], 0);
});
test("ranking is stable and does not mutate input", () => {
  const a = { ...base, id: "a", company: "Alpha" };
  const z = { ...base, id: "z", company: "Zulu" };
  const input = [z, a];
  assert.deepEqual(
    rank(input, profile).map((o) => o.id),
    ["a", "z"],
  );
  assert.equal(input[0].id, "z");
});
test("empty pipeline has no invented action plan", () => {
  assert.deepEqual(rank([], profile), []);
  assert.deepEqual(actionPlan([], profile), []);
});
test("plan names the top opportunity and warns about limited capacity", () => {
  const plan = actionPlan([base], { ...profile, capacity: 1 });
  assert.equal(plan.length, 4);
  assert.match(plan[0].text, /Northstar Studio/);
  assert.equal(plan[2].title, "Right-size the commitment");
});
test("notes change confidence, never commercial priority", () => {
  const a = scoreOpportunity(base, profile);
  const b = scoreOpportunity({ ...base, notes: "" }, profile);
  assert.equal(a.score, b.score);
  assert.equal(b.confidence, "Moderate");
});
