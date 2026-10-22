# Linked submission window date clarity

**Goal:** Make event selection, date ownership, date changes and submission restrictions understandable before saving.

**Scope:** Preserve existing period authority, atomic creation/linking, permissions, revision checks and personal exceptions. Reuse PortalModal, PortalConfirmModal and SelectMenu; leave their global behaviour unchanged.

1. Add regression tests for date-only import with explicit clock times, bounded searchable event selection, linked edit impact and common versus personal extensions.
2. Create reusable TimelineEventPicker for creation and later linking. Search titles, phases and dates; retain a selected event while searching; use shared bounded SelectMenu with descriptions.
3. Move creation linking before date fields. Add an explicit event-date import with required Malaysia opening/closing times and confirmation before replacing entered dates.
4. Explain ongoing ownership and linked-date impact in creation, draft editing, link confirmation and extension dialogs. Show reopening consequences only for an expired, published, enforced window with a valid future common deadline.
5. Add read-only linked-period lifecycle/schedule/enforcement metadata to timeline serialization. Display lifecycle separately from date status in Office calendar entries and event detail. No status enum or access-policy changes.
6. Run focused frontend/backend tests, browser interactions at 1440/1280/390/320px, typecheck and build. Inspect desktop/mobile previews, review the scoped changes, update the three project documents, and restart the verified backend process for serializer changes.

**Design:** Retain Office typography, navy actions, slate body text, white surfaces and amber impact notices. Left-align labels and details; use two date/time columns on desktop and stack on mobile. Keep explanatory copy next to the fields or confirmation it describes.

**Validation:** Explicit times must never be invented; cancellation must preserve inputs; event selection alone must never replace dates; personal extra time must never change common dates; Draft must not be presented as published intake access.
