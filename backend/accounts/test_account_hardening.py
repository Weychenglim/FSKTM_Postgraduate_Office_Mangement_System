"""Account hardening found in the October 2026 review: sign-in records, password
whitespace, per-account login throttling, admin account forms, profile rules,
case-insensitive identity and the superuser audit check."""

from unittest import mock

from django.contrib import admin
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import RequestFactory, TestCase, override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from rest_framework import status
from rest_framework.test import APITestCase

from .admin import UserAdmin
from .checks import superusers_hold_no_portal_role
from .forms import UserChangeForm, UserCreationForm
from .models import Lecturer, OfficeStaff, Student, User

PASSWORD = "Hardening-pass-6612!"


class SignInRecordTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="signin@example.test", password=PASSWORD, full_name="Sign In", role=User.Role.STUDENT
        )

    def _login(self, identifier, password=PASSWORD, ip="192.0.2.140"):
        return self.client.post(
            "/api/auth/login/",
            {"identifier": identifier, "password": password},
            format="json",
            REMOTE_ADDR=ip,
        )

    def test_login_records_the_portal_sign_in_without_voiding_reset_links(self):
        reset_token = default_token_generator.make_token(self.user)
        self.assertEqual(self._login(self.user.email).status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_portal_login)
        self.assertTrue(default_token_generator.check_token(self.user, reset_token))

    @override_settings(AUTH_LOGIN_IDENTIFIER_THROTTLE_RATE="3/hour")
    def test_one_account_gets_a_limited_number_of_guesses_from_any_address(self):
        for attempt in range(3):
            response = self._login(self.user.email, "Wrong-guess-1!", ip=f"198.51.100.{attempt + 1}")
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        blocked = self._login(self.user.email.upper(), ip="198.51.100.99")
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        other = User.objects.create_user(email="other.signin@example.test", password=PASSWORD)
        self.assertEqual(self._login(other.email, ip="198.51.100.99").status_code, status.HTTP_200_OK)

    def test_reset_keeps_surrounding_spaces_in_the_new_password(self):
        spaced = "  Correct-Horse-Battery-9  "
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
                "token": default_token_generator.make_token(self.user),
                "new_password": spaced,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._login(self.user.email, spaced).status_code, status.HTTP_200_OK)

    def test_change_password_keeps_surrounding_spaces(self):
        self.client.force_authenticate(self.user)
        spaced = " Spaced-Password-4471 "
        response = self.client.post(
            "/api/auth/me/change-password/",
            {"current_password": PASSWORD, "new_password": spaced},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(spaced))

    def test_a_failed_reset_email_is_logged_but_the_reply_stays_generic(self):
        with mock.patch("accounts.views.send_mail", side_effect=OSError("smtp down")), self.assertLogs(
            "accounts.views", level="ERROR"
        ):
            response = self.client.post("/api/auth/password-reset/", {"email": self.user.email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AdminAccountFormTests(TestCase):
    def test_admin_typed_passwords_must_pass_the_password_rules(self):
        form = UserCreationForm(
            data={
                "email": "weak@example.test",
                "full_name": "Weak Password",
                "role": User.Role.STUDENT,
                "phone": "",
                "password1": "abc",
                "password2": "abc",
            }
        )
        self.assertFalse(form.is_valid())
        self.assertIn("password2", form.errors)

    def test_portal_accounts_created_in_admin_must_change_their_password(self):
        form = UserCreationForm(
            data={
                "email": "temp@example.test",
                "full_name": "Temporary Password",
                "role": User.Role.LECTURER,
                "phone": "",
                "password1": PASSWORD,
                "password2": PASSWORD,
            }
        )
        self.assertTrue(form.is_valid(), form.errors)
        self.assertTrue(form.save().must_change_password)

    def test_only_office_accounts_may_keep_staff_status(self):
        for role in (User.Role.STUDENT, User.Role.LECTURER, User.Role.COORDINATOR, User.Role.OFFICE_ADMIN):
            with self.subTest(role=role):
                user = User.objects.create_user(
                    email=f"staff.{role[:3].lower()}@example.test", password=PASSWORD, full_name="Staff", role=role
                )
                form = UserChangeForm(
                    data={
                        "email": user.email,
                        "full_name": user.full_name,
                        "role": role,
                        "phone": "",
                        "must_change_password": False,
                        "is_active": True,
                        "is_staff": True,
                        "is_superuser": False,
                        "groups": [],
                        "user_permissions": [],
                    },
                    instance=user,
                )
                self.assertEqual(form.is_valid(), role == User.Role.OFFICE_ADMIN, form.errors)

    def test_staff_without_superuser_status_cannot_edit_roles_or_privileges(self):
        office = User.objects.create_user(
            email="office.admin.form@example.test", password=PASSWORD, role=User.Role.OFFICE_ADMIN, is_staff=True
        )
        tech = User.objects.create_superuser(email="tech.form.ro@example.test", password=PASSWORD)
        request = RequestFactory().get("/admin/")
        user_admin = UserAdmin(User, admin.site)
        request.user = office
        locked = set(user_admin.get_readonly_fields(request, office))
        self.assertTrue({"role", "is_staff", "is_superuser", "groups", "user_permissions"} <= locked)
        request.user = tech
        self.assertNotIn("role", user_admin.get_readonly_fields(request, office))


class TechnicalProfileRuleTests(TestCase):
    def setUp(self):
        self.tech = User.objects.create_superuser(email="tech.profile@example.test", password=PASSWORD)

    def test_profiles_reject_technical_accounts(self):
        profiles = (
            Student(user=self.tech, matric_no="TECH001", programme="MASTER OF DATA SCIENCE (COURSEWORK)"),
            OfficeStaff(user=self.tech, staff_no="TECH-OFF-1"),
            Lecturer(user=self.tech, staff_no="TECH-LEC-1"),
        )
        for profile in profiles:
            with self.subTest(profile=type(profile).__name__):
                with self.assertRaises(ValidationError):
                    profile.full_clean()

    def test_a_role_change_in_the_same_request_is_caught_by_the_profile(self):
        lecturer = User.objects.create_user(
            email="lect.convert@example.test", password=PASSWORD, full_name="Convert", role=User.Role.LECTURER
        )
        lecturer.role = User.TECHNICAL_ADMIN
        with self.assertRaises(ValidationError):
            Student(user=lecturer, matric_no="CONV001", programme="MASTER OF DATA SCIENCE (COURSEWORK)").full_clean()

    def test_the_office_staff_admin_page_refuses_a_technical_account(self):
        self.client.force_login(self.tech)
        response = self.client.post(
            reverse("admin:accounts_officestaff_add"),
            {"user": self.tech.pk, "staff_no": "TECH-OFF-2", "department": "", "position": "", "_save": "Save"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "cannot have a portal profile")
        self.assertFalse(OfficeStaff.objects.filter(user=self.tech).exists())


class CaseInsensitiveIdentityTests(TestCase):
    def test_emails_differing_only_in_case_cannot_both_exist(self):
        User.objects.create_user(email="Case.Owner@example.test", password=PASSWORD)
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(email="case.owner@EXAMPLE.test", password=PASSWORD)

    def test_matric_numbers_differing_only_in_case_cannot_both_exist(self):
        first = User.objects.create_user(email="m1@example.test", password=PASSWORD)
        second = User.objects.create_user(email="m2@example.test", password=PASSWORD)
        Student.objects.create(user=first, matric_no="WGA990001")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Student.objects.create(user=second, matric_no="wga990001")


class SuperuserAuditCheckTests(TestCase):
    def test_a_superuser_with_a_portal_role_is_reported(self):
        User.objects.create_superuser(email="clean.tech@example.test", password=PASSWORD)
        self.assertEqual(superusers_hold_no_portal_role(None), [])
        legacy = User.objects.create_user(
            email="legacy.super@example.test", password=PASSWORD, role=User.Role.OFFICE_ADMIN
        )
        legacy.is_superuser = True
        legacy.save(update_fields=["is_superuser"])
        warnings = superusers_hold_no_portal_role(None)
        self.assertEqual([w.id for w in warnings], ["accounts.W001"])
        self.assertIn("legacy.super@example.test", warnings[0].msg)
