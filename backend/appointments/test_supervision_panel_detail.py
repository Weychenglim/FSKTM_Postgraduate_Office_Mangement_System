from rest_framework.test import APITestCase
from . import test_appointment_lifecycle as fixture
from .models import PanelRecommendation, CoSupervisorNomination, CoSupervisorAppointment


class SupervisionPanelDetailTests(APITestCase):
    setUp = fixture.AppointmentLifecycleTests.setUp
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    _panel_appointment = fixture.AppointmentLifecycleTests._panel_appointment

    def detail(self, actor):
        self.client.force_authenticate(user=actor)
        return self.client.get(f"/api/appointments/co-supervisor/students/{self.student.pk}/")

    def pending(self, replacement=None):
        return PanelRecommendation.objects.create(profile=self.profile, academic_semester=self.semester,
            supervisor=self.supervisor, recommended_member=self.new_panel,
            status="SUBMITTED_TO_PANEL", replaces_appointment=replacement, justification="Private nomination")

    def test_confirmed_panel_and_staff_contact_match_all_staff_hosts(self):
        self.office.is_staff = True
        self.office.save(update_fields=["is_staff"])
        appointment = self._panel_appointment()
        for actor, path in [(self.supervisor, f"/api/appointments/co-supervisor/students/{self.student.pk}/"),
                            (self.coordinator, f"/api/appointments/coordinator-workspace/teams/{self.student.matric_no}/"),
                            (self.office, f"/api/appointments/office-workspace/teams/{self.student.matric_no}/")]:
            self.client.force_authenticate(user=actor)
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            team = response.data["teams"][0] if "teams" in response.data else response.data
            self.assertEqual(team["studentEmail"], self.student_user.email)
            self.assertEqual(team["panel"]["current"]["member"]["name"], self.panel.full_name)
            self.assertEqual(team["panel"]["current"]["email"], self.panel.email)
            self.assertEqual(team["panel"]["current"]["requestId"], appointment.recommendation_id)
            self.assertFalse(team["panel"]["canRecommend"])
            self.assertEqual(team["panel"]["canReplace"], actor == self.supervisor)

    def test_pending_replacement_keeps_current_panel_and_blocks_duplicate(self):
        appointment = self._panel_appointment()
        pending = self.pending(appointment)
        panel = self.detail(self.supervisor).data["panel"]
        self.assertEqual(panel["current"]["member"]["name"], self.panel.full_name)
        self.assertEqual(panel["pending"]["id"], pending.pk)
        self.assertTrue(panel["pending"]["replacement"])
        self.assertFalse(panel["canRecommend"])
        self.assertFalse(panel["canReplace"])

    def test_new_nomination_and_ended_appointment_are_not_confirmed_panels(self):
        panel = self.detail(self.supervisor).data["panel"]
        self.assertIsNone(panel["current"])
        self.assertTrue(panel["canRecommend"])
        pending = self.pending()
        panel = self.detail(self.supervisor).data["panel"]
        self.assertIsNone(panel["current"])
        self.assertFalse(panel["canRecommend"])
        pending.status = "CANCELLED_BY_SUPERVISOR"
        pending.save(update_fields=["status"])
        appointment = self._panel_appointment()
        appointment.status = "ENDED"
        appointment.save(update_fields=["status"])
        panel = self.detail(self.supervisor).data["panel"]
        self.assertIsNone(panel["current"])
        self.assertIsNone(panel["pending"])
        self.assertTrue(panel["canRecommend"])

    def test_supporting_and_student_access_does_not_grant_panel_controls(self):
        self._panel_appointment()
        nomination = CoSupervisorNomination.objects.create(student=self.student,
            primary_appointment=self.supervisor_appointment, nominator=self.supervisor,
            candidate=self.new_supervisor, academic_semester=self.semester,
            justification="Supporting role", status="APPROVED")
        CoSupervisorAppointment.objects.create(student=self.student, nomination=nomination,
            supervisor=self.new_supervisor, approved_by=self.coordinator)
        panel = self.detail(self.new_supervisor).data["panel"]
        self.assertFalse(panel["canRecommend"])
        self.assertFalse(panel["canReplace"])
        self.assertFalse(panel["current"]["canView"])
        self.pending()
        response = self.detail(self.student_user)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("panel", response.data)
        self.assertNotIn("studentEmail", response.data)
        self.assertNotIn("Private nomination", str(response.data))
        self.assertEqual(self.detail(self.other_coordinator).status_code, 403)
