"""Technical Administrator accounts are maintenance-only and never a portal role."""

import os
from unittest import mock

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from announcements.models import Announcement
from letters.models import LetterTemplate

from .models import Student, User

TECH_PASSWORD = "Technical-pass-5521!"


class TechnicalAdministratorAccountTests(TestCase):
    def test_superusers_are_created_as_technical_administrators(self):
        user = User.objects.create_superuser(email="tech@example.test", password=TECH_PASSWORD)
        self.assertEqual(user.role, User.TECHNICAL_ADMIN)
        self.assertTrue(user.is_technical_admin)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)

    def test_a_superuser_cannot_take_a_business_role(self):
        for index, role in enumerate(User.Role.values):
            with self.subTest(role=role), self.assertRaises(ValueError):
                User.objects.create_superuser(
                    email=f"mixed{index}@example.test", password=TECH_PASSWORD, role=role
                )
        self.assertFalse(User.objects.filter(email__startswith="mixed").exists())

    def test_createsuperuser_command_does_not_ask_for_a_business_role(self):
        with mock.patch.dict(os.environ, {"DJANGO_SUPERUSER_PASSWORD": TECH_PASSWORD}):
            call_command(
                "createsuperuser",
                interactive=False,
                email="cli.tech@example.test",
                full_name="CLI Technical",
                verbosity=0,
            )
        user = User.objects.get(email="cli.tech@example.test")
        self.assertEqual(user.role, User.TECHNICAL_ADMIN)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password(TECH_PASSWORD))

    def test_business_roles_exclude_the_technical_role(self):
        self.assertNotIn(User.TECHNICAL_ADMIN, User.Role.values)
        self.assertIn(User.TECHNICAL_ADMIN, dict(User._meta.get_field("role").choices))
        plain = User.objects.create_user(email="plain@example.test", password=TECH_PASSWORD)
        self.assertEqual(plain.role, User.Role.STUDENT)
        self.assertFalse(plain.is_technical_admin)


class TechnicalAccountPortalTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.tech = User.objects.create_superuser(
            email="tech.portal@example.test", password=TECH_PASSWORD
        )

    def _login(self, password):
        return self.client.post(
            "/api/auth/login/",
            {"identifier": self.tech.email, "password": password},
            format="json",
            REMOTE_ADDR="192.0.2.130",
        )

    def test_login_is_refused_without_issuing_a_session(self):
        response = self._login(TECH_PASSWORD)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "technical_account")
        self.assertNotIn("token", response.data)
        self.assertNotIn(settings.JWT_REFRESH_COOKIE_NAME, response.cookies)

    def test_a_wrong_password_still_gets_the_generic_reply(self):
        response = self._login("Not-the-password-1!")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data, {"error": "Invalid credentials."})

    def test_existing_access_tokens_are_refused_by_the_portal_api(self):
        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.tech).access_token}"
        )
        for path in (
            "/api/auth/me/",
            "/api/notifications/",
            "/api/registry/students/",
            "/api/letter-templates/",
        ):
            with self.subTest(path=path):
                response = client.get(path)
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(response.data["code"], "technical_account")

    def test_a_refresh_session_is_revoked_instead_of_renewed(self):
        refresh = RefreshToken.for_user(self.tech)
        self.client.cookies[settings.JWT_REFRESH_COOKIE_NAME] = str(refresh)
        response = self.client.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "technical_account")
        self.assertNotIn("token", response.data)
        self.assertEqual(response.cookies[settings.JWT_REFRESH_COOKIE_NAME].value, "")
        self.assertTrue(BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists())

    def test_password_reset_sends_nothing_and_gives_the_usual_reply(self):
        technical = self.client.post(
            "/api/auth/password-reset/", {"email": self.tech.email}, format="json"
        )
        unknown = self.client.post(
            "/api/auth/password-reset/", {"email": "nobody@example.test"}, format="json"
        )
        self.assertEqual(technical.status_code, status.HTTP_200_OK)
        self.assertEqual(technical.data, unknown.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_an_outstanding_reset_link_cannot_change_the_password(self):
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": urlsafe_base64_encode(force_bytes(self.tech.pk)),
                "token": default_token_generator.make_token(self.tech),
                "new_password": "Another-secure-pass-8830!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.tech.refresh_from_db()
        self.assertTrue(self.tech.check_password(TECH_PASSWORD))


class SuperuserFlagGrantsNoPortalPowerTests(APITestCase):
    """A business account left with the superuser flag acts only as its role."""

    def setUp(self):
        cache.clear()
        self.student_owner = User.objects.create_user(
            email="registered.student@example.test",
            password=TECH_PASSWORD,
            full_name="Registered Student",
            role=User.Role.STUDENT,
        )
        Student.objects.create(
            user=self.student_owner,
            matric_no="WGT260001",
            programme="MASTER OF DATA SCIENCE (COURSEWORK)",
            status=Student.Status.ACTIVE,
        )

    def _mixed(self, role, email):
        user = User.objects.create_user(
            email=email, password=TECH_PASSWORD, full_name="Mixed Account", role=role
        )
        user.is_superuser = True
        user.save(update_fields=["is_superuser"])
        self.client.force_authenticate(user)
        return user

    def test_registry_follows_the_role_not_the_flag(self):
        self._mixed(User.Role.LECTURER, "mixed.lecturer@example.test")
        listing = self.client.get("/api/registry/students/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(listing.data, [])
        self.assertEqual(
            self.client.get("/api/registry/students/WGT260001/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        register = self.client.post(
            "/api/registry/students/",
            {
                "id": "WGT260002",
                "name": "New Student",
                "email": "new.student@example.test",
                "programme": "MASTER OF DATA SCIENCE (COURSEWORK)",
            },
            format="json",
        )
        self.assertEqual(register.status_code, status.HTTP_403_FORBIDDEN)
        access_link = self.client.post(
            "/api/registry/students/WGT260001/send-access-link/", {}, format="json"
        )
        self.assertEqual(access_link.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Student.objects.filter(matric_no="WGT260002").exists())

    def test_a_student_with_the_flag_cannot_manage_templates_or_announcements(self):
        self._mixed(User.Role.STUDENT, "mixed.student@example.test")
        template = self.client.post(
            "/api/letter-templates/",
            {"name": "Flag Template", "content": "Dear {{STUDENT_NAME}}"},
            format="json",
        )
        self.assertEqual(template.status_code, status.HTTP_403_FORBIDDEN)
        announcement = self.client.post(
            "/api/announcements/",
            {"title": "Flag Notice", "content": "Should not publish"},
            format="json",
        )
        self.assertEqual(announcement.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Announcement.objects.filter(title="Flag Notice").exists())
        self.assertFalse(LetterTemplate.objects.filter(name="Flag Template").exists())
