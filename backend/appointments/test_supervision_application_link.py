from rest_framework.test import APITestCase

from . import test_appointment_lifecycle as fixture
from . import test_co_supervision as supporting_fixture
from .models import SupervisorApplication


class SupervisionApplicationLinkTests(APITestCase):
    setUp = fixture.AppointmentLifecycleTests.setUp
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    nominate = supporting_fixture.CoSupervisionTests.nominate
    decide = supporting_fixture.CoSupervisionTests.decide
    activate = supporting_fixture.CoSupervisionTests.activate

    def team(self, actor):
        self.client.force_authenticate(user=actor)
        return self.client.get(f"/api/appointments/co-supervisor/students/{self.student.pk}/")

    def test_authorized_staff_receive_the_active_appointments_approved_application(self):
        for actor in [self.supervisor, self.coordinator, self.office]:
            with self.subTest(actor=actor.role):
                response = self.team(actor)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data.get("approvedApplicationId"), self.application.pk)
                self.assertEqual(response.data["primaryAppointmentDetails"]["email"], self.supervisor.email)
                self.assertIn("department", response.data["primaryAppointmentDetails"])
                self.assertTrue(response.data["primaryAppointmentDetails"]["appointmentDate"])
                detail = self.client.get(f"/api/appointments/supervisor/applications/{self.application.pk}/")
                self.assertEqual(detail.status_code, 200)

    def test_supporting_supervisor_team_access_does_not_grant_private_application_access(self):
        self.activate()
        response = self.team(self.new_supervisor)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data.get("approvedApplicationId"))
        supporting = response.data["appointments"][0]["supervisor"]
        self.assertEqual(supporting["email"], self.new_supervisor.email)
        self.assertIn("department", supporting)
        self.assertNotIn("staffNumber", supporting)
        detail = self.client.get(f"/api/appointments/supervisor/applications/{self.application.pk}/")
        self.assertEqual(detail.status_code, 403)

    def test_pending_replacement_is_not_used_instead_of_the_approved_application(self):
        SupervisorApplication.objects.create(student=self.student, academic_semester=self.semester,
            proposed_supervisor=self.new_supervisor, research_title="Pending replacement",
            research_area="Computing", research_abstract="Pending proposal",
            status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR)
        response = self.team(self.office)
        self.assertEqual(response.data.get("approvedApplicationId"), self.application.pk)

    def test_ended_appointment_or_nonapproved_application_has_no_current_application_link(self):
        self.application.status = SupervisorApplication.Status.PENDING_COORDINATOR
        self.application.save(update_fields=["status"])
        self.assertIsNone(self.team(self.office).data.get("approvedApplicationId"))
        self.application.status = SupervisorApplication.Status.APPROVED
        self.application.save(update_fields=["status"])
        self.supervisor_appointment.status = "ENDED"
        self.supervisor_appointment.save(update_fields=["status"])
        self.assertIsNone(self.team(self.office).data.get("approvedApplicationId"))

    def test_student_safe_projection_and_out_of_scope_access_are_preserved(self):
        student_team = self.team(self.student_user).data
        self.assertNotIn("approvedApplicationId", student_team)
        self.assertEqual(student_team["primaryAppointmentDetails"]["email"], self.supervisor.email)
        self.assertTrue(student_team["primaryAppointmentDetails"]["appointmentDate"])
        self.assertNotIn("staffNumber", student_team["primaryAppointmentDetails"])
        self.assertEqual(self.team(self.other_coordinator).status_code, 403)
        self.assertEqual(self.team(self.panel).status_code, 403)
