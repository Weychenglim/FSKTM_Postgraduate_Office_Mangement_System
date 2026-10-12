from datetime import timedelta
from unittest.mock import patch

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.delegations import revoke_delegation
from accounts.models import CoordinatorDelegation, Student, User
from . import test_appointment_lifecycle as fixture
from .models import SupervisorApplication


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class CoordinatorRequestHistoryTests(APITestCase):
    setUp = fixture.AppointmentLifecycleTests.setUp
    _lecturer = fixture.AppointmentLifecycleTests._lecturer

    url = "/api/appointments/supervisor/coordinator-history/"

    def make_application(self, state, programme=None):
        number = SupervisorApplication.objects.count() + 1
        user = User.objects.create_user(
            email=f"history-{number}@example.test", role=User.Role.STUDENT,
            full_name=f"History applicant {number}",
        )
        student = Student.objects.create(
            user=user, matric_no=f"HISTORY-{number}",
            programme=programme or self.student.programme,
        )
        return SupervisorApplication.objects.create(
            student=student, proposed_supervisor=self.supervisor,
            academic_semester=self.semester, status=state,
            research_title="Recorded research", research_abstract="Recorded abstract",
            coordinator_rejection_reason="Recorded rejection" if state == "REJECTED_BY_COORDINATOR" else "",
            cancellation_reason="Recorded cancellation" if state.startswith("CANCELLED") else "",
        )

    def test_terminal_outcomes_include_rejected_cancelled_and_approved_without_appointments(self):
        expected = {self.application.pk}
        for state in ("APPROVED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_COORDINATOR", "CANCELLED_BY_STUDENT", "CANCELLED_BY_OFFICE"):
            expected.add(self.make_application(state).pk)
        self.make_application("SUBMITTED_TO_SUPERVISOR")
        self.make_application("PENDING_COORDINATOR")
        self.make_application("REJECTED_BY_COORDINATOR", "Unrelated Programme")
        self.client.force_authenticate(self.coordinator)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual({row["id"] for row in response.data}, expected)
        rejected = next(row for row in response.data if row["status"] == "REJECTED_BY_COORDINATOR")
        self.assertEqual(rejected["rejectionReason"], "Recorded rejection")
        cancelled = next(row for row in response.data if row["status"] == "CANCELLED_BY_STUDENT")
        self.assertEqual(cancelled["cancellationReason"], "Recorded cancellation")
        records = self.client.get("/api/appointments/supervisor/coordinator-records/")
        self.assertEqual([row["id"] for row in records.data], [self.application.pk])

    def test_other_programmes_and_unrelated_roles_cannot_read_history(self):
        self.client.force_authenticate(self.other_coordinator)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        for actor in (self.student_user, self.supervisor, self.office):
            with self.subTest(role=actor.role):
                self.client.force_authenticate(actor)
                self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_effective_scope_preserves_regular_programme_and_active_delegation_only(self):
        today = timezone.localdate()
        delegated = self.make_application("CANCELLED_BY_OFFICE", "MASTER OF SOFTWARE ENGINEERING")
        grant = CoordinatorDelegation.objects.create(
            coordinator=self.coordinator, programme="MASTER OF SOFTWARE ENGINEERING",
            starts_on=today, ends_on=today, justification="Cover leave", granted_by=self.office,
        )
        self.client.force_authenticate(self.coordinator)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual({row["id"] for row in response.data}, {self.application.pk, delegated.pk})
        with patch("accounts.delegations.today", return_value=today + timedelta(days=1)):
            self.assertEqual([row["id"] for row in self.client.get(self.url).data], [self.application.pk])
        self.office.is_staff = True
        self.office.save(update_fields=["is_staff"])
        revoke_delegation(delegation_id=grant.pk, actor=self.office, reason="Returned")
        self.assertEqual([row["id"] for row in self.client.get(self.url).data], [self.application.pk])
