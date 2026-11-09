# AccountPilot

A safe, fictional sales strategy demo for founders of small, relationship-driven B2B businesses. Built with Next.js App Router, TypeScript, React, and Tailwind CSS. No account, database, AI service, payment, scraping, or external integration is implemented.

## Run locally

Recommended: Node.js 24 LTS and npm 11 (the tested versions). Next.js requires Node.js 20.9 or newer. See [MAC-LOCAL.md](MAC-LOCAL.md) for beginner-friendly Mac instructions and a GitHub workflow.

```sh
cd AccountPilot
npm ci
npm run dev
```

Open http://localhost:3000 on your own machine. If your terminal is already inside the repository, omit `cd AccountPilot`.

Production check and local production server:

```sh
npm test
npm run typecheck
npm run build
npm start
```

Stop a server with Ctrl+C. No environment variables or secrets are required, so there is no `.env.example`.

## What you can do

- View a responsive dashboard with estimated pipeline value, top priority, and monthly capacity.
- Set a fictional offering, ideal buyer, target deal size, monthly sales hours, and 90-day revenue goal.
- Create, inspect, edit, and delete opportunities, with evidence ratings and notes.
- Expand a company name to inspect its score, rationale, and missing evidence.
- Review a suggested four-week plan for the highest-ranked opportunity.
- Record decisions and update their outcomes later.
- Reset the demo to its four fictional examples. Reset and deletion require confirmation.

## How PILOT works

The pure strategy module lives in `lib/strategy.ts`, separately from the UI in `app/page.tsx`.

| Component        | Weight | Calculation (0–100)                                    |
| ---------------- | ------ | ------------------------------------------------------ |
| Potential        | 25%    | Estimated value / target deal size × 60, capped at 100 |
| Influence        | 20%    | (Relationship strength + buyer access) × 10            |
| Likelihood       | 25%    | Business pain evidence rating × 20                     |
| Opportunity cost | 15%    | max(0, 1 − pursuit hours / monthly capacity) × 100     |
| Timing           | 15%    | Timing rating × 20                                     |

Ratings range from 0 (unknown) to 5 (confirmed / very strong). Missing capacity, target deal size, or pursuit effort gives the affected component zero credit. The final weighted score is rounded to the nearest integer. Ties sort by company name and then ID. Opportunity cost rewards lower pursuit effort, rather than estimating monetary cost. Pursuit hours and capacity cover the same monthly period; delivery capacity is not modeled.

Evidence confidence measures completeness, not truth: Higher = no missing inputs, Moderate = 1–2 gaps, Low = 3+ gaps. Missing relationship, access, pain, timing, notes, value, effort, capacity, and target deal size are listed as gaps. Notes are never automatically fact-checked. The score is a relative prioritization heuristic, not a win probability, financial forecast, or verified recommendation. Revenue goal is context only. Pipeline value is the unweighted sum of estimates.

The 30-day plan is a deterministic template for the first-ranked company. It recommends discovery and validation rather than inventing buyer facts. It warns when pursuit effort exceeds capacity or is unknown. It does not schedule multiple opportunities or guarantee revenue.

## Browser storage and safety

All business data is stored in this browser origin’s localStorage under `accountpilot.demo.v1`. The initial data is fictional. Do not enter real user or customer information. There is no server-side business-data storage or transmission. Browser storage is not encrypted, authenticated, backed up, or synchronized. Anyone using the same browser profile can see it. Clearing site data removes it. Another browser, port, or device has separate data.

Storage failures show a visible notice; in that case edits remain temporary. Unsupported saved data is not overwritten until an explicit reset. Reset affects only AccountPilot’s own storage key. Demo reset and deletion cannot be undone. Do not publicly deploy this as production software.

## Validation and short test plan

`npm test` runs 10 unit tests covering the documented weighted calculation, unknown inputs, zero denominators, bounded ratings, missing effort, nonfinite ratings, deterministic ties, empty plans, constrained capacity, and confidence versus score.

Manual / browser smoke checklist:

1. At desktop and mobile widths, check navigation, labels, keyboard focus, and horizontal table scrolling.
2. Create an opportunity, refresh, edit it, and confirm it remains saved and rankings update.
3. Inspect its score rationale; set unknown ratings and confirm evidence gaps appear.
4. Change founder capacity and confirm scores and the plan update.
5. Add a journal decision, edit its outcome, and refresh to confirm persistence.
6. Delete all opportunities: expect an empty shortlist and no invented plan.
7. Cancel a delete/reset confirmation, then accept reset: expect four fictional examples and an empty journal.
8. Block localStorage or place invalid JSON in the demo key: expect a visible notice and no crash.
9. Run `npm test`, `npm run typecheck`, and `npm run build`.

Automated Chromium smoke testing during implementation covered creation, refresh persistence, editing, profile saving, journal outcome persistence, deletion, reset, mobile overflow, and browser errors. Browser tooling is not a runtime dependency.

## Next steps

Validate the terminology, weights, and usefulness of the suggested actions with founders using fictional scenarios. Before handling actual customer data, plan privacy, security, authentication, server storage, backup, and data deletion as a separate production project. No paid services or public deployment have been configured.
