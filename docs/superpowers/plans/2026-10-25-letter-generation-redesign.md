# Letter Generation Redesign (2026-10-25)

Approved by Xiang on 2026-10-25, after the proposal page "Letter Generation Redesign".
Screens follow Wey Cheng's module design (Supervisor Appointments, Marks): icon tabs,
summary cards, the grey filter card with Clear filters, uppercase table headers,
outlined action buttons, the numbered stepper ending in a review step, and
`ApprovalProcess` for progress.

## Decisions

| Question | Decision |
| --- | --- |
| Removing a list item that past letters used | Hide it (gone from new forms, kept on old letters). Delete only unused items. |
| Questions on a letter's student form | "Who is the letter for?", "Additional information", and custom Short text, Date, Choose from a list, Yes or no. |
| Check step before sending | Yes, "Check and send" with Change links. |
| Office tab order | Requests, Issued letters, Letter types, Lists. |
| Who edits lists | Office Staff/Admin. |

## Data

- `ChoiceList` (Recipients is built in; the office adds simple lists), `ChoiceGroup`
  (a purpose such as Banking, with its Malay name, what one item is called and
  whether students may type a name not listed), `ChoiceItem` (an organisation or a
  list entry, with Malay name, saved address, order and a hidden flag). Seeded from
  `letters/recipients.py`.
- `GeneratedLetter.choice_items` records which items a request used, so the office
  sees "Used in N letters" and only unused items can be deleted.
- `LetterTemplate.form_questions`: the ordered questions. `asks_recipient` follows
  from it (a "recipient" question). Lines with optional details are left out only
  when the letter has an "Additional information" question and the student did
  not tick them.
- Requests keep copies of every chosen name and address (`request_details`), so
  editing a list never changes an issued letter.
- `LetterTemplate.ready_in_days`: "Usually ready in N working days", shown to students.

## Phases

1. **Lists.** Models, migrations and seed; office API (lists, groups, items, order,
   paste many, hide, delete if unused); the Lists tab; the student form reads the
   lists and fills in saved addresses.
2. **Student form per letter type.** `form_questions` with validation; the Student
   form tab (add, order, edit, remove questions; purposes offered; live preview);
   answers on the letter (English and Malay), in the office review and the PDF.
3. **Office screens.** Tabs with icons in the new order; the editor split into
   Details, Student form, Letter, Issuing; one Insert menu grouped by who fills a
   blank in; requests with summary cards, the filter card, a For column and letter
   filter; Approve and open next.
4. **Student journey.** Letter cards; the form as two steps (Letter details, Check
   and send); My requests with Current and History and the approval progress;
   Request again with last time's answers; valid-until reminders.
5. **Full check.** Backend and frontend tests, every role in the browser at 1440
   and 390 px, PDF and print, documents.
