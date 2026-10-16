# Remaining Modules Plan: UC22, UC03, UC28 and UC29

Date: 2026-10-15. Owner: Xiang.

**Status: approved on 2026-10-15 ("you may start with the development now, phases by phases"), with every default in section 1 as written. Building phase by phase; the tables in A4, B4 and C5 hold progress.**

A clickable mockup of the main screens comes with this plan: https://claude.ai/artifact/4RE5QRe7aKi3QcEFzu5uS1.

**Before building (2026-10-15):**
- Wey Cheng's PR #19 was fast-forwarded into `Xiang` (`ee8b3fb`).
- The dev database was backed up and migrated to `appointments.0016`.
- PR #19 adds `SupervisorApplication.project_course_codes`, so letters print course codes by themselves (A2).
- One teammate test fails on `main` itself: `appointments.test_capacity_reassessment_migration` compares rows after migrating to the latest migration, and the new column changes them. It is his file; Xiang passes it on. The rest pass: 1,241 backend tests, 144 frontend scripts, lint, build and the security check.

## 0. What Is Left

Xiang's part of the system (Subtitle 2) has three pieces still to build. Everything else in Subtitle 2 is done: sign-in, registry, import, letters, announcements, notifications and files.

| Order | Module | Use cases | Today | Phases |
|---|---|---|---|---|
| 1 | Appointment letters | UC22 (FR-24, FR-25, FR-31, FR-32) | Letter Generation works, but nothing happens when an appointment is approved. | 3 |
| 2 | Staff and lecturer accounts | UC03 (FR-05 to FR-08) | The Staff & Lecturers tab is a mock. Real accounts are made in Django admin. | 3 |
| 3 | FAQ chatbot and knowledge base | UC28, UC29 (FR-57, FR-58) | Both screens are mocks with fixed keyword replies. The office FAQ is extracted from the PDF, but 48 of its 163 rows are flagged as damaged. | 6, plus 1 optional |

**Why this order:**
- **Appointment letters first.** It is the smallest piece and needs only the finished letters module. It completes the main viva story: supervisor appointment, then approval, then letter.
- **Accounts second.** The office can then create staff accounts in the portal instead of Django admin. That also helps Wey Cheng's plan to close Django admin to office users (his T04).
- **Chatbot last.** It is the biggest piece, and its data needs the office's help. So the FAQ review list goes to the office on day one and runs alongside the other two modules.

**Not in this plan** (still open, decided elsewhere):
- supervisor application files in a student's file view (needs Wey Cheng's agreement);
- links from a file to an appointment or letter (file plan 4.11, optional);
- moving Programme Transfer into the Registry (waiting for Wey Cheng to push);
- Wey Cheng's technical-admin work (T01 to T06).

## 1. Defaults To Confirm

These are the defaults I will build with. Change any of them before building starts.

**Appointment letters**
1. **Hook.** The letters app listens for new supervisor and panel appointments. No teammate file is edited, and Xiang tells Wey Cheng it exists.
2. **Recipients.**
   - Supervisor letter: the student and the supervisor.
   - Panel letter: the student and the panel member, with the supervisor in copy.
3. **Issued straight away.** A letter is issued as soon as the appointment is approved. The office checks it first only when the template has office-filled fields, such as attendance.
4. **Co-supervisor letters.** Not now. They can be added later as a third template type.
5. **Earlier appointments.** Appointments approved before this module get letters only when the office presses "Create letters". This avoids flooding people with old letters.

**Staff accounts**

6. **One role per account,** as agreed with Wey Cheng. A lecturer's duties (Supervisor, Panel member) can both be on at once, which covers FR-06 (multiple roles). A coordinator who also supervises still needs a second account (this is Wey Cheng's open item D02).
7. **Delete only unused accounts:** never signed in, and no records anywhere. Every other account is switched off with "Turn off sign-in", so history stays.
8. **Block unsafe changes.** Turning off sign-in, or removing a duty, is refused while the person still has active work. The message lists what to resolve first.
9. **Office only.** Coordinators and lecturers do not see the Staff & Lecturers tab.

**Chatbot**

10. **No made-up answers.** The chatbot only shows answers the office wrote and reviewed, or passages from documents the office uploaded. An AI-rewording step is optional and off by default.
11. **Who can ask.** Students and coordinators can ask. Lecturers have no FAQ menu item: that is set in Wey Cheng's `permissions.ts`, which this plan leaves alone. The office tests answers with "Try it".
12. **Privacy.** Saved student questions carry no name or student ID, and are deleted after 12 months.
13. **Damaged FAQ rows.**
    - 56 clean rows go live straight away.
    - These are imported as "Needs checking" (61 entries) and stay hidden from students until the office fixes them in the new screen:
      - the 37 damaged rows in the six sections;
      - the 24 extra rows found only on the "ALL" sheet (5 of them are damaged too).
    - The other 6 damaged rows are repeats on the "ALL" sheet and are skipped. That accounts for all 48 (37 + 5 + 6).
14. **Malay.** Questions in Malay, or mixed Malay and English, are supported, and the evaluation measures how well.

**Needed from other people**
- **The office:**
  - correct answers for the damaged FAQ rows, including rows 10 and 11, which carry another row's answer;
  - the official wording and signatory for the supervisor and panel appointment letters;
  - the "contact us" text for questions the chatbot cannot answer.
- **Wey Cheng:**
  - a short note that the letters app listens for new appointments;
  - a note that the accounts screen reads his `lecturer_blockers` and capacity data without changing them.

---

# Part A. Appointment Letters (UC22)

## A1. What It Looks Like

| # | Screen | Who | What changes |
|---|---|---|---|
| 1 | Letter Generation, template editor | Office | A new "Used for" choice: *Student requests* (as now), *Supervisor appointment letter*, or *Panel appointment letter*. The placeholder list shows the extra appointment fields when an appointment kind is chosen. |
| 2 | Letter Generation, Issued Letters | Office | A "Made by" filter: *Student request* or *Automatic*. On an automatic letter, the ⋯ menu adds "Reissue with current details". |
| 3 | Letter Generation, banner | Office | Shown only when needed: "2 approved appointments have no letter because there is no active Supervisor appointment template." Buttons: **Set up template** and **Create letters**. |
| 4 | Letter page in Files | Student, supervisor, panel member | Opens from the notification. Shows the A4 letter with **Download PDF**. Lecturers reach it through Files, because they have no Letter Generation menu. |
| 5 | Places the letter also appears | Student, lecturers | Student: File Submission, "Letters from the office", and the My Records Letters tab. Lecturers: the student's header in Files. |

**Design rules:** no new menu items, one main button per screen, and status chips only when someone must act.

## A2. How It Works

**When a letter is made**
- **The trigger** is a new active Supervisor or Panel appointment, which the teammate's code creates on the coordinator's final approval. Replacement approvals count too.
- **Timing.** The letter is made only after the approval is saved for good, so a cancelled approval never produces a letter.
- **Template.** The active template whose "Used for" matches is used. Only one template per automatic kind can be Active.
- **Approval is never blocked.** If the letter fails, the approval stands. The office gets a notice, and the banner (screen 3) offers to try again.

**What the letter says**
- **Built-in fields** work as now: student name, matric number, programme, reference number and date.
- **New appointment fields:**
  - `{{RESEARCH_TITLE}}` and `{{RESEARCH_AREA}}`;
  - `{{SUPERVISOR_NAME}}` and `{{SUPERVISOR_DEPARTMENT}}`;
  - `{{PANEL_NAME}}` and `{{PANEL_DEPARTMENT}}`;
  - `{{SUPERVISOR_ACCEPTED_DATE}}` (for a panel letter, `{{PANEL_ACCEPTED_DATE}}`);
  - `{{COORDINATOR_NAME}}` and `{{APPROVED_DATE}}`;
  - `{{APPOINTMENT_DATE}}` and `{{SEMESTER}}`;
  - `{{COURSE_CODES}}`: the research project course codes, for example "WQF7023", from the approved supervisor application (Wey Cheng's `project_course_codes`). A panel letter takes them from the student's active supervisor appointment.

  These match the FSKTM form "Form of Appointment of Supervisor and Confirmation of Title for Research Project" (TD(IT):FSK29). They also cover the interview note: the accepted date, and approval by both the supervisor and the coordinator.
- **Template rules.** Appointment fields are allowed only in appointment templates. The template check rejects them in student-request templates.
- **Office-filled fields.** An appointment template may have them, for example `{{ATTENDANCE}}`. The letter then waits in Requests as "Prepared automatically, fill in: Attendance", and the office fills it in and issues it on the usual review page.
- **Signatory.** Each template gets an optional "Signed by" name and title. The PDF prints them, falling back to today's default.

**Issuing and delivery**
- **Same machinery as letters today:**
  - the reference number comes from the existing counter;
  - the PDF comes from the existing locked PDF export;
  - the letter keeps a frozen copy of its wording and values.
- **Notices:**
  - an in-app notice to each recipient, which opens the letter page;
  - an email when the person has email notifications switched on (the same rule as other notices);
  - the email links to the portal and does not attach the letter.

**Changes after issue**
- **Replacements.** A replacement appointment gets its own new letter. The old letter stays valid for its period, and its page says "This appointment ended on 3 Nov 2026 (replaced)".
- **Endings.** Ending an appointment never revokes its letter automatically.
- **Reissue** (UC22's manual regeneration):
  - the office presses "Reissue with current details", for example after an approved title change;
  - a new letter is issued with a new reference number;
  - the old one is revoked with the reason "Replaced by <new ref>";
  - recipients are notified.
- **Duplicates.** Each appointment has at most one letter that is not revoked, guarded in the database, so a retry cannot create two.

**Who can open an appointment letter**
- the student it is about;
- its recipients (the supervisor and the panel member);
- the office.

Coordinators do not get a new view. Everyone else gets "not found".

## A3. Technical Design

- **Model changes** (`letters` app, one migration):
  - `LetterTemplate.purpose`: `REQUEST`, `SUPERVISOR_APPOINTMENT` or `PANEL_APPOINTMENT`. A partial unique constraint allows one Active template per automatic purpose.
  - `LetterTemplate.signatory_name` and `signatory_title`.
  - `GeneratedLetter.purpose`, `supervisor_appointment` and `panel_appointment`. Both appointment links are SET_NULL foreign keys; at most one is set.
  - `GeneratedLetter.recipients`: a many-to-many link to users.
  - `GeneratedLetter.replaced_by`.
  - A partial unique constraint: one non-revoked letter per appointment.
- **The hook** (`letters/signals.py`, registered in `LettersConfig.ready()`):
  - `post_save` receivers on `SupervisorAppointment` and `PanelAppointment` act only when `created` is true;
  - they schedule the work with `transaction.on_commit`;
  - the work, in `letters/appointment_letters.py`, reads appointment, application, recommendation and profile fields read-only and never imports private helpers.
- **Tests and seeding.**
  - In Django `TestCase`, on-commit work does not run unless captured, so most of the teammate's tests are untouched. Our tests capture it on purpose.
  - His concurrency tests (`TransactionTestCase`) and `seed_users` do run on-commit work. They have no appointment template, so the work only records a missing letter. It must never raise an error or send an email.
- **API:**
  - template endpoints accept `purpose`, `signatoryName` and `signatoryTitle`;
  - `GET /api/letters/appointment-letters/missing/` (office): approved appointments with no letter;
  - `POST /api/letters/appointment-letters/create/` (office): creates them, all or a chosen list;
  - `POST /api/letters/requests/<id>/reissue/` (office);
  - letter detail and PDF also allow recipients.
- **Frontend:**
  - `LetterTemplateManagement.tsx`: the Used for choice, the signatory fields and the placeholder list by purpose;
  - `IssuedLetters.tsx`: the Made by filter and Reissue;
  - a missing-letters banner component;
  - the letter page at `/files/letters/:id`, reusing `LetterView`;
  - notification links in `constants/routes.ts`.
- **Placeholders.** `letters/placeholders.py` and the frontend `LETTER_PLACEHOLDERS` stay mirrored, and the existing test checks this.

## A4. Phases

| Phase | What | Status | Commit |
|---|---|---|---|
| L1 | Backend: purpose and signatory, appointment placeholders, the hook, letter creation, recipients and access, missing letters, reissue | Done | `df853d9` |
| L2 | Office screens: the Used for choice, signatory, placeholders, the Made by filter, Reissue, the missing-letters banner | Done | `54a6e97` |
| L3 | Recipient side: the letter page in Files, notices and email, the student's places, docs and wrap-up | Done | `1040211` |

**Part A is complete (2026-10-15).**

**Tests:**
- **L1:**
  - a letter only after commit, and none after a rollback;
  - a replacement appointment's letter;
  - only one letter after two quick retries;
  - a missing template: an office notice, no letter, then the letter later;
  - office-filled fields send the letter to Requests;
  - reissue;
  - access for the student, each recipient, another lecturer (not found) and the office;
  - placeholder checks per purpose.
- **L2:** screen helper scripts, then a browser run as the office at 360, 390, 768 and 1440 px.
- **L3:** the full walk in a browser. A smoke student applies, a smoke supervisor accepts, a smoke coordinator approves, and all three open the letter from their notices. Run on private servers with smoke accounts, and clean up afterwards.

---

# Part B. Staff And Lecturer Accounts (UC03)

## B1. What It Looks Like

It all lives in Registry > **Staff & Lecturers**, which replaces the mock.

| # | Screen | What it shows |
|---|---|---|
| 1 | List | One search box; a Role filter (Office staff, Lecturer, Programme coordinator); and a Status filter (Active, Not activated yet, Sign-in off). Columns: Name and email, Role with duties under it ("Lecturer · Supervisor, Panel"), Status (a chip only when not Active), and Last signed in. Main button: **Add account**. |
| 2 | Add account | Pick the role from three cards, then: Full name, Email, Staff ID, Phone (optional) and Department. Lecturers add a title and duties (Supervisor, Panel member). Coordinators add a programme. A tick, on by default: "Send the activation email now". Main button: **Create account**. |
| 3 | Account page | Details with an Edit button, and an **Access** box with the status and one fitting action: "Resend activation email" or "Send password reset link". The ⋯ menu holds "Turn off sign-in" (or "Turn sign-in back on") and "Delete" (only if unused). Lecturers also get a **Duties** box (ticks), a read-only **Capacity** line linking to Lecturer capacity, and a link to Participant lifecycle. Last, a **History** list. |

No summary cards. The mock's cards and fake numbers go.

## B2. Rules

**Creating an account**
- **Who.** Only the office (role Office Staff/Admin) can create or change accounts. The backend refuses everyone else.
- **Unique details.** Email is unique (letter case ignored). The Staff ID is unique across office staff and lecturers together.
- **Duplicates.** If the email or Staff ID is already used, the form says so and links to the existing account (UC03 exception 3).
- **Activation.** No temporary password is ever made (D1). The account gets the same activation link as imported students, with no time limit (D7), and the email text from `accounts/account_emails.py`.
- **Send later.** If the tick is off, the account shows "Not activated yet" with "Send activation email".
- **Email failures.** If the email fails, the page says so and offers "Try again" or "Copy the link" (UC03 exception 4).
- **Technical Administrator accounts** never appear here and cannot be made here.

**Changing an account**
- **Role cannot be changed** after creation, because appointments, approvals and marks depend on it. A mistake on an unused account is fixed by deleting it and adding it again. Anything else needs a new account.
- **Details** (name, phone, department, title, Staff ID) can be edited; each change is logged.
- **Email** can be changed. Because email is the sign-in name, a notice goes to the old address.
- **Adding a duty** is allowed. The account page then warns: "Not in the capacity plan for Semester X yet. Students cannot pick this lecturer until the office adds a limit in Lecturer capacity." This uses the teammate's capacity data read-only.
- **Removing a duty** is refused while the lecturer has related active work: active supervisees or pending supervisor requests for Supervisor, and active panel appointments or pending nominations for Panel.
- **Coordinator programme.**
  - It can be changed.
  - A confirmation lists the pending approvals that will move to the new programme's coordinator.
  - If another active coordinator already manages that programme, the change is refused.

**Sign-in and deleting**
- **Turn off sign-in.** All sessions end at once. It is refused for:
  - your own account (UC03 exception 1);
  - the last active office account;
  - a lecturer or coordinator who still has active work. The list comes from the teammate's `lecturer_blockers`, read-only, and the message points to Participant lifecycle, where retiring is handled.
- **Turn sign-in back on** restores access. Sessions do not come back, so the person signs in again.
- **Delete** works only for an account that has never signed in and is linked to nothing. Otherwise the button explains why, and offers "Turn off sign-in" instead. The history keeps a line with the name and email.

**Office-assisted password reset** (UC02, alternative flow)
- "Send password reset link" emails the normal 30-minute reset link to an activated account.
- The office never sees or sets a password.

**History**
- Each change is kept with who made it, when and what changed:
  - created;
  - details edited (field by field);
  - duties changed;
  - programme changed;
  - sign-in off or on;
  - link sent;
  - deleted.
- History cannot be edited or deleted.

**Multiple roles (FR-06) and "configure permissions"**
- Permissions come from the role plus the lecturer's duties.
- There is no separate permission editor; the pending-work register says one is not needed.
- This difference from UC03 goes in the report as design decision **D9**.

## B3. Technical Design

- **Model:** `accounts.AccountChange`, immutable (account foreign key SET_NULL, plus account name and email as text, actor, action, details JSON and time). One migration, `accounts.0014`.
- **Service** (`accounts/staff_accounts.py`): create, edit, duties, programme, sign-in off and on, delete, send link and history. Each one is atomic, locks rows, and checks the rules above.
- **API** (`/api/registry/staff/`, office only):
  - `GET /` (search, role, status and page) and `POST /`;
  - `GET` and `PATCH /<id>/`;
  - `POST /<id>/duties/` and `POST /<id>/programme/`;
  - `POST /<id>/sign-in/` with `{ on: bool, reason }`;
  - `POST /<id>/send-link/` (activation or reset, whichever fits);
  - `DELETE /<id>/`;
  - `GET /<id>/history/`.
- **Reused read-only from the teammate's code:**
  - `lecturer_blockers()`;
  - the capacity resolver, for the capacity line;
  - the programme list in `accounts/programmes.py`.
- **Frontend:**
  - `StaffLecturersRegistry.tsx` is rewritten on live data, keeping its exported names for `StudentRegistry.tsx`;
  - new `types/staffAccount.ts` and `services/staffAccountsApi.ts`;
  - the mock `getStaff` and `MOCK_DEPARTMENTS` are removed;
  - routes are `/registry/staff`, `/registry/staff/new` and `/registry/staff/:id`;
  - the account page uses `RecordPage`;
  - every dropdown uses `SelectMenu`.

## B4. Phases

| Phase | What | Status | Commit |
|---|---|---|---|
| S1 | Backend: list, create, details, edit, email change, links, history | Done | `8efcbec` |
| S2 | Backend: duties, coordinator programme, sign-in off and on, delete, all the blocking rules | Done | `2eeb89a` |
| S3 | Screens: list, Add account, account page; remove mocks; docs (D9) and wrap-up | Done | `d97177f` |

**Part B is complete (2026-10-15).**

**Tests:**
- **S1:**
  - each role is created with the right profile rows;
  - duplicate email and Staff ID, including across tables;
  - the activation email is sent once;
  - send later;
  - a failed email;
  - the reset link only after activation;
  - only the office gets in;
  - history rows are written.
- **S2:**
  - each blocker for sign-in off and for duty removal;
  - your own account;
  - the last office account;
  - sessions end;
  - delete is refused once the account has any linked record;
  - programme clash;
  - two quick conflicting changes.
- **S3:** a browser run as the office at 4 widths, plus a run as a coordinator and a lecturer to confirm they cannot reach the tab or the API.

---

# Part C. FAQ Chatbot And Knowledge Base (UC28, UC29)

## C1. What It Looks Like

**Student: "FAQ Chatbot"** (the menu name is kept)

| State | What the student sees |
|---|---|
| Start | "Hi! I answer questions using the PG Office FAQ. I can't see your personal records." Topic chips for the six FAQ sections, and four common questions. |
| Clear match | The official answer, with working links. A source line: "From the PG Office FAQ · Course registration". An optional button set by the office, such as **Open Supervisor Appointments**. Up to three "Related questions" chips. "Did this help? Yes · No". |
| Unsure | "I found a few questions that might match. Which one did you mean?" Three choices; picking one shows its answer. |
| From a document | "From *Postgraduate Handbook 2026*, page 12", a short passage, and **Open document**. Labelled as an extract, not a reviewed answer. |
| No match | "I couldn't find this in the FAQ." Then the office's contact text (email, counter, hours). The question is saved, without a name, for the office to look at. |
| After "No" | "Sorry about that." The contact text, and the question goes to the office's list. |

On phones it is the same, stacked. Errors show Retry, and too many questions in a minute shows "Please wait a moment".

**Office: "FAQ Knowledge Base"** (it replaces the Academic FAQ Editor mock)

| Tab | What it does |
|---|---|
| Entries | Search, a Category filter and a Status filter (Published, Draft, Needs checking, Archived). Columns: Question, Category, Status (a chip only when not Published) and Updated. Main button: **Add entry**. |
| Entry page | Question, "Other ways students ask" (chips), Answer (bold, links and bullets, as in letters), Category, and an optional portal button. Main button: **Publish**, or **Save draft**. The ⋯ menu holds Archive and Delete. Imported rows that need checking show the original PDF text beside the fields, and a **Mark as checked** button. A side box, **Try it**, shows what the chatbot would answer and whether the match is Strong, Possible or None. |
| Student questions | Questions with no answer, or marked "No", grouped when similar, with how often they were asked. Actions: **Add as another way to ask** (pick an entry), **Create entry**, **Dismiss**. Four small numbers on top: questions this month, % answered, % helpful, and waiting to look at. |
| Documents | Upload PDF or Word reference documents. Each shows "Ready, 42 passages" or "No text found (scanned PDF?)". The ⋯ menu holds Archive and Replace. |
| Settings (small) | The contact text shown on no match, and the four common questions on the start screen. |

## C2. How It Works

**Finding the answer** (all on our own server, free, and works offline after setup)
1. **The question** is cleaned up (spacing, length up to 300 characters).
2. **Meaning search.** A small multilingual model (`paraphrase-multilingual-MiniLM-L12-v2` through `fastembed`, about 220 MB, CPU only) turns the question into numbers that capture its meaning. It is compared with every published entry's question and other ways of asking.
3. **Word search.** A keyword search (BM25) catches exact words the model may miss, such as "PTPTN", "MUET" or "WQF7023".
4. **Combining.** The two rankings are combined with reciprocal rank fusion, the standard way to merge rankings of different kinds.
5. **Deciding** with the top entry's meaning score:
   - Strong: show the answer;
   - Possible: offer the top three;
   - below that: try documents, then No match.

   The two cut-off points are set from measured results in Phase C6, not guessed.
6. **Documents** are searched only when no entry is Strong, and they have their own cut-off.

**Why no AI-written answers by default**
- Every answer is text the office reviewed, so the chatbot cannot invent rules.
- This is the reply to a panel asking "how do you know it isn't making things up?"
- An optional Phase C7 can add an AI model that rewords the matched answer, with a fallback to the plain answer. It is off unless Xiang wants it.

**What gets searched**
- Only Published entries and Ready documents.
- Draft, Needs checking and Archived entries are never shown to students.
- The search index refreshes when an entry, an alternative question or a document changes.

**Keeping data safe**
- Saved questions keep the text, the date, the outcome, the entry shown, the score and the "Did this help?" answer. They keep no name and no student ID.
- A management command deletes questions older than 12 months, as D6 does for other scheduled jobs.
- Typed questions are shown to the office as plain text only.
- Asking is limited to 30 questions a minute per person.

**Who can do what**
- **Ask:** students and coordinators.
- **Manage:** the office only (enforced by the backend).
- **Try it** does not save questions.

**Importing the existing FAQ** (`docs/faq/faq-entries.json`, 163 rows)
- The 93 rows from the six category sheets are imported first:
  - the 56 clean rows become Published;
  - the 37 flagged rows become **Needs checking**, with the PDF's own text kept beside them.
- The 70 "ALL" rows:
  - 46 repeat a categorised question (6 of them damaged); they are skipped, but where their wording differs it is added as another way to ask;
  - the 24 rows found only there (5 of them damaged) are imported as Needs checking, in the closest category.
- So students start with **56 answers**. The other **61** go live as the office checks them.
- The category spelling slips are fixed: "APPLCATION" and "RP- DISSERTATION".
- **A review list** (one spreadsheet: question, current answer, PDF text, a column for the office's correction) goes to the office at the start of the whole plan, so their answers are ready by Phase C4.
- The import can run again without making duplicates.

## C3. Technical Design

- **New app `backend/faq/`. Models:**
  - `FaqCategory`;
  - `FaqEntry` (question, answer, category, status, portal link, source reference, checked by and when);
  - `FaqAltQuestion`;
  - `FaqDocument` (private file storage, like documents);
  - `FaqPassage` (document, page and text);
  - `FaqVector` (what it belongs to, model name, a fingerprint of the text, and the vector);
  - `FaqQuestion` (the saved student questions);
  - `FaqSettings` (one row);
  - `FaqChange` (immutable history).
- **Search modules:**
  - `faq/encoder.py` loads the model once per process, lazily, never at import;
  - `faq/search.py` holds BM25, the fusion step and the cut-offs;
  - vectors are stored, so a restart does not re-encode everything;
  - commands `rebuild_faq_index`, `import_faq`, `export_faq_review` and `purge_faq_questions`.
- **Tests never download the model.** They use a small fake encoder with fixed results. One real-model test runs only when `FAQ_REAL_MODEL_TESTS=1`.
- **If `fastembed` cannot be installed or loaded,** the chatbot still answers with word search only (`FAQ_SEARCH=keywords`), and the office screen says so. A demo cannot break because of the model.
- **Documents:**
  - uploads reuse the safe checks in `documents/validation.py` (PDF and Word only, 10 MB);
  - PDF text comes from `pypdfium2`, which is already installed;
  - Word text is read from the file's XML, so no new library is needed;
  - passages are about 150 words long, split on paragraphs, and keep their page number.
- **API** (`/api/faq/`):
  - `POST ask/`, `POST feedback/` and `GET start/` (chips and common questions);
  - office: entries CRUD, categories, `questions/` with its actions, `documents/` upload, list and archive, `settings/`, `try/` and `stats/`.
- **Frontend:**
  - `StudentFAQChatbot.tsx` and `AcademicFAQEditor.tsx` are rebuilt, keeping their names for the lazy-loading test;
  - new `FaqEntryPage.tsx`, `types/faq.ts`, `services/faqApi.ts` and `utils/faqText.ts` (safe links and light formatting, with tests);
  - no mock data and no `VITE_` switches;
  - the chat composer keeps today's footer-safe layout.
- **New dependencies:** `fastembed` (it brings `onnxruntime` and `numpy`).
  - The first run downloads the model once, so this is documented in the backend README.
  - The model cache sits in an ignored folder.
  - It is checked that RAM use stays low on the 7.4 GB laptop.

## C4. Evaluation (For The Report)

- **A test set,** `docs/faq/evaluation-set.json`, of about 120 questions written the way students write them, each labelled with the entry that should answer it:
  - about 80 paraphrases, including short ones, typos and slang;
  - about 20 in Malay or mixed Malay and English;
  - about 20 off-topic questions that must get No match.
- **Measures:**
  - correct first answer (top-1);
  - correct answer in the top three (top-3);
  - wrong answers given;
  - off-topic questions correctly refused;
  - average reply time.
- **Compare three versions** (keyword only, meaning only, and combined) to justify the design. This gives a results table for the Testing chapter.
- **Set the two cut-offs** from a sweep, write the numbers in PROJECT_STATUS, and add a test that fails if accuracy drops below them.
- **Optional:** a short check with 5 students (did it help, how easy was it) for the report.

## C5. Phases

| Phase | What | Status | Commit |
|---|---|---|---|
| C1 | Backend: the faq app, models, import with statuses, the review-list export, entry CRUD, history | Done | `b4ec50e` |
| C2 | Search: install check, encoder, BM25, fusion, ask, feedback, saved questions, rate limit, fallback mode | Done | `62603fe` |
| C3 | Student chat screen, all states, phones | Done | `55d961d` |
| C4 | Office screens: Entries, entry page with Try it, Student questions, Settings; the office's corrections loaded | Done | `c24dacf` (the corrections loader is ready; the office has not sent corrections yet) |
| C5 | Reference documents: upload, text, passages, search, the Documents tab, the chat document answer | Not started | |
| C6 | Evaluation set, measuring, cut-offs, a regression test, docs and wrap-up | Not started | |
| C7 | Optional: AI rewording, off by default | Only if Xiang asks | |

**Tests:**
- **C1:**
  - import counts per status;
  - the import runs twice with no duplicates;
  - Needs checking entries are never searchable;
  - office-only editing;
  - history.
- **C2:**
  - ranking with the fake encoder;
  - keyword rescue for exact terms;
  - each outcome;
  - questions saved without identity;
  - feedback;
  - the rate limit;
  - fallback mode.
- **C3 and C4:** helper scripts, then a browser run at 4 widths.
- **C5:**
  - a scanned PDF gives "No text found";
  - Word extraction;
  - archived documents stop showing.
- **C6:** the evaluation itself.

---

## 2. Verification (Every Phase)

From `backend/`:
```
.venv/Scripts/python.exe manage.py check
.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
.venv/Scripts/python.exe manage.py test accounts academics appointments dashboard marks letters announcements documents faq --parallel 2 --noinput > test.log 2>&1
```
(`faq` joins from C1. The log file avoids the earlier hung run.)

From `frontend/`:
```
npm run lint
npm run build
npm run test:production-security
for f in $(find src -name "*.test.ts" -o -name "*.test.tsx"); do npx tsx "$f" || echo "FAIL $f"; done
```

**Also:**
- **Migrations:** back up the dev database with `pg_dump -Fc` before every migration.
- **Browser checks:**
  - private servers only (backend 8002 with `EMAIL_HOST_PASSWORD=""`, Vite 3002);
  - smoke accounts only;
  - every smoke account, letter, notice, entry and question is removed afterwards;
  - never send real emails, and never touch demo accounts.

**Running a phase:**
1. `git fetch` first, and walk through any teammate changes before merging (on a separate branch).
2. Read every file before changing it.
3. One phase at a time unless Xiang says carry on.
4. Finish properly:
   - tests;
   - section 2;
   - commit on `Xiang`;
   - mark the table;
   - add a dated `PROJECT_STATUS.md` section.
5. Do not push.
6. If a teammate file needs a change, stop and ask.

## 3. Use Case Coverage

| Requirement | Where |
|---|---|
| FR-24, FR-31: letter generated on approval | L1 |
| FR-25, FR-32: delivered to the student and supervisor or panel in the system, with a notice | L1, L3 |
| UC22 manual regeneration; template missing | L1, L2 |
| FR-05: role-based access for every role | S1, S2 (backend checks), S3 |
| FR-06: several roles on one account | S2 (duties), D9 |
| FR-07: credentials emailed on creation | S1 (activation link, D1) |
| FR-08: office creates single accounts | S1, S3 |
| UC03: deactivate, delete, own-account and duplicate exceptions, email failure | S1, S2 |
| UC02: office-assisted reset | S1 |
| FR-57: natural-language questions from students | C2, C3 |
| UC28: follow-up question; no reliable answer goes to the counter | C3 (related questions), C2 |
| FR-58: manage entries and reference documents | C1, C4, C5 |
| UC29: create, edit, publish, archive, delete; only published entries searchable; empty fields | C1, C4 |

## 4. Report Notes (Design Decisions)

- **D9.** One role per account. Lecturer duties give several roles at once (FR-06), with no separate permission editor (UC03).
- **D10.** Used accounts are switched off, not deleted, so history and audits stay (UC03).
- **D11.** Appointment letters use office templates marked "Used for", and are issued on approval without an office step, unless the template needs office-filled values (UC22).
- **D12.** Chatbot answers are always office-reviewed text or a labelled document extract. AI rewording is optional (UC28).
- **D13.** Saved student questions carry no identity and expire after 12 months (UC28, privacy).

## 5. Known Limits

- **Letters** are not verified online (no QR code). A public check page would add an anonymous endpoint, and Wey Cheng's security test pins those to three.
- **Chatbot conversations** are not stored. Refreshing the page starts a new chat.
- **Scanned PDFs** without text cannot be searched; no text recognition (OCR) is done.
- **The chatbot** cannot see a student's own records, and says so.
- **A coordinator who also supervises** still needs two accounts (Wey Cheng's D02).

## 6. Research Notes (2026-10-15)

- **FSKTM form TD(IT):FSK29** "Form of Appointment of Supervisor and Confirmation of Title for Research Project":
  - Section A, the student: name as in MAYA, NRIC or passport, student ID, programme, semester and session, field and title of research;
  - Section B, the supervisor: name, department, field, title;
  - Section C, the PG office: approved by the coordinator, verified by the Deputy Dean (Postgraduate).

  The letter fields in A2 follow it. Source: fsktm.um.edu.my/forms-and-templates.
- **Supervisor appointment letters elsewhere** (Uganda, Hong Kong PolyU, Pakistan DUET templates) all carry: student name and ID, programme, research title, effective date, the supervisor's name, and the appointing office's signature. Some add duties.
- **Account lifecycle.**
  - Okta separates *Staged / Pending activation / Active / Suspended / Deactivated*.
  - Google Workspace advises *suspend first, delete last* so data is kept.
  - Admin tools commonly lock deletion once a user has history, offer "Resend invite" and "Deactivate", and lock the sign-in email.

  B2 follows these with plain names: Not activated yet, Active, Sign-in off.
- **FAQ answering services** (Azure custom question answering) use:
  - a confidence cut-off with a default "no answer" message;
  - alternate phrasings per answer;
  - "active learning", which suggests new phrasings from real questions for an editor to accept;
  - follow-up prompts.

  C1 and C2 mirror these as "Other ways students ask", "Student questions" and "Related questions".
- **Hybrid search.** Combining keyword and meaning search with reciprocal rank fusion is the usual default. Keywords catch exact codes, meaning catches paraphrases. Gains vary, so C6 measures them on our own data.
- **`fastembed` models** run on the CPU through ONNX. `paraphrase-multilingual-MiniLM-L12-v2` is about 0.22 GB with 384 numbers per text; `bge-small-en-v1.5` is English only. Malay support is to be measured in C6.
- **Chatbot practice:**
  - say clearly what the bot can and cannot do;
  - give a way out to a person;
  - ask "Did this help?" with one click, with more only on "No".

  The Georgia State "Pounce" trial is a well-known case: a chatbot answering routine admin questions handled most messages without staff (under 1% needed staff).
- **Free AI tiers** (only relevant to optional C7):
  - Groq: about 30 requests a minute, with day limits;
  - Gemini: daily limits cut in December 2025, and free-tier data may be used for training.

  Both change often, which is another reason C7 stays optional.

## 7. Ground Rules

- **Owned by Xiang:** `backend/letters/`, `backend/faq/`, the registry parts of `backend/accounts/`, and their screens, services and types.
- **Shared files, additive changes only:** `config/settings.py`, `config/urls.py`, `requirements.txt`, `App.tsx`, `constants/routes.ts`.
- **Teammate code, read-only:**
  - the appointment, academic and capacity models;
  - `lecturer_blockers`;
  - the capacity resolver;
  - `accounts/authorization.py`.

  Never import private helpers.
- **Do not touch:**
  - `constants/navigation.ts`, `Sidebar.tsx`, `auth/permissions.ts`;
  - `deploy/nginx/*`, `productionContentSecurity.test.ts`, `routeLazyLoading.test.ts`;
  - `appointments/*`.
- **Writing:**
  - plain language;
  - no long dashes;
  - Malaysia time;
  - no mention of AI tools and no co-author lines in commits.
