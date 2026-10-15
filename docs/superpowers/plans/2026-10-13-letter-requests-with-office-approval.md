# Letter Requests With Office Approval

Date: 2026-10-13. Owner: Xiang (Letter Generation, UC21 and UC23).

## Status

All phases done on 2026-10-13, on `Xiang` and not pushed.

| Phase | Commit |
|---|---|
| 1. Backend data and templates | `a879c21` |
| 2. Backend request workflow | `ebf3dc1` |
| 3 to 5. Frontend: types, API, template editor, office review, student screens | `facafed` |
| 6. Docs and the end-to-end browser check | this file and `PROJECT_STATUS.md` |

Phases 3, 4 and 5 shipped as one commit: removing the old instant-generation
API touched all three screens at once.

## Why

At the 2026-10-13 meeting the supervisor asked for these changes:

1. **Students must not get letters straight away.**
   - Today a student picks a template, sees the filled letter, and gets it at once. They can screenshot the preview and make their own copy.
   - Instead, the student **requests** a letter and **office staff approve or reject** it.
2. **Office staff fill in details the system does not have.**
   - Example: attendance for a visa letter. The office calculates it in another system and types it in.
   - Templates need fields that the office fills in when it approves a request.
3. **The student is notified of the decision.**
   - After approval, the student can view, print or download the letter.
   - After rejection, the student sees the reason and can request again.
4. **The template editor stays as it is** (the supervisor likes it), with the office-filled fields added.

## Decisions

- **D1. Students never see letter wording before approval.**
  - Template wording is office-only: the template API stops sending `content` to students.
  - The student request screen shows each template's name, type and description only.
  - A student sees the filled letter only once it is approved.
- **D2. One record per request.**
  - The existing `GeneratedLetter` row now starts life as a request.
  - Statuses: `Pending`, then `Issued` (approved) or `Rejected`. A student can `Withdraw` a pending request. `Revoked` stays for issued letters.
  - The model name stays `GeneratedLetter`, to avoid a risky rename. Its docstring says it is a letter request.
  - Existing issued and revoked letters keep their data unchanged.
- **D3. Reference numbers and dates are assigned on approval, not on request.**
  - A rejected or withdrawn request uses no number.
  - The counter and its row lock stay as they are.
- **D4. Values come from the student's record at approval time.**
  - If the office fixes the registry before approving, the letter uses the fixed value.
  - Template wording is also taken at approval time, so a typo fixed in the template is used.
  - Changed during the build: a template with pending requests cannot be deleted (archiving is still allowed, and approval still works). This replaced keeping a copy of the wording with each request, because a deleted template would also lose its reference prefix.
- **D5. Office-filled fields are defined per template.**
  - Each template has a list of fields, e.g. `{{ATTENDANCE}}` labelled "Attendance (%)".
  - Field names use capital letters and underscores, like the built-in placeholders, and may not reuse a built-in name. A template has at most 20 such fields.
- **D6. At approval the office must fill:**
  - every office-filled field the template uses, and
  - any record field the template uses that is blank for this student (e.g. no passport number in the registry).
  - Record fields that do have a value are shown read only. To change one, fix the registry and the request picks it up.
  - Approval is refused until every needed value is filled. Each value is at most 300 characters on one line.
- **D7. The reject reason is required** (at most 500 characters) and is shown to the student.
- **D8. One pending request per template per student.**
  - A second request for the same letter while one is pending gets a 409 with a clear message.
  - Once decided or withdrawn, the student may request again.
- **D9. Who does what.**
  - Only students whose status is Active may request, view, print or download (unchanged rule).
  - Only office staff (`Office Staff/Admin`) see the request queue and approve or reject.
  - Coordinators keep template editing as today, but do not approve requests.
- **D10. Notifications.**
  - **New request:** an in-app notification to every active office user, with event key `letters:request-new:<id>`. It opens the request.
  - **Approved:** an in-app notification to the student (`letters:request-approved:<id>`), plus an email if their "Email alerts" switch is on.
  - **Rejected:** same as approved, with event key `letters:request-rejected:<id>`; the reason goes in the message and the email.
  - **Withdrawn:** no notification.
  - Email uses a new kind `letter` in `announcements/emails.py`, which needs only "Email alerts".
- **D11. The student's note.** The request form has an optional note of up to 500 characters (e.g. "for embassy appointment on 3 Nov"). The office sees it when reviewing.
- **D12. The office review screen** shows the filled letter on A4 pages (`LetterPages`) while values are typed. The reference reads "Assigned on approval" and the date is today.

## Data Model (migration `letters.0004`)

`LetterTemplate`:
- `custom_fields`: JSON list of `{"name": "ATTENDANCE", "label": "Attendance (%)", "hint": ""}`. Defaults to empty.

`GeneratedLetter`:
- `reference_number`: now nullable. It stays unique; in PostgreSQL several NULLs are allowed.
- `content`: blank allowed (empty while pending).
- `issued_on`: nullable.
- `status`: adds `Pending`, `Rejected` and `Withdrawn`. Default `Pending`.
- New fields:
  - `student_note`: up to 500 characters;
  - `office_values`: JSON of the values the office typed;
  - `decided_by` (user, SET_NULL) and `decided_at`;
  - `reject_reason`: up to 500 characters;
  - `withdrawn_at`.

- A database constraint allows only one Pending request per student and template.

Existing rows keep `Issued` or `Revoked`, with their reference, content and date.

## API

Under `/api/letters/requests/`:

| Method and path | Who | What |
|---|---|---|
| `POST /` | student | Create a Pending request: `{templateId, note?}`. Refuses: not Active (403), template not Active (404), broken template (409), already pending for this template (409). Notifies office users. |
| `GET /` | student | Own requests, every status, newest first, no `content`. |
| `GET /` | office | All requests. Filters: `status` (one or comma-separated), `search` (name, matric, reference, template), `from`/`to` on the request date. |
| `GET /<id>/` | student (own) | Status, reason, note. `content` only when Issued. |
| `GET /<id>/` | office | Everything, plus when Pending: `templateContent` and `fields` (each `{name, label, source: "record" or "office", value, needed}`). |
| `POST /<id>/withdraw/` | student (own) | Pending to Withdrawn; otherwise 409. |
| `POST /<id>/approve/` | office | `{values: {NAME: text}}`. Refuses: not Pending (409), any needed value blank or too long (400 with `fieldErrors`). Assigns the reference, fills the wording, saves, notifies and emails. |
| `POST /<id>/reject/` | office | `{reason}`. Pending to Rejected (409 otherwise). Notifies and emails. |
| `GET /<id>/pdf/` | student (own), office | Issued only (409 otherwise). |
| `POST /<id>/revoke/` and `/resend-notification/` | office | Unchanged; Issued letters only (409 otherwise). |

`GET /api/letter-templates/`:
- Students get templates without `content` and without `customFields`.
- Staff get both.
- Create and update accept `customFields`. Placeholder validation accepts the template's own field names.

`GET /api/letter-templates/placeholders/` is unchanged (built-in placeholders only).

## Screens

**Student, Letter Generation (`/letters`):**
- Tabs: "Request a Letter" and "My Requests (n)". The second is `/letters/my-letters`, as now.
- **Request a Letter:**
  - template cards (name, type, description) and an optional note;
  - a "Request letter" button;
  - text explaining that the office checks the details, completes the letter and approves it, and that the student is notified;
  - no letter preview at all.
  - If a request for that template is already pending, the card says so and the button is off.
- **My Requests:**
  - columns: Letter, Requested, Status, Reference, Actions.
  - Pending: Withdraw (with confirmation).
  - Issued: View (A4 pop-up), Print, PDF.
  - Rejected: the reason and "Request again".
  - Withdrawn and Revoked: their dates and reasons.
- **My Records** shows the same list.

**Office, Letter Generation:**
- Tabs: Templates, Requests (with a badge of the pending count), Issued Letters. Requests opens at `/letters/requests`; one request opens at `/letters/requests/<id>`.
- **Templates:**
  - The editor gains an "Office-filled fields" panel to add a field (label, with the tag made from it) or remove one.
  - Their chips insert the tag, in a different colour from built-in placeholders.
  - The preview shows them highlighted.
- **Requests list:**
  - status filter (Pending by default, then Issued, Rejected, Withdrawn, All) and search;
  - each row shows the student, matric, letter, requested date, a note marker, the status, who decided and when;
  - action "Review" for pending requests, "View" for issued ones.
- **Review page** (a full page, like other records):
  - **Left:** the student and request details, the student's note, and the fields form. Record values are read only; blank record fields and office fields are inputs, with labels and hints.
  - **Right:** the live A4 preview.
  - **Buttons:** Approve (disabled until every needed value is filled), and Reject, which opens a dialog asking for the reason.
- **Issued Letters:** unchanged (the register of issued and revoked letters).

**Notifications:** a student's letter notification opens My Requests; an office user's opens that request.

## Phases

Each phase finishes with its own verification and commit on `Xiang`. Nothing is pushed unless Xiang asks.

1. **Backend data and templates.**
   - Back up the dev database with pg_dump.
   - Add the migration (with a test that existing letters keep their data), `custom_fields` on templates with validation, and placeholder validation that accepts each template's own fields.
   - Hide `content` from students in the template API.
   - Update the template tests.
2. **Backend request workflow.**
   - Request, list, detail with fields, withdraw, approve, reject.
   - PDF and revoke allowed only for issued letters.
   - Notifications and the `letter` email kind.
   - Rewrite `test_letter_requests.py`, update the reference-number concurrency test for approvals, and add permission, duplicate, office-field and missing-record-field tests.
3. **Frontend types, API client and template editor.**
   - New statuses and types, the request API functions, and the office-filled fields panel with its chips and preview highlight.
   - Keep the placeholder helpers in step, plus their tests.
4. **Office Requests tab and review page,** including routes `/letters/requests` and `/letters/requests/<id>` and the pending badge.
5. **Student request screen and My Requests,** including My Records and the notification links.
6. **Wrap-up.**
   - README API section and `PROJECT_STATUS.md`.
   - The full backend suite, all frontend scripts, lint and the build.
   - An end-to-end browser run on private servers:
     1. the office adds an "Attendance (%)" field to a template;
     2. a student requests;
     3. the office reviews, types the attendance and approves;
     4. the student is notified and prints;
     5. a second request is rejected and the student requests again.
   - Also checked: phone widths, no console errors, and smoke data removed.

## Verification Per Phase

- Backend: `python manage.py test --parallel 2`, all green.
- Frontend:
  - `npx tsc --noEmit`;
  - every `src/**/*.test.ts(x)` with `tsx`;
  - `npx vite build`.
- Live checks:
  - private servers only, with `EMAIL_HOST_PASSWORD=""` (the console email backend);
  - throwaway smoke accounts only, deleted afterwards;
  - never the demo accounts, and never the user's servers on 3000, 3001 or 8000.

## Out Of Scope

- Editing the letter wording per request (the office only fills values).
- Approval by coordinators or supervisors.
- UC22 appointment confirmation letters. These still need the hook agreed with Wey Cheng. They can later create an already approved request through the same model.
