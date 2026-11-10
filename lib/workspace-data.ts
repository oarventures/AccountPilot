import type { Demo } from "./strategy";
import { validContext } from "./context";
export function validData(value: unknown): value is Demo {
  if (!value || typeof value !== "object") return false;
  const d = value as Demo;
  return (
    (d.context === undefined || validContext(d.context)) &&
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
        (o.accountId === undefined || typeof o.accountId === "string") &&
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
        (j.accountId === undefined || typeof j.accountId === "string") &&
        ["id", "date", "company", "decision", "outcome"].every(
          (k) => typeof j[k as "id"] === "string",
        ),
    )
  );
}

export function emptyMemberWorkspace(): Demo {
  return {
    profile: { offering: "", buyer: "", dealSize: 0, capacity: 0, goal: 0 },
    opportunities: [],
    journal: [],
  };
}
