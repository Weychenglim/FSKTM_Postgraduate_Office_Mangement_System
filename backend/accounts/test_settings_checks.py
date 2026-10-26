from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class SettingsPageChecksTests(TestCase):
    """The Settings page saves through /api/auth/settings/, so it must apply the
    same rules as the older /api/auth/me/ endpoints."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="checks@example.test", password="Original-Secret-8391", full_name="Checks User")
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}")

    def test_phone_with_letters_or_a_formula_is_refused(self):
        for phone in ('=HYPERLINK("//x.y","!")', "call me", "+-()"):
            with self.subTest(phone=phone):
                response = self.client.patch("/api/auth/settings/", {"phone": phone}, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertIn("phone", response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, "")

    def test_ordinary_phone_numbers_still_save(self):
        for phone in ("012-345 6789", "+60 (3) 7967 6300", ""):
            with self.subTest(phone=phone):
                response = self.client.patch("/api/auth/settings/", {"phone": phone}, format="json")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["user"]["phone"], phone)

    def test_the_same_password_again_is_refused(self):
        response = self.client.post(
            "/api/auth/settings/password/",
            {"currentPassword": "Original-Secret-8391", "newPassword": "Original-Secret-8391"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("newPassword", response.data)
        self.assertEqual(self.client.get("/api/auth/settings/").status_code, 200)
