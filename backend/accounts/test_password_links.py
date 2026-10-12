"""Activation and password reset links.

Activation links have no time limit, reset links expire after 30 minutes, and
both stop working once a password has been set, whichever way it was set.
"""
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from threading import Barrier
from unittest import mock

from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.db import close_old_connections, connection, connections
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient, APITestCase, APITransactionTestCase

from .models import Lecturer, Student, User
from .registry_views import send_activation_email
from .tokens import activation_token_generator
from .views import send_password_reset_email

CONFIRM = "/api/auth/password-reset/confirm/"
NEW_PASSWORD = "Activation-pass-7731!"
OTHER_PASSWORD = "Second-try-pass-8842!"
EXISTING_PASSWORD = "Existing-pass-5521!"


def new_student(email="link.student@example.test", matric="LINK-0001"):
    user = User(email=email, full_name="Link Student", role=User.Role.STUDENT)
    user.set_unusable_password()
    user.save()
    Student.objects.create(user=user, matric_no=matric)
    return user


def token_made_at(generator, user, moment):
    with mock.patch.object(generator, "_now", return_value=moment):
        return generator.make_token(user)


class PasswordLinkTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = new_student()

    def uid(self, user=None):
        return urlsafe_base64_encode(force_bytes((user or self.user).pk))

    def check(self, token, uid=None):
        return self.client.post(
            CONFIRM, {"uid": uid or self.uid(), "token": token, "dryRun": True}, format="json"
        )

    def confirm(self, token, password=NEW_PASSWORD):
        return self.client.post(
            CONFIRM,
            {"uid": self.uid(), "token": token, "new_password": password},
            format="json",
        )

    def assertLinkRefused(self, response):
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "invalid_link")

    def test_activation_link_has_no_time_limit(self):
        token = token_made_at(
            activation_token_generator, self.user, datetime.now() - timedelta(days=400)
        )
        self.assertEqual(self.check(token).data, {"kind": "activation"})
        response = self.confirm(token)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["kind"], "activation")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_activation_link_works_only_once(self):
        token = activation_token_generator.make_token(self.user)
        self.assertEqual(self.confirm(token).status_code, status.HTTP_200_OK)
        self.assertLinkRefused(self.confirm(token, OTHER_PASSWORD))
        self.assertLinkRefused(self.check(token))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_activation_link_stops_working_when_a_reset_link_sets_the_password(self):
        activation = activation_token_generator.make_token(self.user)
        reset = default_token_generator.make_token(self.user)
        self.assertEqual(self.confirm(reset).status_code, status.HTTP_200_OK)
        self.assertLinkRefused(self.check(activation))
        self.assertLinkRefused(self.confirm(activation, OTHER_PASSWORD))

    def test_an_activated_account_cannot_use_an_activation_link(self):
        self.user.set_password(EXISTING_PASSWORD)
        self.user.save()
        token = activation_token_generator.make_token(self.user)
        self.assertLinkRefused(self.check(token))
        self.assertLinkRefused(self.confirm(token))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(EXISTING_PASSWORD))

    def test_a_suspended_account_cannot_use_its_activation_link(self):
        token = activation_token_generator.make_token(self.user)
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.assertLinkRefused(self.check(token))
        self.assertLinkRefused(self.confirm(token))

    def test_reset_link_still_expires_after_30_minutes(self):
        fresh = token_made_at(
            default_token_generator, self.user, datetime.now() - timedelta(minutes=29)
        )
        stale = token_made_at(
            default_token_generator, self.user, datetime.now() - timedelta(minutes=31)
        )
        self.assertEqual(self.check(fresh).data, {"kind": "reset"})
        self.assertLinkRefused(self.check(stale))
        self.assertLinkRefused(self.confirm(stale))

    def test_an_expired_reset_link_never_passes_as_an_activation_link(self):
        stale = token_made_at(
            default_token_generator, self.user, datetime.now() - timedelta(minutes=31)
        )
        self.assertFalse(activation_token_generator.check_token(self.user, stale))
        self.assertLinkRefused(self.confirm(stale))
        self.user.refresh_from_db()
        self.assertFalse(self.user.has_usable_password())

    def test_reset_link_works_only_once(self):
        self.user.set_password(EXISTING_PASSWORD)
        self.user.save()
        token = default_token_generator.make_token(self.user)
        response = self.confirm(token)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["kind"], "reset")
        self.assertLinkRefused(self.confirm(token, OTHER_PASSWORD))
        self.assertLinkRefused(self.check(token))

    def test_reset_link_stops_working_once_the_account_is_activated(self):
        reset = default_token_generator.make_token(self.user)
        activation = activation_token_generator.make_token(self.user)
        self.assertEqual(self.confirm(activation).status_code, status.HTTP_200_OK)
        self.assertLinkRefused(self.check(reset))
        self.assertLinkRefused(self.confirm(reset, OTHER_PASSWORD))

    def test_checking_a_link_changes_nothing(self):
        token = activation_token_generator.make_token(self.user)
        for _ in range(2):
            self.assertEqual(self.check(token).status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.has_usable_password())
        self.assertEqual(self.confirm(token).status_code, status.HTTP_200_OK)

    def test_a_malformed_link_is_refused(self):
        self.assertLinkRefused(self.check("abc", uid="not-a-uid"))
        self.assertLinkRefused(self.check("zzzzzzzzzzzzzzz-abc"))
        self.assertLinkRefused(self.check("too-many-dashes-here"))

    def test_a_request_without_a_password_is_still_refused_unless_it_is_a_check(self):
        token = activation_token_generator.make_token(self.user)
        response = self.client.post(
            CONFIRM, {"uid": self.uid(), "token": token}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.data)
        self.user.refresh_from_db()
        self.assertFalse(self.user.has_usable_password())

    @override_settings(
        AUTH_PASSWORD_LINK_CHECK_THROTTLE_RATE="2/hour",
        AUTH_PASSWORD_RESET_CONFIRM_THROTTLE_RATE="1/hour",
    )
    def test_link_checks_have_their_own_limit(self):
        token = activation_token_generator.make_token(self.user)
        for _ in range(2):
            self.assertEqual(self.check(token).status_code, status.HTTP_200_OK)
        self.assertEqual(self.check(token).status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        # Opening the page never used up the one attempt to set the password.
        self.assertEqual(self.confirm(token).status_code, status.HTTP_200_OK)
        self.assertEqual(self.confirm(token).status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_activation_email_explains_the_link_and_how_to_sign_in(self):
        self.assertTrue(send_activation_email(self.user))
        message = mail.outbox[0]
        self.assertEqual(message.subject, "Activate your FSKTM Postgraduate Office account")
        self.assertIn("Dear Link Student,", message.body)
        self.assertIn("/activate-account?uid=", message.body)
        self.assertIn("This link does not expire.", message.body)
        self.assertNotIn("minutes", message.body)
        self.assertIn("- Email: link.student@example.test", message.body)
        self.assertIn("- Student ID (matric number): LINK-0001", message.body)

    def test_the_emailed_activation_link_works(self):
        send_activation_email(self.user)
        found = re.search(r"uid=([\w-]+)&token=([0-9a-z]+-[0-9a-f]+)", mail.outbox[0].body)
        self.assertEqual(self.check(found.group(2), uid=found.group(1)).data, {"kind": "activation"})

    def test_reset_email_states_the_time_limit_and_sign_in_details(self):
        self.user.set_password(EXISTING_PASSWORD)
        self.user.save()
        self.assertTrue(send_password_reset_email(self.user))
        message = mail.outbox[0]
        self.assertEqual(message.subject, "Reset your FSKTM Postgraduate Office password")
        self.assertIn("/reset-password?uid=", message.body)
        self.assertIn("This link expires in 30 minutes and works only once.", message.body)
        self.assertIn("- Student ID (matric number): LINK-0001", message.body)

    def test_staff_reset_email_names_the_staff_id(self):
        lecturer = User.objects.create_user(
            email="link.lecturer@example.test",
            password=EXISTING_PASSWORD,
            full_name="Link Lecturer",
            role=User.Role.LECTURER,
        )
        Lecturer.objects.create(user=lecturer, staff_no="LINK-L-01")
        send_password_reset_email(lecturer)
        body = mail.outbox[0].body
        self.assertIn("- Staff ID: LINK-L-01", body)
        self.assertNotIn("matric", body)

    def test_an_account_without_a_profile_is_told_to_use_the_email(self):
        office = User.objects.create_user(
            email="link.office@example.test",
            password=EXISTING_PASSWORD,
            full_name="Link Office",
            role=User.Role.OFFICE_ADMIN,
        )
        send_password_reset_email(office)
        self.assertIn(
            "using your email, link.office@example.test, and your new password.",
            mail.outbox[0].body,
        )


class PasswordLinkConcurrencyTests(APITransactionTestCase):
    def test_two_tabs_cannot_both_use_one_activation_link(self):
        cache.clear()
        user = new_student()
        payload = {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": activation_token_generator.make_token(user),
        }
        barrier = Barrier(2)

        def submit(password):
            close_old_connections()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET lock_timeout = '10s'")
                barrier.wait(timeout=10)
                response = APIClient().post(
                    CONFIRM, {**payload, "new_password": password}, format="json"
                )
                return response.status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            codes = list(pool.map(submit, ["First-tab-pass-6623!", "Second-tab-pass-6624!"]))

        self.assertCountEqual(codes, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])
