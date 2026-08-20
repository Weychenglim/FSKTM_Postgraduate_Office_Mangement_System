"""
Django settings for the FSKTM PG Office backend.

Configuration is read from ``backend/.env`` (see ``.env.example``). The app
serves a JSON auth API for the React frontend and a Django admin for managing
user accounts.
"""

from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env (no-op if the file is absent — sensible defaults below).
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


# ── Core ─────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-change-me-in-production",
)
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# Demo fixtures are opt-in even during local development. Passwords intentionally
# have no fallback so seed_users cannot create known credentials by accident.
ENABLE_DEMO_ACCOUNTS = env_bool("ENABLE_DEMO_ACCOUNTS", False)
DEMO_ADMIN_PASSWORD = os.getenv("DEMO_ADMIN_PASSWORD", "")
DEMO_COORDINATOR_PASSWORD = os.getenv("DEMO_COORDINATOR_PASSWORD", "")
DEMO_LECTURER_PASSWORD = os.getenv("DEMO_LECTURER_PASSWORD", "")
DEMO_STUDENT_PASSWORD = os.getenv("DEMO_STUDENT_PASSWORD", "")
DEMO_LEGACY_EMAIL_MAP = os.getenv("DEMO_LEGACY_EMAIL_MAP", "")

# Where the React app is served — used to build password-reset links.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

AUTH_USER_MODEL = "accounts.User"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "corsheaders",
    # local
    "accounts",
    "appointments",
    "dashboard",
    "marks",
    "letters",
    "announcements",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ── Database (PostgreSQL — reuses the same fsktm_pg_office DB / PG* vars) ─────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("PGDATABASE", "fsktm_pg_office"),
        "USER": os.getenv("PGUSER", "postgres"),
        "PASSWORD": os.getenv("PGPASSWORD", "postgres"),
        "HOST": os.getenv("PGHOST", "localhost"),
        "PORT": os.getenv("PGPORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kuala_Lumpur"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Media (announcement attachments and other uploaded files) ────────────────
# Files are served only through permission-checked API endpoints (e.g.
# /api/announcements/<id>/attachment/), so MEDIA_URL is not exposed publicly.
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Development uses a process-local cache. Multi-worker production deployments
# must replace this with a shared cache so throttle counters remain consistent.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "fsktm-pg-office-api",
    }
}

# Announcement attachments are validated for size, extension, and magic bytes
# before they are stored. Reverse proxies should cap request bodies slightly
# above this so oversized uploads are rejected before reaching Django workers.
ANNOUNCEMENT_MAX_ATTACHMENT_BYTES = env_int(
    "ANNOUNCEMENT_MAX_ATTACHMENT_BYTES", 10 * 1024 * 1024
)

AUTH_LOGIN_THROTTLE_RATE = os.getenv("AUTH_LOGIN_THROTTLE_RATE", "10/minute")
AUTH_PASSWORD_RESET_THROTTLE_RATE = os.getenv(
    "AUTH_PASSWORD_RESET_THROTTLE_RATE", "5/hour"
)
AUTH_PASSWORD_RESET_CONFIRM_THROTTLE_RATE = os.getenv(
    "AUTH_PASSWORD_RESET_CONFIRM_THROTTLE_RATE", "10/hour"
)
# Signed-in password change. Separate scope from reset-confirm, and keyed on the
# account rather than the IP, so shared networks cannot exhaust each other.
AUTH_CHANGE_PASSWORD_THROTTLE_RATE = os.getenv(
    "AUTH_CHANGE_PASSWORD_THROTTLE_RATE", "10/hour"
)

# ── Django REST Framework + SimpleJWT ────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # APIs are private by default. Authentication endpoints opt into AllowAny.
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    # Do not trust X-Forwarded-For until a known reverse-proxy chain is configured.
    "NUM_PROXIES": max(env_int("DRF_NUM_PROXIES", 0), 0),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ── CORS (the Vite dev server proxies /api, but allow direct calls too) ───────
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)

# ── Email (real SMTP when creds are set, console backend otherwise) ──────────
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
else:
    # No credentials yet — print the email (and reset link) to the runserver console.
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER or "FSKTM PG Office <no-reply@fsktm.edu.my>",
)

# Password-reset links expire after 30 minutes (matches the frontend copy).
PASSWORD_RESET_TIMEOUT = 60 * 30
