import json
import os
import subprocess
import sys

from django.test import SimpleTestCase


DEV_SECRET_KEY = "django-insecure-dev-only-change-me-in-production"
VALID_SECRET_KEY = "production-test-key-9f4c2a7b1d8e6g3h5j0k2m4n6p8r1t3v5x7z9"
SETTINGS_MARKER = "__PRODUCTION_SETTINGS__"

SETTINGS_SCRIPT = f"""
import json
import config.settings as settings

payload = {{
    "usesDevSecret": settings.SECRET_KEY == {DEV_SECRET_KEY!r},
    "allowedHosts": settings.ALLOWED_HOSTS,
    "corsOrigins": settings.CORS_ALLOWED_ORIGINS,
    "secureSslRedirect": getattr(settings, "SECURE_SSL_REDIRECT", False),
    "secureHstsSeconds": getattr(settings, "SECURE_HSTS_SECONDS", 0),
    "secureHstsIncludeSubdomains": getattr(settings, "SECURE_HSTS_INCLUDE_SUBDOMAINS", False),
    "secureHstsPreload": getattr(settings, "SECURE_HSTS_PRELOAD", False),
    "sessionCookieSecure": getattr(settings, "SESSION_COOKIE_SECURE", False),
    "sessionCookieHttpOnly": getattr(settings, "SESSION_COOKIE_HTTPONLY", True),
    "sessionCookieSameSite": getattr(settings, "SESSION_COOKIE_SAMESITE", "Lax"),
    "csrfCookieSecure": getattr(settings, "CSRF_COOKIE_SECURE", False),
    "csrfCookieHttpOnly": getattr(settings, "CSRF_COOKIE_HTTPONLY", False),
    "csrfCookieSameSite": getattr(settings, "CSRF_COOKIE_SAMESITE", "Lax"),
    "contentTypeNosniff": getattr(settings, "SECURE_CONTENT_TYPE_NOSNIFF", True),
    "referrerPolicy": getattr(settings, "SECURE_REFERRER_POLICY", "same-origin"),
    "xFrameOptions": getattr(settings, "X_FRAME_OPTIONS", "DENY"),
    "proxySslHeader": getattr(settings, "SECURE_PROXY_SSL_HEADER", None),
}}
print({SETTINGS_MARKER!r} + json.dumps(payload))
"""


class ProductionSettingsTests(SimpleTestCase):
    def production_environment(self, **overrides):
        environment = os.environ.copy()
        environment.update(
            {
                "DJANGO_DEBUG": "False",
                "DJANGO_SECRET_KEY": VALID_SECRET_KEY,
                "DJANGO_ALLOWED_HOSTS": "api.example.test",
                "CORS_ALLOWED_ORIGINS": "https://portal.example.test",
                "DJANGO_SECURE_HSTS_SECONDS": "3600",
                "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS": "False",
                "DJANGO_SECURE_HSTS_PRELOAD": "False",
                "DJANGO_TRUST_X_FORWARDED_PROTO": "False",
                "ENABLE_DEMO_ACCOUNTS": "False",
            }
        )
        environment.update(overrides)
        return environment

    def load_settings(self, **overrides):
        completed = subprocess.run(
            [sys.executable, "-c", SETTINGS_SCRIPT],
            cwd=os.path.dirname(os.path.dirname(__file__)),
            env=self.production_environment(**overrides),
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        payload = None
        for line in completed.stdout.splitlines():
            if line.startswith(SETTINGS_MARKER):
                payload = json.loads(line.removeprefix(SETTINGS_MARKER))
        return completed, payload

    def assert_startup_rejected(self, expected_setting, **overrides):
        completed, payload = self.load_settings(**overrides)
        self.assertNotEqual(completed.returncode, 0)
        self.assertIsNone(payload)
        self.assertIn("ImproperlyConfigured", completed.stderr)
        self.assertIn(expected_setting, completed.stderr)

    def test_production_rejects_missing_fallback_placeholder_and_weak_secrets(self):
        rejected_secrets = (
            "",
            DEV_SECRET_KEY,
            "django-insecure-another-generated-development-key",
            "change-me-to-a-long-random-string",
            "short-but-varied",
            "a" * 60,
        )

        for secret in rejected_secrets:
            with self.subTest(secret=secret[:20]):
                self.assert_startup_rejected(
                    "DJANGO_SECRET_KEY",
                    DJANGO_SECRET_KEY=secret,
                )

    def test_production_rejects_missing_or_wildcard_allowed_hosts(self):
        for hosts in ("", "*", "api.example.test,*"):
            with self.subTest(hosts=hosts):
                self.assert_startup_rejected(
                    "DJANGO_ALLOWED_HOSTS",
                    DJANGO_ALLOWED_HOSTS=hosts,
                )

    def test_production_rejects_missing_http_or_malformed_cors_origins(self):
        invalid_origins = (
            "",
            "http://portal.example.test",
            "portal.example.test",
            "https://",
            "https://[malformed.example.test",
            "https://portal.example.test/path",
            "https://portal.example.test,http://admin.example.test",
        )

        for origins in invalid_origins:
            with self.subTest(origins=origins):
                self.assert_startup_rejected(
                    "CORS_ALLOWED_ORIGINS",
                    CORS_ALLOWED_ORIGINS=origins,
                )

    def test_valid_production_environment_enables_security_controls(self):
        completed, payload = self.load_settings()

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(payload["allowedHosts"], ["api.example.test"])
        self.assertEqual(payload["corsOrigins"], ["https://portal.example.test"])
        expected_settings = {
            "usesDevSecret": False,
            "secureSslRedirect": True,
            "secureHstsSeconds": 3600,
            "secureHstsIncludeSubdomains": False,
            "secureHstsPreload": False,
            "sessionCookieSecure": True,
            "sessionCookieHttpOnly": True,
            "sessionCookieSameSite": "Strict",
            "csrfCookieSecure": True,
            "csrfCookieHttpOnly": True,
            "csrfCookieSameSite": "Strict",
            "contentTypeNosniff": True,
            "referrerPolicy": "same-origin",
            "xFrameOptions": "DENY",
            "proxySslHeader": None,
        }
        for setting, expected_value in expected_settings.items():
            with self.subTest(setting=setting):
                self.assertEqual(payload[setting], expected_value)

    def test_hsts_and_trusted_proxy_controls_are_environment_configurable(self):
        completed, payload = self.load_settings(
            DJANGO_SECURE_HSTS_SECONDS="31536000",
            DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS="True",
            DJANGO_SECURE_HSTS_PRELOAD="True",
            DJANGO_TRUST_X_FORWARDED_PROTO="True",
        )

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(payload["secureHstsSeconds"], 31_536_000)
        self.assertIs(payload["secureHstsIncludeSubdomains"], True)
        self.assertIs(payload["secureHstsPreload"], True)
        self.assertEqual(
            payload["proxySslHeader"],
            ["HTTP_X_FORWARDED_PROTO", "https"],
        )

    def test_debug_mode_preserves_local_http_development_defaults(self):
        completed, payload = self.load_settings(
            DJANGO_DEBUG="True",
            DJANGO_SECRET_KEY="",
            DJANGO_ALLOWED_HOSTS="",
            CORS_ALLOWED_ORIGINS="",
        )

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIs(payload["usesDevSecret"], True)
        self.assertEqual(payload["allowedHosts"], ["localhost", "127.0.0.1"])
        self.assertEqual(
            payload["corsOrigins"],
            ["http://localhost:3000", "http://127.0.0.1:3000"],
        )
        self.assertIs(payload["secureSslRedirect"], False)
        self.assertEqual(payload["secureHstsSeconds"], 0)
        self.assertIs(payload["sessionCookieSecure"], False)
        self.assertIs(payload["csrfCookieSecure"], False)
