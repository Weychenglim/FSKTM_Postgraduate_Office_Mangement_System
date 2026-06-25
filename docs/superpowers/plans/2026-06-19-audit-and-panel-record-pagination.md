# Audit and Panel Record Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve complete panel recommendation history and paginate both panel records and timeline audit records at 10 rows per page.

**Architecture:** Django will emit one API record per meaningful panel workflow attempt, with approved recommendations represented only by their final appointment and unique `recordId` values for every row. The React views will use a small tested pagination utility to paginate already-loaded datasets while retaining existing filtering, summary, detail, and export behavior.

**Tech Stack:** Django REST Framework, Django TestCase/APITestCase, React, TypeScript, Vite, Node `assert`, Tailwind CSS.

---

## File Map

- Modify `backend/appointments/tests.py`: add regression coverage for rejected-then-approved history, unique record identities, and rejected metadata.
- Modify `backend/appointments/views.py`: construct historical panel records and prevent approved recommendation duplication.
- Modify `frontend/src/types/appointment.ts`: add record identity and rejection metadata to `PanelRecord`.
- Create `frontend/src/utils/pagination.ts`: pure pagination calculation and slicing helpers.
- Create `frontend/src/utils/pagination.test.ts`: focused pagination tests.
- Modify `frontend/src/components/PanelAppointmentManagement.tsx`: use 10 rows per page, unique keys, and page clamping.
- Modify `frontend/src/components/PanelAppointmentDetail.tsx`: render the correct rejection stage and reason.
- Modify `frontend/src/components/TimelineManagement.tsx`: paginate timeline audit records at 10 rows per page.
- Modify `PROJECT_REQUIREMENTS.md`: record historical panel rows and pagination requirements.
- Modify `ARCHITECTURE_AND_CODING_DESIGN.md`: document API record construction and shared pagination helper.
- Modify `PROJECT_STATUS.md`: record implementation and verification evidence.

### Task 1: Reproduce the Panel History Bug

**Files:**
- Modify: `backend/appointments/tests.py`
- Test: `backend/appointments/tests.py`

- [ ] **Step 1: Write a failing regression test**

Add a test that creates a rejected recommendation for a profile, then a second approved recommendation and appointment for the same profile. Assert that `/api/appointments/panel/` returns exactly two rows for the matric number, with statuses `Approved` and `Rejected`, unique `recordId` values, no duplicate approved recommendation row, and retained rejection metadata:

```python
def test_office_panel_records_keep_rejected_history_after_later_approval(self):
    profile = self.create_profile("MEA999014", supervisor=self.supervisor)
    rejected = PanelRecommendation.objects.create(
        profile=profile,
        supervisor=self.supervisor,
        recommended_member=self.other_panel,
        justification="First attempt.",
        rejection_reason="Panel member unavailable.",
        status=PanelRecommendation.Status.REJECTED_BY_PANEL,
    )
    approved = PanelRecommendation.objects.create(
        profile=profile,
        supervisor=self.supervisor,
        recommended_member=self.panel,
        justification="Second attempt.",
        status=PanelRecommendation.Status.APPROVED,
    )
    PanelAppointment.objects.create(
        recommendation=approved,
        profile=profile,
        supervisor=self.supervisor,
        panel_member=self.panel,
        approved_by=self.coordinator,
    )

    self.authenticate(self.office_admin)
    response = self.client.get("/api/appointments/panel/")

    rows = [row for row in response.data if row["id"] == profile.matric_no]
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(rows), 2)
    self.assertEqual({row["status"] for row in rows}, {"Approved", "Rejected"})
    self.assertEqual(len({row["recordId"] for row in rows}), 2)
    rejected_row = next(row for row in rows if row["status"] == "Rejected")
    self.assertEqual(rejected_row["panelMember"], self.other_panel.full_name)
    self.assertEqual(rejected_row["rejectionStage"], "Selected Panel")
    self.assertEqual(rejected_row["rejectionReason"], "Panel member unavailable.")
    self.assertEqual(rejected_row["recommendationId"], rejected.pk)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
python manage.py test appointments.tests.PanelRecommendationWorkflowTests.test_office_panel_records_keep_rejected_history_after_later_approval --keepdb
```

from `backend/`.

Expected: FAIL because the endpoint currently returns only the approved appointment row and does not provide `recordId`, rejection stage, or rejection reason.

### Task 2: Implement Historical Panel API Records

**Files:**
- Modify: `backend/appointments/views.py`
- Modify: `backend/appointments/tests.py`

- [ ] **Step 1: Add stable identity and metadata to record builders**

Update builders so appointment, recommendation, and profile rows include `recordId`; recommendation rows include `recommendationId`, `rejectionStage`, and `rejectionReason`:

```python
"recordId": f"appointment-{appointment.pk}",
"recommendationId": recommendation.pk,
"rejectionStage": None,
"rejectionReason": "",
```

For recommendation rows:

```python
"recordId": f"recommendation-{recommendation.pk}",
"recommendationId": recommendation.pk,
"rejectionStage": (
    "Selected Panel"
    if recommendation.status == PanelRecommendation.Status.REJECTED_BY_PANEL
    else "Programme Coordinator"
    if recommendation.status == PanelRecommendation.Status.REJECTED_BY_COORDINATOR
    else None
),
"rejectionReason": recommendation.rejection_reason,
```

Keep the recommended member details for rejected recommendations.

- [ ] **Step 2: Replace one-current-row construction with workflow-attempt construction**

Build appointment rows first and collect their `recommendation_id` values. Add all recommendations except those represented by an appointment. Then add `No Panel` rows only for profiles with neither an appointment nor any recommendation. Sort workflow rows by their model update timestamp descending and append no-panel rows ordered by student name.

- [ ] **Step 3: Run the focused regression test and verify GREEN**

Run the same focused Django test.

Expected: PASS.

- [ ] **Step 4: Extend existing office records assertions**

Update `test_office_panel_records_include_approved_pending_rejected_and_no_panel_profiles` to index rows by `recordId` or select by matric/status rather than assuming one row per matric number. Assert every returned row has a unique `recordId`.

- [ ] **Step 5: Run all appointment backend tests**

Run:

```powershell
python manage.py test appointments --keepdb
```

Expected: PASS with zero failures.

### Task 3: Add a Tested Pagination Utility

**Files:**
- Create: `frontend/src/utils/pagination.ts`
- Create: `frontend/src/utils/pagination.test.ts`

- [ ] **Step 1: Write failing utility tests**

Test the wished-for API:

```typescript
import assert from 'node:assert/strict';
import { clampPage, paginate, paginationRange } from './pagination';

const values = Array.from({ length: 24 }, (_, index) => index + 1);
assert.deepEqual(paginate(values, 1, 10), values.slice(0, 10));
assert.deepEqual(paginate(values, 3, 10), values.slice(20, 24));
assert.equal(clampPage(4, 24, 10), 3);
assert.equal(clampPage(2, 0, 10), 1);
assert.deepEqual(paginationRange(2, 24, 10), {
  start: 11,
  end: 20,
  total: 24,
  totalPages: 3,
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node_modules\.bin\tsx.cmd src\utils\pagination.test.ts
```

from `frontend/`.

Expected: FAIL because `pagination.ts` does not exist.

- [ ] **Step 3: Implement the minimal utility**

Create pure helpers:

```typescript
export const totalPagesFor = (totalItems: number, pageSize: number) =>
  Math.max(1, Math.ceil(totalItems / pageSize));

export const clampPage = (page: number, totalItems: number, pageSize: number) =>
  Math.min(Math.max(1, page), totalPagesFor(totalItems, pageSize));

export const paginate = <T>(items: T[], page: number, pageSize: number) => {
  const safePage = clampPage(page, items.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export const paginationRange = (page: number, totalItems: number, pageSize: number) => {
  const safePage = clampPage(page, totalItems, pageSize);
  return {
    start: totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1,
    end: Math.min(safePage * pageSize, totalItems),
    total: totalItems,
    totalPages: totalPagesFor(totalItems, pageSize),
  };
};
```

- [ ] **Step 4: Run the utility test and verify GREEN**

Run the focused `tsx` command again.

Expected: PASS.

### Task 4: Paginate Panel Appointment Records and Preserve Detail Accuracy

**Files:**
- Modify: `frontend/src/types/appointment.ts`
- Modify: `frontend/src/components/PanelAppointmentManagement.tsx`
- Modify: `frontend/src/components/PanelAppointmentDetail.tsx`

- [ ] **Step 1: Extend the frontend record contract**

Add:

```typescript
recordId: string;
recommendationId?: number | string | null;
rejectionStage?: 'Selected Panel' | 'Programme Coordinator' | null;
rejectionReason?: string;
```

to `PanelRecord`.

- [ ] **Step 2: Switch panel pagination to the shared utility**

Use `const itemsPerPage = 10`, `paginate(filteredRecords, currentPage, itemsPerPage)`, and `paginationRange(...)`. Add an effect that clamps `currentPage` whenever `filteredRecords.length` changes. Use `rec.recordId` as the table row key.

- [ ] **Step 3: Keep page reset behavior**

Retain page reset in Apply Filters, Reset Grid, and status-tab selection. Update the footer text to show the shared range values.

- [ ] **Step 4: Render correct rejected workflow detail**

Use `record.rejectionStage` to determine whether the panel or coordinator workflow step is rejected. Show the preserved recommended panel member. Add a compact rejection reason row/card when `record.status === "Rejected"` and a reason exists.

- [ ] **Step 5: Run focused frontend tests**

Run:

```powershell
node_modules\.bin\tsx.cmd src\utils\pagination.test.ts
node_modules\.bin\tsx.cmd src\utils\panelAppointmentRecords.test.ts
```

Expected: both PASS.

### Task 5: Paginate Recent Timeline Updates

**Files:**
- Modify: `frontend/src/components/TimelineManagement.tsx`

- [ ] **Step 1: Add audit pagination state**

Add `auditPage`, a fixed page size of 10, `paginate(auditLogs, auditPage, 10)`, and `paginationRange(...)`. Clamp the page when audit logs refresh.

- [ ] **Step 2: Render only the current audit page**

Replace `auditLogs.map(...)` with `paginatedAuditLogs.map(...)`.

- [ ] **Step 3: Add the pagination footer**

Show `Showing X to Y of Z updates` and Previous, numbered-page, and Next controls. Disable boundary controls and omit the footer for an empty audit list.

- [ ] **Step 4: Run TypeScript lint**

Run:

```powershell
npm.cmd run lint
```

Expected: PASS with zero lint errors.

### Task 6: Update Mandatory Project Documentation

**Files:**
- Modify: `PROJECT_REQUIREMENTS.md`
- Modify: `ARCHITECTURE_AND_CODING_DESIGN.md`
- Modify: `PROJECT_STATUS.md`

- [ ] **Step 1: Update requirements**

Document that Panel Appointment Records retain each rejected workflow attempt, avoid duplicate approved rows, and paginate at 10 rows per page. Document Recent Timeline Updates pagination at 10 rows per page.

- [ ] **Step 2: Update architecture**

Document `recordId`, one-row-per-attempt construction, rejected metadata, approved recommendation deduplication, and the shared pagination utility.

- [ ] **Step 3: Update status**

Record completed implementation, focused test results, backend test results, lint/build results, and any remaining non-blocking warnings.

### Task 7: Full Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run backend verification**

From `backend/`:

```powershell
python manage.py test appointments --keepdb
python manage.py check
python manage.py makemigrations --check --dry-run
```

Expected: all commands exit 0; no test failures, system issues, or pending migrations.

- [ ] **Step 2: Run frontend verification**

From `frontend/`:

```powershell
node_modules\.bin\tsx.cmd src\utils\pagination.test.ts
node_modules\.bin\tsx.cmd src\utils\panelAppointmentRecords.test.ts
npm.cmd run lint
npm.cmd run build
```

Expected: all commands exit 0. The existing Vite chunk-size warning may remain non-blocking.

- [ ] **Step 3: Browser smoke test**

Start the existing backend/frontend development servers if needed and verify:

- Recent Timeline Updates displays at most 10 rows and changes page.
- Panel Appointment Records displays at most 10 rows and changes page.
- A student with rejected history and a later approval shows both rows.
- Opening each row shows the matching historical details.

- [ ] **Step 4: Review the final diff**

Run:

```powershell
git diff --check
git status --short
git diff -- backend/appointments frontend/src PROJECT_REQUIREMENTS.md ARCHITECTURE_AND_CODING_DESIGN.md PROJECT_STATUS.md
```

Expected: no whitespace errors and no unrelated PDF changes included in implementation edits.
