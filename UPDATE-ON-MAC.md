# Get the account-context update on your Mac

## What changed

- **Solution context** holds your offering overview, benefits, ideal customer, differentiators, proof points, limitations, and one-pagers.
- **Accounts & briefs** gives each account its own plan, attachments, evidence, people, and strategic brief. An account can hold multiple opportunities.
- Evidence is explicitly separated into **Documented information**, **Founder interpretation**, and **Open question**, with source descriptions, dates, optional file references, and passages.
- Strategic briefs organize six questions: why this account, why this solution, why now, who matters, what is our hypothesis, and what next. Message hypotheses and pause conditions are founder-written.
- The 30-day plan uses the top opportunity's linked account context when available. Opportunity ratings are still entered manually; documents and evidence do not secretly change scores.
- You can acknowledge a brief review and record a snapshot in the decision journal.
- Existing profile, opportunity notes, and journal entries migrate automatically in the same browser at the same localhost address. No demo reset is required.

This remains a fictional, browser-only demo. No AI calls, research automation, login, database, API keys, payments, or external integrations were added.

## 1. Stop your old running copy

Open the Terminal window where AccountPilot is running and press **Control+C**. Keep your existing Downloads project as a backup. Do not delete it or overwrite your work.

## 2. Set up GitHub Desktop once

If your working folder came from a ZIP, it does not have Git history and cannot receive updates with `git pull`. Use a separate Git-managed copy:

1. Install GitHub Desktop from https://desktop.github.com, launch it, and sign into the GitHub account with access to `oarventures/AccountPilot`.
2. Choose **File > Clone Repository**.
3. Search for and select **oarventures/AccountPilot**. If it is not listed, use the URL tab and enter `https://github.com/oarventures/AccountPilot`.
4. For the local path, use the folder chooser to select `Documents/GitHub/AccountPilot` inside your home folder. It must be a different folder from your old Downloads copy. Click **Clone**.
5. At the top of GitHub Desktop, click **Current Branch**. Select **accountpilot-context-workspace**. This branch contains both the original complete app and this update. The repository's `main` branch may still contain only the original README until you merge the update.
6. If you already cloned the repository previously, select it in GitHub Desktop, click **Fetch origin**, and select **accountpilot-context-workspace**. If Desktop reports uncommitted local changes, stop and preserve them on a separate branch rather than discarding them.

No passwords or access tokens need to be pasted into Terminal or this chat.

## 3. Run the Git-managed copy

Open Terminal (Command+Space, type Terminal, Return). Run each command separately:

```sh
cd "$HOME/Documents/GitHub/AccountPilot"
node --version
npm --version
npm ci
npm test
npm run build
npm run typecheck
npm run dev
```

Recommended Node.js is 24 LTS; minimum is 20.9. If you selected a different clone folder, type `cd `, drag that folder from Finder into Terminal, and press Return instead of the first command.

Wait for **Ready**, then open `http://localhost:3000` in the SAME browser you used before. Keep this port and browser consistent to retain the browser's existing demo data. If a server is still occupying port 3000, stop the old Terminal process rather than switching ports and expecting the same data to appear.

No environment variables, `.env` file, API keys, database, or paid services are required. Internet is needed for `npm ci`, which installs packages using the checked-in lockfile.

## 4. Walk through the new features

1. Click **Solution context** in the left navigation. Enter fictional solution benefits and an ideal-customer description, then click **Save solution context**.
2. Optionally attach a fictional one-pager. Accepted types: PDF, DOCX, TXT, Markdown.
3. Click **Accounts & briefs**. Existing opportunities get account workspaces automatically. Select an account or create a new fictional account.
4. Fill in its plan: why this account, why this solution, why now, hypothesis, next action, proposed message, and pause condition. Click **Save account plan**.
5. Attach a fictional account plan if useful. Under evidence, add a statement and select its type. Documented information requires a source description and source date. You can link an attachment and copy a passage.
6. Add fictional stakeholders and their role, relationship path, and known or unknown buying authority.
7. Click **Strategic brief**. Check the supporting sources, interpretations, questions, and linked PILOT summary. The brief does not invent missing information.
8. Click **Mark brief reviewed** to record your acknowledgment, or **Record brief snapshot in decision journal** to keep a point-in-time record and later add an outcome.
9. Return to Overview to see the account-informed 30-day plan. Refresh and check that your saved context persists.

To associate another deal with an account, edit that opportunity and choose its **Account workspace**. A new opportunity without a selection will match its company name or create an account. Deleting an opportunity leaves its account research intact.

## 5. What attachments do and do not do

Files stay in localStorage in your browser. They are not sent to a server. PDF and DOCX files are stored and downloadable, but their contents are NOT extracted or analyzed. TXT and Markdown are shown as plain text. A copied passage can be checked for an exact text match against a related TXT/Markdown attachment; this verifies only the match, not the truth of the source. Other passages remain founder-entered and unverified.

Limits are 350 KB per file and 800 KB across the entire workspace. These conservative limits leave room for browser storage overhead and existing notes. Files larger than this require a smaller fictional excerpt. If storage is full or unavailable, a visible warning explains that edits are temporary. Do not assume an attachment is safely saved if you see that warning.

Removing a file retains its evidence entry and passage but marks its file citation unavailable. Reset demo removes account context and attachments as well as the original demo data; do not click reset to update the application. Browser storage is neither encrypted nor backed up and must contain no real customer data.

## 6. Future updates without ZIP files

The new branch has not changed `main` automatically. When ready, review the branch on GitHub and open a pull request into `main`:

https://github.com/oarventures/AccountPilot/compare/main...accountpilot-context-workspace

Click **Create pull request**, use the title **Add AccountPilot account context and strategic briefs**, review the changes, then merge if you have permission. This branch includes the original app, so a separate merge of the old demo branch is not necessary. Repository rules may require review. Merging source does not deploy a website.

After merging, in GitHub Desktop switch to **main**, click **Fetch origin**, then **Pull origin** if shown. Stop the old server, run `npm ci`, `npm test`, and `npm run build`, then `npm run dev` again.

For the next requested change, tell Codex to implement it in the same repository on a new branch, test it, and push that branch. Review and merge its pull request. On your Mac, fetch/pull `main` in GitHub Desktop, install and validate changes, then restart the app. Code moves through GitHub; browser demo data stays on your Mac.
