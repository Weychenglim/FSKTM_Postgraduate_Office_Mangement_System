from datetime import datetime, timedelta, timezone as datetime_timezone
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import Student
from appointments.ageing import (
    panel_waiting_metadata,
    supervisor_waiting_metadata,
)
from appointments.models import (
    AppointmentWorkflowEvent,
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
)
from appointments.serializers import (
    PanelRecommendationSerializer,
    SupervisorApplicationSerializer,
)


User = get_user_model()


class WorkflowAgeingTests(APITestCase):
    def setUp(self):
        self.now = datetime(
            2026,
            7,
            23,
            12,
            0,
            tzinfo=datetime_timezone.utc,
        )
        self.student_user = User.objects.create_user(
            email="ageing-student@example.test",
            password="password123",
            full_name="Ageing Student",
            role=User.Role.STUDENT,
        )
        self.student = Student.objects.create(
            user=self.student_user,
            matric_no="AGE-STUDENT-001",
            programme="MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
        )
        self.supervisor = User.objects.create_user(
            email="ageing-supervisor@example.test",
            password="password123",
            full_name="Ageing Supervisor",
            role=User.Role.LECTURER,
        )
        self.panel_member = User.objects.create_user(
            email="ageing-panel@example.test",
            password="password123",
            full_name="Ageing Panel",
            role=User.Role.LECTURER,
        )
        self.profile = StudentResearchProfile.objects.create(
            student=self.student_user,
            matric_no=self.student.matric_no,
            student_name=self.student_user.full_name,
            programme=self.student.programme,
            semester="Semester 1 2026/2027",
            proposed_topic="Deterministic workflow ageing",
            supervisor=self.supervisor,
        )

    def test_supervisor_pending_stages_use_their_stage_timestamps(self):
        submitted = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.supervisor,
            research_title="Submitted stage",
            research_abstract="Ageing test",
            status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
            submitted_at=self.now - timedelta(days=4, hours=2),
        )
        self.assertEqual(
            supervisor_waiting_metadata(submitted, now=self.now),
            {
                "waitingSince": submitted.submitted_at,
                "waitingDays": 4,
                "waitingOn": "SUPERVISOR",
            },
        )
        submitted.status = SupervisorApplication.Status.PENDING_COORDINATOR
        submitted.supervisor_decided_at = self.now - timedelta(days=2)
        self.assertEqual(
            supervisor_waiting_metadata(submitted, now=self.now),
            {
                "waitingSince": submitted.supervisor_decided_at,
                "waitingDays": 2,
                "waitingOn": "PROGRAMME_COORDINATOR",
            },
        )

    def test_panel_pending_stages_use_internal_or_public_waiting_labels(self):
        submitted_at = self.now - timedelta(days=3)
        recommendation = PanelRecommendation.objects.create(
            profile=self.profile,
            supervisor=self.supervisor,
            recommended_member=self.panel_member,
            status=PanelRecommendation.Status.SUBMITTED_TO_PANEL,
            submitted_at=submitted_at,
        )

        self.assertEqual(
            panel_waiting_metadata(recommendation, now=self.now),
            {
                "waitingSince": submitted_at,
                "waitingDays": 3,
                "waitingOn": "SELECTED_PANEL",
            },
        )
        self.assertEqual(
            panel_waiting_metadata(recommendation, now=self.now, public=True),
            {
                "waitingSince": submitted_at,
                "waitingDays": 3,
                "waitingOn": "FACULTY_PROCESSING",
            },
        )

        recommendation.status = PanelRecommendation.Status.PENDING_COORDINATOR
        recommendation.panel_decided_at = self.now - timedelta(days=1)
        self.assertEqual(
            panel_waiting_metadata(recommendation, now=self.now)["waitingOn"],
            "PROGRAMME_COORDINATOR",
        )

    def test_terminal_records_return_null_waiting_metadata(self):
        application = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.supervisor,
            research_title="Terminal supervisor record",
            research_abstract="Ageing test",
            status=SupervisorApplication.Status.APPROVED,
        )
        recommendation = PanelRecommendation.objects.create(
            profile=self.profile,
            supervisor=self.supervisor,
            recommended_member=self.panel_member,
            status=PanelRecommendation.Status.REJECTED_BY_PANEL,
            submitted_at=self.now - timedelta(days=10),
        )
        expected = {
            "waitingSince": None,
            "waitingDays": None,
            "waitingOn": None,
        }

        self.assertEqual(supervisor_waiting_metadata(application, now=self.now), expected)
        self.assertEqual(panel_waiting_metadata(recommendation, now=self.now), expected)

    def test_missing_stage_timestamp_falls_back_to_transition_event(self):
        application = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.supervisor,
            research_title="Historical supervisor record",
            research_abstract="Ageing test",
            status=SupervisorApplication.Status.PENDING_COORDINATOR,
            supervisor_decided_at=None,
        )
        event = AppointmentWorkflowEvent.objects.create(
            supervisor_application=application,
            actor=self.supervisor,
            actor_role=User.Role.LECTURER,
            action="SUPERVISOR_APPROVED",
            previous_status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
            new_status=SupervisorApplication.Status.PENDING_COORDINATOR,
        )
        event_time = self.now - timedelta(days=6)
        AppointmentWorkflowEvent.objects.filter(pk=event.pk).update(created_at=event_time)
        event.refresh_from_db()

        result = supervisor_waiting_metadata(application, now=self.now)

        self.assertEqual(result["waitingSince"], event.created_at)
        self.assertEqual(result["waitingDays"], 6)

    def test_future_waiting_timestamp_is_clamped_to_zero_days(self):
        application = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.supervisor,
            research_title="Future timestamp",
            research_abstract="Ageing test",
            status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
            submitted_at=self.now + timedelta(days=2),
        )

        result = supervisor_waiting_metadata(application, now=self.now)

        self.assertEqual(result["waitingDays"], 0)

    def test_appointment_serializers_expose_derived_waiting_metadata(self):
        application = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.supervisor,
            research_title="Serializer metadata",
            research_abstract="Ageing test",
            status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
            submitted_at=self.now - timedelta(days=5),
        )
        recommendation = PanelRecommendation.objects.create(
            profile=self.profile,
            supervisor=self.supervisor,
            recommended_member=self.panel_member,
            status=PanelRecommendation.Status.SUBMITTED_TO_PANEL,
            submitted_at=self.now - timedelta(days=2),
        )

        with patch("appointments.ageing.timezone.now", return_value=self.now):
            application_data = SupervisorApplicationSerializer(application).data
            recommendation_data = PanelRecommendationSerializer(recommendation).data

        self.assertEqual(application_data["waitingDays"], 5)
        self.assertEqual(application_data["waitingOn"], "SUPERVISOR")
        self.assertIsNotNone(application_data["waitingSince"])
        self.assertEqual(recommendation_data["waitingDays"], 2)
        self.assertEqual(recommendation_data["waitingOn"], "SELECTED_PANEL")

    def test_student_panel_endpoint_exposes_only_public_waiting_metadata(self):
        PanelRecommendation.objects.create(
            profile=self.profile,
            supervisor=self.supervisor,
            recommended_member=self.panel_member,
            status=PanelRecommendation.Status.PENDING_COORDINATOR,
            submitted_at=self.now - timedelta(days=4),
            panel_decided_at=self.now - timedelta(days=2),
        )
        self.client.force_authenticate(user=self.student_user)

        with patch("appointments.ageing.timezone.now", return_value=self.now):
            response = self.client.get("/api/appointments/panel/student/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "PENDING")
        self.assertEqual(response.data["waitingOn"], "FACULTY_PROCESSING")
        self.assertEqual(response.data["waitingDays"], 2)
        self.assertIsNotNone(response.data["waitingSince"])
        for confidential_field in [
            "recommendationId",
            "panelDecisionAt",
            "coordinatorDecisionAt",
            "workflow",
        ]:
            self.assertNotIn(confidential_field, response.data)

    def test_student_without_research_profile_receives_null_waiting_metadata(self):
        other_user = User.objects.create_user(
            email="ageing-no-profile@example.test",
            password="password123",
            full_name="Ageing No Profile",
            role=User.Role.STUDENT,
        )
        Student.objects.create(
            user=other_user,
            matric_no="AGE-STUDENT-002",
            programme=self.student.programme,
        )
        self.client.force_authenticate(user=other_user)

        response = self.client.get("/api/appointments/panel/student/")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["waitingSince"])
        self.assertIsNone(response.data["waitingDays"])
        self.assertIsNone(response.data["waitingOn"])
