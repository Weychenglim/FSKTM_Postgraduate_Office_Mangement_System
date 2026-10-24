# Workflow reconciliation: plain-language guide

Checked against the current detectors on 23 October 2026.

The page compares saved records using fixed rules. It runs when the list loads, filters change, records are rechecked, or an issue is opened. Reading the page does not repair anything. A flag describes a saved state; it does not prove who caused it or that the data was entered incorrectly.

A **warning** asks for review. A **blocking issue** identifies an inconsistency that can hold up the affected workflow; it does not mean the whole portal is blocked. **Repair available** means the server currently allows a specific repair after review, a reason and confirmation. **Source review** means this page cannot safely choose a correction for you.

## Open, accepted and repaired

**Open issues** need attention. **Accepted warnings** are intentional exceptions reviewed by Office, with a reason and confirmation. Acceptance records who, when and why; it does not correct the record or call it resolved. It is available only for unmatched semester links on inactive timelines or rejected/cancelled Supervisor/Panel requests, and for capacity role-alignment warnings. It is unavailable for current timelines, ongoing requests, evaluation periods, blocking issues, missing required plans and records with a verified repair.

Open the issue and use **Accept as intentional** at the bottom of Recommended next step. The modal shows the affected record, explanation, reason and acknowledgement before confirmation. Cancel closes it without submitting and retains the draft if you reopen it.

The Accepted warnings view contains currently flagged warnings whose evidence still matches the review. If relevant evidence, identity, record status or eligibility changes, the old acceptance no longer hides the issue. It returns to Open issues and the earlier decision stays in immutable review history. Opening and filtering accepted warnings never modifies records.

A **repair** changes the underlying data and records before/after evidence. Once the detector no longer finds that condition, it disappears from the issue list. There is no generic button that merely marks a real integrity problem resolved.

## The three issues in your screenshots

### No capacity plan

**How it is identified:** a draft or active academic semester has no saved capacity-plan versions at all.

**Why it matters:** the semester needs lecturer Supervisor and Panel limits. For a draft semester, this is a preparation warning. For an active semester, the detector classifies it as blocking because the semester has no versioned capacity policy.

**What to do:** prepare the limits in Lecturer capacity. If the semester is still a draft and exactly one published policy exists from semesters ending before it starts, this page can offer to copy that policy into a new draft. It does not publish the copy. If there are several earlier published policies, it does not guess which one to copy.

**Important distinction:** this check means *no saved plan*. It is not a list of every unpublished or unready semester. A saved draft already counts as a plan; publication readiness is checked separately by the normal capacity/semester workflow.

### Semester not linked

**How it is identified:** a Supervisor application, Panel recommendation, semester timeline or evaluation period has an empty academic-semester link.

**Why it matters:** a visible semester name can be plain text. Without the actual link, semester-specific lists and reports may miss the record. Two Panel recommendations from the same student can therefore appear as separate issues: each is a different saved record.

**How the system tries to find the right semester:**

- Supervisor application: its submission date must fall within the semester dates.
- Panel recommendation: its recorded research semester name must match, when supplied, and its submission date (or creation date when not submitted) must fit.
- Semester timeline: its recorded semester and session must match an academic-semester name or code.
- Evaluation period: its recorded semester name must match, when supplied, and both opening and closing dates must fit within the semester when both are supplied.

Names are compared without case differences or extra spaces. Timestamp dates use Malaysia time. Every available signal must agree. A repair is offered only if exactly one semester matches. No matches or several matches require source review. A name/date mismatch explains why a record can look obvious to a person while the system still withholds a repair.

### Capacity limits differ — removed from actionable checks

**What the old check compared:** a lecturer's published semester Supervisor or Panel limit against the old lecturer-profile limit. This difference no longer creates a reconciliation issue because a semester policy may intentionally increase or reduce a lecturer's limit.

**Example:** `Supervisor: 1 vs 5 (old)` means the published semester allows 1 supervisee; the older profile says 5. If Panel is 10 in both places, Panel is not a difference.

**Why it was removed:** two different values do not by themselves indicate inconsistent or invalid data. Repeated warnings about legitimate policy changes distract from actual missing links and conflicting records.

**What actually applies:** the published semester policy remains authoritative. Do not change an approved limit simply to match an older profile. Missing required policies, conflicting published plans and role mismatches are still checked separately.

The issue total counts affected records, not unique kinds of problem. Two unlinked recommendations for one student still produce two issues; legitimate old/current limit differences produce none.

## Other issues the system can identify

These are possible checks, not a claim that they currently exist in your live data. The full technical issue title and evidence remain available inside Review issue.

### Capacity

| Issue | How it is identified | Why it matters |
|---|---|---|
| Multiple capacity plans are published | More than one version for the same draft/active semester is marked Published. | More than one policy claims to supply its limits. Publication history needs review. |
| Published capacity plan is incomplete | The published-policy readiness validator returns errors. The detail page lists those errors. | The published policy fails the current required coverage or limit checks. |
| Capacity entry no longer matches Lecturer roles | A lecturer has a Supervisor/Panel role but no corresponding limit, or has a limit for a role they do not hold. Draft and published versions are checked. | The saved policy entry and current lecturer roles disagree. Review the version before changing historical data. |
| Lecturer availability windows overlap | Two uncancelled restrictions for the same lecturer, semester and role share at least one date. | The restriction periods duplicate part of the same range. Touching end/start dates count because the dates are inclusive. |

### Coordinator accounts

| Issue | How it is identified | Why it matters |
|---|---|---|
| Coordinator programme is missing | A Coordinator profile has an empty managed programme. | The system cannot determine which programme that Coordinator manages. |
| Coordinator profile is missing | An account has the Coordinator portal role and a lecturer record, but no Coordinator profile. | Portal access exists without the programme-management record it needs. |
| Coordinator profile and portal role do not match | A Coordinator profile belongs to an account whose portal role is not Coordinator. | The account role and management assignment conflict. |
| Pending approvals have no valid Programme Coordinator | A programme has requests waiting for Coordinator approval, but no assignment passes the eligibility checks. | Those requests lack a valid programme approver. |

### Research profiles and appointments

| Issue | How it is identified | Why it matters |
|---|---|---|
| Research profile is not linked to a Student account | The research profile has no linked user. | The academic record has no verified account owner. An exact matric match can be repaired here only when there is no competing profile and no downstream Panel/evaluation use. |
| Research profile identity is inconsistent | The linked user has no Student record, or its matric number differs from the profile's matric number after normalization. | The linked account may represent a different student. |
| Research profile Supervisor differs from active appointment | Exactly one active primary Supervisor appointment exists, but the research profile names someone else. | The profile and the official appointment disagree about the current Supervisor. |
| Approved Supervisor workflow has no appointment | A Supervisor application is Approved but has no final appointment record. | Approval did not finish creating the official appointment. Repair still requires valid approval evidence, semester, student, lecturer, capacity and absence of a conflicting active appointment. |
| Approved Panel workflow has no appointment | A Panel recommendation is Approved but has no final appointment record. | The same handover is incomplete for Panel. Repair additionally checks the active Supervisor, distinct Panel member and replacement/duplicate conditions. |
| Appointment source or replacement lineage is inconsistent | The source is not approved, its replacement target differs, or the predecessor was not correctly closed as replaced. | The appointment and its approval/replacement history tell different stories. |

### Co-supervision

All of these require source review; this page does not automatically rewrite supporting appointment history.

| Issue | How it is identified | Why it matters |
|---|---|---|
| Approved co-supervisor nomination has no appointment | An Approved nomination has no supporting appointment linked to it. | The approved nomination did not become an appointment. |
| Pending nomination has no matching active primary supervisor | The linked primary appointment is inactive, belongs to another student, or names a different primary Supervisor from the nominator. | The pending nomination does not have the expected primary Supervisor authority. |
| Co-supervisor conflicts with Panel duties | A pending nominee or active supporting Supervisor also holds an active or workload-reserving pending Panel role for that student. | The same person is occupying conflicting duties. |
| Supporting appointment source or history is inconsistent | Source approval, student, lecturer, replacement link or predecessor lifecycle disagrees with the appointment. | The supporting appointment cannot be reconciled with its recorded approval/history. |
| Primary and supporting supervisor identities overlap | An active supporting Supervisor is also an active primary Supervisor for the same student. | The same person occupies both team roles. |
| Supporting team exceeds its limit or contains duplicate lecturers | Active appointments plus pending nominations exceed two positions after replacement handling, or a lecturer appears more than once. | The team has too many occupied/reserved positions or duplicate people. |

### Research amendments

These also require source review to preserve approved academic history.

| Issue | How it is identified | Why it matters |
|---|---|---|
| Student and approved research programmes differ | The linked Student programme and research-profile programme differ after normalization. | Student and approved research records disagree about the programme. |
| Approved research revision history is inconsistent | Revision numbers are missing/out of sequence, consecutive snapshots do not join, or the latest snapshot differs from the current profile. | The current research record cannot be followed reliably through its saved history. |
| Pending amendment uses an outdated approved research revision | The amendment baseline revision or saved before-values differ from the current profile; transfers also compare the team snapshot. | Someone prepared the amendment against information that has since changed. |

### Evaluation tasks

| Issue | How it is identified | Why it matters |
|---|---|---|
| Evaluation task lifecycle is inconsistent | An unfinished Active/Paused task does not agree with current student eligibility, evaluator/appointment eligibility or the period/completion window. | Work may need pausing, resuming, retiring or a separately reviewed completion window. Submitted tasks are skipped. An eligible paused task is also flagged because it can resume. |
| Eligible evaluation tasks are missing | An accepting evaluation period's expected student/evaluator/role combinations have no matching Active tasks. | Eligible evaluators may have no official task for that period. The repair regenerates tasks through the existing service. |

## What a flag does not tell you

The checks show missing links or disagreements now. They do not establish whether the cause was an old import, a later role change, an incomplete workflow or an intentional policy difference. Use the issue's evidence and source history to decide. Never change an approved semester limit merely to make it equal an older profile value.

Implementation references: `backend/dashboard/reconciliation.py`, `backend/dashboard/co_supervision_tracking.py` and `backend/dashboard/amendment_tracking.py`.
