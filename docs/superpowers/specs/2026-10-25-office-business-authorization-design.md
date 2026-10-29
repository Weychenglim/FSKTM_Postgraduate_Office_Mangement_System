# Office business authorization and technical admin separation

The user approved Office daily work in the portal, technical-only Django admin, and inspection-only governed records, then requested brainstorming, planning, critical review and development. This implements pending-work T01-T06 on the current branch, preserving the existing A04 changes.

## Design and alternatives

Use shared active Office business authorization, independent of Django staff/superuser flags. Retain explicit user/group `marks.change_markentry` assignments for submitted correction/reopening (a legacy superuser flag is not a business grant) and enforce it in the service as well as the API/capability projection. Other existing Office actions remain role-authorized with their existing scope, validation, transactions and audits.

A mechanical deletion of staff checks would leave duplicated policies and privileged service bypasses. A new configurable permission for every Office action would change existing authority and require unnecessary provisioning and UI work. The shared policy with the existing explicit Marks permission is the smallest coherent solution.

Technical admin entry requires authenticated, active, Technical Administrator role, staff and superuser flags. Apply the rule to both login validation and every admin request, including existing sessions. Retain Django's existing registry and inspection boundaries; close the legacy research-profile Add route to match the user's inspection-only direction. Technical status does not confer portal authority. Portal account forms must reject staff and superuser flags.

## Provisioning and rollout

Seeded Office accounts are non-staff, non-superuser and receive only the submitted-Marks change permission needed by the demonstration workflow, rather than every Marks model permission. Never run demo reseeding to convert real accounts.

Provide a repeatable management command that defaults to preview, requires explicit `--apply`, and only clears staff flags on Office accounts. Preserve passwords, explicit/group permissions, account activation and academic records. Refuse applying without an active dedicated technical superuser or when mixed-role superusers need manual resolution. A data migration is unnecessary: the admin gate immediately rejects legacy Office flags, and the command explicitly converts existing accounts without hidden authority changes.

## Critical review (roast)

- Staff checks also exist in Office browse projections, attention/export routes and Marks configuration services. Cover all production occurrences, not only the original dependency matrix.
- Role-only correction would expand authority. Preserve the explicit permission and enforce it at direct service entry; missing permission must leave scores/audits untouched.
- A custom admin site must preserve all registered models and reject old authenticated Office sessions, not just hide the login button.
- Existing tests sometimes masquerade Office as a superuser. Move inspection tests to actual technical fixtures while retaining Office-denial cases.
- Conversion must not reset credentials, grant permissions, or promote users. Preview and recovery-account checks protect the rollout.
- Capability flags must agree with mutation services. Non-admin Office journeys must execute real operations, not merely assert a helper returns true.

## Validation and boundaries

Use disposable PostgreSQL test databases. Exercise non-admin Office correction/reopening, completion-window grant/history/revoke, participant transitions, research transfer initiation/cancellation, carryover authorization/revocation, delegation and Office browse/export. Check inactive/wrong-role/permission-less and technical actors, login and existing admin sessions, protected direct admin writes, conversion idempotency and unchanged credentials/permissions. Re-run affected lifecycle, audit rollback, concurrency and portal regression suites. Run fresh browser acceptance where existing harnesses apply, TypeScript/build, Django checks and migration drift.

No new business role, portal permission editor, UI relocation, dependency, academic schema or approval stage. Account/profile maintenance remains in technical admin; workflow decisions and mutations stay in the portal. Do not modify live account data without reporting the explicit rollout operation and evidence.
