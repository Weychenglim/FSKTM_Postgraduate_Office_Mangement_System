# Supervisor Appointment Form Alignment Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the agreed implementation scope. The user authorized implementation after five critical review passes. Primary scope is manual course code(s); optional additions stay deferred.

**Goal:** Add manually entered project course code(s) while preserving the current appointment workflow and document policy.

**Architecture:** Extend the existing SupervisorApplication model, multipart API and Student form with one text field; carry it through exact record projections. Reuse existing approval events and research-amendment history. Additional identity/Office/print work is optional and outside the primary increment.

**Tech Stack:** Existing Django/DRF and React/TypeScript; no new dependency.

**Spec:** `docs/superpowers/specs/2026-10-13-supervisor-appointment-form-review.md`.

## Global constraints

- Keep Student -> Supervisor -> Programme Coordinator approval; no Dean or extra Office approval gate.
- No course catalogue, programme mapping, fixed allowlist or enrolment validation.
- No separate research-title confirmation action, record, snapshot or approval stage.
- No new proposal/results/transcript requirement, title-origin field or conditional upload policy. Preserve existing supporting uploads and security checks.
- Preserve the abstract, role/programme/delegation scope, atomic approval/profile handoff, capacity checks, lifecycle/replacements and amendment history.
- Source form is provisional; do not silently turn every paper field into a mandatory portal requirement.
- Preserve existing uncommitted code/workspace changes. Update all three root governance documents for implemented changes; keep planning separate from completed work.

## Five critical review passes (2026-10-13)

1. **Scope:** the optional identity/Office/print suggestions obscured a one-field feature. Keep all of them deferred; implement only course text capture and exact-record display.
2. **Data design:** a catalogue/mapping or parsed course entity would overbuild this requirement. Use one optional 255-character text field, trim outer whitespace and retain entered content.
3. **Compatibility/workflow:** requiring the field would impose an unconfirmed faculty rule. Accept omitted/blank values, use blank historical defaults and leave approval/handoff/permissions unchanged.
4. **Actual user flows:** the original plan targeted StudentSupervisorApplications, which is the list rather than detail view. Use StudentSupervisorAppointment, preserve its mapping, include editable replacement prefill and course-only draft protection. Exact Office/Coordinator projections already reuse the application serializer; do not edit them unnecessarily.
5. **Verification:** persistence-only tests would miss dropped projections and boundary errors. Add API coverage for arbitrary/multiple codes, 255/256-character limits, omitted/blank values, authorized views and existing acceptance/approval; add multipart and rendered form/replacement coverage. Use a task-specific PostgreSQL test database and compare changes with a preserved baseline because the working tree already contains unrelated work.

No unresolved product decision blocks the primary increment. Implementation uses the optional-field default documented here; no new mandatory policy is inferred.

## Primary implementation scope

### Task 1: Store and transmit manually entered course code(s)

**Files:**
- Modify: `backend/appointments/models.py`, `backend/appointments/serializers.py`.
- Create: `backend/appointments/test_application_course_codes.py` and the next generated appointments migration.
- Modify: `frontend/src/types/appointment.ts`, `frontend/src/utils/supervisorDocuments.ts`, `frontend/src/services/appointmentsApi.ts`.
- Test: `frontend/src/utils/supervisorDocuments.test.ts`.

**Contract:**

```python
# SupervisorApplication
project_course_codes = models.CharField(max_length=255, blank=True, default="")

# SupervisorApplicationCreateSerializer
projectCourseCodes = serializers.CharField(
    max_length=255, required=False, allow_blank=True,
    trim_whitespace=True, default="",
)
# Save with project_course_codes=validated_data["projectCourseCodes"].
# Output serializer exposes projectCourseCodes from project_course_codes.
```

```ts
// Existing application record and multipart input types
projectCourseCodes?: string;
// Multipart builder: body.append('projectCourseCodes',
//   (fields.projectCourseCodes ?? '').trim());
```

- [x] Add API regressions for a code outside the PDF examples, multiple codes as text, outer-whitespace trimming, 256-character rejection and absent/blank values for old clients.
- [x] Confirm the new regression fails before adding the field/serializer behavior.
- [x] Add the model field and migration with a blank default. Do not populate legacy rows with guessed codes.
- [x] Wire the create/output serializers and multipart helper to the contract above. Never use course text to change programme, semester, eligibility or capacity.
- [x] Run API and multipart regressions, then update governance documents with the actual implemented contract.

**Representative test using the existing SupervisorAppointmentWorkflowTests fixture's submit_application helper, extended to accept course text:**

```python
def test_manual_course_codes_are_not_restricted_to_draft_form(self):
    response = self.submit_application(project_course_codes="  ABC1234, XYZ9000  ")
    application = SupervisorApplication.objects.get(pk=response.data["id"])
    self.assertEqual(application.project_course_codes, "ABC1234, XYZ9000")
    self.assertEqual(response.data["projectCourseCodes"], "ABC1234, XYZ9000")
```

### Task 2: Add course input and exact-record display

**Files:**
- Modify: `frontend/src/components/SupervisorAppointmentApplicationPage.tsx`, `frontend/src/components/StudentSupervisorAppointment.tsx`, `frontend/src/components/LecturerAppointmentRequests.tsx`, `frontend/src/components/CoordinatorSupervisorApprovals.tsx`, `frontend/src/components/SupervisorAppointmentManagement.tsx`.
- Modify: `backend/appointments/views.py` for the legacy Office records projection. Shared Office/Coordinator exact endpoints already use SupervisorApplicationSerializer and need no code change.
- Test: `frontend/src/components/SupervisorApplicationClarity.test.tsx`, `frontend/src/components/LecturerAppointmentRequests.test.tsx`, `frontend/src/components/CoordinatorSupervisorApprovals.test.tsx`, `backend/appointments/test_application_course_codes.py`.

- [x] Add a labelled text input **Course code(s)** in Project details, with maxLength 255 and an example hint. Preserve text in failed submissions and existing dirty-draft/navigation guards.
- [x] Send its trimmed value using Task 1's multipart contract. Leave it optional while the source form is provisional; do not add a required-field policy implicitly.
- [x] Decide replacement behavior deliberately: prefill the incumbent application course text as an editable convenience, saving the newly submitted value separately. Preserve all existing replacement reasons/documents.
- [x] Show the value in authorized exact Student/Supervisor/Coordinator/Office application views; blanks read **Not recorded**. Do not widen ordinary tables or introduce course filters without a separate need.
- [x] Verify service conversion functions and compact staff projections carry the value; keep application identity distinct from appointment identity.
- [x] Leave the current acceptance UI/API and later research-amendment mechanism unchanged. Run affected frontend/API regressions and update governance documents.

### Task 3: Verify the focused increment

- [x] Verify new/legacy submissions, manual values beyond PDF examples, length validation and preservation after a failed submit.
- [x] Verify exact record projections across roles and existing unauthorized/out-of-programme access protections.
- [x] Run existing Supervisor acceptance and final Coordinator approval/handoff regressions. Assert there is no new Dean, Office or title-confirmation prerequisite.
- [x] Verify existing private documents, capacity reservations, cancellation/replacement and original-versus-amended research history remain unchanged.
- [x] Run Django system checks and migration dry-run, frontend TypeScript/build and affected test scripts; use the broader required release checks when publishing implementation.
- [x] Record actual implementation/test status in the three root documents. No live academic decisions are needed for verification; use synthetic data.

```powershell
Push-Location backend
python manage.py test appointments.test_application_course_codes appointments.test_supervisor_workflow appointments.test_supervisor_documents appointments.test_supervisor_submission_concurrency appointments.test_appointment_lifecycle appointments.test_research_amendments
python manage.py check
python manage.py makemigrations --check --dry-run
Pop-Location
Push-Location frontend
npx tsx src/utils/supervisorDocuments.test.ts
npx tsx src/components/SupervisorApplicationClarity.test.tsx
npx tsx src/components/LecturerAppointmentRequests.test.tsx
npx tsx src/components/CoordinatorSupervisorApprovals.test.tsx
npm run lint
npm run build
npm run test:production-security
Pop-Location
git diff --check
```

## Optional later scope

These suggestions do not block the manual-course-code increment and are not automatically included:

- **Section A review/prefill:** reuse existing authorized User/Student/StudentRegistry data. Keep identity corrections with the current owner and do not add missing-data submission gates.
- **Stable identity/contact snapshot:** add only if historical completed forms are needed. Capture server-owned values for new submissions, restrict sensitive exact-view projections and leave legacy gaps explicit. This does not add a title-confirmation snapshot.
- **Office receipt/comments:** optional administrative metadata and append-only corrections; no impact on approval, activation, waiting stages or academic decisions.
- **Print view:** optional adapted appointment record using existing application/review data, with identity snapshots if implemented. Omit Dean sign-off, escape content and do not invent signatures/stamps or alter letter-template ownership.

Prepare a focused implementation task for an optional item only when the user includes it in the scope. No new proposal/results evidence work is retained in this plan.

## Planning review result

The primary course-code increment is implemented after five critical review passes. Focused API, multipart/form rendering, TypeScript, production build/security and all frontend scripts pass; local migration preserves existing rows with blank course codes. An independent baseline-scoped review found no actionable defects. All 109 affected backend cases pass; all 106 frontend scripts pass, with the extended Student conversion check rerun after the suite. Django system checks, migration dry-run and whitespace checks pass. Migration appointments.0016 is applied locally; existing application count and blank historical course values were verified. Live browser verification could not reach this portal because localhost:3000 in the connected browser routed to a different service. Optional later features remain deferred.
