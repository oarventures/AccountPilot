import type { Context } from "./context";
export type Profile = {
  offering: string;
  buyer: string;
  dealSize: number;
  capacity: number;
  goal: number;
};
export type Opportunity = {
  accountId?: string;
  id: string;
  company: string;
  value: number;
  relationship: number;
  access: number;
  pain: number;
  timing: number;
  effort: number;
  notes: string;
};
export type Decision = {
  id: string;
  date: string;
  company: string;
  decision: string;
  outcome: string;
};
export type Demo = {
  context?: Context;
  profile: Profile;
  opportunities: Opportunity[];
  journal: Decision[];
};
const bound = (n: number, max = 5) =>
  Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
export function scoreOpportunity(o: Opportunity, p: Profile) {
  const potential =
    p.dealSize > 0 ? bound((o.value / p.dealSize) * 60, 100) : 0;
  const influence = (bound(o.relationship) + bound(o.access)) * 10;
  const likelihood = bound(o.pain) * 20;
  const cost =
    o.effort > 0 && p.capacity > 0
      ? Math.max(0, 100 * (1 - o.effort / p.capacity))
      : 0;
  const timing = bound(o.timing) * 20;
  const parts = [potential, influence, likelihood, cost, timing];
  const score = Math.round(
    potential * 0.25 +
      influence * 0.2 +
      likelihood * 0.25 +
      cost * 0.15 +
      timing * 0.15,
  );
  const gaps = [
    o.relationship === 0 && "Relationship strength is unknown",
    o.access === 0 && "Buyer access is unknown",
    o.pain === 0 && "Business pain has not been evidenced",
    o.timing === 0 && "Buying timing is unknown",
    !o.notes.trim() && "No supporting notes recorded",
    o.value <= 0 && "Deal value is missing",
    o.effort <= 0 && "Effort estimate is missing",
    p.dealSize <= 0 && "Founder target deal size is missing",
    p.capacity <= 0 && "Founder capacity is missing",
  ].filter((x): x is string => Boolean(x));
  const confidence =
    gaps.length === 0 ? "Higher" : gaps.length <= 2 ? "Moderate" : "Low";
  const rationale = [
    `Potential: ${Math.round(potential)}/100 relative to your target deal size.`,
    `Influence: ${influence}/100 from relationship and buyer access.`,
    `Likelihood: ${likelihood}/100 from your pain evidence rating.`,
    `Opportunity cost: ${Math.round(cost)}/100; ${o.effort} of ${p.capacity} available monthly hours.`,
    `Timing: ${timing}/100 from your timing rating.`,
  ];
  return { score, parts, gaps, confidence, rationale };
}
export function rank(opportunities: Opportunity[], profile: Profile) {
  return opportunities
    .map((o) => ({ ...o, analysis: scoreOpportunity(o, profile) }))
    .sort(
      (a, b) =>
        b.analysis.score - a.analysis.score ||
        a.company.localeCompare(b.company) ||
        a.id.localeCompare(b.id),
    );
}
export function actionPlan(
  opportunities: Opportunity[],
  profile: Profile,
  context?: Context,
) {
  const top = rank(opportunities, profile)[0];
  if (!top) return [];
  const account = context?.accounts.find((a) => a.id === top.accountId);
  const person = account?.people[0];
  const fits =
    profile.capacity > 0 && top.effort > 0 && top.effort <= profile.capacity;
  return [
    {
      week: "01",
      title: "Validate before you pursue",
      text: account?.nextAction.trim()
        ? `Founder-entered next action for ${account.name}: ${account.nextAction}`
        : `${top.company}: ${top.analysis.gaps[0] ? `resolve this gap — ${top.analysis.gaps[0].toLowerCase()}.` : "confirm the recorded pain and buying process in a discovery conversation."}`,
    },
    {
      week: "02",
      title: "Map the people who matter",
      text: person
        ? `Founder-entered contact: ${person.name}; role: ${person.role || "unknown"}; relationship path: ${person.path || "unknown"}. Validate authority before outreach.`
        : `For ${top.company}, identify the decision maker and ask your contact for a relevant introduction. Record what you learn.`,
    },
    {
      week: "03",
      title: fits ? "Agree on a small next step" : "Right-size the commitment",
      text:
        fits && account?.message.trim()
          ? `Review this founder-entered message hypothesis against the evidence before using it: ${account.message}`
          : fits
            ? `Propose a focused discovery session for ${top.company}. Validate scope before committing delivery time.`
            : `${top.company} needs a usable effort estimate within your ${profile.capacity}h capacity. Reduce scope or defer pursuit before making a commitment.`,
    },
    {
      week: "04",
      title: "Review, decide, and learn",
      text: `Re-score ${top.company} using new evidence. Record a pursue, nurture, or pause decision and its outcome in your journal.${account?.pause.trim() ? ` Founder-entered pause condition: ${account.pause}` : ""}`,
    },
  ];
}
export function seed(): Demo {
  return {
    profile: {
      offering: "Fractional operations advisory for growing service businesses",
      buyer: "Founder / managing director at a 10–50 person consultancy",
      dealSize: 25000,
      capacity: 40,
      goal: 75000,
    },
    opportunities: [
      {
        id: "north",
        company: "Northstar Studio",
        value: 32000,
        relationship: 4,
        access: 4,
        pain: 4,
        timing: 4,
        effort: 12,
        notes:
          "Fictional example: founder described missed handoffs in a discovery call. A follow-up is proposed; budget is unconfirmed.",
      },
      {
        id: "cedar",
        company: "Cedar & Co.",
        value: 48000,
        relationship: 3,
        access: 2,
        pain: 3,
        timing: 2,
        effort: 24,
        notes:
          "Fictional example: former colleague mentioned delivery bottlenecks. Need direct buyer validation.",
      },
      {
        id: "atlas",
        company: "Atlas Partners",
        value: 18000,
        relationship: 5,
        access: 4,
        pain: 2,
        timing: 3,
        effort: 8,
        notes:
          "Fictional example: warm introduction to a partner. Pain and scope remain preliminary.",
      },
      {
        id: "field",
        company: "Fieldwork Collective",
        value: 60000,
        relationship: 1,
        access: 0,
        pain: 0,
        timing: 0,
        effort: 32,
        notes: "",
      },
    ],
    journal: [],
  };
}
