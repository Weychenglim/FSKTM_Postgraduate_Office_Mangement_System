"""Remember me: a sign-in stays on the device only when the person asks (UC01)."""

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User

LOGIN = "/api/auth/login/"
REFRESH = "/api/auth/refresh/"
CHANGE_PASSWORD = "/api/auth/me/change-password/"
COOKIE = settings.JWT_REFRESH_COOKIE_NAME
EMAIL = "remember.me@example.test"
PASSWORD = "Remember-pass-7101!"
REMEMBERED_HOURS = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds() / 3600
SESSION_HOURS = settings.JWT_SESSION_REFRESH_LIFETIME.total_seconds() / 3600


def hours_left(raw_token):
    return (RefreshToken(raw_token)["exp"] - timezone.now().timestamp()) / 3600


class RememberMeTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email=EMAIL, password=PASSWORD, full_name="Remember Me", role=User.Role.STUDENT
        )

    def login(self, client, remember=None):
        body = {"identifier": EMAIL, "password": PASSWORD}
        if remember is not None:
            body["rememberMe"] = remember
        return client.post(LOGIN, body, format="json")

    def test_without_remember_me_the_cookie_ends_with_the_browser(self):
        cookie = self.login(self.client).cookies[COOKIE]
        self.assertEqual((cookie["max-age"], cookie["expires"]), ("", ""))
        self.assertIs(RefreshToken(cookie.value)["remember"], False)
        self.assertAlmostEqual(hours_left(cookie.value), SESSION_HOURS, delta=0.1)

    def test_remember_me_keeps_the_sign_in_for_the_refresh_lifetime(self):
        cookie = self.login(self.client, True).cookies[COOKIE]
        self.assertEqual(cookie["max-age"], int(REMEMBERED_HOURS * 3600))
        self.assertIs(RefreshToken(cookie.value)["remember"], True)
        self.assertAlmostEqual(hours_left(cookie.value), REMEMBERED_HOURS, delta=0.1)

    def test_a_refresh_keeps_the_choice(self):
        for remember, hours in ((False, SESSION_HOURS), (True, REMEMBERED_HOURS)):
            with self.subTest(remember=remember):
                client = APIClient()
                signed_in = self.login(client, remember).cookies[COOKIE].value
                response = client.post(REFRESH, {}, format="json")
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                cookie = response.cookies[COOKIE]
                self.assertNotEqual(cookie.value, signed_in)
                self.assertEqual(bool(cookie["max-age"]), remember)
                self.assertAlmostEqual(hours_left(cookie.value), hours, delta=0.1)

    def test_a_password_change_keeps_the_choice(self):
        token = self.login(self.client).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.post(
            CHANGE_PASSWORD, {"current_password": PASSWORD, "new_password": "Changed-pass-7102!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cookie = response.cookies[COOKIE]
        self.assertEqual(cookie["max-age"], "")
        self.assertIs(RefreshToken(cookie.value)["remember"], False)

    def test_sessions_from_before_the_choice_stay_remembered(self):
        self.client.cookies[COOKIE] = str(RefreshToken.for_user(self.user))
        response = self.client.post(REFRESH, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.cookies[COOKIE]["max-age"], int(REMEMBERED_HOURS * 3600))

    def test_the_choice_must_be_true_or_false(self):
        response = self.login(self.client, "sometimes")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rememberMe", response.data)
