# Run AccountPilot on your Mac

**Membership update:** normal launch now opens the membership entrance. See [MEMBERSHIP-SETUP.md](MEMBERSHIP-SETUP.md) for required services, or use `npm run demo` for the original local fictional demo without services.

For the latest account-context update and the recommended no-ZIP workflow, follow [UPDATE-ON-MAC.md](UPDATE-ON-MAC.md). The initial archive instructions below are retained for reference.

This is the existing complete AccountPilot demo, not a rebuild. It includes the dashboard, founder profile, opportunity management, transparent PILOT scoring, action plan, decision journal, fictional examples, and reset.

## What you need

- Node.js and npm. Recommended: Node.js 24 LTS and npm 11, which were tested. Next.js requires at least Node.js 22.
- Internet access for the first dependency installation from the public npm registry.
- A modern browser with JavaScript and localStorage enabled.
- No environment variables, `.env` file, API keys, database, login, paid service, or external application account is required to run the demo. There is intentionally no `.env.example`.

## 1. Unzip the download

Save `AccountPilot-local.zip` in your Mac's Downloads folder. Double-click it in Finder. The ZIP contains one folder named `AccountPilot`.

If a folder with that name already exists, extract into a separate empty folder so you do not overwrite existing work. The commands below assume the project is at `~/Downloads/AccountPilot` (where `~` means your home folder). If Finder created another folder name, type `cd ` into Terminal, drag the correct project folder from Finder into Terminal, and press Return instead of the first command below.

Open Terminal with Command+Space, type `Terminal`, and press Return. Run these commands one at a time:

```sh
cd "$HOME/Downloads/AccountPilot"
node --version
npm --version
npm ci
npm test
npm run build
npm run typecheck
npm run dev
```

Wait for the terminal to say `Ready`. Then open Safari or Chrome and type this in the address bar:

```text
http://localhost:3000
```

This time localhost means YOUR Mac, where you just launched the application. Keep Terminal open while using it. Press Control+C in that Terminal to stop the server. The scripts bind to `127.0.0.1` (this computer only), so they do not expose the app on your local network.

To start again tomorrow:

```sh
cd "$HOME/Downloads/AccountPilot"
npm run dev
```

You do not need to reinstall packages each time. Changes to source files appear in the browser during development.

## 2. If something goes wrong

- `node: command not found`: quit and reopen Terminal after installing Node.js. If still missing, use the Node.js 24 LTS macOS installer from https://nodejs.org.
- Node version below 22: install Node.js 24 LTS, reopen Terminal, and check again. `.nvmrc` is included for people who already use nvm; nvm is not required.
- `Could not read package.json`: Terminal is in the wrong folder. Use the Finder drag-and-drop `cd ` method above. `ls` should show `package.json`, `app`, `lib`, and `README.md`.
- Port 3000 is already in use: run `npm run dev -- --port 3002` and open `http://localhost:3002`. Use the same port consistently because browser data is separate for each port.
- `npm ci` network or permissions error: copy the error and ask for help. Do not use `sudo npm`, disable certificate checks, or delete your existing project.
- Closing the Terminal or putting the Mac to sleep can stop access. Reopen Terminal and run `npm run dev` in the project folder again.
- Browser storage is blocked: the app shows a warning. Enable storage for localhost or use a normal browser window. Demo data exists only in that browser; it does not transfer from Codex or synchronize to GitHub.

## 3. Check the production build locally (optional)

First stop the development server with Control+C. Then:

```sh
npm run build
npm start
```

Open `http://localhost:3000`. This runs a locally optimized version; it does not publish a website.

## 4. Move to a GitHub workflow without future ZIP downloads

The archive deliberately has no `.git` folder. It is a source snapshot, not a Git checkout. The original complete demo is saved on `accountpilot-local-demo`, and the account-context update is saved on `accountpilot-context-workspace`. Until the update is merged into `main`, select the update branch when cloning; `main` may still contain only the original README.

The following uses GitHub Desktop to avoid terminal authentication setup. It preserves the existing `oarventures/AccountPilot` repository's history rather than creating a replacement repository.

1. Install GitHub Desktop from https://desktop.github.com and sign in to the GitHub account that can access `oarventures/AccountPilot`. Authenticate in the browser; do not paste passwords or tokens into chat.
2. Choose **File > Clone Repository**. Select `oarventures/AccountPilot`. Set its local path to `/Users/YOUR_MAC_USERNAME/Documents/GitHub/AccountPilot` (Desktop offers a path chooser). Do not clone over your extracted Downloads copy.
3. In GitHub Desktop, choose **Current Branch > New Branch**, name it `local-demo-setup`, and create it from `main`.
4. Assuming the paths shown above, copy all source files, including hidden configuration, into the clone. In Terminal:

   ```sh
   ditto "$HOME/Downloads/AccountPilot" "$HOME/Documents/GitHub/AccountPilot"
   cd "$HOME/Documents/GitHub/AccountPilot"
   npm ci
   npm test
   npm run build
   npm run typecheck
   ```

   `ditto` merges the source into the clone; the archive has no `.git`, so it does not replace Git history. If you already changed files in the clone, stop and review them before copying. Adjust either path if you chose different folders.

5. Return to GitHub Desktop. Review **Changes**. Expected changes include `app`, `lib`, `tests`, `package.json`, `package-lock.json`, `.gitignore`, `.nvmrc`, configuration, and documentation. `node_modules`, `.next`, and `.env` files must not be included. `.gitignore` already excludes them.
6. Enter the summary `Add AccountPilot local demo` and click **Commit to local-demo-setup**. This saves a version on your Mac.
7. Click **Publish branch** (or **Push origin** if the branch already exists). This uploads source code to the existing GitHub repository; it does not deploy a website. Keep the repository private if it is private already.
8. Choose **Create Pull Request**, review it on GitHub, and merge it into `main`. Repository rules may require another owner's review. Do not bypass branch protection.
9. In GitHub Desktop, switch to `main`, click **Fetch origin**, then **Pull origin** if offered. From now on use the Documents/GitHub copy as your working project, not the Downloads copy.

Start the Git-managed copy:

```sh
cd "$HOME/Documents/GitHub/AccountPilot"
npm run dev
```

For future changes, start from an up-to-date `main`, create a new branch in GitHub Desktop, edit that branch, run tests and a build, commit, push, and open a pull request. After merging, switch to `main` and pull. Run `npm ci` after pulling dependency changes (or whenever you want an exact clean install).

Future Codex tasks should use the same repository, make a branch and pull request, and have you pull the merged changes locally. No repeated ZIP download is needed once this initial source is in GitHub.

## Boundaries

This demo contains fictional seed data only. Enter no real customer data. There are no live AI calls or integrations. Browser storage is not encrypted or backed up. No public deployment or paid service is needed for this workflow. Tests were executed on Linux in Codex with Node.js 24; execution on your specific Mac remains to be confirmed using these commands.
