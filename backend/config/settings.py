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

from .production_security import (
    DEVELOPMENT_SECRET_KEY,
    validate_production_environment,
)

BASE_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env (no-op if the file is absent — sensible defaults below).
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def env_list(name: str, default: str) -> list[str]:
    raw_value = os.getenv(name, "").strip() or default
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


# ── Core ─────────────────────────────────────────────────────────────────────
DEBUG = env_bool("DJANGO_DEBUG", True)
configured_secret_key = os.getenv("DJANGO_SECRET_KEY", "").strip()
SECRET_KEY = configured_secret_key or (DEVELOPMENT_SECRET_KEY if DEBUG else "")
ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1" if DEBUG else "",
)
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000" if DEBUG else "",
)

if not DEBUG:
    validate_production_environment(
        secret_key=SECRET_KEY,
        allowed_hosts=ALLOWED_HOSTS,
        cors_origins=CORS_ALLOWED_ORIGINS,
    )

    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = max(env_int("DJANGO_SECURE_HSTS_SECONDS", 3600), 0)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
        "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", False
    )
    SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Strict"
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SAMESITE = "Strict"
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"

    if env_bool("DJANGO_TRUST_X_FORWARDED_PROTO", False):
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

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
    "rest_framework_simplejwt.token_blacklist",
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
STATIC_ROOT = BASE_DIR / "staticfiles"
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

AUTH_LOGIN_THROTTLE_RATE = os.getenv("AUTH_LOGIN_THROTTLE_RATE", "10/minute")
AUTH_PASSWORD_RESET_THROTTLE_RATE = os.getenv(
    "AUTH_PASSWORD_RESET_THROTTLE_RATE", "5/hour"
)
AUTH_PASSWORD_RESET_CONFIRM_THROTTLE_RATE = os.getenv(
    "AUTH_PASSWORD_RESET_CONFIRM_THROTTLE_RATE", "10/hour"
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
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=max(env_int("JWT_ACCESS_TOKEN_MINUTES", 15), 1)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=max(env_int("JWT_REFRESH_TOKEN_DAYS", 7), 1)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "CHECK_REVOKE_TOKEN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

JWT_REFRESH_COOKIE_NAME = "fsktm_refresh_token"
JWT_REFRESH_COOKIE_PATH = "/api/auth/"
JWT_REFRESH_COOKIE_SECURE = not DEBUG
CORS_ALLOW_CREDENTIALS = True

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
