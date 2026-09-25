from urllib.parse import urlsplit

from django.core.exceptions import ImproperlyConfigured


DEVELOPMENT_SECRET_KEY = "django-insecure-dev-only-change-me-in-production"
SECRET_KEY_PLACEHOLDERS = {
    DEVELOPMENT_SECRET_KEY,
    "change-me-to-a-long-random-string",
}


def validate_production_environment(secret_key, allowed_hosts, cors_origins):
    normalized_secret = secret_key.strip()
    if (
        not normalized_secret
        or normalized_secret.startswith("django-insecure-")
        or normalized_secret in SECRET_KEY_PLACEHOLDERS
        or len(normalized_secret) < 50
        or len(set(normalized_secret)) < 5
    ):
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY must be a random production value with at least "
            "50 characters and 5 unique characters."
        )

    if not allowed_hosts or "*" in allowed_hosts:
        raise ImproperlyConfigured(
            "DJANGO_ALLOWED_HOSTS must contain explicit production hostnames "
            "and cannot include '*'."
        )

    if not cors_origins:
        raise ImproperlyConfigured(
            "CORS_ALLOWED_ORIGINS must contain at least one explicit HTTPS origin."
        )

    for origin in cors_origins:
        try:
            parsed = urlsplit(origin)
        except ValueError as error:
            raise ImproperlyConfigured(
                "CORS_ALLOWED_ORIGINS entries must be valid HTTPS origins."
            ) from error
        if (
            parsed.scheme != "https"
            or not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path
            or parsed.query
            or parsed.fragment
        ):
            raise ImproperlyConfigured(
                "CORS_ALLOWED_ORIGINS entries must be HTTPS origins without "
                "credentials, paths, queries, or fragments."
            )
