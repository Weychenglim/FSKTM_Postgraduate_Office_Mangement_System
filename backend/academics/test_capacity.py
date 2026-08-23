from dataclasses import asdict
from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.query import QuerySet
from django.db.models.signals import post_delete, pre_delete
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone

from accounts.models import Lecturer, OfficeStaff, Panel, Student, Supervisor
from appointments.models import (
    PanelAppointment,
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorAppointment,
    count_panel_workload,
    panel_workload_limit,
    supervisor_workload_limit,
)

from .capacity import (
    CapacityConflict,
    CapacityRole,
    CapacityState,
    assert_capacity_allows_assignment,
    capacity_conflict_message,
    resolve_lecturer_capacity,
)

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

    def capacity_entry_persistence_states(self, entries):
        return [
            (entry.pk, entry._state.adding, entry._state.db)
            for entry in entries
        ]

    def delete_capacity_entries_after_related_predicate_expands(self, *, raw):
        draft_plan = self.create_plan()
        second_draft_lecturer = self.create_additional_lecturer("DRAFT-DELETE")
        draft_entries = [
            LecturerCapacityEntry.objects.create(
                plan=draft_plan,
                lecturer=lecturer,
                supervisor_limit=4,
                panel_limit=8,
                updated_by=self.office,
            )
            for lecturer in (self.lecturer, second_draft_lecturer)
        ]

        published_plan = self.create_plan(version=2)
        published_lecturer = self.create_additional_lecturer("PUBLISHED-DELETE")
        Lecturer.objects.filter(pk=published_lecturer.pk).update(
            department="Mathematics"
        )
        published_entry = LecturerCapacityEntry.objects.create(
            plan=published_plan,
            lecturer=published_lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=published_plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )

        queryset = LecturerCapacityEntry.objects.filter(
            lecturer__department="Computing"
        )
        original_guard = queryset.__class__._lock_and_validate_delete
        guard_call_count = 0
        expansion_call = 1 if raw else 2
        predicate_expanded = False

        def expand_predicate_after_validation(candidate_queryset):
            nonlocal guard_call_count, predicate_expanded
            guard_call_count += 1
            captured_pks = original_guard(candidate_queryset)
            if guard_call_count == expansion_call:
                Lecturer.objects.filter(pk=published_lecturer.pk).update(
                    department="Computing"
                )
                predicate_expanded = True
            return captured_pks

        with patch.object(
            queryset.__class__,
            "_lock_and_validate_delete",
            expand_predicate_after_validation,
        ):
            result = (
                queryset._raw_delete(using="default")
                if raw
                else queryset.delete()
            )

        self.assertTrue(predicate_expanded)
        self.assertTrue(
            LecturerCapacityEntry.objects.filter(pk=published_entry.pk).exists()
        )
        self.assertFalse(
            LecturerCapacityEntry.objects.filter(
                pk__in=[entry.pk for entry in draft_entries]
            ).exists()
        )
        return result

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

    def test_draft_entry_instance_delete_preserves_signal_instance_and_origin(self):
        entry = LecturerCapacityEntry.objects.create(
            plan=self.create_plan(),
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        entry_pk = entry.pk
        deletion_events = []

        def capture_delete(sender, instance, origin, **kwargs):
            deletion_events.append((instance, origin))

        pre_delete.connect(
            capture_delete,
            sender=LecturerCapacityEntry,
            weak=False,
        )
        post_delete.connect(
            capture_delete,
            sender=LecturerCapacityEntry,
            weak=False,
        )
        try:
            deleted, deleted_by_model = entry.delete()
        finally:
            pre_delete.disconnect(capture_delete, sender=LecturerCapacityEntry)
            post_delete.disconnect(capture_delete, sender=LecturerCapacityEntry)

        self.assertEqual(deleted, 1)
        self.assertEqual(
            deleted_by_model,
            {LecturerCapacityEntry._meta.label: 1},
        )
        self.assertFalse(
            LecturerCapacityEntry.objects.filter(pk=entry_pk).exists()
        )
        self.assertEqual(len(deletion_events), 2)
        for signal_instance, origin in deletion_events:
            self.assertIs(signal_instance, entry)
            self.assertIs(origin, entry)

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

    def test_queryset_delete_uses_locked_pks_if_related_predicate_expands(self):
        deleted, deleted_by_model = (
            self.delete_capacity_entries_after_related_predicate_expands(raw=False)
        )

        self.assertEqual(deleted, 2)
        self.assertEqual(
            deleted_by_model,
            {LecturerCapacityEntry._meta.label: 2},
        )

    def test_raw_delete_uses_locked_pks_if_related_predicate_expands(self):
        deleted = self.delete_capacity_entries_after_related_predicate_expands(
            raw=True
        )

        self.assertEqual(deleted, 2)

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
            {
                "plan",
                "plan__academic_semester",
                "lecturer",
                "lecturer__user",
                "actor",
            }.issubset(
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
        published = self.create_plan(
            version=1,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )
        second_lecturer = self.create_additional_lecturer("PUBLISHED-CREATE")

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.bulk_create(
                [
                    LecturerCapacityEntry(
                        plan=published,
                        lecturer=self.lecturer,
                        supervisor_limit=4,
                        panel_limit=8,
                        updated_by=self.office,
                    ),
                    LecturerCapacityEntry(
                        plan=published,
                        lecturer=second_lecturer,
                        supervisor_limit=5,
                        panel_limit=9,
                        updated_by=self.office,
                    ),
                ]
            )

        self.assertFalse(LecturerCapacityEntry.objects.exists())

    def test_bulk_create_rejects_mixed_plans_without_mutating_inputs(self):
        first_plan = self.create_plan(version=1)
        second_plan = self.create_plan(version=2)
        entries = [
            LecturerCapacityEntry(
                plan=first_plan,
                lecturer=self.lecturer,
                supervisor_limit=4,
                panel_limit=8,
                updated_by=self.office,
            ),
            LecturerCapacityEntry(
                plan=second_plan,
                lecturer=self.create_additional_lecturer("MIXED-PLAN"),
                supervisor_limit=5,
                panel_limit=9,
                updated_by=self.office,
            ),
        ]
        original_states = self.capacity_entry_persistence_states(entries)

        with self.assertRaisesMessage(
            ValidationError,
            "Capacity entry bulk creation requires every entry to use the same "
            "plan.",
        ):
            LecturerCapacityEntry.objects.bulk_create(entries)

        self.assertFalse(LecturerCapacityEntry.objects.exists())
        self.assertEqual(
            self.capacity_entry_persistence_states(entries),
            original_states,
        )

    def test_bulk_create_rejects_role_mismatched_limits(self):
        plan = self.create_plan()
        invalid_lecturer = self.create_additional_lecturer("INVALID-ROLE")
        invalid_lecturer.panel.delete()
        entries = [
            LecturerCapacityEntry(
                plan=plan,
                lecturer=self.lecturer,
                supervisor_limit=4,
                panel_limit=8,
                updated_by=self.office,
            ),
            LecturerCapacityEntry(
                plan=plan,
                lecturer=invalid_lecturer,
                supervisor_limit=5,
                panel_limit=9,
                updated_by=self.office,
            ),
        ]
        original_states = self.capacity_entry_persistence_states(entries)

        with self.assertRaises(ValidationError):
            LecturerCapacityEntry.objects.bulk_create(entries)

        self.assertFalse(LecturerCapacityEntry.objects.exists())
        self.assertEqual(
            self.capacity_entry_persistence_states(entries),
            original_states,
        )

    def test_bulk_create_rejects_upsert_into_a_published_entry(self):
        published_plan = self.create_plan(version=1)
        published_entry = LecturerCapacityEntry.objects.create(
            plan=published_plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=published_plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )
        draft_plan = self.create_plan(version=2)
        replacement = LecturerCapacityEntry(
            pk=published_entry.pk,
            plan=draft_plan,
            lecturer=self.lecturer,
            supervisor_limit=1,
            panel_limit=2,
            updated_by=self.office,
        )

        with self.assertRaisesMessage(
            ValidationError,
            "Capacity entry bulk creation does not support batch or conflict "
            "options.",
        ):
            LecturerCapacityEntry.objects.bulk_create(
                [replacement],
                update_conflicts=True,
                update_fields=["supervisor_limit"],
                unique_fields=["pk"],
            )

        published_entry.refresh_from_db()
        self.assertEqual(published_entry.plan, published_plan)
        self.assertEqual(published_entry.supervisor_limit, 4)

    def test_bulk_create_rejects_unsupported_options(self):
        option_sets = (
            {"batch_size": 1},
            {"ignore_conflicts": True},
            {"update_fields": ["supervisor_limit"]},
            {"unique_fields": ["pk"]},
        )

        for options in option_sets:
            with self.subTest(options=options), self.assertRaisesMessage(
                ValidationError,
                "Capacity entry bulk creation does not support batch or conflict "
                "options.",
            ):
                LecturerCapacityEntry.objects.bulk_create([], **options)

    def test_bulk_create_empty_batch_returns_an_empty_list(self):
        created = LecturerCapacityEntry.objects.bulk_create(())

        self.assertEqual(created, [])

    def test_bulk_create_rejects_duplicate_input_without_mutating_inputs(self):
        plan = self.create_plan()
        entries = [
            LecturerCapacityEntry(
                plan=plan,
                lecturer=self.lecturer,
                supervisor_limit=4,
                panel_limit=8,
                updated_by=self.office,
            ),
            LecturerCapacityEntry(
                plan=plan,
                lecturer=self.lecturer,
                supervisor_limit=5,
                panel_limit=9,
                updated_by=self.office,
            ),
        ]
        original_states = self.capacity_entry_persistence_states(entries)

        with self.assertRaises(ValidationError) as context:
            LecturerCapacityEntry.objects.bulk_create(entries)

        self.assertFalse(LecturerCapacityEntry.objects.exists())
        self.assertEqual(
            self.capacity_entry_persistence_states(entries),
            original_states,
        )
        self.assertIn(
            "Capacity entry bulk creation cannot contain duplicate plan and "
            "lecturer pairs.",
            context.exception.messages,
        )

    def test_bulk_create_restores_input_states_after_a_later_database_failure(self):
        plan = self.create_plan()
        entries = [
            LecturerCapacityEntry(
                plan=plan,
                lecturer=self.lecturer,
                supervisor_limit=4,
                panel_limit=8,
                updated_by=self.office,
            ),
            LecturerCapacityEntry(
                plan=plan,
                lecturer=self.create_additional_lecturer("DATABASE-FAILURE"),
                supervisor_limit=5,
                panel_limit=9,
                updated_by=self.office,
            ),
        ]
        original_states = self.capacity_entry_persistence_states(entries)
        original_save = LecturerCapacityEntry.save
        save_call_count = 0

        def fail_second_save(instance, *args, **kwargs):
            nonlocal save_call_count
            save_call_count += 1
            if save_call_count == 2:
                raise IntegrityError("Simulated later database failure.")
            return original_save(instance, *args, **kwargs)

        with patch.object(
            LecturerCapacityEntry,
            "save",
            new=fail_second_save,
        ), self.assertRaisesMessage(
            IntegrityError,
            "Simulated later database failure.",
        ):
            LecturerCapacityEntry.objects.bulk_create(entries)

        self.assertEqual(save_call_count, 2)
        self.assertFalse(LecturerCapacityEntry.objects.exists())
        self.assertEqual(
            self.capacity_entry_persistence_states(entries),
            original_states,
        )

    def test_bulk_create_same_plan_valid_batch_succeeds(self):
        draft = self.create_plan()
        second_lecturer = self.create_additional_lecturer("DRAFT-CREATE")

        entries = [
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

        created = LecturerCapacityEntry.objects.bulk_create(entries)

        self.assertEqual(len(created), 2)
        self.assertIs(created[0], entries[0])
        self.assertIs(created[1], entries[1])
        self.assertTrue(all(entry.pk is not None for entry in created))
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

    def test_bulk_update_rejects_draft_plan_changes_and_reassignment(self):
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

        with self.assertRaisesMessage(
            ValidationError,
            "Capacity entries must be changed through validated individual saves.",
        ):
            LecturerCapacityEntry.objects.bulk_update(
                [entry],
                ["plan", "supervisor_limit", "panel_limit"],
            )

        entry.refresh_from_db()
        self.assertEqual(entry.plan, first_draft)
        self.assertEqual(entry.supervisor_limit, 4)
        self.assertEqual(entry.panel_limit, 8)

    def test_queryset_update_cannot_expand_a_related_predicate(self):
        draft_plan = self.create_plan(version=1)
        draft_entry = LecturerCapacityEntry.objects.create(
            plan=draft_plan,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        published_plan = self.create_plan(version=2)
        published_lecturer = self.create_additional_lecturer("PUBLISHED-UPDATE")
        Lecturer.objects.filter(pk=published_lecturer.pk).update(
            department="Mathematics"
        )
        published_entry = LecturerCapacityEntry.objects.create(
            plan=published_plan,
            lecturer=published_lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )
        SemesterCapacityPlan.objects.filter(pk=published_plan.pk).update(
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED
        )
        queryset = LecturerCapacityEntry.objects.filter(
            lecturer__department="Computing"
        )
        original_validate = queryset.__class__._validate_plan_ids_are_draft

        def validate_then_expand(candidate_queryset, plan_ids):
            original_validate(candidate_queryset, plan_ids)
            Lecturer.objects.filter(pk=published_lecturer.pk).update(
                department="Computing"
            )

        mutation_error = None
        with patch.object(
            queryset.__class__,
            "_validate_plan_ids_are_draft",
            validate_then_expand,
        ):
            try:
                queryset.update(panel_limit=1)
            except ValidationError as error:
                mutation_error = error

        draft_entry.refresh_from_db()
        published_entry.refresh_from_db()
        self.assertEqual(published_entry.panel_limit, 8)
        self.assertEqual(draft_entry.panel_limit, 8)
        self.assertIsNotNone(mutation_error)
        self.assertIn(
            "Capacity entries must be changed through validated individual saves.",
            mutation_error.messages,
        )

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

    def test_queryset_update_rejects_draft_plan_writes(self):
        first_draft = self.create_plan(version=1)
        second_draft = self.create_plan(version=2)
        entry = LecturerCapacityEntry.objects.create(
            plan=first_draft,
            lecturer=self.lecturer,
            supervisor_limit=4,
            panel_limit=8,
            updated_by=self.office,
        )

        with self.assertRaisesMessage(
            ValidationError,
            "Capacity entries must be changed through validated individual saves.",
        ):
            LecturerCapacityEntry.objects.filter(pk=entry.pk).update(
                plan=second_draft,
                supervisor_limit=0,
                panel_limit=0,
            )

        entry.refresh_from_db()
        self.assertEqual(entry.plan, first_draft)
        self.assertEqual(entry.supervisor_limit, 4)
        self.assertEqual(entry.panel_limit, 8)

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


@override_settings(TIME_ZONE="Asia/Kuala_Lumpur")
class CapacityResolverTests(TestCase):
    def setUp(self):
        self.today = date(2026, 10, 15)
        self.office = User.objects.create_user(
            email="resolver.office@example.test",
            password="local-test-password",
            full_name="Resolver Office",
            role=User.Role.OFFICE_ADMIN,
            is_staff=True,
        )
        OfficeStaff.objects.create(
            user=self.office,
            staff_no="RES-OFFICE-001",
            department="Postgraduate Office",
        )
        self.lecturer = self.create_lecturer("PRIMARY")
        self.semester = self.create_semester(
            session_start=2026,
            term=AcademicSemester.Term.SEMESTER_I,
            starts_on=date(2026, 9, 1),
            ends_on=date(2027, 1, 31),
        )
        self.other_semester = self.create_semester(
            session_start=2025,
            term=AcademicSemester.Term.SEMESTER_II,
            starts_on=date(2026, 2, 1),
            ends_on=date(2026, 6, 30),
        )
        self.record_index = 0

    def create_lecturer(
        self,
        suffix,
        *,
        is_active=True,
        lifecycle_status=Lecturer.Lifecycle.ACTIVE,
        supervisor=True,
        panel=True,
        supervisor_limit=8,
        panel_limit=9,
    ):
        user = User.objects.create_user(
            email=f"resolver.lecturer.{suffix.lower()}@example.test",
            password="local-test-password",
            full_name=f"Resolver Lecturer {suffix}",
            role=User.Role.LECTURER,
            is_active=is_active,
        )
        lecturer = Lecturer.objects.create(
            user=user,
            staff_no=f"RES-LECT-{suffix}",
            department="Computing",
            lifecycle_status=lifecycle_status,
        )
        if supervisor:
            Supervisor.objects.create(
                lecturer=lecturer,
                max_supervisees=supervisor_limit,
            )
        if panel:
            Panel.objects.create(
                lecturer=lecturer,
                max_appointments=panel_limit,
            )
        return lecturer

    def create_semester(self, *, session_start, term, starts_on, ends_on):
        return AcademicSemester.objects.create(
            code=(
                f"{session_start}-{session_start + 1}-"
                f"{AcademicSemester.TERM_CODES[term]}"
            ),
            academic_session=f"{session_start}/{session_start + 1}",
            term=term,
            starts_on=starts_on,
            ends_on=ends_on,
            created_by=self.office,
        )

    def publish_plan(
        self,
        *,
        lecturer=None,
        semester=None,
        supervisor_limit=5,
        panel_limit=5,
        version=1,
    ):
        lecturer = lecturer or self.lecturer
        semester = semester or self.semester
        plan = SemesterCapacityPlan.objects.create(
            academic_semester=semester,
            version=version,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.DRAFT,
            origin=SemesterCapacityPlan.Origin.CREATED,
            created_by=self.office,
        )
        LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=lecturer,
            supervisor_limit=supervisor_limit,
            panel_limit=panel_limit,
            updated_by=self.office,
        )
        plan.lifecycle_status = SemesterCapacityPlan.Lifecycle.PUBLISHED
        plan.published_by = self.office
        plan.publication_reason = "Approved resolver test plan."
        plan.published_at = timezone.now()
        plan.save(
            update_fields=(
                "lifecycle_status",
                "published_by",
                "publication_reason",
                "published_at",
            )
        )
        return plan

    def create_student(self):
        self.record_index += 1
        suffix = f"{self.record_index:03d}"
        user = User.objects.create_user(
            email=f"resolver.student.{suffix}@example.test",
            password="local-test-password",
            full_name=f"Resolver Student {suffix}",
            role=User.Role.STUDENT,
        )
        return Student.objects.create(
            user=user,
            matric_no=f"RES-STUDENT-{suffix}",
            programme="Master of Computing",
        )

    def create_active_supervisor_appointment(self, supervisor, *, semester=None):
        student = self.create_student()
        application = SupervisorApplication.objects.create(
            student=student,
            academic_semester=semester or self.semester,
            proposed_supervisor=supervisor,
            research_title=f"Resolver research {student.matric_no}",
            research_abstract="Resolver workload fixture.",
            status=SupervisorApplication.Status.APPROVED,
        )
        return SupervisorAppointment.objects.create(
            application=application,
            student=student,
            supervisor=supervisor,
            approved_by=self.office,
            status=SupervisorAppointment.Status.ACTIVE,
        )

    def create_panel_recommendation(self, panel_member, *, status, semester=None):
        student = self.create_student()
        profile = StudentResearchProfile.objects.create(
            student=student.user,
            matric_no=student.matric_no,
            student_name=student.user.full_name,
            programme=student.programme,
            semester=(semester or self.semester).label,
            proposed_topic=f"Panel research {student.matric_no}",
            supervisor=self.lecturer.user,
        )
        return PanelRecommendation.objects.create(
            profile=profile,
            academic_semester=semester or self.semester,
            supervisor=self.lecturer.user,
            recommended_member=panel_member,
            status=status,
            justification="Resolver workload fixture.",
        )

    def create_active_panel_appointment(self, panel_member, *, semester=None):
        recommendation = self.create_panel_recommendation(
            panel_member,
            status=PanelRecommendation.Status.APPROVED,
            semester=semester,
        )
        return PanelAppointment.objects.create(
            recommendation=recommendation,
            profile=recommendation.profile,
            supervisor=recommendation.supervisor,
            panel_member=panel_member,
            approved_by=self.office,
            status=PanelAppointment.Status.ACTIVE,
        )

    def test_resolver_returns_available_with_published_role_limit(self):
        plan = self.publish_plan(supervisor_limit=2, panel_limit=4)

        result = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today,
        )

        self.assertEqual(result.semester_id, self.semester.pk)
        self.assertEqual(result.plan_id, plan.pk)
        self.assertEqual(result.plan_version, 1)
        self.assertEqual(result.role, CapacityRole.SUPERVISOR)
        self.assertEqual(result.limit, 2)
        self.assertEqual(result.active_load, 0)
        self.assertEqual(result.reserved_load, 0)
        self.assertEqual(result.available_slots, 2)
        self.assertEqual(result.state, CapacityState.AVAILABLE)
        self.assertIsNone(result.unavailable_until)

    def test_zero_limit_is_full_then_over_capacity_without_mutating_work(self):
        self.publish_plan(supervisor_limit=0, panel_limit=5)

        full = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today,
        )
        appointment = self.create_active_supervisor_appointment(self.lecturer.user)
        over_capacity = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today,
        )

        self.assertEqual(full.state, CapacityState.FULL)
        self.assertEqual(full.available_slots, 0)
        self.assertEqual(over_capacity.state, CapacityState.OVER_CAPACITY)
        self.assertEqual(over_capacity.active_load, 1)
        self.assertEqual(over_capacity.available_slots, 0)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, SupervisorAppointment.Status.ACTIVE)

    def test_supervisor_active_load_is_global_across_semesters(self):
        self.publish_plan(supervisor_limit=1, panel_limit=5)
        first = self.create_active_supervisor_appointment(self.lecturer.user)
        second = self.create_active_supervisor_appointment(
            self.lecturer.user,
            semester=self.other_semester,
        )

        result = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today,
        )

        self.assertEqual(result.state, CapacityState.OVER_CAPACITY)
        self.assertEqual(result.active_load, 2)
        self.assertEqual(result.reserved_load, 0)
        self.assertEqual(result.available_slots, 0)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.status, SupervisorAppointment.Status.ACTIVE)
        self.assertEqual(second.status, SupervisorAppointment.Status.ACTIVE)

    def test_panel_load_separates_active_appointments_and_reservations(self):
        self.publish_plan(supervisor_limit=5, panel_limit=4)
        self.create_active_panel_appointment(
            self.lecturer.user,
            semester=self.other_semester,
        )
        self.create_panel_recommendation(
            self.lecturer.user,
            status=PanelRecommendation.Status.SUBMITTED_TO_PANEL,
        )
        self.create_panel_recommendation(
            self.lecturer.user,
            status=PanelRecommendation.Status.PENDING_COORDINATOR,
            semester=self.other_semester,
        )
        for terminal_status in (
            PanelRecommendation.Status.REJECTED_BY_PANEL,
            PanelRecommendation.Status.REJECTED_BY_COORDINATOR,
            PanelRecommendation.Status.CANCELLED_BY_SUPERVISOR,
            PanelRecommendation.Status.CANCELLED_BY_OFFICE,
        ):
            self.create_panel_recommendation(
                self.lecturer.user,
                status=terminal_status,
            )

        result = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.PANEL,
            on_date=self.today,
        )

        self.assertEqual(result.state, CapacityState.AVAILABLE)
        self.assertEqual(result.active_load, 1)
        self.assertEqual(result.reserved_load, 2)
        self.assertEqual(result.available_slots, 1)
        self.assertEqual(count_panel_workload(self.lecturer.user), 3)

    def test_role_window_precedes_full_and_redacts_internal_reason(self):
        self.publish_plan(supervisor_limit=0, panel_limit=5)
        internal_reason = "Private medical leave details must never be public."
        window = LecturerAvailabilityWindow.objects.create(
            academic_semester=self.semester,
            lecturer=self.lecturer,
            role=LecturerAvailabilityWindow.Role.SUPERVISOR,
            starts_on=self.today - timedelta(days=1),
            ends_on=self.today + timedelta(days=4),
            reason=internal_reason,
            created_by=self.office,
        )

        supervisor_result = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today,
        )
        panel_result = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.PANEL,
            on_date=self.today,
        )
        message = capacity_conflict_message(supervisor_result)

        self.assertEqual(
            supervisor_result.state,
            CapacityState.TEMPORARILY_UNAVAILABLE,
        )
        self.assertEqual(supervisor_result.unavailable_until, window.ends_on)
        self.assertEqual(panel_result.state, CapacityState.AVAILABLE)
        self.assertNotIn("reason", asdict(supervisor_result))
        self.assertNotIn(internal_reason, repr(supervisor_result))
        self.assertNotIn(internal_reason, message)
        self.assertIn(window.ends_on.isoformat(), message)
        with self.assertRaisesMessage(CapacityConflict, message):
            assert_capacity_allows_assignment(
                user=self.lecturer.user,
                semester=self.semester,
                role=CapacityRole.SUPERVISOR,
                on_date=self.today,
            )

    def test_not_configured_ignores_non_published_plans_and_missing_entries(self):
        for version, lifecycle_status in (
            (1, SemesterCapacityPlan.Lifecycle.DRAFT),
            (2, SemesterCapacityPlan.Lifecycle.SUPERSEDED),
        ):
            SemesterCapacityPlan.objects.create(
                academic_semester=self.semester,
                version=version,
                lifecycle_status=lifecycle_status,
                origin=SemesterCapacityPlan.Origin.CREATED,
                created_by=self.office,
            )
        LecturerAvailabilityWindow.objects.create(
            academic_semester=self.semester,
            lecturer=self.lecturer,
            role=LecturerAvailabilityWindow.Role.SUPERVISOR,
            starts_on=self.today,
            ends_on=self.today + timedelta(days=2),
            reason="Internal operational reason.",
            created_by=self.office,
        )

        without_published_plan = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today,
        )
        published = SemesterCapacityPlan.objects.create(
            academic_semester=self.semester,
            version=3,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
            origin=SemesterCapacityPlan.Origin.CREATED,
            created_by=self.office,
        )
        without_entry = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today,
        )

        self.assertEqual(
            without_published_plan.state,
            CapacityState.NOT_CONFIGURED,
        )
        self.assertIsNone(without_published_plan.plan_id)
        self.assertEqual(without_entry.state, CapacityState.NOT_CONFIGURED)
        self.assertEqual(without_entry.plan_id, published.pk)
        self.assertEqual(without_entry.plan_version, 3)
        self.assertIsNone(without_entry.limit)
        self.assertEqual(without_entry.available_slots, 0)

    def test_not_configured_when_new_role_has_no_published_limit(self):
        lecturer = self.create_lecturer("NEW-PANEL", panel=False)
        self.publish_plan(
            lecturer=lecturer,
            supervisor_limit=3,
            panel_limit=None,
        )
        Panel.objects.create(lecturer=lecturer, max_appointments=7)

        result = resolve_lecturer_capacity(
            user=lecturer.user,
            semester=self.semester,
            role=CapacityRole.PANEL,
            on_date=self.today,
        )

        self.assertEqual(result.state, CapacityState.NOT_CONFIGURED)
        self.assertIsNone(result.limit)

    def test_ineligible_precedes_missing_configuration(self):
        cases = (
            self.create_lecturer("INACTIVE", is_active=False),
            self.create_lecturer(
                "RETIRED",
                lifecycle_status=Lecturer.Lifecycle.RETIRED,
            ),
            self.create_lecturer("NO-SUPERVISOR", supervisor=False),
        )

        for lecturer in cases:
            with self.subTest(lecturer=lecturer.staff_no):
                result = resolve_lecturer_capacity(
                    user=lecturer.user,
                    semester=self.semester,
                    role=CapacityRole.SUPERVISOR,
                    on_date=self.today,
                )
                self.assertEqual(result.state, CapacityState.INELIGIBLE)
                self.assertIsNone(result.plan_id)

    def test_eligibility_uses_persisted_account_state(self):
        self.publish_plan(supervisor_limit=3, panel_limit=4)
        stale_user = User.objects.get(pk=self.lecturer.user_id)
        persisted_user = User.objects.get(pk=self.lecturer.user_id)
        persisted_user.is_active = False
        persisted_user.save(update_fields=["is_active"])
        self.assertTrue(stale_user.is_active)

        result = resolve_lecturer_capacity(
            user=stale_user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today,
        )

        self.assertEqual(result.state, CapacityState.INELIGIBLE)

    def test_workload_limit_helpers_delegate_without_changing_legacy_paths(self):
        self.publish_plan(supervisor_limit=3, panel_limit=4)

        self.assertEqual(supervisor_workload_limit(self.lecturer.user), 8)
        self.assertEqual(supervisor_workload_limit(self.lecturer.supervisor), 8)
        self.assertEqual(panel_workload_limit(self.lecturer.user), 9)
        self.assertEqual(panel_workload_limit(self.lecturer.panel), 9)
        self.assertEqual(
            supervisor_workload_limit(self.lecturer.user, self.semester),
            3,
        )
        self.assertEqual(
            supervisor_workload_limit(self.lecturer.supervisor, self.semester),
            3,
        )
        self.assertEqual(
            panel_workload_limit(self.lecturer.user, self.semester),
            4,
        )
        self.assertEqual(
            panel_workload_limit(self.lecturer.panel, self.semester),
            4,
        )

        self.lecturer.user.is_active = False
        self.lecturer.user.save(update_fields=["is_active"])
        self.assertEqual(
            supervisor_workload_limit(self.lecturer.user, self.semester),
            0,
        )
        self.assertEqual(supervisor_workload_limit(self.lecturer.user), 8)
