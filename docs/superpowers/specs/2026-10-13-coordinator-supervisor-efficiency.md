# Coordinator Supervisor workspace efficiency

Approved in the conversation on 2026-10-13 after five critiques. Scope is Coordinator first; existing Student/Lecturer/Office capabilities and pending uncommitted work must be preserved.

## Structure
Keep Appointment requests / Supervisory teams / Research changes. Requests and research retain Requests/History, show only requests awaiting the Coordinator decision, authoritative programme/semester/type/status/date filters, stage-age sorting and accurate server pagination. Decision detail pages retain one labelled Back, no module tabs and saved list context; neutral Next request is permitted only with no busy/draft state.

Supervisory teams has a light Current teams / Past appointments switch outside the list card. Current teams groups By supervisor without a grouping selector; supervisor drilldown is a dedicated paginated student list, distinct primary/supporting counts within authorised programmes, student identity search in either grouping. Past appointments contains ended/replaced primary/supporting appointments in a table, not duplicate active cards. Existing lifecycle actions remain in detail.

Capacity reassessments is a secondary dedicated browse/detail tool, read-only for Coordinator. Carryover flags on affected requests link to its record; no empty capacity block appended to teams. Office controls are not moved or weakened.

## Data and compatibility
Add Coordinator-only scoped workspace GET endpoints returning page envelopes. Query filtering, stable sorting/counts and slicing must precede full record serialization. Reuse cancellation visibility helpers and current regular/acting programme scope. Avoid loading whole appointment/nominations/team collections when opening one view/detail. Keep existing legacy endpoints unchanged for other consumers. No schema changes, dependencies, live decisions, commits or pushes.

## Page contract
Page envelope: results, total, page, pageSize, pageCount, facets (programmes/semesters/statuses), reviewCount where relevant. Query: q/view/focus/type/status/programme/semester/from/to/sort/page/size; size is 10/25/50; dates use submission on ongoing and outcome date on history.

Coordinator workspace requests returns compact unified primary/supporting rows. Teams returns supervisor counts or student rows; supervisor filter selects related active students once, preserving recorded roles. Appointment history returns ended primary/supporting rows. Scoped details reuse existing serializers. Research adds opt-in server collection pagination and targeted detail loading, retaining original endpoint shapes without paging.

## Validation
Use MD5-hashed Django test fixtures for scoped/paged/sorted queries, cancellation exclusions, duplicate-free grouping and ended history. Render shared font/table/filter controls; verify existing role/navigation tests and TypeScript/build. Live Coordinator checks are read-only and include filtering, grouped drilldown, history, carryover and preserved return context.

User correction: status/date filters stay visible without More filters; Clear filters aligns at lower right. Focus selectors removed; old saved All ongoing state cannot broaden Requests. Student search is retained through supervisor drilldown.
