# Same-Origin Nginx Deployment

The production layout serves the React build and Django API from one HTTPS
origin on Nginx 1.19.4 or newer. Replace `portal.example.test`, certificate
paths, and the Django upstream name in `fsktm-postgraduate.conf.example` for the
target environment.

## Build and collect static files

```powershell
cd frontend
npm ci
npm run build

cd ..\backend
python manage.py migrate
python manage.py collectstatic --noinput
```

Deploy `frontend/dist` to `/srv/fsktm/frontend/dist` and
`backend/staticfiles` to `/srv/fsktm/backend/staticfiles`. Copy this directory's
two CSP includes to `/etc/nginx/fsktm/`, install the site template in the Nginx
sites directory, and verify the final configuration with `nginx -t`.

The tracked site template starts with:

```nginx
include /etc/nginx/fsktm/csp-report-only.conf;
```

Inspect the browser console across all supported roles. When owned workflows
produce no CSP violations, switch that line to:

```nginx
include /etc/nginx/fsktm/csp-enforced.conf;
```

Run `nginx -t`, reload Nginx, and repeat the smoke test. These snippets do not
send reports to a backend collector; centralized CSP reporting is deferred
until a sanitized, rate-limited monitoring endpoint is designed.

## Production environment

Use a strong generated secret and the deployed HTTPS hostname:

```dotenv
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<generated-secret-with-at-least-50-characters>
DJANGO_ALLOWED_HOSTS=portal.example.test
CORS_ALLOWED_ORIGINS=https://portal.example.test
FRONTEND_URL=https://portal.example.test
DJANGO_TRUST_X_FORWARDED_PROTO=True
DRF_NUM_PROXIES=1
```

`DRF_NUM_PROXIES=1` is correct only when this Nginx instance is the sole trusted
proxy. Set it to the exact trusted proxy count if another load balancer or CDN
is added. The supplied template overwrites `X-Forwarded-Proto`; it never trusts
the client-provided value.

Build the frontend with the same-origin API path:

```dotenv
VITE_API_BASE_URL="/api"
```

The site template keeps the upload body limit at 12 MB, starts HSTS at one hour,
serves hashed Vite assets with long-lived caching, and serves Django Admin static
files from the collected static directory. It returns `404` for every `.map`
request, including third-party maps that may be present in collected static
packages. Unknown HTTP hosts are rejected instead of being reflected into
redirects, and Nginx suppresses Django's upstream HSTS value so the public
response has one authoritative HSTS policy.
