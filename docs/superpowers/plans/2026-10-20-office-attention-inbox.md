# Office attention inbox implementation plan

**Goal:** Keep Dashboard attention compact while exposing every eligible Office attention record through a consistent, paginated workspace.

**Approved design:** User approved the read-only inspection recommendation in chat: four category summaries, accurate totals, filtered entry points and one full attention page using existing Office primitives. No Dashboard tabs, statistics-card wall or duplicate workflow controls.

**Architecture:** Add an Office-only read endpoint using the existing action eligibility rules before their Dashboard cap. Keep the old endpoint's default 20-task response. Project searchable categories, responsibility, programme facets and full category totals on the server; paginate records after filtering. Use one typed frontend API for Dashboard summary and records page. Retain URL filters and authenticated list state when opening records.

**Constraints:** No participant lifecycle or delegation implementation changes. No schema changes, academic writes, new dependencies or changes to Reports. Work in the existing feature checkout because it contains the approved local UI; preserve unrelated work and do not commit it.

## Tasks

- [x] Backend: add tests for more than 20 items, exact summary counts, filters, pagination, ownership/deadline classification, read-only Office permission and unchanged legacy cap. Add optional uncapped builder access plus a separate attention projection/view. Run Django tests against its isolated test database.
- [x] Frontend: add the typed attention API and Office attention page composed from PageHeader, OfficeToolSection, PortalSelect, CoordinatorDataTable, WorkspacePagination, PortalButton, badges and state views. Add the Office-only route without altering protected branches. Keep filters in the URL and list memory, ignore stale reads and preserve record-return context.
- [x] Dashboard: replace the capped task read with full category summaries, display at most four entries, remove misleading preview wording, and route categories to filtered attention records. Keep Monitoring and timeline unchanged.
- [x] Validation: update isolated browser fixtures for the new feed, test category navigation, paging beyond 20, filtering, empty/error/retry, state restoration and phone layout. Run affected backend/frontend tests, TypeScript and build. Inspect live UI without academic mutations and review the scoped diff/protected hashes.
- [x] Documentation: update requirements, design and status with final behavior and actual verification results.
