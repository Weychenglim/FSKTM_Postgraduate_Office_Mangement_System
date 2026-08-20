"""Coverage for the self-service Settings endpoints.

Contact details, password change, and notification preferences previously
validated in the browser but never persisted; these tests pin the backend
behaviour, including the isolation rules that keep one account out of another's
settings.
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import NotificationPreference

User = get_user_model()

CURRENT = "current-pw-8891"
NEXT = "replacement-pw-4417"


class SettingsModuleTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.test",
            password=CURRENT,
            full_name="Owner One",
            role=User.Role.STUDENT,
        )
        self.other = User.objects.create_user(
            email="other@example.test",
            password="other-pw-5523",
            full_name="Other Person",
            role=User.Role.STUDENT,
        )

    # ── Contact details ──────────────────────────────────────────────────────

    def test_patch_me_updates_own_phone(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch("/api/auth/me/", {"phone": "012-3456789"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, "012-3456789")

    def test_patch_me_cannot_change_role_or_email(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            "/api/auth/me/",
            {"role": User.Role.OFFICE_ADMIN, "email": "elevated@example.test"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.Role.STUDENT)
        self.assertEqual(self.user.email, "owner@example.test")

    def test_patch_me_requires_authentication(self):
        response = self.client.patch("/api/auth/me/", {"phone": "012"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Password change ──────────────────────────────────────────────────────

    def test_change_password_succeeds_with_correct_current(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/auth/me/change-password/",
            {"current_password": CURRENT, "new_password": NEXT},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEXT))

    def test_change_password_rejects_wrong_current(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/auth/me/change-password/",
            {"current_password": "not-my-password", "new_password": NEXT},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(CURRENT))

    def test_change_password_rejects_weak_password(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/auth/me/change-password/",
            {"current_password": CURRENT, "new_password": "1234"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(CURRENT))

    def test_change_password_rejects_reusing_current(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/auth/me/change-password/",
            {"current_password": CURRENT, "new_password": CURRENT},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_requires_authentication(self):
        response = self.client.post(
            "/api/auth/me/change-password/",
            {"current_password": CURRENT, "new_password": NEXT},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_does_not_touch_other_accounts(self):
        self.client.force_authenticate(self.user)
        self.client.post(
            "/api/auth/me/change-password/",
            {"current_password": CURRENT, "new_password": NEXT},
        )
        self.other.refresh_from_db()
        self.assertTrue(self.other.check_password("other-pw-5523"))

    # ── Notification preferences ─────────────────────────────────────────────

    def test_preferences_default_on_first_read(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/auth/me/notification-preferences/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "emailNotifications": True,
                "announcementAlerts": True,
                "deadlineReminders": True,
                "weeklySummary": False,
            },
        )

    def test_preferences_persist(self):
        self.client.force_authenticate(self.user)
        self.client.patch(
            "/api/auth/me/notification-preferences/",
            {"weeklySummary": True, "emailNotifications": False},
        )
        response = self.client.get("/api/auth/me/notification-preferences/")
        self.assertTrue(response.data["weeklySummary"])
        self.assertFalse(response.data["emailNotifications"])
        self.assertTrue(response.data["deadlineReminders"])

    def test_preferences_are_per_user(self):
        self.client.force_authenticate(self.user)
        self.client.patch(
            "/api/auth/me/notification-preferences/", {"weeklySummary": True}
        )
        self.client.force_authenticate(self.other)
        response = self.client.get("/api/auth/me/notification-preferences/")
        self.assertFalse(response.data["weeklySummary"])

    def test_preferences_reject_non_boolean(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            "/api/auth/me/notification-preferences/", {"weeklySummary": "banana"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_preferences_require_authentication(self):
        response = self.client.get("/api/auth/me/notification-preferences/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_for_user_is_idempotent(self):
        NotificationPreference.for_user(self.user)
        NotificationPreference.for_user(self.user)
        self.assertEqual(
            NotificationPreference.objects.filter(user=self.user).count(), 1
        )

    def test_patch_me_cannot_escalate_privileges(self):
        """Every privileged attribute must be ignored, not just role and email."""
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            "/api/auth/me/",
            {
                "is_staff": True,
                "is_superuser": True,
                "is_active": False,
                "must_change_password": True,
                "full_name": "Renamed Person",
                "phone": "012-9998888",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)
        self.assertTrue(self.user.is_active)
        self.assertEqual(self.user.full_name, "Owner One")
        self.assertEqual(self.user.phone, "012-9998888")


class AuthenticationHardeningTests(APITestCase):
    """Login and password-reset behaviour that must not leak account existence."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="hardening@example.test",
            password=CURRENT,
            full_name="Hardening Target",
            role=User.Role.STUDENT,
        )

    def test_disabled_account_gets_generic_401_not_403(self):
        """A distinct 403 confirmed the password was correct."""
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        response = self.client.post(
            "/api/auth/login/",
            {"identifier": self.user.email, "password": CURRENT},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "Invalid credentials.")

    def test_unknown_identifier_and_wrong_password_look_identical(self):
        unknown = self.client.post(
            "/api/auth/login/",
            {"identifier": "nobody@example.test", "password": "whatever-1234"},
        )
        wrong = self.client.post(
            "/api/auth/login/",
            {"identifier": self.user.email, "password": "whatever-1234"},
        )
        self.assertEqual(unknown.status_code, wrong.status_code)
        self.assertEqual(unknown.data, wrong.data)

    def _reset_link_parts(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        return (
            urlsafe_base64_encode(force_bytes(self.user.pk)),
            default_token_generator.make_token(self.user),
        )

    def test_reset_confirm_rejects_suspended_account(self):
        uid, token = self._reset_link_parts()
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": token, "new_password": NEXT},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(CURRENT))

    def test_reset_confirm_runs_user_similarity_validator(self):
        """Resetting to your own email must fail, as it does on change-password."""
        uid, token = self._reset_link_parts()
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": token, "new_password": self.user.email},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(CURRENT))

    def test_reset_confirm_still_works_for_a_valid_strong_password(self):
        uid, token = self._reset_link_parts()
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": token, "new_password": NEXT},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEXT))
