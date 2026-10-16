# Project Status

## Remaining-Modules Plan: Full Check (2026-10-16)

A full check of everything the plan built (UC22 appointment letters, UC03 staff accounts, UC28/29 FAQ chatbot): the backend rules, every button in the browser, and the layout at 1440, 1024, 768 and 390 px. It ran on private servers (email printed to the console, never sent) with throwaway smoke accounts, all removed afterwards. The dev database is back to its real data: 117 FAQ entries, no saved questions, no documents, no smoke accounts.

- **Backend:** 1432 tests, all pass apart from Wey Cheng's known appointments migration test (`project_course_codes`). The real-model FAQ checks ran too (`FAQ_REAL_MODEL_TESTS=1`).
- **Frontend:** type check, 148 of 148 script tests, the build and the production security checks pass.
- **Buttons, in the browser:**

  | Module | Earlier runs, again | Buttons those runs did not press |
  |---|---|---|
  | UC22 letters | L2 33/33, L3 16/16 | 20/20: panel template with tags, bold and Check Placeholders; a second active panel template refused; register filters, Reset, View, Close; the student's View, Print and PDF; File Submission View and Download |
  | UC03 staff | S3 49/49 | 62/62: list pages, search, Role and Status filters, the registry tabs; office and coordinator accounts with send later; activation end to end (email, set password, sign in with Staff ID); an email change stopping the old link; reset link; telling the old address; sign-in off for real (signed out, can't sign in, back on); Turn off sign-in instead; No programme; Keep it and Delete; Open their account |
  | UC28/29 FAQ | C3 29/29, phone, C4 36/36, C5 14/14 | 47/47 knowledge base and chat: list pages, Show them, filters; an entry from Add to Delete (other ways of asking, Preview, Save draft, Publish, Save changes, Try it, Archive, Restore, leaving with changes); Mark as checked alone; Add as another way to ask with search and Cancel; Dismiss; common, related and portal buttons in the chat. 12/12 documents: a wrong file type refused, Download, Replace the file, Restore, Rename Cancel, a restored document quoted again |

  Every failure along the way was the check script itself (waiting too briefly, or a test word no entry contains), confirmed by hand each time.
- **Layout:** 24 pages, each at the four widths: no sideways page scroll, nothing past the screen edge, no buttons on top of each other.
- **Fixed:** on a phone, the Staff & Lecturers list and the FAQ entries list squeezed their first column to a few letters a line. Both tables now keep a minimum width and scroll sideways inside their box, like the app's other lists.
- **Seen, not changed (shared code, not from this plan):**
  - record pages move focus to the heading for screen readers, so Chrome draws a box around it when a page is opened by its link;
  - at 1024 px the footer's "Support Desk" link wraps to a second line.

## FAQ Chatbot, Phase C6: Evaluation; UC28 And UC29 Complete (2026-10-16)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part C. Commit `8eb2fed`. **This completes UC28 and UC29, and with them the whole remaining-modules plan (UC22, UC03, UC28, UC29).** Optional C7 (AI rewording) was not asked for and is not built.

- **The evaluation set** (`docs/faq/evaluation-set.json`): 122 questions written the way students write them, each labelled with the published entries that answer it:
  - 82 in English: 62 paraphrases, 9 short, 5 slang, 4 with typos and 2 exact terms;
  - 20 in Malay or mixed Malay and English;
  - 20 off-topic, which must get no answer.

  Where two entries answer the same thing (for example "Fees" and "How much is the total fee?"), either counts.
- **`python manage.py evaluate_faq`** runs the set through three versions of the search and reports:
  - top-1 and top-3;
  - answered right;
  - helped (answered right, or the right entry among the choices);
  - wrong answers;
  - off-topic refused;
  - time per question.

  It sweeps the two cut-offs. The results are kept in `docs/faq/evaluation-results.json`.
- **How the cut-offs were chosen:** answer as many questions right as possible, with at most 2 wrong answers (2%) and at least 90% of off-topic questions refused. A wrong answer misleads a student; a set of choices still helps.

**Results for the report (Testing chapter), 2026-10-16, on the 56 published entries:**

| Version | Cut-offs (strong / possible) | Top-1 | Top-3 | Answered right | Helped | Wrong answers | Off-topic refused | Time per question |
|---|---|---|---|---|---|---|---|---|
| Keywords only (BM25) | 0.61 / 0.22 | 65.7% | 75.5% | 39.2% | 67.6% | 2 | 90% | 3 ms |
| Meaning only (MiniLM) | 0.70 / 0.43 | 85.3% | 93.1% | 52.9% | 87.3% | 2 | 90% | 11 ms |
| **Combined (fusion), in use** | **0.69 / 0.42** | **91.2%** | **94.1%** | **64.7%** | **89.2%** | **2** | **90%** | **12 ms** |

- **Combined is best on every measure** at the same budget of wrong answers. This justifies the hybrid design (design decision D12 and the C2 notes).
- **By kind of question** (combined):

  | Kind | Answered right | Helped |
  |---|---|---|
  | Paraphrases | 72.6% | 95.2% |
  | Malay | 50% | 80% |
  | Short | 55.6% | 88.9% |
  | Slang | 60% | 80% |
  | Typos | 25% | 50% |
  | Exact terms | 100% | 100% |
- **Trade-off, for the report:** looser cut-offs (0.62 / 0.36) would answer 78.4% right and help 92.2%, but give 4 wrong answers and refuse only 80% of off-topic questions. The stricter pair was chosen.
- **Tried and dropped:** offering choices whenever the top two entries are nearly level. Margins of 0.02 to 0.08 made no difference, because the wrong answers' runners-up were never that close.
- **Keyword fallback** gets its own cut-offs (`FAQ_KEYWORD_STRONG_MATCH` 0.61, `FAQ_KEYWORD_POSSIBLE_MATCH` 0.22), since it scores on another scale. Borrowing the combined pair would have helped only 58% instead of 68%.
- **Regression tests** (`faq.test_evaluation`):
  - the set itself is sound: 122 questions, 20 Malay, 20 off-topic, every reference is a real FAQ row, no repeats;
  - the decision and the rule;
  - keyword search alone on the imported FAQ must keep top-3 at least 72%, helped at least 64%, at most 2 wrong answers and 90% of off-topic refused. This runs every time;
  - with `FAQ_REAL_MODEL_TESTS=1`, combined must keep top-1 at least 88%, top-3 at least 92%, answered right at least 60%, helped at least 86%, at most 2 wrong answers and 90% of off-topic refused (it passes).
- **Known limits found** (for the report):
  - **Typos:** a word like "aply" matches neither the keywords nor the model well.
  - **Malay:** half of the questions are answered outright, but 80% helped once choices are counted.
  - **Similar entries:** the two remaining wrong answers go to near entries ("when is course registration" gets the timetable entry; "berapa yuran permohonan" gets the total fee entry).
  - **What improves these:** the office adding other ways of asking from the Student questions tab, and its corrections to the 61 entries that still need checking.
  - **The document cut-off** (0.6) can't be measured until the office uploads its real handbook.
- **Optional student check** (5 students: did it help, was it easy) is left for Xiang to run for the report.

**Verification:**
- Backend: all pass apart from Wey Cheng's known test. The real-model checks also pass with `FAQ_REAL_MODEL_TESTS=1`.
- `check` and `makemigrations --check` are clean. No frontend change in this phase.

## FAQ Chatbot, Phase C5: Reference Documents (2026-10-16)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part C. Commit `0222ea7`.

- **New models** (migration `faq.0003`):
  - `FaqDocument`, the uploaded handbook or guide, kept in private storage;
  - `FaqPassage`, about 150 words with the page it came from;
  - saved questions and the history now also point at documents;
  - five new history actions: uploaded, replaced, renamed, archived, restored.
- **Uploads:**
  - the same safety checks as File Management (`check_upload`), PDF and Word only, 10 MB;
  - PDF text comes from PDFium and Word text from the file's own XML, so there is no new library;
  - passages end at a sentence where possible and never run across a page;
  - a scanned PDF has no text, so it is kept as "No text found" and never searched. No text recognition is done.
- **How documents answer:**
  - passages are searched only when no entry matches;
  - the reply is then "From <title>, page N", the passage, a note that it is "a passage from a document the PG Office uploaded, not a reviewed FAQ answer", **Open document** (a download), and "Did this help?";
  - the cut-off is `FAQ_DOCUMENT_MATCH`, 0.6 for now: the meaning score with the model, or, with keywords alone, at least two words must agree;
  - archived documents and those with no text are never quoted.
- **Who opens a document:** the office always. Students and coordinators only while it is ready and not archived. Lecturers are refused.
- **Office screen:** a new **Documents** tab (`/faq/documents`):
  - upload with an optional title (otherwise taken from the file name);
  - each document shows its file, size, pages, uploader and date, with "Ready, N passages", "No text found (scanned PDF?)" or "Archived";
  - the ⋯ menu holds Download, Rename, Replace the file, and Archive or Restore.
- **Dev database:** backed up first (`..._before_faq_documents_2026-10-16.dump`), then migrated to `faq.0003`.

**Browser check** (private servers, smoke accounts, the real model): 14 of 14 pass.
- **Office:** a text PDF is ready with its passages; a scanned PDF shows "No text found"; a title comes from the file name; renaming works.
- **Student:** asking "What time does the faculty library open on Saturday?" quotes "From Smoke Library Guide, page 1" with the extract label, and Open document downloads the PDF.
- **Archive:** after archiving, the same question no longer quotes it.
- **Layout:** the tab fits at 1440, 1024, 768 and 390 pixels. No console errors.
- **Afterwards:** the smoke documents, their files, questions, history and accounts were removed.
- **Small fixes from the screenshots:** small files now show in KB instead of "0 MB", and "1 page" is singular.

**Verification:**
- Backend: 1,426 pass, 1 skipped (the real model) and 1 fails, Wey Cheng's known test. The 13 new tests cover a text PDF (passages and pages), a scanned PDF, Word text, refusing other types and broken files, rename, replace (the old file deleted), archive and restore, office-only management, a passage answering with no entry, a clear entry winning, archived and unreadable documents never searched, a weak passage refused, keyword mode needing two words, who may open a file, and passages never crossing a page.
- Frontend: all 148 test scripts pass. `faqOffice.test.ts` now also checks the document wording and that every new history action has words; that guard caught five missing ones, which were added. TypeScript, the build and both production security checks pass.

## FAQ Chatbot, Phase C4: The Office's Knowledge Base Screens (2026-10-16)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part C. Commit `c24dacf`. The office's FAQ page ("FAQ Knowledge Base") replaces the Academic FAQ Editor mock. Its tabs are their own addresses: `/faq`, `/faq/questions`, `/faq/settings`, and entries at `/faq/entries/<id>` and `/faq/entries/new`.

- **Entries:**
  - a banner says how many imported entries need checking and how many are live, with **Show them** and **Download the review list**;
  - search, plus Category and Status dropdowns (with counts);
  - columns for Question (with its problem note, or how many other ways of asking and its portal button), Category, Status (a chip only when not Published) and Updated;
  - a notice appears if the server is on keyword search only.
- **Entry page:**
  - question, other ways students ask (chips), answer with a Preview, category, and portal button;
  - for an imported entry that needs checking, the PDF's text and its problem sit above the fields, with **Save changes**, **Mark as checked**, and **Mark as checked and publish**;
  - Save draft and Publish for drafts; Save changes once published; Restore when archived. The ⋯ menu holds Archive and Delete;
  - **Try it** shows the match (Strong, Possible or none) and the top entries with their scores, marks "This entry", and says when the entry isn't published yet. Nothing is saved;
  - History.
- **Student questions:**
  - four numbers: questions this month, answered, marked helpful, and to look at;
  - groups of questions with No match or "No", with how often and when they were asked, and what the chatbot did;
  - **Add as another way to ask**: the closest entries are suggested through Try it, with a search for others;
  - **Create entry**: opens a new entry with the question filled in, and settles the group once it is saved;
  - **Dismiss**.
- **Settings:** the contact text, and up to four common questions for the start screen.
- **Backend additions:**
  - `questions/` (`?only=stats` gives just the numbers, for the tab's count) and `questions/review/`;
  - `settings/`;
  - list rows carry their number of other ways of asking and the import note.
- **Grouping by meaning.** The first browser run showed that "where can i park my car at the faculty" and "faculty parking where" did not group, because only identical words did. Groups now also form when questions are close in meaning (0.75 with the model, measured: same-meaning pairs scored 0.80 to 0.89, unrelated about 0.08). Without the model, only the same words group.
- **The office's corrections:** `python manage.py import_faq_corrections <filled review list>` loads the correct answers, and questions where given. Each corrected entry is checked and published (`--draft` to hold them).
  - **Fixed on the way:** the workbook was left open, which locked the file on Windows.
  - **Waiting:** the office has not returned the list yet, so the 61 entries still need checking.

**Browser check** (private servers, smoke accounts, the real model): 36 of 36 pass.
- **Entries:** the banner and the review list download; checking an imported entry with the preview and another way of asking, then publishing it; Try it finding "This entry"; adding and publishing a new entry with a portal button.
- **Student questions:** grouping, adding a group to an entry, creating an entry from a group, and dismissing.
- **Settings and the ⋯ menu:** saving settings; archive and delete.
- **Layout and roles:** all four pages fit at 1440, 1024, 768 and 390 pixels; a coordinator who opens an entry address gets the chatbot instead.
- No console errors.
- Afterwards the smoke entries, questions and accounts were removed, and the settings were restored. Nothing was added to the real entries, and the dev database is back to 56 Published and 61 Needs checking.

**Verification:**
- Backend: 1,413 pass, 1 skipped (the real model) and 1 fails, Wey Cheng's known test. The 13 new office tests cover grouping (by words and by meaning), add, create and dismiss, the numbers, the settings, office-only access, and the corrections loader (publish, draft, blank rows, unknown entry numbers, missing columns, formula text). Tests never load the real model.
- Frontend: all 148 test scripts pass, including the new `utils/faqOffice.test.ts`. It checks that every backend status and history action has words. TypeScript, the build and both production security checks pass.

## FAQ Chatbot, Phase C3: The Chat Screen (2026-10-15)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part C. Commit `55d961d`. The FAQ Chatbot page now answers from the office's FAQ instead of fixed replies.

- **Start:**
  - "Hi! I answer questions using the PG Office FAQ. I can't see your own records...";
  - the six topics as chips. A topic lists its questions;
  - four common questions above the question box until the first question.
- **Replies:**
  - **A clear match:**
    - the office's answer, with "Matched: ..." when the student asked in other words;
    - working links and the optional portal button;
    - the source line ("From the PG Office FAQ · topic");
    - up to three related questions;
    - "Did this help? Yes / No".
  - **A possible match:** "Which one did you mean?" with up to three choices, plus **None of these**.
  - **No match, "No" and "None of these":** the office's contact text, and "Your question has been passed to the office, without your name, so they can add an answer."
  - **Errors** show Try again. Too many questions in a minute shows "Please wait a moment".
- **Who sees it:** students, and now **programme coordinators**, who ask rather than edit (`App.tsx`, one condition). The office keeps the editor screen, which C4 rebuilds.
- **Safe answers** (`utils/faqText.ts`, `FaqText.tsx`):
  - **bold**, bullets and `[text](address)` links, plus web and email addresses written out;
  - only web, email and portal addresses are ever linked; anything else stays text;
  - no raw HTML is rendered;
  - outside links open in a new tab with `noopener noreferrer`.
- **Layout:** the question box stays pinned and lifts above the page footer as before. The conversation is a polite live region for screen readers.
- **Removed:** the fixed keyword replies, the fake typing delay and the "AI Assistant" labels.

**Browser check** (private servers 8002 and 3002, smoke accounts, the real model): 29 of 29 pass.
- **Start and answers:** topics and common questions; a topic's question answered; a typed paraphrase answered with "Matched:"; Yes thanked.
- **Links and No:** a web address answer linking safely; No showing the contact.
- **Choices and no match:** choices, picking one, and None of these; an off-topic question getting No match.
- **Errors:** a failed request retried.
- **Layout:** the footer links stay usable; the chat fits at 1440, 1024, 768 and 390 pixels, also opened straight on a phone.
- **Roles:** a coordinator gets answers.
- No unexpected console errors.
- The run's 9 saved questions and both smoke accounts were removed afterwards.

**Verification:**
- Frontend: all 147 test scripts pass, including the new `utils/faqText.test.ts`. It covers links, script links refused, raw HTML, bullets and "Matched:", the portal buttons matching the backend, and coordinators getting the chatbot. TypeScript, the build and both production security checks pass.
- Backend: no change in this phase.

## FAQ Chatbot, Phase C2: Search And Replies (2026-10-15)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part C. Commit `62603fe`.

- **New dependency:** `fastembed` 0.9 (it brings `onnxruntime` 1.31 and `numpy` 2.5). It is in `requirements.txt` and installed in `backend/.venv`.
  - The model, `paraphrase-multilingual-MiniLM-L12-v2`, downloaded once into `backend/faq_model_cache/` (241 MB). The folder is git-ignored.
- **How an answer is found** (`faq/search.py`):
  - two searches run over every Published entry and its other ways of asking. A keyword search (BM25, with English and Malay stop words and simple plurals) catches exact terms; the meaning model catches paraphrases and Malay;
  - the two rankings are merged with reciprocal rank fusion;
  - the top entry's confidence decides: Strong shows the answer with up to three related questions, Possible offers up to three choices, and anything lower is No match with the office's contact text;
  - the starting cut-offs are 0.72 and 0.5 (`FAQ_STRONG_MATCH`, `FAQ_POSSIBLE_MATCH`). They are set properly from the evaluation in C6.
- **Speed and storage:**
  - the model loads once per process, lazily, never at import;
  - vectors are stored in `FaqVector`, keyed by model and a fingerprint of the text, so nothing is worked out twice;
  - the index rebuilds itself when entries, other ways of asking or category names change.
- **No model, still answers.** If the model can't be loaded, keyword search carries on alone, and `search-status/` tells the office. `FAQ_SEARCH=keywords` forces it.
- **API:**
  - `start/`, `ask/` (also for a picked choice or related question) and `feedback/`, for students and programme coordinators;
  - `try/` (saves nothing, shows the scores) and `search-status/`, for the office;
  - lecturers are refused, as they have no FAQ menu.
- **Saved questions** (`FaqQuestion`) keep the text, outcome, entry shown, score, search mode and "Did this help?", but no name or student ID. "Did this help?" needs the signed token from that answer.
  - `purge_faq_questions` deletes questions after 12 months.
  - At most 30 questions a minute per person.
- **New settings row** (`FaqSettings`): the contact text and the four common questions. The office edits them in C4; until then the start screen suggests one question per topic.
- **Dev database:** migrated to `faq.0002`.
  - **Slip:** the backup was taken just after this migration rather than before (`..._before_faq_search_after_0002_2026-10-15.dump`). The migration only adds three new empty tables, so nothing was at risk.
- **First run on the real FAQ** (Try it, nothing saved):
  - the first answer takes about 4 seconds (loading, and working out the 56 questions once); later ones take 10 to 30 ms;
  - "how to apply?" is a Strong match;
  - "where to buy nasi lemak" gets No match;
  - questions whose only entry still needs checking (PTPTN, weekend classes) correctly find nothing.
- **Docs:** `backend/README.md` covers asking, the search, the model and the commands (`rebuild_faq_index`, `purge_faq_questions`).

**Verification:**
- Backend: 1,400 pass, 1 skipped (the real-model check) and 1 fails, Wey Cheng's known test. The 28 new tests use a small fake encoder and cover:
  - a Malay question finding the English entry, and keywords rescuing an exact term the model misses;
  - choices, no match, and only Published entries ever found;
  - the index following changes, and vectors kept;
  - questions saved without identity, feedback tokens, and picking a choice;
  - who may ask, Try it saving nothing, the rate limit, keyword fallback and a model that won't load;
  - deleting after 12 months.
- With `FAQ_REAL_MODEL_TESTS=1`, the real model finds the English entry for a Malay question (it passes).
- `check` and `makemigrations --check` are clean.

## FAQ Chatbot, Phase C1: The Knowledge Base Backend (2026-10-15)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part C. Commit `b4ec50e`.

- **New app `backend/faq/`** (migration `faq.0001`):
  - `FaqCategory`;
  - `FaqEntry`, with four statuses: Published, Draft, Needs checking and Archived, plus the PDF's own text for imported rows;
  - `FaqAltQuestion`, for other ways students ask;
  - `FaqChange`, the history, which cannot be edited or deleted.

  Only Published entries are ever searchable (`FaqEntry.objects.published()`).
- **API** at `/api/faq/`, for Office Staff/Admin only:
  - entries: list with search, category and status filters and counts per status; create; edit; delete;
  - status actions: publish, mark as checked, archive, restore;
  - categories: list, add, rename;
  - the review list as an Excel download.
- **Answers:** links must start with `https://`, `http://`, `mailto:` or `/`. A script link is refused.
- **Import** (`python manage.py import_faq`, from `docs/faq/faq-entries.json`):
  - **56 Published**: the clean category rows;
  - **61 Needs checking**: 37 damaged category rows, plus the 24 rows found only on the PDF's "ALL" sheet, placed in the category of the row before them;
  - **46 skipped**: "ALL" rows that repeat a categorised question exactly, so none of them added another way of asking;
  - the six categories get plain names, in PDF order. The spelling slips are fixed;
  - running it again adds nothing and never overwrites the office's edits.
- **Review list for the office** (`python manage.py export_faq_review`): one Excel sheet of the 61 entries to check, with the question and answer now, the PDF's text, what looks wrong, and empty columns for the corrections. Text that starts like a formula is made safe.
  - **To send to the office:** `Final Year Project/faq-review-2026-10-15.xlsx` (outside the repository).
- **Dev database:** backed up (`..._before_faq_app_2026-10-15.dump`), migrated to `faq.0001`, and the FAQ imported.
- **Docs:** `backend/README.md` has an FAQ knowledge base section.

**Verification:**
- Backend: 1,373 of 1,374 pass. The one failure is Wey Cheng's known test. The 32 new tests cover:
  - the import counts per status and categories;
  - running twice, and the office's edits kept;
  - Needs checking never searchable, the PDF text kept, and the nearest category for "ALL" rows;
  - the review list, and formula safety;
  - office-only access, safe links, other ways of asking, the status steps, delete with history, and the list filters.
- `check` and `makemigrations --check` are clean. No frontend change.

## Staff Accounts, Phase S3: The Screens; UC03 Complete (2026-10-15)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part B. Commit `d97177f`. **This completes UC03.** Registry > Staff & Lecturers now runs on live data, and the office no longer needs Django admin to make staff accounts.

- **Pages** (office only; anyone else who opens them is sent back to `/registry`):
  - **`/registry/staff`, the list:**
    - search, plus Role and Status dropdowns;
    - columns for name and email, role with duties or programme underneath, status (a chip only when not Active) and last signed in;
    - pages of 25;
    - one main button, **Add account**. There are no summary cards.
  - **`/registry/staff/new`, Add account:**
    - pick one of three role cards first; only that role's fields then appear;
    - lecturers tick their duties, with a reminder about Lecturer capacity;
    - coordinators pick a programme, and programmes that already have a coordinator are greyed out with the coordinator's name;
    - the "Send the activation email now" tick is on by default;
    - a duplicate email or Staff ID names its holder, with an "Open their account" link;
    - leaving a filled form asks first.
  - **`/registry/staff/<id>`, the account page:**
    - Details, with Edit details in a dialog;
    - Duties as ticks. A duty with open work can't be unticked and lists that work;
    - a capacity line read from Lecturer capacity;
    - History;
    - an Access box with one fitting action: send activation email (or copy the link), send password reset link, or turn sign-in back on.

    The ⋯ menu holds "Turn off sign-in" and "Delete account". Each one opens a dialog that explains first when it can't go ahead: the open work for sign-in, or the reasons for delete. The same dialog offers "Turn off sign-in instead". Coordinators get Change programme, which shows what waits in each programme before moving.
- **Created accounts** open on their own page with the activation outcome. If the email failed, the page offers **Try again** and **Copy the link**.
- **The mock is gone.** `getStaff`, `MOCK_STAFF`, `MOCK_DEPARTMENTS` and the `StaffRecord` type are removed. They are replaced by `types/staffAccount.ts`, `services/staffAccountsApi.ts` and `utils/staffAccounts.ts`.
- **Code layout:**
  - `StaffLecturersRegistry.tsx` keeps its exported names.
  - The Students / Staff & Lecturers switcher moved to `RegistryModuleTabs.tsx` and now changes the address.
  - Shared files have additive changes only: `App.tsx` (one lazy route) and `constants/routes.ts`.
- **Fixed on the way: `SelectMenu` inside a dialog.** A modal dialog leaves the rest of the page inert and below it, so a dropdown list opened inside one could not be clicked. The list now opens inside the dialog. This also fixes the programme dropdown in File Management's "Who can see this file?" dialog.
- **Design decisions for the report:**
  - **D9.** One role per account. A lecturer's duties (Supervisor, Panel member) give several roles at once (FR-06), with no separate permission editor (UC03 "configure permissions").
  - **D10.** Used accounts are switched off, not deleted, so history and audits stay. Only an account added by mistake, never signed in and linked to nothing, can be deleted (UC03).

**Browser check** (private servers 8002 and 3002, smoke accounts only): 49 of 49 pass.
- **Accounts:** the list and filters, adding a lecturer with the email sent, editing, adding a duty, copying the link, and deleting the unused account.
- **Refusals:** a duplicate email and Staff ID refused with links; the leave-page warning.
- **Blocked actions:** an unremovable duty, and sign-in off and delete explained for a lecturer with a waiting request.
- **Sign-in and programme:** sign-in off and back on; a coordinator's programme move, with the taken programme greyed out; no risky actions on your own account.
- **Widths:** the list, account page and form fit at 1440, 1024, 768 and 390 pixels.
- **Other roles:** a coordinator and a lecturer are sent back from `/registry/staff`, see no tab, and get 403 from the API.
- No unexpected console errors.
- Emails went to the console only. Smoke data was removed afterwards: the dev database is back to 8 staff accounts, no history rows, and the demo coordinator unchanged.

**Verification:**
- Frontend: all 146 test scripts pass, including the new `utils/staffAccounts.test.ts`. It also checks that every backend work count and history action has words. TypeScript, the build and both production security checks pass.
- Backend: no change in this phase, so the S2 run stands (1,341 of 1,342, with only Wey Cheng's known test failing).

## Staff Accounts, Phase S2: The Rules (2026-10-15)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part B. Commit `2eeb89a`. The backend for staff accounts is complete; the screens come in S3.

- **Duties** (`POST /api/registry/staff/<id>/duties/`):
  - only lecturer accounts have them;
  - a duty is added only while the lecturer is active and can sign in;
  - a duty is removed only when nothing open needs it, and the refusal lists that work:
    - Supervisor: active supervision or co-supervision, and supervisor requests or co-supervisor nominations still waiting;
    - Panel: active panel appointments and nominations still waiting.
- **Capacity line.** The account page reads Lecturer capacity through Wey Cheng's resolver, read-only.
  - A new duty shows "not configured" until the office adds a limit there.
  - A limit left behind for a removed duty is flagged.
- **Coordinator programme** (`programme/`):
  - can move to a programme no other active coordinator manages, or to none;
  - `check` counts the approvals waiting in the old and new programme first: supervisor requests, co-supervisor nominations, panel nominations and amendments.
- **Sign-in off and on** (`sign-in/`). Turning it off:
  - needs a reason and ends every session;
  - is refused for your own account and for the last office account;
  - is refused while `lecturer_blockers` (Wey Cheng's, read-only) shows open work, which is listed, and points to Participant lifecycle.

  Turning it back on is refused for a retired lecturer, and for a coordinator whose programme someone else now manages.
- **Delete.**
  - Only for an account that has never signed in and that no record points to.
  - The check goes through every table linked to the account or its lecturer profile, hidden links included (letters), apart from its own profile, duties, notices and history.
  - Otherwise the reasons come back and the office turns sign-in off instead.
- **The account page** now carries `capacity`, `activeWork` and `deletion`, so S3 can explain each action before it is tried.

**Verification:**
- Backend: 1,341 of 1,342 pass. The one failure is Wey Cheng's known `appointments.test_capacity_reassessment_migration`. The 32 new tests cover each blocker for duties and sign-in off, your own account, the last office account, sessions ending, delete refused for linked records (including a letter and a capacity entry), the programme clash, the approvals check, two quick conflicting changes, and office-only access.
- `check` and `makemigrations --check` are clean.
- No new migration. No frontend change in this phase.

## Staff Accounts, Phase S1: Backend (2026-10-15)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part B. Commit `8efcbec`. The office can now add and look after staff accounts through the API; the screens come in S3.

- **New model:** `accounts.AccountChange` (migration `accounts.0014`), the account history.
  - Each row records who made the change, when, and what changed.
  - Rows cannot be edited or deleted, and they keep the name and email after an account is deleted.
- **API** at `/api/registry/staff/`, for Office Staff/Admin only:
  - list, with search, role, status and pages;
  - add;
  - options (departments in use, and each programme's coordinator);
  - details and edit;
  - send link and copy the activation link;
  - history.
- **Adding an account:**
  - no password is made; the activation link has no time limit, as for imported students;
  - lecturers get their ticked duties (Supervisor, Panel);
  - coordinators get their programme, and a programme that already has a coordinator who can sign in is refused;
  - office accounts also get `is_staff` and the marks permissions, as `seed_users` gives the demo office. Without them the office actions on participant lifecycle, delegations, capacity reassessment and marks refuse the account.
- **Duplicates:** the email (ignoring letter case) and the Staff ID (across office staff and lecturers, and never a student's matric number) are refused, and the refusal names the account that holds them.
- **Editing:**
  - the role, duties and programme are refused here (duties and programme come in S2);
  - an email change tells the old address, but only for an activated account. Old links stop working.
- **Links:**
  - "Send link" sends activation until a password is set, then the 30-minute reset link, and is limited per account;
  - only an activation link can be copied, so the office never gets into an account that has a password.
- **Docs:** `backend/README.md` has a Staff account endpoints section.

**Verification:**
- Backend: 1,309 of 1,310 pass. The one failure is Wey Cheng's known `appointments.test_capacity_reassessment_migration`. The 39 new tests cover each role's profile rows, duplicates across tables, the activation email sent once, send later, a failed email, a race, reset only after activation, office-only access, filters, and history.
- `check` and `makemigrations --check` are clean.
- The dev database was backed up (`..._before_staff_accounts_2026-10-15.dump`) and migrated to `accounts.0014`.
- No frontend change in this phase.

## Appointment Letters, Phase L3: Students And Lecturers; UC22 Complete (2026-10-15)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part A. Commit `1040211`. **This completes UC22.**

- **The letter page.** It lives at `/files/letters/<id>`, in Files, because lecturers have no Letter Generation menu.
  - It shows the reference, the issue date, who the letter was sent to, the A4 letter with its own signatory and the office disclaimer, and **Download PDF**.
  - Back goes to the student's files for staff, and to File Submission for students.
  - Anyone the letter was not sent to sees "This letter isn't available to you."
- **Notices.**
  - `APPOINTMENT_LETTER` notices open the letter page.
  - The office's "appointment letter not made" notices open Issued Letters.
- **Lecturers.** On a student's files, the header lists "Your appointment letters" with links, from `GET /api/letters/appointment-letters/received/`.
- **Students.**
  - File Submission's "Letters from the office" now includes appointment letters, marked "issued".
  - My Requests labels them "Sent automatically".
  - A letter still waiting for the office stays hidden.
- **Docs:** `backend/README.md` has the appointment letter endpoints and rules.

**Browser check** (private servers 8002 and 3002, smoke accounts only): 16 of 16 pass.
- The supervisor opens the letter from the notice, downloads the PDF, reaches it from the student's files, and goes back.
- Another lecturer is refused.
- The student opens it from the notice at phone width and sees it in File Submission.
- A waiting letter stays hidden and cannot be opened.
- No console errors apart from the planned 404s.
- With "Email alerts" on, the supervisor's email (console backend) read "Appointment letter: supervisor for …" and linked to `/files/letters/<id>`.
- Smoke data was removed afterwards.

**Verification:**
- Frontend: all 145 test scripts pass, plus TypeScript, the build and both production security checks.
- Backend: L3 changed no backend code, so the L2 run stands (1,270 of 1,271, with only Wey Cheng's known test failing).

## Appointment Letters, Phase L2: Office Screens (2026-10-15)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part A. Commit `54a6e97`.

**Template editor:**
- **Used For.** Three cards: Student requests, Supervisor appointment letter, Panel appointment letter. Choosing an appointment letter shows a note on who receives it.
- **Signatory.** "Signed by" name and title fields.
- **Placeholders.**
  - Tags are grouped into "Student record" and "Appointment". Appointment tags appear only for the letter kinds that can use them.
  - The placeholder check uses the same rules and hint wording as the server.
- **Library.** It marks templates that are sent automatically.
- **Preview.** It prints the template's own signatory and, for appointment letters, the office disclaimer.

**Issued Letters:**
- **Missing-letters banner.** It appears only when approved appointments have no letter. It shows how many can be made now, why the others cannot, and a "See which appointments" list, with **Create N letters** and **Set up template**.
- **Made by filter.** All, Student requests, or Sent automatically.
- **Letter view.** It says who the letter was sent to. For appointment letters, its footer offers **Reissue with current details** (rather than a menu clipped by the scrolling table).

**Requests:**
- A waiting appointment letter is labelled as made automatically and shows "Goes to".
- It has no Reject and no student note, and is issued with **Issue letter**.
- The preview shows who will sign it.

**Shared:**
- `LetterPages`, the print window and `letterDataFromIssued` use each letter's own closing lines (`letterClosing`).
- Every letter's API row now carries its signatory.

**Browser check** (private servers 8002 and 3002, smoke accounts only): 33 of 33 pass.
- Covered: the editor, the panel and supervisor tag rules, the banner and its button, the Made by filter, the letter view and reissue, and the Requests review and issue.
- Widths: 360, 390, 768 and 1440 px all fit, with no console errors.
- The banner's Create button was answered in the browser, so no letters were made for the dev database's real demo appointments.

**Found and fixed during the check:** the preview of a *waiting* letter showed the default signatory. A waiting letter has no signatory copy until issued, so the review data now carries the template's signatory, and a backend test covers it.

**Smoke data:** removed afterwards, including the "waiting" notices sent to the three real office accounts. The Files smoke cleanup now also removes appointment-letter notices, since its setup creates appointments.

**Verification:**
- Backend: 1,270 of 1,271 tests pass; the one failure is Wey Cheng's known migration test.
- Frontend: all 145 test scripts pass, plus TypeScript, the build and both production security checks.

## Appointment Letters, Phase L1: Backend (2026-10-15)

Plan: `docs/superpowers/plans/2026-10-15-remaining-modules.md`, Part A (UC22).

**Before building:**
- Wey Cheng's PR #19 (`ee8b3fb`) was fast-forwarded into `Xiang` after a walkthrough.
- The dev database was backed up and migrated to `appointments.0016` (course codes).
- One test fails on `main` itself and belongs to his file: `appointments.test_capacity_reassessment_migration` compares rows after migrating to the latest migration, and his new `project_course_codes` column adds a key. Xiang passes it on.

**What L1 adds (backend only):**
- **Template purpose.**
  - A template is used for *Student requests*, a *Supervisor appointment letter* or a *Panel appointment letter* (`LetterTemplate.purpose`).
  - Only one Active template per appointment letter kind; a database constraint covers races.
  - Students never see or request appointment templates.
  - A template's purpose cannot change while its letters wait for a decision.
- **Signatory.** Templates have an optional "Signed by" name and title. Each letter keeps its own copy, and the PDF prints it.
- **Appointment placeholders.** Twelve new tags, for example `{{RESEARCH_TITLE}}`, `{{COURSE_CODES}}` (from Wey Cheng's new field), `{{PANEL_NAME}}`, `{{COORDINATOR_NAME}}` and `{{SEMESTER}}`. Each works only in the letter kinds it fits, and the template check says which.
- **The hook.**
  - `letters/signals.py` hears a new active Supervisor or Panel appointment and makes the letter once the approval is saved (`transaction.on_commit`, robust).
  - No teammate file was changed.
  - A failed letter never undoes an approval.
- **Making the letter** (`letters/appointment_letters.py`):
  - Issued at once from the active template.
  - Recipients: the student and the supervisor; for panel letters, the panel member too, with the current primary supervisor in copy.
  - Each person gets an in-app notice and, when email alerts are on, an email linking to `/files/letters/<id>`.
  - If a value is blank or the template has office-filled fields, the letter waits in Requests for the office instead.
  - At most one live letter per appointment, guarded by the database.
- **When there is no usable template** (or the panel profile has no student), the office gets one notice per appointment. `GET /api/letters/appointment-letters/missing/` lists active appointments without letters, and `POST .../create/` makes them (chosen ones, or `all`).
- **Reissue.** `POST /api/letters/requests/<id>/reissue/` issues the letter again with current details, such as an amended research title. The old letter is revoked as "Replaced by <ref>." and everyone is told.
- **Access.**
  - Lecturers on a letter can open it and its PDF; `GET .../appointment-letters/received/` lists theirs.
  - Students see appointment letters only once issued, and cannot withdraw them.
  - The office's letter list filters by `madeBy=request|automatic`.
  - Rejecting a waiting appointment letter tells no student.
  - Revoking and resending reach everyone on the letter.
- **Migration:** `letters.0005` (dev DB backed up first, then migrated). The frontend placeholder and disclaimer mirrors (`letterDocument.ts`) and their tests were updated.

- **Migration dependency.** `letters.0005` depends on `appointments.0004`, where `SupervisorAppointment` was created, not on the newest appointments migration. Wey Cheng's migration tests roll appointments back to 0012 or 0014 while keeping every other app at its latest. A dependency on 0016 broke `test_amendment_migration`; 0004 keeps his tests as they were.

**Commit:** `df853d9`.

**Verification:**
- **Backend:** 1,269 of 1,270 tests pass, including 28 new ones in `letters/test_appointment_letters.py`.
  - One test goes through the real approval endpoints: apply, accept, approve, then panel recommend, accept, approve.
  - The one failure is the known teammate test above, which fails the same way on `main`.
- **Checks:** Django checks and the migration-drift check are clean. The dev DB is consistent (`migrate --check`).
- **Frontend:** all 144 test scripts pass, plus TypeScript, the production build and both production security guards.
- **Not yet:** a browser check, because L1 has no screens. That comes in L2 and L3.

## Current-change snapshot prepared for branch push (2026-10-15)

At the user's request, packaged all current tracked/untracked project changes on `codex/portal-consistency-and-toast` for commit and push; the user will create the PR. Included existing Supervisor/shared-decision/programme-access/workspace work, tests, handoffs and the proposed Panel design. Private environment/credential files and database backups remain excluded; staged filename/content checks found no recognised credential patterns. Removed whitespace only in two staged files. Requirements and architecture were checked and retain the current implemented/proposed boundaries. No new Panel redesign implementation.

Fresh pre-push validation: all 144 frontend scripts pass (161 reported test checks), TypeScript and production build pass, and staged whitespace checks pass. Broader appointments/dashboard regression run: 395 tests, 394 pass and one fails in `CapacityReassessmentMigrationTests.test_additive_schema_preserves_appointments_marks_and_completion_history`. It compares complete pre-0015 rows with latest-schema rows; SupervisorApplication now adds project_course_codes with an empty default in migration 0016, causing an extra dictionary key. The test failure is retained as a known PR issue; no test was removed, skipped or weakened. Backend run used the isolated test database with a process-only fast password hasher. No live academic decisions were made; safety stash remains available. Panel-plan critique/explanation follows in chat, with implementation still proposed.

## Latest main integrated; servers restarted; Panel design proposed (2026-10-15)

Fast-forwarded existing `codex/portal-consistency-and-toast` to latest main `f54bf72` (38 commits). Restored all 94 tracked local edits and 87 untracked files; only App/routes needed automatic code integration and PROJECT_STATUS had a content conflict resolved by retaining both histories. Verified other original edited files and all untracked contents against safety stash `eaf6ff783ae91a5c280908c74c8eb1f543188395`, which remains available. No application commit or push.

Installed the updated backend's declared PDF/image dependencies after startup checks identified missing reportlab. Backed up local fsktm_pg_office to `C:/Users/User/AppData/Local/Temp/fkstm-before-main-f54bf72-2026-10-15.dump` (513765 bytes) before applying documents.0001-0004 and letters.0004. Both development servers restarted with hidden windows. Portal localhost:3001 returns HTTP 200; direct API /api/auth/me/ and proxied /api/appointments/panel/ return expected JSON HTTP 401 without authentication. Django checks, migration-applied check, migration dry-run (no model changes), pip check, TypeScript, production build and nine focused existing frontend regression scripts pass. These are integration/runtime checks; no redesign browser verification or full backend test-suite claim.

Read the Panel/Supervisor handoffs and inspected current staff route/renderer/API contracts. Prepared `docs/superpowers/specs/2026-10-15-panel-appointments-consistency-design.md` with the proposed role navigation, Office attention categories, shared detail wireframe, component/API boundaries and verification criteria. Current Office no-panel rows omit profiles with any historical workflow, so they cannot establish the new current-attention category. Requirements/architecture updated to identify this request and proposal. Staff Panel redesign remains pending design approval; no new Panel implementation or live academic decision was made this session.

## Panel consistency handoff prepared (2026-10-15)

Created docs/PANEL_APPOINTMENTS_CONSISTENCY_HANDOFF_2026-10-15.md at the user's request for another session. It records the approved Supervisor hierarchy/typography/navigation, shared record/progress/audit/decision contracts, source-inspected Panel renderer/route/API inventory, role/programme/privacy boundaries, migration proposal and evidence/acceptance checklist. It distinguishes already shared Panel decisions/Student profile from staff detail/timeline work that remains unimplemented, preserves existing test-account capacity limitations and includes a pasteable next-session prompt. All 40 referenced local file links resolve; documentation coverage/format and whitespace checks pass. Existing Supervisor handoff links to it. Documentation-only: requirements/architecture were checked and need no further change; no application code, academic records, test-suite rerun, commit/push or new session creation.

## Student research profile presentation (2026-10-15, verified)

Replaced the nested Student Research profile disclosure with a shared visible section in My supervisors and Panel Appointment. Title/labels/body retain distinct existing weights; programme/area share a responsive row and abstract retains line breaks with a readable line length. Panel cards use the existing detailed appointment styles. Its authenticated API now includes the Student's saved profile or null, preserving pending Panel identity restrictions and the existing title field. Three backend regressions reproduced the missing projection before implementation; both affected rendering scripts also failed before the shared section was added. Updated the routed overview test that still expected the intentionally replaced disclosure; all 140 frontend scripts then passed. All 46 scoped Panel workflow/Student privacy backend tests, TypeScript, production build, Django checks, migration dry-run and whitespace checks pass. No schema/dependency change.

Live Demo Student My supervisors and Panel Appointment show identical saved profile content and all nine compared typography entries match (Inter; heading16/600, title14/600, labels12/600 and values/abstract12/400). Both fit at 320px: document width305, section left40.8/right264 and no overflowing fields; viewport restored. Backend restarted to load the serializer change at 127.0.0.1:8000 --noreload. Desktop/mobile proof files: C:/Users/User/AppData/Local/Temp/student-research-profile-{supervision,panel}-2026-10-15.png and matching -mobile-2026-10-15.png files. Pending/no-profile states use automated fixtures; no fabricated live records or academic changes, commit or push.

## Cross-programme local account set (2026-10-15)

Created 15 accounts as requested: six Students, six Lecturers with both Supervisor/Panel profiles and three Coordinators across Data Science, Cyber Security and Artificial Intelligence (two Students/two Lecturers/one Coordinator per programme). IDs use TEST-{DS,CS,AI}-{STU,LECT,COORD}-{01,02}; each programme has only COORD-01. Existing accounts/passwords and academic record counts were preserved; no invitation emails sent. All new accounts are active local test accounts. Credential roster/password is in the ignored backend/.env.cross-programme-test-accounts-2026-10-15.md file, not tracked documentation. All 15 password/profile/access checks pass; each Coordinator has exactly its own programme scope. Actual login and authenticated /me requests return HTTP 200 for representative DS Student, CS Lecturer and AI Coordinator accounts. Capacity resolution confirms all six new Lecturers are NOT_CONFIGURED for both roles and require Office semester capacity configuration/publication; no published policy was changed. No application code/schema change or commit/push; no application test suite rerun for this data-only task.

## Shared decision process and programme guard (2026-10-15, verified)

Implemented the user-approved plan and critique: one reusable review/user-confirmation dialog, explicit target/consequences/action labels, required reasons and existing acknowledgements, asynchronous duplicate/dismissal protection, retained error inputs, fresh review after 403/409 and one success/warning outcome. Reviewer decisions remain distinct from the acting user's own confirmation; no second-party approval stage was added to Marks, Timeline or Workflow actions. Migrated primary/supporting/research/transfer decisions, Office cancellation/capacity authorisation, selected Panel/Coordinator review, Student/Supervisor cancellation and appointment endings, Marks final/correction/reopening/completion windows/backup assignment, Timeline deletion and Workflow repair. Ordinary drafts/add/edit forms remain unchanged. Corrected stale Lecturer research guidance that still claimed a Coordinator research-review stage.

The confirmed Panel programme mismatch is resolved for approve/reject, queue/exact decision capabilities and Coordinator Panel closure using authoritative linked Student/profile agreement. Valid active official delegations remain; Office/assigned audit and legacy monitoring are preserved. No schema/dependency changes.

Fresh validation: 100 scoped backend tests pass, including 11 new programme/legacy/locked-recheck/lifecycle regressions; 140 frontend scripts pass. Final TypeScript, production build and 11 affected test scripts pass after removing duplicate JSX props. Independent review found two P2 gaps (closing/reopening clearing a conflict block; stale Office Marks actions after committed-save/reload failure); both were fixed and re-reviewed with no remaining finding in those deltas. Unit/rendering/source regressions cover duplicate prevention, save-vs-reload outcome, 403/409 latching and parent host stability. Django checks and migration dry-run pass with no changes; whitespace checks pass. Source Windows separator encoding was normalised only in task-edited files.

Live Coordinator Panel acceptance/rejection previews show the common dialog, required-reason gating, retained reason/Keep editing/discard, focus return and 320px fit (dialog left16/right288.8; document width305). Office appointment ending shows the same layout with Confirm your action, Student context, outcome and required reason; empty reason disables confirmation. Previews were closed without submitting. Lecturer has no current pending research requests, so its migrated review states are covered by rendering/controller tests rather than fabricated live academic records. Other migrated mutation outcomes are covered by tests/source review, not claimed as live end-to-end submissions. Proofs: C:/Users/User/AppData/Local/Temp/shared-decision-{approval,rejection,rejection-mobile,office-confirmation}-2026-10-15.png. API restarted at 127.0.0.1:8000 --noreload; app localhost:3001. No academic data changes, commit, push or cleanup.

## Decision-flow inspection and coordinator programme finding (2026-10-14, proposal only)

Inspected the five owned modules for decision UX. Current flows vary: immediate Coordinator primary approval; inline Lecturer primary/supporting and research decision forms; Panel acceptance modal with inline rejection; Marks submission/correction confirmations; Timeline deletion modal; Workflow repair preview plus inline reason/acknowledgement. Some dialogs close before the server outcome and success/navigation conventions vary. A reusable decision dialog/process built on the existing PortalModal/PortalConfirmModal is proposed, not implemented or approved. Preserve each workflow's business fields, reasons, acknowledgements, state/version checks and authorizations; ordinary draft saving should remain in-place.

Coordinator authorization verification: 21 isolated tests passed, including direct wrong-programme approve/reject attempts for primary, supporting and Panel requests, regular/delegated authority, delegation expiry/revocation and Supervisor-only research authority. An additional isolated programme-drift probe failed: when StudentResearchProfile.programme differs from the linked Student.programme, a Coordinator matching only the profile programme can approve a Panel recommendation (HTTP 200; expected 403). Panel access checks in appointments/views.py currently use the profile programme; primary/supporting decisions use the Student programme. This is a confirmed unresolved authorization/data-consistency edge case. Proposed correction: validate the linked Student's authoritative programme and fail closed on profile mismatch, including queue/detail/action paths, with intentional transfer-stage and legacy/unlinked handling specified separately. Active official coordinator delegations remain an existing explicit exception; do not remove them silently. No production academic decisions or application-code changes were made. Only this inspection/status note was added.

## Approved hierarchy restored and all role views checked (2026-10-14, verified)

After explicit user approval, restored semibold labels and emphasized person names while keeping ordinary values/narrative regular. Section/disclosure headings are larger than labels. The shared Lecturer/Coordinator/Office supervision layout and Student My supervisors use this hierarchy; existing role-authorized actions remain. The prior claim that reducing most weights was sufficient is superseded.

Fresh verification: all 133 frontend test scripts, TypeScript and production build pass. Live Lecturer, Coordinator and Office Staff viewed E2E-STUDENT-20261010; all 36 common text/style entries (font, size, weight, colour and line height) matched with zero mismatches. Office/Coordinator match all 37 visible entries including their shared history heading; expanded Office/Coordinator profiles match all 45 entries, and all 44 shared expanded Lecturer entries match with zero mismatches. Demo Student My supervisors also confirms 16px/600 section heading, 14px/600 Supervisor name, 12px/600 labels and 12px/400 values/narrative. Expanded Office and Student layouts fit at 320px (document width 305px; member/profile right edge 264px); viewport reset. Saved previews: C:/Users/User/AppData/Local/Temp/supervision-hierarchy-{lecturer,coordinator,office,student}-2026-10-14.png. These are live role checks, superseding the earlier Lecturer-only evidence. This change is presentation-only; no backend suite rerun, academic decisions, commit or push.

## Supervision detail spacing and font-weight correction (2026-10-14, verified)

The user rejected the previous compact Panel/context presentation; its visual-consistency claim is superseded here. Primary Supervisor and Panel now share the same member heading, status placement and typography. Student facts, Panel facts, research narrative and appointment-record values use regular weight; names/headings use semibold and labels medium. Increased outer/member padding and section gaps, moved supporting nomination into the action area, matched adjacent card heights and grouped generously spaced disclosure rows. All role hosts continue to render the shared detail components with existing permissions.

Validation: all 133 frontend test scripts passed, TypeScript and production build passed. Live Lecturer computed styles confirm matching Inter 14px/600 Supervisor and Panel names and 12px/400 Panel facts, expanded research narrative and appointment-record values. At 320px, both member cards remain inside the page (left 40.8/right 264; document width 305); viewport restored. Corrected desktop preview: C:/Users/User/AppData/Local/Temp/supervision-spacing-weight-corrected-2026-10-14.png. Office/Coordinator consistency is covered by shared rendering tests, not claimed as fresh live browser checks. No backend tests rerun for this visual-only correction, academic decisions, dependencies, commit or push.

## Staff supervision Panel/context improvements (2026-10-14, verified)

Implemented the approved plan after three critiques: move record navigation into the header, expose Student email directly and show current Panel information with backend-derived recommendation/replacement controls. Exact staff team responses add Panel/contact context, and shared rendering retains the current Panel during a pending replacement. Student projections stay unchanged; existing recommendation-detail authorization is shared by the new link capability. Detail and replacement-form Back navigation preserve supervision return context. Replacement forms identify the operation as Panel replacement rather than Recommendation needed.

Validation: 54 supervision/Office/Coordinator backend cases and 39 Panel workflow cases pass (93 scoped cases). All 133 frontend scripts passed; later Back-label/form refinements additionally pass affected navigation, Panel, record and candidate tests. Final TypeScript/build and whitespace checks pass; Django checks and migration dry-run pass with no schema changes. Regressions cover no Panel, confirmed, pending and replacement states, current/ended separation, staff payload equivalence, supporting/Student privacy and action placement. Live Demo Supervisor supervision shows the confirmed Panel, visible Student email, upper-right record action and Replace Panel with no Recommend Panel. Panel details and the replacement form both return to the same supervision record without submitting a nomination. At 320px the Panel block remains within the card (left 37/right 268; document width 305px); viewport reset. Desktop preview is C:/Users/User/AppData/Local/Temp/supervision-panel-lecturer-2026-10-14.png; a mobile screenshot capture failed, so responsive evidence is the live DOM/layout check. Office/Coordinator payloads/actions and pending-replacement cases were verified through fixtures, not claimed as live browser acceptance. API restarted at 127.0.0.1:8000; portal remains localhost:3001. No academic decisions, schema/dependency changes, commit or push.

## Student My supervisors research profile (2026-10-14, verified)

Removed the overview-only gate that hid the Student's already-fetched current research profile. My supervisors now keeps the current title visible and shows programme/area/abstract in a collapsed disclosure inside the same card, with shared field/body typography. A routed regression fails before the fix and verifies the profile, initial collapse and no invented empty profile or other-student content. Existing research pages/actions and privacy retained.

Validation: five affected frontend test scripts, TypeScript, production build and whitespace checks pass. Live Demo Student My supervisors starts with the profile collapsed; expanding shows the existing current programme, area and abstract. At 320px the expanded profile remains inside the card (left 37/right 268; document width 305px), with no horizontal overflow; viewport reset. Previews are C:/Users/User/AppData/Local/Temp/student-my-supervisors-research-profile-2026-10-14.png and the matching mobile file. No backend/schema/dependency change, academic decision, commit or push; a fresh full backend/frontend suite is not claimed for this presentation-only change.

## Lecturer dashboard backend counts (2026-10-14, verified)

The three cards already called Django but displayed pending requests/reviews under active-assignment headings. Added scoped active supervision/Panel counts and an assigned evaluation-task total to the existing summary API, corrected card metrics/wording, kept pending/incomplete badges, added loading/error/Retry and return-to-focus reload, and routed View supervisees to the roster. Regression tests reproduce absent API fields and cover active/ended appointments, supporting roles, evaluator isolation, submitted/inactive tasks and frontend loading/error/zero semantics. Existing work preserved.

Validation: all 12 dashboard backend tests and 132 frontend scripts pass; TypeScript, production build, Django checks and whitespace checks pass. Live Demo Supervisor dashboard matches read-only database counts: five supervisees, zero Panel assignments and zero Marks tasks. View supervisees opens the five-student roster; Panel and Marks links open matching empty assignment views, and returning reloads the summary. At 320px, all cards remain within the page (left 16/right 289; document width 305px); viewport reset. Preview: C:/Users/User/AppData/Local/Temp/lecturer-dashboard-backend-counts-2026-10-14.png and matching mobile preview. The local API was restarted at 127.0.0.1:8000 to load the changes; portal remains localhost:3001. No schema/dependency change or academic decisions, commit or push. Live error/Retry and nonzero Panel/Marks states are covered by rendering/backend fixtures, not claimed as browser acceptance.

## Supervisor detail feedback correction (2026-10-14, verified)

User screenshots showed that the earlier completion report overstated visual consistency. Removed crowded reference/copy metadata, raw audit enum codes, Not applied filler and repeated missing-history placeholders. Office and Coordinator now use one appointment-record renderer; Office/Coordinator/Lecturer use one exact-student supervision layout with role-authorized actions, contact and audit information. Primary and research-change cards share emphasized summary facts and regular-weight research narrative. View research profile is at the upper right inside the summary header and wraps on mobile. Fixed the live Lecturer Active status mismatch and validate the current appointment identity before using roster context. The preceding implementation report is superseded by this correction.

Final validation: all 131 frontend scripts, TypeScript, production build and whitespace checks pass after the final changes. Rendering regressions cover role equivalence, readable audit, missing history, typography, profile action placement/busy state and Lecturer active/context identity. Live read-only checks verify the same student in Office/Coordinator/Lecturer supervision; primary and research abstracts have identical computed Inter/12px/400 weight/19.5px line-height/colour. Lecturer and Office research cards show one upper-right profile action. A 320px check shows no horizontal overflow (document width 305px); viewport reset and Office session restored. No academic decision made, backend/schema/dependency change for this correction, commit/push or final independent clearance claimed.

Corrected previews are outside the repository in `C:/Users/User/AppData/Local/Temp/`: `supervisor-detail-corrected-research-2026-10-14.png`, `supervisor-detail-corrected-office-research-2026-10-14.png`, `supervisor-detail-corrected-mobile-2026-10-14.png`, `supervisor-corrected-primary-typography-2026-10-14.png` and the Office/Coordinator/Lecturer `supervisor-corrected-*-supervision-2026-10-14.png` files. Older previews below do not represent the corrected UI.

## Shared Supervisor record details (2026-10-14, initial implementation; superseded above)

Implemented shared header metadata, primary/replacement content, supporting request sections, immutable research comparisons, factual approval progress and collapsed audit. Same primary renderer now serves Student, Lecturer, Programme Coordinator and Office; research/transfer detail headings identify the actual kind. Authorized supporting/historical views share sections and audit, while appointment lifecycle/admin fields stay separate. Unknown historical stages/actors/times remain Not recorded, legacy research review is explicitly historical, and visible final actor/time is not repeated at Outcome. All Supervisor page/API families were reviewed and documented in the spec inventory; specialized forms, lists, team summaries and tools retain their existing purpose and permissions. Panel migration remains deferred.

Validation: all 130 frontend test scripts pass, TypeScript and production build pass, and whitespace checks pass. All 52 scoped Coordinator/Office workspace, Student cancellation-visibility and research amendment backend tests pass. Live read-only primary detail verified for all four roles; Office pending/approved research shows immutable comparisons and the appropriate current/historical stages. Copy-reference feedback, collapsed audit open/close, History return and 320px research layout verified; no horizontal overflow, viewport reset. Coordinator lifecycle is separate, with one student-record action and one metadata block. Supporting/history terminal states, capabilities, missing audit details, independent request/lifecycle statuses and cross-midnight Malaysia dates have automated coverage. Initial independent review found coarse Office stage inference and absent legacy ending-date fallback; both were reproduced and fixed. The independent reviewer hit the account usage limit before final clearance; integration review and verification were completed by the primary agent. No academic records were mutated; no dependency/schema/backend change for this refactor, commit or push.

Previews are saved outside the repository: `C:/Users/User/AppData/Local/Temp/supervisor-research-detail-2026-10-14.png` and `supervisor-research-mobile-2026-10-14.png` in the same directory. Spec and plan: `docs/superpowers/specs/2026-10-14-supervisor-shared-record-details.md` and its matching plan.

## Waiting-column final outcomes (2026-10-14, complete)

Replaced final-state dashes across all Waiting at this stage tables with explicit Completed/Cancelled/Rejected and corresponding lifecycle labels through a shared raw-status formatter. Ongoing calendar days, including zero, and missing timing semantics retained; stale final ages suppressed. Shared row adapters pass workflow status separately from Current stage text. Student history regression failed on the old dash behavior before implementation. All 12 affected utility/component scripts, TypeScript, production build and whitespace checks pass. Independent review confirms coverage of all tables with this column and no actionable issues. Live read-only Office history shows Completed for approved requests and Rejected for rejected requests; cancellation variants are covered by fixtures. No backend, dependency, schema or academic data changes, commits or pushes.

## Office Tools visual polish (2026-10-14, complete)

Refined only the Office Tools dropdown with subtle icons, aligned text, consistent row spacing, a quieter divider and a slightly wider viewport-clamped menu. Existing destinations and interactions retained. Requirements reviewed: no feature/business-rule changes. Existing OfficeSupervisorTools rendering/positioning test and TypeScript pass. Live desktop and 320px checks confirm readable rows and no horizontal overflow (305px page width, menu left 16/right 289); viewport reset and preview saved outside the repository. No dependencies, workflow changes, commits or pushes.

## Owned-module controls and supervision exports (2026-10-14, complete)

Implemented the contextual-tools approach approved after comparing three alternatives. Removed manual Refresh controls across all five owned modules/roles and secondary governed surfaces, retaining mutation reloads, error Retry and guarded return-to-focus loads. Office Tools separates described Monitoring and Configuration destinations; Capacity reassessments stays separate. Team and selected lecturer card headers export complete filtered XLSX lecturer assignments and full active student teams. Existing attention/request/history CSV exports remain.

Validation: all 124 frontend test scripts pass under bundled Node 24; TypeScript and production build pass. All 44 supervision-export and existing Office/Coordinator workspace backend tests pass, covering role/delegation guards, current primary/supporting teams, pending/ended exclusion, 28-record exports beyond UI pages, bounded queries, filtering and literal spreadsheet text. Django checks, migration dry-run (no changes) and whitespace checks pass. Independent review reproduced a lecturer-name search mismatch with semester/role/date/selected-supervisor filters; eight failing cases were fixed through shared filtered relationship eligibility and follow-up review is clear.

Live read-only Office checks verified grouped tools, full and lecturer-specific Excel downloads (five confirmed demo relationships), and programme-filtered download (three relationships/teams checked in both workbook sheets). At 320px the export button and described menu stay within the page width; temporary viewport reset. Preview screenshots saved outside the repository. Existing branch work preserved; no new dependency/schema migration, live academic decisions, commits or pushes. Development API restarted to load final backend changes at 127.0.0.1:8000; portal remains localhost:3001. Full backend suite and large-scale memory benchmarks are not claimed.

## Office Supervisor attention redesign (2026-10-13, complete)

Implemented the approved five-pass design after the final critical review: Office Needs attention is the landing page, with three distinct category counts/tables, a dedicated Appointment requests route and preserved Supervisory teams. New Office-only projections identify eligible students without active primary supervision (including never-applied students), pending primary/supporting/research/transfer requests by current reviewer and stage age, and current-semester capacity concerns. Secondary More tools replaces Records administration while retaining profiles, corrections/transfers, workload, requirements and the field-compatible full export. Category/request/history exports collect all matching pages. Capacity reassessments and other roles stay unchanged.

Validation: all 17 new backend attention cases pass; final affected Office/Coordinator/research browse suite passes 59 cases, with 116 broader workflow/read regressions passing before the final date/facet additions. All 18 affected frontend scripts pass under bundled Node 24, including CSV/export safety, navigation, role rendering, lazy routes and production security. TypeScript and production build pass; Django checks, migration dry-run (no changes) and whitespace checks pass. Independent review clear after reproducing and fixing a narrow-phone tools-menu clipping issue. Mixed request date/type-facet gaps, wrong endorsement wording and candidate/current-reviewer ambiguity were also resolved and covered by regressions.

Live read-only Office verification confirms real missing-supervisor and capacity records, global counts with distinct units, category tables/filters, dossier/research/workload return context, selected lecturer workload focus, dedicated requests and document-tool return, waiting date filtering/reset, and an actual matching-student CSV download. Mobile category/table layout and menu checked at 320/390px; 320px document scroll width equals viewport width, and menu is clamped within 16px margins. Temporary viewport reset. Multi-page, supporting, pending-primary and transfer cases use fixtures rather than live academic mutations. Large-scale benchmarks are not claimed. Development servers restarted at portal localhost:3001 / API127.0.0.1:8000 and preview saved outside repo. Root documents/handoff updated and earlier uncommitted work preserved. No live academic decisions, commits or pushes.

## Staff research navigation (2026-10-13)

Implemented interim Coordinator Programme transfers navigation with transfer-only Requests/History and normalized saved/Next filters. Office has two main tabs and a secondary Research records tool retaining monitoring, history, profiles, correction/transfer forms and originating return context. Student/Lecturer navigation and capacity behavior remain. Corrected stale primary Supervisor research-decision subtitle. Registry relocation and larger Office attention/Overview redesign remain deferred.

All nine affected frontend scripts pass, including saved-filter/Next-query and mixed research/transfer status regressions. TypeScript, production build and both production security scripts pass; 24 existing research paging/workflow backend regressions pass. Independent review identified the mixed status-facets issue, reproduced before fixing; follow-up review reports no remaining actionable issues. Live read-only Office checks confirm two main tabs, secondary Research records monitoring/history, exact-detail returns, profile/student selection and correction/transfer form access. Coordinator transfer Requests/History and Clear filters render correctly; demo has no populated transfer cases, which remain covered by automated tests. Preview saved outside the repo. Root requirements/design/status updated. No live academic decisions, commits or pushes.

## Supervisor Appointments continuation handoff (2026-10-13)

Prepared docs/SUPERVISOR_APPOINTMENTS_HANDOFF_2026-10-13.md with current branch/working-tree state, final shared navigation/table conventions, changes and permission differences for Student/Lecturer/Coordinator/Office, latest Supervisor-only research and manual course-code rules, source/API map, recorded validation, pending Registry transfer proposal and a next-session prompt. Inspection found a stale new-research subtitle describing Coordinator final approval; it is flagged for follow-up rather than changed by this documentation task. Prior test results are clearly identified as historical; no new runtime changes, academic mutations, commits or pushes were made.

## Programme-transfer handoff prepared (2026-10-13)

Prepared docs/PROGRAMME_TRANSFER_HANDOFF_2026-10-13.md for the recorded Registry owner, Xiang. Recommendation puts enrolment changes in Student Registry while preserving Supervisor-owned research changes and appointment integrations. Inspected the existing form, Registry integrity guard, backend authorization/atomic updates, API, routes and transfer regressions. The document includes the proposed journey, ownership boundary, implementation sequence, compatibility obligations, acceptance checks and a ready-to-share note. Ownership acceptance and implementation remain pending; no runtime code, database, server, commit/push or external message changes were made for this handoff.

## Latest main merged and development servers running (2026-10-13)

Fast-forwarded codex/portal-consistency-and-toast to latest main 93049a2 and restored all 72 previously modified/untracked files. All 67 files outside incoming main's changes retain their saved contents; the single PROJECT_STATUS.md conflict preserves both histories. An external backup and safety stash e5057e0d5ce5b4954c80fa738a181d8825757934 remain available. Independent integration review found no actionable defects or missing work. Updated one incoming rendering assertion from Endorse request to Approve request to match the approved Supervisor-only research decision.

Installed the declared python-docx dependency and successfully applied incoming accounts, announcements and letters migrations. All 172 backend integration tests and all 118 frontend test scripts pass. TypeScript, production build/security guards, Django system checks and pip dependency checks pass. Live read-only Office dashboard and Supervisor Appointments navigation work, the portal returns HTTP 200, and the proxied authentication endpoint returns the expected unauthenticated HTTP 401.

No existing FSKTM server processes were found. Both project servers are now running in managed terminal sessions: portal http://localhost:3001 and Django API http://127.0.0.1:8000. The unrelated Docker application on port 3000 remains running. Local work remains uncommitted and unpushed; no live academic decisions were submitted.

## Supervisor-only research changes (2026-10-13, complete)

Implemented primary Supervisor-only final approve/reject decisions for title/abstract research changes. Approval applies the profile revision atomically and preserves the original application; Coordinator decision queues exclude research requests. Legacy research PENDING_COORDINATOR storage/history remains intact while current review, filters, dashboard ageing and report status point to Supervisor. Real legacy endorsement preservation and raw expected-status mismatch are tested; no automatic approvals occur. Transfers retain both Coordinator stages. Review caught and resolved old Endorse confirmation wording and legacy Coordinator report labels; re-review has no remaining actionable findings. All 53 affected backend regressions pass, including concurrency, lifecycle, paging, reports and withdrawal visibility. All 106 frontend scripts pass, and the strengthened affected rendering test was rerun after the final wording fixes. Final TypeScript/build/security guards, Django checks/migration dry-run and whitespace checks pass. No schema migration or live academic decision was required; no local legacy research requests awaited Coordinator. Existing uncommitted work is preserved; no commits or pushes were made. Live browser acceptance is not claimed.


## Manual course-code implementation (2026-10-13, complete)

Completed five critical plan-review passes and implemented the optional Course code(s) field, API/multipart persistence, editable replacement prefill, course-only dirty-draft protection and exact Student/Supervisor/Coordinator/Office record display. No mappings, allowlists, new approval stages or evidence requirements were added. Six focused API regressions pass after reproducing missing persistence/validation; all 109 affected backend cases pass. All 106 frontend scripts pass; the strengthened Student conversion check was rerun successfully after the suite. TypeScript, production build/security guards, Django system/migration checks and whitespace checks pass. Migration appointments.0016 is applied locally; existing application count is unchanged and historical course values are blank. Independent review against a preserved pre-task baseline found no actionable defects. Live browser acceptance was not verified: initial automation timed out and the retry reached a different service at localhost:3000. Existing uncommitted work is preserved; no commits/pushes or live academic decisions were made.


## Supervisor appointment form inspection and plan (2026-10-13)

Inspected both pages of the received blank `TD(IT):FSK29` PDF using text extraction and visual rendering; compared Sections A/B/C with current models, submission/review pages, private-document validation, atomic approval/profile handoff and research-amendment history. Saved the review/design and staged implementation plan under `docs/superpowers/specs/2026-10-13-supervisor-appointment-form-review.md` and `docs/superpowers/plans/2026-10-13-supervisor-appointment-form-alignment.md`.

User confirmed the existing approval process is sufficient: retain Student -> Supervisor -> Programme Coordinator and exclude Dean sign-off and extra approval stages. Latest feedback simplifies course code(s) to Student-entered text without programme mappings and removes separate title-confirmation work and additional proposal/results evidence requirements. Existing acceptance, research amendments and configured uploads remain unchanged. Identity/contact snapshots, Office metadata and print output are optional later suggestions; the provisional form/layout remains unresolved. At the initial review stage, no application code, migrations, runtime policy, live academic records, commits or pushes were changed, and verification was limited to source/PDF and documentation review. The subsequent authorized implementation and verification are recorded above; existing uncommitted work remains preserved.

## Fresh local Student test account (2026-10-13)

Created one active synthetic Student account in the local development database for fresh workflow testing, using the current semester and Cyber Security coursework programme. No supervisor, research profile or requests were prepopulated. Verified successful login through the authentication endpoint and the Student role. Credentials are excluded from repository documentation. Existing requirements and architecture remain applicable; no application code changes were needed.

## Office Supervisor structure alignment (2026-10-13)

Implemented shared Coordinator-style Office request/history filters and tables, supervisor-first teams with student search and Past appointments, paged monitoring for appointment/research lists, separate capacity/admin tools and exact details. Retained Office capacity authority, supporting cancellation, lifecycle ending, workload, exports, no-supervisor records, requirements and research correction/transfer access. Targeted primary details preserve contact/workload/approval fields. Legacy notification keys remain supported; administration rows now open their exact application identity.

Review caught and resolved stale record actions on identity changes, an inaccessible profile creation launcher and nullable legacy Panel carryover serialization. Profile rendering and legacy Panel crash were reproduced before fixes; all 42 staff browse/research backend tests pass afterward, alongside 65 broader workflow/capacity/cancellation/delegation checks. All 106 frontend scripts pass; affected Office/role/lazy-route tests, TypeScript and production build were rerun after the final record-link refinement. Production security guards, Django checks, migration dry-run (no changes) and whitespace checks pass. Follow-up review found no remaining important issues.

Live Office checks cover history search/page-size return, exact details and lifecycle controls, student search through supervisor drilldown, workload/requirements returning to administration, enabled exports, separate capacity browse, upstream research monitoring with no approval button, correction/transfer form preserving the chosen Student, and desktop/mobile layouts. No horizontal overflow at 390px; temporary viewport reset and Office preview images saved outside the repo. Populated supporting/carryover/large-page cases use fixtures rather than live academic mutations. No commits or pushes.

## Coordinator browse presentation corrections (2026-10-13)

Removed More filters and focus selectors from Coordinator appointment/research lists, enforced decision-only service queries against stale All ongoing state, exposed filters in a consistent grid and aligned Clear filters. Renamed appointment lifecycle history to Past appointments. Following UI review, moved its light switch outside the card and removed the grouping dropdown; teams always group by supervisor, with student search retained through drilldown.

Focused Coordinator/render/API/queue/lazy-route and existing research/role tests pass. TypeScript and production build pass. Browser confirms visible shared request fields, appointment Clear filters resetting search/dates and student matric search carrying into View students. Live research Clear filters also resets URL/search/dates together. Final teams and research controls have no horizontal overflow at 390px; temporary viewport reset. Desktop preview saved outside the repository. Root docs and the active design updated. No commits, pushes or academic decisions.

## Coordinator Supervisor workspace efficiency (2026-10-13)

Implemented Coordinator-only server-paged appointment/research requests and history, shared filter controls, supervisor-first groups and paged student drilldown, By student alternative, separate ended appointment history and dedicated read-only capacity tool. Reused existing record/decision controls and fonts; preserved source filters/page selection, scope/delegations, Student withdrawal hiding and all other roles. Review refinements fixed relationship count/drilldown mismatches, history date inconsistencies, stale Next targets and incompatible research view filters. Live verification caught and fixed consecutive URL filter writes discarding focus changes.

Validation: 115 broader backend regressions passed before the final relationship/date refinements; all 34 Coordinator workspace/research regressions passed afterward, including two reproduced failing cases. All 105 frontend scripts, TypeScript, production build and production security checks passed again after the final shared-control refinement. Django check, migration dry-run (no changes) and whitespace check passed. Live read-only Coordinator checks confirm grouped supervisor/student browsing, detail return, history search and restored page size, secondary capacity navigation and research focus controls. Mobile 390px team layout has no horizontal overflow; temporary viewport reset and desktop/mobile previews saved outside the repository. Large multi-page, ended/supporting and research decision datasets are covered by fixtures rather than live demo records. No academic decisions, commits or pushes.

## Student cancellations in staff histories (2026-10-12)

Implemented shared backend exclusion of Student-withdrawn supervisor/research requests from routine staff histories, Office records, dossiers and reports/exports. Preserved Student history, Office/system cancellation outcomes, authorised audit detail and database events. Added failing-then-passing regressions for both workflows and all staff roles; expanded checks cover dossiers, workbook exports and counts. All 75 affected backend regressions pass; the focused two-workflow visibility suite was rerun after adding staff/Student supervisory-team activity checks and passes. Tests cover all staff roles, Student history, Office/system cancellation preservation, dossier/workbook/count consistency and unchanged audit scope. Django check, migration dry-run (no changes) and whitespace checks pass. No live workflow mutations or data deletions; changes remain uncommitted.

## Student research summary layout (2026-10-12)

Reworked the Student Current research profile summary to give the research title priority and group actions consistently. Wide screens align actions to the right; smaller screens place them below. Pending guidance stays with profile information. Existing research-view regressions, TypeScript and whitespace checks pass. Live Student verification at 1440px confirms actions beside the information; at 390px actions follow the text with no horizontal overflow. Pending submission restrictions preserved. Preview saved outside the repository and temporary viewport reset. Changes remain uncommitted.

## Panel review rejection field (2026-10-12)

Hidden rejection reason until Reject is selected; added Confirm rejection/Cancel and a brief acceptance confirmation. Initial neutral/read-only/busy rendering regression reproduced the premature field before the fix. Targeted neutral/read-only/busy regression, TypeScript and production build pass. Live Demo Panel Lecturer verification covered Reject revealing the required reason, valid text enabling confirmation, Cancel clearing the draft, reopening with an empty reason and Accept displaying a reason-free confirmation. All dialogs/drafts cancelled without submitting decisions; neutral preview saved outside the repository. All 102 frontend test scripts and both production security guards pass; this and the previous candidate selection change remain uncommitted.

## Panel candidate selection clarity (2026-10-12)

Removed implicit first-eligible selection; added explicit Selected panel member confirmation and Remove selection. Search remains separate from selection; notes survive removal; submission stays blocked without a valid candidate. Initial-state rendering regression reproduced auto-selection before the fix. Initial-state, panel workflow and record-page regressions, TypeScript, production build and whitespace checks pass. Live Lecturer verification covered empty initial state, explicit selection, notes enabling submission and removal retaining notes while blocking submission. Preview saved outside the repository; verification draft and selection cleared without submitting an academic recommendation. Changes remain uncommitted.

## File Management: All 8 Phases (2026-10-14 to 2026-10-15)

Following the supervisor's direction of 2026-10-14 (plan: `docs/superpowers/plans/2026-10-14-file-management-module.md`). Not built yet: supervisor application files in a student's view (waiting for Wey Cheng's agreement) and the optional links from a file to an appointment or letter.

- **Uploads (Phase 1, `379892c`).**
  - Students upload their own forms, thesis, letters and so on. The office, lecturers, panel members and coordinators upload files about their students, or staff files about no student.
  - Every upload is checked: PDF, Word, Excel, PowerPoint and image contents, macros, hidden extensions, 10 MB, and duplicates.
  - Files are tagged by student and by keyword, and found by student name, student ID, title, tag or reference.
  - Who sees a file follows real relationships: supervisors, panel members and programme coordinators, ticked per type and per file. Students see only their own uploads.
- **Screens (Phase 2, `dd6aa7e`).** Files for staff (All files, Staff files, one student's files), the file page, both upload screens, and File Submission for students with their approved letters.
- **Preview and ZIP (Phase 3, `0cec8ae`).** PDF pages and images are drawn on the server, so previews work under the production security policy. Several files download as one ZIP.
- **Checking (Phase 4, `f9f96ea`).**
  - For types the office checks, uploads wait in "To check". The office accepts, or returns with a reason.
  - The student sees the reason under To do, and uploads a corrected file as a new version. A second upload of a one-per-student type offers to become a new version.
  - Uploaders and the office edit the title, tags and note; every change is kept in the history.
  - Notices go out in the app, and by email when "Email alerts" is on.
- **File settings (Phase 5, `4a8df87`).**
  - The office opens Settings from Files. It changes, for each document type: who can upload it, who can see it, whether the office checks it, and whether it can still be chosen. It can also add new types.
  - New sharing reaches files students already uploaded, while what staff chose when uploading stays. The screen says how many files a change touches before saving.
  - A Tags tab renames, merges and removes tags. Renaming to an existing tag offers to merge.
  - On a file's page, the office or the staff uploader changes who can see it, and people who can newly see it are told.
  - Changes to types and tags are kept in a settings history.
- **Archive and history (Phase 6, `5bc3095`).**
  - The office archives a file with a reason (quick reasons offered) instead of deleting someone else's upload. Archived files disappear for everyone but the office, are listed under More filters (Show: Archived files), and can be restored.
  - File settings has a History tab: uploads, changes, checks, archiving, deleted files (with who they were about), opens and downloads, and settings changes, with one Show choice and a search box.
  - Each file page shows its own history to the office.
  - `manage.py check_document_storage` reports missing and left-over stored files; `--remove-orphans` deletes left-overs more than an hour old.
- **Required documents (Phase 7, `429a5c9`).**
  - In File settings the office turns on "Every student must hand it in" for a type, with an optional due note and, if needed, only chosen programmes (Xiang's choice on 2026-10-15). Only Active students count, and a required type must be one students can upload.
  - Students see what they still owe under To do, with an Upload button that opens the upload screen with the type chosen.
  - A Required documents tab in Files shows the office and programme coordinators (their programmes only) how many students have handed in, are waiting for a check, or still owe it; names on request, and a returned file counts as still owed.
  - The office presses Remind at most once a day per type: a notice in the app, and an email for students with "Deadline reminders" on.
  - A student's header in Files shows their required documents.
  - Migration `documents.0004`, after the backup `db-backups/fsktm_pg_office_before_required_documents_2026-10-15.dump`.
- **Wrap-up (Phase 8, `c09e257`).**
  - My Profile lists the files a student uploaded (type, status, date) instead of "Available when File Management is released".
  - A student's record in the Registry has a "View files" link to that student's files.
  - Notices open the right place: a file notice opens the file, a reminder opens the upload screen with the type chosen.
  - The backend README describes the File Management endpoints, access rules, upload checks and `check_document_storage`.
- **Migrations** `documents.0001` to `documents.0003`. The dev DB was migrated after the backups `db-backups/fsktm_pg_office_before_documents_2026-10-14.dump` and `db-backups/fsktm_pg_office_before_document_settings_2026-10-14.dump`.
- **Verification.**
  - The backend passes 1142 tests.
  - All 116 frontend scripts pass, along with lint, the build and the production security tests.
  - Browser checks on private servers:
    - screens, preview and ZIP: 23 of 23;
    - previews under the enforced security policy: 10 of 10;
    - checking and versions: 12 of 12;
    - file settings, sharing and tags, including a phone: 20 of 20;
    - archive, restore and history, including a phone: 11 of 11;
    - required documents, including a phone: 15 of 15. Remind was answered inside the browser, because the dev database has demo students in every programme; sending is covered by the backend tests;
    - My Profile files and the Registry link: 4 of 4.
  - All smoke accounts, files, notices, tags and types were removed afterwards.

## Letters: Requests Approved By The Office (2026-10-13)

Following the supervisor meeting (plan: `docs/superpowers/plans/2026-10-13-letter-requests-with-office-approval.md`).

- **Students request, the office decides.**
  - Students no longer get letters straight away, and never see a letter's wording before approval (the template API hides it from them).
  - A student chooses a letter by name and description, adds an optional note, and sends a request.
  - The office reviews it on its own page (`/letters/requests/<id>`, also opened from the bell). It fills in what the portal does not hold, checks a live A4 preview, then approves (which issues the reference number and date) or rejects with a reason.
  - The student is notified in the app, and by email when "Email alerts" is on.
  - Once approved, the student can view, print or download the letter.
  - After a rejection the student sees the reason and can request again. A pending request can be withdrawn.
- **Office-filled fields.**
  - Templates can define fields such as `{{ATTENDANCE}}` ("Attendance (%)"), added in the template editor's Office-Filled Fields panel.
  - The office types them in when approving.
  - Any record field the student's record leaves blank (for example a passport number) is also typed in at approval, for that letter only.
- **Rules.**
  - One pending request per letter per student, enforced by a database constraint.
  - Approval is refused once the student is no longer Active.
  - A template with pending requests cannot be deleted (archive it instead).
  - Only issued letters can be downloaded, resent or revoked.
- **Migration** `letters.0004` (dev DB migrated after the backup `db-backups/before-letter-requests-2026-10-13.dump`). Existing letters keep their status, number and wording.
- **Commits:** `a879c21` (data and templates), `ebf3dc1` (backend workflow), `facafed` (screens). The backend README describes the endpoints.
- **Verification.**
  - The backend passes 1057 tests.
  - All 113 frontend scripts pass, along with lint and the build.
  - The end-to-end browser check passed 26 of 26 on private servers:
    1. the office builds a template with an Attendance field;
    2. a student requests it;
    3. the office opens it from the bell, fills in the missing passport and the attendance, and approves;
    4. the student views it on A4 pages and downloads the PDF;
    5. a second request is rejected with a reason, requested again, then withdrawn.
  - Phone layouts were checked, and no console errors occurred.
  - All smoke data was removed, including the request notifications sent to other office accounts.

## Registry Import: Paste Rows Removed (2026-10-13)

- At Xiang's request the Bulk Import card is back to file upload only, as it was before `c49e6aa`: one File Upload card with the drag-and-drop box and the template buttons. The Upload/Paste toggle, the paste box and `pastedRowsFile` are gone, and the guideline reads "CSV or XLSX".
- Kept from `c49e6aa`: an uploaded file with no column-name row still works ("No column names" on the Match step, columns matched from their values). The backend is unchanged.
- Two sample files for trying the import live outside the repo in `Final Year Project/test-data/registry-import/`. Both hold 5 made-up students with `@example.com` emails, so nobody can receive their activation emails.
  - "Sample 1 - Excel template" is filled in the system's template and goes straight to the row check.
  - "Sample 2 - Office extract style" has title rows, Malay column names, extra columns, Student IDs ending in `/1` and programmes spelt several ways ("MDS", "Sarjana Keselamatan Siber"). It goes through Match columns and the programme choices.
- Lint, the build and all 112 frontend scripts pass. A browser check passed 7 of 7: the card, and both sample files previewing (nothing imported).

## Announcements List Redesign (2026-10-13)

- **Frontend only** (`00e115c`). The backend, the API calls and the composer are unchanged.
- **Layout.** It follows common web patterns (Stripe-style count tiles, a Mailchimp-style status filter, a Canvas-style search and newest-first list) built from the portal's own cards, badges, filter menus and pager.
  - Live, Scheduled, Drafts and Expired tiles show counts, and pressing one filters the list.
  - A search box plus Status, Audience and Priority filters, with Clear.
  - Each row shows a priority edge as in the recipients' feed, status and priority badges, a two-line preview, and the audience, timing, author and attachment.
- **Drafts** now appear in the list as well as under the composer.
- **Actions.** Edit and Remove use the same handlers as before. Remove still asks for confirmation, and Expired rows still offer Remove only.
- **Move to drafts removed** at Xiang's request, from the list and from the edit page.
  - It pulled a published announcement out of recipients' feeds, but emails already sent stayed, and publishing it again emailed everyone a second time.
  - Editing a published or scheduled announcement now offers only its save button (Save & Keep Published, Reschedule, Save Schedule or Publish Now). New announcements and drafts can still be saved as drafts.
  - To take an announcement down, Remove it. The backend still accepts a status change back to Draft; only the buttons are gone.
- **Expires At removed** at Xiang's request. Recipients kept expired announcements in their feed anyway, so the end time only relabelled the office's own list.
  - The composer has Publish At only. Saving, or publishing a draft from the composer's draft list, sends no end time and clears any end time set before.
  - The list has three tiles (Live, Scheduled, Drafts) and no Expired filter. An announcement that had already expired still lists under All with its Expired badge and Remove only.
  - `scheduleProblem` (the client-side expiry check) is gone. The backend is unchanged and still supports `expiresAt` for older rows.
  - Checked in a browser (42 of 42 checks): the field and tile are gone, and saving cleared a stored end time in the database while the announcement stayed live.
- **Verification.** Lint, the build and all 112 frontend scripts pass. A browser check on a private server passed 32 of 32 checks at 390, 768, 1280 and 1440 wide:
  - the tiles, filters, search, empty state and pager;
  - a real edit and save, and Remove;
  - no Move to drafts anywhere, while drafts and new announcements keep their draft buttons.
  The test announcements were aimed at a made-up intake so nobody received them, and they were deleted afterwards.

## Sign-In, Profile Menu, Settings And Letter Download Fixes (2026-10-12)

- **Remember me** (`3b9a753`). Sign-in has "Remember me on this device", off by default.
  - Ticked, the refresh cookie lasts 7 days and survives closing the browser.
  - Unticked, the cookie ends with the browser, and the server ends the session 12 hours after its last use (`JWT_SESSION_REFRESH_HOURS`).
  - The choice travels in the refresh token, so refreshes and password changes keep it. Before this, every sign-in lasted 7 days, and the checkbox on `main` was not connected to anything.
  - Checked in a browser by closing and reopening it: unticked returns to sign-in, ticked stays signed in.
- **Forgot password** verified end to end on a private test server:
  - the email arrives with its link, and the link sets a new password;
  - the old password stops working and the new one signs in;
  - the link works once only, and the reset signs out a device that was already signed in;
  - an unknown email gets the same answer and no email.
  No code change was needed.
- **Notification preference switches** (`3f25c49`). The switch knob now sits in its track, so on and off read correctly. Each switch is named by its row title (also clickable) instead of repeating it. Saving and reloading keeps every choice.
- **Profile menu** (`a14465f`):
  - "My Records" is now "My Profile" at `/my-profile`.
  - The menu's My Profile opens it for students and Settings for staff; it no longer opens the helpdesk dialog.
  - The menu's Settings item now works, and Settings is no longer in the sidebar.
- **Letters download as PDF** (`2de34dd`). `GET /api/letters/requests/<id>/pdf/` replaces the Word download. It is built with `reportlab` in the printed layout, and locked against editing while printing and copying text stay allowed. This replaces the Word half of design decision D5. Run `pip install -r requirements.txt` for `reportlab` and `pypdf`.
- **Verification.** The backend passes 1039 tests and all 112 frontend scripts pass, along with lint and the build. Browser checks for each item passed, and all test data was removed.

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
## Main merge conflict resolution (2026-10-12)

Merged origin/main into codex/portal-consistency-and-toast to resolve GitHub merge conflicts in the FAQ chatbot, Student Registry and letter templates. Main feature changes and branch record navigation/list-state/typography preserved. Integration verification passed: 122 backend regressions; frontend suite expanded to 100 scripts (registry conflict regression fixed and rerun with record-navigation checks); TypeScript, production build, production security guards and staged whitespace checks pass. No unresolved paths remain.

## Branch publication (2026-10-12)

User requested committing and pushing all accumulated navigation, Supervisor workspace, search and Student appointment visibility changes on codex/portal-consistency-and-toast. Publication checks include all 93 frontend scripts, TypeScript, Django system/migration checks and 59 affected backend regressions, all passing. Sensitive file-name and credential-pattern scans found no matches; private local environment files remain ignored. Historical entries below describe the state at each implementation checkpoint.

## Student supporting appointment visibility (2026-10-12)

Implemented Student appointment-result visibility and result-only in-app notifications; removed pending/terminal supporting nomination UI and dashboard tracking. Staff workflow and audit records remain intact. Failing-then-passing API privacy, legacy-notification and dashboard regressions added. All 16 co-supervision tests and 10 dashboard/announcement tests pass; the two privacy tests were rerun after strengthening nested projections and staff preservation checks. All 93 frontend scripts, TypeScript, production build and production security checks pass; notification destination regression passes. No live academic decisions were made. Changes remain uncommitted on codex/portal-consistency-and-toast.

## Office record navigation toast (2026-10-12, complete)

- Removed the "Returned to Appointment records" toast from the Office appointment Back action. The existing return callback, preserved list state and record guards remain intact; filter, download, lifecycle and error feedback is unchanged.
- Office hierarchy and global record navigation regressions pass; TypeScript passes. All three project documents updated. Changes remain uncommitted on codex/portal-consistency-and-toast.

## Office supervisor search verification (2026-10-12, complete)

- Live Office search verification reproduced duplicate React row identities leaving an unrelated row visible while pagination correctly counted matching records. Restored application-specific keys and added a failing-then-passing identity/stability regression. Repeated live searches now show 2 Student Test rows, 2 DEMO-STUDENT-001 rows, 6 shared-supervisor rows, zero unmatched rows and 6 rows after clearing.
- Research names/matric/numeric IDs worked; displayed change types and formatted references did not. Search now includes the shared change-type label and Research request/Research amendment/Request reference forms. Rendering regression reproduced the miss before the fix. Live Abstract change, Research request #2 and Research amendment #2 each match the ongoing record; unmatched terms return zero; clearing restores it. Research History remains independent, and Office Applications redirects to Appointment records as designed.
- All 93 frontend scripts, TypeScript, production build and both production security/artifact guards pass. No backend, schema, dependency or authorization changes; no live workflow mutations. Changes remain uncommitted on codex/portal-consistency-and-toast. Other existing local branches/worktrees were inspected read-only and were not changed.

## Supervisor hierarchy across roles (2026-10-12, complete)

- Implemented the approved role-specific Supervisor tabs and common list hierarchy for Student, Office and Coordinator; Lecturer presentation remains shared. Research ongoing/history partition and pagination now apply across roles. Student applications lead with supervisor identity, Coordinator primary/supporting queues use compact tables, and Office teams/research no longer precede appointment records. Administration tools and capability-specific workflows retained.
- Added scoped Coordinator terminal request history without changing the approved appointment endpoint. Dedicated tests cover terminal outcomes, roles/programme boundaries and acting scope. Review found incompatible Student status filters after view switches, September date parsing and Coordinator appointment/dossier identity loss. All were fixed with focused regressions; scoped follow-up found no remaining material findings.
- Verification: 93/93 frontend regression scripts and 33 affected backend tests pass. The four affected rendering scripts, TypeScript, production build and both production security/artifact guards passed again after final wording refinements. Django check and migration dry run pass with no migration changes. Git diff whitespace validation passes. No dependency or schema change; existing authorization/scoping preserved.
- Live acceptance covered all four roles: Lecturer baseline; Student Applications History/detail/return preserving size, research ongoing/history/detail/return; Office record filters/detail/return, teams detail with retained search, separate research History; Coordinator populated queue/detail/return, cancelled primary History, teams detail/return and separate research tab. At 390 px, Student research and Coordinator records have no document-level overflow and use stacked records. Normal viewport restored. The existing local backend server was reloaded to activate the new endpoint.
- Browser checks used available demo records and submitted no academic decisions, cancellations, corrections, transfers, lifecycle endings or uploads. Populated supporting nominations and Coordinator approved appointment/dossier roundtrip were not available live; fixtures and source review cover those paths. Saved Student/Office/Coordinator desktop and Student/Coordinator mobile previews outside the repository. All three root documents updated; changes remain uncommitted on codex/portal-consistency-and-toast, with no push or merge.
- Plan and evidence: docs/superpowers/plans/2026-10-12-supervisor-role-hierarchy.md; design: docs/superpowers/specs/2026-10-12-supervisor-role-hierarchy.md.

## Global navigation audit (2026-10-11, complete)

- Audited active App modules across Student, Lecturer, Programme Coordinator and Office Staff/Admin against the approved page/inline/modal standard. Fixed Coordinator request deep links, local Marks/file/announcement editors, staff research records/forms, record fallback headers and return context. Lists preserve UI controls across route/dossier remounts; substantial forms protect drafts and in-flight operations. Brief previews/confirmations and contextual configuration editors remain intentional exceptions.
- Read-only review identified cached Marks state being reset on mount, Panel pagination clamping before data loaded, abandoned Coordinator reasons persisting, and saved staff transfer forms staying open with stale dirty state. All are addressed; follow-up review found no remaining actionable issues. Live acceptance also reproduced research dashboard actions opening the module root; their resolver now opens the exact request and its regression passes.
- Final verification: all 89 frontend regression scripts, TypeScript, production build, both production security/artifact guards and git diff whitespace checks pass. No new dependency, backend, schema or authorization change was needed for this follow-up. Existing earlier backend work remains untouched.
- Representative desktop acceptance covered all four roles: Student research detail/return; Lecturer list/Marks empty state; Coordinator dashboard request/rejection draft discard/reopen; Office announcements and upload draft guards, supervisor/dossier return with retained search, staff research local/routed details, guarded request form and preserved student selection. Login help Escape/focus passed. No academic decisions, saves, uploads, publication or deletion were executed. Demo Lecturer Marks has no tasks, so populated scoring/submission and API-success/failure paths rely on tests/source review rather than live mutation checks. This is an active-code audit, not a claim to have browser-tested every data/permission/error state.
- Coverage and limitations: docs/superpowers/specs/2026-10-11-global-navigation-audit.md; completed plan: docs/superpowers/plans/2026-10-11-global-navigation-audit.md. All three root documents updated. Saved global Coordinator and staff research previews outside the repository and restored the Lecturer Supervisor Appointments workspace. Changes remain uncommitted on codex/portal-consistency-and-toast; no push or merge.


## Record navigation consistency (2026-10-11, complete)

- Implemented the approved independent record/form screen: one labelled return above one heading, no list title or module tabs on details; existing app shell, fonts and permitted workflow actions remain. Supervisor primary/supporting/research/supervision records, Panel review/history/nomination/workload, Registry profiles/forms, capacity/workload, reconciliation, Timeline forms/import, document requirements, request history, file upload and backup evaluator forms use this structure.
- Shared RecordPage host preserves mounted local list state; routed lists retain query filters, view, pagination and size. Validated return context tracks the actual originating history entry, including profile/dossier navigation. Local editors use an opaque transient history marker and reload to their owning list. Brief confirmation/help/notice/Timeline/task previews use native accessible dialogs.
- Review identified successful-save redirects being blocked, redundant URL updates losing roster filters, profile student selection losing source pagination, and StrictMode cleanup bypassing local guards. Fixed all four; read-only follow-up found no further actionable issues. Separate shared contexts keep the host and nested forms connected during development updates. Focus/history cleanup excludes StrictMode replay, and page refresh controls are disabled while a draft or mutation is active.
- All 87 frontend regression scripts passed. After the final context adjustment, the four affected regression scripts, TypeScript, production build and both production security/artifact guards passed again. Live Supervisor filter/size/detail/return, research dirty Back/browser Back/Escape, Panel nomination dirty browser Back and submitted history detail/return pass. No academic decisions, submissions or deletions were made. Office Timeline sidebar discard, Registry profile/registration return, and capacity availability form/default return pass. Research History → request → profile → changed student → Back restores the original view/search/page/size. Appointment direct reload passes; at 390 px the detail has one h1, no tabs and no document overflow. Saved record-appointment-desktop.png and record-appointment-mobile.png outside the repo and restored the Lecturer desktop view. Git diff whitespace check passes.
- Live acceptance used available demo records and did not execute real saves, repairs, publication or academic decisions. Supporting nominations and pending Panel reviews were not populated for live checks; their render/permission regressions remain covered by the test suite. Local editors are transient and reload to the owning list; they do not gain new bookmarkable record endpoints. Dormant, unused legacy drawer exports remain; active call sites use the new frames.
- Changes remain uncommitted on codex/portal-consistency-and-toast. This navigation follow-up adds no dependencies, backend/schema or authorization changes; earlier authorised uncommitted changes are preserved.

## Lecturer table typography correction (2026-10-11, complete)

- Replaced the new table's bespoke typography overrides with the portal's existing data-table/data-th/data-td/data-td-strong styles across all three Lecturer tabs. Headers and body cells now inherit the standard font family, sizes, weights and casing; responsive record layout is retained.
- TypeScript, the three affected rendering regressions and production build pass. Live computed-style inspection confirms Inter with 10 px / 800 / uppercase headings and 12 px / 600 body text. Saved table-font-corrected.png; updated requirements and architecture documentation. No workflow, dependency or backend changes; work remains uncommitted on the requested branch.

## Lecturer record table refinement (2026-10-11, complete)

- Reviewed the approved table design three times and separated Waiting at this stage from Current stage. Replaced Lecturer list cards with shared desktop tables and labelled mobile records, moved references/programme detail out of request lists, and added 10/25/50 row-size controls. My supervisees retains programme and shows the lecturer's recorded team role independently of mutable capabilities. Request references remain searchable and copyable in details.
- The regression reproduced the previous card layout before implementation. All 84 frontend regression scripts pass; the five affected scripts passed again after final responsive refinements and expanded row-size/terminal-wait assertions. Final TypeScript, production build and both production security/artifact guards pass. Whitespace checks pass. No new backend, schema, dependency or authorization changes for this refinement.
- Live desktop acceptance verified the three table layouts, row-size controls, appointment reference search/detail/copy feedback, research ongoing/final waiting values and detail navigation. At 390 px, all three lists have no document-level horizontal overflow; mobile research detail/return preserves the selected page size. Restored the normal viewport. No academic decisions were submitted.
- Saved table-appointments.png, table-supervisees.png, table-research.png and mobile previews outside the repository. All three project documents updated; changes remain uncommitted on codex/portal-consistency-and-toast. Existing APIs still fetch their authorised datasets, so server-side pagination remains a separate future scaling step. No push or merge.

## Lecturer workspace presentation consistency (2026-10-11, complete)

- Standardised section headers, combined filter bars, student-first summary cards, action placement and ten-record pagination across Appointment requests, My supervisees and Research changes. One page-level Refresh replaces duplicate Lecturer card refresh controls; Requests/History sits alongside request section headings and wraps below them on narrow screens.
- Aligned descriptions, submitted dates, waiting-time text, request status labels, Review request/View request actions, Recorded progress and Cancel wording. Current supervisees retain View supervision and all existing team detail actions; workflow capabilities and embedded Student/staff defaults remain intact.
- Rendering regressions reproduced the refresh, research card and roster inconsistencies before implementation. All 84 frontend regression scripts pass across the full run and corrected audit-wording rerun; the five affected scripts passed again after the final responsive refinement and roster pagination assertion. Final TypeScript, production build and both production security/artifact guards pass. No new backend, schema, dependency or authorization changes were needed for this follow-up.
- Live desktop/mobile acceptance covered shared controls, research Requests/History, search, Refresh, detail navigation, unsaved endorsement Cancel, and supervisee search/detail/return. Mobile research and supervisee lists have no document-level horizontal overflow. No academic decisions were submitted. Saved consistent-appointments.png, consistent-research.png, consistent-supervisees.png and mobile previews outside the repository; restored the normal browser viewport.
- Updated all three project documents. Changes remain uncommitted on codex/portal-consistency-and-toast for review; no push or merge.

## Lecturer request workspaces (2026-10-11, complete)

- Completed the approved Appointment requests / My supervisees / Research changes structure. Appointment and research areas have separate Requests/History controls; primary/supporting appointment requests share review panels; Coordinator-pending requests remain visible with recorded progress. Detail Back actions sit below the stable module navigation. Supervisory team details retain their own distinct section heading.
- Regressions reproduced accepted and Coordinator-rejected primary requests being labelled Approved, and semester filtering dropping pending primary rows. Corrected the API projections and consistent semester labels. Independent review also identified stale supporting permissions on Retry and missing applicant dossier access; both are fixed. Follow-up review found no remaining actionable issues.
- Verification passed all 84 frontend regression scripts, TypeScript, production build and both production security/artifact guards; the affected rendering regressions, TypeScript and build/guards passed again after final wording refinements. All 45 supervisor/co-supervision backend tests pass; Django check and migration dry run pass with no schema changes. No dependencies or authorization changes.
- Read-only desktop acceptance covered combined queue, semester filtering, Coordinator progress, primary deep link/close, final appointment History, research search/detail/profile/history/reload and contextual return, and supervisee roster/detail. At 390 px, research History and appointment queue have no horizontal overflow; the panel fits the screen and Escape returns focus. No working academic decisions were submitted. Supporting populated states are covered by backend/rendering tests; there were no live supporting nominations for a populated browser check.
- Saved appointment-workspace.png and mobile-request-progress.png previews outside the repository. Updated all three project documents and the implementation plan. Changes remain uncommitted on codex/portal-consistency-and-toast for review; no push or merge.

## Request history helper-card removal (2026-10-11)

- Removed the requested Supervision Policy and Need Assistance cards from Supervisor Request History, including the hard-coded capacity claim and assistance address. Request data, filters, pagination, details and supporting history remain intact. Requirements updated; architecture checked with no structural or API change required.
- TypeScript and the existing workspace rendering regression pass. Live Lecturer history reload confirms both cards are absent and request records remain visible; saved supervisor-history-helpers-removed.png. No workflow data changed.

## Supervisor nested page header correction (2026-10-11)

- Fixed the screenshot's double history heading and Back action below the module navigation. Lecturer Request History now has one page heading and Back to Requests above it. Student/Lecturer research detail, profile and form pages use the same hierarchy; standalone component headers and other staff defaults remain available.
- Added actual container-rendering assertions to the existing workspace regression; the history assertion reproduced two h1 headings before the correction. Final verification passes all 82 frontend test files, TypeScript, production build and both production security/artifact guards.
- Live desktop checks verify the Lecturer history header, Back navigation and research detail, plus Student research detail and Back navigation. History has no document-level overflow at the 1280 px viewport. Saved supervisor-history-header-fixed.png. Only navigation/authentication changed; no workflow mutation was submitted. No backend or permission changes were made; new mobile acceptance is not claimed.

## Supervisor workspace page separation (2026-10-10)

- Completed the approved page split: Student My supervisors / Applications / Research changes; Lecturer Requests / My supervisees / Research changes. Compact lists open individual application, supervision and research details. Current profile/revisions and the permitted research form have dedicated views; useful guidance stays visible in the relevant section. Staff record buttons now read View student record; Student evaluations remain absent.
- Added deep-link, active-navigation, pending/completed partition and routed team/research rendering coverage. Updated the existing waiting-time integration check to follow the extracted application component. Final verification passes all 82 frontend test files, TypeScript, production build and both production security/artifact guards on 2026-10-11. No backend code, API, schema or dependency change required a new backend test run.
- Independent review identified lost visibility of accepted supporting nominations awaiting Coordinator approval and obsolete Lecturer request loads reopening drawers after navigation. Fixed both; the strengthened nomination-history regression failed before the correction and passes after it. Follow-up review found no remaining actionable issues; the async drawer correction was source-reviewed rather than tested with browser network delays.
- Read-only 1280 px browser acceptance covers Lecturer roster search, supervision detail/record navigation and reload, research request comparison/endorsement-form availability, selected profile history, Student overview/application drawer/research list/detail/reload/profile/replacement and cancellation-form availability. Office/Coordinator retain embedded workspaces and redirect unsupported new detail routes to their existing root. Student shared typography and document bounds pass; no new mobile acceptance or exhaustive all-role visual audit is claimed.
- Saved student-supervisor-pages.png, lecturer-supervisees-page.png and research-change-detail-page.png previews. Browser checks changed authentication, navigation and unsaved form state only; no application, nomination, cancellation or decision was submitted. Existing pending development requests remain untouched. Work stays on codex/portal-consistency-and-toast for the user's later merge; no push or merge is performed.

## Report filter clarity and Lecturer usefulness (2026-10-10)

- Follow-up scope clarification: renamed the Lecturer total to Records involving you and added a description of authorised workflow records, shared milestones, record counts and waiting stages. Office/Coordinator wording and all backend permissions are retained. The existing focused reporting rendering test and TypeScript pass; live Lecturer inspection confirms the new label and scope paragraph. Saved lecturer-report-scope-clarified.png. This follow-up changes presentation only and introduces no new tests or backend changes.
- Found the screenshot's borderless controls used the undefined form-input class. The new rendering regression failed on that Lecturer filter before implementation. Migrated all remaining consumers across Reports, Capacity, Participant Lifecycle and Reconciliation to the defined shared controls.
- Reports now expose an explicit filter form, applied scope/draft-change notice and clearer actions. Lecturer action cards and attention records precede optional statistics/breakdowns, preserving original reporting and export features.
- Found pending research amendments counted as waiting but omitted from the actionable attention list. A role-scoped API regression reproduced the omission; included existing authorised amendment rows in the shared attention projection used by JSON/XLSX.
- Verification passes all 80 frontend test files, all 12 backend dashboard reporting tests, final targeted rendering regression, TypeScript, production build and both production security/artifact guards. Focused read-only review found no actionable introduced issues. The backend amendment regression uses an isolated disposable database.
- Live desktop checks cover Lecturer semester draft notices, Apply/Reset, waiting-table anchor, Marks navigation, preserved breakdown disclosure and viewport bounds; Coordinator/Office retain visible reporting statistics and role-specific filters. Capacity, participant lifecycle and reconciliation controls have shared classes and visible borders in the Office browser view. Native date automation did not commit edits, so no live date-validation or mobile acceptance is claimed; existing date validation/report tests remain passing. This is scoped verification of the changed controls, not an exhaustive visual audit of every portal page.
- Restarted the local backend; direct and proxied health checks pass. Saved lecturer-workflow-reports-improved.png as the preview. Browser verification changed only authentication and report/view filters; no application, cancellation, approval, capacity policy or participant record was changed. Changes remain on codex/portal-consistency-and-toast for the user's later merge; no push or merge is performed.

## Cancellation audit response correction (2026-10-10)

- Reproduced the reported cancelled Student request showing Audit History (1): the new cancellation event was persisted, but the API serialized the pre-mutation prefetched history. Extended the existing cancellation regression; it failed with only SUBMIT in the response instead of SUBMIT/STUDENT_CANCEL.
- Added targeted workflow-history cache invalidation to the shared Supervisor/Panel audit writer so successful mutation responses include the new event while preserving unrelated prefetched relations and the original returned event. Existing cancelled requests require no data repair; an already-open client can refresh once to discard its old response.
- Verification passes all 57 backend Supervisor/Panel workflow, role-integrity and document tests, plus a focused rerun of the strengthened immediate-response regression with actor, timestamp, reason, status transition and fresh-detail agreement assertions. Tests use an isolated disposable PostgreSQL database. Focused read-only code review found no introduced issues; whitespace checks pass. No frontend code, dependency or schema changes were needed.
- Restarted the local backend and verified direct/proxied health checks. Live Student inspection of existing cancelled SV-APP-00007 shows Audit History (2), Submit and Student cancel with the persisted reason and status transition. Saved supervisor-cancellation-audit.png as the preview. No new development cancellation/application/approval was performed, and the pending Coordinator request remains intact. Changes are saved on codex/portal-consistency-and-toast; no push or merge is performed.

## Student application clarity and duplicate-submit correction (2026-10-10)

- Replaced the misleading active-first indicator with three equal section links. Added an explicit Selected marker, accessible pressed state, selected Supervisor summary, toggle deselection and Clear selection. The footer now uses shared visible Appointment guidance with two necessary application rules.
- Added a same-form in-flight submit guard and a server pending-request recheck under the existing Student row lock. The PostgreSQL concurrency regression reproduced the prior unhandled duplicate-constraint error before the fix; afterward competing submissions return 201/400 and create exactly one request/document/event/notification, with no active appointment. Database uniqueness and the existing final-approval workflow remain intact.
- Verification passes 44 backend concurrency/workflow/role-integrity tests, all 79 frontend test files, the tightened rendering assertions, final TypeScript/production build and both production security/artifact guards. Authenticated 1280 px browser checks confirm equal section-link typography, section navigation, click/keyboard toggling, clear selection while filtered out, visible two-card guidance and no horizontal document overflow. No mobile live acceptance is claimed for this change.
- Restarted the local backend with the new lock recheck; direct and frontend-proxied health checks pass. Saved supervisor-application-selected.png and supervisor-application-selection-guidance.png as previews. Browser checks used only unsaved selection/search input; no application, cancellation or approval was submitted. Backend tests used an isolated disposable database and temporary media, preserving the current Student test request awaiting Coordinator review.
- Focused read-only code review found no critical or important introduced issues. The same-form in-flight ref guard has source review; concurrency is exercised by the server API test rather than a deferred frontend double-submit/retry test. Changes remain on codex/portal-consistency-and-toast for the user's later merge; no push or merge is performed.

## Shared toast correction and feature branch (2026-10-10)

- Moved the complete existing local working tree from main to codex/portal-consistency-and-toast and verified the tracked/untracked status was preserved by the branch switch. This includes the prior role typography, Student privacy/record changes, Student/Lecturer appointment layouts and the other tool's application-validation toast integration.
- Replaced the error X-in-a-circle with an exclamation status icon and retained one dismiss button. Shared toasts now use a restrained solid-white surface, smaller status treatment, supporting-text typography, bounded wrapping and keyboard-visible dismissal focus. Corrected notification lifecycle so a cleared/dismissed error can return, and cancelled obsolete application timers to prevent a newer message disappearing early.
- The new SSR regression first failed on the duplicate-looking error X and passes after the fix. All 78 frontend regression files, final TypeScript, production build and both production security/artifact checks pass. Live Student application checks pass for one close symbol, consistent 12 px/500 Inter text, viewport bounds, dismissal, identical repeated error and old/new timer deadlines. This is a desktop 1280 px browser check; narrower layouts use the explicit CSS bounds and source/regression evidence rather than a new mobile browser acceptance claim.
- The Student test account had already progressed to a request awaiting Coordinator review before these checks. Verification used only incomplete-form validation and unsaved input, with no request, cancellation or approval submitted. Saved portal-toast-improved.png as the visual preview. Existing development accounts/credentials and workflow data are retained; local database fixtures are independent of Git branch history. No push or merge is performed.

## Fresh Student manual-testing account (2026-10-10)

- Provisioned a separate local development Student, `student.e2e.20261010@example.test` / `E2E-STUDENT-20261010`, named Student Test 10 October, with an Active Cyber Security profile in Semester I 2026/2027. The existing Demo Programme Coordinator manages that programme; no delegation or authority change is needed. Fictional registry details support the existing letter-details endpoint. Existing Demo Student One and other accounts remain unchanged.
- The account starts without Supervisor requests, appointments or a research profile. Its generated password is hashed in Django and retained only in an ignored local credential file; no credentials are recorded in project documentation or tracked source. No request or approval was submitted during setup.
- Verified email and matric-number login through the running frontend proxy, empty request records, absent Student Marks, denied staff Marks and foreign Student dossier access, own letter details, an effective Active semester, existing Coordinator programme scope and the available Demo Lecturer Supervisor candidate. The supplied one-page fictional proposal passes the existing required-document validator and was rendered for visual inspection.
- The user receives the step-by-step testing instructions directly in chat. Letter generation currently needs an Office-created Active template (none exists); general Files and FAQ retain their documented integration limitations. Semester milestones remain the shared Office schedule and do not represent this new Student's individual research completion. Requirements and architecture were checked: provisioning uses existing models/authentication and introduces no business-rule, schema, API or implementation change.

## Lecturer expanded supervisory cards (2026-10-10)

- The user's expanded screenshot exposed density inside the team card and the redundant Appointment history → Timeline and progress disclosures. Implemented Student-style current primary/supporting cards, one expandable full research profile, retained supporting appointment histories/actions and structured appointment activity. Office-managed shared semester dates now have their own disclosure and explicit progress limitation.
- Traced data to existing co_supervision.serialize_team: primary/Panel application latest status and updated timestamp, supporting audit events, and current active Office semester timeline rows targeted at Students. The Demo milestones are the fictional records populated in the earlier preview; no new records were created. Existing Student and Office/Coordinator branches and authorization remain intact.
- Regression first reproduced the mixed-source/nested timeline before implementation; source separation and action-capability checks now pass. All 77 frontend regression files, TypeScript, production build and both security/artifact guards pass. Student and Office/Coordinator compatibility uses retained branches and rendering/source regressions; no backend changes required a new backend run.
- Live Demo Lecturer Supervisor acceptance passes for the default card, expanded full profile, four appointment rows separated from four semester dates, clear source explanation and the existing nomination form with ineligible candidate/submit disabled. Computed-style checks pass in all inspected states (up to 97 role elements), with no document-level overflow at the actual 1280 px viewport or browser warnings/errors. No nomination or decision was submitted. The earlier browser-resize limitation still applies; this pass does not claim new mobile acceptance.
- Saved lecturer-team-card-simplified.png and lecturer-team-activity.png, left the concise expanded team available in the browser and updated all three mandatory documents. Changes remain uncommitted.

## Lecturer Supervisor/Panel consistency and restructuring (2026-10-10)

- Implemented matching appointment sections, summary/member cards and visible useful guidance for both Lecturer modules. Supervisor now orders review work before active supervisees, research requests and teams. Panel orders selected-member reviews before supervisee nominations and assignments; compact selection replaces repeated cards/filler. Both rosters have real search fields.
- Lecturer research comparisons/history are compact and expandable with all recorded audit events and eligible actions retained. Active supervisees now use their linked current research profile; original application history remains intact. No stored demo data, schema, credentials or authorization changed.
- Independent review found that parent refresh could discard research/team selection and drafts. Corrected by keeping those sections mounted with separate data-refresh versions; follow-up review confirms the fix. Live UI-only regression preserves the selected student and unsent decision draft through refresh. No decision, nomination, cancellation or approval was submitted.
- Verification passes all 77 frontend regression files, 14 backend research-amendment tests in a unique disposable PostgreSQL database, TypeScript, production build and both production security/artifact guards. Final visual inspection compacted the empty pending card and corrected wrapped identity/date columns; all six populated roster action buttons now fit the desktop container. The full suite passed before that final table-only adjustment; focused Lecturer tests, TypeScript/build/security and live computed-style/layout checks pass afterward.
- Authenticated 1280 px checks cover Demo Lecturer Supervisor and Demo Panel Lecturer, visible two-card guidance, current research values, endorsement form/focus, initial/title history, Panel replacement form/required reason, both roster searches and the assignment detail route. Default/expanded research, Panel list and replacement/detail views have no typography mismatches or document overflow. Selected Panel review queues are empty in these local fixtures; populated review behavior uses existing regression/source coverage. Office/Coordinator compatibility is covered by existing tests and focused source review, not an exhaustive new live audit.
- Browser viewport controls returned successfully but repeatedly left both existing and fresh tabs at 1280 px; new 390 px acceptance is therefore unverified. Overrides were reset and the extra resize-test tab closed. An editing-time React hot-reload dependency-array warning did not reproduce in a fresh authenticated tab, which has no console warnings/errors.
- Updated all three mandatory project documents. Saved lecturer-supervisor-consistent.png and lecturer-panel-consistent.png in the task visualization directory; local backend restarted to load the current-profile API and Demo Lecturer Supervisor restored on the Supervisor page. Changes remain uncommitted.

## Student initial research history correction (2026-10-10)

- Implemented the approved initial-profile layout and consistent history cards. The live regression reproduced three unnecessary Previously boxes before the fix. No stored records or API permissions changed. All five focused frontend regression suites, TypeScript, the production build and both security/artifact guards pass. The live history regression now passes at 390 and 1280 px; computed typography checks all 50 visible role elements with no mismatches or horizontal document overflow. Staff full comparisons remain covered by the rendering regression. Browser console has no warnings/errors; temporary viewport overrides were reset. Saved student-research-history-cards.png and student-research-history-consistent.png in the visualization directory; retained the Student page for review. Changes remain uncommitted.

## Student research change form preview (2026-10-10)

- Rendered the existing ResearchAmendmentForm component with the synthetic Demo Student One profile into a standalone local preview at 127.0.0.1:3002. The preview has no API submission handler, displays the title/abstract/reason fields, and leaves the pending amendment unchanged. Saved research-change-form-preview.html and .png in the task visualization directory and opened the browser preview for the user.
- Requirements and architecture remain unchanged; no production code, permissions or database records were modified. The temporary render script was removed after creating the artifact.

## Student Supervisor/Panel consistency and visible guidance (2026-10-10)

- Implemented shared Student appointment section/member/guidance components. Panel now follows the compact Supervisor layout, preserving confirmed contact/appointment information and the public pending-state boundary. Both pages expose guidance without expansion and use the same refresh/FAQ controls.
- Supervisor guidance reads configured document labels/requiredness and existing upload limits, with the recorded replacement rule for assigned supervisors. Panel guidance is specific to its five readiness states. Removed generic process, repeated confirmation, lock placeholders and large help cards. No demo records or staff business workflows were changed.
- Verification passes all 76 frontend regression files, TypeScript, the final production build and both production security/artifact guards. The authenticated guidance regression failed before implementation and passes afterward. SSR checks cover all four pending Panel states with deliberately populated private fields, confirmation mismatch, configured required/optional documents and empty/error guidance.
- Live Demo Student One checks pass on both pages at 390 and 1280 px: visible guidance, refresh recovery, shared computed typography and no horizontal document overflow. The Supervisor refresh action reloads applications and remounts the team so View/Change actions, history and guidance use updated records. View appointment opens the current application 6. No submission, cancellation or approval was executed; pending states and guidance failures are covered by rendering tests rather than simulated live records.
- Mobile visual inspection exposed Previous applications text squeezed to 19 px by action controls. Rows now stack text above actions below sm; the width regression and visual inspection pass. Focused read-only review verified the refresh fix and found no material remaining issues. Staff compatibility uses the unchanged branch plus existing regression/source coverage, not a new exhaustive staff browser audit.
- Updated all three mandatory project documents. Saved student-supervisor-consistent.png and student-panel-consistent.png in the task visualization directory; reset temporary viewport overrides, retained the Panel preview and confirmed no browser warnings/errors. Changes remain uncommitted.

## Student Supervisor page simplification (2026-10-10)

- Implemented the approved three-section Student layout. Removed the erroneous self-selection dropdown and duplicate Student team timeline; compact research cards expand to show changed fields, reasons and recorded approval events. Previous applications use responsive rows with the existing workflow drawer. Supporting histories, research profile/revisions, guidance, cancellation and eligible submission remain accessible.
- Replaced the misleading current-title display from a historical Supervisor application with the current research profile title. Staff presentation and authorization retain their existing behavior; no demo records were changed in this task.
- Verification passes all 75 frontend regression files, TypeScript, production build, both production artifact/security guards, whitespace and UTF-8/CRLF checks. The new Student request regression failed before implementation and passes afterward. An existing case-sensitive Change Supervisor contract caught a changed label; the original label was restored and the full suite rerun successfully.
- Live Demo Student One checks pass at 390, 902 and 1536 px for the pending-request overview, closed comparisons, expanded abstract/title/profile histories, cancellation reason focus/validation and original application drawer. Computed typography passes in default and expanded states with no document-level horizontal overflow. No cancellation, submission or approval was executed.
- Live populated Lecturer compatibility checks retain the staff Student selector, full comparisons, Endorse/Reject controls and consistent typography (94 checked elements). Other staff compatibility is covered by shared-component regressions and explicit role wiring/source review; this is not a new exhaustive staff browser audit.
- Restored Demo Student One on Supervisor Appointments, with the viewport override reset and no browser warnings/errors. Preview: student-supervisor-simplified.png in the task visualization directory. Updated all three mandatory project documents. Changes remain uncommitted.

## All-role typography audit and correction (2026-10-10)

- Audited all 109 production portal components across Student, Lecturer, Programme Coordinator, Office Staff/Admin, shared controls and authentication. Corrected inherited and nested styles, responsive overrides, detail metadata, table/control text, shared semester fields and equivalent summary counts.
- Rendered checks pass for 53 role/page combinations and 67 page/state checks, including populated appointment details, expanded Student research/request histories, Office Panel audit history and representative mobile/wide widths. A computed-style regression caught and verified corrections for File Repository filters and populated Office Timeline/workload/Panel tables.
- Final verification passes all 75 frontend regression files, TypeScript, production build, both production artifact/security guards and whitespace checks. The complete evidence/limitations report is `docs/PORTAL_TYPOGRAPHY_ACCEPTANCE_2026-10-10.md`.
- Registry reads still return an existing backend 404; its controls/error states pass, while populated Registry data remains unverified in-browser. The scoped Coordinator queues and Lecturer Marks page are empty in these fixtures; corresponding populated forms remain source-reviewed and regression-covered. These are explicit limits, not claims of exhaustive browser acceptance.
- Preserved existing workflow/data/privacy changes, intentionally distinct document/identifier/badge/editor styles and credentials. Restored the browser to Demo Student One on My Academic Record. Changes remain uncommitted.

## Populated Supervisor typography correction (2026-10-09)

- The earlier explicit-heading/paragraph audit missed inherited `text-sm`, unstyled summaries and nested labels in populated Supervisory teams and Research amendments. The earlier claim of complete font consistency was too broad; the user's populated screenshot exposed the gap.
- Corrected shared team/research comparison, reason, timeline, request/revision/audit history and decision-form styles. Student and staff consumers share those components. Also corrected the same inherited pattern in staff carryover capacity cards and aligned Student Supervisor hero/application-detail metadata and table text with the existing roles. Controls, status colors, workflow behavior and authorization are retained.
- Live verification checks 115 computed text elements in the populated Student team/research view, including expanded histories: Inter with 14 px/800 compact headings, 12 px/600 labels, 12 px/700 values and 12 px/500 supporting text. Fifteen application-detail fields and the decision textarea also match their shared roles; normal metadata/title text no longer inherits uppercase/italic styling.
- Responsive inspection revealed that the supervisor hero squeezed its metadata to 40.8 px at the default 902 px viewport. Identity, metadata and actions now stack below 2xl. Verified full-width metadata at 390 px and 902 px, and a readable row at 1536 px, with no document-level horizontal overflow. Browser console has no warnings/errors. Captured the corrected populated page as `supervisor-typography-corrected.png` in the task's visualization directory.
- All seven focused frontend regression suites pass. Final TypeScript, production build and both production artifact/security checks pass after the breakpoint adjustment. Whitespace validation passes. Independent source reviews found no actionable issues in these four components or the breakpoint correction. Staff coverage in this correction uses shared components, capability regressions and source review; it is not exhaustive browser acceptance of every staff page. No database, API or dependency changes were required.

## Demo Student One populated preview (2026-10-09)

- At the user's request, populated local development account `DEMO-STUDENT-001` with two Supervisor requests (rejected and approved), one active primary Supervisor, two Panel nominations (rejected and approved), one active Panel appointment, and an approved research profile. Each Supervisor request includes a clearly marked fictional PDF proposal uploaded through the existing validated private-document endpoint.
- Added one approved research-title amendment and one pending abstract amendment using the existing amendment services. The Student Dashboard now has four persisted action items: the pending research request and three active/upcoming milestones. Student academic-record tabs remain Supervision, Panel and Milestones; the Student API still returns null Marks data and no Marks section.
- Added four explicitly labelled demo Student milestones to the current `2026-2027-S1` semester: one completed, one active and two upcoming. Timelines are semester-wide, so these entries also appear for other local Students in the active semester. The previous legacy timeline remains unchanged.
- Created a separate AI programme demo Coordinator profile to perform the required scoped approvals; the existing Cyber Security Coordinator scope is unchanged. The new demo Coordinator has an unusable password, and existing account credentials/permissions were not changed. Existing Supervisor/Panel capacity policies, normal authorization, approval services and audit generation were retained.
- Verification: authenticated endpoint reads, persisted public/internal dossier assertions and a repeated seed run pass; the second run creates no duplicates. Live Student browser checks show populated Supervision/research, Panel and Milestone records. No application code, schema or dependency changes were required; the three governance documents were checked and existing requirements/architecture remain applicable.

## Student evaluations belong to the central system (2026-10-09)

- Source review found older PDF FR-30/UC14 allowing evaluation-task information and UC06 mentioning linked Marks records. The Student dossier exposed redacted task periods/status/deadlines. The user's clarified boundary supersedes that older wording: students view evaluations/results in the university's central system, outside this portal.
- Completed: excluded Student Marks at the backend access boundary and in frontend PUBLIC tabs/rendering, preserved staff Marks access, removed evaluation wording from student copy, and updated the three source-of-truth documents plus acceptance checklist W033/W038. The earlier academic-record acceptance entry below describes the previous behavior; its Evaluations tab is superseded by this correction.
- Regression tests reproduced the old disclosure before the fix and now assert that populated and unprofiled Students receive no Marks section/status/attention and that stale PUBLIC section lists cannot render Marks. All 42 backend dossier/report/dashboard-timeline tests pass in 234.016 seconds using a uniquely named disposable PostgreSQL test database; four focused frontend tests, TypeScript, the final production build, both production artifact/security checks and whitespace validation pass. Review's remaining student empty-state copy finding is corrected. Live Student browser verification shows only Supervision, Panel and Milestones, with no console warnings/errors. Original academic PDFs await revision from editable sources; no schema, stored evaluation or staff workflow changes were made.

## Wider portal typography review (2026-10-09)

- Audited equivalent explicit card/section headings and supporting paragraphs across portal components. Replaced 346 matching styles across 70 components with shared heading/supporting roles; additionally aligned shared summary/audit/validation/workload cards and student Settings, appointment metadata and letter-template descriptions.
- Added compact caption and summary-metric roles, and loaded Inter 900 for existing black-weight emphasis. Kept identifiers, badges, controls and document previews distinct and preserved all workflow behavior and data.
- Verification: all 73 frontend regression test files, TypeScript checks, the production build, both production artifact checks and the whitespace check pass. Independent review found no actionable issues in the role/style changes, semantic colors or document-preview exclusions.
- Live Student Settings inspection confirms Inter with 12 px/600 labels, 12 px/700 values, 12 px/500 descriptions and 14 px/800 compact headings. Student Panel desktop/mobile inspection confirms readable metadata/guidance, retained light text on the dark card and no document-level horizontal overflow at 390 px. Browser checks sample the Student surfaces; the broader staff modules are covered by source review and existing regression checks rather than a claim of exhaustive visual acceptance.

## Student academic record and typography (2026-10-09)

- Updated the Student Dashboard link and student progress route to "View My Academic Record" / "My Academic Record". Student records open on supervision history rather than a duplicated overview, while staff dossiers retain their operational summaries and attention items.
- Moved public "Enrolment Status" into the identity card and hid the change-date row when no persisted change exists. Internal lifecycle reason, actor and audit history remain available; public privacy guards and Malaysia timestamps are retained.
- Added shared card text styles and applied them to affected student dashboard and academic-record metadata. Kept supervision, supporting-supervisor, research/programme changes, panel, evaluation and milestone records on their existing routes and APIs.
- Verification: regression tests first reproduced the misleading absent-date row and repeated student Overview, then passed after implementation. All 73 frontend test files, TypeScript checks, the production build and both production artifact checks pass. Independent diff review found no actionable regression.
- Live browser smoke on `127.0.0.1:3001` confirms Student Dashboard navigation, the first selected Supervision tab, absent-date suppression, and working Panel/Evaluations/Milestones tabs. Desktop and 390 px mobile layouts were inspected; mobile has no document-level horizontal overflow and the browser console has no warnings/errors. This demo student has no appointment/evaluation history, so populated record rendering was not newly exercised in the browser; existing regression suites remain the evidence for those paths. No backend or database changes were made.

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
