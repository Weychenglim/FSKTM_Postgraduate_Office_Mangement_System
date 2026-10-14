# File Management Module Plan (UC24 to UC27)

Date: 2026-10-14. Owner: Xiang (File Management).

**Status: planned, waiting for Xiang's review. Nothing is built yet.**

This plan replaces `2026-10-11-file-management-module.md`, which was written before the supervisor's 2026-10-14 direction:
- staff can upload and share files too;
- students see only their own uploads;
- tagging by student comes first.

The old file is deleted once this plan is approved.

A clickable mockup of the screens comes with this plan. After Xiang's review, the design was simplified: the UI and UX come first, so each screen does one job and shows only what is needed.

## 1. What It Looks Like

Seven screens, all in the portal's current look.

| # | Screen | Who | What it does |
|---|---|---|---|
| 1 | Files | Office and lecturers | One search box and a simple list. Tabs: All files, To check, Required documents, Staff files. Clicking a student's name shows every file about that student. |
| 2 | A file | Anyone who can see it | Big preview, short details, and who it is shared with. For the office, Accept or Return when the file is waiting. |
| 3 | Upload (staff) | Office, lecturers, coordinators | Choose the file, say what it is, pick the students, and tick who to share with. |
| 4 | Document types | Office | Each type: who can upload it, who can see it, whether the office checks it, and whether every student must hand it in. |
| 5 | File Submission | Student | A short to-do list, "My files", and "Letters from the office". |
| 6 | Upload (student) | Student | Choose the file and say what it is. The screen shows who will see it. |
| 7 | The student page on a phone | Student | The same as screen 5, stacked. |

**Design rules that keep it simple:**
- **One main button per screen**, for example "Upload file" or "Accept".
- **Lists show only:**
  - what the file is (title, type, tags);
  - who it is about;
  - when it came and who uploaded it;
  - a status only when someone needs to act (Waiting for office, Returned, Accepted).
- **Rare actions sit behind a "⋯" menu:** new version, edit, change sharing, archive, delete.
- **Bulk download** appears only after pressing "Select".
- **Optional upload fields** sit under "More options": title, semester, note.
- **Two filters stay visible** (type and semester). The rest are under "More filters", including archived files for the office.
- **Plain words:** "Waiting for office", "Returned", "Accepted", "Shared with".

## 2. Decisions

Xiang's answers on 2026-10-14:

| # | Question | Answer |
|---|---|---|
| 1 | Document types | Office-managed list. "Letters" covers letters students requested and the office approved (shown automatically) and letters they upload. |
| 2 | Files not about any student | Allowed, as "staff files". |
| 3 | One file, several students | Allowed for staff uploads. |
| 4 | Keyword tags | Yes, with suggestions. |
| 5 | What students see | Only their own uploads, plus their approved letters. |
| 6 | Who sees a student's files | Set per type by the office. |
| 7 | Sharing staff uploads | The uploader ticks who to share with. |
| 8 | Office checks | Only for types the office switches on. |
| 9 | A wrong upload | The uploader can delete it at any time, or upload a new version. |
| 10 | Notifications | Notices for decisions, for sharing, and to supervisors when their student uploads. |
| 11 | Required documents | Yes. |
| 12 | Supervisor application files | Yes, if Wey Cheng agrees. |
| 13 | Linking files to appointments | Light version, as the last optional step. |
| 14 | Excel and PowerPoint | Yes, for staff. |
| 15 | Size limit | 10 MB. |
| + | The uploader chooses the type | Yes. |

**Simplified after the review on 2026-10-14:**
- **Sharing is a simple tick per group:** supervisors, panel member, programme coordinator. There is no "view only": anyone who can see a file can also download it.
- **Who sees a file:**
  - A type only sets the starting ticks.
  - Staff can change the ticks when they upload.
  - A student's upload always follows its type.
- **Nine starting types** instead of nineteen. The office can add more.
- **Checking happens on the file's own page,** because you need to look at a file before accepting it. "To check" is a tab in Files.
- **Required documents** is a tab in Files, not a separate page.
- **Archived files** sit under "More filters", and deleted files in the office's history, not in their own tabs.

## 3. Please Confirm

1. **Staff files are for staff only.** Students never see them. To send a file to students, use an Announcement.
2. **Approved letters** are seen by the student and the office only, as now.
3. **Excel and PowerPoint** are for staff uploads only. Students upload PDF, Word, JPG and PNG.
4. **Deleting** removes a file and its versions for everyone. The office's history keeps one line (who deleted which file and when), not the file.
5. **The "Supervisor Appointment Form"** is the signed Registration of Dissertation/Research Project form.
6. **Only the office** accepts or returns uploads.
7. **Only Active students** can upload, the same rule as letters.
8. **Item 12 needs Wey Cheng's agreement** before Phase 8.

## 4. How It Works

### 4.1 Two kinds of file
- **Student file:** about one or more students. A student's own upload is always about just that student.
- **Staff file:** not about any student, for example a rubric, a template or meeting notes. Staff only.

### 4.2 What every file has
- **The file itself.** One file per upload, up to 10 MB:
  - PDF, Word, JPG or PNG;
  - Excel and PowerPoint as well for staff.
- **Type** (the report's "Category"), chosen by the uploader from the office's list.
- **Group** (the report's "Module"), taken from the type, so nobody types it.
- **Students** (the report's "Student ID").
- **Semester:** filled in automatically; staff can change it under "More options".
- **Title:** taken from the file name, and editable.
- **Tags:** optional. Suggestions come from tags already used, and capitals are ignored, so "Signed" and "signed" are one tag.
- **Reference:** for example `DOC-2026-000123`, shown after the upload.

### 4.3 Who can see what

| Person | Student files | Staff files |
|---|---|---|
| PG office | All of them | All of them |
| The uploader | Their own uploads | Their own uploads |
| The student | Their own uploads only, plus approved letters | Never |
| Supervisor or co-supervisor | Their students' files, when shared with supervisors | When shared with lecturers |
| Panel member | Their panel students' files, when shared with the panel | When shared with lecturers |
| Programme coordinator | Files of students in their programme, when shared with coordinators | When shared with lecturers or coordinators |
| Any other lecturer | Nothing | When shared with lecturers |

- **The ticks.** "Shared with" is three ticks: Supervisors, Panel member, Programme coordinator.
- **Who sets them:**
  - The type sets the starting ticks.
  - A student's upload follows its type, even if the office changes the type later.
  - Staff can change the ticks when uploading, and their choice stays.
  - The office can change any file.
- **Several students on one file.** The ticks reach the supervisors, panel members and coordinators of every student on the file.
- **Staff files.** The uploader picks one of:
  - all lecturers and coordinators;
  - coordinators only;
  - the PG office only.

  They can also narrow it to chosen programmes.
- **Ended appointments.** When an appointment ends, that lecturer stops seeing the student's files, except the ones they uploaded.
- **Archived files** are seen by the office only.
- **Files someone may not see** answer like missing ones: "This file isn't available to you."

### 4.4 Checking
- **Which files wait.** For a type the office checks, uploads from anyone except the office wait in "To check".
- **Deciding.** The office opens the file, looks at it, and presses Accept, or Return with a reason. The reason is required.
- **After a return.** The student sees the reason on their to-do list and uploads again, which makes a new version.
- **A new version always waits again.** This applies even to an accepted file.

### 4.5 Versions and deleting
- **New versions.** "Upload a new version" is in the ⋯ menu. Older versions are kept and listed on the file page.
- **One per student.** For types such as the Thesis, a student's next upload becomes a new version of their existing file, and the upload screen says so.
- **Deleting.** The uploader can delete their own file at any time. It is gone for everyone, including older versions.
- **Archiving.** The office archives instead of deleting other people's files (UC27), and can restore them.

### 4.6 Notifications (in the app)

| When | Who | Email too? |
|---|---|---|
| A staff file is shared with someone | Each person it reaches | No |
| A student uploads a type their supervisors can see | Their supervisor and co-supervisors | No |
| A file is accepted or returned | The uploader | Yes, when "Email alerts" is on |
| The office presses Remind | Students still missing a required document | Yes, when "Deadline reminders" is on |

The office sees the "To check" count instead of a notice for every upload.

### 4.7 Required documents
- **Marking a type.** The office ticks "Every student must hand it in" on a type and adds a due note.
- **Students** see it on their to-do list until it is done. Returned files are on the list too.
- **The office's "Required documents" tab** shows each required type:
  - how many students are done, how many files are waiting, and how many students still need to hand it in;
  - the names, on request;
  - a Remind button, which sends at most once a day.
- **Coordinators** see the same for their programmes, without Remind.

### 4.8 Letters
- **Students.** File Submission shows "Letters from the office": the letters they requested that the office approved, with View and Download.
- **The office.** The office sees them on the student's header in Files.
- **Where letters live.** They stay in Letter Generation; this module only shows them.

### 4.9 Search
- **One box** searches student name, student ID, file name, title, tags and reference.
- **Visible filters:** Type and Semester.
- **"More filters":**
  - programme;
  - uploaded by;
  - date;
  - status;
  - file kind;
  - archived (office).
- **Clicking a student's name** shows all of that student's files, with a small header: programme, supervisor, required documents and letters.
- **No results** shows "No matching files found."

### 4.10 Supervisor application files (if Wey Cheng agrees)
The files a student attached to their supervisor application appear, read-only, in that student's view. They are visible only to people who may already see them in the Supervisor Appointment module.

### 4.11 Links to appointments (last, optional)
- **Linking.** The office can link a file to one of the student's appointments or letters, from the ⋯ menu.
- **What it changes.** The link shows on the file page, and archiving a file linked to an active appointment asks for confirmation.

## 5. Starting Document Types

The office can rename, change, switch off or add types (for example a separate "AI Use Declaration Form" if it should be required).

| Type | For | Who can upload | Shared with at the start | Office checks | One per student |
|---|---|---|---|---|---|
| Supervisor Appointment Form | Student files | Students | Supervisors, coordinator | Yes | Yes |
| Research Proposal | Student files | Students, supervisors | Supervisors, panel, coordinator | No | Yes |
| Thesis | Student files | Students | Supervisors, panel, coordinator | No | Yes |
| Turnitin Report | Student files | Students, supervisors | Supervisors, panel, coordinator | No | Yes |
| Faculty Form (AI declaration, conference form and so on) | Student files | Students | Supervisors, coordinator | Yes | No |
| Letter | Student files | Students | Nobody (office only) | No | No |
| Evaluation Form | Student files | Supervisors, panel, coordinators | Supervisors, panel, coordinator | No | No |
| Staff Document | Staff files | Lecturers, coordinators | Chosen when uploading | No | No |
| Other | Both | Everyone | Nobody (office only) | No | No |

- **Required documents** start switched off. The office decides which types are required.
- **Excel and PowerPoint** are accepted only from staff, whatever the type.

## 6. Research Notes (2026-10-14)

1. **One record per student.**
   - OnBase (Hyland) gives staff "a single, central, instantly-accessible record for any and all information surrounding every student", with a complete audit trail.
   - Staff search it by student ID or name.
   - **Taken here:** tagging by student, the student view, and the history.
2. **Types and tags instead of folders.**
   - SharePoint guidance prefers metadata over deep folders.
   - Tag inputs work best when they suggest existing tags and ignore capitals.
   - **Taken here:** office-managed types plus free tags.
3. **Show who has access.** Google redesigned the Drive sharing dialog so people can share with the right people and see clearly who has access. **Taken here:** "Shared with" is shown with names.
4. **Review flows.**
   - York University's milestone portal emails supervisors when a student submits.
   - Its reviewers either approve or return with written instructions.
   - **Taken here:**
     - checking happens on the file page;
     - Return needs a reason;
     - supervisors get upload notices.
5. **Required document checklists.**
   - Western, Florida State and McGill show each item as missing, pending or received, and a rejected upload goes back to missing.
   - **Taken here:** the to-do list and the Required documents tab.
6. **Progressive disclosure.** Rare options stay hidden until needed (⋯ menus, "More options", "Select"). This keeps the main screens short.
7. **Security.**
   - **General upload rules** (OWASP File Upload Cheat Sheet, Django's guidance):
     - allow-listed kinds and signature checks;
     - server-chosen names, and storage outside the web root;
     - re-encoded images;
     - a permission check on every download.
   - **Excel macros** hide in `vbaProject.bin`, and also in Excel 4.0 macro sheets (`xl/macrosheets/`).
   - **Previews** are drawn on the server, because the portal's security policy blocks the browser's own PDF viewer.

Sources:
- https://www.hyland.com/en/resources/downloads/one-student-record
- https://servicecenter.twu.edu/TDClient/1956/Portal/KB/ArticleDet?ID=169453
- https://enterprise-knowledge.com/folders-v-metadata-sharepoint-document-libraries
- https://www.saasui.design/blog/saas-tags-labels-chips-ux-patterns
- https://workspaceupdates.googleblog.com/2020/04/new-file-sharing-dialog-google-drive.html
- https://yorku.ca/gradstudies/wp-content/uploads/sites/184/2024/11/2024-11-26-Grad-Faculty-Proposal-Milestone-Portal.pdf
- https://welcome.uwo.ca/next-steps/apply/upload-your-documents.html
- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- https://github.com/decalage2/oletools/wiki/formats_vs_techniques
- https://fsktm.um.edu.my/forms-and-templates
- https://lawplayer.com/my/act/act-629 (National Archives Act 2003)

## 7. Technical Design

### 7.1 Data (`backend/documents/models.py`)

**DocumentType**
- `code`: unique, never changes.
- `label`, `description`.
- `group`: the report's "Module".
- `kind`: `STUDENT`, `STAFF` or `BOTH`.
- `uploaders`: a list from `STUDENT`, `SUPERVISOR`, `PANEL`, `COORDINATOR`, `LECTURER`.
- `share_supervisors`, `share_panel`, `share_coordinator`: the starting ticks.
- `needs_check`, `one_per_student`.
- `required`, `required_due_note`. The Phase 7 rule fields are `required_programmes` and `required_when`.
- `is_active`, `display_order`, timestamps.

**Document**
- `reference`, `doc_type`, `title`, `description`, `semester` (nullable).
- `uploaded_by`, `uploader_role`.
- `is_staff_file`.
- **Sharing:**
  - `share_supervisors`, `share_panel`, `share_coordinator`;
  - `follows_type`, true for student uploads;
  - `staff_audience` (`ACADEMIC`, `COORDINATORS` or `OFFICE`) and `staff_programmes`, for staff files.
- **Checking:** `check_status` (`NONE`, `WAITING`, `ACCEPTED` or `RETURNED`), `checked_by`, `checked_at`, `check_reason`.
- `current_version`.
- **Archiving:** `archived_at`, `archived_by`, `archive_reason`.
- Timestamps.

**Linked rows**
- **DocumentStudent:** the students on a file, unique pair.
- **Tag** and **DocumentTag:** tags are stored lower-cased for matching, with the first spelling kept for display.
- **DocumentVersion:** cannot be changed once saved. It holds `number`, `file`, `original_name`, `content_type`, `size`, `sha256` and `page_count`, and is deleted with its document.
- **DocumentEvent:** the history, which cannot be changed once saved. It covers uploads, versions, edits, sharing changes, checks, archive and restore, previews, downloads and deletions. A deletion keeps the title, type, students and uploader as text.
- **DocumentLink:** Phase 8, optional.

### 7.2 Access (`backend/documents/access.py`)
One module decides access; views never repeat the rules.
- **The caller's people,** worked out once per request:
  - supervisees, from active supervisor and co-supervisor appointments;
  - panel students, from active panel appointments, found through the research profile's user or matric number;
  - coordinator programmes, from `coordinator_programmes`, which includes acting delegations.
- **`visible_documents(user)`:** one queryset following section 4.3.
- **`can_upload(user, type, students)`:**
  - the type must be active;
  - the office always may;
  - a student may upload only for themselves, only to types that allow students, and only while Active (code `documents_need_active_status`);
  - staff need, for every student, a relationship listed in the type's uploaders;
  - lecturers and coordinators may upload staff files.
- **`shared_with_names(document)`:** the names behind the ticks, for the file page.
- **`permissions`:** each file in a response says which buttons to show:
  - open, download, new version, edit, change sharing;
  - check, archive, restore, delete, link.

### 7.3 Upload checks (`backend/documents/validation.py`)
Carried over from the 2026-10-11 research.
- **Name:**
  - only the last part is kept, with control characters and `<>:"/\|?*` replaced;
  - at most 150 characters;
  - no hidden inner extension such as `report.exe.pdf`.
- **Size:** not empty, and at most 10 MB (`DOCUMENT_MAX_UPLOAD_BYTES`). The message reads "File is 12.4 MB. The maximum is 10 MB."
- **Kind:** the extension must be allowed for the type and the uploader. The message reads "Unsupported file type. Thesis accepts PDF or Word."
- **PDF:**
  - a real PDF signature;
  - no JavaScript, attachments or password;
  - 1 to 500 pages, checked with PDFium under one lock.
- **Word, Excel and PowerPoint:**
  - a safe ZIP (entry count, size, ratio, no encryption, no unsafe paths);
  - the plain, macro-free content type;
  - none of these parts: `vbaProject.bin`, Excel macro sheets, ActiveX, OLE objects, external workbook links;
  - no external links except hyperlinks.
  - The message says how to fix it, for example "Save it as a normal .xlsx and upload it again."
- **Images:**
  - the format matches the extension;
  - at most 40 million pixels;
  - re-saved upright without hidden data such as GPS.
- **Duplicates:** the same file for the same students twice asks "Upload anyway?".
- **Throttle:** 100 uploads an hour per person.

### 7.4 Storage
- Files live under `MEDIA_ROOT/documents/<year>/<month>/<random name>`, never at a public address.
- Every download goes through a permission check and is sent as an attachment with `Cache-Control: private, no-store`.
- Deleting removes the stored files after the database change commits.
- `check_document_storage` reports missing or orphaned files.

### 7.5 API (`/api/documents/`)

| Method | Path | Who | Phase |
|---|---|---|---|
| GET | `options/` | Everyone | 1 |
| GET | `students/?search=` | Staff | 1 |
| GET, POST | `/` (list with filters, upload) | Everyone | 1 |
| GET | `summary/` (tab counts) | Everyone | 1 |
| GET | `tags/?search=` | Everyone | 1 |
| GET, DELETE | `<id>/` | View right; delete by the uploader | 1 |
| GET | `<id>/download/` | View right | 1 |
| GET | `students/<matric>/` (student header) | Staff | 2 |
| GET | `<id>/preview/`, `<id>/preview/pages/<n>/` | View right | 3 |
| POST | `download-zip/` | View right on every file | 3 |
| POST | `<id>/versions/` | Uploader or office | 4 |
| POST | `<id>/check/` (accept or return) | Office | 4 |
| PATCH | `<id>/` (edit details) | Uploader or office | 4 |
| PUT | `<id>/sharing/` | Staff uploader or office | 5 |
| GET, POST, PATCH | `types/` | Office (others read through `options/`) | 5 |
| POST | `tags/<id>/merge/`, PATCH and DELETE `tags/<id>/` | Office | 5 |
| POST | `<id>/archive/`, `<id>/restore/` | Office | 6 |
| GET | `history/` (including deletions) | Office | 6 |
| GET | `required/`, `required/<typeId>/students/` | Office, coordinators | 7 |
| GET | `required/mine/` | Student | 7 |
| POST | `required/<typeId>/remind/` | Office | 7 |
| GET | `students/<matric>/application-files/` | Supervisor application rules | 8, if agreed |
| POST, DELETE | `<id>/links/` | Office | 8, optional |

**Errors:**
- 400: field errors.
- 403: a role refusal, with a code.
- 404: missing or not allowed (the same answer).
- 409: something to confirm, or a file that changed meanwhile.
- 404 `file_missing`: the stored file is gone.

### 7.6 Frontend
- **Routes:**
  - `/files`: Files for staff, File Submission for students;
  - `/files?student=<matric>`;
  - `/files/upload`;
  - `/files/documents/:id`;
  - `/files/types`.
- **Components:**
  - `FileRepository.tsx`, `StudentFileSubmission.tsx` and `UploadNewDocument.tsx`. The names are kept for the teammate's lazy-loading test.
  - New: `DocumentPage.tsx`, `DocumentTypeSettings.tsx`, `StudentPicker.tsx`, `TagInput.tsx`, `RequiredDocuments.tsx`.
- **Shared pieces reused:** `PageHeader`, `PortalButton`, `SelectMenu`, `RecordPage`, `PortalConfirmModal`, `StatusBadge`, `LetterView`.
- **No mock data.** Errors show a Retry button.

## 8. Phases

| Phase | What | Status | Commit |
|---|---|---|---|
| 1 | Backend: the app, types, uploads with all checks, access rules, list and search, download, delete, tags, notices | Not started | |
| 2 | Screens: Files (All files, Staff files, student view), the file page, both upload screens, File Submission with letters | Not started | |
| 3 | Preview on the file page, and Select plus ZIP download | Not started | |
| 4 | Checking: the To check tab, Accept and Return, new versions, editing details, the to-do list | Not started | |
| 5 | Document types screen, changing a file's sharing, tag tidying | Not started | |
| 6 | Archive and restore, the office history (including deletions), the storage check | Not started | |
| 7 | Required documents: the tab, the to-do items, Remind | Not started | |
| 8 | Wrap-up: My Records, a Registry link, notification links, supervisor application files (if agreed), optional links, docs, final checks | Not started | |

**Running a phase:**
1. **Before Phase 1,** run `git fetch` and check `origin/main` for teammate commits. On 2026-10-14 there was nothing new.
2. **Read first.** Read every file a phase touches before changing it.
3. **One phase at a time,** unless Xiang says to carry on.
4. **Finish properly:**
   - add the tests;
   - run section 9;
   - commit on `Xiang`;
   - mark the phase done here;
   - add a dated section to `PROJECT_STATUS.md`.
5. **Do not push.**
6. **Teammate files:** if a phase needs a change inside one, stop and ask first.

**Tests per phase, in short:**
- **Phase 1:**
  - every upload check, with good and bad files of each kind;
  - each person's access, including ended appointments, several students on one file, and staff file audiences;
  - upload rules, filters and search, download headers, deletes, and notices sent once.
- **Phase 2:** the screen helper scripts, then a browser run for each role at 360, 390, 768 and 1440 px.
- **Phase 3:**
  - previews under the enforced security policy, with zero violations;
  - ZIP limits, all or nothing.
- **Phase 4:**
  - each check outcome;
  - a stale check;
  - unique version numbers under two quick uploads;
  - emails respecting the switches.
- **Phase 5:** type changes reach student uploads but not staff choices, and the office's sharing changes are logged.
- **Phase 6:**
  - archived files hidden from everyone but the office;
  - the history after deletions;
  - the storage command.
- **Phase 7:**
  - who a required type applies to;
  - each state;
  - Remind once a day;
  - coordinator scope.
- **Phase 8:**
  - updated My Records and notification link tests;
  - the full walkthrough.

## 9. Verification (Every Phase)

From `backend/`:
```
.venv/Scripts/python.exe manage.py check
.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
.venv/Scripts/python.exe manage.py test accounts academics appointments dashboard marks letters announcements documents --parallel 2 --noinput
```

From `frontend/`:
```
npm run lint
npm run build
npm run test:production-security
for f in $(find src -name "*.test.ts" -o -name "*.test.tsx"); do npx tsx "$f" || echo "FAIL $f"; done
```

**Also:**
- **Tests:** backend tests use a temporary media folder.
- **Migrations:** the dev database is backed up with `pg_dump -Fc` before any migration.
- **Browser checks:**
  - private servers only (backend 8002 with `EMAIL_HOST_PASSWORD=""`, Vite 3002);
  - smoke accounts only;
  - every smoke file, notice and account is removed afterwards.

## 10. Use Case Coverage

| Requirement | Where |
|---|---|
| UC24 upload with Student ID, Category, Module and Semester, and a reference number | Phases 1, 2 |
| UC24 drag and drop; student upload under their own record; file too large; wrong type | Phases 1, 2 |
| UC25 search and combined filters; no matches; access denied; file missing | Phases 1, 2 |
| UC25 preview in the browser; bulk ZIP download | Phase 3 |
| UC26 who can upload and who can see, per type (the matrix) and per file | Phases 1, 5 |
| UC26 default template (each type's starting ticks) and conflict warnings | Phase 5 |
| UC26 links to student records (tags) and workflow records | Phases 1, 8 |
| UC27 archive and restore, with a warning for linked active records | Phases 6, 8 |
| FR-48 documents and generated letters | Phases 2, 3 |

## 11. Known Limits

- **Uploaders can delete their own files** (decision 9). The history keeps a line, not the file.
- **No virus scanning,** and no searching inside files.
- **Previews:** Word files preview as text only, and Excel and PowerPoint as download only.
- **Uploads:** one file per upload, 10 MB each.
- **Students do not receive staff files here.** Letters and Announcements do that.

## 12. Ground Rules

- **Owned by Xiang:**
  - `backend/documents/`;
  - the File Management screens, services and types;
  - `StudentMyRecords.tsx`, `utils/myRecords.ts` and `announcements/emails.py`.
- **Shared files, additive changes only:** `config/settings.py`, `config/urls.py`, `requirements.txt`, `App.tsx`, `constants/routes.ts`.
- **Teammate code, read-only:**
  - the appointment and academic models;
  - `accounts/authorization.py`;
  - `can_view_supervisor_application`;
  - `downloadSupervisorApplicationDocument`;
  - `utils/csvExport.ts`.

  Never import private helpers from teammate files.
- **Do not touch:**
  - `constants/navigation.ts`, `Sidebar.tsx`, `auth/permissions.ts`;
  - `deploy/nginx/*`, `productionContentSecurity.test.ts`, `routeLazyLoading.test.ts`.
- **Writing:**
  - plain language;
  - no long dashes anywhere;
  - Malaysia time;
  - no mention of AI tools and no co-author lines in commits.
