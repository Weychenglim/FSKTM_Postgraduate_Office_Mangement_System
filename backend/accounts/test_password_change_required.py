"""Accounts flagged with ``must_change_password`` are held at the password change."""

from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import User

PASSWORD = "Temporary-pass-5521!"
NEXT = "Chosen-secure-pass-8830!"


class PasswordChangeRequiredTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="flagged.user@example.test",
            password=PASSWORD,
            full_name="Flagged User",
            role=User.Role.STUDENT,
            must_change_password=True,
        )

    def _login(self):
        response = self.client.post(
            "/api/auth/login/",
            {"identifier": self.user.email, "password": PASSWORD},
            format="json",
            REMOTE_ADDR="192.0.2.120",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def _bearer(self, token):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client

    def test_login_reports_the_flag(self):
        self.assertIs(self._login().data["user"]["mustChangePassword"], True)

    def test_flagged_user_is_held_at_the_password_change(self):
        client = self._bearer(self._login().data["token"])

        me = client.get("/api/auth/me/")
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertIs(me.data["mustChangePassword"], True)

        for response in (
            client.get("/api/notifications/"),
            client.patch("/api/auth/me/", {"phone": "012-0000000"}, format="json"),
            client.get("/api/auth/me/notification-preferences/"),
        ):
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(response.data["code"], "password_change_required")

    def test_refresh_and_logout_still_work_while_flagged(self):
        self._login()
        refreshed = self.client.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(refreshed.status_code, status.HTTP_200_OK)
        logout = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(logout.status_code, status.HTTP_200_OK)

    def test_changing_the_password_clears_the_flag_and_restores_access(self):
        client = self._bearer(self._login().data["token"])
        response = client.post(
            "/api/auth/me/change-password/",
            {"current_password": PASSWORD, "new_password": NEXT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.must_change_password)

        renewed = self._bearer(response.data["token"])
        self.assertEqual(renewed.get("/api/notifications/").status_code, status.HTTP_200_OK)
        self.assertIs(renewed.get("/api/auth/me/").data["mustChangePassword"], False)

    def test_unflagged_accounts_are_unaffected(self):
        self.user.must_change_password = False
        self.user.save(update_fields=["must_change_password"])
        client = self._bearer(self._login().data["token"])
        self.assertEqual(client.get("/api/notifications/").status_code, status.HTTP_200_OK)
