# Lecturer submission history review — 25 October 2026

These screenshots use production React components and built portal CSS with fictional HTTP responses. They do not show authenticated live academic records.

Refreshed after the count refinement: role navigation omits zero counts and uses small numeric badges for submitted evaluations. A separate real HTTP journey is documented in `docs/MARKS_JOURNEY_VERIFICATION_2026-10-25.md`.

- `history-retained-*`: own submitted evaluations across active, paused and retired assignment states; Supervisor, Panel and historical Backup views; timestamp sorting; inclusive Malaysia date filtering; invalid-range feedback; period search; read-only detail and return.
- `history-empty-*`: successful empty history, with shared filters and no empty table scaffold.
- `history-error-*`: history error and independent retry, captured after successful recovery. The fixture asserts that failure never appears as empty and that history never calls the active task API.
- Widths: 1440, 390 and 320 pixels. Phone rows keep View submission visible.

Run from `frontend`: set `MARKS_PAGES=history-retained,history-empty,history-error`, `MARKS_SCREENSHOTS=1` and `MARKS_OUTPUT` to this directory, then run `node --test tests/marksVisualPolish.browser.test.mjs`.
