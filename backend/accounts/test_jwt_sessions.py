from datetime import timedelta

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from .models import User


class JwtSessionLifecycleTests(TestCase):
    password = "Initial-secure-password-482!"
    refresh_cookie_name = "fsktm_refresh_token"

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="session.user@example.test",
            password=self.password,
            full_name="Session Test User",
            role=User.Role.STUDENT,
        )
        self.client = APIClient()

    def login(self):
        return self.client.post(
            "/api/auth/login/",
            {"identifier": self.user.email, "password": self.password},
            format="json",
            REMOTE_ADDR="192.0.2.80",
        )

    def test_configures_short_access_and_seven_day_refresh_lifetimes(self):
        self.assertEqual(
            settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"],
            timedelta(minutes=15),
        )
        self.assertEqual(
            settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"],
            timedelta(days=7),
        )
        self.assertIs(settings.SIMPLE_JWT["ROTATE_REFRESH_TOKENS"], True)
        self.assertIs(settings.SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"], True)
        self.assertIs(settings.SIMPLE_JWT["CHECK_REVOKE_TOKEN"], True)

    def test_login_sets_http_only_refresh_cookie_without_exposing_token(self):
        response = self.login()

        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)
        self.assertNotIn("refresh", response.data)
        cookie = response.cookies[self.refresh_cookie_name]
        self.assertTrue(cookie.value)
        self.assertIs(cookie["httponly"], True)
        self.assertEqual(cookie["samesite"], "Strict")
        self.assertEqual(cookie["path"], "/api/auth/")
        self.assertEqual(bool(cookie["secure"]), settings.JWT_REFRESH_COOKIE_SECURE)

        refresh = RefreshToken(cookie.value)
        self.assertEqual(str(refresh["user_id"]), str(self.user.pk))

    def test_refresh_rotates_cookie_and_rejects_previous_token(self):
        login_response = self.login()
        old_refresh = login_response.cookies[self.refresh_cookie_name].value

        response = self.client.post("/api/auth/refresh/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)
        self.assertNotIn("refresh", response.data)
        new_refresh = response.cookies[self.refresh_cookie_name].value
        self.assertNotEqual(new_refresh, old_refresh)

        access = AccessToken(response.data["token"])
        self.assertEqual(str(access["user_id"]), str(self.user.pk))

        replay_client = APIClient()
        replay_client.cookies[self.refresh_cookie_name] = old_refresh
        replay = replay_client.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(replay.status_code, 401)

    def test_logout_blacklists_refresh_token_and_deletes_cookie(self):
        login_response = self.login()
        old_refresh = login_response.cookies[self.refresh_cookie_name].value

        response = self.client.post("/api/auth/logout/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Logged out successfully.")
        deleted_cookie = response.cookies[self.refresh_cookie_name]
        self.assertEqual(deleted_cookie["max-age"], 0)
        self.assertIs(deleted_cookie["httponly"], True)
        self.assertEqual(deleted_cookie["samesite"], "Strict")
        self.assertEqual(deleted_cookie["path"], "/api/auth/")
        self.assertEqual(
            bool(deleted_cookie["secure"]),
            settings.JWT_REFRESH_COOKIE_SECURE,
        )

        replay_client = APIClient()
        replay_client.cookies[self.refresh_cookie_name] = old_refresh
        replay = replay_client.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(replay.status_code, 401)

    def test_refresh_rejects_missing_malformed_and_expired_cookies(self):
        missing = self.client.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(missing.status_code, 401)

        self.client.cookies[self.refresh_cookie_name] = "not-a-jwt"
        malformed = self.client.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(malformed.status_code, 401)

        expired = RefreshToken.for_user(self.user)
        expired.set_exp(lifetime=timedelta(seconds=-1))
        self.client.cookies[self.refresh_cookie_name] = str(expired)
        expired_response = self.client.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(expired_response.status_code, 401)

    def test_cookie_session_endpoints_reject_form_posts(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {"identifier": self.user.email, "password": self.password},
            format="multipart",
            REMOTE_ADDR="192.0.2.82",
        )
        self.assertEqual(login_response.status_code, 415)

        self.login()

        refresh_response = self.client.post(
            "/api/auth/refresh/",
            {},
            format="multipart",
        )
        logout_response = self.client.post(
            "/api/auth/logout/",
            {},
            format="multipart",
        )

        self.assertEqual(refresh_response.status_code, 415)
        self.assertEqual(logout_response.status_code, 415)

    def test_inactive_user_cannot_refresh_or_use_existing_access_token(self):
        login_response = self.login()
        access = login_response.data["token"]
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        refresh_response = self.client.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(refresh_response.status_code, 401)

        api_client = APIClient()
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        me_response = api_client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, 401)

    def test_password_reset_invalidates_existing_access_and_refresh_tokens(self):
        login_response = self.login()
        old_access = login_response.data["token"]
        old_refresh = login_response.cookies[self.refresh_cookie_name].value
        old_jti = RefreshToken(old_refresh)["jti"]
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        reset_token = default_token_generator.make_token(self.user)

        reset_response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": reset_token,
                "new_password": "Replacement-secure-password-739!",
            },
            format="json",
            REMOTE_ADDR="192.0.2.81",
        )
        self.assertEqual(reset_response.status_code, 200)
        self.assertTrue(
            BlacklistedToken.objects.filter(token__jti=old_jti).exists()
        )

        access_client = APIClient()
        access_client.credentials(HTTP_AUTHORIZATION=f"Bearer {old_access}")
        self.assertEqual(access_client.get("/api/auth/me/").status_code, 401)

        refresh_client = APIClient()
        refresh_client.cookies[self.refresh_cookie_name] = old_refresh
        self.assertEqual(
            refresh_client.post("/api/auth/refresh/", {}, format="json").status_code,
            401,
        )
