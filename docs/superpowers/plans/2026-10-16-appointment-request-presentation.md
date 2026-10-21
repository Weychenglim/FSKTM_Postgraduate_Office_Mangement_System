# Appointment Request Presentation Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task by task in the existing authorised checkout. Steps use checkboxes for tracking. The user requested a plan, three critiques and immediate execution; do not pause for another approval or create a PR/commit.

**Goal:** Apply the approved separate-research-card design to Supervisor and Panel request details across roles, and standardise request status and timeline terminology.

**Architecture:** Shared summary/research cards consume role-scoped existing DTOs. Existing approval builders and decision controls remain authoritative; a shared request vocabulary feeds existing label helpers, filters and exports. Request outcome and appointment lifecycle remain separate.

**Tech Stack:** React, TypeScript, Tailwind, existing PortalCard/RequestDetailCard/ApprovalProcess, Node test runner and Vite. No new dependency or backend/schema change.

**Spec:** The approved conversation design and Separate research card mockup. Summary header has View student record at top right. Research has its own card with prominent title, area and shaded full abstract. Relevant documents remain downloadable. Panel nomination/replacement reasons stay outside research. Emails/department/staff identifier move to optional collapsed contact details. Final request status is Approved for both modules; timeline is Request submitted, Supervisor/Panel accepted, Coordinator approved, with pending/rejected/unknown states expressed truthfully. Remove Selected from user-facing Panel reviewer wording.

## Global constraints

- Reuse the current branch and all existing uncommitted changes. Do not commit, push, create worktrees or mutate live academic data.
- Preserve programme/delegation checks, backend capabilities, replacement continuity, disabled saving controls and Student pending-Panel privacy.
- Use the existing appointment typography: headings 16px semibold, names/title 14px semibold, labels 12px semibold and body 12px regular with relaxed line spacing. Shared cards use identical padding and mobile wrapping.
- Supervisor research comes from the submitted application when present; Panel research currently comes from the saved research profile. Do not invent snapshots or documents.
- Do not remove audit events, missing-history explanations, reasons, downloads or lifecycle controls.
- No browser checks, as requested earlier. Run targeted/full frontend checks, TypeScript, build and whitespace checks.

## Three critiques incorporated

1. Matching containers with different fields is cosmetic consistency. Both modules must use the same actual summary/research renderers.
2. A card for every datum makes a grid of clutter. Use one research card; rationale and decisions belong with review, not inside the abstract.
3. Renaming everything risks fabricated history. Approved describes the request; Active/Ended describe the appointment. Completed action labels require decision evidence; unknown events retain neutral stage labels and unavailable details.

### Task 1: Shared request vocabulary and factual timeline labels

**Files:** `frontend/src/utils/appointmentRequestStatus.ts`, `lecturerRequests.ts`, `panelRecommendationWorkflow.ts`, `panelPresentation.ts`, `approvalProcess.ts`; `RequestStatusBadge.tsx`, `RequestDetailPrimitives.tsx`; existing Panel request strings/exports.

**Interfaces:** `appointmentRequestStatusLabel(status: string): string` and `appointmentRequestStatusTone(status: string)` supply common presentation; existing request helpers remain compatible. `requestReviewStepLabel(reviewer: string, state, accepted: boolean, verb)` supplies completed/current/upcoming/rejected labels without changing step states or actors.

- [x] Add regression coverage for Approved across modules/roles, reviewer-specific pending/rejected/cancelled states, unknown statuses, and Panel wording without Selected. Verify the new expectation fails before implementation.
- [x] Introduce shared vocabulary; delegate the existing helpers and retain actor-specific cancellation/rejection labels. Preserve role-based queue grouping while removing role-dependent status renaming.
- [x] Update both approval builders to show Request submitted, Supervisor/Panel accepted and Coordinator approved only with recorded decisions; current labels use Awaiting reviewer review/approval. Retain real stage counts, actor/date/reason data and outcome events.
- [x] Update active Panel forms/dialogs, filter labels and exports to use the same words. Keep SELECTED_PANEL and all backend status/role identifiers intact.

Validation example:
```ts
assert.equal(panelStatusLabel('APPROVED'), requestStatusLabel('APPROVED'));
assert.equal(panelStatusLabel('PENDING_COORDINATOR'), 'Awaiting Coordinator approval');
assert.equal(requestStatusLabel('SUBMITTED_TO_SUPERVISOR', true), 'Awaiting Supervisor review');
```

### Task 2: Shared summary and research cards and authorised navigation

**Files:** create `frontend/src/components/AppointmentRequestSections.tsx`; modify `SupervisorRequestDetail.tsx`, `PanelRecordDetails.tsx`, `RequestDetailPrimitives.tsx`, `ApprovalProcess.tsx`; wire `CoordinatorSupervisorApprovals.tsx`, `LecturerAppointmentRequests.tsx`, `SupervisorAppointmentManagement.tsx`.

**Interfaces:** `RequestSummaryCard` accepts student facts, relevant participant facts, optional contextAction and children. `ResearchDetailsCard` accepts title/area/abstract/source/courseCodes/documents. `SupervisorRequestDetail` gains `contextAction?: React.ReactNode`, matching the existing Panel detail slot.

- [x] Implement common cards with shared typography, responsive two-column facts, a dedicated research card and full non-clamped abstract. Keep supporting documents in the research card with original application identity.
- [x] Render both details in summary, research, review, administration order. Move optional Panel contact facts to a collapsed disclosure; keep justification/replacement/rejection/cancellation reasons outside research. Do not render empty review cards.
- [x] Move each staff Supervisor student-navigation callback from footer actions into the summary header. Keep the original disabled/busy guards. Student views receive no new staff action.
- [x] Adapt existing rendering assertions for the new headings/order, preserve lifecycle/download/privacy/decision checks and verify contact facts remain available when provided.

### Task 3: Review and final validation

**Files:** root `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, `PROJECT_STATUS.md`; this plan.

- [x] Review source/diff against every agreed requirement, especially Approved vs lifecycle, meaningful pending/rejected labels, no visible Selected Panel, one summary navigation action and real research sources.
- [x] Run affected request, progress, Panel, navigation and capability checks; fix regressions without weakening assertions.
- [x] Run all frontend test files with Node `--import tsx --test`, TypeScript `--noEmit`, and Vite `build`. Check whitespace/encoding. Backend tests are unnecessary unless backend code changes.
- [x] Update the three mandatory documents with final design and actual validation/limitations; check off this plan. Leave work local and uncommitted.
