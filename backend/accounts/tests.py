from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from dashboard.models import SemesterTimeline

from .models import OfficeStaff, User


class SeedUsersCommandTests(TestCase):
    def test_migrates_legacy_account_without_deleting_protected_history(self):
        legacy_admin = User.objects.create_user(
            email="admin@fsktm.edu.my",
            password="old-password",
            full_name="Legacy Administrator",
            role=User.Role.OFFICE_ADMIN,
        )
        OfficeStaff.objects.create(
            user=legacy_admin,
            staff_no="M10492",
            department="Legacy Department",
        )
        timeline = SemesterTimeline.objects.create(
            semester="Semester II",
            session="2025/2026",
            uploaded_by=legacy_admin,
        )

        call_command("seed_users", stdout=StringIO())

        migrated_admin = User.objects.get(email="admin@siswa.um.edu.my")
        timeline.refresh_from_db()

        self.assertEqual(migrated_admin.pk, legacy_admin.pk)
        self.assertEqual(timeline.uploaded_by_id, migrated_admin.pk)
        self.assertTrue(migrated_admin.check_password("staffAdmin2026"))
        self.assertFalse(User.objects.filter(email="admin@fsktm.edu.my").exists())
