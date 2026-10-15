from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Student, User

from . import test_appointment_lifecycle as fixture
from .models import PanelAppointment, PanelRecommendation


class StudentTeamPanelPrivacyTests(APITestCase):
    setUp = fixture.AppointmentLifecycleTests.setUp
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    _panel_appointment = fixture.AppointmentLifecycleTests._panel_appointment

    def test_panel_view_includes_only_own_saved_research_profile(self):
        self.recommendation("PENDING_COORDINATOR")
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get("/api/appointments/panel/student/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("researchProfile"), {
            "title": self.profile.proposed_topic,
            "programme": self.profile.programme,
            "area": self.profile.research_area,
            "abstract": self.profile.abstract,
        })
        self.assertIsNone(response.data["panelMemberName"])
        self.assertIsNone(response.data["panelMemberEmail"])

    def test_confirmed_panel_keeps_current_research_profile(self):
        self._panel_appointment()
        self.profile.proposed_topic = "Current approved revision"
        self.profile.abstract = "Current saved abstract, not the original application."
        self.profile.save(update_fields=["proposed_topic", "abstract"])
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get("/api/appointments/panel/student/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("researchProfile", {}).get("title"), self.profile.proposed_topic)
        self.assertEqual(response.data.get("researchProfile", {}).get("abstract"), self.profile.abstract)

    def test_student_without_profile_does_not_receive_another_students_research(self):
        user = User.objects.create_user(email="unprofiled@example.test", password="password123", full_name="New Student", role=User.Role.STUDENT)
        Student.objects.create(user=user, matric_no="NEW-STUDENT", programme=self.student.programme)
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/appointments/panel/student/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("researchProfile", response.data)
        self.assertIsNone(response.data["researchProfile"])
        self.assertNotIn(self.profile.abstract, str(response.data))

    def recommendation(self, status):
        return PanelRecommendation.objects.create(
            profile=self.profile, academic_semester=self.semester,
            supervisor=self.supervisor, recommended_member=self.new_panel,
            status=status, submitted_at=timezone.now(),
            panel_decided_at=timezone.now(),
        )

    def assert_public_entries(self, expected):
        self.client.force_authenticate(user=self.student_user)
        for url, extract in (
            (f"/api/appointments/co-supervisor/students/{self.student.pk}/", lambda data: data),
            ("/api/appointments/co-supervisor/", lambda data: data["teams"][0]),
            (f"/api/dashboard/progress/{self.student.matric_no}/", lambda data: data["supervisoryTeam"]),
        ):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200, response.data)
                entries = [entry for entry in extract(response.data)["timeline"]
                           if entry["title"].startswith("Panel")]
                # Exact allowlist catches extra identifiers, stages and timestamps.
                self.assertEqual(entries, expected)

    def test_pending_stages_have_one_undated_public_entry(self):
        row = self.recommendation("SUBMITTED_TO_PANEL")
        for status in ("SUBMITTED_TO_PANEL", "PENDING_COORDINATOR"):
            row.status = status
            row.save(update_fields=["status"])
            self.assert_public_entries([{
                "id": "panel-current-status", "title": "Panel appointment",
                "date": None, "status": "FACULTY_PROCESSING",
            }])
            public = self.client.get("/api/appointments/panel/student/")
            self.assertEqual(public.data["readinessState"], "FACULTY_PROCESSING")

    def test_no_pending_or_active_appointment_omits_panel_entry(self):
        self.assert_public_entries([])
        for status in ("REJECTED_BY_PANEL", "REJECTED_BY_COORDINATOR", "CANCELLED_BY_SUPERVISOR"):
            self.recommendation(status)
            self.assert_public_entries([])
        appointment = self._panel_appointment()
        appointment.status = PanelAppointment.Status.ENDED
        appointment.ended_at = timezone.now()
        appointment.save(update_fields=["status", "ended_at"])
        self.assert_public_entries([])

    def test_confirmation_takes_precedence_during_replacement(self):
        appointment = self._panel_appointment()
        expected = [{
            "id": "panel-current-status", "title": "Panel appointment",
            "date": appointment.appointment_date.isoformat(), "status": "CONFIRMED",
        }]
        self.assert_public_entries(expected)
        self.recommendation("PENDING_COORDINATOR")
        self.assert_public_entries(expected)
        public = self.client.get("/api/appointments/panel/student/")
        self.assertEqual(public.data["status"], "CONFIRMED")

    def test_staff_keep_internal_timeline_and_unrelated_users_are_denied(self):
        row = self.recommendation("PENDING_COORDINATOR")
        for actor in (self.supervisor, self.coordinator, self.office):
            self.client.force_authenticate(user=actor)
            response = self.client.get(f"/api/appointments/co-supervisor/students/{self.student.pk}/")
            self.assertEqual(response.status_code, 200)
            self.assertIn({
                "id": f"panel-workflow-{row.pk}", "title": "Panel recommendation",
                "date": row.updated_at.isoformat(), "status": row.status,
            }, response.data["timeline"])
        for actor in (self.new_supervisor, self.other_coordinator):
            self.client.force_authenticate(user=actor)
            response = self.client.get(f"/api/appointments/co-supervisor/students/{self.student.pk}/")
            self.assertEqual(response.status_code, 403)
