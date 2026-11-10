# AccountPilot: open it, use it, update it

The complete application is on the GitHub branch **accountpilot-context-workspace**. No website has been published. No API keys, database, AI account, or paid services are required. Node.js is required (24 LTS recommended).

## One-time setup on your Mac

1. Stop your old AccountPilot server: in its Terminal window press **Control+C**. Keep the old folder as a backup.
2. Open GitHub Desktop. If necessary, install it from https://desktop.github.com and sign in. Choose **File > Clone Repository**, select **oarventures/AccountPilot**, and use **Documents/GitHub/AccountPilot** as its local folder. If already cloned, select it and click **Fetch origin** instead.
3. In **Current Branch**, select **accountpilot-context-workspace**. If this branch is already selected, click **Pull origin** when offered. Do not discard local changes if Desktop asks about them; keep them on a separate branch.
4. Choose **Repository > Show in Finder**. Double-click **Start AccountPilot.command**.

The launcher installs the exact dependencies if needed, starts the private local server, and opens your browser at http://localhost:3000. Keep its Terminal window open. Press Control+C there to stop it. No repeated install/build commands are needed just to launch the demo.

macOS may ask before opening a downloaded command file. Use Finder's normal **Open** action only if you trust this repository. If macOS blocks it or Terminal cannot find Node, open Terminal in the project folder and run `npm run launch` instead; do not disable macOS security settings. A file copied from a ZIP might also need executable permission; the terminal fallback avoids that requirement.

If your browser opens an older version, stop the older running server first. The launcher deliberately reuses an existing AccountPilot on port 3000 rather than terminating a process it did not start. Browser demo data stays on this browser and port; do not reset or clear site data to update code.

## Every future update

After Codex has pushed the requested changes to this same branch:

1. Stop AccountPilot with Control+C.
2. Double-click **Update AccountPilot.command** in your GitHub-cloned folder.

The updater checks that your working folder is clean, fetches the selected branch's tracked updates, uses a fast-forward-only merge, refreshes dependencies if needed, runs tests and a build, then launches and opens AccountPilot. It will not switch branches, force push, reset files, stash work, or discard local edits. If it stops, the message explains what requires attention. The code update may already have been applied when a test/build fails; it will not claim success or launch an unverified update.

GitHub access must already work in GitHub Desktop or your Git installation. No tokens should be pasted into chat. If Git asks to sign in, use your existing GitHub authentication. If the folder came from a ZIP, Start works, but Update will ask you to use a GitHub clone. Instructions for that one-time connection are above.

Terminal equivalents, if preferred:

```sh
cd "$HOME/Documents/GitHub/AccountPilot"
npm run launch
```

To update after stopping the server:

```sh
cd "$HOME/Documents/GitHub/AccountPilot"
npm run update
```

## Use the product

1. **Solution context:** describe a fictional offering, its benefits, ideal customer, proof, and limitations; attach fictional documents.
2. **Accounts & briefs:** select/create an account. Save its plan: why this account, why this solution, why now, hypothesis, next action, message, and pause condition.
3. Add research entries as **Documented information**, **Founder interpretation**, or **Open question**. Documented entries need a source and date. Add stakeholders and explicitly choose your **Chosen next contact**.
4. Open **Strategic brief**. Review the evidence and gaps. Use **Download account brief** to save the written reasoning as a Markdown text file.
5. Record **Pursue**, **Nurture**, or **Pause**, explain why, and optionally set a review date. This also writes a decision-journal entry. Review dates are visible dates, not automatic notifications.
6. Return to Overview. The 30-day plan uses your saved judgments. A pause decision takes precedence over active pursuit even if the opportunity has a high score.

All information stays in this browser's localStorage. PDF/DOCX files are attached but not parsed or automatically understood. TXT/Markdown can be read locally. Files are limited to 350 KB each and 800 KB total. No real customer data should be entered. The app does not invent research, send outreach, or make live AI calls.

## What was verified

The maintained test suite covers scoring, migration of existing data, account linking, evidence separation, attachment limits, explicit target selection, decision journaling, pause behavior, brief export, and updater guardrails. Production build, TypeScript, and browser workflows are checked before pushing updates. The launcher is exercised on Linux; actual Finder and macOS behavior must be confirmed on your Mac. No access to your Mac is implied.
