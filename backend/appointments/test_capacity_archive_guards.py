from django.test import override_settings
from rest_framework.test import APITestCase

from academics.models import AcademicSemester
from . import test_capacity_reassessment as fixture
from .co_supervision import CoSupervisionConflict, decide
from .models import CoSupervisorNomination, PanelRecommendation


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class ArchivedCarryoverDecisionTests(APITestCase):
    setUp = fixture.CapacityReassessmentTests.setUp
    _lecturer = fixture.CapacityReassessmentTests._lecturer
    closed_request = fixture.CapacityReassessmentTests.closed_request

    def test_archived_coordinator_rejection_and_supporting_decisions_preserve_records(self):
        self.closed_request()
        panel = PanelRecommendation.objects.create(
            profile=self.profile, supervisor=self.supervisor,
            recommended_member=self.panel, academic_semester=self.semester,
            status="PENDING_COORDINATOR",
        )
        supporting = CoSupervisorNomination.objects.create(
            student=self.student, primary_appointment=self.supervisor_appointment,
            nominator=self.supervisor, candidate=self.new_supervisor,
            academic_semester=self.semester, justification="Supporting research",
            status="SUBMITTED_TO_CO_SUPERVISOR",
        )
        AcademicSemester.objects.filter(pk=self.semester.pk).update(
            lifecycle_status=AcademicSemester.Lifecycle.ARCHIVED
        )
        self.client.force_authenticate(self.coordinator)
        for kind, row in (("supervisor/applications", self.pending), ("panel/recommendations", panel)):
            before = row.status
            response = self.client.post(
                f"/api/appointments/{kind}/{row.pk}/coordinator-reject/",
                {"reason": "Archived decision must be denied"}, format="json",
            )
            self.assertEqual(response.status_code, 409, response.data)
            row.refresh_from_db()
            self.assertEqual(row.status, before)
        for stage, action, actor in (
            ("SUBMITTED_TO_CO_SUPERVISOR", "reject", self.new_supervisor),
            ("PENDING_COORDINATOR", "coordinator-reject", self.coordinator),
            ("PENDING_COORDINATOR", "cancel", self.office),
        ):
            with self.subTest(action=action):
                CoSupervisorNomination.objects.filter(pk=supporting.pk).update(status=stage)
                with self.assertRaises(CoSupervisionConflict):
                    decide(nomination_id=supporting.pk, actor=actor, action=action,
                           reason="Archived decision must be denied")
                supporting.refresh_from_db()
                self.assertEqual(supporting.status, stage)
                self.assertFalse(supporting.capacity_reassessments.exists())
