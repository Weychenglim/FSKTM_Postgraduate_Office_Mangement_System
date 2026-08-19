from datetime import date, timedelta

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import RequestFactory, TestCase

from accounts.models import Lecturer, OfficeStaff, Panel, Supervisor

from .admin import LecturerCapacityEntryAdmin
from .models import (
    AcademicSemester,
    LecturerAvailabilityWindow,
    LecturerCapacityAudit,
    LecturerCapacityEntry,
    SemesterCapacityPlan,
)


User = get_user_model()


class CapacityModelTests(TestCase):
    def setUp(self):
        self.office = User.objects.create_user(
            email="capacity.office@example.test",
            password="local-test-password",
            full_name="Capacity Office",
            role=User.Role.OFFICE_ADMIN,
            is_staff=True,
        )
        OfficeStaff.objects.create(
            user=self.office,
            staff_no="CAP-OFFICE-001",
            department="Postgraduate Office",
        )
        lecturer_user = User.objects.create_user(
            email="capacity.lecturer@example.test",
            password="local-test-password",
            full_name="Capacity Lecturer",
            role=User.Role.LECTURER,
        )
        self.lecturer = Lecturer.objects.create(
            user=lecturer_user,
            staff_no="CAP-LECT-001",
            department="Computing",
        )
        Supervisor.objects.create(lecturer=self.lecturer, max_supervisees=5)
        Panel.objects.create(lecturer=self.lecturer, max_appointments=10)
        self.semester = AcademicSemester.objects.create(
            code="2026-2027-S1",
            academic_session="2026/2027",
            term=AcademicSemester.Term.SEMESTER_I,
            starts_on=date(2026, 9, 1),
            ends_on=date(2027, 1, 31),
            created_by=self.office,
        )

    def create_plan(self, *, version=1, lifecycle_status=None):
        return SemesterCapacityPlan.objects.create(
            academic_semester=self.semester,
            version=version,
            lifecycle_status=(
                lifecycle_status or SemesterCapacityPlan.Lifecycle.DRAFT
            ),
            origin=SemesterCapacityPlan.Origin.CREATED,
            created_by=self.office,
        )

    def test_plan_version_is_unique_within_semester(self):
        self.create_plan(version=1)

        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_plan(version=1)

    def test_only_one_plan_can_be_published_per_semester(self):
        self.create_plan(
            version=1,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_plan(
                version=2,
                lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
            )

    def test_entry_limits_match_lecturer_roles(self):
        plan = self.create_plan()
        valid_entry = LecturerCapacityEntry(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        valid_entry.full_clean()
        valid_entry.save()

        invalid_entry = LecturerCapacityEntry(
            plan=self.create_plan(version=2),
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=None,
            updated_by=self.office,
        )

        with self.assertRaises(ValidationError):
            invalid_entry.full_clean()

    def test_entry_validation_rejects_non_draft_plans(self):
        for version, lifecycle_status in (
            (1, SemesterCapacityPlan.Lifecycle.PUBLISHED),
            (2, SemesterCapacityPlan.Lifecycle.SUPERSEDED),
        ):
            with self.subTest(lifecycle_status=lifecycle_status):
                entry = LecturerCapacityEntry(
                    plan=self.create_plan(
                        version=version,
                        lifecycle_status=lifecycle_status,
                    ),
                    lecturer=self.lecturer,
                    supervisor_limit=4,
                    panel_limit=8,
                    updated_by=self.office,
                )

                with self.assertRaises(ValidationError) as context:
                    entry.full_clean()

                self.assertIn("plan", context.exception.message_dict)

    def test_entry_save_rejects_creation_against_a_published_plan(self):
        published = self.create_plan(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.create(
                plan=published,
                lecturer=self.lecturer,
                supervisor_limit=4,
                panel_limit=8,
                updated_by=self.office,
            )

    def test_entry_save_rejects_reassignment_to_a_published_plan(self):
        draft = self.create_plan(version=1)
        published = self.create_plan(
            version=2,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )
        entry = LecturerCapacityEntry.objects.create(
            plan=draft,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )

        entry.plan = published
        with self.assertRaises(ValidationError):
            entry.save()

        entry.refresh_from_db()
        self.assertEqual(entry.plan, draft)

    def test_admin_add_form_only_accepts_draft_plans(self):
        draft = self.create_plan(version=1)
        published = self.create_plan(
            version=2,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )
        self.create_plan(
            version=3,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.SUPERSEDED,
        )
        request = RequestFactory().get("/admin/academics/lecturercapacityentry/add/")
        request.user = self.office
        entry_admin = LecturerCapacityEntryAdmin(LecturerCapacityEntry, AdminSite())
        form_class = entry_admin.get_form(request)

        self.assertEqual(
            list(form_class.base_fields["plan"].queryset.values_list("pk", flat=True)),
            [draft.pk],
        )
        form = form_class(
            data={
                "plan": published.pk,
                "lecturer": self.lecturer.pk,
                "supervisor_limit": 4,
                "panel_limit": 8,
                "updated_by": self.office.pk,
            }
        )

        self.assertFalse(form.is_valid())
        self.assertIn("plan", form.errors)

    def test_admin_change_form_blocks_reassignment_to_non_draft_plans(self):
        draft = self.create_plan(version=1)
        published = self.create_plan(
            version=2,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )
        entry = LecturerCapacityEntry.objects.create(
            plan=draft,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        request = RequestFactory().post(
            f"/admin/academics/lecturercapacityentry/{entry.pk}/change/"
        )
        request.user = self.office
        entry_admin = LecturerCapacityEntryAdmin(LecturerCapacityEntry, AdminSite())
        form_class = entry_admin.get_form(request, obj=entry)
        form = form_class(
            data={
                "plan": published.pk,
                "lecturer": self.lecturer.pk,
                "supervisor_limit": 4,
                "panel_limit": 8,
                "updated_by": self.office.pk,
            },
            instance=entry,
        )

        self.assertFalse(form.is_valid())
        self.assertIn("plan", form.errors)

    def test_negative_entry_limits_are_rejected(self):
        plan = self.create_plan()

        for field_name in ("supervisor_limit", "panel_limit"):
            with self.subTest(field_name=field_name):
                limits = {"supervisor_limit": 4, "panel_limit": 8}
                limits[field_name] = -1
                entry = LecturerCapacityEntry(
                    plan=plan,
                    lecturer=self.lecturer,
                    updated_by=self.office,
                    **limits,
                )

                with self.assertRaises(ValidationError) as context:
                    entry.full_clean()

                self.assertIn(field_name, context.exception.message_dict)

    def test_zero_entry_limits_are_accepted(self):
        entry = LecturerCapacityEntry(
            plan=self.create_plan(),
            lecturer=self.lecturer,
            supervisor_limit=0,
            panel_limit=0,
            updated_by=self.office,
        )

        entry.full_clean()
        entry.save()

        self.assertEqual(entry.supervisor_limit, 0)
        self.assertEqual(entry.panel_limit, 0)

    def test_duplicate_plan_lecturer_entries_are_rejected(self):
        plan = self.create_plan()
        LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            LecturerCapacityEntry.objects.create(
                plan=plan,
                lecturer=self.lecturer,
                supervisor_limit=5,
                panel_limit=9,
                updated_by=self.office,
            )

    def test_availability_window_must_be_bounded_by_semester(self):
        invalid_ranges = (
            (self.semester.starts_on - timedelta(days=1), self.semester.starts_on),
            (self.semester.ends_on, self.semester.ends_on + timedelta(days=1)),
            (self.semester.starts_on + timedelta(days=1), self.semester.starts_on),
        )

        for starts_on, ends_on in invalid_ranges:
            with self.subTest(starts_on=starts_on, ends_on=ends_on):
                window = LecturerAvailabilityWindow(
                    academic_semester=self.semester,
                    lecturer=self.lecturer,
                    role=LecturerAvailabilityWindow.Role.SUPERVISOR,
                    starts_on=starts_on,
                    ends_on=ends_on,
                    reason="Approved research leave.",
                    created_by=self.office,
                )
                with self.assertRaises(ValidationError):
                    window.full_clean()

    def test_active_availability_windows_cannot_overlap_for_the_same_role(self):
        window = LecturerAvailabilityWindow(
            academic_semester=self.semester,
            lecturer=self.lecturer,
            role=LecturerAvailabilityWindow.Role.SUPERVISOR,
            starts_on=self.semester.starts_on,
            ends_on=self.semester.starts_on + timedelta(days=5),
            reason="Approved research leave.",
            created_by=self.office,
        )
        window.full_clean()
        window.save()

        overlapping = LecturerAvailabilityWindow(
            academic_semester=self.semester,
            lecturer=self.lecturer,
            role=LecturerAvailabilityWindow.Role.SUPERVISOR,
            starts_on=window.starts_on + timedelta(days=2),
            ends_on=window.ends_on + timedelta(days=2),
            reason="Overlapping leave.",
            created_by=self.office,
        )

        with self.assertRaises(ValidationError):
            overlapping.full_clean()

    def test_capacity_audits_are_immutable(self):
        plan = self.create_plan()
        audit = LecturerCapacityAudit.objects.create(
            academic_semester=self.semester,
            plan=plan,
            lecturer=self.lecturer,
            actor=self.office,
            action=LecturerCapacityAudit.Action.PLAN_CREATE,
            reason="Created the initial semester capacity plan.",
            before_values={},
            after_values={"planId": plan.pk, "version": plan.version},
        )

        audit.reason = "Attempted rewrite."
        with self.assertRaises(ValidationError):
            audit.save()
        with self.assertRaises(ValidationError):
            audit.delete()
