from django.conf import settings
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class AuthenticationThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def post(self, path, payload, ip="192.0.2.10", forwarded_for=None):
        extra = {"REMOTE_ADDR": ip}
        if forwarded_for is not None:
            extra["HTTP_X_FORWARDED_FOR"] = forwarded_for
        return self.client.post(path, payload, format="json", **extra)

    def assert_throttled(self, response):
        self.assertEqual(response.status_code, 429)
        self.assertGreater(int(response.headers["Retry-After"]), 0)
        self.assertIn("throttled", response.json()["detail"].lower())

    def test_security_settings_use_expected_defaults(self):
        self.assertEqual(settings.AUTH_LOGIN_THROTTLE_RATE, "10/minute")
        self.assertEqual(settings.AUTH_PASSWORD_RESET_THROTTLE_RATE, "5/hour")
        self.assertEqual(settings.AUTH_PASSWORD_RESET_CONFIRM_THROTTLE_RATE, "10/hour")
        self.assertEqual(settings.REST_FRAMEWORK["NUM_PROXIES"], 0)

    def test_login_allows_ten_attempts_then_throttles(self):
        payload = {"identifier": "missing@example.test", "password": "incorrect"}
        for _ in range(10):
            self.assertNotEqual(self.post("/api/auth/login/", payload).status_code, 429)

        self.assert_throttled(self.post("/api/auth/login/", payload))

    def test_password_reset_request_allows_five_attempts_then_throttles(self):
        payload = {"email": "missing@example.test"}
        for _ in range(5):
            self.assertNotEqual(
                self.post("/api/auth/password-reset/", payload).status_code,
                429,
            )

        self.assert_throttled(self.post("/api/auth/password-reset/", payload))

    def test_password_reset_confirmation_allows_ten_attempts_then_throttles(self):
        payload = {
            "uid": "invalid",
            "token": "invalid-token",
            "new_password": "new-test-password",
        }
        for _ in range(10):
            self.assertNotEqual(
                self.post("/api/auth/password-reset/confirm/", payload).status_code,
                429,
            )

        self.assert_throttled(
            self.post("/api/auth/password-reset/confirm/", payload)
        )

    def test_throttle_scopes_do_not_share_counters(self):
        ip = "192.0.2.20"
        for _ in range(5):
            self.post(
                "/api/auth/password-reset/",
                {"email": "missing@example.test"},
                ip=ip,
            )

        login = self.post(
            "/api/auth/login/",
            {"identifier": "missing@example.test", "password": "incorrect"},
            ip=ip,
        )
        confirmation = self.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": "invalid",
                "token": "invalid-token",
                "new_password": "new-test-password",
            },
            ip=ip,
        )
        self.assertNotEqual(login.status_code, 429)
        self.assertNotEqual(confirmation.status_code, 429)

    def test_client_ips_have_separate_counters(self):
        payload = {"email": "missing@example.test"}
        for _ in range(6):
            blocked = self.post("/api/auth/password-reset/", payload, ip="192.0.2.30")

        self.assert_throttled(blocked)
        self.assertNotEqual(
            self.post("/api/auth/password-reset/", payload, ip="192.0.2.31").status_code,
            429,
        )

    def test_cache_clear_resets_throttle_counter(self):
        payload = {"email": "missing@example.test"}
        for _ in range(6):
            blocked = self.post("/api/auth/password-reset/", payload)
        self.assert_throttled(blocked)

        cache.clear()
        self.assertNotEqual(
            self.post("/api/auth/password-reset/", payload).status_code,
            429,
        )

    def test_forwarded_for_cannot_bypass_remote_address_limit(self):
        payload = {"identifier": "missing@example.test", "password": "incorrect"}
        for attempt in range(11):
            response = self.post(
                "/api/auth/login/",
                payload,
                ip="192.0.2.40",
                forwarded_for=f"198.51.100.{attempt + 1}",
            )

        self.assert_throttled(response)

    @override_settings(AUTH_LOGIN_THROTTLE_RATE="1/minute")
    def test_rate_setting_is_runtime_configurable(self):
        payload = {"identifier": "missing@example.test", "password": "incorrect"}
        self.assertNotEqual(self.post("/api/auth/login/", payload).status_code, 429)
        self.assert_throttled(self.post("/api/auth/login/", payload))
