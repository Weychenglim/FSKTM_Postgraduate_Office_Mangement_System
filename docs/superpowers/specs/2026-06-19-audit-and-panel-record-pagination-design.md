# Audit and Panel Record Pagination Design

## Objective

Improve recordkeeping in two existing administration views:

1. Paginate Recent Timeline Updates at 10 audit records per page.
2. Preserve panel appointment workflow history so an earlier rejected recommendation remains visible after a later recommendation is approved.
3. Paginate Panel Appointment Records at 10 records per page.

## Scope

This change is limited to the Dashboard Timeline Management audit table and the Office Staff/Admin Panel Appointment Management records flow. It does not change lecturer recommendation permissions, student panel visibility, panel workload calculations, or the underlying approval workflow.

## Timeline Audit Log Design

The existing timeline audit endpoint continues to return the latest 50 audit records in newest-first order. Timeline Management will paginate the loaded audit records locally using a fixed page size of 10.

The Recent Timeline Updates card will:

- Show only the current page's audit records.
- Show a record range such as `Showing 1 to 10 of 24 updates`.
- Provide Previous, numbered-page, and Next controls using the portal's existing pagination style.
- Disable Previous on the first page and Next on the last page.
- Return to a valid page when refreshed data reduces the number of available pages.

No audit records are removed or merged by the pagination behavior.

## Panel Record History Design

The panel records endpoint will return one row per meaningful workflow attempt rather than one current row per student.

### Record construction rules

- Every rejected panel recommendation is returned as its own historical record.
- Every submitted or pending recommendation is returned as its own current workflow record.
- An approved recommendation that created a panel appointment is represented by the final panel appointment row only. The matching approved recommendation is not returned as a duplicate row.
- A student profile with no recommendation and no appointment is returned once as `No Panel`.
- A student may therefore have multiple rows, such as an earlier rejected recommendation and a later approved appointment.
- Records are ordered newest first using the appointment or recommendation update timestamp. `No Panel` rows follow workflow records and retain a stable student-name order.

### Record identity

Panel rows require an identifier that is unique per record, not merely per student. The API response will add a stable `recordId`:

- Appointment rows: `appointment-<appointment primary key>`
- Recommendation rows: `recommendation-<recommendation primary key>`
- No-panel rows: `profile-<profile primary key>`

The existing student matric number remains in `id` for display, filtering, and export.

### Rejected record details

A rejected recommendation keeps the recommended panel member's identity and contact metadata for historical accuracy. It also exposes:

- The rejection stage: selected panel or Programme Coordinator.
- The recorded rejection reason.
- Recommendation submission, panel decision, and coordinator decision timestamps where available.

The detail view uses these fields to show the actual rejected workflow instead of treating every rejection as a selected-panel rejection or replacing the recommended member with `Not Assigned`.

## Panel Records UI

Panel Appointment Records will use a fixed page size of 10.

The table will:

- Paginate the filtered historical dataset.
- Use `recordId` as the React row key.
- Reset to page 1 when filters or status tabs change.
- Clamp the current page when refreshed data reduces the number of pages.
- Show the displayed record range and total filtered record count.
- Keep Previous, numbered-page, and Next controls consistent with other portal tables.

Summary cards, attention counts, status tabs, and CSV export operate over all returned historical records, not only the visible page. This means the rejected count represents retained rejected workflow attempts, while the approved count represents confirmed appointment records.

## Data Flow

1. Django loads panel appointments, recommendations, and eligible student research profiles.
2. It emits appointment records, non-duplicated recommendation records, and no-workflow profile records according to the construction rules.
3. The frontend service receives the complete record list.
4. Panel Appointment Management filters the full list, derives summary counts, exports the filtered list, and displays the current 10-row page.
5. Selecting a row passes that specific historical record to Panel Appointment Detail.

Timeline audit pagination remains frontend-only:

1. Timeline Management loads the newest 50 audit records.
2. The component calculates pages of 10.
3. Only the selected page is rendered.

## Error and Empty States

- Existing API loading and error states remain unchanged.
- An empty filtered panel result continues to show the existing no-record message and page 1.
- An empty timeline audit list continues to show the existing no-audit-record message without pagination controls.
- Pagination controls render only when at least one record is available.

## Testing Strategy

Backend panel API tests will verify:

- A student with an earlier rejected recommendation and a later approved appointment produces two records.
- The approved recommendation underlying an appointment is not emitted as a duplicate record.
- Multiple rejected attempts are retained independently.
- Students without recommendations or appointments still receive one `No Panel` record.
- Every returned record has a unique stable `recordId`.
- Rejected records preserve the recommended panel member, rejection stage, reason, and lifecycle timestamps.

Frontend tests will verify pagination helpers or extracted pagination behavior:

- Ten records are returned per page.
- Page ranges and total-page calculations are correct.
- Out-of-range pages are clamped after data changes.

Component integration will be verified through lint, build, focused frontend tests, focused Django appointment tests, and a browser smoke test of both paginated tables.

## Documentation Impact

- `PROJECT_REQUIREMENTS.md` will document historical panel workflow retention and 10-row pagination.
- `ARCHITECTURE_AND_CODING_DESIGN.md` will document the panel record construction and identity rules.
- `PROJECT_STATUS.md` will record implementation and verification results.
