# Marks module UI proposal — 24 October 2026

Status: no-tab design implemented on 24 October 2026; verification is recorded in PROJECT_STATUS.md. The initial planning narrative below is retained for context.

Revision: the user rejected the five-item tab-style navigation. The current recommendation is a task-based overview with grouped setup links and contextual record access. Earlier tab navigation is superseded, including the earlier illustrative HTML figure.

## Goal and scope

Make Marks feel consistent with the Dashboard, Supervisor and Panel workspaces: familiar navigation, clear headings, readable supporting text, restrained icon tiles and predictable actions. Improve the Office administration pages and the Lecturer's existing entry/history/detail pages. Preserve current role access; this proposal adds no Marks administration for Students or Programme Coordinators.

The screenshot shows Office Marks before setup. Source inspection also covered its summary, checklist, attention, quick actions and monitoring components, plus the period, rubric, task assignment, records and Lecturer entry page structure. This was a source/design review, not an authenticated browser audit of every Marks state.

## Research and interpretation

- [Atlassian typography](https://atlassian.design/foundations/typography): consistent text roles, spacing and semantic heading levels make information easier to scan. Apply those principles using the portal's existing Inter font; do not import Atlassian fonts or restyle the entire portal.
- [GOV.UK task list](https://design-system.service.gov.uk/components/task-list/): concise task descriptions and explicit text statuses support scanning. Its guidance warns against using a task list for a strictly ordered process. Borrow readable rows, not an unrestricted task list or a new forced wizard; preserve the existing prerequisite checks.
- [Carbon data table](https://carbondesignsystem.com/components/data-table/usage/): group table search, filters and actions in a predictable toolbar and disclose secondary details when useful. Apply to existing assignment and record lists, without adding unrequested batch operations.
- [Atlassian empty state](https://atlassian.design/components/empty-state/usage): explain why a view is empty and offer a relevant next action. Distinguish no setup, no tasks, no filter matches, completed work and failed loading.

The layout and role-specific recommendations below are our interpretation of these sources and the current code, not a claim that the sources prescribe this exact application design.

### Navigation follow-up research

- [GOV.UK tabs](https://design-system.service.gov.uk/components/tabs/) describes switching related content within a page, warns that tabs hide content, and advises against using this component as page navigation. Five items are not inherently invalid; the more relevant issue here is that the proposed items lead to different workflows and forms.
- [NHS cards](https://service-manual.nhs.uk/design-system/components/card) supports short groups of related content and actions that help users decide where to go next. Borrow the grouping principle; do not turn every navigation link into a separate large tile.
- [USWDS cards](https://designsystem.digital.gov/components/card/) advises against decorative card use, replacing simple calls to action with cards, or using cards for sequential content. Keep the three setup actions as compact rows in one existing panel.
- [GOV.UK complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/) supports related task groups and concise status labels. This is inspiration for scanability; existing prerequisites still govern what the user can do.

Alternatives reviewed: a task-based overview (recommended, visible purpose and statuses), a vertical sub-navigation (useful if frequent cross-page switching is established, but consumes space alongside the existing sidebar), and a tools dropdown (compact but hides the core jobs). Do not replace five tabs with five large cards or five always-visible buttons.

## Approaches considered

| Approach | Benefit | Limitation |
| --- | --- | --- |
| Icon and spacing polish only | Smallest change | Leaves duplicate actions and competing sections |
| Task-based overview with clearer priorities — recommended | Uses grouped setup links and contextual monitoring/record access without tabs | Returning to the overview may take an extra navigation step; retain useful existing cross-links |
| Forced setup wizard and analytics dashboard | Strong sequence and visual change | Adds constraints and visual weight beyond the brief |

## Exactly ten critique rounds

Each round challenges a different part of the initial proposal and records a concrete refinement.

| Round | Roast | Refinement |
| --- | --- | --- |
| 1 | The same four destinations appear in summary cards, checklist actions and Quick Actions. The page keeps introducing the same doors. | Use grouped links in the setup panel for periods, rubrics and tasks; place record access in monitoring. Retain the existing routes and useful contextual cross-links. Do not add a tab bar. |
| 2 | Every panel is trying to be the main panel, so the page never tells the eye where to land. | Establish page heading, navigation, summary, primary work area and secondary attention hierarchy. Keep one strongest action in the immediate work area. |
| 3 | Monitoring submissions is homework after setup, not another setup prerequisite. | Separate the three preparation items from ongoing submission monitoring. Preserve existing readiness and permission rules; don't invent a dependency order. |
| 4 | Green beside “Not configured” congratulates the user for missing setup; red beside zero overdue invents urgency. | Map visual tone to explicit state: neutral unavailable/not configured, blue informational, amber genuine action needed, green ready/submitted, red actual overdue/error. Keep visible status text. |
| 5 | Tiny uppercase labels and heavy text make every annotation sound like a heading. | Keep Inter and the established page-title scale; use 14–16px semibold section/detail headings, 12–14px supporting text, readable labels and tabular numeric values. Use sentence case for statuses and explanatory labels. Avoid global CSS changes. |
| 6 | The summary icons are so faint they might as well be accidental watermarks. | Match the existing 36px icon tiles and 18px Lucide glyphs. Use icons on summaries and meaningful headings, not every sentence. Mark decorative icons hidden from assistive technology. |
| 7 | Neighbouring totals look comparable even when they describe different sets of tasks. | Explicitly label each panel's existing period/semester scope. The top summary uses a selected/fallback period; monitoring uses operational records across periods; attention aggregates non-archived periods. Do not silently change queries or introduce a global scope filter in this visual pass. |
| 8 | An empty dashboard stages an entire monitoring show for zero participants. | Keep the compact summary but replace the empty progress display with a useful explanation and route to setup. No percentage when there are zero tasks. Do not treat no data or failed data loading as completed work. Retain monitoring details when tasks exist. |
| 9 | A tidy desktop picture is not a usable interface if rows crush on phones or summary cards cannot receive keyboard focus. | Reflow summaries and rows at narrow widths; make clickable summaries real links/buttons; keep focus visible, labels readable and essential actions available without hover. Keep necessary wide tables in a contained scroll region. |
| 10 | A polished overview followed by mismatched forms would make the module feel unfinished. | Carry the same heading, section, filter, summary and action conventions through period setup, rubric editing, assignment, records and Lecturer entry/history/detail. Keep scoring, draft saving, submission locking, correction safeguards and audit history intact. |

## Recommended design

### Visual foundation

- Keep Inter and the existing portal colors: navy `#0c1424`, blue `#245bdb`, white `#ffffff`, pale slate `#f1f5f9`, slate border `#e2e8f0`, readable secondary text `#526174`. Semantic status colors reuse existing tokens.
- Reuse `.page-title` (24px, 30px at desktop), established detail heading roles and shared card/field/table primitives. Avoid new font downloads, arbitrary sizes on every page and application-wide typography changes.
- Use a consistent 8px spacing rhythm: 24px between major sections, 16–24px panel padding, 12–16px row gaps. Preserve rounded panels and subtle borders already used in the portal.
- Use semantic h1 → h2 → h3 structure; typography styling does not determine heading rank.

### Office overview

1. Existing page heading and a short description.
2. No tab bar or second persistent sidebar. The overview itself provides grouped navigation through the setup and monitoring sections. Subpages retain a consistent Back to Marks overview link, existing deep links, and useful contextual cross-links.
3. Four quiet summaries: entry period, rubric, task count and submitted count. Distinguish numeric totals from state descriptions; match the other modules' icon treatment.
4. Setup panel with three compact rows: mark entry periods, rubric components and evaluation tasks. Each row has a recognisable icon, concise status and descriptive destination link. Show actionable state labels derived from existing metadata. Primary next action must respect current prerequisites and permissions; no invented readiness score. Do not imply a mandatory order merely through numbered decoration.
5. Smaller attention panel. Emphasise actual issues; show a concise explanation when there are no tasks, rather than a stack of green success tiles. A lack of active rubric must remain visible as missing setup even when the attention endpoint reports zero problematic active rubrics.
6. Monitoring section, with a clear View mark records destination. Before tasks exist: concise empty state. With tasks: submitted/total, progress, status filters and contextual record links. Keep supporting follow-up/activity information available in a quieter secondary area. Overdue is a deadline condition and may overlap draft/not-started groups; do not draw a stacked chart that assumes those groups partition the total.

Once setup is complete, condense its presentation so submission monitoring receives more visual priority. Preserve access to every setup item. Keep visual order and keyboard reading order aligned.

### Remaining pages and roles

| Page | Intended hierarchy |
| --- | --- |
| Period configuration / completion windows | Page context → period list/selection → grouped settings → readiness/publication feedback → existing save/publish actions; secondary history remains accessible |
| Rubrics | Selected version and state → rubric/component editor → target/total validation → existing save/clone/version actions |
| Evaluation tasks | Selected period and eligibility → readiness/preview → existing generation action → evaluator task list/backup actions |
| Mark records | Page heading → compact totals → one coherent filter area → records table → existing pagination/export/detail actions where supported |
| Lecturer marks | My task counts → filters → assigned tasks and deadline → mark entry/detail; draft and final submission actions visibly distinct |
| History, submitted detail and corrections | Record identity/state → submitted results → audit/history and existing authorised correction/recovery actions; avoid decorative changes that weaken read-only/locked cues |

## Implementation sequence after design agreement

1. Capture current Office/Lecturer pages and empty, populated, loading, error, draft, closed and submitted states. Confirm the exact existing route and scope labels.
2. Add only the small reusable Marks compositions needed for summary, heading and grouped action consistency, built on shared portal primitives. Preserve the task-based overview and existing routes rather than adding tab navigation. Avoid coupling new Marks code to appointment-specific data logic or building a second design system.
3. Reshape the Office overview and remove duplicated presentation while preserving destinations and contextual navigation.
4. Apply typography, section and action hierarchy through Office configuration, rubric, task and record pages, then Lecturer entry/history/detail and associated recovery/correction views.
5. Review actual screenshots at desktop/tablet/390px/320px, at normal browser zoom and with long names/labels. Check keyboard focus, heading structure, contrast and contained table overflow.
6. Run appropriate existing Marks tests, frontend type check and production build; verify route/back/filter behaviour, drafts, generation prerequisites, submission locks, correction safety and errors. Update all three required project documents for the implemented scope and report exact verification limits.

No backend, scoring calculation, authorization, data migration, new analytics, animation or dependency change is planned. Existing dirty Marks source must be preserved while making focused presentation edits.

## Original planning deliverable

An explanatory proposal and an initial illustrative Office overview figure using the screenshot's empty setup state. The initial HTML figure with tabs is superseded by the no-tab task-based layout described above. No application tests are claimed for this planning-only work. Requirements and architecture were checked; approved application requirements and architecture remain unchanged.

## Implementation follow-through

The user authorised three additional critique rounds (11–13), recorded in the implementation plan, and implementation. The no-tab overview, three compact setup rows, separate monitoring, shared Marks visual primitives, Office/Lecturer typography and detail improvements are implemented. Metadata read failures retain setup/record access and independently loaded monitoring. Scoring, APIs, routes, role permissions and workflow mutation guards are unchanged. The earlier HTML planning figure is superseded by production-component screenshots in `output/marks-visual-polish-20261024/`.
