# Acting delegation acceptance plan

> Execute sequentially under the user's A03 acceptance authorization. Preserve earlier acceptance files and unrelated uncommitted Marks work.

**Goal:** Verify Office grant/revocation UI, effective programme scope, stale-decision rejection, queue refresh, controlled-clock scheduled/expiry boundaries and dependent privacy.

**Architecture:** Reuse the opt-in real HTTP LiveServerTestCase, production React components/services, exact iframe viewports and guarded temporary browser profile pattern. Fixtures include regular/delegated pending primary work, two pending supporting nominations and preserved submitted Marks. Scheduled/end-date/expired reads patch only the delegation clock inside the isolated test process; no test endpoint or production clock change.

## Constraints

- Use only runner-created PostgreSQL databases and fictional participants. Keep test JWTs in memory.
- Never alter account authority, production/development clocks, live academic data or credentials.
- Preserve regular programme access and all existing scope/validation/audit rules.
- Distinguish component/HTTP evidence, controlled-clock evidence, backend concurrency/retirement/migration coverage and full-shell/production limits.

## Tasks

- [x] Add `backend/accounts/delegation_browser_journey.py`: isolated fixtures, exact retained-record snapshots, delegation event/actor assertions and real XLSX scope checks. Run revocation and scheduled/end-date/expiry journeys at 1440/390px.
- [x] Add `frontend/tests/delegationJourney.fixture.tsx`: Office grant/revoke forms and reasons, invalid/overlapping grants, effective scope, delegated approval, stale approval after revocation, automatic queue refresh, personal grant history and report/export/dossier restrictions. Test each controlled-clock phase without mutating the grant.
- [x] Add `frontend/tests/delegationJourney.browser.mjs` using the established production bundle/real loopback proxy/exact iframe/cleanup pattern.
- [x] Run delegation APIs, appointment integration, PostgreSQL grant/revocation races, retirement, migration and dependent report/dossier regressions with the opt-in journeys. Verify TypeScript/build, Django/migration checks and scoped whitespace.
- [x] Attempt independent scoped review; record unavailability and complete direct scoped review. Record A03/E12 evidence and limitations in a report, pending register and affected root documents. Independent reviewer could not run because of an account usage limit; no independent approval is claimed.
