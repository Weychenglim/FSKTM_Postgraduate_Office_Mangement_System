# Lecturer marking UI review — 25 October 2026

Screenshots render the production React components and built portal CSS with fictional HTTP fixtures, without the authenticated application shell or live academic writes.

Refreshed after the count refinement: role navigation omits zero counts and uses small numeric badges for pending work.

- `lecturer-mixed-*`: supervisor, panel and backup queues; tests switch roles, check scope/counts, open a marking form and return from scoped history before capturing the supervisor view.
- `lecturer-panel-only-*`: first load selects the assigned Panel queue; the empty Supervisor queue remains accessible.
- `lecturer-empty-*`: both primary responsibilities remain visible, with a role-specific empty state and no empty table scaffold.
- Widths: 1440, 390 and 320 pixels. Phone task rows expose the marking action without horizontal scrolling.

The browser fixture is `frontend/tests/marksVisualPolish.fixture.tsx`. Set `MARKS_PAGES`, `MARKS_SCREENSHOTS=1` and `MARKS_OUTPUT` when running `node --test tests/marksVisualPolish.browser.test.mjs` from the frontend directory.
