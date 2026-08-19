from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.query import QuerySet
from django.test import RequestFactory, TestCase
from django.utils import timezone

from accounts.models import Lecturer, OfficeStaff, Panel, Supervisor

from .admin import (
    LecturerCapacityAuditAdmin,
    LecturerCapacityEntryAdmin,
    SemesterCapacityPlanAdmin,
)
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

    def create_additional_lecturer(self, suffix):
        user = User.objects.create_user(
            email=f"capacity.lecturer.{suffix}@example.test",
            password="local-test-password",
            full_name=f"Capacity Lecturer {suffix}",
            role=User.Role.LECTURER,
        )
        lecturer = Lecturer.objects.create(
            user=user,
            staff_no=f"CAP-LECT-{suffix}",
            department="Computing",
        )
        Supervisor.objects.create(lecturer=lecturer, max_supervisees=5)
        Panel.objects.create(lecturer=lecturer, max_appointments=10)
        return lecturer

    def create_audit(self, *, plan=None, reason="Capacity policy event."):
        plan = plan or self.create_plan()
        return LecturerCapacityAudit.objects.create(
            academic_semester=self.semester,
            plan=plan,
            lecturer=self.lecturer,
            actor=self.office,
            action=LecturerCapacityAudit.Action.PLAN_CREATE,
            reason=reason,
            before_values={},
            after_values={"planId": plan.pk, "version": plan.version},
        )

    def availability_values(self, **overrides):
        values = {
            "academic_semester": self.semester,
            "lecturer": self.lecturer,
            "role": LecturerAvailabilityWindow.Role.SUPERVISOR,
            "starts_on": self.semester.starts_on,
            "ends_on": self.semester.starts_on + timedelta(days=5),
            "reason": "Approved research leave.",
            "created_by": self.office,
        }
        values.update(overrides)
        return values

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

    def test_entry_objects_create_rejects_role_mismatched_limits(self):
        plan = self.create_plan()
        self.lecturer.panel.delete()

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.create(
                plan=plan,
                lecturer=self.lecturer,
                supervisor_limit=4,
                panel_limit=8,
                updated_by=self.office,
            )

        self.assertFalse(LecturerCapacityEntry.objects.exists())

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

    def test_entry_partial_save_rejects_published_persisted_source_plan(self):
        source = self.create_plan(version=1)
        destination = self.create_plan(version=2)
        entry = LecturerCapacityEntry.objects.create(
            plan=source,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=source.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )
        entry.plan = destination
        entry.supervisor_limit = 2

        with self.assertRaises(ValidationError):
            entry.save(update_fields=["supervisor_limit"])

        entry.refresh_from_db()
        self.assertEqual(entry.plan, source)
        self.assertEqual(entry.supervisor_limit, 4)

    def test_entry_save_rejects_moving_from_published_to_draft(self):
        source = self.create_plan(version=1)
        destination = self.create_plan(version=2)
        entry = LecturerCapacityEntry.objects.create(
            plan=source,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=source.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )
        entry.plan = destination

        with self.assertRaises(ValidationError):
            entry.save(update_fields=["plan"])

        entry.refresh_from_db()
        self.assertEqual(entry.plan, source)

    def test_entry_save_locks_plan_and_persisted_entry_before_mutation(self):
        plan = self.create_plan()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        locked_models = []
        original_select_for_update = QuerySet.select_for_update

        def track_select_for_update(queryset, *args, **kwargs):
            locked_models.append(queryset.model)
            return original_select_for_update(queryset, *args, **kwargs)

        entry.supervisor_limit = 3
        with patch.object(
            QuerySet,
            "select_for_update",
            new=track_select_for_update,
        ):
            entry.save(update_fields=["supervisor_limit"])

        self.assertIn(SemesterCapacityPlan, locked_models)
        self.assertIn(LecturerCapacityEntry, locked_models)

    def test_entry_partial_save_validates_the_projected_persisted_lecturer(self):
        plan = self.create_plan()
        supervisor_only = self.create_additional_lecturer("PROJECTED")
        supervisor_only.panel.delete()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=supervisor_only,
            supervisor_limit=4,
            panel_limit=None,
            updated_by=self.office,
        )
        entry.lecturer = self.lecturer
        entry.panel_limit = 8

        with self.assertRaises(ValidationError):
            entry.save(update_fields=["panel_limit"])

        entry.refresh_from_db()
        self.assertEqual(entry.lecturer, supervisor_only)
        self.assertIsNone(entry.panel_limit)

    def test_published_entry_instance_delete_is_rejected(self):
        plan = self.create_plan()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )

        with self.assertRaises(ValidationError):
            entry.delete()

        self.assertTrue(LecturerCapacityEntry.objects.filter(pk=entry.pk).exists())

    def test_published_entry_queryset_delete_is_rejected(self):
        plan = self.create_plan()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.filter(pk=entry.pk).delete()

        self.assertTrue(LecturerCapacityEntry.objects.filter(pk=entry.pk).exists())

    def test_superseded_entry_raw_delete_is_rejected(self):
        plan = self.create_plan()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.SUPERSEDED
        )

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.filter(pk=entry.pk)._raw_delete(
                using="default"
            )

        self.assertTrue(LecturerCapacityEntry.objects.filter(pk=entry.pk).exists())

    def test_draft_entry_queryset_delete_remains_available(self):
        entry = LecturerCapacityEntry.objects.create(
            plan=self.create_plan(),
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )

        deleted, _ = LecturerCapacityEntry.objects.filter(pk=entry.pk).delete()

        self.assertEqual(deleted, 1)
        self.assertFalse(LecturerCapacityEntry.objects.filter(pk=entry.pk).exists())

    def test_plan_admin_keeps_publication_fields_read_only(self):
        draft = self.create_plan()
        request = RequestFactory().get("/admin/academics/semestercapacityplan/add/")
        request.user = self.office
        plan_admin = SemesterCapacityPlanAdmin(SemesterCapacityPlan, AdminSite())
        publication_fields = {
            "lifecycle_status",
            "published_by",
            "publication_reason",
            "published_at",
        }

        self.assertTrue(
            publication_fields.issubset(plan_admin.get_readonly_fields(request))
        )
        draft_readonly = set(plan_admin.get_readonly_fields(request, obj=draft))
        self.assertTrue(publication_fields.issubset(draft_readonly))
        self.assertTrue(
            {
                "academic_semester",
                "version",
                "origin",
                "supersedes",
                "created_by",
            }.isdisjoint(draft_readonly)
        )

    def test_plan_admin_add_creates_a_draft_from_configuration_fields(self):
        request = RequestFactory().post(
            "/admin/academics/semestercapacityplan/add/"
        )
        request.user = self.office
        plan_admin = SemesterCapacityPlanAdmin(SemesterCapacityPlan, AdminSite())
        form_class = plan_admin.get_form(request)
        form = form_class(
            data={
                "academic_semester": self.semester.pk,
                "version": 1,
                "origin": SemesterCapacityPlan.Origin.CREATED,
                "supersedes": "",
                "created_by": self.office.pk,
            }
        )

        self.assertTrue(form.is_valid(), form.errors)
        plan = form.save(commit=False)
        plan_admin.save_model(request, plan, form, change=False)

        plan.refresh_from_db()
        self.assertEqual(plan.lifecycle_status, SemesterCapacityPlan.Lifecycle.DRAFT)

    def test_plan_admin_rejects_a_stale_draft_edit_after_publication(self):
        plan = self.create_plan()
        stale_plan = SemesterCapacityPlan.objects.get(pk=plan.pk)
        stale_plan.version = 99
        stale_plan.origin = SemesterCapacityPlan.Origin.COPIED_FORWARD
        SemesterCapacityPlan.objects.filter(pk=plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )
        request = RequestFactory().post(
            f"/admin/academics/semestercapacityplan/{plan.pk}/change/"
        )
        request.user = self.office
        plan_admin = SemesterCapacityPlanAdmin(SemesterCapacityPlan, AdminSite())

        with self.assertRaises(ValidationError):
            plan_admin.save_model(request, stale_plan, form=None, change=True)

        plan.refresh_from_db()
        self.assertEqual(
            plan.lifecycle_status,
            SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )
        self.assertEqual(plan.version, 1)
        self.assertEqual(plan.origin, SemesterCapacityPlan.Origin.CREATED)

    def test_capacity_audit_admin_selects_displayed_relations(self):
        audit_admin = LecturerCapacityAuditAdmin(
            LecturerCapacityAudit,
            AdminSite(),
        )

        self.assertTrue(
            {"plan", "lecturer", "actor"}.issubset(
                set(audit_admin.list_select_related or ())
            )
        )

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

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.create(
                plan=plan,
                lecturer=self.lecturer,
                supervisor_limit=5,
                panel_limit=9,
                updated_by=self.office,
            )

    def test_bulk_create_rejects_entries_for_non_draft_plans(self):
        draft = self.create_plan(version=1)
        published = self.create_plan(
            version=2,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.bulk_create(
                [
                    LecturerCapacityEntry(
                        plan=draft,
                        lecturer=self.lecturer,
                        supervisor_limit=4,
                        panel_limit=8,
                        updated_by=self.office,
                    ),
                    LecturerCapacityEntry(
                        plan=published,
                        lecturer=self.create_additional_lecturer("BULK-CREATE"),
                        supervisor_limit=5,
                        panel_limit=9,
                        updated_by=self.office,
                    ),
                ]
            )

        self.assertFalse(LecturerCapacityEntry.objects.exists())

    def test_bulk_create_preserves_draft_plan_entries(self):
        draft = self.create_plan()
        second_lecturer = self.create_additional_lecturer("DRAFT-CREATE")

        created = LecturerCapacityEntry.objects.bulk_create(
            [
                LecturerCapacityEntry(
                    plan=draft,
                    lecturer=self.lecturer,
                    supervisor_limit=4,
                    panel_limit=8,
                    updated_by=self.office,
                ),
                LecturerCapacityEntry(
                    plan=draft,
                    lecturer=second_lecturer,
                    supervisor_limit=5,
                    panel_limit=9,
                    updated_by=self.office,
                ),
            ]
        )

        self.assertEqual(len(created), 2)
        self.assertEqual(LecturerCapacityEntry.objects.filter(plan=draft).count(), 2)

    def test_bulk_update_rejects_changes_to_non_draft_plan_entries(self):
        plan = self.create_plan()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.SUPERSEDED
        )
        entry.supervisor_limit = 2

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.bulk_update(
                [entry],
                ["supervisor_limit"],
            )

        entry.refresh_from_db()
        self.assertEqual(entry.supervisor_limit, 4)

    def test_bulk_update_rejects_reassignment_to_a_non_draft_plan(self):
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
            LecturerCapacityEntry.objects.bulk_update([entry], ["plan"])

        entry.refresh_from_db()
        self.assertEqual(entry.plan, draft)

    def test_bulk_update_preserves_draft_plan_changes_and_reassignment(self):
        first_draft = self.create_plan(version=1)
        second_draft = self.create_plan(version=2)
        entry = LecturerCapacityEntry.objects.create(
            plan=first_draft,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        entry.plan = second_draft
        entry.supervisor_limit = 0
        entry.panel_limit = 0

        updated = LecturerCapacityEntry.objects.bulk_update(
            [entry],
            ["plan", "supervisor_limit", "panel_limit"],
        )

        self.assertEqual(updated, 1)
        entry.refresh_from_db()
        self.assertEqual(entry.plan, second_draft)
        self.assertEqual(entry.supervisor_limit, 0)
        self.assertEqual(entry.panel_limit, 0)

    def test_queryset_update_rejects_changes_to_non_draft_plan_entries(self):
        plan = self.create_plan()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.filter(pk=entry.pk).update(panel_limit=1)

        entry.refresh_from_db()
        self.assertEqual(entry.panel_limit, 8)

    def test_queryset_update_rejects_reassignment_to_a_non_draft_plan(self):
        draft = self.create_plan(version=1)
        superseded = self.create_plan(
            version=2,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.SUPERSEDED,
        )
        entry = LecturerCapacityEntry.objects.create(
            plan=draft,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.filter(pk=entry.pk).update(
                plan=superseded
            )

        entry.refresh_from_db()
        self.assertEqual(entry.plan, draft)

    def test_queryset_update_preserves_draft_plan_writes(self):
        first_draft = self.create_plan(version=1)
        second_draft = self.create_plan(version=2)
        entry = LecturerCapacityEntry.objects.create(
            plan=first_draft,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )

        updated = LecturerCapacityEntry.objects.filter(pk=entry.pk).update(
            plan=second_draft,
            supervisor_limit=0,
            panel_limit=0,
        )

        self.assertEqual(updated, 1)
        entry.refresh_from_db()
        self.assertEqual(entry.plan, second_draft)
        self.assertEqual(entry.supervisor_limit, 0)
        self.assertEqual(entry.panel_limit, 0)

    def test_published_plan_entries_remain_readable(self):
        plan = self.create_plan()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )

        historical = LecturerCapacityEntry.objects.select_related("plan").get(
            pk=entry.pk
        )

        self.assertEqual(historical.plan.lifecycle_status, "PUBLISHED")
        self.assertEqual(historical.supervisor_limit, 4)

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

    def test_availability_objects_create_rejects_out_of_semester_dates(self):
        with self.assertRaises(ValidationError):
            LecturerAvailabilityWindow.objects.create(
                **self.availability_values(
                    starts_on=self.semester.starts_on - timedelta(days=1)
                )
            )

        self.assertFalse(LecturerAvailabilityWindow.objects.exists())

    def test_availability_objects_create_rejects_active_overlap(self):
        existing = LecturerAvailabilityWindow.objects.create(
            **self.availability_values()
        )

        with self.assertRaises(ValidationError):
            LecturerAvailabilityWindow.objects.create(
                **self.availability_values(
                    starts_on=existing.starts_on + timedelta(days=2),
                    ends_on=existing.ends_on + timedelta(days=2),
                )
            )

        self.assertEqual(LecturerAvailabilityWindow.objects.count(), 1)

    def test_availability_objects_create_rejects_inconsistent_cancellation(self):
        with self.assertRaises(ValidationError):
            LecturerAvailabilityWindow.objects.create(
                **self.availability_values(cancelled_by=self.office)
            )

        self.assertFalse(LecturerAvailabilityWindow.objects.exists())

    def test_availability_save_locks_semester_and_current_row(self):
        window = LecturerAvailabilityWindow.objects.create(
            **self.availability_values()
        )
        locked_models = []
        original_select_for_update = QuerySet.select_for_update

        def track_select_for_update(queryset, *args, **kwargs):
            locked_models.append(queryset.model)
            return original_select_for_update(queryset, *args, **kwargs)

        window.reason = "Approved amended research leave."
        with patch.object(
            QuerySet,
            "select_for_update",
            new=track_select_for_update,
        ):
            window.save(update_fields=["reason"])

        self.assertIn(AcademicSemester, locked_models)
        self.assertIn(LecturerAvailabilityWindow, locked_models)

    def test_availability_partial_save_validates_projected_cancellation_state(self):
        blocker = LecturerAvailabilityWindow.objects.create(
            **self.availability_values()
        )
        window = LecturerAvailabilityWindow.objects.create(
            **self.availability_values(
                starts_on=self.semester.starts_on + timedelta(days=10),
                ends_on=self.semester.starts_on + timedelta(days=15),
            )
        )
        original_dates = (window.starts_on, window.ends_on)
        window.starts_on = blocker.starts_on + timedelta(days=1)
        window.ends_on = blocker.ends_on + timedelta(days=1)
        window.cancelled_at = timezone.now()
        window.cancelled_by = self.office
        window.cancellation_reason = "Cancelled after the form was loaded."

        with self.assertRaises(ValidationError):
            window.save(update_fields=["starts_on", "ends_on"])

        window.refresh_from_db()
        self.assertEqual((window.starts_on, window.ends_on), original_dates)
        self.assertIsNone(window.cancelled_at)

    def test_availability_partial_save_rejects_incomplete_cancellation_metadata(self):
        window = LecturerAvailabilityWindow.objects.create(
            **self.availability_values()
        )
        window.cancelled_at = timezone.now()
        window.cancelled_by = self.office
        window.cancellation_reason = "Cancelled after review."

        with self.assertRaises(ValidationError):
            window.save(update_fields=["cancelled_at"])

        window.refresh_from_db()
        self.assertIsNone(window.cancelled_at)
        self.assertIsNone(window.cancelled_by)
        self.assertEqual(window.cancellation_reason, "")

    def test_availability_full_save_accepts_complete_cancellation_metadata(self):
        window = LecturerAvailabilityWindow.objects.create(
            **self.availability_values()
        )
        cancelled_at = timezone.now()
        window.cancelled_at = cancelled_at
        window.cancelled_by = self.office
        window.cancellation_reason = "Cancelled after review."

        window.save()

        window.refresh_from_db()
        self.assertEqual(window.cancelled_at, cancelled_at)
        self.assertEqual(window.cancelled_by, self.office)
        self.assertEqual(window.cancellation_reason, "Cancelled after review.")

    def test_availability_bulk_create_is_rejected(self):
        with self.assertRaises(ValidationError):
            LecturerAvailabilityWindow.objects.bulk_create(
                [LecturerAvailabilityWindow(**self.availability_values())]
            )

        self.assertFalse(LecturerAvailabilityWindow.objects.exists())

    def test_availability_bulk_update_is_rejected(self):
        window = LecturerAvailabilityWindow.objects.create(
            **self.availability_values()
        )
        window.reason = "Attempted bulk rewrite."

        with self.assertRaises(ValidationError):
            LecturerAvailabilityWindow.objects.bulk_update([window], ["reason"])

        window.refresh_from_db()
        self.assertEqual(window.reason, "Approved research leave.")

    def test_availability_queryset_update_is_rejected(self):
        window = LecturerAvailabilityWindow.objects.create(
            **self.availability_values()
        )

        with self.assertRaises(ValidationError):
            LecturerAvailabilityWindow.objects.filter(pk=window.pk).update(
                reason="Attempted queryset rewrite."
            )

        window.refresh_from_db()
        self.assertEqual(window.reason, "Approved research leave.")

    def test_availability_deletion_paths_are_rejected(self):
        window = LecturerAvailabilityWindow.objects.create(
            **self.availability_values()
        )

        with self.assertRaises(ValidationError):
            LecturerAvailabilityWindow.objects.filter(pk=window.pk).delete()
        with self.assertRaises(ValidationError):
            window.delete()

        self.assertTrue(
            LecturerAvailabilityWindow.objects.filter(pk=window.pk).exists()
        )

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

    def test_capacity_audit_queryset_update_is_rejected(self):
        audit = self.create_audit()

        with self.assertRaises(ValidationError):
            LecturerCapacityAudit.objects.filter(pk=audit.pk).update(
                reason="Attempted queryset rewrite."
            )

        audit.refresh_from_db()
        self.assertEqual(audit.reason, "Capacity policy event.")

    def test_capacity_audit_bulk_update_is_rejected(self):
        audit = self.create_audit()
        audit.reason = "Attempted bulk rewrite."

        with self.assertRaises(ValidationError):
            LecturerCapacityAudit.objects.bulk_update([audit], ["reason"])

        audit.refresh_from_db()
        self.assertEqual(audit.reason, "Capacity policy event.")

    def test_capacity_audit_queryset_delete_is_rejected(self):
        audit = self.create_audit()

        with self.assertRaises(ValidationError):
            LecturerCapacityAudit.objects.filter(pk=audit.pk).delete()

        self.assertTrue(LecturerCapacityAudit.objects.filter(pk=audit.pk).exists())

    def test_capacity_audit_raw_bulk_delete_is_rejected(self):
        audit = self.create_audit()

        with self.assertRaises(ValidationError):
            LecturerCapacityAudit.objects.filter(pk=audit.pk)._raw_delete(
                using="default"
            )

        self.assertTrue(LecturerCapacityAudit.objects.filter(pk=audit.pk).exists())

    def test_capacity_audit_bulk_create_remains_available(self):
        plan = self.create_plan()
        audits = LecturerCapacityAudit.objects.bulk_create(
            [
                LecturerCapacityAudit(
                    academic_semester=self.semester,
                    plan=plan,
                    lecturer=self.lecturer,
                    actor=self.office,
                    action=LecturerCapacityAudit.Action.PLAN_CREATE,
                    reason="Created through an append-only bulk insert.",
                    before_values={},
                    after_values={"planId": plan.pk},
                )
            ]
        )

        self.assertEqual(len(audits), 1)
        self.assertEqual(LecturerCapacityAudit.objects.count(), 1)

    def test_capacity_audit_bulk_upsert_is_rejected(self):
        audit = self.create_audit()
        replacement = LecturerCapacityAudit(
            pk=audit.pk,
            academic_semester=self.semester,
            plan=audit.plan,
            lecturer=self.lecturer,
            actor=self.office,
            action=LecturerCapacityAudit.Action.PLAN_CREATE,
            reason="Attempted conflict update.",
            before_values={},
            after_values={"planId": audit.plan_id},
        )

        with self.assertRaises(ValidationError):
            LecturerCapacityAudit.objects.bulk_create(
                [replacement],
                update_conflicts=True,
                update_fields=["reason"],
                unique_fields=["pk"],
            )

        audit.refresh_from_db()
        self.assertEqual(audit.reason, "Capacity policy event.")
