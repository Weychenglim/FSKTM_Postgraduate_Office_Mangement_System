# Release and staging runbook

This is preparation for a future staging server. No hosting provider, domain,
server, or production database has been provisioned. The existing reference
deployment is Linux with Nginx, PostgreSQL, and a managed Django WSGI process.
Use a separate staging database and synthetic accounts for acceptance testing.

Local synthetic browser acceptance and its limits are recorded in
[`BROWSER_ACCEPTANCE_2026-10-05.md`](../docs/BROWSER_ACCEPTANCE_2026-10-05.md).
Repeat the release gates on the actual host; local results do not verify its
HTTPS, proxy routing, email delivery or recovery configuration.

## Decisions before provisioning

- Confirm the faculty's hosting owner, domain, TLS certificate management,
  access policy, email sender, backup location, retention, and recovery targets.
- Select a production WSGI server and service manager. A WSGI server is not
  currently included in `backend/requirements.txt`; install and pin the approved
  runtime in the deployment environment. Do not expose Django `runserver`.
- Allocate storage for PostgreSQL data, WAL, logs, uploads, backups, and temporary
  restore/test databases. Monitor free space on the actual database volume.
  A small database alone does not guarantee enough operating headroom.
- Keep the five owned academic-workflow modules as the acceptance scope.
  Faculty rules/templates and unfinished modules require separate sign-off.

## Build and verification

Use Python compatible with the project's Django dependencies (local verification
uses Python 3.12), PostgreSQL (local verification uses 16), and Node.js 22.22.0
or newer. Install backend requirements in a virtual environment and use
`npm ci` with the reviewed frontend lockfile.

Run these against development/test infrastructure, never the production database:

```text
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test accounts academics appointments dashboard marks --parallel 2 --noinput
```

In `frontend`, run every `src/**/*.test.ts` and `src/**/*.test.tsx` script with
the installed `tsx` runner, then:

```text
npm run lint
npm run build
npm run test:production-security
npm run audit:security
```

Record the commit SHA and actual results. If PostgreSQL reports disk exhaustion,
stop the release, restore storage headroom, and rerun the interrupted suite.
Do not treat a parallel runner's secondary traceback-pickling error as the cause.

## Environment and deployment

Start from `backend/.env.example` and `frontend/.env.example`. Keep real values
outside Git and outside `frontend/dist`. Browser variables must never contain
database, mail, or Django secrets.

- Set `DJANGO_DEBUG=False`, a generated `DJANGO_SECRET_KEY`, explicit
  `DJANGO_ALLOWED_HOSTS`, HTTPS `CORS_ALLOWED_ORIGINS`, and HTTPS `FRONTEND_URL`.
- Configure `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` for the
  intended environment. Use restricted application credentials; do not reuse
  the local PostgreSQL superuser for public hosting.
- Set `DJANGO_CACHE_BACKEND=database` (also the `DEBUG=False` default). Every
  worker must connect to the same primary database and `fsktm_api_cache` table.
  Production rejects `locmem`; do not change this to a per-worker cache.
- Set `ENABLE_DEMO_ACCOUNTS=False` and leave demo passwords unset. Build with
  `VITE_ENABLE_DEMO_LOGIN=false`, `VITE_USE_MOCKS=false`, and
  `VITE_API_BASE_URL=/api`. Do not copy local demo environment files to staging.
- Configure the approved SMTP sender and verify password-reset email delivery.
- Set proxy trust and HSTS according to the actual proxy layout, using the
  [Nginx guide](nginx/README.md). Expose only Nginx publicly; protect PostgreSQL
  and the Django upstream from direct external access.

Before an upgrade, pause writes and take a database plus media backup. In the
new release directory, load the target environment and run:

```text
python manage.py check --deploy
python manage.py migrate --plan
python manage.py migrate --noinput
python manage.py createcachetable
python manage.py collectstatic --noinput
```

Run Django's `config.wsgi:application` with the approved WSGI service on the
private upstream configured in Nginx. Deploy `frontend/dist` and collected
static assets following the existing Nginx template. Keep uploaded application
documents behind authenticated download endpoints, not an unrestricted static
media alias. Check `nginx -t`, enable HTTPS, and follow the documented CSP
report-only-to-enforcement rollout. Verify secure cookies and redirects on the
real HTTPS origin before opening the service to users.

## Shared-cache preflight

`createcachetable` creates the dedicated cache table if absent and preserves an
existing table. Run it with the deployed production environment before workers
serve authentication requests. The provisioning identity needs schema-creation
permission; the runtime identity needs SELECT/INSERT/UPDATE/DELETE on this table.
An unavailable table/database causes request errors; there is no silent fallback
to a process-local cache. This cache holds expiring throttle histories rather
than academic records. Do not clear it during worker restarts or rolling releases.

In isolated staging, start at least two API workers with the same configuration.
Route four invalid login attempts from one test IP to worker A and six to worker
B; the next attempt through either worker must return 429 and a positive
`Retry-After`. Repeat the reset-request budget as 2 + 3 attempts and confirmation
as 4 + 6 attempts. Keep the IP stable, use synthetic nonexistent accounts, and
avoid real reset emails. Confirm different IPs and endpoint scopes remain
independent. Repeat through the real proxy to verify `DRF_NUM_PROXIES` identifies
the client IP correctly. Repository subprocess regressions prove sharing locally;
they do not validate a future hosting proxy or load balancer.

The default cache capacity is 10,000 entries. Monitor table size, database load
and culling at the expected client volume. DRF history updates are non-atomic,
so simultaneous requests can exceed the nominal limit even with a shared cache.
Use the hosting edge's approved abuse protection when required; these application
throttles are not a guarantee against denial-of-service or brute-force attacks.
See [Django database-cache setup](https://docs.djangoproject.com/en/5.2/topics/cache/#database-caching)
and [DRF concurrency guidance](https://www.django-rest-framework.org/api-guide/throttling/#a-note-on-concurrency).

## Backup and restore rehearsal

Configure PostgreSQL client authentication through the host's protected secret
mechanism or password file. Do not put passwords in command arguments or Git.
The following shell commands assume connection variables identify the source
server, `PGDATABASE` identifies the source database, and the two explicit paths
have been reviewed. The restore target must be a new, isolated database.

```sh
umask 077
pg_dump --format=custom --file="$BACKUP_PATH" --dbname="$PGDATABASE"
pg_restore --list "$BACKUP_PATH"
createdb "$RESTORE_DATABASE"
pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_DATABASE" "$BACKUP_PATH"
```

Back up the private media directory at the same write-paused point and protect
it with the same retention/access controls as the database. Restore media to a
separate test location. Compare table counts and content fingerprints, then
verify representative documents, appointments, rubric versions, submitted Marks,
completion windows, research revisions, and immutable audits through the app.
Keep backups off the database's only disk and test recovery regularly.

Local rehearsal on 2026-09-28 restored a custom-format dump into an isolated
database and matched row counts and content fingerprints across all 62 public
tables. The local fixture had no Marks records; migration tests separately cover
drafts/submitted scores and completion windows. This rehearsal is not a claim
that a future server's media storage, credentials, or recovery procedure works.

## Acceptance walkthrough

Use synthetic records in staging and record results for each role:

1. Student requests a title/abstract amendment. Original research remains current
   until primary endorsement and coordinator approval both succeed.
2. Supervisor endorses; coordinator approves. Verify current research, immutable
   before/after revisions, original application contents, and Dashboard actions.
3. Office applies a minor correction with a reason and meaning-unchanged declaration.
4. Office requests a programme transfer. Source and destination coordinators each
   acknowledge retained appointments. Confirm both programme fields change, the
   team stays assigned, and the outgoing coordinator loses current student access.
5. Check rejection/cancellation, unrelated-user denial, supporting-role privacy,
   and the requirement to resolve pending nominations before a transfer.
6. Exercise acting-coordinator grant/revoke and a Marks completion window on an
   unfinished task, including expiry/revocation and closed-period completion.
7. Review reports, XLSX exports, dossiers, and reconciliation. Verify existing
   submitted Marks and private application documents remain protected.
8. Office creates Add Entry milestones in selected Draft and Active semesters.
   Reload each timeline and verify its own entry and immutable ADD_ENTRY audit.
9. Student replacement candidates exclude the same student's active/pending
   Panel member. Verify a stale conflicting request cannot gain final approval;
   the primary appointment/profile/history remain unchanged.
10. Lecturer filters current and historical Marks by evaluation-period semester,
    including a retained older research-profile label. Reject a negative score
    without a saved draft; save valid scores and inspect historical read-only marks.
11. Governed Django admin detail screens have no add/save/delete actions for
    appointment requests/appointments/configuration/audits. Academic changes use
    the application workflows; audited Marks correction remains available.
12. Check persisted phone and announcement preference after reload for Student,
    Lecturer, Coordinator and Office. Email remains Office-managed and unavailable
    notification services are labelled. A human performs password entry/change,
    then verifies logout and subsequent sign-in with the new password.

Obtain faculty acceptance of policies, templates, and representative cases before
production release. Keep screenshots/demo evidence free of real student data.

## Rollback

Keep the previous release artifact and the pre-upgrade database/media backup.
Pause writes before recovery. Prefer a code-only rollback only when the old
application is confirmed compatible with the migrated schema. Otherwise restore
the pre-upgrade database to a new target, restore matching media, validate it,
and switch the application connection under the agreed maintenance procedure.
Do not blindly reverse migrations or overwrite the only live database. Record
any post-backup writes requiring reconciliation before reopening access.
