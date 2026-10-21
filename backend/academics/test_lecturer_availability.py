from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Lecturer, Panel, Supervisor

from .capacity import CapacityRole, CapacityState, resolve_lecturer_capacity
from .capacity_services import create_availability_window
from .models import (
    AcademicSemester,
    LecturerAvailabilityWindow,
    LecturerCapacityAudit,
    LecturerCapacityEntry,
    SemesterCapacityPlan,
)


User = get_user_model()


class LecturerAvailabilityApiTests(TestCase):
    endpoint = "/api/academics/my-availability/"

    @classmethod
    def setUpTestData(cls):
        cls.today = timezone.localdate()
        cls.office = User.objects.create_user(
            email="self.availability.office@example.test",
            full_name="Availability Office",
            role=User.Role.OFFICE_ADMIN,
        )
        cls.student = User.objects.create_user(
            email="self.availability.student@example.test",
            full_name="Availability Student",
            role=User.Role.STUDENT,
        )
        cls.coordinator = User.objects.create_user(
            email="self.availability.coordinator@example.test",
            full_name="Availability Coordinator",
            role=User.Role.COORDINATOR,
        )
        cls.lecturer = cls.create_lecturer("own")
        cls.other = cls.create_lecturer("other")
        cls.semester = AcademicSemester.objects.create(
            code="2026-2027-S1-SELF-AV",
            academic_session="2026/2027",
            term=AcademicSemester.Term.SEMESTER_I,
            starts_on=cls.today - timedelta(days=35),
            ends_on=cls.today + timedelta(days=35),
            lifecycle_status=AcademicSemester.Lifecycle.ACTIVE,
            created_by=cls.office,
        )
        cls.draft = AcademicSemester.objects.create(
            code="2026-2027-S2-SELF-AV",
            academic_session="2026/2027",
            term=AcademicSemester.Term.SEMESTER_II,
            starts_on=cls.today + timedelta(days=70),
            ends_on=cls.today + timedelta(days=140),
            created_by=cls.office,
        )

    @classmethod
    def create_lecturer(cls, suffix, *, supervisor=True, panel=True):
        user = User.objects.create_user(
            email=f"self.availability.{suffix}@example.test",
            full_name=f"Availability {suffix}",
            role=User.Role.LECTURER,
        )
        lecturer = Lecturer.objects.create(user=user, staff_no=f"SELF-AV-{suffix}")
        if supervisor:
            Supervisor.objects.create(lecturer=lecturer, max_supervisees=5)
        if panel:
            Panel.objects.create(lecturer=lecturer, max_appointments=5)
        return lecturer

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.lecturer.user)

    def payload(self, **overrides):
        values = {
            "semesterId": self.semester.pk,
            "role": "SUPERVISOR",
            "startsOn": self.today.isoformat(),
            "endsOn": (self.today + timedelta(days=2)).isoformat(),
            "reason": "Research leave.",
            "confirmed": True,
        }
        values.update(overrides)
        return values

    def create_window(self, *, lecturer=None, semester=None, starts_on=None):
        return create_availability_window(
            semester=semester or self.semester,
            lecturer=lecturer or self.lecturer,
            role=LecturerAvailabilityWindow.Role.SUPERVISOR,
            starts_on=starts_on or self.today,
            ends_on=starts_on or self.today,
            actor=self.office,
            reason="Existing availability restriction.",
        )

    def cancel(self, window, **overrides):
        data = {"reason": "Availability restored.", "confirmed": True}
        data.update(overrides)
        return self.client.post(
            f"{self.endpoint}{window.pk}/cancel/", data, format="json"
        )

    def test_only_authenticated_lecturer_with_own_profile_can_use_endpoints(self):
        window = self.create_window()
        missing_profile = User.objects.create_user(
            email="self.availability.missing@example.test", role=User.Role.LECTURER
        )
        for user in (
            self.office, self.student, self.coordinator, missing_profile, None
        ):
            with self.subTest(user=getattr(user, "role", "anonymous")):
                self.client.force_authenticate(user)
                get_response = self.client.get(self.endpoint)
                create_response = self.client.post(
                    self.endpoint, self.payload(), format="json"
                )
                cancel_response = self.cancel(window)
                allowed_denials = (401, 403) if user is None else (403,)
                for response in (get_response, create_response, cancel_response):
                    self.assertIn(response.status_code, allowed_denials)
        window.refresh_from_db()
        self.assertIsNone(window.cancelled_at)
        self.assertEqual(LecturerAvailabilityWindow.objects.count(), 1)

    def test_read_selects_active_semester_and_only_own_restrictions(self):
        own = self.create_window()
        self.create_window(lecturer=self.other)
        self.create_window(semester=self.draft, starts_on=self.draft.starts_on)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["semesterId"], self.semester.pk)
        self.assertEqual(
            [row["id"] for row in response.data["restrictions"]], [own.pk]
        )
        self.assertEqual(response.data["roles"], ["SUPERVISOR", "PANEL"])
        self.assertTrue(response.data["canManage"])
        self.assertEqual(
            {row["id"] for row in response.data["semesters"]},
            {self.semester.pk, self.draft.pk},
        )

    def test_semester_selection_uses_explicit_id_then_draft_then_latest(self):
        explicit = self.client.get(self.endpoint, {"semesterId": self.draft.pk})
        self.assertEqual(explicit.status_code, 200)
        self.assertEqual(explicit.data["semesterId"], self.draft.pk)
        self.semester.lifecycle_status = AcademicSemester.Lifecycle.CLOSED
        self.semester.save(update_fields=["lifecycle_status"])
        draft_default = self.client.get(self.endpoint)
        self.assertEqual(draft_default.data["semesterId"], self.draft.pk)
        self.draft.lifecycle_status = AcademicSemester.Lifecycle.CLOSED
        self.draft.save(update_fields=["lifecycle_status"])
        latest_default = self.client.get(self.endpoint)
        self.assertEqual(latest_default.data["semesterId"], self.draft.pk)
        self.assertFalse(latest_default.data["canManage"])

    def test_explicit_missing_or_malformed_semester_returns_404(self):
        for semester_id in (999999, "invalid", "", -1):
            with self.subTest(semester_id=semester_id):
                response = self.client.get(self.endpoint, {"semesterId": semester_id})
                self.assertEqual(response.status_code, 404)
        created = self.client.post(
            self.endpoint, self.payload(semesterId=999999), format="json"
        )
        self.assertEqual(created.status_code, 404)
        self.assertFalse(LecturerAvailabilityWindow.objects.exists())

    def test_foreign_identity_fields_are_rejected_without_writes(self):
        for field in ("lecturerId", "lecturer_id", "userId", "user", "createdBy"):
            with self.subTest(field=field):
                response = self.client.post(
                    self.endpoint,
                    self.payload(**{field: self.other.pk}),
                    format="json",
                )
                self.assertEqual(response.status_code, 400)
        self.assertFalse(LecturerAvailabilityWindow.objects.exists())
        self.assertFalse(LecturerCapacityAudit.objects.exists())

    def test_confirmation_must_be_literal_true_before_creation_or_cancellation(self):
        window = self.create_window()
        for value in (False, None, "true", "false", 1, 0):
            with self.subTest(confirmed=value):
                created = self.client.post(
                    self.endpoint, self.payload(confirmed=value), format="json"
                )
                cancelled = self.cancel(window, confirmed=value)
                self.assertEqual(created.status_code, 400)
                self.assertEqual(cancelled.status_code, 400)
        missing = self.payload()
        del missing["confirmed"]
        self.assertEqual(
            self.client.post(self.endpoint, missing, format="json").status_code, 400
        )
        self.assertEqual(
            self.client.post(
                f"{self.endpoint}{window.pk}/cancel/",
                {"reason": "Restore."},
                format="json",
            ).status_code,
            400,
        )
        window.refresh_from_db()
        self.assertIsNone(window.cancelled_at)
        self.assertEqual(LecturerAvailabilityWindow.objects.count(), 1)
        self.assertEqual(LecturerCapacityAudit.objects.count(), 1)

    def test_confirmed_create_immediately_changes_resolution_and_records_actor(self):
        plan = SemesterCapacityPlan.objects.create(
            academic_semester=self.semester,
            version=1,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.DRAFT,
            origin=SemesterCapacityPlan.Origin.CREATED,
            created_by=self.office,
        )
        LecturerCapacityEntry.objects.create(
            plan=plan,
            lecturer=self.lecturer,
            supervisor_limit=5,
            panel_limit=5,
            updated_by=self.office,
        )
        plan.lifecycle_status = SemesterCapacityPlan.Lifecycle.PUBLISHED
        plan.published_by = self.office
        plan.published_at = timezone.now()
        plan.publication_reason = "Test published plan."
        plan.save()
        response = self.client.post(self.endpoint, self.payload(), format="json")
        self.assertEqual(response.status_code, 201, getattr(response, "data", None))
        window = LecturerAvailabilityWindow.objects.get(pk=response.data["id"])
        self.assertEqual(window.lecturer_id, self.lecturer.pk)
        self.assertEqual(window.created_by_id, self.lecturer.user_id)
        self.assertTrue(response.data["isEffective"])
        audit = LecturerCapacityAudit.objects.get(availability_window=window)
        self.assertEqual(audit.action, LecturerCapacityAudit.Action.AVAILABILITY_CREATE)
        self.assertEqual(audit.actor_id, self.lecturer.user_id)
        self.assertEqual(audit.after_values["reason"], "Research leave.")
        result = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today,
        )
        self.assertEqual(result.state, CapacityState.TEMPORARILY_UNAVAILABLE)
        outside = resolve_lecturer_capacity(
            user=self.lecturer.user,
            semester=self.semester,
            role=CapacityRole.SUPERVISOR,
            on_date=self.today + timedelta(days=3),
        )
        self.assertEqual(outside.state, CapacityState.AVAILABLE)

    def test_dates_and_overlap_use_existing_service_rules(self):
        for changes in (
            {"startsOn": (self.semester.starts_on - timedelta(days=1)).isoformat()},
            {"endsOn": (self.semester.ends_on + timedelta(days=1)).isoformat()},
            {"endsOn": (self.today - timedelta(days=1)).isoformat()},
            {"startsOn": "not-a-date"},
            {"reason": " "},
        ):
            with self.subTest(changes=changes):
                response = self.client.post(
                    self.endpoint, self.payload(**changes), format="json"
                )
                self.assertEqual(response.status_code, 400)
        self.assertFalse(LecturerAvailabilityWindow.objects.exists())
        self.create_window()
        overlap = self.client.post(self.endpoint, self.payload(), format="json")
        self.assertEqual(overlap.status_code, 409)
        panel = self.client.post(self.endpoint, self.payload(role="PANEL"), format="json")
        self.assertEqual(panel.status_code, 201)

    def test_non_active_lifecycle_and_missing_role_cannot_create(self):
        for lifecycle in (Lecturer.Lifecycle.RETIRING, Lecturer.Lifecycle.RETIRED):
            with self.subTest(lifecycle=lifecycle):
                self.lecturer.lifecycle_status = lifecycle
                self.lecturer.save(update_fields=["lifecycle_status"])
                response = self.client.post(self.endpoint, self.payload(), format="json")
                self.assertEqual(response.status_code, 409)
                self.assertFalse(self.client.get(self.endpoint).data["canManage"])
        no_panel = self.create_lecturer("no-panel", panel=False)
        self.client.force_authenticate(no_panel.user)
        history = self.client.get(self.endpoint)
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data["roles"], ["SUPERVISOR"])
        self.assertEqual(
            self.client.post(
                self.endpoint, self.payload(role="PANEL"), format="json"
            ).status_code,
            409,
        )
        self.assertFalse(LecturerAvailabilityWindow.objects.exists())

    def test_cancellation_is_owned_confirmed_audited_and_history_is_retained(self):
        own = self.create_window()
        foreign = self.create_window(lecturer=self.other)
        self.assertEqual(self.cancel(foreign).status_code, 404)
        self.assertEqual(self.cancel(own, lecturerId=self.other.pk).status_code, 400)
        self.assertEqual(self.cancel(own, reason=" ").status_code, 400)
        response = self.cancel(own)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["isCancelled"])
        self.assertFalse(response.data["isEffective"])
        own.refresh_from_db()
        foreign.refresh_from_db()
        self.assertEqual(own.cancelled_by_id, self.lecturer.user_id)
        self.assertIsNone(foreign.cancelled_at)
        audit = LecturerCapacityAudit.objects.get(
            availability_window=own,
            action=LecturerCapacityAudit.Action.AVAILABILITY_CANCEL,
        )
        self.assertEqual(audit.actor_id, self.lecturer.user_id)
        self.assertIsNone(audit.before_values["cancelledAt"])
        self.assertIsNotNone(audit.after_values["cancelledAt"])
        history = self.client.get(self.endpoint).data["restrictions"]
        self.assertEqual([row["id"] for row in history], [own.pk])
        self.assertTrue(history[0]["isCancelled"])
        self.assertEqual(self.cancel(own).status_code, 409)
        self.assertEqual(LecturerAvailabilityWindow.objects.count(), 2)

    def test_retired_lecturer_can_cancel_own_closed_semester_history(self):
        window = self.create_window()
        self.semester.lifecycle_status = AcademicSemester.Lifecycle.CLOSED
        self.semester.save(update_fields=["lifecycle_status"])
        self.lecturer.lifecycle_status = Lecturer.Lifecycle.RETIRED
        self.lecturer.save(update_fields=["lifecycle_status"])
        response = self.cancel(window)
        self.assertEqual(response.status_code, 200)
        history = self.client.get(self.endpoint, {"semesterId": self.semester.pk})
        self.assertFalse(history.data["canManage"])
        self.assertTrue(history.data["restrictions"][0]["isCancelled"])

    def test_history_is_paginated_without_silent_truncation(self):
        windows = [
            self.create_window(
                starts_on=self.semester.starts_on + timedelta(days=index)
            )
            for index in range(30)
        ]
        first = self.client.get(self.endpoint, {"limit": 25})
        second = self.client.get(self.endpoint, {"limit": 25, "offset": 25})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(
            first.data["pagination"], {"total": 30, "limit": 25, "offset": 0}
        )
        self.assertEqual(first["X-Total-Count"], "30")
        ids = [
            row["id"]
            for response in (first, second)
            for row in response.data["restrictions"]
        ]
        self.assertEqual(len(ids), 30)
        self.assertEqual(set(ids), {window.pk for window in windows})
        for query in ({"limit": 101}, {"offset": -1}, {"offset": 1000001}):
            with self.subTest(query=query):
                self.assertEqual(self.client.get(self.endpoint, query).status_code, 400)


class EmptyLecturerAvailabilityTests(TestCase):
    def test_no_semesters_returns_empty_context(self):
        user = User.objects.create_user(
            email="self.availability.empty@example.test", role=User.Role.LECTURER
        )
        Lecturer.objects.create(user=user, staff_no="SELF-AV-EMPTY")
        client = APIClient()
        client.force_authenticate(user)
        response = client.get(LecturerAvailabilityApiTests.endpoint)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["semesters"], [])
        self.assertIsNone(response.data["semesterId"])
        self.assertEqual(response.data["restrictions"], [])
        self.assertEqual(response.data["roles"], [])
        self.assertFalse(response.data["canManage"])
