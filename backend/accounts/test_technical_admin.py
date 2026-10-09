"""Technical Administrator accounts are maintenance-only and never a portal role."""

import os
from unittest import mock

from django.core.management import call_command
from django.test import TestCase

from .models import User

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
