# Project Status

## Registry Import: Excel Template, And The Plan Complete (2026-10-12)

- Phase 9 of the registry import plan (commit `42b6a76`). All nine phases are now built.
- **Excel template.** `GET /api/registry/students/import/template/` (Office only) gives an `.xlsx`:
  - a Students sheet with the import columns and a frozen header row;
  - Student ID and Phone formatted as text, so Excel keeps leading zeros;
  - Programme as a dropdown of the approved programmes, from a hidden Programmes sheet;
  - a "How to fill in" sheet with one column per row, so it is never read as the student list.
- "Download Excel Template" is the main button and "CSV Template" the second. The import guidelines now say the office can upload its own spreadsheet as it is or paste rows.
- **Design decision D8** (for the report): bulk import accepts the office's own spreadsheet, and the template is optional. UC04's precondition about the required template format no longer applies.
- **Still open:** P1 (a sample of the real Maya extract) and P2 (Student ID or matric number). Phase 7 was built on the P2 assumption.
- **Verification.** Backend: 1023 tests pass, 4 of them new in `test_registry_template.py`; no migration. Frontend: all 94 scripts, lint, the build and both production guards pass. The live browser run passed 5/5: download through the button, fill in, upload, and import. All test data was removed.

## Registry Import: Paste Rows From A Spreadsheet (2026-10-12)

- Phase 8 of the registry import plan (commit `c49e6aa`).
- **Paste rows.** The upload card has a "Paste rows" switch. Cells copied from Excel or Google Sheets are sent as `pasted-rows.csv` and go through the same steps as a file. Blank lines are dropped, and the 1,000-row limit is checked before sending.
- **Column names or not.**
  - "The first row is column names" is on by default.
  - Without names, every row is a student. The columns are matched from their values: emails, approved programme names, phone numbers, Student IDs and names.
  - A field gets a column only when exactly one column fits. Running numbers and MyKad numbers are never taken for Student IDs.
  - The Match step's "Column names are on" menu has a "No column names" choice for any file (`options.hasHeader`).
- **Verification.**
  - Backend: 1019 tests pass, 6 of them new in `test_registry_paste.py`. No migration.
  - Frontend: all 94 scripts pass, with paste helper tests and source checks. Lint, the build and both production guards pass.
  - The live browser run passed 10/11. The one miss was a timing race in the script: it read the page while the Match step still showed the same name as a sample. The rows themselves imported, as the next step and the cleanup count showed.
  - The run covered a paste with known column names going straight to checking rows, and a paste without names matched from its values, then imported. The paste box fits at 390 px. All test data was removed.

## Registry Import: Missing Emails Filled From The Student ID (2026-10-12)

- Phase 7 of the registry import plan (commit `9c7f1cb`). It was built on the plan's P2 assumption: the registry keeps the lifelong Student ID. Recheck it when the office answers P2.
- **Filled emails.** A blank or missing email becomes the student's SiswaMail address, `<Student ID>@siswa.um.edu.my` in lower case.
  - The domain is the new setting `REGISTRY_STUDENT_EMAIL_DOMAIN`, listed in `.env.example`.
  - It is on by default and can be turned off on the Match step, in a new "Student Emails And IDs" card.
  - The Email column is then not required. Its row reads "Filled", with an example address.
- **Marked everywhere.**
  - Each filled email shows on its row ("Email from Student ID: ...") and in a count chip.
  - The result panel lists "Emails filled from the Student ID", and the import report adds the note to Details.
  - Recent Imports counts them ("3 emails filled from Student ID").
  - Filled emails still go through the repeated-row and already-registered checks.
- **Student ID rule.** "Drop the programme number after "/" in Student IDs" is off by default. It turns `23004955/1` into `23004955` for both the ID and the filled email.
  - The card counts the IDs in the file that have a programme number.
  - Changed rows show "In the file: 23004955/1".
  - Two programme numbers of one student become one student, and the second is listed as repeated.
- **Edited rows** go back with the file's own Student ID and a blank email, so both choices still apply and stay marked, unless the office typed over them.
- No migration. Files imported without options behave exactly as before.
- **Verification.**
  - Backend: 1013 tests pass, 13 of them new in `test_registry_emails.py`. `makemigrations --check` finds no changes.
  - Frontend: all 94 scripts pass, with new helper tests and source checks. TypeScript lint, the production build and both production guards pass.
  - The live browser run passed 20/20. For safety, the server ran with `REGISTRY_STUDENT_EMAIL_DOMAIN=example.test` and the activation emails were held, so no message could reach a real SiswaMail address; the log confirmed none was sent. The file was a Maya-style workbook with no email column and two suffixed IDs. The run covered:
    - the Match card, the example address and the suffix count;
    - the rows, chips and marks;
    - an edited row keeping both marks;
    - the import result, the report and the Recent Imports count.
  - The database held the corrected IDs and filled emails. The card fits at 768 and 390 px without sideways scrolling. All test data was removed, and the server was restarted with the default domain.

## Registry Import: Column Matches Remembered For The Same Layout (2026-10-12)

- Phase 6 of the registry import plan (commit `c6483bc`).
- **Remembered matches.** A real import saves the column matches it was made with, against a SHA-256 of the file's normalised column names.
  - The model is `RegistryImportProfile` (migration `accounts.0013_registry_import_profile`), shared by the whole office.
  - Only the hash is kept, never the column names, since a mistaken header row could hold a student's details.
- **The next file with the same columns** opens at Match Columns with the saved matches and "Matched the same way as your import on 12 Oct 2026. Check the matches below before you continue."
  - "Use Suggested Matches" sets the saved matches aside for that file, also when its sheet or header row is changed.
  - A changed column list, or saved matches pointing past the file's columns, falls back to the suggestions.
  - Saved matches always show the Match step, so the office sees them before rows are checked. Our own template is never remembered.
- **Edited rows still count.** The inspect step returns a signed `layoutToken`, and the import sends it with the confirmed matches (`rememberLayout`). The matches are saved even when edited rows go back as a reviewed file in our own layout. A stale or foreign token saves nothing and never stops the import.
- **Database.** The dev database was migrated after a backup: `db-backups/fsktm_pg_office_before_registry_import_profile_2026-10-12.dump`.
- **Verification.**
  - Backend: 1000 tests pass, 11 of them new in `test_registry_profiles.py`. `makemigrations --check` finds no changes.
  - Frontend: all 94 scripts pass, with new source checks for the saved matches. TypeScript lint, the production build and both production guards pass.
  - A live browser run used temporary `smoke.import.*` accounts and three Maya-style workbooks with the same columns, and passed 14/14. It covered:
    - the first import with Phone left out;
    - the second file opening with that choice and the dated note;
    - "Use Suggested Matches", which stayed set aside after re-reading the header row;
    - importing after an edited row;
    - the third file opening with the matches from that edited import.
  - The stored record held only the hash, sheet, header row and matches. The note fits at 768 and 390 px without sideways scrolling. All test data was removed.

## Registry Import: Programme Names Chosen Once Each, Or Skipped (2026-10-12)

- Phase 5 of the registry import plan (commit `ed8d0c5`).
- **Programme Names In This File.** The Check rows step lists each programme name in the file that is not an approved programme, with its row count.
  - The office chooses the programme each name means, or "Skip these rows" (for example PhD). One choice covers every row with that name, and the rows are checked again straight away.
  - Mapped rows show "In the file: MDS" under the programme. Skipped rows read "Skipped", with "you chose to skip the programme ...".
  - Names still without a choice are named. Their rows stay to fix and are left out of the import.
  - It works for our own template too, since the card is on the Check rows step.
- **Suggestions, never silent.** A name is pre-chosen only from the office's earlier choice ("Chosen on an earlier import") or when it differs from an approved name only in letter case, punctuation, spacing or "(Coursework)" ("The same name, spelt differently"). Each is shown and can be changed. "MDS", Malay names and "(Research)" programmes are never guessed.
- **Remembered office-wide.** New model `RegistryProgrammeAlias` (migration `accounts.0012_registry_programme_alias`) keeps each choice. It is saved on a real import only and suggested on the next one. Names compare without letter case, punctuation or spaces ("M.D.S" is "MDS").
- **Skipped rows** get the status "Programme Skipped". They are listed with the skipped rows in the preview, the result panel ("Programme skipped") and the report ("Skipped: you chose to skip this programme"). Recent Imports counts them ("2 skipped by programme"), and they never count as the first copy of a repeated student.
- **Also changed.** A blank programme cell now reads "programme is required" instead of `"" is not an approved programme`.
- **Database.** The dev database was migrated after a backup: `db-backups/fsktm_pg_office_before_registry_programme_alias_2026-10-12.dump`.
- **Verification.**
  - Backend: 989 tests pass, 11 of them new in `test_registry_programmes.py`. `makemigrations --check` finds no changes.
  - Frontend: all 94 scripts pass. `registryImport.test.ts` gained the programme helpers and source checks. TypeScript lint, the production build and both production guards pass.
  - A live browser run used temporary `smoke.import.*` accounts and passed 23/23. The file used our own template with "Master of Data Science", "MDS", "Sarjana Sains Data" and two "Doctor of Philosophy" rows. It covered:
    - the card, the similar-name suggestion, and nothing guessed for MDS;
    - one choice per name, and skipping the PhD rows;
    - editing a row, then changing the MDS choice, which still reached that row;
    - the import, with the result and Recent Imports counts;
    - a second file ("M.D.S", "SARJANA SAINS DATA") opening with every saved choice.
  - The database matched (MDS students in Cyber Security, the PhD rows not created, four saved choices). The card fits at 768 and 390 px without sideways scrolling. All test data was removed, including the saved choices.

## Registry Import: Settings For Every Row, And Activation Emails Later (2026-10-12)

- Phase 4 of the registry import plan (commit `b4f518d`).
- **For Every Row.** The Match step has a card for a programme (approved list), an intake and a current semester (suggesting the semesters already in the registry).
  - Each one fills blank cells, or a column the file does not have. A value in the file is never overwritten.
  - A programme set for every row stands in for a missing programme column.
  - A matched column with a setting says what fills its blank cells ("Blank cells: 2026/2027 Semester I"). A missing programme column points to the card.
- **Activation emails now or later.** "Send now / Send later" sits beside "Create N Ready Accounts" on the Check rows step, because our own template skips the Match step.
  - "Send later" creates the accounts and emails no one. The result panel says the emails are on hold, with "Send Activation Emails Now". Recent Imports shows "Emails on hold" with "Send now".
  - Both ask first: "Send activation emails to N students?"
  - The import report marks held rows "Created, activation email on hold", then "Created" or "Created, activation email not sent" once sent.
- **New endpoint.** `POST /api/registry/imports/<id>/send-invitations/` (Office only).
  - It emails only students from that import who are active and have not set a password, over one mail connection.
  - It returns the counts and each student's outcome with their file line.
  - A failed email is recorded on the import, as when an import sends straight away, and Recent Imports counts it ("1 email not sent").
  - A second send within two minutes is refused. It is throttled per import with `REGISTRY_BATCH_INVITE_THROTTLE_RATE` (default 3/hour, in `.env.example`).
- **Migration `accounts.0011_registry_import_invitations`.** `RegistryImportBatch` gains `created_students` (Student ID and file line), `invitations_held`, `invitations_sent_at` and `settings_used`. It was applied to the dev database after a backup: `db-backups/fsktm_pg_office_before_registry_import_invitations_2026-10-12.dump`.
- **Verification.**
  - Backend: 978 tests pass, 11 of them new in `test_registry_batch_settings.py`. `makemigrations --check` finds no changes.
  - Frontend: all 94 scripts pass. `registryImport.test.ts` gained the held-email helpers and source checks. TypeScript lint, the production build and both production guards pass.
  - A live browser run used temporary `smoke.import.*` accounts and a Malay-headed CSV without a programme column. It covered:
    - the programme set for every row, and an intake that filled only the blank cell (checked in the database);
    - "Send later" sending no email (checked in the backend log), with the held report and the Recent Imports mark;
    - "Send now" after confirming, emailing exactly the two imported students and clearing both marks;
    - sending from Recent Imports, where Cancel sends nothing.

    The first run passed 24/25. The failing check read an upper-case label before Recent Imports had reloaded; the corrected re-check passed 8/8.
  - The Match step and the import actions fit at 768 and 390 px without sideways scrolling. All test data was removed.

## Registry Import: Match Columns Step (2026-10-12)

- Phase 3 of the registry import plan (commit `95c222d`).
- **New flow.** A file is described first.
  - Our own template goes straight to checking rows.
  - Any other layout stops at **Match Columns**: each field (Student ID, Full name, Programme, Email, Phone, Intake, Current semester) gets a dropdown of the file's columns, with a sample value. The chosen column's first values are shown beside it.
  - The office can change the sheet and the row that holds the column names. The file is then read again, with fresh suggestions.
  - Columns that are not used are listed as "Not used, and not saved".
  - A required field without a column, or one column chosen twice, is named and blocks Check Rows. The server checks the same rules.
- **Progress.** A steps line shows Upload, Match columns, Check rows and Import. "Change column matches" goes back from the checked rows until a row is edited.
- **Edited rows** are sent back in our own layout, so the server finds the columns by name. An empty preview says where the rows will appear.
- **Verification.**
  - All 94 frontend scripts pass. `registryImport.test.ts` gained the matching helpers and source checks for the flow. TypeScript lint, the production build and both production guards pass. No backend file changed since phase 2 (967 tests).
  - A live browser run used temporary `smoke.import.*` accounts and the Maya-style workbook. It covered:
    - the Match step and every suggested match;
    - a missing required column blocking Check Rows;
    - changing the column-name row and back;
    - the checked rows, "Change column matches", and the import;
    - our template skipping the step.

    One check needed a corrected script: upper-case labels and sample values had fooled the first run. The re-check passed 4/4.
  - The Match step fits at 768 and 390 px without sideways scrolling. All test data was removed.

## Registry Import: The Office's Own Spreadsheet Layout Is Read (2026-10-12)

- Phase 2 of the registry import plan (commit `f465cfb`).
- **New inspect step.** `POST /api/registry/students/import/inspect/` (Office only) reports, for an uploaded CSV or XLSX:
  - the sheets, and the sheet holding the student list;
  - the row with the column names, skipping title rows above it;
  - every column with its letter and three sample values;
  - suggested matches from English and Malay column names, for example No. Matrik, Nama Pelajar, E-mel, No. Tel, Sesi Kemasukan.
  - It also reports columns that are not used (such as IC numbers or a running number) and whether the file is simply our template.
- **Options.**
  - Preview and import take an `options` field (sheet, header row, column mapping).
  - Bad mappings are refused with plain messages, such as "Column B is chosen for both Student ID and Full name" or "Choose a column for: Email".
  - Requests without options behave exactly as before.
- **What is read.**
  - CSV may use commas, semicolons or tabs.
  - Intake and current semester can now be imported (`IMPORT_HEADERS` and the CSV template gained both columns).
  - Columns the office does not match never appear in the returned rows and are not saved.
- **Pending P1.** The column names come from research and will be extended with the office's real ones. An old `.xls` file gets a "save it as .xlsx" message until the real extract shows whether a reader is needed.
- **Verification.**
  - 967 backend tests pass with `--parallel 2`, including 18 new ones in `accounts/test_registry_layouts.py`. They use a Maya-style workbook with a notes sheet, two title rows, Malay names, an IC column, and a running-number column.
  - All 94 frontend scripts, TypeScript lint, the production build and both production guards pass. Django checks and the migration-drift check are clean; there is no migration.
  - 12/12 live API checks against `runserver` used a workbook of that shape. They covered sheet choice, the column-name row, the matches, the unused columns, the preview (no IC number returned), the import, and the saved intake. The temporary `smoke.import.*` accounts were removed afterwards.

## Registry Import: Already-Registered Students Listed (2026-10-12)

- Phase 1 of `docs/superpowers/plans/2026-10-12-registry-import-from-office-spreadsheets.md` (commit `b9dbe75`). The plan makes bulk import accept the office's own Maya extract. Xiang said to build it now and amend it when the office answers the two open questions.
- **Who is skipped is shown, not just counted.**
  - Already-registered rows name the registry record they match (Student ID, name, programme, or the role when the email belongs to staff) and how they matched.
  - The row is flagged when the name, email or Student ID differs, which usually means a wrong ID.
  - Repeated rows point at the line that is imported instead.
- **A registered Student ID is reported first.** Missing emails and programme spellings come after it, so a re-uploaded extract does not ask the office to fix existing students.
- **Preview.**
  - Ready, already registered, repeated and to-fix counts, with a filter (All, Ready, Skipped, Need fixing).
  - Each row's explanation sits under the student's name.
  - The preview now takes the full width.
  - The note beside Create says who will be skipped, with a View link.
- **After an import.**
  - A result panel lists every created, skipped and failed row, plus any activation email that failed. A downloadable report has every row's outcome.
  - Only failed rows stay in the preview for fixing.
  - Batch records keep names and the registry match. Recent Imports shows "N already registered", including for batches from before this change.
- The bulk tab is now "Bulk Import (Excel or CSV)".
- **Verification.**
  - 949 backend tests pass with `--parallel 2`, including 9 new ones in `test_registry_import.py`. One of them shows the query count is the same for 5 and 50 rows.
  - All 94 frontend scripts pass, including the new `registryImport.test.ts`. TypeScript lint, the production build and both production guards pass. Django checks and the migration-drift check are clean; there is no migration.
  - A live browser run used temporary `smoke.import.*` accounts and a `smoke-` file, all removed afterwards. Its file held 2 new rows, 2 already registered (one under a different name), 1 repeated and 1 bad programme. Every check passed: counts, explanations, the warning, the View filter, the result panel, the report download and Recent Imports.
  - The preview layout was checked at 1440, 768 and 390 px: no sideways page scroll, and Student IDs stay on one line.

## Activation Links, Clearer Account Emails and Registry Dropdowns (2026-10-12)

- Requested by Xiang after reviewing the student activation email.
- **Activation links have no time limit (new design decision D7).**
  - They use their own signed token (`accounts/tokens.py`). The token works only while the account has never had a password.
  - It stops working as soon as a password is set, whether through the activation link, a reset link or Settings.
  - Every activation email already sent stays valid until the student activates; after that, all of them stop working.
  - Trade-off for the report: an activation email forwarded before use stays usable until the student activates. The office still sees "Not activated" in the Registry, and suspending the account blocks the link.
- **Reset links are unchanged.** They expire after 30 minutes, work once, and stop working when the password changes in any other way.
- **The link is checked before the form appears.** `POST /api/auth/password-reset/confirm/` with `dryRun: true` reports whether the link still works and which kind it is, and changes nothing.
  - This is a dry run of the existing endpoint, so the public API list pinned by `accounts/test_api_security.py` is unchanged.
  - Checks have their own limit (`AUTH_PASSWORD_LINK_CHECK_THROTTLE_RATE`, default 30/hour per address), so opening the page never uses up the attempts to set a password.
  - Saving a password re-checks the link under a row lock, so two tabs cannot both use one link.
  - A used, expired or broken link answers 400 with `code: "invalid_link"`.
- **Emails rewritten** (`accounts/account_emails.py`).
  - They follow the GOV.UK guidance for service emails: why the email was sent comes first, one idea per sentence, no contractions, and web addresses in full.
  - Both now tell the person how to sign in: email plus Student ID (matric number), or Staff ID for staff.
  - The activation email says the link does not expire and works once. The reset email keeps its 30-minute limit.
  - The reset subject is now "Reset your FSKTM Postgraduate Office password".
- **Link pages.**
  - Activation emails open `/activate-account`: "Activate Your Account", then "Account Activated".
  - Reset emails still open `/reset-password`.
  - A link that no longer works shows "Link No Longer Valid" before any typing. Activation links then offer Go to Sign In and Forgot Password?; reset links offer Request a New Link.
- **Registry dropdowns.**
  - Every native `<select>` in the Student Registry is now `SelectMenu`, a styled list built on the WAI-ARIA select-only combobox pattern (arrow keys, Home/End, type-ahead, Escape).
  - That covers the four list filters, the registration form's Programme field, and the record's Programme and new-status fields.
  - Programmes read "Data Science / Master · Coursework" with their colour icon.
  - The list is portalled, so the record dialog cannot clip it, and it stays on screen at phone width.
- **Teammate-written docs now out of date** (not edited; Xiang to pass them on).
  - `ARCHITECTURE_AND_CODING_DESIGN.md` lists the throttle scopes as login, reset request and reset confirmation. There is now also a link-check scope for `dryRun` requests.
  - `docs/WHOLE_SYSTEM_END_TO_END_TEST_GUIDE.md` still calls the Student Registry backend missing. It has been live at `/api/registry/` since PR #15.
- **Verification.**
  - All 940 backend tests pass with `--parallel 2`, including 19 new ones in `accounts/test_password_links.py`. Those include a link used 400 days after it was sent and two tabs submitting one link at the same moment.
  - All 93 frontend scripts pass, including the new `selectMenu.test.ts`, `RegistryDropdowns.test.ts` and `passwordLinkCopy.test.ts`. TypeScript lint, the production build and both production guards pass. Django checks and the migration-drift check are clean; there is no migration.
  - A live run against `runserver` (console email) and Chrome used temporary `smoke.links.*` accounts, removed afterwards.
    - It covered: register a student; activate from the emailed link; reopen the used link; sign in with the matric number; forgot password; reset; reopen the reset link; then the dropdowns at desktop and phone widths.
    - Every functional check passed. Chrome logged only the expected 400s for the reopened links (twice each, because React StrictMode repeats effects in development) and the existing 401 from the sign-in page's session check.

## Student My Records and Partly-Done Plan Completion (2026-10-11)

- Phase 9 of the partly-done plan (UC06), commit `39535ce`. **This completes the plan: phases 1 to 9 are done.**
- **My Records** (`/my-records`, students only; other roles are sent to the dashboard). Students open it from the profile menu, where the item now reads "My Records".
  - The profile is read-only, with "Change in Settings" for the phone number (D3).
  - Summary cards count Supervisor & Panel and Marks records (from the teammate's progress dossier, reused read-only), Letters (Phase 6) and Announcements (the student's notification feed). Files reads "Available when File Management is released".
  - Each category has a table with a "No records found" state. The Letters tab reuses My Letters, including reprint and Word download.
- **No sidebar entry.** One would mean editing the teammate's `navigation.ts` and `Sidebar.tsx`, and the "ALL modules" rule in `permissions.ts` that would also show it to office staff and coordinators. Add it later if the teammate agrees.
- **No backend changes** in this phase.
- **Phase 8 fix** (`a21198c`): at phone widths (360 and 390 px) the bell dropdown ran off the left edge of the screen. On small screens it now spans the width under the header; from tablet width up it stays anchored to the bell. Checked at 360, 390, 768 and 1440 px.
- **Teammate-written docs that are now out of date.** These were not edited; Xiang to pass them on.
  - `PROJECT_STATUS.md`, "Known Issues and Notes": the deferred announcement risks (cross-sender modification, draft and attachment visibility, attachment validation) were fixed in `f5777d2` on 2026-08-20. Only the author or Office can edit or delete, drafts and their attachments follow publish status, and attachments are checked for size, extension and magic bytes.
  - `ARCHITECTURE_AND_CODING_DESIGN.md`, the line saying announcement ownership, draft visibility and attachment authorization are deferred: fixed by the same commit.
  - `ARCHITECTURE_AND_CODING_DESIGN.md`, the Settings endpoint description: since Phase 8 the PATCH also accepts `emailNotifications`, `deadlineReminders` and `weeklySummary`, and the three capabilities are true.
- **Design differences from the use-case document** (for the FYP report; kept on purpose, see the plan):
  - **D1** New accounts get an activation link instead of an emailed temporary password (UC02, UC03, UC04). A password-change requirement set by an administrator is still enforced.
  - **D2** Login gives the same 401 for a disabled account as for a wrong password, and password reset answers the same way for unregistered emails, so neither reveals which accounts exist (UC01, UC02).
  - **D3** Students can change their phone number but not their email, because email is the login identifier (UC06).
  - **D4** Every student status change needs a reason, because the participant lifecycle service requires one (UC05 calls it optional).
  - **D5** Saved letters keep a filled copy and a reference number issued by the server. The PDF comes from the browser's print dialog using that copy; the Word file is built on the server (UC23).
  - **D6** There is no background worker. Scheduled work (announcement release, deadline reminders, weekly summary) runs as idempotent management commands scheduled with Windows Task Scheduler or cron, and announcement release also happens on read (UC30, UC33).
- **Still not started** (the next plan): UC03 Manage User Account (staff and lecturer accounts; the Staff & Lecturers tab is still mock), UC22 appointment confirmation letters (needs an approval hook agreed with the teammate), UC24-UC27 File Management, and UC28-UC29 FAQ chatbot.
- **Verification.**
  - All 921 backend tests pass with `--parallel 2`. Django checks and the migration-drift check are clean.
  - All 90 frontend scripts pass, including the new `myRecords.test.ts`. TypeScript lint, the production build and both production guards pass.
  - 13/13 browser checks passed with temporary `smoke.rec.*` accounts, removed afterwards. They covered the profile menu link, profile fields, counts, the empty state, the letters and announcements tabs, the Settings link, and redirecting office staff.

## Notifications: Bell Dropdown, Email Preferences, Reminders, Weekly Summary (2026-10-11)

- Phase 8 of the partly-done plan (UC33), commit `4403c8c`.
- **Settings switches (agreed with Xiang before changing the teammate's Settings).** Three switches sit under "Announcement alerts": Email alerts (off by default), Deadline reminders (on) and Weekly summary (off). They are new `User` fields (migration `accounts.0010`). `GET/PATCH /api/auth/settings/` reads and saves them, any subset at a time; an empty or unknown preference is still a 400. The three `capabilities` flags are now true. Nothing else in Settings changed. In the teammate's files, `test_settings.py` now expects the flags to be true, and `settingsApi.savePreferences` accepts a partial set so their existing test still compiles. Wey Cheng should be told.
- **Email that follows the switches** (`announcements/emails.py`). Announcement copies need Email alerts and Announcement alerts, reminders need Email alerts and Deadline reminders, and the summary needs Weekly summary. Mail goes through `send_mass_mail(fail_silently=True)`. Announcement delivery emails only people getting the notice for the first time, after the delivery commits, so edits and re-syncs never email twice.
- **Deadline reminders.** `send_deadline_reminders --days N` reminds the target roles of active-timeline entries due within N days (the dashboard's role mapping: STUDENT, LECTURER, OFFICE_STAFF) and evaluators with unsubmitted tasks in published Marks periods closing within N days. It sends one reminder per person per deadline, with a new one only if the deadline moves. People with Deadline reminders off get none. Reminders open the dashboard and Marks Entry.
- **Weekly summary.** `send_weekly_summary` emails opted-in users their unread notifications from the past seven days and skips anyone with nothing unread. `WeeklySummaryLog` (migration `announcements.0005`) keeps it to one email per person per week; a failed send frees the slot again.
- **Bell dropdown.** The bell opens the five newest notifications with "Mark all as read", "View all" and a "No new notifications" state. An item is marked read and opens its record. The routing rule now lives in `utils/notificationLinks.ts`, shared with the Notifications page; announcements open in that page's detail view.
- **Scheduling.** `backend/README.md` lists the three commands with Windows Task Scheduler and cron lines.
- **Verification.**
  - 921 backend tests pass with `--parallel 2`, including 10 new ones in `announcements/test_reminders.py` and 3 in `accounts/test_notification_preferences.py`.
  - All 89 frontend scripts pass, including the new `notificationLinks.test.ts`. TypeScript lint, the production build and both production guards pass. Django checks and the migration-drift check are clean.
  - The dev database was migrated to `accounts.0010` and `announcements.0005` after backup `db-backups/fsktm_pg_office_before_notification_preferences_2026-10-11.dump`.
  - Both commands ran twice against the dev database inside a rolled-back transaction, with mail kept in memory and a temporary timeline, entry and student. The first run sent 7 reminders and 1 summary, the second added nothing, and the database was unchanged afterwards. 18/18 browser checks passed on the dropdown (five newest, record links, announcement detail, mark all read, empty state) and on the new switches (defaults, save, kept after reload), using temporary `smoke.bell.*` accounts that were then removed.
  - The switches use the teammate's `ToggleSwitch`, whose knob position issue is already reported.

## Announcement Scheduling, Expiry and Registry Targeting (2026-10-11)

- Phase 7 of the partly-done plan (UC30), commit `ee4371d`.
- **Schedule.** Announcements have optional publish and expiry times (migration `announcements.0004`). Publishing with a future time saves the notice as Scheduled and delivers nothing. An expiry at or before the publish time, or one already past, is refused (UC30 exception 2). "Scheduled" and "Expired" are now real states instead of labels.
- **Release (D6).** `release_due_announcements()` publishes scheduled notices that are due and expires finished ones. A notice whose whole window passed unreleased expires undelivered. It claims rows with SKIP LOCKED and delivers through the existing `event_key`, so it never delivers twice. It runs at the start of the announcement and notification lists (one cheap query when nothing is due) and as the `release_announcements` command; `backend/README.md` shows how to schedule it.
- **Expiry keeps history.** Delivered notifications stay, and people who received the notice can still open it and its attachment after it expires. Before this, an expired attachment returned 404 to its own recipients.
- **Registry targeting.** "All Students" announcements can be narrowed to approved programmes and to intakes recorded in the registry. Only matching students receive them or can read them. Targeting any other audience returns 400, a deliberate simplification of the plan's "audience includes students". New `GET /api/announcements/audience-options/` and `GET /api/announcements/recipient-count/` serve the composer.
- **Composer.** Publish and expiry fields in Malaysia time (the teammate's `malaysiaDateTime` helpers), programme and intake chips, and a live recipient count. The main button reads Schedule, Reschedule or Save Schedule as the time requires. History shows Scheduled and Expired with their times, the targeting under the audience, and a Scheduled stat card.
- **Changed tests.** `test_review_fixes.py`: Scheduled now needs a publish time, and the notification feed is one due-check query plus the feed query, still constant in length.
- **Verification.**
  - 908 backend tests pass with `--parallel 2`, including 15 new ones in `announcements/test_scheduling.py`.
  - All 88 frontend scripts pass, including the new `announcementSchedule.test.ts`. TypeScript lint, the production build and both production guards pass. Django checks and the migration-drift check are clean.
  - The dev database was migrated to `announcements.0004` after backup `db-backups/fsktm_pg_office_before_announcement_schedule_2026-10-11.dump`.
  - Live checks ran against `runserver` with temporary `smoke.ann.*` accounts whose intakes no real account has, so nothing reached a real account (checked afterwards: 0 such notifications). 18/18 API checks passed, including a notice released and another expired in real time on the next list call. 13/13 browser checks passed on the composer and history. All temporary data was removed.

## Saved Letter Requests (2026-10-11)

- Phase 6 of the partly-done plan (UC23), commit `170aed3`.
- **Issued letters are records now.**
  - Generating a letter fills an Active template on the server from the same details as the preview (`letters/details.py`). It saves the filled wording and the details used (`GeneratedLetter`, migration `letters.0003`) and notifies the student once.
  - The server issues the reference number as `<prefix>/<year>/<NNNN>`, counted per prefix and year under a row lock (`LetterReferenceCounter`). A refused letter never uses a number. The browser's random `generateReferenceNumber()` is gone.
  - If the template needs a detail the student's record lacks, generation returns 400 `missingFields` and saves nothing. The screen names the missing fields first and disables the button.
- **Endpoints** under `/api/letters/requests/`: generate, list (students see their own; the office sees the register with search, date and status filters), detail, Word download (`python-docx`, added to `requirements.txt`), resend notification and revoke. Resend and revoke are office-only.
- **Beyond the plan.**
  - The office can revoke a letter issued in error, with a reason. The student keeps it in My Letters, marked revoked with the reason, and can no longer print or download it. The plan listed a Revoked status but no way to set it.
  - Reprints and Word downloads follow the Active-only rule from 2026-10-10, so a student who is no longer Active gets the same 403 as for generation. Office staff keep full access.
- **Screens.**
  - Student Letter Generation has New Letter and My Letters tabs (`/letters/my-letters`). Generate saves the letter, then prints the saved copy with its real reference. My Letters reprints and downloads the Word copy.
  - Office Letter Generation has Templates and Issued Letters tabs (`/letters/issued`), with search by student, matric or reference, date and status filters, reprint, Word, resend and revoke. Coordinators keep the Templates view only.
  - A "letter ready" notification opens My Letters.
- **Verification.**
  - 893 backend tests pass with `--parallel 2`, including 14 new ones in `letters/test_letter_requests.py` and 2 concurrency tests in `letters/test_letter_reference_concurrency.py`.
  - All 87 frontend scripts pass, including the new `issuedLetters.test.ts`, which also checks that the Word letterhead matches the printed one. TypeScript lint, the production build and both production guards pass. Django checks and the migration-drift check are clean.
  - The dev database was migrated to `letters.0003` after backup `db-backups/fsktm_pg_office_before_generated_letters_2026-10-11.dump`.
  - Live checks ran against `runserver` with temporary `smoke.ltr.*` accounts and a temporary template with its own prefix, all removed afterwards. 15/15 API checks and 17/17 browser checks passed, covering generation, My Letters, the Word download, the notification link, missing fields, the office register, resend and revoke. A sample Word file opened cleanly in Microsoft Word.

## Review Fixes: Xiang's Side (2026-10-10)

- A four-part review (backend code, frontend code, live API, browser UI) of `643512a` found bugs and gaps in Xiang's modules. They were fixed in seven commits, `2888fc9`..`0bff836`.
- **Accounts and sign-in.**
  - Case-insensitive unique emails and matric numbers.
  - A per-identifier login throttle.
  - `last_portal_login` is now recorded separately from `last_login`, so signing in no longer voids a reset link.
  - Passwords are kept exactly as typed.
  - Reset-email failures are logged instead of returning a 500.
  - The legacy `NotificationPreference` table, its endpoint and the `authApi` helpers were removed (migration `accounts.0009`).
  - Admin user forms validate passwords and lock role and permission fields for non-superusers.
  - New check `accounts.W001` flags superusers that still hold a portal role.
- **Registry.**
  - Coordinator scope.
  - Matric, staff-number, email and phone validation.
  - Unknown PATCH fields are rejected.
  - Invites are sent only when asked.
  - A programme change is blocked (409) once a research profile exists.
  - Suspending sign-in revokes refresh sessions.
  - Safer CSV/XLSX import: encoding, malformed files, size cap, "Invalid Field" rows, and the batch is recorded before emails.
  - Screen: filtered CSV export, paging, edit details, confirmed Suspend/Reinstate Sign-in, issues shown in the import preview, and a keyboard-usable drop zone.
- **Announcements and notifications.**
  - Reading follows the audience.
  - Delivery is re-synced on every edit (retarget, status, Urgent).
  - Attachment files are deleted when replaced, removed or deleted.
  - The feed is capped at 200 items in one query.
  - Screens: delete confirmation, edit and withdraw a published item, remove an attachment, honest counts, an accessible dialog, and the bell refreshes every minute and on focus.
- **Letters.**
  - Students get 404 for non-Active templates.
  - Single and triple braces are flagged the same way on the server and in the editor.
  - Editor: confirm before delete, warn on unsaved changes, keep typing made during a save, field-level errors, and new reference-prefix and description inputs.
  - The preview now matches the printout.
  - The stamp now reads "Computer-generated / Verify with the PG Office".
- **Sign-in and session (frontend).**
  - Logout no longer races a quick re-login.
  - A superseded 401 no longer ends the new session.
  - Signing out during the forced password change can't leave the user signed in.
  - A mid-session `technical_account` 403 signs the user out with the reason.
  - On portal pages, the startup refresh retries once so two tabs reloading together both stay signed in.
  - Nested DRF errors and 5xx are shown as readable messages.
  - Login: no unused "Remember me", no fake manual download, mobile layout, favicon.
  - Forgot password uses neutral copy and shows the resend result inline.
  - FAQ chatbot: no double send, no fake attach/download/"logged" claims, and the composer no longer covers the footer.
- **Not changed (teammate-owned, reported).**
  - `ToggleSwitch` knob position.
  - 500s for accounts without a profile in `appointments/views.py`.
  - Coordinator Marks Entry 403.
  - Workflow Reports duplicate key.
  - App-shell dead links.
  - Settings errors shown only as toasts, and phone format.
  - `authSession` treats a network blip during refresh as session expiry.
  - `PortalToast` live region.
  - Admin login throttling (T04) and the `FRONTEND_URL` production guard.
- **Verification.**
  - 873 backend tests pass with `--parallel 2`.
  - All 84 frontend scripts pass, including the new `sessionRaces.test.ts`.
  - TypeScript lint, the production build and both production guards pass.
  - The dev database was migrated to `accounts.0009` after backup `db-backups/fsktm_pg_office_before_review_fixes_2026-10-10.dump`.
  - Repeat live API and browser runs were started but stopped early on a usage limit, before any checks ran. They are not a verification result. Their temporary accounts and servers were removed.

## Technical Administrator Accounts: Xiang's Side (2026-10-09)

- Agreed with the teammate: one account, one role. Office staff work in the portal; Django admin is for separate Technical Administrator accounts (pending-work register T01-T06).
- **Account type.** `createsuperuser` now creates a Technical Administrator (`User.TECHNICAL_ADMIN`, migration `accounts.0008`). It is a valid `User.role` value but deliberately not part of `User.Role`, so `User.Role` stays the four portal roles and code or tests that loop over it are unaffected. A superuser cannot be created with a portal role, and `createsuperuser` no longer asks for a role.
- **Kept out of the portal.**
  - Login returns 403 `technical_account`. This happens after the password check, so a wrong password still gets the generic 401.
  - The default authentication class (`PasswordPolicyJWTAuthentication`) refuses their access tokens.
  - Refresh revokes their session instead of renewing it.
  - Password reset sends them nothing, and outstanding reset links fail.
- **Role, not flags.** Registry, Letters, Announcements and the access-link throttle no longer treat superuser status as Office. A portal account that still has the superuser flag acts only as its role. `seed_announcements` no longer falls back to a superuser author.
- **Announcements.** "All" no longer reaches Technical Administrator accounts.
- **Django admin.**
  - Letter templates, announcements and notifications are inspection-only (no add, change or delete). The private announcement attachment shows its file name instead of an unserved media link.
  - The user forms reject a portal account with superuser status, a Technical Administrator without staff and superuser status, and turning an account that has a portal profile into a Technical Administrator.
  - Technical Administrator pages show no profile sections.
- **Not changed (teammate's T02-T05).** Office accounts still need `is_staff` for Marks, participant lifecycle (including Registry status changes), research amendments, capacity reassessment and delegation until those checks move to the Office role. Admin login is not restricted yet, and `seed_users` is unchanged.
- **Verification.**
  - 831 backend tests pass with `--parallel 2`, including 20 new ones in `accounts/test_technical_admin.py`.
  - All 82 frontend scripts, TypeScript lint, the production build and both production guards pass. Django checks and the migration-drift check are clean.
  - The dev database was migrated to `accounts.0008` after backup `db-backups/fsktm_pg_office_before_technical_admin_2026-10-09.dump`.
  - A live check used a temporary `createsuperuser` account, deleted afterwards. The portal refused it with 403 `technical_account`. Django admin let it in, and the template, announcement and notification add pages returned 403. The demo Office account still opened the Registry, Letters and Announcements.

## Owned-workflow integration completed (2026-10-09)

- User authorized pushing the accumulated changes, creating a PR and merging into `main`. [PR #13](https://github.com/Weychenglim/FSKTM_Postgraduate_Office_Mangement_System/pull/13) merged the 64-file release on 9 October Malaysia time, with commit `fc8265a3b22e15430be6349955f7a240b72c7bfa`. Its reviewed source commit is `2bc5ba9b3ecb17b1a1354acecc4d4087d2447410`, based on `9ee3bd4`; no upstream conflict required resolution. Local `main` was fast-forwarded to the merge and its backend/frontend tree verified identical to the tested source. Existing work is preserved; private environment files, credentials, runtime logs and synthetic databases remain excluded.
- Fresh verification passes **all 683 backend tests in 604.078 seconds** with two isolated test workers, all **75 frontend test scripts**, TypeScript and production build (6.05 seconds), Django checks, migration-drift, whitespace and documentation source/link checks. Independent integration review found no actionable issues. GitHub reported the PR mergeable with a clean merge state; there were no reported remote status checks. This release record changes documentation only after the application merge.
- This integration includes completed acceptance fixes and their documentation. Technical-only Django admin access and business/admin permission separation remain pending T01-T06; this PR does not implement that proposed shared change or complete deferred policy/production-host work.

## Main Sync: Teammate Settings Adopted (2026-10-08)

- Merged `origin/main` (`9ee3bd4`) into `Xiang`.
- **Settings.** Both branches had built Settings; the team kept the `main` version. The Settings screen uses `GET/PATCH /api/auth/settings/` and `POST /api/auth/settings/password/` (signs the user out after a change), and announcement alerts are stored on `User.announcement_alerts`.
- **Still used from `Xiang`.** `POST /api/auth/me/change-password/` for the forced first-login change (`ForcedPasswordChange`), and duplicate-proof announcement delivery (`event_key`), which now also skips recipients with announcement alerts off unless the announcement is Urgent.
- **No longer used by the frontend.** `PATCH /api/auth/me/` (phone), `/api/auth/me/notification-preferences/`, the `NotificationPreference` table and the matching `authApi` helpers. They are kept for now; remove them or fold them into `/api/auth/settings/` when Phase 8 adds email, deadline and weekly-summary preferences.
- Migration `accounts.0007` joins `0006_registry_import_batch` and `0006_user_announcement_alerts`.
- **Integration fixes.**
  - An account that must change its temporary password can now also use its own Settings (`GET/PATCH /api/auth/settings/` and `POST /api/auth/settings/password/`). Everything else stays blocked until the password is changed.
  - `apiClient` no longer clears an already-dropped token on a 401. Clearing it bumped the session version, so a password change that finished alongside a revoked request did not send the user back to sign in.
  - `types/auth.ts` had `phone` declared twice after the auto-merge; one copy was removed.
- **Verification.** 768 backend tests pass with `--parallel 2`. With `--parallel 4`, the PostgreSQL concurrency tests lost their connections on this machine, matching the teammate's earlier note. Django checks, migration-drift and whitespace checks pass.
## Consolidated pending work and decisions (2026-10-08)

- Start with [the pending-work register](docs/PENDING_WORK_REGISTER_2026-10-08.md). It preserves the user's technical-only Django admin direction and separates implementation tasks T01-T06, acceptance slices A01-A07, release/deployment work, teammate integration gaps and deferred policy decisions. Creating this document did not implement the access change.
- Latest source inspection confirms `is_staff` dependencies beyond Marks: participant lifecycle, research amendments/transfers, capacity reassessment and acting Coordinator delegation. Ordinary core Timeline/academic configuration and many workflow views already use role/scope checks. Permission separation must cover the shared dependencies; do not simply clear Office staff flags or expand their admin permissions.
- The next proposed implementation slice is T01-T06, before resuming supporting-supervision acceptance. Existing completed reports remain valid within their stated scope; the checklist still contains 406 source bullet clauses, 48 Passed and 358 Awaiting acceptance. Routine Registry/account management remains a separate incomplete integration, so technical account provisioning may still be needed until its owner completes it.

## Fresh local servers and tester guide (2026-10-08)

- Checked for prior project Django/Vite servers; none remained running at the start of the requested fresh restart. Started Django 8000 and portal 3001 from the current `main` working tree and existing `fsktm_pg_office` development database, with mocks/demo login disabled. Both return HTTP 200. Synthetic acceptance services remain stopped; their databases/evidence are retained. No reseeding, password reset or permission expansion was performed.
- Added the [simple end-to-end guide](docs/SIMPLE_END_TO_END_TEST_GUIDE.md): role-by-role happy path, rejection checks, remaining owned-module acceptance and teammate-owned Registry/File/FAQ integration gaps. Live permission inspection confirms the demo Office account is staff, not superuser, with model permissions only in Marks. Other admin apps are registered; this menu reflects account permissions, not absent data or a Marks-only system.
- Next human testing starts with Office setup, then Student → Supervisor → Coordinator → Panel → Coordinator → Marks → reports. Next development acceptance remains supporting supervision, amendments/transfers, delegation/carryover and remaining reporting/Timeline branches. Current changes are uncommitted/unpushed; this restart does not establish production readiness.

## Participant lifecycle acceptance (2026-10-08)

- Browser scenarios completed in isolated synthetic data: mandatory reasons; deferral; open/closed-period reactivation; withdrawal; blocked graduation, pending cancellation and successful graduation; Retiring, blocked final retirement, pending cancellation, appointment ending and Retired. Independent assertions confirm expected appointments/workflows, eight participant audits, eight task lifecycle audits, unchanged scores/comments/feedback/submission dates on all twelve entries, disabled retired login and blacklisted refresh session.
- Corrected demonstrated read races/outage authority in lifecycle management, omitted dossier lifecycle metadata, ended Supervisor labels and Office cancellation projections/attribution in Supervisor/Panel lists and assigned Lecturer histories. Browser regressions and internal/public dossier privacy checks pass. No migration, new dependency or account-permission change was required.
- Verification: 37 baseline backend tests passed before changes; final sequential verification passes **253 backend tests in 529.696 seconds**. After the final review corrections, **75 frontend test scripts**, TypeScript and the production build pass (build **21.31 seconds**); independent review has no remaining actionable findings. Django checks, migration-drift, whitespace and documentation checks pass. Two overlapping test runs invalidated their shared test database; those runs are discarded. A subsequent new history regression used the wrong reviewing actor, was corrected, and passes in the sequential rerun. This is scoped lifecycle acceptance, not whole-system or deployment certification.
- The checklist now contains **406 clauses: 48 Passed, 358 Awaiting acceptance**. Selected Panel history includes Office cancellations before a decision, with a Cancelled filter; timelines preserve prior Panel acceptance when cancellation occurs during Coordinator confirmation. Student Supervisor history also treats Office cancellation as terminal.
- [Acceptance report](docs/PARTICIPANT_LIFECYCLE_ACCEPTANCE_2026-10-08.md) and E9 checklist keep unexercised supporting-appointment, coordinator responsibility/delegation, audit-outage/concurrent-transition and original-appointment-ended combinations awaiting acceptance. Next development slice is supporting supervision membership/replacement, then amendments/transfers, delegation/carryover and remaining Dashboard/Timeline/report/export/reconciliation branches. Production-host checks and deferred faculty/coordinator identity decisions remain separate. Changes remain uncommitted/unpushed.

## Submitted Marks portal migration completed (2026-10-07 to 2026-10-08)

- Authorized Office Staff/Admin can correct submitted scores/comments or reopen for the assigned Lecturer through Marks Entry → View Mark Records → record detail. Existing staff/model-change permissions, required reasons, score bounds, submission locking, transactional audits and open-period reopening rules are preserved. Reviewed-state versions reject stale edits; history displays named before/after values. Mark Entry Django admin is inspection-only, including for superusers.
- Browser acceptance on 7 October uses a fresh synthetic database: missing reason/negative/no-op/cancel handling; 80→85 correction; newer 86 correction with stale second-tab rejection/reload; reasoned Draft reopening; assigned Lecturer revision/resubmission at 88; closed-period correction 80→82; inspection-only Office and admin views. Independent assertions confirm exactly four audits, expected actors/reasons/scores/comments, preserved closed submission date and new resubmission deadline snapshot, and unchanged unrelated Draft 46. See [portal Marks acceptance](docs/MARKS_PORTAL_ACTIONS_ACCEPTANCE_2026-10-07.md).
- Final 8 October rerun passes all **142 Marks backend tests** in **196.017 seconds**, including PostgreSQL simultaneous-correction and closure/reopening races. The 7 October run passed all **73 frontend test scripts**, TypeScript and production build; Django checks, migration-drift, whitespace and documentation checks pass. Independent scoped review found no actionable code issue. No schema/dependency changes were required. This is scoped Marks acceptance, not a fresh whole-backend or production-host certificate.
- All three source-of-truth documents and the whole-system manual guide now describe portal mutations and inspection-only admin. The checklist contains **403 clauses: 44 Passed, 359 Awaiting acceptance**, with E8 superseding E3's historical editable Marks-admin path. Next acceptance covers participant lifecycle, supporting supervision, research amendments/transfers, delegation and carryover, followed by Dashboard/Timeline/report/export/dossier/reconciliation combinations. Earlier browser limitations, production deployment checks and deferred faculty/coordinator identity decisions remain open.
- Changes remain uncommitted/unpushed; earlier unrelated work is preserved. Isolated 8013/3013 servers are stopped and their synthetic database/evidence retained. On 8 October both normal local services were restarted from the current `main` working tree and return HTTP 200: Django 8000 and portal 3001, using the existing development database with mock/demo login disabled. Existing account authority/passwords were not changed.

## Advanced Marks targeting, semester and completion-window acceptance (2026-10-07)

- Completed browser acceptance in a fresh synthetic database for AI Supervisor-only and Data Science both-role previews/publication/generation, reasoned Backup assignment, drawer scope changes, historical/current Lecturer semester filters, reviewed early closure, completion-window grant/renewal/revocation and actual-clock Panel expiry. Independent API probes confirm authority, duplicate/scope/identity rejection, archival blocking and unchanged state after failed writes. Details and evidence are recorded in [advanced Marks acceptance](docs/ADVANCED_MARKS_ACCEPTANCE_2026-10-07.md).
- Fixed three demonstrated defects: backup Student selection incorrectly excluded historical research-profile semesters; assignment options returned stale profile programme rather than authoritative linked Student programme; Office monitoring labelled multiple-semester totals as one active semester. Scoped regressions and browser rechecks pass. No migration/dependency or official appointment change was required.
- Final invariants pass: seven tasks, four unchanged active Supervisor and four active Panel appointments, one Backup override audit, six configuration audits, five windows and eight window audit events. Historical submissions remain 85/80; recovered Supervisor submission is 90 with its exact window/deadline snapshot; revoked Backup Draft is 46 and expired Panel Draft is 50. All periods remain CLOSED; failed writes preserve marks/comments/timestamps.
- All **126 Marks backend tests** pass in **152.338 seconds**; all **70 frontend test scripts**, TypeScript, production build, Django checks, migration-drift and whitespace checks pass. Independent scoped review found no critical or important issues. The **398-clause** checklist adds E7 and keeps unexercised semester-handover, participant/task lifecycle and report/export/dossier combinations awaiting acceptance. This is not a fresh whole-backend or whole-system acceptance claim.
- Next development acceptance covers participant lifecycle, co-supervisor membership/replacement, research amendments/programme transfers, acting-delegation revocation and carryover reassessment. Earlier E6 browser file-saving/native-alert/availability-date limitations remain separate; successful native date entry here applies to completion controls. Production shared-cache/host checks and deferred faculty/coordinator identity decisions remain open. Changes remain uncommitted/unpushed. Isolated 8012/3012 services are stopped after verification, with database/evidence retained and normal 8000/3001 services available.

## Appointment rejection, capacity and private-file acceptance (2026-10-07)

- Completed a fresh isolated negative-path slice: Supervisor and selected Panel rejection, subsequent attempts, Coordinator rejection, required reasons, disabled full candidates, missing/unsupported/oversized/malformed uploads, and final approval conflicts after capacity/availability change. Office details retain both Panel rejection stages, reasons and workflow timestamps. The late pending requests were API preconditions; effective October availability was corrected through audited Office APIs after browser date filling retained its September default.
- Live private-file HTTP checks passed for four authorized actors and rejected six unrelated actors, unknown file IDs and anonymous access. Independent public-response checks retain only the confirmed Student Panel identity, hide unavailable Panel candidates and exclude the internal Office availability reason.
- Final persisted checks retain two active incumbents, one unchanged research profile, four unchanged entries/totals (85, 80, 46 and 39), three valid private documents, fourteen workflow events and fourteen capacity audits including the fixture correction. Failed approvals create no appointment lifecycle, Marks handover or task-lifecycle audits; both pending requests remain pending.
- Browser acceptance exposed one frontend defect: Office Panel summary inferred AVAILABLE from seat occupancy despite backend temporary unavailability, and labelled an ineligible lecturer FULL LOAD. Corrected the summary to use authoritative capacity state/public end date. A rendered React regression reproduced the incorrect label before correction; the regression and browser recheck pass. Verification commands and final frontend results are recorded in `docs/APPOINTMENT_FAILURE_PATH_ACCEPTANCE_2026-10-07.md`.
- All **91 affected Appointments backend tests** pass in **478.759 seconds**. All **69 frontend test scripts**, TypeScript and the production build pass; Django checks, migration-drift and whitespace checks pass. Independent scoped review found no critical or important issues. This is not a new full-backend or whole-system acceptance claim. The **396-clause** checklist adds this evidence as E6 and keeps browser download saving, native-alert handling/date entry and unexercised compound requirements awaiting acceptance. Next development acceptance covers advanced Marks targeting/backups, historical-semester filters and completion windows, followed by remaining lifecycle branches. Faculty rules/coordinator identity and production-host checks remain separate. Changes are uncommitted/unpushed; isolated services are stopped after verification while normal 8000/3001 services remain available.

## Supervisor and Panel cancellation/replacement acceptance (2026-10-07)

- Completed synthetic browser cancellation and replacement through Student, incumbent/incoming Supervisor, incumbent/incoming Panel, scoped Programme Coordinator and Office views in a separate PostgreSQL database. Empty cancellation reasons reject; cancelled attempts remain in history; incumbents remain active until final approval; both successors activate with replacement lineage. Supervisor handover retains the current Panel and system-cancels the outgoing Supervisor's pending Panel nomination.
- Independent persisted checks retain one research profile, submitted scores/comments/totals of 85 and 80, and immutable retired draft snapshots of 46 and 39. Final state has eight tasks, four original entries, four clean successor tasks, four appointment lifecycle events, twelve workflow events and exactly two handover plus two task-lifecycle audits.
- Browser checks exposed and corrected three frontend defects: static Student Dashboard appointment status/name examples, distinct same-day cancelled Panel attempts being collapsed, and retired drafts inflating Office Marks monitoring. Browser rechecks confirm real current names, both cancelled attempts and operational monitoring of 2/6 submitted with zero active drafts. Mounted API-outage/Retry testing hides cards during failure/loading and restores both current appointments without a page reload.
- All **77 affected Appointments backend tests** pass in **163.028 seconds**. All **68 frontend test scripts**, TypeScript and the production build pass after the fixes; Django checks, migration-drift and whitespace checks pass. Independent read-only review found no critical or important issues. Details are in `docs/APPOINTMENT_REPLACEMENT_ACCEPTANCE_2026-10-07.md`; this is not a fresh full-backend-suite or whole-system acceptance claim.
- The five-module checklist now includes **395 individual in-scope clauses** and records this completed slice separately from still-unverified compound requirements. Next browser work covers rejection, private-file and capacity/availability failures, followed by advanced Marks and lifecycle branches. Faculty rules/coordinator identity remain deferred; production deployment checks remain separate. Changes remain uncommitted/unpushed. Normal loopback services on 8000/3001 remain available; isolated 8011/3011 services are stopped after verification and their synthetic database/evidence are retained.

## Django admin acceptance and five-module checklist (2026-10-06 to 2026-10-07)

- Real admin HTTP probes reproduced invalid Marks correction/closed-reopening server errors, unaudited evaluator and period-semester reassignment, draft comment edits, and deletable Marks audits. Further probes reproduced shared semester closure and capacity/availability writes outside the portal audit services.
- Corrected these admin boundaries while preserving the authorized, reasoned Marks correction/reopening services. Negative and non-finite correction input now rejects with form validation; governed configuration, assignments, drafts and immutable audits are inspection-only. Existing research-profile provisioning and account administration were not changed.
- Synthetic browser acceptance confirmed reason rejection, invalid-score rejection, correction from 80 to 85 with actor/reason/before-after audit, reopening to Draft, closed-period reopening rejection, and permitted post-closure correction to 86. Independent ORM assertions confirm preserved scores/status and exact audit counts. Lecturer resubmission and period closure were API preconditions for the closed-period admin checks, not additional portal-browser acceptance.
- Integrated shared Academic/Marks/admin regression verification passes **186 tests** in **178.565 seconds**. Two final permission/stale-form checks pass in **5.619 seconds** (**188 distinct affected tests** across those runs). A fresh 7 October admin-boundary recheck passes **29 tests** in **63.403 seconds**. Django system/migration-drift and whitespace checks pass; no schema or dependency change. Independent read-only review found no critical or important issues. Details and command scope are recorded in `docs/DJANGO_ADMIN_ACCEPTANCE_2026-10-06.md`; no fresh full-backend/frontend-suite claim is made.
- `docs/FIVE_MODULE_ACCEPTANCE_CHECKLIST.md` tracks **392 individual in-scope source clauses**, existing screens/API boundaries, regression candidates and remaining browser evidence. Preparing the checklist does not claim all advanced branches passed. Faculty rules/coordinator identity remain deferred and actual production deployment checks remain separate. Changes are currently uncommitted.
- On 7 October the normal loopback Django/Vite servers were restarted from the current working tree on ports 8000/3001; direct/proxied health and the existing Office account's restricted admin sign-in passed. Port 8010 acceptance services are stopped. Credentials, account permissions and development academic records were preserved; the new code has not been committed/pushed.

## Latest-main server and whole-system test handoff (2026-10-06)

- Confirmed the application fixes are on `main` and remote, then started loopback Django on port 8000 and Vite on port 3001 against `fsktm_pg_office`; mock/demo login is disabled. Docker's existing port 3000 was preserved. Django checks, migration state, direct/proxied health and real Office browser sign-in/dashboard were verified.
- Inventoried all eight development accounts and checked their configured passwords without changing accounts or access. The private account sheet/launchers/logs remain ignored. The Coordinator currently has Cyber Security scope; the human tester must grant acting AI scope through Office UI before the fresh Student's approval flow.
- Added `docs/WHOLE_SYSTEM_END_TO_END_TEST_GUIDE.md` covering all modules and advanced lifecycle branches. Registry, general Files and FAQ persistence remain incomplete; some positive replacement/transfer/supporting-supervision scenarios need additional actors. The guide records these prerequisites and integration gaps. Whole-system manual acceptance is not claimed complete by preparing this handoff.

## Full workflow browser integration (completed 2026-10-06)

- User authorized a complete Student request, Supervisor review, Coordinator approval, Panel appointment, Marks submission and semester-closure walkthrough across the five owned modules.
- The isolated synthetic browser chain reached semester closure: one approved primary appointment, one distinct confirmed Panel appointment, two submitted evaluations (85/100 and 80/100), a Closed evaluation period and a Closed semester. Persisted assertions passed after each transition; the Office reconciliation scan shows zero inconsistencies and submitted Marks remain read-only.
- Corrected the null optional Panel payload, stale Coordinator approval history/team data, stale semester-closure audit history and inconsistent UTC/Malaysia appointment dates. Separate-fixture browser rechecks confirm automatic approval refresh and audit Retry after a completed closure; exactly one closure audit remains. Independent scoped re-review reports no remaining important findings.
- All **222 Appointments tests** pass in **1902.342 seconds** using two PostgreSQL workers. All **66 frontend scripts**, lint, build and production guards pass; date checks pass under UTC, Malaysia and New York. Django checks, migration-drift checks and whitespace checks pass. No schema or dependency change is required. Existing development and prior acceptance data remain separate. Evidence and remaining production/policy limits are recorded in `docs/WORKFLOW_INTEGRATION_ACCEPTANCE_2026-10-06.md`; no additional full 623-test backend run is claimed.

## Shared cache and local release acceptance (completed 2026-10-05)

- The five owned-module fixes were committed and pushed to `main` as `30c63ba`.
- Added environment-selected PostgreSQL authentication cache, safe production default and rejection of process-local/unknown configuration. All **94 Accounts tests** passed in **397.647 seconds**, including four settings regressions and two independent-process HTTP probes for shared login/reset/confirmation budgets. Deployment requires `createcachetable`; provisioning, runtime permissions, monitoring and proxy checks are documented in `deploy/RELEASE_RUNBOOK.md`.
- Local browser acceptance used synthetic accounts in a newly created, isolated PostgreSQL database with loopback-only services and demo/mock modes disabled. Draft/Active Timeline writes and audits, Student replacement submission/candidate exclusion, stale Coordinator approval rejection, period-based Lecturer filtering, native negative-score rejection, valid drafts, locked history, four-role Settings persistence and governed admin details were verified. Persisted-data assertions confirmed the expected targets, scores and unchanged appointment state.
- Browser acceptance exposed and corrected a selected-semester calendar/summary mismatch and Timeline admin write/audit bypass. Review also found an initial semester-list Retry failure; browser reproduction confirmed it before correction and recovery without reload afterward. All **87 Dashboard/Timeline backend tests** pass in **124.899 seconds**, including two new admin tests. All **64 frontend scripts** passed; final affected tests, lint, build and both production guards pass after the Retry correction. Django system checks, migration-drift checks and whitespace checks pass. Independent read-only re-review found no remaining important findings.
- Evidence and exact acceptance limitations are recorded in `docs/BROWSER_ACCEPTANCE_2026-10-05.md`; logs/screenshots and synthetic fixture credentials remain outside Git. The earlier complete 623-test backend run predates this follow-up; affected Accounts and Dashboard suites were rerun, without claiming another full-suite run.
- No production host, domain, server or production database was supplied/provisioned. Real HTTPS/proxy, SMTP, backup/restore and faculty acceptance remain release gates. Successful browser password change/re-login requires human completion under the browser tool's credential-entry policy; negative form validation was verified and backend password-change/session tests passed. Faculty rules and coordinator identity policy remain deferred. No public deployment is claimed.

## Owned-module integrity fixes (completed 2026-10-04)

- Implemented reciprocal primary/Panel conflict checks at submission, final approval and shared activation (including Office reconciliation repairs), accepted the Add Entry `semesterId`, closed appointment/configuration admin writes, added nonnegative Marks input validation and corrected period-based task semesters/dynamic Lecturer filters. Existing appointments, drafts, history, initial profile provisioning and audited Marks correction remain covered.
- Regression tests reproduced the original defects before fixes. The full Accounts/Academics/Appointments/Dashboard/Marks suite passes **623 tests** in **519.465 seconds** using two PostgreSQL workers (**29 new tests** beyond the reviewed 594-test baseline). Initial 24-test, expanded 104-test and final 28-test focused runs also pass, including competing submissions, Office repair rollback and controlled missing-Student handling. Evidence is in the ignored `backend/final-fix-full.log`, `final-fix-focused.log`, `final-fix-affected.log` and `final-fix-review-green.log` files.
- All 63 frontend scripts, TypeScript lint, production build and both artifact guards pass. Django system checks, migration-drift checks and whitespace checks pass; no migration or dependency change is required. Independent read-only re-review reports no remaining important findings.
- The user authorized committing and pushing the verified fixes on 2026-10-04, followed by shared-cache configuration and browser acceptance. Hosting/faculty acceptance and coordinator identity policy remain release/deferred work; no public deployment is claimed.
- The listed owned-module browser scenarios were subsequently verified in the 2026-10-05 acceptance section above. The original 2026-10-03 review handoff remains preserved as historical evidence; its five findings are addressed by this slice.

## Final Owned-Module Review (2026-10-03)

- Reviewed only the five owned modules and their shared configuration dependencies at `main` / `256ee60`. No application code changed. The existing owned/backend regression suite passed **594 tests**, but targeted review uncovered gaps not covered by that suite.
- Confirmed development findings at review time (subsequently addressed in the completion section above): primary Supervisor replacement overlapping the student's active Panel role; frontend selected-semester Timeline creation rejection; Django-admin bypasses of governed appointment/configuration services; negative new Marks scores causing insertion failure; and incorrect Lecturer Marks task-semester data/hardcoded filters.
- Three isolated diagnostic probes confirmed role overlap, negative-score database failure and stale task-semester presentation. Direct serializer/admin-form inspection confirmed the Timeline rejection and editable administrative fields. Probe successes confirm bugs, not corrected behavior.
- Findings, evidence, limitations, production configuration dependencies and next-session instructions are recorded in `docs/HANDOFF_FINAL_OWNED_MODULE_REVIEW_2026-10-03.md`. Parallel reviewers stopped at a usage limit; the listed findings were subsequently verified directly. Browser acceptance remains pending. No fixes, commit, push or deployment were performed in this review.

## Main Branch Integration (2026-10-03)

- Settings persistence was committed as `98a173d`. The carryover/configuration branch, including the preceding coordinator-delegation, Marks recovery and research-amendment work, was integrated and pushed to `main` at `11e91ae`.
- Merging the remote main history introduced no file changes relative to the tested Settings commit. Existing verification results above remain applicable; no additional test run is claimed for this Git-only integration.
- Browser acceptance remains blocked by the recorded browser-tool initialization error. Coordinator identity policy remains deferred. No deployment was performed.

## Account Settings Persistence (completed 2026-10-02)

- Completed real own-account phone and announcement-preference persistence, validated password changes, session revocation and truthful unavailable-notification labels. The user confirmed that email remains Office-managed. No additional academic or coordinator authority is introduced.
- Backend verification: Accounts and Announcements suites passed **87 tests**; the final Settings/migration subset passed **14 tests**, including five added cases (**92 distinct affected tests** overall). Django checks and migration-drift checks pass. The additive migration preserves existing account credentials, contact data, account flags and linked Student details.
- Frontend verification: **62 scripts** passed, along with TypeScript lint, production build and artifact guards. Review identified expired-token recovery and delayed-response session races; fixes and regression checks pass. Final affected API/session/rendering tests, lint, build and artifact guards pass. Independent re-review found no further actionable issues. Browser interaction acceptance remains pending.
- Applied Accounts migration `0006_user_announcement_alerts` to the local development database. Before/after account row counts and content fingerprints match for all pre-existing fields; existing accounts retain enabled announcement delivery by default. Settings was committed as `98a173d` and integrated into `main`; the preceding carryover/configuration work was committed as `1e1894e`.
- Browser acceptance attempted on 2026-10-03: browser automation failed before opening the app (`failed to write kernel assets: The system cannot find the path specified`), including one retry after resetting the browser runtime. No UI acceptance pass is claimed. Remaining manual checks: on a synthetic account, save a phone number and announcement preference, reload and confirm persistence; verify a rejected password change shows an error without a success message; change the password successfully, confirm return to login, and sign in with the new password. Repeat Settings access for Student, Lecturer, Coordinator and Office roles. Confirm email is read-only and unsupported notification services are labelled unavailable.

## Logical Configuration Corrections (completed 2026-10-01)

- Implemented the three approved follow-up fixes: literal spreadsheet exports, fresh backup assignments after retirement, and consistent Malaysia deadline entry/display. Prior carryover changes remain preserved.
- Backup regressions reproduced the original failures before the service change; 24 focused backup/targeting/handover checks passed afterward. XLSX round-trip and CSV prefix tests also failed before their fixes and passed afterward. Final integrated verification passes **166 affected backend tests** across Marks, Dashboard and appointment lifecycle in **148.956 seconds**, including concurrent duplicate backup requests. All **60 frontend scripts**, TypeScript lint, production build and production artifact guards pass. The timezone tests also pass under UTC, Asia/Kuala_Lumpur and America/New_York. Django system checks, migration-drift checks and whitespace checks pass. Independent scoped review found no remaining actionable issues. No new migration is required; browser walkthroughs were not rerun.
- Coordinator account identity remains deferred. This slice and the carryover work were subsequently committed and pushed as `1e1894e` on `codex/carryover-capacity`; no deployment was performed. Settings persistence is tracked separately above.


## Follow-up Logical Configuration Review (2026-09-30)

- A bounded follow-up inspection found three additional issues: spreadsheet formula interpretation of user text, retired backup-task reuse on reassignment, and inconsistent browser-local versus Malaysia deadline entry. The first two were reproduced using an isolated Django test database; a timezone probe confirmed the third. These findings were subsequently fixed and verified in the 2026-10-01 correction slice above.
- Details and recommended controls are recorded in `docs/LOGICAL_CONFIGURATION_REVIEW_2026-09-30.md`. The earlier passing regression results do not cover these newly identified scenarios. No application code, development academic data, commits or pushes were changed by this review.
- Coordinator/lecturer cross-account identity remains the deferred item from the original edge-case list. Settings persistence was subsequently implemented in the slice above; faculty/staging acceptance remains pending. Completion of the original list is not a claim of production readiness.


## Carryover Capacity Reassessment (completed 2026-09-30)

- User approved reasoned Office reassessment of pending Closed-semester Supervisor, co-supervisor and Panel requests against the effective Active semester capacity policy. Original request history remains unchanged; no capacity bypass or automatic approval is introduced.
- Implemented the append-only capacity reassessment ledger, staff-scoped API, Office controls and coordinator history in existing Supervisor Appointment screens. Authorizations preserve the original request and recheck current policy at activation; archived manual decisions are locked. Latest-event tokens reject stale forms after revocation.
- Verification: all **573 backend regression tests passed** across Accounts, Academics, Appointments, Dashboard and Marks in **436.311 seconds** on two PostgreSQL workers. The final archive-guard regression and corrected real-deferral fixture both passed separately (**2 focused checks**, one additional distinct test). Coverage includes migration preservation, reassessment decisions, permissions, capacity exhaustion and PostgreSQL concurrency. All **58 frontend scripts**, TypeScript lint, production build and artifact guards passed; the final event-token change was rechecked with its affected tests, lint, build and guards. Final Django system and migration-drift checks pass.
- Applied `appointments.0015_capacity_reassessment` to the local development database. Before/after row counts and content fingerprints match across all **44 existing Accounts/Academics/Appointments/Marks models**; no existing academic data changed. Verification evidence is retained outside Git in the local temporary directory.
- Independent review findings for stale authorization after revocation and incomplete archived-decision guards were fixed; bounded re-review reports no remaining substantive findings. Browser initialization timed out, so browser acceptance remains unverified. Changes were subsequently committed and pushed as `1e1894e` on `codex/carryover-capacity`; no deployment was performed.


## Audited Research Amendments and Programme Transfers (2026-09-29)

- Implemented request/revision workflows, reasoned Office corrections, source/destination transfer approvals, existing-screen controls, lifecycle/nominations integration and scoped Dashboard/report/XLSX/dossier tracking. A repeated approval cannot advance a second stage implicitly, even when the same coordinator manages both programmes.
- Verification: 43 focused backend/reports tests passed, including concurrency, migration preservation and reconciliation; a further 13-test migration/lifecycle run passed after adding baseline-handover coverage and updating older migration test states (these runs overlap). All 56 frontend test scripts, TypeScript lint, production build, production artifact guards, Django checks and migration-drift checks passed.
- Full regression passed on 2026-09-28: **552 backend tests** in 903.371 seconds using `manage.py test accounts academics appointments dashboard marks --parallel 2 --noinput --verbosity 2`. The earlier PostgreSQL disk-full failure did not recur after storage headroom became available and concurrency was reduced; no unrelated files or databases were deleted. The local evidence is `backend/verification-final.log` (ignored by Git).
- Applied migrations `0013`/`0014` locally and verified unchanged fingerprints for 4 Students, 2 research profiles, 2 primary applications/appointments and 1 Panel appointment. Local Marks tables are empty; migration fixtures separately exercise preservation of assignments, drafts and submitted scores.
- Interactive browser acceptance completed in an isolated database copy: Student research submission, primary endorsement, coordinator final approval, Office meaning-preserving correction, Office transfer submission, source endorsement and destination approval with explicit team acknowledgements. Verified revision 3, synchronized programmes, destination access, outgoing history-only access, unchanged appointments/Marks and unchanged original academic records. Read-only Student/Lecturer/Coordinator/Office checks also passed. Faculty acceptance and additional staging scenarios remain release gates.
- Browser acceptance found an undefined coordinator waiting label. Added all three coordinator-stage labels and a failing-then-passing regression test. All 56 frontend scripts passed before this small fix; the affected test, lint, production build and artifact guards passed again afterwards. Dependency audit reports **zero vulnerabilities**. Final Django checks, migration-drift check and whitespace check passed. Independent bounded review found no critical or important amendment-workflow issues.
- Backup rehearsal restored a custom-format dump to a separate database and matched all **62 public tables** by row count and content fingerprint. Dumps and local acceptance data remain outside Git. No hosting server exists yet; `deploy/RELEASE_RUNBOOK.md` records provisioning decisions, configuration, backups, rollback and acceptance steps. No public deployment is claimed.
- User authorized committing and pushing the combined acting-coordinator, completion-window, research-amendment and release-preparation changes after verification.

## Letter Templates: Archive and Placeholder Validation (2026-09-27)

- **Archived status.** Letter templates gain an `Archived` status (migration `letters.0002_template_archived_status`). Archived templates keep their wording, never appear to students (hidden from the list, 403 by id), and can be restored to Draft or Active. The editor hides them behind a "Show archived templates" toggle, and the status field offers Archived.
- **Placeholder registry.** `letters/placeholders.py` lists all 16 supported placeholders with a label and the source of each value. `GET /api/letter-templates/placeholders/` exposes the list to signed-in users, and the editor's insert buttons now come from it, showing the source as a tooltip.
- **Validation.**
  - Creating a template, changing its content, or publishing it now rejects unknown tags (for example `{{STUDNET_NAME}}`) and malformed ones (`{{NAME}`, `{NAME}}`, `{{ name }}`). The response is 400 with `unknownPlaceholders` and `malformedPlaceholders`, and the message is shown under the content field.
  - A legacy template with a bad tag can still be archived, but cannot be published until it is fixed.
  - All four templates in the development database pass the new check.
- **Editor.**
  - The "Preview" buttons used to show a canned "validated successfully" message without checking anything. They are now "Check" actions that run the same rules as the server.
  - The live preview marks unknown tags in red.
- **Supervisor in letters.** `/api/auth/me/letter-details/` now fills `supervisorName` from the student's current primary supervisor instead of leaving it blank, so `{{SUPERVISOR_NAME}}` has a real source.
- **Parity.** A frontend test reads `letters/placeholders.py` and checks that `LETTER_PLACEHOLDERS` (tags and labels) matches it, that `substitutePlaceholders` fills every tag, and that the editor check agrees with the server rules.
- **Verification.**
  - **Backend:** **595 tests passed**, including 9 new letter-template tests and a letter-details supervisor test.
  - **Frontend:** all **55 test scripts** passed.
  - TypeScript lint, production build, production guards, Django system and migration-drift checks, and `git diff --check` pass. The migration was applied to the development database after a `pg_dump` backup.
- **Live smoke check** with temporary office and student accounts, all deleted afterwards:
  - A typo and a missing brace were each rejected with a clear message.
  - A valid template was created, archived (hidden from the student), and restored.
  - The placeholder endpoint listed all 16 tags and refused anonymous access.
  - Browser visual acceptance remains unverified.

## Registry Supervisor Data and Role-Scoped Read Access (2026-09-27)

- **Supervisor data.**
  - Registry records now carry `supervisor` and `supervisorStaffNo` from the student's active primary `SupervisorAppointment`. The data is only read from the appointments module, never written.
  - One prefetch loads it, and a test confirms the list's query count does not grow with the number of students.
  - `GET /api/registry/students/?supervisor=` matches a supervisor's name or staff number.
- **Read scope (UC05).**
  - Office Staff/Admin read every record.
  - Programme Coordinators read their managed programme, reusing `accounts.authorization.coordinator_programme`.
  - Coordinators and Lecturers also read the students they currently supervise or co-supervise.
  - A record outside the caller's scope returns 404, and every write, import, access-link, and import-history endpoint stays Office-only.
  - The two older tests that expected lecturers to be refused outright now expect a scoped, read-only registry.
- **Frontend.**
  - Lecturers now have the Registry module. Coordinators and lecturers see it read-only: no register, import, bulk verify, status change, access link or reinstate actions, and no staff and lecturer tab.
  - Added a Supervisor column and a supervisor filter (including "No supervisor yet"). Reset clears every filter, and an empty result reads "No matching students found".
  - The programme, semester, and status filters previously offered values no record could match ("PhD (CS)", "Master (SE)", fixed semester strings, and "Pending"/"Suspended" as academic statuses). They now use the approved programme list, the semesters present in the data, and the four real statuses.
- **Removed invented content.**
  - All five summary cards were fabricated (for example `1248 + (students.length - 6)` and a flat `145`). They are now computed from the loaded records: total, active, deferred, graduated or withdrawn, and awaiting activation. "New this intake" was replaced with "awaiting activation" because intake values are free text, with no reliable "latest intake".
  - The student panel's "verification milestones", including a hardcoded staff name, now show the account's real activation state, sign-in access, and last sign-in.
- **Verification.**
  - **Backend:** **585 tests passed**, including 7 new scope tests.
  - **Frontend:** all **54 test scripts** passed, including new summary-helper tests and a source guard against the fabricated values and unguarded write actions.
  - TypeScript lint, production build, production guards, Django system and migration-drift checks, and `git diff --check` pass. No migration was needed.
- **Live smoke check.** Temporary office, coordinator, lecturer, and student accounts plus a temporary Draft semester and appointment were used, then deleted.
  - Office saw all three test students with the supervisor details, and the filter matched.
  - The coordinator saw only the student in their programme, and the lecturer saw only their supervisee; each got 404 for the other student and 403 for writes.
  - The student got 403.
  - Browser visual acceptance remains unverified.

## Server-Side Student Import With Real History (2026-09-26)

- **Import endpoint.** `POST /api/registry/students/import/` (Office only) accepts CSV or XLSX up to 2 MB and 1,000 student rows. XLSX is opened read-only after a ZIP signature check.
  - It validates the header row and every row: required matric number and name, a valid email, an approved programme (any letter case), no duplicate matric number or email within the file, and none already registered. Rows are never auto-corrected.
  - `dryRun=true` returns per-row statuses without writing anything.
  - A commit creates each Ready row on its own through the same code path as single registration, skips duplicates, leaves other problem rows out, and sends activation emails.
- **History.** Each commit is recorded as a `RegistryImportBatch` (migration `accounts.0006_registry_import_batch`) with counts, the uploader's name, and the rows that need attention. `GET /api/registry/imports/?limit=` lists them.
- **Programme list.** `APPROVED_PROGRAMMES` moved to `accounts/programmes.py`, and a backend test fails if it drifts from `frontend/src/constants/programmes.ts`. A frontend test likewise checks that the template headers match the backend's `IMPORT_HEADERS`.
- **Registry import screen.**
  - Accepts XLSX as well as CSV and gets its preview from the server. Edited rows are sent back to the server to be checked again.
  - Rows are keyed by line, so duplicate IDs in a file no longer collide.
  - After an import, only the rows that were not created stay on screen for correction.
  - Recent Imports shows real batches, "View All" loads up to 50, and each batch's problem rows can be downloaded as CSV.
- **Removed invented content** from the import screen: the pre-filled file name, two fake import-history entries, "security scan" wording, the hardcoded 1,248/86 counts (now real registered and awaiting-activation counts), and column and guideline text that did not match the importer.
- The browser-side validation in `utils/csvImport.ts` was retired. Its test cases now run as backend tests, and the module keeps only the template and the CSV builder for reviewed rows.
- **Verification.** **578 backend tests passed** across all seven apps, including 15 new import tests, and all **53 frontend test scripts** passed. TypeScript lint, production build, production guards, Django system and migration-drift checks, and `git diff --check` also pass. The new migration was applied to the development database after a `pg_dump` backup.
- **Live smoke check** with SMTP disabled for the server process:
  - A CSV preview and commit created one row and left out one with a bad programme.
  - An XLSX preview and commit created one row and skipped a row already registered by the CSV run.
  - A `.txt` upload was refused, and Recent Imports listed both runs.
  - The temporary accounts, imported students, and batches were deleted afterwards. Browser visual acceptance remains unverified.

## Sign-In Safety: Session Expiry, Forced Password Change, Access Links (2026-09-26)

- **Session expiry (UC01).** When a signed-in session can no longer be refreshed, the login card now shows "Your session has expired. Please sign in again." A normal sign-out shows no message.
- **Forced password change (UC02).**
  - The user payload now includes `mustChangePassword`.
  - `accounts.password_policy.PasswordPolicyJWTAuthentication`, registered as the DRF default authentication class, answers flagged accounts with 403 and code `password_change_required` everywhere except `GET /api/auth/me/` and `POST /api/auth/me/change-password/`. Refresh and logout keep their own cookie authentication, so they still work.
  - The frontend holds flagged users on a full-screen change-password step before the app shell, and returns to it if any request reports `password_change_required`. The Settings password form is now a shared `PasswordChangeForm` component.
  - The Office marks dashboard preload waits until the password has been changed.
  - The flag is set by an administrator, for example in Django admin. New accounts still use activation links rather than temporary passwords.
- **Office-sent access links (UC02).**
  - `POST /api/registry/students/<matric>/send-access-link/` (Office only) resends the activation email to accounts that were never activated and sends a password-reset email otherwise. It refuses suspended accounts with 409 and reports whether the email was sent.
  - It is throttled per student account (`REGISTRY_ACCESS_LINK_THROTTLE_RATE`, default 3/hour); requests refused for non-office users do not count toward the limit.
  - The action sits in the Registry student panel rather than in the table row, so the office can see the account's state before sending.
  - `send_password_reset_email` now reports whether the email was sent; the anonymous reset endpoint still ignores that result.
- `backend/.env.example` now also documents `AUTH_CHANGE_PASSWORD_THROTTLE_RATE` and `REGISTRY_ACCESS_LINK_THROTTLE_RATE`.
- **Verification.**
  - **Backend:** **563 tests passed** across all seven apps on four PostgreSQL workers, including 12 new ones (5 for the forced password change, 7 for access links). With the default authentication class switched back to plain JWT, the enforcement test fails.
  - **Frontend:** all **52 test scripts** pass, including new render and wiring tests and an API-client test for the `password_change_required` event. TypeScript lint, production build, production guards, Django system and migration-drift checks, and `git diff --check` also pass.
- **Live smoke check** against the development database, using temporary accounts that were deleted afterwards and SMTP disabled for the server process:
  - The flagged login reports the flag, is refused elsewhere with `password_change_required`, changes the password, and then regains access with the flag cleared.
  - Access links return an activation link for a never-activated account and a reset link for an activated one, and a suspended account gets 409. Both emails were printed to the console, not sent.
  - Browser visual acceptance remains unverified.

## Registry Status Changes Use the Participant Lifecycle (2026-09-26)

- Fixed an integration bug between Registry Management and the participant lifecycle. The Registry update endpoint assigned `Student.status` directly, so withdrawing or graduating a student from the Registry left active appointments open, did not pause or retire Marks tasks, did not cancel pending work, and wrote no audit record.
- Any `academicStatus` change on `PATCH /api/registry/students/<matric>/` now goes through `transition_student` with a required `statusReason`. Lifecycle errors map to 400, 403, or 409 (409 includes blockers), and the transition and any other field edits in the same request succeed or fail together. Sending the current status needs no reason. Registration now only creates Active students.
- The Registry student panel has a "Change Academic Status" control. It offers only the lifecycle's allowed transitions, requires a reason, lists blockers when a transition is refused, and links to Participant Lifecycle to resolve them.
- Lifecycle transitions require an Office Staff/Admin account that also has Django `is_staff`. Registry editing does not, so an office account without `is_staff` can still correct Registry fields but receives 403 for status changes.
- Verification: **551 backend tests passed** across all seven apps on four PostgreSQL workers. They include 7 new Registry tests; 6 of them fail on the previous code, including a regression test proving that a Registry withdrawal now ends the active supervisor appointment. All **50 frontend test scripts** (including the new `registryStatus.test.ts`), TypeScript lint, production build, production guards, Django system and migration-drift checks, and `git diff --check` pass.
- Live smoke check against the development database: a missing reason returns 400, Active-only registration returns 400, reversing a Graduated status returns 409 with other fields unchanged, and a normal edit returns 200; the temporary accounts were deleted afterwards. The successful transition was verified by tests only, because lifecycle audit rows are protected from deletion by design and would have left permanent smoke data. Browser visual acceptance remains unverified.

## Settings, Student Registry, and Security Hardening (2026-09-26)

- Settings now persists through Django: phone number via `PATCH /api/auth/me/`, password change (current-password check, Django validators, its own throttle scope keyed on the account), and per-user notification preferences (`NotificationPreference`, migration `accounts.0004_notificationpreference`). Email, role, and ID fields stay office-controlled.
- Student Registry is served by `/api/registry/students/` for Office Staff/Admin only. Registration creates the account and profile in one transaction without a password (the student activates through a link). Bulk verify, CSV import, correction, and reinstatement persist through the API; CSV rows are validated against the approved programme list with in-file duplicate detection, and the template is generated from the importer's own header list.
- Authentication hardening: login hashes even for unknown identifiers, disabled accounts get the same generic 401, password reset rejects inactive accounts and validates against the resolved user, and reset mail failures no longer reveal registered addresses.
- Announcements and letters authorization: edit/delete restricted to the author (Office Staff/Admin may moderate), drafts visible only to their author including retrieval by id and attachment download, attachments validated for size (`ANNOUNCEMENT_MAX_ATTACHMENT_BYTES`, default 10 MB), extension allowlist, and magic bytes, idempotent delivery, and retraction withdraws delivered notifications. Draft letter templates are hidden from students and lecturers.
- Frontend services only fall back to mock data on a genuine transport failure; an HTTP error is shown as an error instead of rendering fixtures as real records. Letter generation is blocked when the student's record cannot be loaded.
- FAQ chatbot: design spec and phased plan recorded under `docs/superpowers/`; `scripts/parse_faq_pdf.py` extracts the office FAQ into `docs/faq/faq-entries.json`, with 48 of 163 rows flagged for manual review before loading. The chatbot itself is not implemented yet.
- Merged the latest `main` (PR #12) and adopted the refresh-cookie session. The session-expired event now fires when a request that had a session still receives 401 after the automatic refresh. `accounts.0005_merge_20260925_2258` joins the two `0004` migrations. Because `CHECK_REVOKE_TOKEN` invalidates every token on a password change, password change now blacklists outstanding refresh tokens and re-issues tokens for the current session instead of signing the user out on their next request. Existing login tests now post JSON.
- Applied all migrations to the local development database after taking a backup.
- Verification: **544 backend tests passed** across all seven apps on four PostgreSQL workers. All **49 frontend test scripts**, TypeScript lint, production build, production demo/CSP/artifact guards, Django system and migration-drift checks, and `git diff --check` pass. A live HTTP smoke test against the migrated development database passed 33/33 checks covering login/refresh/logout, Registry, letters, announcements, notifications, Settings including password change, Academics and Dashboard endpoints, and role restrictions; its temporary accounts were deleted afterwards. Frontend checks ran on Node 22.16.0, below the declared `>=22.22.0` (npm warns but everything passes). Browser visual acceptance remains unverified.
## Task-Specific Marks Completion Windows (2026-09-24)

- Implemented reasoned Office batch grants, replacement/renewal, revocation and immutable history for existing eligible unfinished tasks. Closed-period recovery keeps the period and semester closed; archives stay locked. Submission records its effective deadline/window, and lifecycle changes invalidate rather than transfer exceptional access.
- Added closure/handover previews, signed stale-state tokens, unfinished-work acknowledgement and archival blockers. Existing Office/evaluator screens, Dashboard actions/counts, reports/XLSX, dossiers and reconciliation use the effective task deadline without expanding role access.
- All **519 backend tests passed** in **308.913 seconds** across Accounts, Academics, Appointments, Dashboard and Marks on four PostgreSQL workers. After the final task-response status fix, all **37 focused backend tests passed** again in **22.629 seconds**, including PostgreSQL concurrency, migration preservation, immutable history, eligibility/permission boundaries, expiry/revocation, lifecycle handover, closure previews and Dashboard integration. All **54 frontend test scripts**, TypeScript lint, production build and production artifact/security guards passed. Corrected invalid UTF-8 separators in two evaluator components and reran affected rendering and production build successfully.
- Applied Marks migrations `0009` and `0010` locally. Existing primary/Panel appointments and research-profile fingerprints remain unchanged; this local database contains no periods, tasks or Marks. Migration regression fixtures separately confirm preservation of existing assignments, draft/submitted entries and scores.
- Verification reproduced and fixed a grant-versus-evaluator-handover deadlock, a consumed-window preview overcount, and a compatibility regression for ordinary open-period tasks lacking an appointment record. Task responses explicitly retain the effective period status during exceptional completion. Django system checks, migration-drift checks and final diff whitespace checks passed. Browser visual acceptance remains unverified.
- Preserving all uncommitted acting-coordinator changes. No commit or push is included.
- Implementation ruling: otherwise eligible unfinished tasks must not be automatically retired solely because their period closed; reconciliation will require an Office recovery decision so that late completion remains possible.

## Temporary Acting-Coordinator Delegation (2026-09-21)

- Implemented Office grants and reasoned revocation for existing active Coordinator accounts, inclusive Malaysia dates, immutable history, overlap protection, automatic expiry, and active/future retirement blockers. Regular coordinators retain their authority.
- Effective programme scope now covers Supervisor, Panel and supporting-supervisor queues, decisions and lifecycle actions, Dashboard actions/counts, dossiers, reports/XLSX, notifications and reconciliation. Final mutations lock and recheck delegated authority against revocation; historical actors and pending records remain unchanged.
- Office management is embedded in participant management. Coordinators can view their regular/effective scope and their own delegation history. Programme filters trim whitespace and ignore case.
- Verification completed: all **482 backend tests passed** across Accounts, Academics, Appointments, Dashboard and Marks in **309.911 seconds** on four PostgreSQL workers. The preceding **34 focused backend tests** also passed, covering delegation APIs, concurrent grants/revocation, retirement, migration preservation, appointment decisions/access and Dashboard/report integration. All **50 frontend test scripts**, TypeScript lint, production build and production security/artifact guards passed on Node **22.22.0**. Django system checks, migration-drift checks and diff whitespace checks passed. Browser visual acceptance remains unverified.
- Applied additive migration `accounts.0005_coordinatordelegation` to the local development database. Before/after fingerprints confirm unchanged regular coordinator, primary/Panel appointments, research profiles and workflow audits; the database has no supporting appointments, Marks or evaluation tasks. Changes remain uncommitted on `Lim_Branch`. Permanent coordinator replacement and cross-account identity/self-approval policy remain outside this feature.

## Programme-Scoped Marks Evaluation Periods (2026-09-16)

- Implemented ALL/SELECTED programme targeting and Supervisor/Panel role selection with legacy defaults, Draft-only edits, audited configuration, and read-only Django admin fields. Office can review current recipients, new/existing tasks, and missing eligible appointments before publishing; empty previews show a warning and late additions remain automatic through existing triggers.
- Preview, official task generation, and missing-task reconciliation share eligibility selection. Generation rechecks under period/student/lecturer locks, replacement tasks respect current targeting, and manual backups enforce programme and original-task boundaries. Existing tasks, drafts, and submitted results are retained on programme changes.
- Added migration `marks.0008_evaluation_period_targeting` and applied it to the local development database. Before/after snapshots confirm its existing 2 primary appointments, 1 Panel appointment, and 2 research profiles are unchanged; this database currently has no evaluation periods, tasks, or Marks. Historical-period and Marks preservation are additionally covered by migration regression fixtures.
- Verification completed: **408 affected backend tests passed** across Marks, Appointments, Dashboard, participant lifecycle, and Academics in 981.570 seconds on four PostgreSQL workers. The final **5 migration/admin/validation checks also passed**, including the strengthened draft/submitted Marks preservation fixture and new Django admin bypass regression. Targeting coverage includes read-only preview, programme/role boundaries, backups, late eligibility, lifecycle preservation, and concurrent generation. All **48 frontend scripts**, TypeScript lint, production build, and production artifact guards pass on Node 22.22.0. Django checks, migration-drift checks, and `git diff --check` pass.
- Verification exposed stale parallel test databases after adding a migration; recreated the test clones. Also corrected an existing reconciliation assertion to compare the local approval date, explicitly exercising the UTC/Malaysia calendar boundary rather than depending on the time the suite runs.
- Privacy and dependency-security changes remain preserved. Changes are prepared for delivery on `Lim_Branch`; browser visual acceptance remains unverified because of the previously recorded browser runtime issue.

## Student Panel Team Privacy Fix (2026-09-15)

- Reproduced and fixed internal Panel recommendation IDs, stages, and update timestamps appearing in Student supervisory-team timelines across team detail, workspace, and embedded dossier responses.
- Student timelines now show one public current state: undated Faculty processing for pending recommendations, or Confirmed with the active appointment's date. Active appointments take precedence during replacement; terminal history is omitted when no current record qualifies. Existing staff access and standalone Panel/dossier history policies are preserved.
- Shared Panel selection logic keeps the Student Panel page and team response consistent. Frontend timeline rendering supports null dates and readable status labels. No migration or new endpoint is required.
- Verification: **77 relevant backend tests passed**, including four new privacy regression tests covering all three response paths, terminal outcomes, confirmation/replacement precedence, staff visibility, and unrelated-user denial. **10 relevant frontend scripts passed**, including team rendering, co-supervision API, Panel utilities, dossier integration, and both production artifact guards. TypeScript lint, production build, Django system checks, migration-drift check, and `git diff --check` passed. Frontend checks used Node 22.22.0. The earlier full-suite totals below are historical; the full suite was not rerun for this focused fix.
- Browser visual acceptance remains unverified because of the previously recorded browser runtime issue. Changes are included with the programme-targeting delivery on `Lim_Branch`; dependency-security changes have been preserved. Evaluation configuration and coordinator policy improvements remain separate follow-up work.

## Post-Merge Dependency Security Maintenance (2026-09-15)

- Confirmed PR #11 merged co-supervisor commit `fb2c00d` into `main` at `ad520e0`. Fast-forwarded the local `Lim_Branch` to that merged state before beginning maintenance.
- Reproduced the two npm findings and Python audit findings affecting Django, DRF, pip, and sqlparse. Updated the frontend lockfile to Browserslist 4.28.9 and baseline-browser-mapping 2.11.23 with their browser-data dependencies. Installed Django 5.2.17, DRF 3.17.2, sqlparse 0.6.0, and pip 26.2; raised requirement floors and documented pip setup accordingly.
- Fresh npm and installed-environment pip-audit scans report **zero known vulnerabilities**; `pip check` reports no broken requirements. The complete Accounts/Academics/Appointments/Dashboard/Marks suite passes **437 tests** against Django 5.2.17 and DRF 3.17.2. All **46 frontend scripts**, TypeScript lint, production build/guards, Django checks, and migration-drift checks pass after the updates. No application code or database schema changes were required.
- Final frontend verification used an isolated npm-cached **Node 22.22.0** runtime, meeting the existing `>=22.22.0` requirement without modifying the system-wide Node 22.14 installation. Production environments must also meet the declared runtime requirement.
- Browser runtime initialization was retried and still fails with the missing kernel-assets path, so browser acceptance remains unverified. Production hosting configuration remains pending the hosting decision. These dependency and documentation updates are included with the programme-targeting delivery on `Lim_Branch`.

## Co-Supervisor and Supervisory Team Management (2026-09-13)

- Implemented dedicated co-supervisor nominations and appointments, with one primary and at most two supporting positions. Primary nomination, lecturer acceptance, programme-scoped coordinator decisions, reasoned cancellation, closure, and replacement are available in the existing Supervisor Appointment screens.
- Active co-supervisors consume shared supervision capacity; pending nominations occupy team positions without reserving lecturer workload. Student and lecturer row locks, final eligibility/capacity checks, database uniqueness constraints, and stale `409` responses protect activation and replacement.
- Primary handover retains approved co-supervisors and cancels outgoing unfinished nominations. Graduation/withdrawal and retirement blockers include supporting records. Co-supervisor changes never generate, transfer, or retire Marks tasks.
- Added restricted research/team/timeline reads, current-access revocation on closure, own historical records, immutable workflow/lifecycle audits, notifications, Dashboard actions, reports/XLSX, workload exports, authorized dossiers, and review-required reconciliation findings. Co-supervisor report links open the team workspace rather than an inaccessible internal dossier.
- Final verification: the complete Accounts/Academics/Appointments/Dashboard/Marks suite passes **435 tests** with four isolated PostgreSQL workers, and two subsequently added coordinator-rejection/temporary-unavailability tests pass separately: **437 distinct backend tests passed**. All **46 frontend test scripts**, TypeScript lint, production build, and production artifact guards pass. The final candidate-label adjustment was rechecked with the affected component/API tests, lint, build, and artifact guards. New Python files pass Black checks and the full diff passes whitespace checks.
- Live HTTP smoke through Vite and JWT authentication passes primary nomination, candidate acceptance, coordinator approval, Student viewing, Office closure, and former co-supervisor access revocation/history. PostgreSQL concurrency tests cover competing claims on the last team position and competing final approvals for one lecturer's remaining capacity. Migration round-trip coverage preserves submitted Marks and existing primary/Panel/research/audit records. Independent review confirmed the supporting report navigation fix; no remaining findings were reported for that fix.
- Applied `appointments.0012_co_supervisor_team` to the local development database. Before/after record-content fingerprints confirm unchanged primary appointments, Panel appointments, research profiles, Marks, and existing workflow/lifecycle audits. Django system checks and migration-drift checks pass.
- At the September 13 feature verification, npm reported two findings (moderate `baseline-browser-mapping`, high `browserslist`), and the installed Python environment reported advisories affecting Django, Django REST framework, pip, and sqlparse. The September 15 maintenance described above resolves these findings; earlier audit statements below are historical results.
- Browser smoke remains unverified because the computer-use browser runtime failed to initialize with a missing kernel-assets path. HTTP smoke and component rendering tests are not a substitute for a browser visual check.
- Official faculty templates and policy confirmation remain pending. Automatic promotion to primary supervisor is outside this version's scope. The feature was merged into `main` through PR #11 at `ad520e0`.

## Lecturer Capacity and Availability Management

- Consolidated `Lim_Branch` with the latest `origin/main` through an ancestry-only merge that produced no file-content changes. Post-merge verification passes all 409 Accounts/Academics/Appointments/Dashboard/Marks tests, Django system and migration-drift checks, all 44 frontend `.test.ts` scripts, dependency audit with zero findings, TypeScript lint, production build, and production demo/CSP/artifact guards.
- Approved a semester-specific, versioned capacity design for independent Supervisor and Panel limits, date-ranged role availability, fail-closed semester activation, and immutable operational audits.
- Existing appointments remain valid when capacity is reduced or availability changes. Over-capacity and unavailable Lecturers are blocked from new assignment activation without automatic workflow cancellation.
- New semesters can copy the previous published plan into Draft for Office review. Existing global limits seed documented cutover baselines only.
- Task 1 provides the four capacity-policy models, schema constraints and indexes, projected-state validation for partial entry and availability saves, authoritative validated individual entry saves, single-Draft-plan bulk creation with whole-batch prevalidation, duplicate-input rejection, sequential transactional saves, and caller-state restoration on failure, rejection of direct QuerySet/bulk updates and conflict mutation options, native instance-delete signal identity, exact locked-primary-key deletion across normal and raw QuerySet paths even when related-field predicates expand, serialized validated availability saves, stale-publication-safe admin forms, append-only audits including conflict-update rejection, and 64 focused model/admin tests in academics migration `0002`.
- Task 2 provides the shared read-only capacity resolver and assignment conflict guard with all six states, published-plan authority, persisted eligibility, role-specific availability, zero-limit and over-capacity handling, global Supervisor and Panel active-load counting, separate Panel reservations, public reason redaction, temporary-state-only availability dates, and semester-aware compatibility limit helpers. Fourteen focused resolver tests cover precedence redaction, effective/cancelled/expired/future windows, deterministic Kuala Lumpur date boundaries, and a portable query ceiling.
- Task 3 now provides transactional blank/copy/clone plan creation, Draft entry upsert, current-eligibility readiness validation, atomic publication/supersession, role-specific availability creation/cancellation, focused validation versus lifecycle conflict exceptions, and deterministic JSON-safe snapshots. Cross-semester copy retains `supersedes` lineage and is restricted to the latest strictly prior Published semester; all plan writes and new restrictions reject Closed/Archived targets. A canonical SHA-256 `contentFingerprint` is mandatory for entry edits and publication, with malformed-input versus stale-content conflict separation and no schema change. Publication locks all and only same-semester plan entries in deterministic plan/Lecturer/entry order before fingerprint/readiness validation. Historical cancellation remains available after role/lifecycle removal only for an unchanged persisted semester/Lecturer/role identity; new and identity-reassigned fully cancelled rows still require role eligibility, and cancelled windows cannot reactivate. Shared PK-ordered semester locking now covers both multi-semester copy and activation while preserving Marks handover. Database uniqueness guards, stale-object checks, mandatory reasons, rollback, current-role copy filtering, Published/Superseded historical cloning, zero-limit publication, active-appointment preservation, and immutable per-action audits are covered by 27 focused lifecycle tests.
- Task 3 hardening verification passes all 109 `academics.test_capacity` tests, including three focused historical-cancellation identity regressions and a PostgreSQL `TransactionTestCase` where two same-fingerprint updates produce exactly one commit and one conflict, plus all 11 semester lifecycle/API tests including reverse-ID lock-order handover. Django system/migration checks, `academics/capacity_services.py` Black validation, and `git diff --check` are rerun before commit.
- Task 4 provides the complete Office-only capacity management API surface for plan list/create/detail/edit/clone/publish, nested Lecturer-entry updates, availability list/create/cancel, and immutable audit retrieval. Exact camelCase serializers require version and fingerprint tokens on stale-sensitive writes; deterministic responses expose stable IDs, semester/version lineage, readiness, actors/timestamps, current shared-resolver loads, and Office-internal availability history. Domain and concurrent conflicts return `409`, malformed values `400`, unknown objects `404`, and every non-Office management request `403`. Nine focused API tests cover the contract, authorization, lifecycle/stale failures, internal-reason boundary, deterministic ordering, and a five-entry detail response bounded to 20 queries. All 118 capacity model, lifecycle, concurrency, resolver, and API tests pass together.
- Task 4 API hardening now rejects unknown/wrong-case/surplus body fields without side effects, validates an empty clone command, bounds plan/audit/availability histories with default-25/max-100 limits and offsets capped at 1,000,000, exposes array metadata through CORS-readable headers, shares one prefetched resolution/readiness context across listed plan versions, and enforces a reusable Office permission before all dispatch methods and object lookups. The focused API class includes scale, malformed and excessive pagination, multi-version query ceilings, and Student/Lecturer/Coordinator method-level denial coverage; all 18 API tests and all 127 capacity tests pass.
- Task 5 makes semester activation fail closed before any handover side effect unless the locked Draft target has exactly one complete Published plan. Historical migration `0003` creates idempotent `MIGRATED_BASELINE` policies only for the Active and unresolved-workflow semester set, preserves all identifiers and existing plan history, and copies role-specific legacy limits only for currently eligible Lecturers. Guarded demo seeding and owned capacity-sensitive fixtures now publish realistic plans through fingerprinted lifecycle services without replacing existing policy.
- Task 5 verification passes 32 focused activation, migration, helper, and guarded-seed tests; all 390 owned-backend tests across Accounts, Academics, Appointments, Dashboard, and Marks; and all 131 capacity/helper tests after aligning publication eligibility with the resolver's active-account rule. The sole fixture incompatibility was corrected by closing rather than deleting a semester with protected policy history. Django checks, migration drift, formatting, and diff integrity are rerun before commit.
- Task 6 makes Supervisor and Panel candidate directories, workload rows, submissions, final approvals, and replacement activation consume the same persisted semester policy. Ineligible and temporarily unavailable new selections are hidden; full, over-capacity, and unconfigured candidates remain visible but disabled. Existing selected identities stay visible with only a public availability end date, and private Office reasons are never serialized.
- Task 6 preserves assigned review work while rechecking capacity at final activation. Conflicts return `409` with pending state unchanged, target Lecturer row locking serializes competing assignment mutations, and replacement handover cannot end the old appointment before the incoming capacity check succeeds. Panel activation excludes its own reservation to convert the last available slot without double counting other nominations.
- Task 6 verification passes all 76 focused Supervisor workflow, Panel workflow, and appointment lifecycle tests, all 122 Appointments tests, all 14 capacity resolver tests, and all 9 reconciliation tests; the final combined 145-test gate passes against the exact commit tree. Coverage includes hidden temporary unavailability, full and over-capacity metadata, direct-ID rejection, public reason redaction, pending review continuation, final approval blocking and later success, exact-limit Panel reservation conversion, replacement enforcement, and capacity-safe historical handoff repair. Django system checks, migration dry-run, Black validation, and diff integrity pass with no migration required. Two historical test fixtures were corrected to persist the Supervisor/Panel roles their workflows already assumed before publishing capacity policy.
- Task 7 adds Office-only Supervisor/Panel capacity-state distributions to Workflow Reports, matching Dashboard attention actions, and current plan/version/state/load/limit/slot/public-availability metadata to report rows and XLSX exports. Coordinator and Lecturer reports do not expose the faculty capacity summary or Office-only reasons.
- Task 7 extends live reconciliation with missing/incomplete/multiple-plan, role-entry mismatch, active-window overlap, and Published-versus-legacy divergence detectors. Only a missing Draft plan with exactly one verified prior Published source offers transactional `COPY_CAPACITY_PLAN`; stale fingerprints return `409`, and successful copies preserve capacity lineage while recording an immutable reconciliation audit.
- Task 7 focused and full Dashboard verification passes 38 tests after adding capacity action, report/export, drift detector, Draft-copy, and stale-state coverage. Django system/migration and formatting checks are rerun before commit; no migration is required.
- Task 8 adds exact frontend capacity contracts, a backend-only Django API service for every management command, shared labels/validation/conflict/utilization helpers, capacity metadata on appointment/report types, and the known lazy `/dashboard/lecturer-capacity` route with non-Office redirect protection.
- Task 8 verification passes the focused Lecturer capacity utility test, route test, lazy-loading/role-guard source test, and full TypeScript lint check.
- Task 9 completes the Office capacity workspace with semester and plan-version selection, blank Draft creation, cloning, comparison, independent Supervisor/Panel limit editing, readiness blockers, confirmed publication, role/date availability configuration, reasoned cancellation, audit history, stale-conflict refresh, and loading/error/empty feedback. Closed and Archived semesters expose policy history without new mutations; current availability uses Kuala Lumpur calendar dates.
- Capacity management is now linked from Office Dashboard, Academic Semester Management, both workload monitors, and Workflow Reconciliation. Focused capacity, Dashboard integration, and lazy-route tests pass; TypeScript lint and a production Vite build pass after the final lifecycle/date guard changes.
- Task 10 completes public capacity presentation: Student and Lecturer candidate controls honor `selectable`, public labels replace legacy workload guesses, existing selections show only public resume dates, and native Student selection alerts are removed. Coordinator Supervisor and Panel conflict handlers display backend `409` messages, retain pending rows, and refresh from Django.
- Lecturer Dashboard, Supervisor Appointments, and Panel Appointments now show the authenticated Lecturer's Supervisor/Panel state, published plan version, load/limit, and public availability date. The new Lecturer-only Panel own-workload endpoint counts confirmed appointments and reservation nominations through the shared resolver; the former invented Panel limit of 10 is removed.
- Both Office workload exports now include semester code, plan version, capacity state, active/reserved load, available slots, and public unavailability dates without internal reasons. Utilization rejects malformed/zero limits and stays within 0-100.
- Task 10 verification passes all 123 Appointments tests, Django checks, migration dry-run, and Black validation. The three focused frontend scripts, full TypeScript lint, and production Vite build also pass.
- Task 11 verification passes all 409 backend tests across Accounts, Academics, Appointments, Dashboard, and Marks in 687.520 seconds, with clean Django system and migration-drift checks. All 44 frontend `.test.ts` scripts pass, the dependency audit reports zero vulnerabilities, TypeScript lint is clean, the production build succeeds, and the demo/CSP/source-map/artifact guards pass.
- Live local HTTP smoke on Django `8001` and Vite `5174` authenticates Office Staff/Admin, Lecturer, Programme Coordinator, and Student. Office can read the active semester, Published plan, audits, and both workload views; Lecturer can read both personal workload views and Panel candidates; Coordinator approval queues load; Student receives public Supervisor capacity state and Panel readiness. Lecturer, Coordinator, and Student capacity-management requests return `403`, the direct frontend route serves the lazy application shell, and an Office availability create/cancel cycle persists in history while a repeated stale cancellation returns `409`. Server logs contain only the expected authorization/conflict responses and no runtime exception.
- The desktop browser-control runtime could not initialize on this host, so no automated visual/click-through browser pass is claimed. The remaining manual check is limited to visual layout and interaction across the already verified role flows; it does not block the completed automated and live transport-level verification record.
- The approved specification is `docs/superpowers/specs/2026-08-19-lecturer-capacity-availability-design.md`.
- The reviewed task-by-task implementation plan is `docs/superpowers/plans/2026-08-19-lecturer-capacity-availability.md`.

## Workflow Data Quality and Reconciliation Centre

- Added an Office-only live scan across Coordinator authority, semesters, research-profile identity/Supervisor consistency, approved Supervisor/Panel handoffs, Marks task eligibility/generation, and appointment source/replacement lineage.
- Added stable IDs, SHA-256 fingerprints, severity/repairability classification, filtered pagination, preview, stale-state `409` handling, and protected list/preview/apply/audit APIs.
- Added transactional repairs for Coordinator profile/programme setup, exact-matric profile linking, Supervisor synchronization, uniquely evidenced semester assignment, approved handoff completion, and Marks task generation/pause/resume/retirement.
- Added immutable `WorkflowReconciliationAudit` persistence and one-task Marks lifecycle repair with draft/comment snapshots. Submitted Marks, workflow events, identifiers, legacy strings, and downstream history remain unchanged.
- Centralized Coordinator scope and replaced duplicated programme lookup across Appointments, Dashboard actions, Reports, Dossiers, and lifecycle services.
- Added `/dashboard/workflow-reconciliation` with summary counts, filters, pagination, preview, mandatory reason/confirmation, audit history, retry/conflict states, and review-only explanations. Linked it from Office Dashboard, Semesters, Participant Lifecycle, Reports, and action feeds.
- Verification passes all 253 Accounts/Academics/Appointments/Dashboard/Marks backend tests, all 43 frontend `.test.ts` files, Django system and migration checks, TypeScript lint, the production build, zero-vulnerability npm audit, and both production artifact/CSP guards.
- Browser smoke covered Office discovery, review-only preview, confirmed semester repair with stale-state protection, immutable audit creation, count refresh, and direct Student/Lecturer/Coordinator route rejection. The temporary repair fixture and audit were removed afterward, and the browser console remained clean.
- Ambiguous semesters, role/profile conflicts, downstream-used identity conflicts, and appointment lineage inconsistencies remain review-required. Bulk repair and history merging are intentionally excluded.

## Secure Supervisor Application Documents

- Added private, persisted PDF/DOCX files to Supervisor applications with requirement snapshots, validated MIME type, SHA-256 checksum, legacy metadata availability, server-generated storage names, and one-file-per-requirement integrity.
- Added Office Staff/Admin requirement configuration and immutable audits, including stable codes, active/inactive ordering, mandatory update reasons, no physical deletion, and guarded fictional seeding only when no requirements exist.
- Changed Student Supervisor application creation to atomic multipart submission with requirement completeness, five-file and 10 MB limits, duplicate-content rejection, PDF active-action checks, bounded DOCX package validation, and storage cleanup after transaction failure.
- Added private attachment downloads scoped to the owning Student, proposed Supervisor, managed-programme Coordinator, and Office Staff/Admin with indistinguishable not-found responses and safe attachment headers.
- Added the Office-only `/supervisor-appointments/requirements` workspace, requirement-driven drag-and-drop Student intake, combined-size and completeness feedback, shared authenticated document downloads, and legacy `Unavailable` rendering.
- Replaced fabricated supporting files, fallback research content, eligibility claims, timestamps, feedback, and appointment-letter controls in Student, Lecturer, Coordinator, and Office Supervisor surfaces with persisted fields and workflow audits.
- Reports and CSV remain metadata-only; Progress Dossiers continue linking to authorized Supervisor details. Official templates, CGPA policy, antivirus scanning, file replacement, Notifications/Announcements, and File Repository integration remain deferred.
- Verification passes all 164 Accounts/Appointments/Dashboard backend tests, the focused 29-test Supervisor document/workflow suite, all 39 frontend `.test.ts` files, Django system and migration checks, TypeScript lint, production build, zero-vulnerability npm audit, and both production artifact/CSP guards.
- Browser smoke covered Office required/optional configuration and private download, Student missing-required blocking and valid upload, Lecturer review/download, Coordinator cross-programme isolation and temporary managed-programme visibility, and error-free role rendering. Clearly named smoke records, files, notifications, requirements, and temporary programme alignment were removed afterward.

## Central Academic Semester Management

- Added the `academics` Django app with a faculty-wide `AcademicSemester`, immutable lifecycle audits, consecutive-session and date validation, non-overlap rules, effective-expiry handling, and database enforcement that permits at most one persisted Active semester.
- Added Office Staff/Admin-only semester configuration and audit APIs plus a minimal authenticated active-semester endpoint for every portal role. Activation, handover, extension, closure, and archival are transactional, reasoned, and return lifecycle conflicts without deleting historical records.
- Added nullable semester relationships to Supervisor applications, Panel recommendations, Timeline versions, and Marks evaluation periods. Existing identifiers and free-text history remain intact; records that cannot be linked safely display as `Legacy / Unassigned`.
- Bound new Supervisor and Panel workflows to the effective active semester on the server, retained prior-semester approval handling, scoped role dashboards to the active Timeline, and restricted Timeline preparation to Draft or Active semesters.
- Integrated Marks preparation, publishing, submission windows, task generation, and semester handover. Draft periods can target Draft or Active semesters, while publishing and generation require the effective active semester and windows contained within its dates.
- Added active/all/unassigned/stable-code semester filters to Workflow Reports and XLSX output while retaining complete authorized dossier histories and unresolved carryover actions.
- Added the Office-only `/dashboard/semesters` workspace, lifecycle controls with mandatory reasons, active-semester context on all role dashboards, and persisted semester selectors in Timeline, Marks, and Reports without adding a sixth sidebar module.
- Guarded development seeding now creates one fictional active semester only when no semester exists and never replaces developer-created configuration.
- Verification passes all 153 Academics/Appointments/Dashboard/Marks backend tests, the focused 10-test semester lifecycle and authorization suite, all 37 frontend `.test.ts` files, Django system and migration checks, TypeScript lint, production build, zero-vulnerability npm audit, and both production artifact/CSP guards.
- Browser smoke covered desktop and mobile semester management plus Office Staff/Admin, Lecturer, Programme Coordinator, and Student dashboard context, active report filtering, Timeline selection, and Marks setup. The local mixed-host smoke configuration produced refresh-cookie logout warnings; it did not affect authenticated application flows.
- Historical records remain intentionally unassigned unless a trustworthy relationship already exists. Announcements/Notifications, official templates, SLA rules, Registry persistence, and notification fan-out remain unchanged.

## Backend-Only Owned Module Cutover

- Removed all Supervisor, Panel, and Timeline mock branches, simulated mutations, owned mock imports, and module-specific backend flags. The five owned modules now call Django under every environment combination while global mock support remains available to unfinished or teammate-owned modules.
- Deleted the appointment and timeline mock datasets and added source and production-artifact guards against their exports, legacy switches, and fixture canaries.
- Replaced static Office supervisor workload records with an Office-only persisted workload endpoint and live loading, retry, filtering, pagination, detail, utilization, and CSV states.
- Added a Lecturer-only self-workload endpoint and enriched active-supervisee payload. The detail screen now renders persisted student, research, and appointment data instead of fabricated files, panel assignments, evaluation results, dates, and identities.
- Corrected Lecturer Supervisor acceptance so it reloads Django after the first-stage decision and does not invent an active appointment before Programme Coordinator approval.
- Removed panel recommendation fallback students/candidates, hidden fixture exclusions, invented history identifiers/semesters, and simulated drawer submission.
- Removed fixed Timeline semester/session/date defaults. Upload now requires explicit semester/session values and add/edit drawers use the current persisted timeline context.
- Added direct error-propagation coverage for `401`, `403`, `404`, `409`, `500`, and network failures without mock fallback, plus focused role/access and persisted workload contract tests.
- Verification passes all 149 Dashboard/Appointments/Marks backend tests, all 35 frontend `.test.ts` files, `python manage.py check`, migration dry-run, TypeScript lint, production build, zero-vulnerability npm audit, and both production artifact/CSP guards.
- Browser smoke confirms Office Staff/Admin persisted supervisor workload, Lecturer Supervisor/Panel views, Programme Coordinator Supervisor/Panel queues, and Student Supervisor/Panel status across direct routes. With Django deliberately stopped, the Student Supervisor candidate screen shows an inline `Couldn’t load data` state with Retry and no fabricated candidates or browser alert.

## Production Marks Management Completion

- Added persisted versioned rubric families with configurable targets, sequential cloning, immutable locking once used, readiness checks, component deactivation, and migration of existing rubrics to version 1 without identifier changes.
- Added faculty-wide evaluation-period lifecycle management for draft, publish, deadline extension, close, archive, archived filtering, timezone-derived display state, duplicate prevention, and immutable configuration audits.
- Enforced published/open submission windows with period-row locking against concurrent closure, row-locked submission and configuration transitions, backend-only total calculation, required/optional component integrity, stale optional-score removal, and `409` responses for workflow conflicts.
- Added the Office Staff/Admin-only persisted Mark Record Detail API with stable task/record identifiers, rubric scores, evaluator assignment, deadlines, lock state, override history, and correction/reopen audit history.
- Replaced local Marks periods, rubrics, overview attention counts, record detail mappings, and runtime mock switches with Django APIs. Removed fake PDFs/documents, notification dispatch, export placeholders, simulated sync state, and fixed 100-mark UI assumptions.
- Added focused model, migration, API, role-access, period-window, locking, score-integrity, submitted-comment audit, task-identity, and frontend production-source/artifact regression coverage.
- Verification passes all 145 Dashboard/Appointments/Marks backend tests, all 33 frontend `.test.ts` files, `python manage.py check`, migration dry-run, TypeScript lint, production build, zero-vulnerability npm audit, and both production artifact guards.
- Browser smoke confirms Office Staff/Admin can create and balance a rubric, create and publish a period, generate tasks, clone the locked rubric, and open the persisted Mark Record Detail. Lecturer Marks loads its role-scoped task surface, while Programme Coordinator and Student direct Marks-administration URLs redirect to Dashboard; the browser console remained clean.
- The configured demo Lecturer had no generated task assignment, so browser submission was not mutated in local fixtures; open-window save/submit, closed-window rejection, duplicate locking, and correction history remain covered by backend tests. Clearly named browser-smoke records were removed after verification.

## Completed

- Added a role-scoped, read-only Student Progress Dossier at `/dashboard/progress/:studentId` for authorized staff and `/dashboard/progress` for Student self-view.
- Added one persisted dossier aggregation service across Supervisor, Panel, Marks, active Student-targeted Timeline, and workflow audit data, including partial dossiers for students without research profiles.
- Enforced Office-wide, Coordinator programme, Lecturer assignment/relationship, and Student self-only access with indistinguishable `404` responses for unknown and unauthorized matric numbers.
- Added public Student redaction for internal Panel stages and identifiers, pending selected-panel identity, evaluator identity, mark values/comments, and staff workflow audit actors.
- Added current-before-history dossier ordering, derived attention priorities, status tabs, empty/error/not-found states, and existing-module deep links without adding dossier mutations or persistence.
- Added `View Dossier` entry actions to Office, Coordinator, and Lecturer Supervisor/Panel/Marks surfaces and report attention rows, plus `View My Progress` on the Student Dashboard.
- Added deterministic, migration-free workflow ageing for pending Supervisor and Panel stages, including workflow-event/update fallbacks, future-date clamping, and null terminal metadata.
- Added role-scoped Workflow Analytics at `/dashboard/reports` for Office Staff/Admin, Programme Coordinator, and Lecturer dashboards, with date/programme filtering, KPI and distribution summaries, workflow attention links, and Student route rejection.
- Added shared persisted reporting queries and matching JSON/XLSX endpoints across Supervisor, Panel, Marks, and Timeline. Workbook sheets are role-visible, generated in memory, and use the same authorization and filters as the on-screen report.
- Reporting intentionally presents current persisted state selected by each module's reporting date; historical snapshots and trend reconstruction remain outside the current scope.
- Added Marks deadline metadata from evaluation-period close dates and date-derived Timeline action metadata without introducing a Marks approval stage or recurring workflow audit events.
- Replaced hardcoded dashboard task content with a shared persisted action centre across Office Staff/Admin, Programme Coordinator, Lecturer, and Student dashboards, including role scoping, priority ordering, a 20-action cap, and exact module/record navigation.
- Added Waiting columns and longest-waiting ordering to Office Supervisor/Panel monitoring, oldest-first Lecturer/Coordinator approval queues, generic student wait labels, Marks deadline displays, and waiting metadata in existing Supervisor/Panel CSV exports.
- Kept student Panel processing declassified as `FACULTY_PROCESSING`; recommendation IDs, internal decision stages, and internal workflow timestamps remain absent from student payloads.
- Removed duplicate runtime Vite ownership, updated the development toolchain to Vite 6.4.3 and `tsx` 4.23.1 with nested `esbuild` 0.28.1, and added a low-threshold frontend security audit command.
- Added a same-origin Nginx production template with HTTPS redirect, Django API/Admin proxying, collected Admin static serving, the 12 MB body limit, staged HSTS, and frontend security headers.
- Added equivalent report-only and enforced CSP includes that keep scripts and connections same-origin, prohibit inline scripts and active embedding, and narrowly allowlist Google Fonts and Unsplash.
- Explicitly disabled Vite production source maps, expanded production artifact scanning, and removed inline scripting from generated letter documents while preserving print behavior through trusted bundle listeners.
- Replaced the eight-hour browser-stored access token with a 15-minute in-memory bearer token and a 7-day rotating HttpOnly refresh cookie.
- Added SimpleJWT outstanding-token/blacklist persistence, refresh replay rejection, authenticated logout revocation, password-reset invalidation, inactive-account blocking, and JSON-only login/refresh/logout requests.
- Added concurrency-safe frontend renewal with one authenticated-request retry and cookie-based session restoration without exposing refresh values to JavaScript.
- Added fail-closed production settings validation for secret-key strength, explicit allowed hosts, and HTTPS-only CORS origins while preserving local `DEBUG=True` HTTP defaults.
- Enabled production-only HTTPS redirect, staged HSTS, secure strict session/CSRF cookies, nosniff, same-origin referrer policy, frame denial, and explicit trusted-proxy opt-in.
- Added subprocess settings tests covering rejected production configurations, secure defaults, HSTS/proxy overrides, and development behavior.
- Isolated demo accounts behind explicit Django and Vite development flags while preserving local one-click role prefills.
- Replaced seeded identities with fictional `example.test` emails, `DEMO-*` IDs, and demonstration-only registry/profile data; removed passwords from committed Python and TypeScript fixtures.
- Added guarded, environment-driven role passwords, validated legacy-email mapping, no-mutation refusal tests, idempotent seed coverage, and a production bundle canary test.
- Implemented persistent Supervisor Appointment submission, document metadata, lecturer decisions, programme-scoped coordinator decisions, resubmission, workload validation, appointment records, and histories.
- Replaced the deferred coordinator supervisor page with a live approval queue and dashboard count.
- Renamed the stale coordinator supervisor approval frontend surface to `CoordinatorSupervisorApprovals` and wired it as the live Programme Coordinator final-approval queue.
- Replaced prompt-based supervisor approval rejection on the Programme Coordinator queue and lecturer supervisor detail screen with in-app mandatory rejection reason controls.
- Clarified the five-module ownership boundary so Workflow and Approval Tracking is separate from the Notifications/Announcements module.
- Added shared immutable workflow events for Supervisor and Panel submissions and decisions.
- Changed Panel workload validation to each lecturer's configurable `Panel.max_appointments`.
- Added the `marks` Django app with configurable rubrics, periods, tasks, drafts, validation, submission locking, office monitoring, and assignment generation.
- Extended Marks task assignment so active Supervisor Appointments and active Panel Appointments generate separate role-specific evaluator tasks, with automatic active-period safety generation if Office Staff/Admin forget to run assignment manually.
- Added audited backup/manual-override evaluation tasks for Office Staff/Admin exception handling without changing official appointment records.
- Replaced the prompt-based Marks Assignment flow with production Office Staff/Admin period selectors, readiness checks, role/status filters, and a validated backup evaluator drawer.
- Added Marks Assignment option endpoints for evaluation periods, eligible students, lecturers, and existing task options.
- Connected Marks Entry overview cards, Mark Submission Monitoring, and Mark Entry Records summaries to live marks period, dashboard, and record data.
- Added status-filtered navigation from dashboard/monitoring marks actions into Mark Entry Records.
- Updated Office Staff/Admin mark records to show unsubmitted closed-period tasks as Overdue without changing the database status model.
- Fixed the Lecturer fresh-login landing page so lecturers enter through Dashboard Overview instead of Marks Entry.
- Added a shared portal confirmation modal and replaced browser-native confirmation dialogs for panel cancellation, supervisor request cancellation, mark submission locking, and rubric component removal.
- Moved selected-panel Reviewed Requests into a separate Lecturer Panel Appointments page opened from a button above the Selected Panel Review Queue table.
- Simplified the Reviewed Requests navigation button to a text-only action for visual consistency with the portal table headers.
- Added audited Django Admin correction and reopening for submitted marks.
- Connected Lecturer Marks Entry to live APIs and dynamic backend-provided rubric components.
- Connected role-scoped live Supervisor, Panel, and Marks counts to dashboards.
- Removed the non-functional Panel Appointment policy-download action.
- Added regression tests for supervisor workflow, mark locking/corrections, dashboard summaries, workload limits, and date-relative timelines.
- Added supervisor-only panel recommendation cancellation while awaiting selected-panel review, including mandatory reasons, terminal cancellation status, immutable audit history, workload release, replacement recommendation support, and distinct read-only history across roles.
- Added the cancellation API, database fields/migration, supervisor confirmation UI, cancelled status summaries/timelines, and focused authorization/workload/replacement tests.
- Added student cancellation for pending Supervisor Appointment requests, including mandatory reasons, row locking, `CANCELLED_BY_STUDENT`, audit retention, queue removal, replacement submissions, and supervisor notification.
- Removed the unused Panel `ACCEPTED_BY_PANEL` state; selected-panel acceptance now has one supported transition directly to `PENDING_COORDINATOR`.
- Added protected Supervisor and Panel detail APIs, expandable audit logs, workflow notification metadata, stakeholder notification fan-out, and notification-to-record navigation.
- Added clean URL routing with React Router DOM for auth pages, sidebar modules, dashboard timeline, marks subviews, mark record detail, supervisor application deep links, panel recommendation deep links, unknown-route redirects, and notification-to-record navigation.
- Added page-level nested Supervisor Appointment routing for Office Staff/Admin record detail and workload monitoring, Student new application routing, Lecturer request history and supervisee detail pages, and role-specific fixed-route redirects while preserving `/supervisor-appointments/:applicationId` deep links.
- Added route-level code splitting for every authenticated routed module, including Notifications, and split React, React Router, Motion, and Lucide vendor code so the production entry chunk stays below Vite's default warning threshold.
- Added page-level nested Panel Appointment routing for Office Staff/Admin record detail and workload monitoring, Lecturer submitted/reviewed/assignment pages, Programme Coordinator recommendation drawer links, and Student nested-route redirects.
- Tightened Dashboard page-level routing so `/dashboard/timeline` remains the only Dashboard nested page, is Office Staff/Admin-only, and unsupported Dashboard nested paths redirect through the normal authenticated fallback.
- Added route scroll restoration so routed page transitions start at the top while hash-only URL changes are left alone.
- Applied local migrations through `appointments.0006` and `announcements.0003`.
- Moved shared portal toast feedback to the top-right viewport position with high overlay layering so it remains visible above the sticky header, drawers, and modals.

- Added a dedicated Programme Coordinator dashboard using the Lecturer timeline/next-action structure with real programme-scoped supervisor and panel approval counts.
- Added the Programme Coordinator Supervisor Appointments live final-approval queue without fabricated pending counts.
- Added a programme-scoped coordinator panel workspace API returning the managed programme, pending count, final-approval queue, and full recommendation lifecycle records.
- Enforced `Coordinator.programme_managed` on coordinator queue retrieval and final approve/reject actions, including protected empty behavior for coordinators without an assigned programme.
- Added a shared searchable, status-filtered, 10-row recommendation records table for Programme Coordinator programme oversight and selected-panel lecturer Reviewed Requests history.
- Added selected-panel review history persistence access, preserving each lecturer's accepted/rejected decision and later coordinator outcome in read-only detail views.
- Corrected the panel candidate current-user lookup to use `DemoUser.fullName`.
- Updated Office Staff/Admin Panel Appointment Records to retain separate historical recommendation attempts, including rejected attempts that precede a later approved appointment, while suppressing the duplicate approved recommendation represented by the final appointment.
- Added stable per-row panel `recordId` values and retained rejection stage, reason, recommended-member metadata, and lifecycle timestamps for historical detail views.
- Updated Panel Appointment Detail to distinguish selected-panel rejection from Programme Coordinator rejection and show the stored rejection reason.
- Added a tested shared frontend pagination utility and changed Panel Appointment Records plus Recent Timeline Updates to 10 rows per page with page ranges, numbered navigation, and safe page clamping after data refresh/filter changes.
- Reorganized the workspace into a standard full-stack structure with `frontend/`, `backend/`, and `docs/` at the project root while keeping the three mandatory governance documents at the root.
- Moved the Vite React application source, package files, and frontend configuration into `frontend/`.
- Moved the Django backend into root-level `backend/`.
- Moved supporting setup notes and PDF references into `docs/`.
- Moved Git metadata to the project root so the repository matches the new workspace entry point.
- Cleaned `frontend/.env.example` so it documents only public Vite frontend variables; frontend `.env` is optional because `apiClient` provides defaults.
- Installed project dependencies for the current frontend.
- Verified the existing Vite React app compiles with TypeScript.
- Verified the existing app builds for production.
- Added Dashboard Overview frontend code from `fsktmwithdashboard` into the current frontend.
- Wired `Dashboard Overview` to render the administration dashboard instead of the generic placeholder.
- Added dashboard timeline management as a dashboard sub-view.
- Set the authenticated office staff landing view to `Dashboard Overview`.
- Merged generated office-staff UI modules from `fsktm-postgraduate-administrative-portalofficestaffcompleted`.
- Added routes for Registry Management, File Management, FAQ Chatbot, Letter Generation, Announcements, Notifications & Announcements, and Forgot Password.
- Updated the sidebar and top header to expose the expanded office-staff navigation.
- Fixed the Panel Appointment Management desktop layout so the records table appears directly below the search/filter card instead of being pushed below the right-side widgets.
- Merged lecturer UI modules from `fsktmLecturerRole` into the current frontend without replacing the existing office-staff application shell.
- Added role-aware routing so lecturer users see lecturer Supervisor Appointments, Panel Appointments, and Marks Entry workflows while office staff keep the existing administrative workflows.
- Updated the portal header identity to display the active demo user's name and role.
- Added shared Tailwind theme tokens required by the generated lecturer module styles.
- Removed duplicate lecturer page footers so authenticated modules use the single global portal footer.
- Standardized lecturer module page headers, card radii, and card shadows to match the current office-staff visual system.
- Removed decorative blur-circle accents from summary/quick-action cards for a more consistent administrative interface.
- Merged student UI modules from `fsktmStudentRole` into the current formatted frontend without replacing the existing office-staff and lecturer application shell.
- Added role-aware student routing for FAQ Chatbot, Supervisor Appointments, Panel Appointments, File Submission, Letter Generation, and student Dashboard Overview.
- Updated the sidebar to filter visible module navigation by Office Staff/Admin, Lecturer, or Student role while preserving responsive drawer behavior.
- Standardized student module page headers, card radii, card shadows, and footer usage to match the current visual system.
- Standardized authenticated office-staff card radii, custom soft shadows, modal/drawer shadows, and repeated navy brand color utilities across the portal.
- Added a dedicated student Dashboard Overview with the shared semester timeline in read-only mode, student status cards, next-action guidance, semester progress, FAQ support, and profile status.
- Fixed the Mark Submission Monitoring `View All Mark Records` action so it routes to the mark records view.
- Added shared portal primitives for page headers, cards, buttons, status badges, and toast notifications.
- Added shared form-control and filter-toolbar CSS classes for repeated search/filter layouts.
- Migrated the administration dashboard, student dashboard, timeline management, quick actions, mark monitoring, mark records, FAQ editor, announcement management, file repository, lecturer role modules, and student support/file/letter modules toward shared primitives for more consistent formatting.
- Extended the consistency cleanup across the remaining repeated portal surfaces by centralizing role/module toast overlays, replacing raw generated table class strings with the shared `data-table` styling, applying shared filter/form controls to major search panels, and normalizing leftover portal-side custom shadows.
- Tightened backend-readiness UI consistency by updating shared form components, legacy action buttons, local status chips, FAQ/announcement/template editor controls, and timeline drawer controls to use shared portal primitives and CSS classes.
- Fixed the shared sign-in action button so the right-arrow icon stays inline with the button label.
- Added env-driven frontend API configuration for `VITE_API_BASE_URL`, `VITE_USE_MOCKS`, and `VITE_MOCK_LATENCY_MS`.
- Removed generated Gemini/AI Studio leftovers from env examples, metadata, dependency files, and stale generated project context.
- Moved key component-local backend-shaped demo data into shared mocks/types, including dashboard attention rows, student next actions, student letter templates, student supervisor applications, supervisor candidates, mark detail mappings, rubric rows, timeline import preview entries, panel related documents, departments, and announcement attachment options.
- Standardized the next layer of shared UI consistency by routing reusable status badges through a shared tone helper, aligning common table actions/pagination with `PortalButton`, and normalizing drawer/modal/upload action controls across high-traffic office-staff, lecturer, and student surfaces.
- Replaced additional local page headers and specialized controls with shared primitives, including student and lecturer module `PageHeader` usage, dashboard/announcement segmented controls, upload permission switches, removable tag chips, summary/status dots, and progress bars.
- Finished the remaining authenticated module header cleanup so local `page-title`, `page-subtitle`, and `back-link` usage now lives inside `PortalPrimitives`, and converted more reusable summary/status/progress indicators to `StatusBadge`, `StatusDot`, and `ProgressBar`.
- Adjusted Panel Appointment Management so the records table no longer depends on a horizontal scrollbar on desktop: the records area now uses a wider column, fixed table layout, compact cell spacing, and wrapped text.
- Resolved the `App.tsx` merge compile issue by restoring the missing mark-record mock import and cleaned duplicate dependency keys left in `package.json`.
- Added missing React TypeScript declaration packages and tightened exposed type issues in sidebar state, icon wrapper props, login manual download alert handling, and student supervisor detail records.
- Updated the existing lecturer Panel Appointments recommendation workflow so supervisor panel recommendations move from direct submission to selected panel acceptance or rejection, then Programme Coordinator confirmation or rejection.
- Added UI/mock enforcement for exactly one recommended panel lecturer per student recommendation and duplicate blocking until a previous recommendation is rejected by the selected panel or Programme Coordinator.
- Added a tested panel recommendation workflow helper covering lifecycle labels, duplicate blocking, selected-panel transitions, coordinator transitions, and required rejection reasons.
- Corrected the lecturer Panel Appointments supervisor view so the submitting supervisor can only track recommendation progress and cannot approve or reject as the selected panel member or Programme Coordinator.
- Added a panel recommendation review drawer pattern with approval controls and rejection reason fields placed inside the scrollable drawer content instead of a fixed drawer footer.
- Added a request progress timeline to the panel recommendation View Flow drawer for submitted, selected-panel review, Programme Coordinator review, and final appointment states.
- Fixed the lecturer Supervisor Appointment review drawer so the approve/reject controls and rejection reason field scroll with the request content instead of staying in a fixed bottom action area.
- Added the Django `appointments` app for lecturer-side panel appointment persistence.
- Added database models and migration for student research profiles, panel recommendations, and final panel appointments.
- Added role-gated panel recommendation APIs for supervisor submission/tracking, selected panel accept/reject, Programme Coordinator confirm/reject, final panel assignments, and panel records compatibility.
- Connected the lecturer Panel Appointments frontend workflow to the new backend endpoints while preserving `VITE_USE_MOCKS` mock mode.
- Routed Programme Coordinator users to the role-aware panel recommendation coordinator review queue instead of the office/admin panel monitoring screen.
- Extended `seed_users` with a selected panel lecturer account and an eligible supervised student research profile for panel recommendation testing.
- Resolved the `origin/main` merge conflicts on `Lim_Branch` by preserving the organized `frontend/` and `backend/` layout, retaining the richer panel recommendation workflow, and keeping incoming Django auth/reset-password wiring.
- Cleaned the frontend package after the merge so obsolete Node/Express server scripts and dependencies stay out of the Vite app.
- Built the announcement + notification backend (`announcements` app) and wired the frontend: announcement publish/draft/delete with file attachments, per-recipient notification fan-out on publish, and the in-app notification feed with mark read/unread and attachment download (backed by a shared `NotificationsContext` that also drives the header bell badge).
- Normalized the account model into a generalization/specialization (EER) hierarchy: `User` is the superclass; `Student`, `OfficeStaff`, and `Lecturer` are one-to-one subtype tables; `Coordinator`, `Supervisor`, and `Panel` are one-to-one specializations of `Lecturer`. Moved `department` / `student_id` / `staff_id` off `User` into the relevant profile tables; `User.to_public_dict()` still returns the same flat shape (`id, email, role, fullName, department, studentId, staffId`) the frontend expects, so the login API contract is unchanged.
- Updated the login lookup (matches email / matric no / staff no through the profile relations), the Django admin (profile inlines on the user page + a dedicated Lecturer admin with Coordinator/Supervisor/Panel inlines), the create/change forms, and `seed_users` (now also seeds the role profiles) for the new subtype tables. Migrated the existing demo accounts and superuser into their profile tables.
- Added an Entity-Relationship diagram for the user/role hierarchy at `docs/erd/01-user-roles.md`.
- Added a real Settings module (`SettingsView`) routed for every role: profile summary, editable contact details, password-change form with validation, and notification preference toggles, all using the shared portal primitives.
- Improved mobile responsiveness: narrower sidebar drawer on small screens, tightened top-header utility spacing, and a help button that collapses on the smallest viewports.
- Cleaned up the login screen: removed the demo "Enter Portal Direct" banner, the marketing feature cards (Secure Role-Based Access / Automated Letter Gen / FAQ Student Support), and the System Online / Updated Today / SSL Secured status badges.
- Split the notification bell view into **Announcements** and **Notifications** tabs (by the backend `isAnnouncement` flag). Announcements are live; the Notifications tab is reserved (currently empty) for upcoming supervisor-appointment and confirmation-letter events.
- Fixed the post-merge appointments API break caused by the account subtype-table refactor: panel candidate, eligible supervisee, recommendation, and student panel serializers now read staff numbers, departments, and matric numbers from role-profile tables instead of removed flat `User` fields.

## Current Testing Status

- Workflow ageing/deadline verification passes `python manage.py test appointments dashboard marks --keepdb` (104 tests), `python manage.py check`, and `python manage.py makemigrations --check --dry-run`; all 28 frontend `.test.ts` files, `npm run lint`, `npm run build`, and `npm run test:production-security` also pass.
- Remediated the three high-severity PostCSS and React Router findings by resolving PostCSS to 8.5.23, migrating browser imports from `react-router-dom` to `react-router` 8.3.0, and updating React/React DOM to 19.2.8. The package audit now reports zero vulnerabilities.
- Browser smoke testing on local Django/Vite (`8001`/`3001`) confirms Office Staff/Admin, Lecturer, Programme Coordinator, and Student dashboards/action centres render without console errors. Office Supervisor/Panel monitoring exposes Waiting and optional longest-waiting ordering, Lecturer/Coordinator Panel queues expose Waiting, Marks tables expose Deadline, and Student Panel processing remains generic without internal stage or recommendation identifiers.
- Focused route helper, role permission, and workflow notification route tests pass after adding clean URL routing.
- `npm run lint` passes after adding clean URL routing and the missing Overdue status label.
- `npm run build` passes after adding clean URL routing; the existing large bundle chunk warning remains.
- Supervisor panel cancellation verification passes: 3 focused Django API tests, the panel workflow frontend test, `npm run lint`, `npm run build`, and `makemigrations --check --dry-run`.
- Focused Programme Coordinator workspace, programme authorization, full lifecycle, and selected-panel review-history Django tests pass.
- Focused panel recommendation filtering and shared pagination frontend tests pass.
- `npm run lint` passes after adding the Programme Coordinator dashboard, scoped panel records, coordinator supervisor route surface, and lecturer reviewed history.
- Focused Django panel-record tests pass for standard office monitoring states and rejected-history retention after a later approval (2 tests, 0 failures).
- Focused frontend pagination and panel-summary tests pass.
- `npm run build` passes after the audit/panel record pagination change, with the existing non-blocking chunk-size warning.
- All frontend `.test.ts` scripts pass after adding page-level Panel Appointment nested routing.
- `npm run lint` passes after adding page-level Panel Appointment nested routing.
- `npm run build` passes after adding page-level Panel Appointment nested routing; the existing non-blocking chunk-size warning remains.
- All frontend `.test.ts` scripts, `npm run lint`, and `npm run build` pass after tightening Dashboard page-level nested routing; the existing non-blocking chunk-size warning remains.
- All frontend `.test.ts` scripts, `npm run lint`, and `npm run build` pass after adding top-of-page route scroll restoration; the existing non-blocking chunk-size warning remains.
- All frontend `.test.ts` scripts, `npm run lint`, and `npm run build` pass after adding page-level Supervisor Appointment routing; the existing non-blocking chunk-size warning remains.
- All frontend `.test.ts` scripts, `npm run lint`, and `npm run build` pass after route-level module code splitting and vendor chunking; Vite now emits multiple JS chunks without the default oversized chunk warning.
- Full `python manage.py test appointments -v 2 --keepdb` passes for the combined Supervisor, Panel, Workflow Audit, and Dashboard Timeline coverage; the previously documented appointment/timeline baseline failures are no longer present in the current run.
- Authentication regression tests, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, the canonical credential test, `npm run lint`, and `npm run build` pass after the account migration fix.
- Five-module verification passes for the current implementation slice: all frontend `.test.ts` scripts, `npm run lint`, `npm run build`, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, focused Supervisor Workflow tests, Dashboard Timeline tests, Marks tests, Dashboard Summary tests, and full `appointments` tests all complete successfully. The Vite build still reports the documented non-blocking large chunk warning.
- Browser smoke testing against local Django/Vite confirms the five-module role routes render without console errors for Office Staff/Admin, Lecturer, Programme Coordinator, and Student. Current local data has no Office Staff/Admin supervisor records or lecturer active supervisees, so those routed detail checks exercise the intended not-found states; Panel Appointment detail opens successfully from the records table.
- `npm run lint` passes from `frontend/` after reorganizing the project structure.
- `npm run build` passes from `frontend/` after reorganizing the project structure, with the existing non-blocking chunk-size warning.
- `npm run lint` passes after cleaning `frontend/.env.example`.
- `npm run lint` passes after the dashboard integration.
- `npm run build` passes after the dashboard integration.
- `npm run lint` passes after the expanded office-staff module merge.
- `npm run build` passes after the expanded office-staff module merge.
- `npm run lint` passes after the Panel Appointment Management layout fix.
- `npm run build` passes after the Panel Appointment Management layout fix.
- `npm run lint` passes after the lecturer module merge.
- `npm run build` passes after the lecturer module merge.
- `npm run lint` passes after the cross-module design consistency cleanup.
- `npm run build` passes after the cross-module design consistency cleanup.
- `npm run lint` passes after the student role module merge.
- `npm run build` passes after the student role module merge.
- `npm run lint` passes after the authenticated portal surface/brand-token normalization.
- `npm run build` passes after the authenticated portal surface/brand-token normalization.
- `npm run lint` passes after the student Dashboard Overview timeline/cards update.
- `npm run build` passes after the student Dashboard Overview timeline/cards update.
- `npm run lint` passes after the mark records routing fix.
- `npm run build` passes after the mark records routing fix.
- `npm run lint` passes after the shared portal primitive and consistency refactor.
- `npm run build` passes after the shared portal primitive and consistency refactor.
- Vite dev server smoke probe returns HTTP 200 after the shared portal primitive and consistency refactor.
- `npm run lint` passes after the expanded shared table, toast, filter, and shadow consistency cleanup.
- `npm run build` passes after the expanded shared table, toast, filter, and shadow consistency cleanup.
- Vite dev server smoke probe returns HTTP 200 with the root element present after the expanded consistency cleanup.
- `npm run lint` passes after the backend-readiness form, button, status badge, and drawer-control cleanup.
- `npm run build` passes after the backend-readiness form, button, status badge, and drawer-control cleanup.
- Vite dev server smoke probe returns HTTP 200 with the root element present after the backend-readiness UI cleanup.
- `npm run lint` passes after adding env-driven API config and moving backend-shaped demo data into shared mocks/types.
- `npm run lint` passes after the status badge, table action, drawer/modal control, and upload action consistency cleanup.
- `npm run build` passes after the status badge, table action, drawer/modal control, and upload action consistency cleanup.
- Vite dev server smoke probe returns HTTP 200 with the root element present after the status badge, table action, drawer/modal control, and upload action consistency cleanup.
- `npm run lint` passes after the page-header and specialized-control primitive cleanup.
- `npm run build` passes after the page-header and specialized-control primitive cleanup.
- Vite dev server smoke probe returns HTTP 200 with the root element present after the page-header and specialized-control primitive cleanup.
- `npm run lint` passes after the remaining authenticated module header/status/progress primitive cleanup.
- `npm run build` passes after the remaining authenticated module header/status/progress primitive cleanup.
- Vite dev server smoke probe returns HTTP 200 with the root element present after the remaining authenticated module header/status/progress primitive cleanup.
- `npm run lint` passes after the Panel Appointment Management no-horizontal-scroll table layout fix.
- `npm run build` passes after the Panel Appointment Management no-horizontal-scroll table layout fix.
- Vite dev server smoke probe returns HTTP 200 with the root element present after the Panel Appointment Management table layout fix.
- `npm run lint` passes after resolving the `App.tsx` merge compile issue.
- `npm run build` passes after resolving the `App.tsx` merge compile issue and duplicate `package.json` dependency keys.
- `npm run lint` passes after adding React type declarations and fixing the stricter TypeScript issues they exposed.
- `npm run build` passes after adding React type declarations and fixing the stricter TypeScript issues they exposed.
- Vite foreground server check returns HTTP 200 for the app root.
- Vite source probe confirms the merged app includes Dashboard Overview, Registry Management, File Management, FAQ Chatbot, Letter Generation, Announcements, Notifications & Announcements, lecturer routes, and student routes.
- Browser smoke testing confirms `Dashboard Overview` renders the Administration Dashboard with no console errors.
- Browser interaction testing confirms `Manage Timeline` opens Timeline Management and shows the back navigation.
- Focused workflow test `node_modules\.bin\tsx.cmd src\utils\panelRecommendationWorkflow.test.ts` passes for the supervisor panel recommendation approval rules.
- `npm run lint` passes after implementing the supervisor panel recommendation approval flow.
- `npm run build` passes after implementing the supervisor panel recommendation approval flow, with the existing non-blocking chunk-size warning.
- Vite HTTP smoke probe returns HTTP 200 with the root element present after the supervisor panel recommendation approval flow.
- Focused workflow test covers the role-gated recommendation review rule that blocks supervisors from approving their own recommendation.
- Focused workflow test `node_modules\.bin\tsx.cmd src\utils\panelRecommendationWorkflow.test.ts` passes after fixing the approval drawer scroll behavior.
- `npm run lint` passes after fixing the supervisor appointment and panel recommendation approval drawer scroll behavior.
- `npm run build` passes after fixing the supervisor appointment and panel recommendation approval drawer scroll behavior, with the existing non-blocking chunk-size warning.
- `npm run lint` passes after resolving the `origin/main` merge conflicts on `Lim_Branch`.
- `npm run build` passes after resolving the `origin/main` merge conflicts on `Lim_Branch`, with the existing non-blocking chunk-size warning.
- `python manage.py test appointments` passes for panel recommendation creation, duplicate blocking, selected-panel decisions, Programme Coordinator approval, assignment output, and wrong-user denial.
- `python manage.py test` passes after adding the appointments backend workflow.
- `python manage.py check` reports no Django system issues after adding the appointments app.
- `python manage.py migrate` applied the appointments migration to the configured local PostgreSQL database.
- `python manage.py seed_users` refreshed demo accounts and created the panel recommendation demo profile.
- `npm run lint` passes after wiring the panel appointment workflow to backend services.
- `npm run build` passes after wiring the panel appointment workflow to backend services, with the existing non-blocking chunk-size warning.
- Fixed the panel recommendation refresh-loss issue by routing panel appointment service calls to the Django backend by default with `VITE_USE_PANEL_BACKEND=true`.
- `npm run lint`, focused panel workflow test, `python manage.py test appointments`, and `npm run build` pass after fixing the panel backend/mock routing issue.
- Fixed lecturer panel appointment UI data bugs: selected-panel-only accounts no longer see a fake supervisee recommendation card, the panel workload card now reflects actual assignment rows, and submitted recommendation history de-duplicates backend records.
- Removed the duplicate supervisor-side recommendation flow table from the lecturer Panel Appointments page so submitted recommendations are the single tracking surface.
- Rebuilt the submitted recommendation detail drawer to use real recommendation fields, remove hardcoded panel workload and screenshot-specific fallback data, and display the selected-panel/coordinator confirmation timeline with backend date-time fields.
- Removed the panel recommendation save-as-draft flow from the frontend and backend create API.
- Added backend panel workload validation and a candidate workload endpoint so reserved workload includes confirmed active panel appointments plus submitted/pending nominations before submission.
- Updated the recommend-panel drawer to explain reserved workload, show real candidate workload counts, disable full-workload candidates for submission, and keep only the direct submit action.
- Added a student-facing panel appointment backend endpoint that returns pending state before confirmation and confirmed active appointed-panel details after Programme Coordinator confirmation.
- Connected the student Panel Appointment page to the persisted panel appointment workflow, removed the manual Pending/Confirmed test toggle, and kept the FAQ/help action available.
- Updated the student panel endpoint so seeded student accounts without a linked research profile see the normal pending appointment state instead of a data-load error.
- Simplified the confirmed student Panel Appointment page into one appointed-panel summary plus a compact FAQ help row, removing staff ID, supervisor display, duplicate date/semester fields, and repeated student metadata.
- Connected the Office Staff/Admin Panel Appointment Management records and summary cards to persisted panel workflow data, including No Panel, Recommendation, Pending, Approved, and Rejected monitoring states.
- Finished the Office Staff/Admin panel monitoring integration by making cancelled recommendations a first-class persisted monitoring state, adding cancelled summary/tab/attention/detail support, exporting lifecycle metadata in CSV, and limiting the panel records endpoint to Office Staff/Admin users.
- Removed the stale Panel Appointment Management `Workload Alert` lifecycle tab; workload pressure remains in the dedicated persisted workload monitoring surface with clamped utilization displays.
- Reworked Office Staff/Admin Panel Appointment Detail to render backend record fields, dynamic `Session YYYY/YYYY` badges, and no-records placeholders for related files/evaluation instead of screenshot/demo data.
- Added the shared full panel workflow status timeline to Office Staff/Admin Panel Appointment Detail and removed the confidential administrative notice plus explanatory no-records copy.
- Added recorded date-time display to the Office Staff/Admin panel workflow timeline and enriched the related panel status card with staff ID, email, assigned date, and status context.
- Fixed the Office Staff/Admin Panel Appointment Management layout so the records table sits directly under the search/filter card while attention and workload widgets remain in the right column.
- Added an Office Staff/Admin panel workload backend endpoint and connected both the Panel Workload Snapshot and Panel Workload Monitoring page to real lecturer workload rows.
- Implemented real CSV downloads for Office Staff/Admin Panel Appointment Management and Panel Workload Monitoring using the currently filtered rows.
- Replaced the mock lecturer/student workload detail drawer with real confirmed appointment and pending nomination workload items from the backend.
- Reworked Lecturer Panel Assignment Detail to render backend assignment fields, dynamic `Session YYYY/YYYY` badges, and no-records placeholders for related documents/EE evaluation instead of screenshot/demo data.
- Added the shared full panel workflow status timeline to Lecturer Panel Assignment Detail and removed the explanatory no-records/footer copy.
- Added recorded date-time display to the Lecturer panel assignment workflow timeline using the backend recommendation and appointment lifecycle timestamps.
- Added the Django `dashboard` app for Office Staff/Admin semester timeline persistence.
- Added semester timeline database models for active timelines, P1/P2 timeline entries, and timeline audit logs.
- Added structured Excel `.xlsx` template generation and upload parsing with `openpyxl` for UC47 timeline imports.
- Added role-gated dashboard timeline APIs for active timeline retrieval, template download, timeline upload/replacement, timeline entry patching, and role-specific dashboard tasks.
- Connected the dashboard timeline frontend service and office-staff timeline management screen to the new dashboard timeline endpoints while preserving mock mode.
- Replaced the hardcoded dashboard timeline visualization with a backend-shaped P1/P2 timeline view that shows the required no-active-timeline message without hiding other dashboard sections.
- Refined the Administration Dashboard timeline UI to remove Month/Quarter/Year controls, use P1/P2 phase switching, keep P2 selectable with an empty-state message, remove `Export Report` and `New Entry`, and make `Manage Timeline` a direct navigation button.
- Updated Timeline Management to use the same P1/P2 calendar-style timeline surface, removed the overflow menu action, stopped the edit drawer from opening automatically, and simplified Add/Edit drawers so classification is P1/P2 only with status derived from dates.
- Reworked the shared P1/P2 timeline display from a list/table into a month-lane calendar-style view with month headers, timeline labels positioned by date range, and a click-to-view details modal.
- Adjusted the month-lane timeline so each event renders on its own row with a left event label and a date-range bar, reducing congestion when multiple entries fall near the same months.
- Corrected month-lane bar sizing so event bars are proportional to actual dates instead of filling whole month columns, removed the context column, removed inline date text from event bars, and allowed long event labels to wrap instead of truncating.
- Refined the Administration Dashboard calendar controls so Research Project 1/Research Project 2 sit beside Refresh, event chips use compact wrapping labels without the separate vertical marker, the P1 mock timeline includes six entries, and the old status legend plus `View Full Timeline` action are removed.
- Completed the Timeline Management persistence pass: Add Timeline Entry now creates database entries on the active timeline, Edit can move entries between P1/P2, Delete removes entries through the backend, Recent Timeline Updates reads real audit logs, summary cards read the active timeline, and Upload Timeline performs real backend validation/import instead of simulated validation.
- Removed user-facing Step and Status fields from the semester timeline upload contract and added Title: the official template now contains Level, Title, Detail, Action, Deadline Start, Deadline End, Week Label, and Target Roles, while internal ordering and status are derived by the system.
- Simplified the Administration Dashboard presentation scope by removing the four placeholder summary cards, removing the Records Needing Attention status column, keeping only relevant attention rows with unfinished dependency counts set to zero, and reducing Office Monitoring Tasks to timeline upload done plus three required-action setup tasks.
- Fixed role-scoped dashboard timeline visibility so student dashboards only show `STUDENT` timeline entries, while Office Staff/Admin keeps the full timeline view; the shared timeline component now supports lecturer scoping when a lecturer dashboard uses it.
- Limited semester timeline target roles to Student, Lecturer, and Office Staff, and updated schedule labels to use the new short Title field while keeping Detail as the click-through description.
- Simplified the Student Dashboard Overview by removing the Active Student summary card, keeping only Supervisor and Panel Appointment cards, removing Semester Progress, academic-guidelines, and Profile Status Complete panels, and replacing static next actions with reusable timeline-driven role actions.
- Added a dedicated Lecturer Dashboard Overview with a read-only lecturer-scoped semester timeline, no Manage Timeline button, no office-staff monitoring sections, two lecturer workspace cards, and the same reusable timeline-driven next actions.
- Updated the shared dashboard timeline heading for Office Staff/Admin, Student, and Lecturer dashboards to display `Session YYYY/YYYY` instead of `Semester II YYYY/YYYY`; Timeline Management now uses the same active session wording.
- Wired the Office Staff/Admin Dashboard `Lecturers near panel workload limit` row to real panel workload data from `getPanelWorkloads()`, counting lecturers marked Near Limit or Full Load instead of using a static mock count.
- Replaced browser-default alert popups in the dashboard/panel surfaces touched by this slice with portal toasts or inline validation.
- Removed the section-level status badge from `Panel Recommendations for My Supervisees` so mixed recommendation states are represented only by the individual student/recommendation status badges.
- `python manage.py test appointments`, `python manage.py makemigrations --check --dry-run`, `python manage.py check`, focused panel workflow test, `npm run lint`, and `npm run build` pass after removing panel recommendation drafts and adding workload validation.
- `python manage.py migrate` applied the no-draft and workload-validation support migrations to the local development database.
- `python manage.py test appointments`, `python manage.py check`, `npm run lint`, focused panel workflow test, and `npm run build` pass after the submitted recommendation drawer and timeline timestamp cleanup.
- `python manage.py test appointments --keepdb`, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, focused panel workflow test, `npm run lint`, and `npm run build` pass after connecting the student Panel Appointment page to the persisted appointed-panel workflow.
- `python manage.py test appointments --keepdb` and `python manage.py check` pass after adding the pending fallback for valid student accounts without a research profile.
- `npm run lint` passes after simplifying the confirmed student Panel Appointment UI.
- `python manage.py test appointments --keepdb`, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, focused frontend panel summary helper test, focused panel workflow test, `npm run lint`, and `npm run build` pass after connecting Office Staff/Admin panel monitoring records and fixing the filter/table layout.
- `python manage.py test appointments --keepdb`, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, focused panel appointment/workload/workflow frontend tests, `npm run lint`, and `npm run build` pass after connecting Office Staff/Admin workload snapshot and workload monitoring to backend data.
- `npm run lint` and `npm run build` pass after implementing panel appointment and panel workload CSV downloads.
- `npm run lint`, `npm run build`, `python manage.py test appointments --keepdb`, and `python manage.py check` pass after connecting Office Staff/Admin and Lecturer panel detail pages to backend fields and dynamic session badges.
- `npm run lint` and `npm run build` pass after adding shared workflow timelines and trimming panel detail empty-state/footer copy.
- Focused dashboard timeline API tests pass for no-active-timeline payload, admin-only template/upload, valid Excel import, invalid template errors, duplicate/conflicting rows, active timeline replacement, entry patching, audit logs, and office-staff tasks.
- `npm run lint` passes after wiring the dashboard timeline frontend service and P1/P2 dashboard timeline view to the backend contract.
- `python manage.py test --keepdb`, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, and `npm run build` pass after adding the dashboard timeline backend/database slice and frontend integration.
- `python manage.py migrate` applied `dashboard.0001_initial` to the local development database.
- `npm run lint` passes after refining the Administration Dashboard and Timeline Management P1/P2 timeline UI.
- `npm run lint` passes after converting the shared timeline display to a month-lane calendar-style view.
- `npm run lint` and `npm run build` pass after tightening the calendar labels, moving the Research Project phase buttons beside Refresh, expanding the P1 mock timeline to six entries, and removing the dashboard timeline footer controls.
- Focused dashboard timeline API tests pass after adding create-entry, delete-entry, level-move, and audit-log endpoints for Timeline Management.
- `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test appointments.test_dashboard_timeline -v 2 --keepdb`, `npm run lint`, and `npm run build` pass after completing the Timeline Management persistence pass.
- `python manage.py migrate dashboard` applied `dashboard.0002_alter_timelineauditlog_action` to the local development database.
- `npm run lint` and `npm run build` pass after simplifying the Administration Dashboard presentation scope.
- `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test appointments.test_dashboard_timeline -v 2 --keepdb`, `npm run lint`, and `npm run build` pass after adding timeline entry titles and limiting target roles to Student, Lecturer, and Office Staff.
- `python manage.py migrate dashboard` applied `dashboard.0003_semestertimelineentry_title` to the local development database.
- `npm run lint` and `npm run build` pass after simplifying the Student Dashboard Overview and adding the Lecturer Dashboard Overview.
- `npm run lint` and `npm run build` pass after wiring the dashboard lecturer workload attention count to panel workload data and replacing targeted dashboard/panel browser alerts.
- `npm run lint` passes after removing the misleading section-level panel recommendation status badge.
- `npm run lint`, `npm run build`, `python manage.py test appointments --keepdb`, and `python manage.py check` pass after adding panel workflow date-times, enriching the related panel status card, and changing dashboard timeline headings to `Session YYYY/YYYY`.
- Vite no longer reports the default production chunk-size warning after the route-level lazy-loading and vendor-chunking pass.
- `python manage.py check` passes after the account subtype-table refactor (0 issues).
- `makemigrations` + `migrate` apply the `accounts/0002` subtype-table migration cleanly; `seed_users` repopulates the demo accounts and their role profiles.
- Verified login by email and by matric number, and that `to_public_dict()` correctly resolves department / IDs from the new profile tables.
- `npm run lint` and `npm run build` pass after the Settings module, mobile responsiveness, login cleanup, and notification-tab split (with the existing non-blocking chunk-size warning).
- `python backend\manage.py test appointments -v 2 --keepdb` passes after updating appointments APIs and tests for the normalized role-profile tables.
- `python manage.py test -v 2 --keepdb` passes from `backend/` after the appointments/profile-table compatibility fix.
- `python manage.py test appointments --keepdb`, all frontend `.test.ts` scripts, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `npm run lint`, and `npm run build` pass after finishing Office Staff/Admin panel monitoring integration with cancelled records, Office Staff/Admin-only records access, lifecycle CSV fields, and clamped workload utilization.
- `npx.cmd tsx` over all frontend `.test.ts` scripts, `npm.cmd run lint`, `npm.cmd run build`, `python manage.py test appointments.test_supervisor_workflow appointments.tests dashboard.tests marks -v 2 --keepdb` split into focused runs, `python manage.py check`, and `python manage.py makemigrations --check --dry-run` pass after completing the Workflow and Approval Tracking naming/rejection-control slice.
- Browser smoke testing on local Django/Vite (`8001`/`3001`) confirms Office Staff/Admin, Lecturer, Programme Coordinator, and Student workflow routes render without app-visible errors or console errors after the Workflow and Approval Tracking slice.
- `python manage.py test accounts announcements appointments dashboard marks letters --keepdb` passes all 86 tests; `python manage.py check` reports no issues and `python manage.py makemigrations --check --dry-run` reports no changes after demo-account isolation.
- All 19 frontend `.test.ts` files pass, including the production canary-build guard; `npm run lint`, `npm run build`, tracked-source credential/PII scans, and normal production-output scans pass.
- Browser smoke testing confirms the development console logs in Office Staff/Admin, Lecturer, Programme Coordinator, and Student through their fictional `DEMO-*` identifiers. The production build retains manual login while rendering no demo console, stale console helper copy, or browser console errors.
- Added a shared frontend approved-programme list for dashboard/panel-facing flows and aligned panel appointment demo/API fallback data plus backend appointment seed/test data to the three coursework programmes.
- Reworked demo account refresh so an optional local JSON mapping renames legacy users in place, preserving protected workflow, timeline, and audit references.
- Added backend and frontend regression tests for seed guards, fictional fixture identity, configured passwords, protected-history migration, development gating, and production bundle isolation.

## Known Issues and Notes

- Supervisor and Panel waiting ages are informational calendar-day values only. No SLA, due-soon, or overdue classification will be added until the faculty supplies an approved turnaround policy.
- The enforced CSP must not replace the report-only include until every owned role flow is free of browser-console violations. Inline styles remain temporarily allowed for dynamic React layout, while inline scripts are prohibited.
- Production HSTS intentionally remains staged at one hour without `includeSubDomains` or preload until HTTPS is verified across every deployment subdomain.
- Production deployments behind TLS-terminating proxies must enable `DJANGO_TRUST_X_FORWARDED_PROTO` only after configuring the proxy to strip untrusted forwarded-protocol headers.
- DRF now defaults to authenticated access, logout requires authentication, and route-wide anonymous plus letter role-matrix tests cover the currently owned APIs. `python manage.py test accounts.test_api_security letters appointments dashboard marks --keepdb` passes all 82 tests.
- Login and password-reset endpoints now use separate environment-configurable per-IP throttle scopes with standard `429`/`Retry-After` responses; authentication forms show a shared retry-later message. All 13 focused authentication security/throttle tests, the frontend auth-error test, `npm run lint`, and `npm run build` pass.
- Timeline upload hardening now validates the 10 MB file limit and XLSX archive integrity, structure, encryption, paths, macros, entry count, and uncompressed size before spreadsheet parsing; the frontend applies the same size limit before submission. All 24 focused timeline API tests, the frontend upload-validation test, `npm run lint`, and `npm run build` pass.
- Final core-security verification passes all 112 Django tests across Accounts, Announcements, Appointments, Dashboard, Marks, and Letters; `python manage.py check` reports no issues, the migration dry run reports no changes, all 21 frontend `.test.ts` files pass, and frontend lint/build complete successfully.
- Fail-closed production settings verification passes all 6 focused subprocess tests and all 118 Django regression tests across Accounts, Announcements, Appointments, Dashboard, Marks, and Letters. `python manage.py check` and a strict production `python manage.py check --deploy` report no issues, and the migration dry run reports no changes.
- JWT session lifecycle verification passes all 126 Django tests across two serial groups (38 Accounts/Announcements and 88 Appointments/Dashboard/Marks/Letters), all 22 frontend `.test.ts` files, TypeScript lint, the production build, Django checks, migration dry run, and strict production deployment checks. Live HTTP cookie-session smoke passes login, bearer identity, two refresh rotations, restoration, logout, and post-logout rejection for Office Staff/Admin, Programme Coordinator, Lecturer, and Student. The in-app browser connector could not initialize, so no automated UI browser-smoke pass is claimed for this slice.
- Production CSP verification passes all 126 Django tests, all 23 frontend `.test.ts` files, TypeScript lint, the production build, Django checks, migration dry run, strict production deployment checks, and the Django `collectstatic` dry run. The production guard verifies policy parity, required Nginx routing and headers, `.map` denial, script-free letter output, and bundles without maps, source-map references, inline entry scripts, demo credentials, or testing-console content. Native Nginx is unavailable, Docker Desktop is stopped, and the browser connector could not initialize, so `nginx -t` and automated report-only/enforced UI smoke are not claimed.
- Frontend tooling remediation passes all 23 `.test.ts` files, the named production-security build guard, TypeScript lint, and the production build. `npm run audit:security` reports zero vulnerabilities, and `npm ls vite tsx esbuild --all` confirms Vite 6.4.3, `tsx` 4.23.1, nested `esbuild` 0.28.1, and direct/Vite `esbuild` 0.25.12 without invalid or duplicate tree errors.
- The current dependency advisory remediation passes all 28 frontend `.test.ts` files, the focused route suite, TypeScript lint, the production build, and both production artifact guards. `npm run audit:security` reports zero vulnerabilities; the resolved tree contains React Router 8.3.0, React/React DOM 19.2.8, and one overridden PostCSS 8.5.23 resolution.
- Workflow analytics verification passes all 111 Dashboard/Appointments/Marks backend tests plus all 7 focused reporting tests, Django checks, migration dry-run, all 30 frontend `.test.ts` files, TypeScript lint, production build, zero-vulnerability audit, and both production artifact guards.
- Browser smoke on local Django/Vite (`8001`/`3001`) confirms Office Staff/Admin programme filtering and XLSX response, managed-programme Coordinator reporting, assigned Lecturer reporting, Student report-route redirection, and a clean browser console. The smoke also exposed and verified a regression fix for workbooks whose role-visible sheets contain headers but no data rows.
- Student Progress Dossier verification passes all 118 Dashboard/Appointments/Marks backend tests, the 14 focused dossier/report tests, Django checks, migration dry-run, all 32 frontend `.test.ts` files, TypeScript lint, production build, zero-vulnerability audit, and both production artifact guards.
- Dossier browser smoke confirms the complete Office Staff/Admin view, assigned-section Lecturer filtering, Student self-view redaction, protected Coordinator out-of-programme not-found behavior, desktop layout, 390 px responsive layout, and a clean browser console. The configured demo Coordinator has no seeded student in its managed programme, so its authorized in-programme rendering remains covered by the backend programme-scope test rather than this local browser fixture.
- Browser smoke confirms Office Staff/Admin, Lecturer, Programme Coordinator, and Student can log in and navigate to role-appropriate routed modules under React Router 8 without console errors.
- A fresh headless browser smoke rerun remains incomplete because the temporary Chrome/Vite DevTools target did not attach to the app reliably. No browser-smoke pass is claimed; role routing, anonymous access, throttling, and valid/rejected timeline uploads remain covered by the automated suites, and the existing user-run development servers were not modified.
- Announcements/Notifications remain teammate-owned and behaviorally unchanged. Known deferred risks are cross-sender modification, draft/attachment visibility authorization, and missing authoritative announcement attachment size/content validation.
- Previously committed demo passwords and realistic fixture data remain in Git history until the repository is made private and a collaborator-coordinated `git filter-repo` rewrite is completed; rewritten branches and tags will require force-pushes and fresh clones.
- Git commands still report a Windows safe-directory ownership mismatch for the project root in this environment; configure the project as a safe directory locally before committing.
- A legacy generated metadata folder named `fsktm-postgraduate-administrative-portal1` remains at the root because the folder is locked by another process. It is not part of the runnable application after the reorganization.
- Unfinished or teammate-owned modules may remain mock-backed during development. Dashboard/Timeline, Supervisor, Panel, Marks, and Workflow/Approval Tracking are unconditionally Django-backed.
- Backend integration is still pending for broader registry, file, FAQ, and some notification workflows.
- Remaining component-local arrays are mostly UI control choices such as month labels, filter options, decorative step labels, file size units, avatar style options, and suggestion chips.
- The previous Vite default 500 kB chunk warning has been resolved through route-level lazy loading and vendor chunking.
- Git commands from this environment report a parent repository ownership mismatch, so git metadata may need local safe-directory configuration before commits can be made.

## Next Steps

- Obtain an approved faculty turnaround policy before introducing any Supervisor or Panel SLA thresholds or overdue labels.
- Upgrade local development and deployment Node.js runtimes to 22.22.0 or newer before the next clean install; the current workstation's Node 22.14.0 can build the application but is below React Router 8's supported engine floor.
- Complete browser acceptance for the persisted Settings module; keep email Office-managed and unavailable notification delivery services clearly labelled.
- Populate the Notifications tab once the supervisor-appointment and letter modules emit non-announcement notifications (`is_announcement=False`); they will appear automatically and feed the bell badge.
- Decide a single source of truth for Programme Coordinator (it currently exists both as a `User.role` value and as a `Coordinator` profile table).
- Keep current configurable demo defaults for rubrics, supervisor document requirements, mark components, and workload values until official office rules/templates are received; then seed the official values without changing the core five-module workflow code.

## Supervisor-to-Panel Handoff Completion

- Added required Research Area capture for new multipart Supervisor applications while preserving blank historical records.
- Moved final Programme Coordinator approval into an atomic service that provisions or safely reuses the research profile, creates the active Supervisor appointment, and records the approval event without partial state.
- Added conflict handling for ambiguous profiles and downstream-used profiles owned by another Supervisor; these cases return `409` and leave the application pending.
- Restricted Panel eligibility and recommendation creation to students with an active approved Supervisor appointment belonging to the authenticated Lecturer.
- Added public Student Panel readiness states, persisted Research Area rendering, profile-ready approval feedback, and an active-supervisee deep action into the existing Panel recommendation drawer.
- Updated guarded demo seeding with realistic approved Supervisor applications and appointments for seeded Panel profiles while preserving idempotency.
- Added migration coverage for primary-key-preserving legacy backfill and an end-to-end Supervisor approval to Panel approval to Marks task-generation regression.
- Verification: the full Accounts/Appointments/Dashboard/Marks suite passes 226 tests after the focused handoff, conflict, migration, eligibility, readiness, seed, downstream-history, and end-to-end tests. All 40 frontend `.test.ts` files, TypeScript lint, the production build, and both production artifact guards pass. Django checks and migration dry-run pass, and the development database has applied `appointments.0009`.
- A newly published transitive `nanoid <3.3.17` advisory appeared during verification. The lockfile now resolves `nanoid 3.3.18`; `npm run audit:security` reports zero vulnerabilities and the dependency-only lock update is kept in a separate security commit.
- The local Django and Vite servers started successfully at `127.0.0.1:8002` and `127.0.0.1:3000`. The in-app browser loaded the Vite document but did not execute its module bundle, so no automated UI browser-smoke pass is claimed for this slice.

## Appointment Closure and Reassignment

- Implemented persisted Supervisor/Panel closure, immutable lifecycle events, active uniqueness constraints, replacement lineage, direct Office/Coordinator closure, and atomic approval-chain handovers.
- Added Student Supervisor replacement with fresh documents and Lecturer Panel-member replacement through existing role queues.
- Added outgoing Panel-recommendation cancellation during Supervisor handover and immediate workload release after closure.
- Added Marks-task retirement, draft snapshot audits, clean replacement tasks, submitted-history preservation, active-query filtering, and authorized retired-task history/detail rendering.
- Extended monitoring, Coordinator records, CSV/report metadata, dossiers, and lifecycle detail views; removed fabricated Office Supervisor detail identifiers.
- Added focused backend and frontend lifecycle tests. The focused lifecycle suite passes 8 tests, including replacement after an earlier direct closure; the final lifecycle/report/dossier regression suite passes 23 tests.
- The complete Appointments/Dashboard/Marks backend suite passes 184 tests, and the affected lifecycle/report/dossier/Marks suite passes 74 tests. All 41 frontend `.test.ts` files, TypeScript lint, production build, dependency audit, production artifact guards, Django checks, migration dry-run, and diff checks pass. No browser-smoke result is claimed for this slice.
## Academic Participant Lifecycle Management (2026-08-18)

- Implemented authoritative Student and Lecturer lifecycle metadata, immutable participant audits, and three staged migrations across Accounts, Appointments, and Marks.
- Added Office-only participant list/detail/transition/pending-cancellation APIs and the lazy `/dashboard/participant-lifecycle` operational workspace.
- Implemented Deferred pause/reactivation behavior, Withdrawal cancellation/closure/retirement, Graduation blockers/completion, Retiring assignment exclusion, and terminal retirement with login disablement and refresh-session revocation.
- Added Paused evaluation tasks and immutable task lifecycle snapshots while preserving submitted Marks and all historical identifiers.
- Propagated lifecycle eligibility through Supervisor/Panel candidate lists, serializers, final approvals, Marks generation, backup assignment, Dashboard actions, Reports, and Progress Dossiers.
- Added Student read-only and Lecturer Retiring dashboard banners, Office report lifecycle counts/attention, internal dossier audit history, and public dossier redaction.
- Updated the FYP title and measurable owned-module outputs. Course registration, enrolment, credit accumulation, scheduling, and general coursework results remain explicitly out of scope.
- `docs/Functional Requirements.pdf` and `docs/Use Case Description.pdf` were not edited because editable source files are unavailable; their older title/confirmation-letter wording remains an academic-document follow-up.
- Verification: 10 focused lifecycle tests and all 244 Accounts/Appointments/Dashboard/Marks tests pass. All 42 frontend `.test.ts` files, TypeScript lint, production build, dependency audit, production demo/CSP artifact guards, Django checks, migration dry-run, and diff checks pass. Browser smoke confirms the Office lifecycle list/detail workspace loads without console errors and direct Student access redirects to the Student Dashboard.
