# Lecturer Capacity and Availability Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace global Lecturer workload limits with Office-managed, semester-specific capacity plans and role-specific availability that fail closed across Supervisor and Panel workflows.

**Architecture:** The `academics` app owns versioned capacity plans, role entries, availability windows, audits, write services, and the shared read-only capacity resolver. Existing `appointments` entry points delegate to that resolver for candidate discovery, direct-ID validation, final approval, replacements, and workload payloads; `dashboard` consumes the same result for actions, reporting, and reconciliation. React adds one lazy Office workspace while extending existing role surfaces with derived, privacy-safe capacity metadata.

**Tech Stack:** Django 5.2, Django REST Framework, PostgreSQL/SQLite-compatible constraints, React 19, TypeScript 5.8, Vite 6, existing portal primitives, Node `tsx` tests.

---

## File Map

### Backend

- Create `backend/academics/capacity.py`: dependency-light read resolver and assignment guard.
- Create `backend/academics/capacity_services.py`: plan/version/publication and availability write transactions.
- Create `backend/academics/test_capacity.py`: model, resolver, lifecycle, API, privacy, and semester-readiness tests.
- Create `backend/academics/test_capacity_migrations.py`: cutover-baseline migration tests.
- Create `backend/academics/test_capacity_helpers.py`: test-only published-plan factory used by workflow fixtures.
- Create `backend/academics/migrations/0002_semestercapacityplan_and_more.py`: capacity schema.
- Create `backend/academics/migrations/0003_seed_capacity_baselines.py`: active/unresolved-semester baseline data migration.
- Modify `backend/academics/models.py`: four capacity/audit models and constraints.
- Modify `backend/academics/services.py`: fail-closed activation readiness.
- Modify `backend/academics/serializers.py`: capacity payloads and write serializers.
- Modify `backend/academics/views.py`: Office capacity/availability/audit endpoints.
- Modify `backend/academics/urls.py`: endpoint routes.
- Modify `backend/academics/admin.py`: read-only published plans/windows/audits.
- Modify `backend/accounts/management/commands/seed_users.py`: publish a guarded demo plan before semester activation.
- Modify `backend/accounts/test_academic_semesters.py` and owned-module fixtures: create explicit published test plans.
- Modify `backend/appointments/models.py`: compatibility workload-limit wrappers delegate to the capacity resolver.
- Modify `backend/appointments/serializers.py`: public candidate metadata and direct-ID guards.
- Modify `backend/appointments/views.py`: candidate filtering, workload rows, Panel submission/final approval guards.
- Modify `backend/appointments/supervisor_handoff.py`: Supervisor final-approval guard.
- Modify `backend/appointments/appointment_lifecycle.py`: replacement activation guard where the source semester is authoritative.
- Modify `backend/dashboard/actions.py`: Office capacity-readiness and over-capacity actions.
- Modify `backend/dashboard/reports.py`: Office capacity distributions and attention items.
- Modify `backend/dashboard/reconciliation.py`: capacity detectors and safe Draft-plan copy repair.
- Modify `backend/dashboard/test_reports.py` and `backend/dashboard/test_reconciliation.py`: reporting/repair coverage.

### Frontend

- Create `frontend/src/types/lecturerCapacity.ts`: capacity-plan API contracts.
- Create `frontend/src/services/lecturerCapacityApi.ts`: management requests.
- Create `frontend/src/utils/lecturerCapacity.ts`: labels, validation, utilization, and conflict mapping.
- Create `frontend/src/utils/lecturerCapacity.test.ts`: pure utility/source contract tests.
- Create `frontend/src/components/LecturerCapacityManagement.tsx`: Office workspace.
- Modify `frontend/src/types/index.ts`, `frontend/src/types/appointment.ts`, and `frontend/src/types/workflowReport.ts`: exports and response extensions.
- Modify `frontend/src/services/index.ts` and `frontend/src/services/appointmentsApi.ts`: exports and typed contracts.
- Modify `frontend/src/constants/routes.ts`, `frontend/src/constants/routes.test.ts`, `frontend/src/utils/routeLazyLoading.test.ts`, and `frontend/src/App.tsx`: lazy Office route and role protection.
- Modify `frontend/src/components/AdministrationDashboard.tsx`, `AcademicSemesterManagement.tsx`, `SupervisorWorkloadMonitoring.tsx`, `PanelWorkloadMonitoring.tsx`, and `WorkflowReconciliationCentre.tsx`: workspace links.
- Modify `frontend/src/components/SupervisorAppointmentApplicationPage.tsx`, `RecommendPanelMemberDrawer.tsx`, `CoordinatorSupervisorApprovals.tsx`, and `LecturerPanelAppointments.tsx`: public selection and approval conflicts.
- Modify `frontend/src/components/LecturerDashboard.tsx` and `LecturerSupervisorAppointments.tsx`: own capacity and availability.
- Modify `frontend/src/utils/panelRecommendationWorkflow.ts`, `panelRecommendationWorkflow.test.ts`, `panelWorkloadRecords.ts`, and `panelWorkloadRecords.test.ts`: capacity-state behavior.

---

### Task 1: Add Capacity Models and Immutable Audits

**Files:**
- Create: `backend/academics/test_capacity.py`
- Modify: `backend/academics/models.py`
- Modify: `backend/academics/admin.py`
- Create: `backend/academics/migrations/0002_semestercapacityplan_and_more.py`

- [ ] **Step 1: Write failing model tests**

Add tests that build one semester, Office actor, Lecturer, Supervisor, and Panel profile, then assert version uniqueness, one published plan, role-limit validation, semester-bounded non-overlapping availability, and audit immutability:

```python
class CapacityModelTests(TestCase):
    def test_plan_entries_and_windows_enforce_capacity_invariants(self):
        plan = SemesterCapacityPlan.objects.create(
            academic_semester=self.semester,
            version=1,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.DRAFT,
            origin=SemesterCapacityPlan.Origin.CREATED,
            created_by=self.office,
        )
        entry = LecturerCapacityEntry(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        entry.full_clean()
        entry.save()

        window = LecturerAvailabilityWindow(
            academic_semester=self.semester,
            lecturer=self.lecturer,
            role=LecturerAvailabilityWindow.Role.SUPERVISOR,
            starts_on=self.semester.starts_on,
            ends_on=self.semester.starts_on + timedelta(days=5),
            reason="Approved research leave.",
            created_by=self.office,
        )
        window.full_clean()
        window.save()

        overlapping = LecturerAvailabilityWindow(
            academic_semester=self.semester,
            lecturer=self.lecturer,
            role=LecturerAvailabilityWindow.Role.SUPERVISOR,
            starts_on=window.starts_on + timedelta(days=2),
            ends_on=window.ends_on + timedelta(days=2),
            reason="Overlapping leave.",
            created_by=self.office,
        )
        with self.assertRaises(ValidationError):
            overlapping.full_clean()
```

- [ ] **Step 2: Run the model test and confirm red state**

Run:

```powershell
python manage.py test academics.test_capacity.CapacityModelTests --keepdb
```

Expected: import failure because the capacity models do not exist.

- [ ] **Step 3: Implement the four models**

Add `SemesterCapacityPlan`, `LecturerCapacityEntry`, `LecturerAvailabilityWindow`, and `LecturerCapacityAudit` to `academics/models.py`. Use these lifecycle constants and constraints:

```python
class SemesterCapacityPlan(models.Model):
    class Lifecycle(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        SUPERSEDED = "SUPERSEDED", "Superseded"

    class Origin(models.TextChoices):
        CREATED = "CREATED", "Created"
        COPIED_FORWARD = "COPIED_FORWARD", "Copied forward"
        MIGRATED_BASELINE = "MIGRATED_BASELINE", "Migrated baseline"

    academic_semester = models.ForeignKey(
        AcademicSemester, on_delete=models.PROTECT, related_name="capacity_plans"
    )
    version = models.PositiveIntegerField()
    lifecycle_status = models.CharField(max_length=16, choices=Lifecycle.choices)
    origin = models.CharField(max_length=24, choices=Origin.choices)
    supersedes = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT,
        related_name="successor_plans",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="created_capacity_plans",
    )
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.PROTECT, related_name="published_capacity_plans",
    )
    publication_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["academic_semester", "version"],
                name="unique_capacity_plan_semester_version",
            ),
            models.UniqueConstraint(
                fields=["academic_semester"],
                condition=Q(lifecycle_status="PUBLISHED"),
                name="one_published_capacity_plan_per_semester",
            ),
        ]
```

Implement `clean()` on entries/windows and append-only `save()`/`delete()` protection on audits. Register plans, entries, and windows read-only once published; register audits with add/change/delete disabled.

- [ ] **Step 4: Generate and inspect the schema migration**

Run:

```powershell
python manage.py makemigrations academics --name semester_capacity_plan
python manage.py sqlmigrate academics 0002
```

Expected: `0002_semester_capacity_plan.py` creates four tables, unique constraints, role/date checks, and indexes on semester/lifecycle and lecturer/role/date.

- [ ] **Step 5: Run model tests and commit**

Run:

```powershell
python manage.py test academics.test_capacity.CapacityModelTests --keepdb
python manage.py check
git add backend/academics/models.py backend/academics/admin.py backend/academics/migrations/0002_* backend/academics/test_capacity.py
git commit -m "feat: add semester capacity policy models"
```

Expected: model tests pass and Django reports no issues.

---

### Task 2: Build the Shared Capacity Resolver

**Files:**
- Create: `backend/academics/capacity.py`
- Modify: `backend/academics/test_capacity.py`
- Modify: `backend/appointments/models.py`

- [ ] **Step 1: Write failing resolver tests**

Cover all six states, role-specific windows, zero limits, global active workload counting, Panel reservation counting, and public reason redaction:

```python
@override_settings(TIME_ZONE="Asia/Kuala_Lumpur")
def test_resolver_marks_over_capacity_and_unavailable_without_ending_work(self):
    publish_test_plan(self.semester, self.office, self.lecturer, supervisor_limit=1, panel_limit=5)
    SupervisorAppointment.objects.create(
        application=self.application,
        student=self.student,
        supervisor=self.lecturer.user,
        approved_by=self.office,
        status=SupervisorAppointment.Status.ACTIVE,
    )
    second = self.create_active_supervisor_appointment(self.lecturer.user)

    result = resolve_lecturer_capacity(
        user=self.lecturer.user,
        semester=self.semester,
        role=CapacityRole.SUPERVISOR,
        on_date=self.today,
    )

    self.assertEqual(result.state, CapacityState.OVER_CAPACITY)
    self.assertEqual(result.active_load, 2)
    self.assertEqual(result.available_slots, 0)
    self.assertTrue(second.status, SupervisorAppointment.Status.ACTIVE)
```

- [ ] **Step 2: Run resolver tests and confirm failure**

Run:

```powershell
python manage.py test academics.test_capacity.CapacityResolverTests --keepdb
```

Expected: `ModuleNotFoundError: academics.capacity`.

- [ ] **Step 3: Implement resolver types and functions**

Create these public interfaces in `academics/capacity.py`:

```python
class CapacityRole(StrEnum):
    SUPERVISOR = "SUPERVISOR"
    PANEL = "PANEL"

class CapacityState(StrEnum):
    AVAILABLE = "AVAILABLE"
    FULL = "FULL"
    OVER_CAPACITY = "OVER_CAPACITY"
    TEMPORARILY_UNAVAILABLE = "TEMPORARILY_UNAVAILABLE"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    INELIGIBLE = "INELIGIBLE"

@dataclass(frozen=True)
class CapacityResolution:
    semester_id: int
    plan_id: int | None
    plan_version: int | None
    role: str
    limit: int | None
    active_load: int
    reserved_load: int
    available_slots: int
    state: str
    unavailable_until: date | None

def resolve_lecturer_capacity(*, user, semester, role, on_date=None) -> CapacityResolution:
    ...

def assert_capacity_allows_assignment(*, user, semester, role, on_date=None):
    result = resolve_lecturer_capacity(
        user=user, semester=semester, role=role, on_date=on_date
    )
    if result.state != CapacityState.AVAILABLE:
        raise CapacityConflict(capacity_conflict_message(result))
    return result
```

Use local imports for Appointment models to avoid an Academics/Appointments import cycle. Keep `count_supervisor_workload()` and `count_panel_workload()` as compatibility functions, but change `supervisor_workload_limit(user, semester=None)` and `panel_workload_limit(user, semester=None)` to delegate to the resolver and return zero for `NOT_CONFIGURED`/`INELIGIBLE`.

- [ ] **Step 4: Run resolver and existing workload tests**

Run:

```powershell
python manage.py test academics.test_capacity.CapacityResolverTests appointments.tests.PanelWorkloadTests appointments.test_supervisor_workflow.SupervisorWorkflowTests --keepdb
```

Expected: resolver states and existing workload-count semantics pass.

- [ ] **Step 5: Commit the resolver**

```powershell
git add backend/academics/capacity.py backend/academics/test_capacity.py backend/appointments/models.py
git commit -m "feat: resolve semester lecturer capacity"
```

---

### Task 3: Implement Plan, Publication, and Availability Services

**Files:**
- Create: `backend/academics/capacity_services.py`
- Modify: `backend/academics/test_capacity.py`

- [ ] **Step 1: Write failing lifecycle service tests**

Test blank-plan creation, previous-plan copying, Draft editing, complete-coverage publication, atomic supersession, stale-version rejection, capacity reduction below load, window creation/cancellation, mandatory reasons, and immutable audits.

```python
def test_publishing_replacement_supersedes_current_plan_atomically(self):
    current = self.publish_complete_plan(version=1)
    draft = clone_capacity_plan(current, actor=self.office)
    update_capacity_entry(
        draft, lecturer=self.lecturer, actor=self.office,
        supervisor_limit=1, panel_limit=7,
        expected_fingerprint=capacity_plan_content_fingerprint(draft),
    )

    published = publish_capacity_plan(
        draft,
        actor=self.office,
        reason="Approved revised allocation.",
        expected_fingerprint=capacity_plan_content_fingerprint(draft),
    )

    current.refresh_from_db()
    self.assertEqual(current.lifecycle_status, "SUPERSEDED")
    self.assertEqual(published.lifecycle_status, "PUBLISHED")
    self.assertEqual(
        LecturerCapacityAudit.objects.filter(action="PUBLISH").count(), 1
    )
```

- [ ] **Step 2: Run lifecycle tests and confirm failure**

Run:

```powershell
python manage.py test academics.test_capacity.CapacityLifecycleTests --keepdb
```

Expected: imports from `academics.capacity_services` fail.

- [ ] **Step 3: Implement transactional write services**

Expose these functions with `transaction.atomic` and `select_for_update`:

```python
def create_capacity_plan(*, semester, actor, copy_from=None): ...
def clone_capacity_plan(plan, *, actor): ...
def update_capacity_entry(
    plan, *, lecturer, actor, supervisor_limit, panel_limit,
    expected_fingerprint
): ...
def validate_capacity_plan_ready(plan) -> list[str]: ...
def publish_capacity_plan(plan, *, actor, reason, expected_fingerprint): ...
def create_availability_window(
    *, semester, lecturer, role, starts_on, ends_on, actor, reason
): ...
def cancel_availability_window(window, *, actor, reason): ...
def capacity_plan_content_fingerprint(plan) -> str: ...
def capacity_plan_snapshot(plan) -> dict: ...
```

Lock the semester and all same-semester plans during publication, then lock all same-semester plan entries in deterministic order. Entry edits and publication require a valid expected fingerprint, recompute it after locking, and raise `CapacityPlanConflict` on a mismatch before mutation or audit. Recheck Draft state, persisted version identity, eligible-Lecturer coverage, role/limit alignment, and availability overlap inside the transaction. Write one immutable audit per affected entity; supersession and publication share the same reason.

- [ ] **Step 4: Run lifecycle and concurrency tests**

Run:

```powershell
python manage.py test academics.test_capacity.CapacityLifecycleTests --keepdb
```

Expected: every lifecycle test passes, including rollback when the replacement publication fails.

- [ ] **Step 5: Commit write services**

```powershell
git add backend/academics/capacity_services.py backend/academics/test_capacity.py
git commit -m "feat: manage capacity plan lifecycle"
```

---

### Task 4: Add Office Capacity APIs

**Files:**
- Modify: `backend/academics/serializers.py`
- Modify: `backend/academics/views.py`
- Modify: `backend/academics/urls.py`
- Modify: `backend/academics/test_capacity.py`

- [ ] **Step 1: Write failing API authorization and contract tests**

Cover Office list/create/detail/edit/clone/publish, entry updates, availability list/create/cancel, audit list, non-Office `403`, unknown `404`, malformed `400`, and stale/lifecycle `409`.

```python
def test_office_publishes_complete_plan_and_student_cannot_manage_it(self):
    created = self.client.post(
        f"/api/academics/semesters/{self.semester.pk}/capacity-plans/",
        {"copyFromPlanId": None}, format="json",
    )
    self.assertEqual(created.status_code, 201)
    plan_id = created.data["id"]

    self.client.force_authenticate(self.student_user)
    denied = self.client.post(
        f"/api/academics/capacity-plans/{plan_id}/publish/",
        {
            "reason": "Unauthorized publication.",
            "expectedVersion": 1,
            "expectedFingerprint": "0" * 64,
        },
        format="json",
    )
    self.assertEqual(denied.status_code, 403)
```

- [ ] **Step 2: Run API tests and confirm route failures**

Run:

```powershell
python manage.py test academics.test_capacity.CapacityApiTests --keepdb
```

Expected: `404` for the new routes.

- [ ] **Step 3: Implement serializers and payloads**

Add serializers with exact camelCase fields:

```python
class CapacityEntryWriteSerializer(serializers.Serializer):
    supervisorLimit = serializers.IntegerField(min_value=0, allow_null=True)
    panelLimit = serializers.IntegerField(min_value=0, allow_null=True)
    expectedVersion = serializers.IntegerField(min_value=1)
    expectedFingerprint = serializers.RegexField(r"^[0-9a-f]{64}$")

class AvailabilityWriteSerializer(serializers.Serializer):
    lecturerId = serializers.IntegerField()
    role = serializers.ChoiceField(choices=("SUPERVISOR", "PANEL"))
    startsOn = serializers.DateField()
    endsOn = serializers.DateField()
    reason = serializers.CharField(allow_blank=False)

class CapacityPlanCommandSerializer(serializers.Serializer):
    reason = serializers.CharField(allow_blank=False)
    expectedVersion = serializers.IntegerField(min_value=1)
    expectedFingerprint = serializers.RegexField(r"^[0-9a-f]{64}$")
```

Plan payloads include `contentFingerprint`, completeness errors, current published flag, entries, version lineage, origin, actors, and timestamps. Entry-update and publish commands pass `expectedFingerprint` to the required `expected_fingerprint` service argument alongside their existing `expectedVersion` stale-identity check. Availability payloads include internal reasons only on Office endpoints.

- [ ] **Step 4: Implement routes and views**

Add the approved URL set from the design. Reuse `_office_denied`, `get_object_or_404`, and the existing validation response style. Map domain validation to `400`, authorization to `403`, unknown IDs to `404`, and the base `CapacityLifecycleConflict` plus resolver `CapacityConflict` to `409` so all capacity lifecycle subclasses are covered.

- [ ] **Step 5: Run API tests and commit**

```powershell
python manage.py test academics.test_capacity.CapacityApiTests --keepdb
git add backend/academics/serializers.py backend/academics/views.py backend/academics/urls.py backend/academics/test_capacity.py
git commit -m "feat: expose lecturer capacity APIs"
```

---

### Task 5: Gate Semester Activation and Seed Cutover Baselines

**Files:**
- Modify: `backend/academics/services.py`
- Modify: `backend/accounts/test_academic_semesters.py`
- Create: `backend/academics/test_capacity_helpers.py`
- Create: `backend/academics/test_capacity_migrations.py`
- Create: `backend/academics/migrations/0003_seed_capacity_baselines.py`
- Modify: `backend/accounts/management/commands/seed_users.py`
- Modify: owned test fixtures that create active semesters and exercise capacity-sensitive workflows

- [ ] **Step 1: Write failing activation and migration tests**

Add an activation test that expects `409` without a published complete plan, then succeeds after publication. Add a `MigrationExecutor` test that creates an active semester and unresolved workflows before `0003`, migrates forward, and asserts one `MIGRATED_BASELINE` with unchanged workflow IDs.

```python
blocked = self.client.post(
    f"/api/academics/semesters/{semester.pk}/activate/",
    {"reason": "Attempt without capacity policy."}, format="json",
)
self.assertEqual(blocked.status_code, 409)
self.assertIn("published capacity plan", str(blocked.data).lower())
```

- [ ] **Step 2: Run tests and confirm the missing gate/baseline**

Run:

```powershell
python manage.py test accounts.test_academic_semesters academics.test_capacity_migrations --keepdb
```

Expected: activation incorrectly succeeds and the migration test cannot target `0003`.

- [ ] **Step 3: Add fail-closed activation readiness**

At the start of `activate_semester()` after locking the Draft semester, call:

```python
from .capacity_services import validate_published_capacity_ready

capacity_errors = validate_published_capacity_ready(semester)
if capacity_errors:
    raise SemesterConflict(
        "Semester activation requires a complete published capacity plan: "
        + "; ".join(capacity_errors)
    )
```

Keep semester/Marks handover behavior unchanged after the readiness gate passes.

- [ ] **Step 4: Implement schema-data cutover and guarded seeding**

Create `0003_seed_capacity_baselines.py` depending on Academics `0002`, Accounts `0004`, and Appointments `0011`. Create baselines only for the active semester and semesters referenced by unresolved application/recommendation statuses. Copy each eligible Lecturer's legacy Supervisor/Panel limits and mark the plan `MIGRATED_BASELINE`/`PUBLISHED`.

In `seed_users`, create/copy and publish the demo capacity plan after user roles exist and before calling `activate_semester()`. Keep reruns idempotent and never replace developer-created plans.

- [ ] **Step 5: Add and use a test plan factory**

Create:

```python
def publish_test_capacity_plan(semester, actor, *, lecturers=None):
    plan = create_capacity_plan(semester=semester, actor=actor)
    rows = lecturers or Lecturer.objects.filter(
        lifecycle_status=Lecturer.Lifecycle.ACTIVE
    ).select_related("supervisor", "panel")
    for lecturer in rows:
        update_capacity_entry(
            plan,
            lecturer=lecturer,
            actor=actor,
            supervisor_limit=(
                lecturer.supervisor.max_supervisees
                if hasattr(lecturer, "supervisor") else None
            ),
            panel_limit=(
                lecturer.panel.max_appointments
                if hasattr(lecturer, "panel") else None
            ),
            expected_fingerprint=capacity_plan_content_fingerprint(plan),
        )
    return publish_capacity_plan(
        plan,
        actor=actor,
        reason="Test capacity baseline.",
        expected_fingerprint=capacity_plan_content_fingerprint(plan),
    )
```

Call it in capacity-sensitive setup code in `accounts/test_academic_semesters.py`, `appointments/tests.py`, `appointments/test_supervisor_workflow.py`, `appointments/test_supervisor_documents.py`, `appointments/test_appointment_lifecycle.py`, `accounts/test_participant_lifecycle.py`, `dashboard/tests.py`, `dashboard/test_reports.py`, `dashboard/test_reconciliation.py`, `dashboard/test_progress_dossier.py`, `marks/tests.py`, and `marks/test_production_management.py`.

- [ ] **Step 6: Run migration/semester/seed tests and commit**

```powershell
python manage.py test accounts.test_academic_semesters accounts.tests academics.test_capacity_migrations --keepdb
python manage.py makemigrations --check --dry-run
git add backend/academics backend/accounts/management/commands/seed_users.py backend/accounts/test_academic_semesters.py backend/accounts/tests.py backend/accounts/test_participant_lifecycle.py backend/appointments/test*.py backend/appointments/tests.py backend/dashboard/test*.py backend/dashboard/tests.py backend/marks/test*.py backend/marks/tests.py
git commit -m "feat: require published semester capacity"
```

---

### Task 6: Enforce Capacity Across Supervisor and Panel Workflows

**Files:**
- Modify: `backend/appointments/models.py`
- Modify: `backend/appointments/serializers.py`
- Modify: `backend/appointments/views.py`
- Modify: `backend/appointments/supervisor_handoff.py`
- Modify: `backend/appointments/appointment_lifecycle.py`
- Modify: `backend/appointments/test_supervisor_workflow.py`
- Modify: `backend/appointments/tests.py`
- Modify: `backend/appointments/test_appointment_lifecycle.py`

- [ ] **Step 1: Write failing end-to-end capacity enforcement tests**

Cover hidden unavailable candidates, disabled full/over-capacity candidates, crafted-ID rejection, pending workflow visibility, selected-panel decision continuation, final approval `409` during an availability window, approval after the window, and replacement enforcement.

```python
def test_pending_supervisor_workflow_remains_visible_but_final_activation_is_blocked(self):
    application = self.create_pending_coordinator_application()
    create_availability_window(
        semester=self.semester,
        lecturer=self.supervisor.lecturer,
        role="SUPERVISOR",
        starts_on=timezone.localdate(),
        ends_on=timezone.localdate() + timedelta(days=2),
        actor=self.office,
        reason="Approved temporary leave.",
    )

    response = self.client.post(
        f"/api/appointments/supervisor/applications/{application.pk}/coordinator-approve/"
    )

    self.assertEqual(response.status_code, 409)
    application.refresh_from_db()
    self.assertEqual(application.status, "PENDING_COORDINATOR")
    self.assertFalse(SupervisorAppointment.objects.filter(application=application).exists())
```

- [ ] **Step 2: Run focused workflow tests and confirm failures**

```powershell
python manage.py test appointments.test_supervisor_workflow appointments.tests appointments.test_appointment_lifecycle --keepdb
```

Expected: candidate payloads lack capacity states and unavailable/full final approvals succeed.

- [ ] **Step 3: Extend candidate/workload payloads**

Return these fields from Supervisor and Panel candidates and workload rows:

```python
{
    "semesterId": resolution.semester_id,
    "capacityPlanId": resolution.plan_id,
    "capacityPlanVersion": resolution.plan_version,
    "capacityState": resolution.state,
    "workloadCount": resolution.active_load + resolution.reserved_load,
    "workloadLimit": resolution.limit or 0,
    "availableSlots": resolution.available_slots,
    "selectable": resolution.state == CapacityState.AVAILABLE,
    "unavailableUntil": resolution.unavailable_until,
}
```

Candidate directory views omit `INELIGIBLE` and `TEMPORARILY_UNAVAILABLE` for new selection. Existing application/recommendation serializers retain selected Lecturer identity and expose only `unavailableUntil`, never the internal reason to Students.

- [ ] **Step 4: Add mutation-time guards**

Call `assert_capacity_allows_assignment()` in Supervisor application creation, Panel recommendation creation, Supervisor final approval, Panel final approval, and incoming replacement activation. Always pass the source workflow's `academic_semester`; never substitute the current semester for carryover decisions.

Convert `CapacityConflict` to `409` without changing persisted pending status. Keep all participant eligibility, programme, workload, uniqueness, and row-lock checks.

- [ ] **Step 5: Run appointment tests and commit**

```powershell
python manage.py test appointments --keepdb
git add backend/appointments
git commit -m "feat: enforce lecturer capacity in appointments"
```

---

### Task 7: Integrate Dashboard, Reports, Exports, and Reconciliation

**Files:**
- Modify: `backend/dashboard/actions.py`
- Modify: `backend/dashboard/reports.py`
- Modify: `backend/dashboard/reconciliation.py`
- Modify: `backend/dashboard/test_reports.py`
- Modify: `backend/dashboard/test_reconciliation.py`

- [ ] **Step 1: Write failing reporting and detector tests**

Assert Office-only Supervisor/Panel state counts, over-capacity/unavailable attention rows, semester/plan/version export columns, missing/incomplete/multiple-plan/window detectors, and safe Draft copy repair with stale fingerprints.

```python
report = build_workflow_report(self.office, {"semester": self.semester.code})
self.assertEqual(report["capacity"]["supervisor"]["OVER_CAPACITY"], 1)
self.assertTrue(
    any(item["kind"] == "LECTURER_CAPACITY" for item in report["attention"])
)
```

- [ ] **Step 2: Run focused tests and confirm missing capacity output**

```powershell
python manage.py test dashboard.test_reports dashboard.test_reconciliation --keepdb
```

Expected: `capacity` report section and capacity issue types are absent.

- [ ] **Step 3: Add Office report/action integration**

Add an Office-only `capacity` report summary with role-state distributions. Add attention items for `OVER_CAPACITY`, `TEMPORARILY_UNAVAILABLE`, and active-semester `NOT_CONFIGURED`; use `targetModule="DASHBOARD"`, `recordType="LECTURER_CAPACITY"`, and Lecturer ID. Add matching Office Dashboard actions, capped by the existing 20-action ordering.

Extend Supervisor/Panel XLSX/CSV source payloads with semester ID/code, plan ID/version, limit, load, capacity state, and public availability dates.

- [ ] **Step 4: Add reconciliation detectors and safe repair**

Detect:

```text
CAPACITY_PLAN_MISSING
CAPACITY_PLAN_INCOMPLETE
CAPACITY_ENTRY_ROLE_MISMATCH
CAPACITY_MULTIPLE_PUBLISHED
CAPACITY_AVAILABILITY_OVERLAP
CAPACITY_LEGACY_LIMIT_DIVERGENCE
```

Only `CAPACITY_PLAN_MISSING` on a Draft semester with exactly one prior published plan is repairable via `COPY_CAPACITY_PLAN`. All active-semester gaps, role mismatches, overlaps, and legacy divergence are review-required. Reuse preview fingerprints, mandatory reasons, transaction locks, and `WorkflowReconciliationAudit`.

- [ ] **Step 5: Run Dashboard tests and commit**

```powershell
python manage.py test dashboard --keepdb
git add backend/dashboard
git commit -m "feat: report and reconcile lecturer capacity"
```

---

### Task 8: Add Frontend Capacity Types, API, Utilities, and Route

**Files:**
- Create: `frontend/src/types/lecturerCapacity.ts`
- Create: `frontend/src/services/lecturerCapacityApi.ts`
- Create: `frontend/src/utils/lecturerCapacity.ts`
- Create: `frontend/src/utils/lecturerCapacity.test.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/types/appointment.ts`
- Modify: `frontend/src/types/workflowReport.ts`
- Modify: `frontend/src/services/index.ts`
- Modify: `frontend/src/constants/routes.ts`
- Modify: `frontend/src/constants/routes.test.ts`
- Modify: `frontend/src/utils/routeLazyLoading.test.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing utility and route tests**

Define fixture assertions for capacity labels, utilization clamping, Draft validation, date-window validation, `409` messages, route recognition, lazy loading, and non-Office redirect source guards.

```typescript
assert.equal(capacityStateLabel('OVER_CAPACITY'), 'Over capacity');
assert.equal(capacityUtilization(7, 5), 100);
assert.equal(capacityUtilization(2, 0), 0);
assert.equal(
  validateAvailabilityWindow('2026-09-01', '2026-09-03', semester),
  null,
);
assert.equal(routeForLecturerCapacity(), '/dashboard/lecturer-capacity');
```

- [ ] **Step 2: Run tests and confirm missing modules**

```powershell
npx.cmd tsx src/utils/lecturerCapacity.test.ts
npx.cmd tsx src/constants/routes.test.ts
```

Expected: module/route import failures.

- [ ] **Step 3: Define exact TypeScript contracts**

Add:

```typescript
export type CapacityState =
  | 'AVAILABLE'
  | 'FULL'
  | 'OVER_CAPACITY'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'NOT_CONFIGURED'
  | 'INELIGIBLE';

export interface LecturerCapacityEntry {
  lecturerId: number;
  staffNo: string;
  lecturerName: string;
  participantLifecycle: string;
  supervisorLimit: number | null;
  panelLimit: number | null;
  supervisor: CapacityResolution | null;
  panel: CapacityResolution | null;
}

export interface SemesterCapacityPlan {
  id: number;
  semesterId: number;
  semesterCode: string;
  semesterLabel: string;
  version: number;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  origin: 'CREATED' | 'COPIED_FORWARD' | 'MIGRATED_BASELINE';
  supersedesId: number | null;
  isComplete: boolean;
  readinessErrors: string[];
  entries: LecturerCapacityEntry[];
}
```

Add API functions for list/create/detail/update-entry/clone/publish, availability list/create/cancel, and audits. Export all new modules through the existing barrels.

- [ ] **Step 4: Add route and lazy role guard**

Add `APP_ROUTES.dashboardLecturerCapacity`, `routeForLecturerCapacity()`, known-path coverage, lazy `LecturerCapacityManagement`, and Office-only rendering in the Dashboard branch of `App.tsx`. Non-Office users navigate back to `/dashboard`.

- [ ] **Step 5: Run frontend foundation tests and commit**

```powershell
npx.cmd tsx src/utils/lecturerCapacity.test.ts
npx.cmd tsx src/constants/routes.test.ts
npx.cmd tsx src/utils/routeLazyLoading.test.ts
npm.cmd run lint
git add frontend/src/types frontend/src/services frontend/src/utils frontend/src/constants/routes* frontend/src/App.tsx
git commit -m "feat: add lecturer capacity frontend contracts"
```

---

### Task 9: Build the Office Capacity Workspace

**Files:**
- Create: `frontend/src/components/LecturerCapacityManagement.tsx`
- Modify: `frontend/src/components/AdministrationDashboard.tsx`
- Modify: `frontend/src/components/AcademicSemesterManagement.tsx`
- Modify: `frontend/src/components/SupervisorWorkloadMonitoring.tsx`
- Modify: `frontend/src/components/PanelWorkloadMonitoring.tsx`
- Modify: `frontend/src/components/WorkflowReconciliationCentre.tsx`
- Modify: `frontend/src/components/DashboardActionCentre.test.ts`

- [ ] **Step 1: Add failing workspace source/integration assertions**

Extend `lecturerCapacity.test.ts` and `DashboardActionCentre.test.ts` to assert the component imports all management APIs, renders Draft/Published/Superseded controls, requires reason text, includes Supervisor/Panel role controls, and is linked from all five Office surfaces.

- [ ] **Step 2: Run tests and confirm workspace absence**

```powershell
npx.cmd tsx src/utils/lecturerCapacity.test.ts
npx.cmd tsx src/components/DashboardActionCentre.test.ts
```

Expected: source assertions fail because the workspace and links do not exist.

- [ ] **Step 3: Implement loading, filtering, and plan history**

Build the workspace with existing `PageHeader`, `PortalButton`, `StatusBadge`, `ProgressBar`, `RightDrawer`, `LoadingState`, `ErrorState`, and `EmptyState`. Keep state for semester, plans, selected plan/entry, availability windows, audits, filters, loading, saving, conflict, and toast.

The table columns are Lecturer, lifecycle, Supervisor load/limit/state, Panel confirmed+reserved/limit/state, and current/upcoming availability. Use stable grid/table dimensions and existing compact operational styling.

- [ ] **Step 4: Implement Draft edits and lifecycle commands**

Add drawers for role limits and date-range availability. Add clone, compare, publish, and cancel-window commands. Disable publish while `readinessErrors` is non-empty. Require non-blank reasons and explicit confirmation for publication and availability cancellation. On `409`, keep the drawer open, show the backend message, and reload the plan list.

- [ ] **Step 5: Add workspace links and run tests**

Use `Gauge` or `SlidersHorizontal` Lucide icons in existing page-header actions. Pass `onOpenCapacity` from `App.tsx` to Semester, workload, and reconciliation components; Dashboard can use `onNavigateToRoute` directly.

```powershell
npx.cmd tsx src/utils/lecturerCapacity.test.ts
npx.cmd tsx src/components/DashboardActionCentre.test.ts
npm.cmd run lint
git add frontend/src/components frontend/src/App.tsx
git commit -m "feat: add lecturer capacity workspace"
```

---

### Task 10: Integrate Role Surfaces and Workload Exports

**Files:**
- Modify: `frontend/src/components/SupervisorAppointmentApplicationPage.tsx`
- Modify: `frontend/src/components/RecommendPanelMemberDrawer.tsx`
- Modify: `frontend/src/components/CoordinatorSupervisorApprovals.tsx`
- Modify: `frontend/src/components/LecturerPanelAppointments.tsx`
- Modify: `frontend/src/components/LecturerDashboard.tsx`
- Modify: `frontend/src/components/LecturerSupervisorAppointments.tsx`
- Modify: `frontend/src/components/SupervisorWorkloadMonitoring.tsx`
- Modify: `frontend/src/components/PanelWorkloadMonitoring.tsx`
- Modify: `frontend/src/utils/panelRecommendationWorkflow.ts`
- Modify: `frontend/src/utils/panelRecommendationWorkflow.test.ts`
- Modify: `frontend/src/utils/panelWorkloadRecords.ts`
- Modify: `frontend/src/utils/panelWorkloadRecords.test.ts`

- [ ] **Step 1: Write failing public-label and workload-state tests**

Assert that Full/Over Capacity candidates are non-selectable, unavailable candidates show only a resume date when already selected, internal reasons never render in Student source, Coordinator conflict messages preserve pending state, and utilization remains within 0-100.

```typescript
assert.equal(canSubmitPanelCandidate({
  capacityState: 'OVER_CAPACITY',
  selectable: false,
  hasNotes: true,
  isSupervisor: false,
}), false);
assert.match(
  getPanelCandidateValidationMessage({
    capacityState: 'TEMPORARILY_UNAVAILABLE',
    unavailableUntil: '2026-10-03',
    selectable: false,
    hasNotes: true,
    isSupervisor: false,
  }),
  /3 Oct 2026/i,
);
```

- [ ] **Step 2: Run affected frontend tests and confirm failures**

```powershell
npx.cmd tsx src/utils/panelRecommendationWorkflow.test.ts
npx.cmd tsx src/utils/panelWorkloadRecords.test.ts
npx.cmd tsx src/services/supervisorAppointmentAgeing.test.ts
```

Expected: existing utilities do not accept capacity states.

- [ ] **Step 3: Update selection and approval surfaces**

Render public state chips and disable selection using `selectable`. Remove the remaining native `alert()` in `SupervisorAppointmentApplicationPage`; show inline validation through existing state/toast primitives. Coordinator and Panel final-approval handlers must display backend `409` messages and reload without removing the pending row.

- [ ] **Step 4: Update Lecturer/workload surfaces and exports**

Show own Supervisor/Panel capacity, plan version, current state, and public availability dates in existing Lecturer Dashboard/workload components. Extend both workload CSVs with Semester Code, Plan Version, Capacity State, Active Load, Reserved Load, Available Slots, and Unavailable Until. Never include internal reasons in exports.

- [ ] **Step 5: Run affected tests and commit**

```powershell
npx.cmd tsx src/utils/panelRecommendationWorkflow.test.ts
npx.cmd tsx src/utils/panelWorkloadRecords.test.ts
npx.cmd tsx src/services/supervisorAppointmentAgeing.test.ts
npm.cmd run lint
git add frontend/src/components frontend/src/utils frontend/src/types/appointment.ts
git commit -m "feat: surface lecturer capacity by role"
```

---

### Task 11: Complete Documentation and Full Verification

**Files:**
- Modify: `PROJECT_REQUIREMENTS.md`
- Modify: `ARCHITECTURE_AND_CODING_DESIGN.md`
- Modify: `PROJECT_STATUS.md`
- Verify: all files changed by Tasks 1-10

- [ ] **Step 1: Replace planned documentation with implemented behavior**

Update the three mandatory documents with final model/API names, migration numbers, authorization, fail-closed behavior, frontend route, test totals, browser results, and residual notes. Remove wording that says the feature is not implemented. Keep official rules, co-supervisors, SLAs, Marks moderation, and Notifications/Announcements explicitly deferred.

- [ ] **Step 2: Run complete backend verification**

```powershell
cd backend
python manage.py test accounts academics appointments dashboard marks --keepdb
python manage.py check
python manage.py makemigrations --check --dry-run
```

Expected: all tests pass, system check reports no issues, and no migration changes are detected.

- [ ] **Step 3: Run every frontend test file**

```powershell
cd ../frontend
$tests = Get-ChildItem src -Recurse -Filter *.test.ts | Sort-Object FullName
foreach ($test in $tests) {
  & npx.cmd tsx $test.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Expected: every `.test.ts` script exits zero.

- [ ] **Step 4: Run production frontend gates**

```powershell
npm.cmd run audit:security
npm.cmd run lint
npm.cmd run build
npm.cmd run test:production-security
```

Expected: zero known vulnerabilities, no TypeScript errors, successful Vite build, and both production artifact guards pass.

- [ ] **Step 5: Browser-smoke all four roles**

Verify:

1. Office copies a prior plan, edits limits, sees incomplete coverage, publishes, adds/cancels role-specific availability, and opens audits.
2. Semester activation fails without a complete published plan and succeeds after publication.
3. Student candidate selection omits unavailable Lecturers and disables Full/Over Capacity choices without exposing internal reasons.
4. Lecturer sees own capacity and Panel candidates use reserved workload.
5. Coordinator sees a pending workflow retained after an unavailable final-approval `409`.
6. Existing appointments remain active after a capacity reduction; reports, exports, Dashboard actions, and reconciliation refresh correctly.
7. Coordinator, Lecturer, and Student direct access to `/dashboard/lecturer-capacity` redirects to Dashboard.

- [ ] **Step 6: Review diff hygiene and commit the completed documentation**

```powershell
cd ..
git diff --check
git status --short
git add PROJECT_REQUIREMENTS.md ARCHITECTURE_AND_CODING_DESIGN.md PROJECT_STATUS.md
git commit -m "docs: record lecturer capacity completion"
```

Expected: only the three required project documents remain for this close-out commit; all implementation files were committed in the preceding tasks.
