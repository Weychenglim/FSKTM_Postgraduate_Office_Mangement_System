# Marks journey verification — 25 October 2026

The acceptance journey runs production React components and API services against Django's real HTTP server and a disposable test database. It does not replace fetch with mocked responses or write to the development database.

## Coverage

Office setup uses the real rubric, component, period, publication and task-generation APIs. One fictional lecturer is Supervisor for one student and Panel member for another. The journey checks that:

- A two-component rubric becomes ready and its evaluation period opens.
- Official appointments generate four role-specific assignments across two lecturers, without duplicates on repeated generation.
- The tested lecturer sees only their own two assignments and their responsibility views remain separate.
- Saving a draft twice persists revised scores, component feedback and overall comments.
- Reopening restores the saved values, and submission locks the editor and backend writes.
- Panel marking can be submitted independently of Supervisor marking.
- Both submissions appear in the lecturer's role-specific read-only history.
- Office list/detail APIs and the rendered Office records workspace agree with the submitted roles, scores and feedback.

There are 23 browser assertions, followed by database assertions for exact assignment/entry/receipt counts, final totals and absence of entries for the other lecturer. The journey creates a newer draft through a second real API call, verifies that the stale form cannot overwrite it, and explicitly loads the saved values. The proxy also returns one simulated gateway failure after Django has really committed the Supervisor submission; retry must succeed with one receipt. All backend requests and results are real, with this single response fault injected by the test proxy. Browser authentication uses short-lived JWTs minted for disposable test users; the login screen and complete authenticated application shell are outside this test.

A separate API regression covers the UTC/Malaysia midnight boundary across the lecturer queue, submission history and Office records. It reproduced an Office list date one day behind lecturer history before applying Malaysia formatting.

## Running

Install the project's existing Python/frontend dependencies and Chrome or Edge. From the frontend directory, run `npm run build` first. Then, from the repository root:

```powershell
./.venv/Scripts/python.exe backend/manage.py test marks.browser_journey --noinput
```

Run the standard Marks regressions and this browser journey together with:

```powershell
./.venv/Scripts/python.exe backend/manage.py test marks marks.browser_journey --parallel=2 --noinput
```

The journey is opt-in by its explicit module name; the normal backend test discovery pattern does not require Chrome or Node. The browser runner receives test credentials through standard input, holds them in memory and proxies only to the ephemeral loopback Django server. It rejects development ports, and its browser profile and bundle are removed afterwards. Django creates and destroys its own test database. Normal portal servers remain running separately.

The existing mocked browser suites continue to cover responsive layouts, filtering and error/retry paths. Their screenshots are fictional fixtures, distinct from this real HTTP acceptance journey.

## Lecturer write contract

Load writeVersion from the authenticated task response. PUT draft requires expectedVersion, scores and comments. POST submit requires the same complete reviewed payload plus a submissionId UUID; it no longer requires a preliminary draft request. A missing version/reference returns 400; a stale version or changed reference payload returns 409 without modifying marks. Keep the submission UUID unchanged when retrying an unchanged attempt after a failed response. A correction or reopening invalidates the old receipt result and requires reloading.

Backend version/receipt tests: `manage.py test marks.test_write_reliability marks.test_write_concurrency`. PostgreSQL race coverage checks two draft tabs, identical simultaneous submissions and distinct submissions from one version. Browser feedback fixtures verify that failed input is retained and latest-record loading is explicit. Apply migration `marks.0011_lecturer_write_reliability` before serving the updated API and frontend together; older pages must reload to obtain a version token.
