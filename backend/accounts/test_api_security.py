import re

from django.conf import settings
from django.test import SimpleTestCase
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.permissions import AllowAny
from rest_framework.test import APIClient


PUBLIC_DRF_ENDPOINTS = {
    "/api/auth/login/",
    "/api/auth/password-reset/",
    "/api/auth/password-reset/confirm/",
}


def concrete_path(route):
    route = re.sub(r"<int:[^>]+>", "1", route)
    route = re.sub(r"<uuid:[^>]+>", "00000000-0000-0000-0000-000000000001", route)
    route = re.sub(r"<(?:str|slug|path):[^>]+>", "test", route)
    return f"/{route}"


def api_patterns(patterns=None, prefix=""):
    patterns = patterns or get_resolver().url_patterns
    for pattern in patterns:
        route = f"{prefix}{pattern.pattern}"
        if isinstance(pattern, URLResolver):
            yield from api_patterns(pattern.url_patterns, route)
        elif isinstance(pattern, URLPattern) and route.startswith("api/"):
            yield route, pattern.callback


class APIAuthenticationBaselineTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_drf_defaults_to_authenticated_access(self):
        self.assertEqual(
            settings.REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"],
            ("rest_framework.permissions.IsAuthenticated",),
        )

    def test_only_expected_drf_endpoints_allow_anonymous_access(self):
        anonymous_drf_endpoints = set()

        for route, callback in api_patterns():
            path = concrete_path(route)
            view_class = getattr(callback, "cls", None)
            if view_class is None:
                continue
            if AllowAny in view_class.permission_classes:
                anonymous_drf_endpoints.add(path)

        self.assertEqual(anonymous_drf_endpoints, PUBLIC_DRF_ENDPOINTS)

    def test_every_nonpublic_api_method_rejects_anonymous_requests(self):
        checked = set()

        for route, callback in api_patterns():
            path = concrete_path(route)
            if path in PUBLIC_DRF_ENDPOINTS or path == "/api/health/":
                continue

            view_class = getattr(callback, "cls", None)
            if view_class is None:
                continue

            for method in view_class().allowed_methods:
                if method == "OPTIONS":
                    continue
                response = self.client.generic(method, path, data={}, format="json")
                self.assertEqual(
                    response.status_code,
                    401,
                    f"{method} {path} did not require authentication.",
                )
                checked.add((method, path))

        self.assertGreater(len(checked), 50)

    def test_public_api_surface_remains_minimal(self):
        for path in PUBLIC_DRF_ENDPOINTS:
            response = self.client.post(path, {}, format="json")
            self.assertNotIn(response.status_code, {401, 403})

        health = self.client.get("/api/health/")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"status": "ok", "service": "fsktm-pg-office-api"})
