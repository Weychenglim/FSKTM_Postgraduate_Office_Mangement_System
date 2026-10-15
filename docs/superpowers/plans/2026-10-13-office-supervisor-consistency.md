# Office Supervisor workspace consistency

User requested review followed by implementation using the Coordinator structure. Retain current feature branch and prior changes. Office monitors all ongoing requests rather than having Coordinator decision authority.

- [x] Reuse staff browse projections for Office-only paged requests, supervisor groups, past appointments and targeted details. Preserve role checks and Student withdrawal exclusion; test cross-role access and stage visibility.
- [x] Reuse Coordinator browse UI using a staff role context, supervisor-only grouping and external light Current teams/Past appointments switch. Office primary/supporting detail and lifecycle actions remain available. Separate capacity and administration tools preserve workload, requirements, exports and students without supervisor.
- [x] Office research uses opt-in paged shared filters with all ongoing monitoring; retain profile correction and programme transfer through dedicated tools.
- [x] Verify role/navigation tests, TypeScript/build and live read-only Office search/return/tool journeys; update three root docs. No live academic mutations, commits or pushes.

Completion evidence: 42 scoped staff browse/research tests and 65 affected workflow regressions pass. All 106 frontend scripts pass, affected tests rerun after final exact administration links; TypeScript/build/security guards and Django/migration/whitespace checks pass. Review findings fixed and follow-up review clear. Live read-only Office checks include preserved history/search/page size, grouped student drilldown, administration workload/requirements returns, export availability, separate capacity, upstream research monitoring and preserved correction/transfer student selection. Desktop/mobile no overflow. Root docs updated; no live decisions, commits or pushes.
