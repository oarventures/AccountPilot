# Membership, billing, and private memory

## Current status: implemented, not activated

The repository contains a member sign-in flow, a server-enforced subscription gate, Stripe Checkout and billing-portal endpoints, a signed billing webhook, and per-user workspace storage with PostgreSQL row-level security. It has NOT been connected to a hosted Supabase project or a Stripe account. No payments have been collected, no paid service has been purchased, and nothing has been deployed publicly.

The new home page is the membership entrance. Until configuration is complete, sign-in and checkout are disabled and member APIs deny access. A browser flag, a checkout return URL, or changing localStorage cannot activate paid membership.

This is an integration candidate for testing, not a production confidentiality guarantee. Use synthetic account information until hosted end-to-end tests and an independent security review are complete.

## Routes and memory

- `/`: public product/membership entrance, with no account data.
- `/login`: sign-up and sign-in through Supabase Auth. Passwords must be 12–128 characters. Email confirmation is required by the provider configuration.
- `/membership`: shows server-verified access and opens Stripe Checkout or the customer portal.
- `/app`: private member workspace; the server checks identity and paid access before rendering it.
- `/api/workspace`: checks identity and paid access again for every load, save, or deletion. Database policies are an additional boundary.
- `/privacy`: describes data handling and its limitations.
- `/demo`: optional fictional local demo, unavailable in ALL production builds. It does not connect to user accounts.

A new member starts with an empty workspace. Their profile, accounts, attachments, evidence, decisions, and notes are stored in a single database row owned by their authenticated user ID. Click **Save private workspace** to persist changes. Unsaved changes are clearly marked. Optimistic revisions prevent another tab's newer version from being silently overwritten. Sign out before sharing a browser. Sessions are rechecked on focus and periodically, and cross-tab sign-in/out messages clear an open private view.

The member workspace does not read or write the demo’s IndexedDB or legacy localStorage. Old demo content is not automatically copied into any user's account. Memory means retained user-provided context; there is no AI training, retrieval across users, background research, or live AI processing.

## Requirements to configure securely

You need accounts with Supabase and Stripe. Review their plans and costs before choosing services. Creating/configuring those external accounts requires the owner's action; the agent has not done it. A membership price and billing frequency must also be selected before accepting customers. The app reads a configured Stripe recurring price rather than inventing one.

If you also configure this inside a restricted Codex cloud environment, outbound access must allow the exact Supabase project hostname and `api.stripe.com` (plus Stripe checkout/portal destinations for a cloud browser). No allowlist was broadened here. Your Mac normally uses its own internet connection.

Configuration belongs in a local **.env.local** file on your Mac, or secret settings in a future hosting service. Never paste secrets into chat, commit them to GitHub, put them in screenshots, or use `NEXT_PUBLIC_` names for server secrets.

1. Copy `.env.example` to `.env.local` in the project folder. Keep the existing disabled switches until the remaining setup is complete.
2. In Supabase, create a dedicated test project. Open its SQL editor and execute the complete contents of `supabase/migrations/001_private_membership.sql` once, followed by `002_account_attachments.sql`. For a project that already has migration 001, apply only 002. The migration uses Supabase's built-in `auth.users` and `auth.uid()`. It is transactional; it is not intended to be rerun after success.
3. In Supabase Authentication settings, require email confirmation, set a suitable password policy, and set the site URL to your app origin. For local testing that is `http://localhost:3000`. Allow `http://localhost:3000/auth/callback` as a redirect. Set up production transactional email, abuse protection and recovery before real customers; the current UI does not yet include password recovery.
4. Find the project's URL and publishable key in its connection/API settings. Put them into `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Put its server-only **service role key** in `SUPABASE_SERVICE_ROLE_KEY`. This privileged key is used only by the verified billing webhook. Workspace loads/saves never use it. This implementation does not use Supabase secret-key placeholders through a proxy; actual runtime configuration must be set securely.
5. In Stripe **test mode**, create a product and a recurring paid price. Put its `price_...` identifier in `STRIPE_PRICE_ID`. Set `STRIPE_SECRET_KEY` to your test secret key. Never use actual payment details in test mode.
6. Configure Stripe to send `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed` to `/api/billing/webhook`. For a local Mac, use the official Stripe CLI's forwarding command rather than exposing localhost publicly:

   ```sh
   stripe login
   stripe listen --forward-to http://localhost:3000/api/billing/webhook
   ```

   Follow the CLI's secure browser sign-in. Copy the forwarding session's webhook signing secret directly into `STRIPE_WEBHOOK_SECRET` in `.env.local`, not into chat. Leave the listener running. A hosted test endpoint has its own distinct signing secret.

7. In Stripe, configure the customer billing portal so subscribers can inspect/cancel subscriptions. Verify pricing, cancellation timing and billing terms. The current integration has no trials or promotion codes; it grants access only when the configured subscription is active, its latest invoice is paid with a positive amount, and its paid period has not expired.
8. Set `APP_URL=http://localhost:3000` and `ACCOUNTPILOT_MEMBERSHIP_ENABLED=true`. Leave `ACCOUNTPILOT_ALLOW_LIVE_PAYMENTS=false`. Restart the local app so it reads the settings.
9. Open the application, create and confirm an account using an email you control, and complete a Stripe test checkout. Returning from Checkout does NOT grant access. Only the verified webhook updates the membership. Refresh the membership page after the webhook succeeds.

No real payment or production subscription should be activated until the owner explicitly approves it and the launch checks below have been completed. Live Stripe keys are rejected unless the separate live-payments switch is explicitly enabled. Do not enable it as a shortcut for test problems.

## Confidentiality boundaries

Database row-level policies require BOTH `user_id = auth.uid()` and paid access. Clients cannot change membership records, call the entitlement RPC, or select other membership rows. Workspace ownership comes from a server-verified session, not a user ID supplied in a form. A session-binding header also prevents an old tab from saving one user's open content into a different user's newly signed-in session.

Member workspace data is not cached in a shared application cache and API responses use `private, no-store`. Account data and document contents are not sent to Stripe. Stripe receives the billing identity and an internal user reference. Workspace content goes to the configured Supabase database. Files are inside that owner's protected workspace row; there are no public file buckets or public file URLs.

This is NOT end-to-end encryption. Authorized infrastructure administrators and the app operator may have privileged access. Provider encryption, access logs, backups, account-security settings, regions and retention policies must be reviewed in the actual service accounts. Application-level policies cannot promise absolute confidentiality or prevent every possible breach. Do not promise customers that their information is inaccessible to all administrators.

The in-app deletion removes the current workspace row, not authentication identity or billing subscriptions. Provider backups may retain historical data temporarily. Before launch, establish customer account deletion, data export, retention, incident handling, operator access and support procedures. Membership lapse blocks workspace access but does not silently delete stored data; lapsed customers need an operator-supported data access/deletion process.

## Billing event safety

The webhook verifies Stripe's signature against the unmodified body, then retrieves the current subscription and invoice from Stripe. Browser-reported success is ignored. Updates are applied transactionally through a privileged RPC with event deduplication, subscription-age checks and event ordering. On equal-second conflicting events, revocation wins conservatively. In ambiguous billing races, access may remain locked and require an operator to reconcile verified Stripe state; never manually grant access based only on a screenshot or browser redirect.

A lost or failed webhook denies/does not extend access until resolved. Monitor and retry failed webhooks. Cancellation, expiration, failed payments and renewals must be tested against the configured Stripe account. Refund/chargeback handling, tax, invoices, legal billing terms, price changes and a scheduled reconciliation process require business-specific production work; no claim that these are completed is made.

## Validation performed vs still required

Automated tests use a real embedded PostgreSQL engine to execute the SAME migration, not a mock of ownership rules. They exercise separate paid users, unpaid and anonymous users, forged entitlement attempts, cross-user reads/writes/deletes, expired access, replayed/out-of-order billing events, and the billing service's lack of workspace-read grants. Unit tests also check missing/expired membership, request origins and Stripe signature tampering. Browser/HTTP checks verify the disabled configuration stays locked and the production build cannot serve `/demo`.

Still required with owner-configured services:

- Two hosted Supabase users with separate paid Stripe test subscriptions: save different workspaces, reload, sign out/in, switch users in another tab, and verify that the UI and direct API/database requests never mix their content.
- Attempt forged user IDs, forged local paid flags, direct unauthorized API requests, cross-origin writes and expired sessions.
- Complete, cancel, renew and fail a test payment. Verify webhook signatures, retries, expiry, duplicate sessions, portal behavior and cancellation timing.
- Simultaneous edits must return a conflict rather than overwrite a newer version.
- Verify cookies are Secure and HttpOnly on HTTPS, responses are not shared-cached, secrets are server-only, provider logs contain no workspace payloads, and browser data is cleared on sign-out.
- Configure abuse/rate limiting and production email/recovery; run dependency and independent application/database security review; approve provider access, retention, pricing and billing terms.

## Keep using the fictional local demo

No provider accounts or secrets are needed for the original development demo. Stop the old server, then run:

```sh
npm run demo
```

Open the root page and select **Open local fictional demo**. The demo is still browser storage only, has no user confidentiality boundary, and must contain no real account information. It is not available from `npm start` or any production build. Normal `npm run launch` now opens the membership entrance.
