from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from .models import User
from .session_tokens import SESSION_KEY_COOKIE

REFRESH = "fsktm_refresh_token"


class ReloadDuringRefreshTests(TestCase):
    """A reload that cuts off /auth/refresh/ leaves the browser with the refresh
    cookie the server has just replaced. That browser may renew with it for a
    moment; a copied refresh token on its own still may not."""

    password = "Reload-secure-password-482!"

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="reload.user@example.test", password=self.password, full_name="Reload User", role=User.Role.STUDENT
        )
        self.browser = APIClient()
        login = self.browser.post(
            "/api/auth/login/",
            {"identifier": self.user.email, "password": self.password},
            format="json",
            REMOTE_ADDR="192.0.2.90",
        )
        self.assertEqual(login.status_code, 200)
        self.key = login.cookies[SESSION_KEY_COOKIE].value
        self.replaced = login.cookies[REFRESH].value
        rotated = self.browser.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(rotated.status_code, 200)
        self.current = rotated.cookies[REFRESH].value

    def refresh_with(self, refresh, key):
        client = APIClient()
        client.cookies[REFRESH] = refresh
        if key:
            client.cookies[SESSION_KEY_COOKIE] = key
        return client.post("/api/auth/refresh/", {}, format="json")

    def test_sign_in_sets_a_private_session_key_cookie(self):
        client = APIClient()
        login = client.post(
            "/api/auth/login/",
            {"identifier": self.user.email, "password": self.password},
            format="json",
            REMOTE_ADDR="192.0.2.91",
        )
        cookie = login.cookies[SESSION_KEY_COOKIE]
        self.assertTrue(cookie.value)
        self.assertIs(cookie["httponly"], True)
        self.assertEqual(cookie["samesite"], "Strict")
        self.assertEqual(cookie["path"], "/api/auth/")

    def test_the_same_browser_can_renew_with_the_replaced_cookie(self):
        response = self.refresh_with(self.replaced, self.key)
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.cookies[REFRESH].value, self.replaced)
        self.assertEqual(response.cookies[SESSION_KEY_COOKIE].value, self.key)

    def test_a_copied_refresh_token_alone_is_refused(self):
        self.assertEqual(self.refresh_with(self.replaced, None).status_code, 401)

    def test_another_browsers_session_key_is_refused(self):
        self.assertEqual(self.refresh_with(self.replaced, "some-other-browser-key").status_code, 401)

    def test_the_grace_ends(self):
        # The grace lives in the cache with a timeout; clearing it is the same as waiting it out.
        cache.clear()
        self.assertEqual(self.refresh_with(self.replaced, self.key).status_code, 401)

    def test_after_sign_out_the_replaced_cookie_is_refused(self):
        out = self.browser.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(out.status_code, 200)
        self.assertEqual(out.cookies[SESSION_KEY_COOKIE]["max-age"], 0)
        self.assertEqual(self.refresh_with(self.replaced, self.key).status_code, 401)
        self.assertEqual(self.refresh_with(self.current, self.key).status_code, 401)

    def test_after_a_password_change_the_replaced_cookie_is_refused(self):
        access = self.browser.post("/api/auth/refresh/", {}, format="json").data["token"]
        self.browser.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        changed = self.browser.post(
            "/api/auth/settings/password/",
            {"currentPassword": self.password, "newPassword": "Reload-new-password-739!"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(self.refresh_with(self.replaced, self.key).status_code, 401)

    def test_a_disabled_account_cannot_renew_in_the_grace(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.assertEqual(self.refresh_with(self.replaced, self.key).status_code, 401)
