# Supervisor and Panel appointment visual polish

Date: 24 October 2026

## Baseline and scope

- Fetched origin and fast-forwarded `codex/portal-consistency-and-toast` from `19c6108` to latest `origin/main` (`deffefa`). The two commits introduced no file-tree differences; existing uncommitted work was preserved.
- Apply a small visual improvement to existing Student, Lecturer, Programme Coordinator and Office Staff/Admin appointment experiences.
- Preserve workflows, role permissions, data, labels, status semantics, typography and tables. Reuse installed Lucide icons and existing Tailwind tokens.

## References and options

- [Atlassian icon usage](https://atlassian.design/components/icon/usage): use recognizable symbols consistently, retain visible text, avoid excessive icon use, and hide redundant icons from assistive technology.
- [Atlassian icon tile usage](https://atlassian.design/components/icon/icon-tile/usage): small icon backgrounds can anchor major content blocks; use strong colour sparingly and size icons to adjacent content.
- [Atlassian lozenges](https://atlassian.design/components/lozenge): status colours carry learned meanings. Keep the existing status badges authoritative.

Considered icons alone, icons with restrained visual anchors, and a larger layout redesign. Selected restrained anchors because the existing role workflows and spacing already work.

## Six critique rounds before implementation

1. Plain text cards resemble database output. Add recognizable icons to identify their subject.
2. A rainbow palette competes with status meaning. Keep icon tiles primarily blue or neutral and retain existing semantic badges.
3. Large or absolutely positioned icons compete with counts and can collide on mobile. Use 36 px tiles with 18 px strokes in normal flow.
4. Animated informational cards imply actions that do not exist. Keep metric cards static and interaction cues on genuine controls.
5. Icons in every table row create noise. Concentrate them in navigation, summaries, people cards and key headings.
6. Different symbols for the same concept undermine familiarity. Map icons explicitly to people, requests, waiting, workload, research and programme transfer.

## Implementation plan and result

1. Add a reusable decorative `AppointmentIcon` and optional icon properties on shared summaries and section headings.
2. Apply explicit icons to Supervisor/Panel navigation, Lecturer workload/review summaries, Office attention categories and workload monitoring summaries.
3. Add people icons to shared appointment-member cards and supporting-supervisor sections, plus request/research/guidance heading icons.
4. Preserve button/link semantics, visible labels, keyboard focus, badges, counts, capacity calculations and Student privacy.
5. Update the existing selected-navigation assertion to allow decorative SVG markup while still checking the exact selected link label.
6. Verify with existing component/browser regressions and isolated production-component previews; update required project documentation.

## Validation

- TypeScript check and production build passed. The build reports its existing large ExcelJS chunk warning.
- Fifteen focused component test files passed, reporting 27 tests/checks.
- Three existing mounted browser suites passed: appointment feedback, Office monitoring routes and workload summaries. Desktop/mobile scenarios cover review feedback, saved input, routing, filtered totals, loading, empty results and retry.
- Isolated visual compositions use fictional data and production components, rather than authenticated live application sessions. All four role compositions passed at 1440, 390 and 320 px with no horizontal overflow and no exposed decorative SVGs. Screenshots were inspected for desktop metrics and mobile Office, Lecturer, Coordinator and Student views.
- Independent source review found no actionable issues.
- Reproducible previews: `node output/appointment-visual-polish-20261024/capture.mjs`. Requires installed frontend dependencies, a production build, and local Chrome or Edge. The capture script uses isolated temporary profiles and local fixtures.

Screenshots and preview source are in `output/appointment-visual-polish-20261024/`. No production backend or authorization change is part of this work.


## Follow-up review (24 October 2026)

- Confirmed and fixed a minor visual defect in both Office attention-card groups: default button content alignment vertically centred shorter descriptions, leaving icon rows misaligned. At 768 px the Panel icon positions were 271/281/281 px; explicit column layout now produces 271/271/271 px. Supervisor cards use the same correction.
- Strengthened preview validation to inspect local clipping within cards, navigation and headings, and equal icon-row alignment in desktop/tablet attention grids. The alignment assertion failed before the production fix and passed afterwards.
- Expanded review previews to Office Panel attention, Office workload summaries, Student supervisor cards, and temporarily unavailable Lecturer capacity at 320, 390, 768, 1024 and 1440 px as applicable. Preview Office components now receive their actual Office role context. These are isolated production-component compositions, not complete authenticated pages.
- Independent source review found no confirmed functional regression. Fresh TypeScript, the 27 focused checks, and production build passed. Appointment feedback and workload browser suites passed; one combined Office monitoring run remained at RUNNING without fixture results, then passed all desktop/mobile scenarios on an isolated rerun.
- Reproduce the expanded review in PowerShell with `$env:POLISH_REVIEW='1'; node output/appointment-visual-polish-20261024/capture.mjs`. Optional `POLISH_ROLE` restricts capture to one scenario.
- No requirement or business-rule change was needed. Complete authenticated app-shell acceptance and keyboard traversal remain outside these fixture checks.


## Research request detail coverage (24 October 2026)

The research request detail page used direct RequestSection calls rather than the RequestSummaryCard/ResearchDetailsCard wrappers, so the initial icons did not reach it. It now explicitly supplies summary, edit and approval icons, consistent detail heading typography, a profile-action book icon and staff-transfer team icon. ApprovalProcess exposes an optional icon for all history branches and preserves original heading markup when omitted. Snapshot comparisons, audit disclosures, status calculations and capabilities are unchanged.

Five focused component files report eight passing tests/checks; the mounted research-profile-history suite passes its four scenarios; TypeScript and build pass. The approved, pending and historical previews pass nine width/state combinations without document overflow or local clipping. Run `$env:POLISH_RESEARCH='1'; node output/appointment-visual-polish-20261024/capture.mjs` for fictional-data previews of the production RecordPage and ResearchAmendmentCard. Screenshots include `research-approved-1440.png` and `research-approved-390.png`.


## Saved research profile and history (24 October 2026)

Current profile headings and Student profile summaries now use the shared book icon tile; Research history uses a history icon and consistent detail typography. The Office correction/transfer action uses an edit icon. Nested revisions keep their existing restrained text and disclosure chevrons. The native disclosure state, sort order, student-switch resets and capability checks are unchanged.

TypeScript, production build, three focused component files and both mounted research profile directory/history suites pass. The real LecturerResearchWorkspace in RecordPage, backed by fictional Office/Student read fixtures, passes nine open/closed profile width/state combinations without local clipping or document overflow. Run `$env:POLISH_PROFILE='1'; node output/appointment-visual-polish-20261024/capture.mjs`. See `profile-office-history-1440.png` and `profile-office-history-390.png` in the output folder.
