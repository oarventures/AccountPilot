# Accounts are the main workspace

## What to try on your Mac

Update the `accountpilot-context-workspace` branch as usual. Stop the old server and use `npm run demo` for the local fictional demo (membership services remain disabled until configured). Open http://localhost:3000 and choose **Open local fictional demo**. Do not reset the demo or clear browser storage to update it.

1. From Overview, click a company name. It now opens that company's account page. The PILOT score is a separate clickable action if you want the score explanation.
2. In **Company details**, confirm its website/domain and record industry, region, size/segment, business unit, owner, and account stage.
3. In **Account plan**, attach the actual plan. You do not need to retype it. Supported files: PDF, Word (`.doc`, `.docx`), PowerPoint (`.ppt`, `.pptx`), TXT, and Markdown. Mark the file's role as Account plan, Research, Meeting notes, Presentation, or Other. Existing attachments can be relabeled.
4. In **People & approach**, capture the current hypothesis, account-specific message, rationale, timing, next action, and pause condition. These are short execution notes, not a replacement for the attached document. Add people/personas and choose the next contact explicitly.
5. Add ordered approach steps: the person or persona, channel, objective, message, reason for that step in that order, and target date. Reorder them and mark each Planned, Done, or Blocked. Nothing sends emails or schedules outreach automatically.
6. Return to the account **Overview** for plan documents, progress, the next person, the approach, next planned step, evidence gaps, and linked deals.
7. **Activity** shows sequence status and recorded decisions/outcomes. **Evidence & review** retains the prior source tracking, founder review, pursuit decisions, and downloadable brief.

The domain and account ID are shown separately. Same-name companies with different domains can coexist. Duplicate canonical domains within one user's workspace are rejected. A URL such as `https://www.example.com/page` is normalized to `example.com`; other subdomains are retained, not guessed to be the parent company.

The account's internal ID is stable when a domain changes. Names alone no longer silently merge newly created accounts or deals. Old records without a domain are preserved and flagged for confirmation. An existing shared account is not split automatically; review its companies and domains before reorganizing legacy deals. To associate a deal with a company, select the account workspace in the opportunity editor.

## Documents and storage

Attachment limits are now **5 MB per file and 8 MB total across the workspace**. A file larger than this needs a smaller excerpt. Files are stored intact and can be downloaded again; Word and PowerPoint files are not converted to text or rendered in the page. File signatures get basic format checks, not document-content validation or malware scanning.

The local fictional demo now uses IndexedDB, which is better suited to attachments than the old small localStorage store. Existing profile, opportunities, account context, documents and journal migrate automatically on first read. The old localStorage value is left unchanged as a backup. New versions read the IndexedDB copy first. Reverting to an older app that only knows localStorage will not show new edits. Browser storage is still local, not encrypted or backed up; it is not the confidential multi-user member store.

Member mode continues to use server-side per-user storage under the same authenticated and paid-access guards and database row-level security. It does not read or write the demo's IndexedDB. Apply `supabase/migrations/002_account_attachments.sql` to an already initialized hosted project before saving larger member attachments. New projects must apply 001 and then 002. The new migration raises the bounded JSON payload ceiling to 24 MB to cover base64 and text overhead; it does not weaken ownership or membership policies. No hosted migration was applied by this task.

For production-sized decks, multiple plans, version history, malware scanning, and stronger retention controls, a private object store with owner-scoped file access should replace inline JSON attachments. That service is not provisioned or activated here. No public file URLs or public storage buckets were created.

## Logical gaps to co-build next

- **Attachment is not understanding.** PDF/Word/slide files are stored, not semantically analyzed. The tool does not derive a message or infer the right person from their contents. Automatic extraction and any AI-assisted reasoning need an explicit implementation, source citations, user review, and separate data-handling decisions. Until then, the brief faithfully organizes the founder's recorded judgment.
- **Domain is not a legal entity identifier.** Parent companies, subsidiaries, business units, rebrands and shared domains need explicit handling. The stable internal ID protects continuity; the domain aids deduplication but is not externally verified.
- **Progress is not success.** Completed steps measure recorded work, not buying intent, customer engagement, or deal probability. Account stage and pursuit decisions remain deliberate user choices.
- **Persona is not buyer access.** A role placeholder is useful for research, but it does not establish a named contact, authority, or a warm introduction. The UI labels unknowns and never auto-selects the first person.
- **Reasoning needs sources.** A plan can contain assumptions or stale information. Evidence, founder interpretation, and open questions remain separate. PILOT scores are not automatically increased because a document exists.
- **Account versus opportunity.** The company record owns its plan, people and approach; individual opportunities represent deals. The overview still ranks deals by entered ratings. An account-level portfolio ranking and capacity allocation across all deals are separate decisions, not silently inferred by summing scores.

## Validation

Automated tests cover canonical domains, duplicate detection, same-name companies, stable IDs, legacy migration, bounded files, sequence validation/progress, and unchanged subscription/database isolation. Browser checks cover direct navigation from the overview, score access, large PDF and PowerPoint attachment storage/download, refresh/deep-link persistence, people and ordered steps, progress, duplicate domains, separate same-name companies, and mobile layout. Legacy/corrupt storage handling is tested without discarding old data.
