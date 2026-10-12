# Registry Import From The Office's Own Spreadsheets (UC04)

**Status: in progress.** Xiang asked for the plan first, then said on 2026-10-12 to build it now and amend it when the office answers P1 and P2. Until then the phases use the assumptions noted under "Waiting For The Office".

Scope: make bulk student import accept the spreadsheet the office already extracts from Maya, so staff never retype students into our template. This covers UC04 (FR-09, FR-10). It also closes the gap where imported students arrive without an intake or semester.

It adds:
- a clear list of students who are already registered;
- column matching;
- settings for all rows;
- sending activation emails later;
- programme value mapping;
- remembered matches;
- SiswaMail addresses filled from the Student ID;
- pasting rows;
- an Excel template.

## Why

- **The office already has the data.** It extracts an Excel list of students today: "For account creation: We will extract the excel then create account..." (`Interview FindOut (4).pdf`, page 1). The same page notes that some students register late.
- **The report says data arrives by import.** Student data enters the system through Excel or CSV import because there is no programmatic access to Maya (report Chapter 4, Constraint 2). Chapter 2 adds that every retyping is another chance to introduce an error.
- **Today's importer only accepts our own layout** (`accounts/registry_import.py`):
  - the first non-empty row must hold exactly `student_id, full_name, programme, email, phone`;
  - the programme must match the approved list;
  - every row needs an email;
  - there are no intake or semester columns, so those are typed per student afterwards.

  So staff rebuild the extract by hand before every import.

## Phase Status

| Phase | Scope | Size | Status | Commit(s) |
|---|---|---|---|---|
| 1 | Already-registered students listed clearly in the preview, the import result and Recent Imports | M | Done | `b9dbe75` |
| 2 | Backend: read any layout (sheets, header row, delimiter, English and Malay column names), inspect endpoint, column mapping, intake and semester | L | Done | `f465cfb` |
| 3 | Frontend: Match Columns step | L | Done | `95c222d` |
| 4 | Settings for all rows (programme, intake, semester) and sending activation emails later | M | Not started | |
| 5 | Programme names: map each unrecognised value once, or skip those rows | M | Not started | |
| 6 | Remember column matches for the same file layout | S | Not started | |
| 7 | Fill missing emails from the Student ID (SiswaMail); Student ID suffix rule | S | Blocked on P2 | |
| 8 | Paste rows copied from Excel | M | Not started | |
| 9 | Excel template with a programme dropdown, and wrap-up | M | Not started | |

Phase dependencies:
- Phase 1 works with today's importer and goes first.
- Phase 3 needs Phase 2.
- Phases 4, 5, 6 and 8 need Phase 3.
- Phase 7 needs Phase 2 and the office's answer to P2.
- Phase 9 is last, because the template uses the columns added in Phases 2 and 4.

## Waiting For The Office

- **P1. A sample of the real extract.** Two made-up rows are enough; no real student data. It answers:
  - the file type (`.xlsx`, `.xls` or `.csv`) and sheet names;
  - which row holds the column names, and the exact column names;
  - how programmes are written;
  - whether emails and phone numbers are included.

  Phase 2 starts with the column names from research (see "Fields") and adds the office's exact names when the sample arrives. If the file is `.xls`, Phase 2 adds a reader for it.
- **P2. Which number identifies a student.**
  - Since 2020 MAYA gives each student a lifelong Student ID and a Matric Number, which is "the Student ID used to identify program of study" (UMSItS FAQ). The SiswaMail username is the Student ID.
  - The senior's report file name "22004797-1" suggests matric numbers like `22004797/1`. Our Student ID field refuses "/" because the value appears in links.
  - Recommended: the registry keeps the Student ID (for example `23004955`), which matches SiswaMail.
  - Phase 7 needs this answer.

Working assumptions until the office answers (Xiang, 2026-10-12: build now, amend later):
- P1: start with the researched column names; refuse `.xls` with "save it as .xlsx" rather than adding a reader.
- P2: the registry keeps the Student ID; Phase 7 offers to drop a `/1` style suffix.

Already answered by Xiang (2026-10-12):
- all students use SiswaMail;
- sending activation emails later is wanted;
- students who are already registered must be listed so the office is aware of them.

## How To Run A Phase

1. Read this file, then the newest section of `PROJECT_STATUS.md`.
2. Before Phase 1 only: run `git fetch` and check whether `origin/main` has commits that `Xiang` lacks. If it does, stop and ask Xiang. The merge rule still applies: walk through the teammate's changes first, then merge on a separate branch.
3. Take the first phase whose status is `Not started`. Do only that phase unless Xiang has said to carry on. Skip a phase marked `Blocked` until its answer arrives.
4. Read every file under the phase's "Start here" before writing code. Items marked **Verify** are assumptions to confirm in the code first. If one is wrong, adapt and say so in the commit message.
5. Build it, add the listed tests, and run the full verification below.
6. Commit on `Xiang`. Then set the phase to `Done` here with the commit hash, and add a dated section to the top of `PROJECT_STATUS.md` in the same style as the existing entries.
7. Do not push. Report what was done and anything left open.

If a phase needs a change inside a teammate-owned file, stop and ask before touching it.

## Ground Rules

The ground rules of `2026-09-26-partly-done-modules-completion.md` still apply: repository location, branch, code style, backend and frontend conventions, environment. This plan adds the following.

**Ownership.**
- Xiang-owned:
  - backend: `accounts/registry_import.py`, `registry_views.py`, `registry_urls.py`, the new `accounts/registry_columns.py`, and the `accounts/test_registry*.py` files;
  - frontend: `StudentRegistry.tsx`, the new `RegistryImport*.tsx` components, `services/studentsApi.ts`, `types/student.ts`, `utils/csvImport.ts` and the new `utils/registryImport*.ts` files.
- Shared files, additive changes only:
  - `accounts/models.py` (new fields on `RegistryImportBatch`, the new `RegistryProgrammeAlias` and `RegistryImportProfile`);
  - `config/settings.py`;
  - `backend/.env.example`;
  - `backend/requirements.txt` (only if P1 needs an `.xls` reader).
- Teammate code used read-only: `utils/csvExport.ts`, `components/PortalPrimitives.tsx`.

**Keep today's behaviour.** A file in our template layout must import exactly as it does now. The existing tests in `test_registry_import.py` and `test_registry_hardening.py` must keep passing. Only change one where a phase deliberately adds to a response, and say so in the commit message.

**Never guess silently.**
- The office sees column matches, programme mappings and filled emails before anything is created, and can change them.
- A column the system is not sure about stays unmatched.

**Store nothing extra.**
- Columns the office does not match (for example IC or passport number, address) are ignored and never saved.
- The uploaded file itself is not stored, as today.
- Reason: PDPA 2010, General Principle, which requires personal data to be adequate, relevant and not excessive.

**Imports never change existing students.** They are skipped and listed (Phase 1).

**Writing.** Plain language in the UI. No long dashes anywhere: UI, code, comments, docs or commit messages. Dates and times show in Malaysia time.

## Verification (Every Phase)

Run the verification block of the 2026-09-26 plan:
- backend: tests with `--parallel 2`, Django checks, the migration-drift check;
- frontend: lint, build, both production guards, and every `*.test.ts(x)` script;
- `git diff --check`.

This plan adds:
- **Test files are built inside the tests**, with `openpyxl` and plain text, as `xlsx_file` and `csv_file` do in `test_registry_import.py`. Never commit a real extract.
- **Browser checks** use Playwright from the scratchpad (`playwright-core` driving the installed Chrome). Check every changed screen at 390, 768 and 1440 px wide.
- **Live smoke data.**
  - Use a temporary `smoke.import.*@example.test` office account, Student IDs starting with `SMOKE-IMP-`, and file names starting with `smoke-`.
  - Start the server with `EMAIL_HOST_PASSWORD=""` so activation emails go to the log, not to real inboxes.
  - Never change a student's status during smoke tests: lifecycle audit rows cannot be deleted.
  - Clean up in this order:
    1. `OutstandingToken` rows;
    2. the smoke students (delete their users);
    3. import batches whose file name starts with `smoke-`;
    4. programme aliases and import profiles saved by the smoke office;
    5. the smoke office.
- **Migrations.** Before applying a phase's migration to the dev database, back it up with `pg_dump -Fc` into `Final Year Project/db-backups/`, named `fsktm_pg_office_before_<label>_<date>.dump`.

## Research Notes (2026-10-12)

1. **One standard flow.** Import tools (Flatfile, OneSchema, Dromo, CSVBox) and the Smart Interface Design Patterns guide share it: upload, match columns, check values, repair, import. Users confirm suggested matches instead of preparing files by hand. ([Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/bulk-ux/), [Dromo](https://dromo.io/blog/5-best-practices-to-streamline-your-csv-import-process))
2. **Header rows.** Flatfile scans the first rows and picks the one with the most filled cells. OneSchema finds the header row automatically and lets the user pick another. ([Flatfile options](https://flatfile.com/developers/javascript/options/), [OneSchema](https://docs.oneschema.co/docs/2-select-header-row))
3. **Unused columns.** Ignore them rather than reject the file, and tell the user which columns were skipped. ([Dromo](https://dromo.io/blog/data-mapping-best-practices-csv-imports))
4. **Category values** ("enum" or "picklist" mapping): each distinct value in the file is mapped once to an allowed value. ([Flatfile](https://support.flatfile.com/articles/8569925090-mapping-data), [OneSchema](https://docs.oneschema.co/changelog/picklist-mapping))
5. **Saved mappings.** Store the confirmed matches and replay them for the same source. ([CSVBox](https://blog.csvbox.io/save-csv-mappings/), Dromo)
6. **Other admin tools.**
   - Moodle's "Upload users" lets the administrator set default values for fields that are not in the file. ([Moodle](https://docs.moodle.org/24/en/Upload_users))
   - Google Workspace still requires its own CSV template. ([Google](https://knowledge.workspace.google.com/admin/users/add-or-update-multiple-users-from-a-csv-file))

   This plan goes further than both.
7. **Pasting.** Spreadsheets put copied cells on the clipboard as tab-separated text, so pasting is reliable. ([CSVBox](https://blog.csvbox.io/copy-paste-import/))
8. **Leading zeros.** Excel drops them from numbers such as phone numbers, so a template should format those columns as text. ([example](https://edsmart.atlassian.net/wiki/spaces/SUP1/pages/37257586/Phone+numbers+in+exported+files+are+missing+leading+zeros+when+opened+in+Excel))
9. **UM.** SiswaMail and MAYA sign-in use `student_id@siswa.um.edu.my`. MAYA has a lifelong Student ID and a Matric Number per programme of study. ([UMSItS FAQ](https://umsitsguide.um.edu.my/applicant/faqs_main_app.html), [UM System Access guide](https://umsitsguide.um.edu.my/applicant/pdf_app/guides_app/UM%20System%20Access%202024%206.pdf))
10. **PDPA 2010, Section 6.** Personal data processed must be adequate, relevant and not excessive. ([Linklaters](https://www.linklaters.com/en/insights/data-protected/data-protected---malaysia))
11. **Gmail limits.** A personal Gmail account sends to about 500 recipients a day; Google Workspace about 2,000. ([Nylas](https://developer.nylas.com/docs/cookbook/email/gmail-smtp-settings.md))

## Design Decisions

- **I1** The server reads, matches and checks everything, as in Phase 3 of the 2026-09-26 plan. The browser only shows and edits.
- **I2** There is no server-side import session. Each step (inspect, preview, import) sends the file again (2 MB limit) with the chosen options. This is how preview and import already work.
- **I3** Import options travel as one JSON form field, `options`: `sheet`, `headerRow`, `hasHeader`, `mapping`, `defaults`, `programmeMap`, `fillEmail`, `idRule`, `sendInvites`. Without `options` the importer behaves exactly as it does today.
- **I4** Settings for all rows fill blank cells and unmatched columns only. They never overwrite a value that is in the file.
- **I5** Already-registered rows are matched by Student ID or email, ignoring letter case (today's rule). They are listed with the registry record they match and flagged when the name or email differs.
- **I6** Programme aliases and column profiles are shared by the whole office, not kept per person.
- **I7** Filled emails are marked in the preview, the import result, the report and the batch record.
- **I8** A batch remembers which students it created. "Send activation emails" later reaches only those who are still active and have not set a password.

## API Summary (after Phase 9)

All of these are Office-only, so the public API list pinned by `accounts/test_api_security.py` does not change.

- `POST /api/registry/students/import/inspect/` (multipart `file`, optional `options` with `sheet`, `headerRow`, `hasHeader`). It returns:
  - `fileName`, `sheets`, `sheet`, `headerRow`;
  - `columns`, each with `index`, `header`, `samples` and `suggestedField`;
  - `fields`, each with `key`, `label` and `required`;
  - `mapping` and `ignoredColumns`;
  - `programmeValues` (Phase 5) and `profileAppliedAt` (Phase 6).
- `POST /api/registry/students/import/` (multipart `file`, `dryRun`, `options`): as today, plus the options.
- `GET /api/registry/imports/?limit=`: as today, with the new batch fields.
- `POST /api/registry/imports/<id>/send-invitations/` (Phase 4).
- `GET /api/registry/students/import/template/` (Phase 9): the Excel template.

## Fields

| Key | Shown as | Required | Stored in |
|---|---|---|---|
| `student_id` | Student ID | Yes | `Student.matric_no` |
| `full_name` | Full name | Yes | `User.full_name` |
| `programme` | Programme | Yes, unless set for all rows (Phase 4) | `Student.programme` (approved list; Phase 5 maps other spellings) |
| `email` | Email | Yes, unless filled from the Student ID (Phase 7) | `User.email` |
| `phone` | Phone | No | `User.phone` |
| `intake` | Intake | No | `Student.intake_semester` (32 characters) |
| `current_semester` | Current semester | No | `StudentRegistry.current_semester` (64 characters) |

Starting column names, in English and Malay, compared after lower-casing and removing punctuation:
- **Student ID:** student id, student no, student number, matric, matric no, matric number, no matrik, nombor matrik, no pelajar, id pelajar
- **Full name:** name, full name, student name, nama, nama penuh, nama pelajar
- **Programme:** programme, program, programme name, programme of study, program pengajian, nama program, course, kursus
- **Email:** email, e mail, emel, e mel, email address, alamat emel, siswamail, student email, emel pelajar
- **Phone:** phone, phone no, mobile, mobile no, telephone, tel, no tel, no telefon, telefon, no hp, handphone, no telefon bimbit
- **Intake:** intake, intake session, intake semester, sesi, sesi kemasukan, kemasukan
- **Current semester:** semester, current semester, semester semasa

Never match "id", "no", "ic", "kp" or "passport" to the Student ID. Those columns usually hold IC or passport numbers. Add the office's exact column names when P1 arrives.

---

## Phase 1: Already-Registered Students Listed Clearly

**Why.** Xiang (2026-10-12): skipped students must be listed so the office knows about them. Today an already-registered row only shows a status and a short reason, and after the import a toast gives counts only.

**Start here.**
- `accounts/registry_import.py` (`validate_import_rows`)
- `accounts/registry_views.py` (`student_import_view`, `_import_row`)
- `accounts/models.py` (`RegistryImportBatch.to_public_dict`)
- `accounts/test_registry_import.py`
- `frontend/src/components/StudentRegistry.tsx`: the bulk tab's preview table, `handleCommitVerifiedCsv`, and Recent Imports
- `frontend/src/types/student.ts` (`ImportPreviewRow`, `RegistryImportBatch`)

**Tasks.**
1. **Backend, preview rows.** For an "Already Registered" row, add:
   - `existing`: the matching record's `id`, `name`, `email`, `programme` and `academicStatus`;
   - `matchedBy`: `"studentId"` or `"email"`;
   - `differences`: which of `name`, `email` and `id` differ between the file and the record (trimmed, letter case ignored, repeated spaces collapsed).

   Load the matching records with one query for IDs and one for emails (`select_related("user")`), not one per row. **Verify** today's `registered_ids` and `registered_emails` sets and replace them with lookups that keep the records.
2. **Backend, rows repeated in the file.** Add `duplicateOf`: the first line with the same Student ID or email.
3. **Backend, import.**
   - Rows returned by a real import keep `existing`, `differences` and `duplicateOf`.
   - Each entry in the batch's `problems` also stores `name`; already-registered entries add `existingName` and `differences`.
   - Older batches without these keys must still display.
4. **Backend, batch.** `to_public_dict` adds `alreadyRegistered` and `duplicateInFile` counts, worked out from `problems`. No migration is needed.
5. **Frontend, preview.**
   - A summary line: "38 ready · 4 already registered (will be skipped) · 1 repeated in this file (will be skipped) · 2 need fixing".
   - A filter: All, Ready, Skipped (already registered or repeated), Need fixing. As built, "Skipped" groups both kinds, and each row says which.
   - Already-registered rows show "In the registry as Nurul Huda binti Kamal, Data Science".
   - A warning badge when the name or email differs, for example "Name differs: check this Student ID".
   - Beside the Create button: "4 students are already registered and will be skipped", with a "View" link that applies the filter.
   - As built, beyond the plan:
     - The explanation sits under each student's name, so the table needs no extra column.
     - The preview takes the full width under the upload card.
     - Programmes show as "Data Science / Master · Coursework".
5a. **Backend, order of checks (as built).** A registered Student ID is reported before email and programme problems. A re-uploaded extract therefore lists existing students as already registered instead of asking the office to fix their rows.
6. **Frontend, after the import.**
   - Replace the toast-only result with a result panel listing: students created; students skipped as already registered, each with Student ID and name; rows not imported, with the reason; and activation emails not sent.
   - "Download import report" saves every row with its outcome as CSV, using `utils/csvExport.ts`.
7. **Frontend, Recent Imports.** Each batch shows "N already registered". Its download includes names.
8. Rename the "Bulk Import via CSV" tab to "Bulk Import (Excel or CSV)".

**Tests.**
- Backend:
  - an already-registered row names the existing record, both when matched by Student ID and when matched by email, in any letter case;
  - `differences` lists a different name, and is empty for the same name in other letter case;
  - repeated rows point at the first line;
  - batch problems keep names;
  - the query count stays the same for 5 and for 50 rows (`assertNumQueries`).
- Frontend scripts: summary counts and the filter helper (new `utils/registryImport.ts`); the report CSV builder; a source check for the new tab label.

**Done when** a live smoke import of 2 new students and 2 already-registered ones (one with a different name in the file):
- lists both already-registered students with their registry names, and shows the warning on the one with the different name;
- shows them in the result panel after the import;
- shows the count in Recent Imports.

## Phase 2: Read Any Layout (Backend)

**Why.** The office's extract has its own column names and order, extra columns, and possibly title rows above the column names.

**Start here.**
- `accounts/registry_import.py` (all of it)
- `accounts/registry_views.py` (`student_import_view`, `_import_row`, `StudentRecordCreateSerializer`)
- `accounts/registry_urls.py`
- `accounts/test_registry_import.py`
- `accounts/test_registry_hardening.py` (`ImportParserTests`)
- `frontend/src/utils/csvImport.test.ts`, which reads `IMPORT_HEADERS`

**Tasks.**
1. **New `accounts/registry_columns.py`.**
   - The field list from "Fields", with labels, required flags and the starting column names.
   - `normalise_header()`.
   - `suggest_mapping(headers)`, which returns a column index per field, or none.

   Match exact names only, after normalising. "No. Matrik" and "no matrik" count as the same name. If two columns could match one field, leave that field unmatched.
2. **Reading.**
   - CSV: detect the delimiter (comma, semicolon or tab) from the first lines, falling back to comma. Keep today's encoding rules.
   - XLSX: list the sheet names. Read the chosen sheet; by default, the first sheet whose header row matches at least two fields, otherwise the first sheet. Keep today's limits on ZIP size, row width and blank runs.
   - Header row: among the first 15 non-empty rows, pick the one that matches the most fields (at least two). Otherwise pick the row with the most filled cells among the first 10. The office can choose another row (`headerRow`).
   - Data rows: everything below the header row. Fully blank rows are skipped, as today.
3. **`POST /api/registry/students/import/inspect/`** (Office only, same file checks and size limits). It returns the summary from "API Summary". Samples are the first three non-blank values of each column; never return whole rows. Register the route before `students/<str:matric_no>/` in `registry_urls.py`.
4. **`options.mapping` on preview and import:** `{field: columnIndex}`. Refuse with a 400 and a field message when:
   - a field name is unknown;
   - a column index is out of range;
   - one column is used for two fields;
   - a required field is missing (Phases 4 and 7 relax this for programme and email).
5. **Intake and current semester.**
   - They are optional fields, with the same length rules as single registration (32 and 64 characters).
   - Pass them to `_register_student` as `intakeDate` and `semester`.
   - Add `intake` and `current_semester` to `IMPORT_HEADERS`. The frontend parity test and the CSV template follow.
6. **Student ID clean-up that is always safe.** Trim spaces. Excel numbers such as `23004955.0` become `23004955` (`_text` already does this). Nothing else is changed.
7. **P1 file type.**
   - If the office's file is a real `.xls`, add `xlrd>=2,<3` to `requirements.txt` and read it the same way.
   - If it is a web page saved with an `.xls` name, refuse it with "Open the file in Excel and save it as .xlsx".

**Tests.**
- A messy workbook (two title rows, Malay column names, an IC column, a second sheet) inspects and previews correctly.
- Semicolon and tab-separated CSVs read correctly.
- Columns in any order are matched.
- Extra columns are ignored; the response only shows their names and samples.
- Each kind of invalid mapping is refused with a clear message.
- Today's template files, sent without options, behave exactly as before.
- Intake and semester are saved.
- Inspect is Office-only: 403 for a lecturer and a student. The anonymous 401 is already covered by `test_api_security.py`.

**Done when** the messy workbook from the tests previews through the API with every row matched.

## Phase 3: Match Columns Step (Frontend)

**Why.** Let the office confirm matches instead of preparing the file.

**Start here.**
- `StudentRegistry.tsx`, bulk tab: `previewImportFile`, `handleSaveEditedRow`, `handleCommitVerifiedCsv`
- `services/studentsApi.ts`
- `types/student.ts`
- `utils/csvImport.ts`
- `components/SelectMenu.tsx`

**Tasks.**
1. **`studentsApi`:** add `inspectStudentImport(file, options)`. `previewStudentImport` and `commitStudentImport` also take `options`.
2. **New `components/RegistryImportMatch.tsx`.**
   - A step line: Upload, Match columns, Check rows, Import.
   - One row per field: the label, a "Required" tag, a `SelectMenu` of the file's columns plus "Not in file", and three sample values.
   - A list of unused columns: "Not used (not saved): No. KP, Alamat".
   - A sheet choice when the workbook has more than one sheet.
   - "Column names are on row 3", with a way to change it.
   - Continue stays disabled until every required field is matched, with a line saying which are still missing.
3. **Our own template skips this step.** A file in our template layout goes straight to Check rows, with a "Change column matches" link.
4. **Editing a row** in Check rows rebuilds the reviewed CSV in our layout (`rowsToCsv`, now with intake and current semester) and sends it without a mapping.
5. **Keep the drop zone usable from the keyboard**, as today.

**Tests.**
- The helper `mappingProblems(mapping, fields)` reports a missing required field and a column used twice (`utils/registryImport.ts`).
- `rowsToCsv` includes the new columns.
- A source check that the bulk tab renders `RegistryImportMatch`.
- The parity test is updated for the new `IMPORT_HEADERS`.

**Done when** a browser run uploads the messy workbook, confirms the suggested matches, previews and imports it at 390, 768 and 1440 px.

## Phase 4: Settings For All Rows, And Activation Emails Later

**Why.**
- An intake list is usually one programme and one intake, so typing those per student wastes time.
- Xiang wants to import early and invite the students later.

**Start here.**
- The Phase 2 and Phase 3 code
- `registry_views.send_activation_email`, and the shared mail connection in `student_import_view`
- `RegistryImportBatch`

**Tasks.**
1. **`options.defaults`:** `programme` (approved list only), `intake` and `semester`.
   - Each one fills blank cells and an unmatched column. It never overwrites a value from the file (I4).
   - With a default programme, the programme column may be left unmatched.
2. **`options.sendInvites`** (default true). When it is false, the import sends no email and the batch is marked as holding its invitations.
3. **Migration** in `accounts`. `RegistryImportBatch` gains:
   - `created_ids`: a JSON list of Student IDs, kept for every import;
   - `invitations_held` (bool);
   - `invitations_sent_at` (datetime, null);
   - `settings_used`: JSON holding the defaults and `sendInvites`; later phases add their options.

   `to_public_dict` returns all of them.
4. **`POST /api/registry/imports/<id>/send-invitations/`** (Office only).
   - Emails the batch's students who are still active and have not set a password, using one mail connection.
   - Returns `{sent, failed, alreadyActivated, notFound}`.
   - Stores `invitations_sent_at` and clears `invitations_held`.
   - Safe to repeat: students who have activated are never emailed again.
   - Throttled per batch with `REGISTRY_BATCH_INVITE_THROTTLE_RATE` (default 3/hour), documented in `.env.example`.
5. **Frontend.**
   - A "For every row" card on the Match step:
     - Programme, as a `SelectMenu` of the approved programmes or "From the file";
     - Intake;
     - Current semester, suggesting the semesters already in the registry;
     - "Activation emails: Send now / Send later".
   - The result panel and Recent Imports show "Activation emails held", with "Send now" behind a confirmation ("Send activation emails to 38 students?").

**Tests.**
- Defaults fill blanks and unmatched columns only.
- A default programme outside the approved list is refused.
- `sendInvites: false` sends no email and holds the batch.
- Send-invitations reaches only the active, not-yet-activated students from that batch. Running it twice in a row sends nothing new. It is Office-only and throttled.
- The batch keeps its created IDs.

**Done when** a live smoke import with "Send later" sends no email (checked in the log), and "Send now" then emails exactly the imported students.

## Phase 5: Programme Names

**Why.**
- Extracts may write one programme several ways: "Sarjana Sains Data", "MDS", "Master of Data Science". The office should fix each spelling once, not row by row.
- Extracts may include students of other programmes (for example PhD), which should be skipped.

**Start here.**
- `accounts/programmes.py` (`normalise_programme`)
- the Phase 2 inspect endpoint
- the Phase 3 Match step

**Tasks.**
1. **Inspect returns `programmeValues`:** each distinct non-blank value in the programme column, with its row count and a suggestion. The suggestion is one of:
   - the approved programme it already equals;
   - a saved alias (task 3);
   - a safe normalised match, ignoring letter case, punctuation, "(Coursework)" and "by coursework".

   Nothing else is guessed.
2. **`options.programmeMap`:** `{value: approvedProgramme or "__skip__"}`. Rows mapped to skip get the status "Skipped (programme)" and appear in the Phase 1 lists.
3. **Office-wide memory.** New model `RegistryProgrammeAlias`, saved on a real import only, never on a preview. Fields:
   - `value_key`, unique;
   - `programme`, blank for skip;
   - `updated_by`, `updated_at`.
4. **Frontend.** A "Programme names in this file" card: each value with its row count and a `SelectMenu` of the approved programmes plus "Skip these rows". An unmapped value blocks Continue, with a message saying which.

**Tests.**
- Distinct values and their counts are reported.
- Normalised suggestions appear.
- Aliases are saved on import, not on preview, and suggested next time.
- Skipped rows are listed and not created.
- An alias to a programme outside the approved list is refused.

**Done when** a file with three spellings of one programme and some PhD rows imports with one choice per spelling, and the PhD rows are listed as skipped.

## Phase 6: Remember Column Matches

**Why.** The same Maya extract arrives every intake, so the office should only have to confirm the columns once.

**Start here.** The Phase 2 inspect endpoint, the Phase 3 Match step, `RegistryImportBatch`.

**Tasks.**
1. **New model `RegistryImportProfile`.**
   - `signature`, unique: the normalised column names joined in order;
   - `mapping`, `sheet_name`, `header_row`;
   - `updated_by`, `updated_at`.
2. **Save and reuse.** Save the profile on a real import. On inspect, apply a stored profile with the same signature and report it (`profileAppliedAt`).
3. **Frontend.** Show "Matched the same way as your import on 12 Oct 2026.", with "Change", which falls back to the normal suggestions.

**Tests.**
- The profile is saved on import only.
- It is applied for a different file with the same columns.
- A changed column list falls back to suggestions.
- A stale profile pointing past the last column is ignored.

**Done when** a second import of a file with the same columns opens with the saved matches and the note.

## Phase 7: Fill Missing Emails From The Student ID (Blocked On P2)

**Why.** All students use SiswaMail (Xiang, 2026-10-12), and the SiswaMail username is the Student ID. Extracts may not include emails.

**Start here.**
- Phase 2 `registry_import.py`
- the Phase 3 Match step
- `accounts/validators.py`

**Tasks.**
1. **Setting `REGISTRY_STUDENT_EMAIL_DOMAIN`** (default `siswa.um.edu.my`), documented in `.env.example`.
2. **`options.fillEmail`** (default true).
   - A blank or missing email becomes `<Student ID>@<domain>`, in lower case.
   - The row gets `emailFilled: true`, shown as "Filled from Student ID" in the preview, the result, the report and the batch.
   - The email field is then not required in the mapping.
3. **Suffix rule, depending on P2.** If Student IDs come with a programme suffix (`23004955/1`), `options.idRule: "studentId"` keeps the part before "/" for both the Student ID and the email. The preview marks every row it changes.
4. **Frontend.** On the Match step: "Fill missing emails as Student ID@siswa.um.edu.my", ticked by default.

**Tests.**
- Blank and missing emails are filled and marked.
- Existing emails are untouched.
- A filled email still goes through the repeated-row and already-registered checks.
- The suffix rule applies only when chosen.

**Done when** an extract without an email column previews with every email filled and marked, and imports.

## Phase 8: Paste Rows From Excel

**Why.** Late registrations and short lists should not need a file.

**Start here.** The Phase 3 upload card, `studentsApi`, and Phase 2's delimiter detection.

**Tasks.**
1. **A "Paste rows" option on the upload card.** The office pastes cells copied from Excel or Google Sheets into a box. The tab-separated text is sent as a file named `pasted-rows.csv` and goes through the same steps; Phase 2 detects the tab delimiter.
2. **"The first row is column names"** switch, on by default.
   - Without column names, columns are labelled Column 1, Column 2 and so on.
   - Inspect suggests matches from the values: email addresses, Student IDs, approved programme names, phone numbers.
3. **The same 1,000-row limit**, also checked in the browser before sending.

**Tests.**
- A tab-separated paste is read with and without a header row.
- Matches are suggested from the values.
- The helper turns clipboard text into a file.

**Done when** rows pasted from a spreadsheet, with and without column names, preview and import in the browser.

## Phase 9: Excel Template, And Wrap-Up

**Why.** When the office does have to type a list, a proper Excel template prevents mistakes better than a CSV.

**Start here.**
- `utils/csvImport.ts` (`CSV_TEMPLATE`)
- the template download in `StudentRegistry.tsx`
- `registry_import.IMPORT_HEADERS`
- the openpyxl data validation docs ([link](https://openpyxl.readthedocs.io/en/stable/validation.html))

**Tasks.**
1. **`GET /api/registry/students/import/template/`** (Office only) builds an `.xlsx` with `openpyxl`:
   - a "Students" sheet with the template columns from `IMPORT_HEADERS` and a frozen header row;
   - Student ID and Phone formatted as text, so Excel keeps leading zeros;
   - the Programme column as a dropdown of the approved programmes, from a hidden "Programmes" sheet;
   - a "How to fill in" sheet with the rules in plain language and one example row. The example is kept off the Students sheet so it can never be imported.
2. **Frontend.**
   - "Download Excel template" is the main button and "CSV template" the secondary one; the file comes through `requestBlob`.
   - The import guidelines card says the office can also upload its own extract as it is.
3. **Docs.**
   - A dated `PROJECT_STATUS.md` section.
   - Design decision **D8** for the report: bulk import accepts the office's own spreadsheet, and the template is optional. UC04's precondition, "file is prepared in the required template format", no longer applies.
   - A list of any teammate-written doc that is now out of date.

**Tests.**
- The template opens with `openpyxl`.
- Its columns equal `IMPORT_HEADERS`.
- The programme dropdown exists.
- A filled-in template imports correctly.

**Done when** a downloaded template, filled in Excel and uploaded, imports correctly, and the docs are updated.

---

## Use Case Coverage (UC04)

| UC04 part | Phase |
|---|---|
| Main flow: upload, check format and columns, check rows, create accounts, summary | 2, 3, 4 (today's flow keeps working) |
| Alternative flow: download the template | 9 (Excel), plus today's CSV |
| Exception 1: unsupported file format | 2 (and `.xls`, depending on P1) |
| Exception 2: duplicate student records | 1 |

## Known Limits

- **No live link to Maya** (report Constraint 2). The office still extracts the file. The system only stops the retyping.
- **One header row.** If the column names are split over two rows, the office picks the row with the main names.
- **`.xls` files** are read only if P1 shows the office needs it. Otherwise the office saves the file as `.xlsx`.
- **Email limits.** A personal Gmail account sends to about 500 recipients a day; Google Workspace about 2,000. Each student gets their own activation email. For large intakes, deploy with the faculty's mail server, or use "Send later" to send a batch in parts.
- **Existing students are never updated** by an import. Changes such as a programme transfer stay in the Registry or the transfer workflow.

## After This Plan

- **An "update mode"** for re-imports: show the differences between the file and the registry (for example a changed phone number) and let the office approve each change. Not included now, because skipping existing students keeps imports safe.
- **Scheduled pick-up of an extract** from a shared folder, if Maya ever offers automatic exports.
