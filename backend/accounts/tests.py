import json
import re
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone

from appointments.models import (
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorAppointment,
    SupervisorDocumentRequirement,
)
from academics.models import (
    AcademicSemester,
    LecturerCapacityEntry,
    SemesterCapacityPlan,
)
from dashboard.models import SemesterTimeline

from .models import OfficeStaff, StudentRegistry, User

DEMO_SETTINGS = {
    "DEBUG": True,
    "ENABLE_DEMO_ACCOUNTS": True,
    "DEMO_ADMIN_PASSWORD": "test-admin-password",
    "DEMO_COORDINATOR_PASSWORD": "test-coordinator-password",
    "DEMO_LECTURER_PASSWORD": "test-lecturer-password",
    "DEMO_STUDENT_PASSWORD": "test-student-password",
    "DEMO_LEGACY_EMAIL_MAP": "",
}

CANONICAL_EMAILS = {
    "demo.office.admin@example.test",
    "demo.coordinator@example.test",
    "demo.supervisor@example.test",
    "demo.panel@example.test",
    "demo.student@example.test",
    "demo.letter.student@example.test",
    "demo.panel.student.one@example.test",
    "demo.panel.student.two@example.test",
}


@override_settings(**DEMO_SETTINGS)
class SeedUsersCommandTests(TestCase):
    def run_seed(self):
        call_command("seed_users", stdout=StringIO())

    @override_settings(DEBUG=False)
    def test_refuses_to_run_outside_debug_mode_before_modifying_data(self):
        with self.assertRaisesMessage(CommandError, "DEBUG=True"):
            self.run_seed()

        self.assertEqual(User.objects.count(), 0)

    @override_settings(ENABLE_DEMO_ACCOUNTS=False)
    def test_refuses_to_run_when_demo_accounts_are_disabled(self):
        with self.assertRaisesMessage(CommandError, "ENABLE_DEMO_ACCOUNTS"):
            self.run_seed()

        self.assertEqual(User.objects.count(), 0)

    def test_refuses_to_run_when_any_role_password_is_blank(self):
        password_settings = (
            "DEMO_ADMIN_PASSWORD",
            "DEMO_COORDINATOR_PASSWORD",
            "DEMO_LECTURER_PASSWORD",
            "DEMO_STUDENT_PASSWORD",
        )

        for setting_name in password_settings:
            with self.subTest(setting_name=setting_name):
                with override_settings(**{setting_name: ""}):
                    with self.assertRaisesMessage(CommandError, setting_name):
                        self.run_seed()
                self.assertEqual(User.objects.count(), 0)

    def test_applies_configured_passwords_by_role(self):
        self.run_seed()

        self.assertTrue(
            User.objects.get(email="demo.office.admin@example.test").check_password(
                DEMO_SETTINGS["DEMO_ADMIN_PASSWORD"]
            )
        )
        self.assertTrue(
            User.objects.get(email="demo.coordinator@example.test").check_password(
                DEMO_SETTINGS["DEMO_COORDINATOR_PASSWORD"]
            )
        )
        self.assertTrue(
            User.objects.get(email="demo.supervisor@example.test").check_password(
                DEMO_SETTINGS["DEMO_LECTURER_PASSWORD"]
            )
        )
        self.assertTrue(
            User.objects.get(email="demo.student@example.test").check_password(
                DEMO_SETTINGS["DEMO_STUDENT_PASSWORD"]
            )
        )

    def test_creates_one_generic_supervisor_document_requirement_without_replacing_configuration(
        self,
    ):
        self.run_seed()

        requirement = SupervisorDocumentRequirement.objects.get()
        self.assertEqual(requirement.code, "research-proposal")
        self.assertEqual(requirement.label, "Research Proposal")
        self.assertTrue(requirement.is_required)
        self.assertTrue(requirement.is_active)

        requirement.label = "Office Configured Proposal"
        requirement.save(update_fields=["label"])
        self.run_seed()

        self.assertEqual(SupervisorDocumentRequirement.objects.count(), 1)
        requirement.refresh_from_db()
        self.assertEqual(requirement.label, "Office Configured Proposal")

    def test_uses_only_clearly_fictional_demo_identities(self):
        self.run_seed()

        users = User.objects.filter(email__in=CANONICAL_EMAILS)
        self.assertEqual(set(users.values_list("email", flat=True)), CANONICAL_EMAILS)
        self.assertTrue(all(user.full_name.startswith("Demo ") for user in users))
        self.assertTrue(
            all(
                identifier.startswith("DEMO-")
                for identifier in users.values_list("student__matric_no", flat=True)
                if identifier
            )
        )
        self.assertTrue(
            all(
                identifier.startswith("DEMO-")
                for identifier in users.values_list("office_staff__staff_no", flat=True)
                if identifier
            )
        )
        self.assertTrue(
            all(
                identifier.startswith("DEMO-")
                for identifier in users.values_list("lecturer__staff_no", flat=True)
                if identifier
            )
        )

        registry = StudentRegistry.objects.get(
            student__user__email="demo.letter.student@example.test"
        )
        identity_values = f"{registry.ic_number} {registry.passport_number}"
        self.assertIsNone(re.search(r"\b\d{6}-\d{2}-\d{4}\b", identity_values))
        self.assertIn("Demo", registry.address)

    def test_legacy_email_mapping_preserves_protected_history(self):
        legacy_email = "legacy.demo.admin@local.invalid"
        canonical_email = "demo.office.admin@example.test"
        legacy_admin = User.objects.create_user(
            email=legacy_email,
            password="old-local-password",
            full_name="Legacy Demo Administrator",
            role=User.Role.OFFICE_ADMIN,
        )
        OfficeStaff.objects.create(
            user=legacy_admin,
            staff_no="DEMO-ADMIN-001",
            department="Legacy Demo Department",
        )
        timeline = SemesterTimeline.objects.create(
            semester="Semester II",
            session="2025/2026",
            uploaded_by=legacy_admin,
        )

        with override_settings(
            DEMO_LEGACY_EMAIL_MAP=json.dumps({legacy_email: canonical_email})
        ):
            self.run_seed()

        migrated_admin = User.objects.get(email=canonical_email)
        timeline.refresh_from_db()
        self.assertEqual(migrated_admin.pk, legacy_admin.pk)
        self.assertEqual(timeline.uploaded_by_id, migrated_admin.pk)
        self.assertFalse(User.objects.filter(email=legacy_email).exists())

    def test_rejects_invalid_legacy_email_mapping_before_modifying_data(self):
        with override_settings(DEMO_LEGACY_EMAIL_MAP='["not", "a", "mapping"]'):
            with self.assertRaisesMessage(CommandError, "DEMO_LEGACY_EMAIL_MAP"):
                self.run_seed()

        self.assertEqual(User.objects.count(), 0)

    def test_rejects_noncanonical_legacy_email_destination_before_modifying_data(self):
        with override_settings(
            DEMO_LEGACY_EMAIL_MAP=json.dumps(
                {"legacy.demo@local.invalid": "mistyped@example.test"}
            )
        ):
            with self.assertRaisesMessage(CommandError, "canonical demo email"):
                self.run_seed()

        self.assertEqual(User.objects.count(), 0)

    def test_repeated_seeding_is_idempotent(self):
        self.run_seed()
        initial_user_ids = list(
            User.objects.order_by("email").values_list("pk", flat=True)
        )
        initial_profile_ids = list(
            StudentResearchProfile.objects.order_by("matric_no").values_list(
                "pk", flat=True
            )
        )

        self.run_seed()

        self.assertEqual(
            list(User.objects.order_by("email").values_list("pk", flat=True)),
            initial_user_ids,
        )
        self.assertEqual(
            list(
                StudentResearchProfile.objects.order_by("matric_no").values_list(
                    "pk", flat=True
                )
            ),
            initial_profile_ids,
        )

    def test_panel_demo_profiles_have_confirmed_supervisor_handoffs(self):
        self.run_seed()

        for profile in StudentResearchProfile.objects.select_related("student"):
            application = SupervisorApplication.objects.get(
                student__user=profile.student,
                status=SupervisorApplication.Status.APPROVED,
            )
            appointment = SupervisorAppointment.objects.get(
                application=application,
                status=SupervisorAppointment.Status.ACTIVE,
            )
            self.assertEqual(appointment.supervisor, profile.supervisor)
            self.assertEqual(application.research_title, profile.proposed_topic)
            self.assertEqual(application.research_area, profile.research_area)

    def test_seeding_creates_semester_only_when_none_exists(self):
        self.run_seed()
        seeded = AcademicSemester.objects.get()
        self.assertEqual(seeded.lifecycle_status, "ACTIVE")
        self.assertTrue(seeded.label.startswith("Semester I "))

        seeded.ends_on = seeded.ends_on + timezone.timedelta(days=1)
        seeded.save(update_fields=["ends_on"])
        preserved_end = seeded.ends_on

        self.run_seed()

        self.assertEqual(AcademicSemester.objects.count(), 1)
        seeded.refresh_from_db()
        self.assertEqual(seeded.ends_on, preserved_end)

    def test_seeding_publishes_one_complete_demo_capacity_plan_idempotently(self):
        self.run_seed()

        semester = AcademicSemester.objects.get()
        plan = SemesterCapacityPlan.objects.get(
            academic_semester=semester,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )
        entries = {
            entry.lecturer.staff_no: entry
            for entry in LecturerCapacityEntry.objects.filter(plan=plan).select_related(
                "lecturer"
            )
        }
        self.assertEqual(
            set(entries),
            {"DEMO-LECT-001", "DEMO-PANEL-001"},
        )
        self.assertEqual(entries["DEMO-LECT-001"].supervisor_limit, 5)
        self.assertEqual(entries["DEMO-LECT-001"].panel_limit, 10)
        self.assertIsNone(entries["DEMO-PANEL-001"].supervisor_limit)
        self.assertEqual(entries["DEMO-PANEL-001"].panel_limit, 10)
        plan_ids = list(
            SemesterCapacityPlan.objects.order_by("pk").values_list("pk", flat=True)
        )

        self.run_seed()

        self.assertEqual(
            list(
                SemesterCapacityPlan.objects.order_by("pk").values_list("pk", flat=True)
            ),
            plan_ids,
        )
