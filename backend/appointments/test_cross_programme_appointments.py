from tempfile import TemporaryDirectory

from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import Coordinator, Lecturer, Student, User
from .models import PanelAppointment, StudentResearchProfile, SupervisorAppointment
from . import test_supervisor_workflow as workflow_fixture


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class CrossProgrammeAppointmentTests(APITestCase):
    authenticate = workflow_fixture.SupervisorAppointmentWorkflowTests.authenticate
    submit_application = workflow_fixture.SupervisorAppointmentWorkflowTests.submit_application
    accept_by_supervisor = workflow_fixture.SupervisorAppointmentWorkflowTests.accept_by_supervisor

    def setUp(self):
        media = TemporaryDirectory(prefix='fkstm-cross-programme-')
        self.addCleanup(media.cleanup)
        settings = override_settings(MEDIA_ROOT=media.name)
        settings.enable()
        self.addCleanup(settings.disable)
        workflow_fixture.SupervisorAppointmentWorkflowTests.setUp(self)
        self.cyber_student = User.objects.create_user(
            email='cross-programme-student@example.test',
            full_name='Cyber Security Student', role=User.Role.STUDENT,
        )
        Student.objects.create(
            user=self.cyber_student, matric_no='CROSS-CYBER-001',
            programme='MASTER OF CYBER SECURITY (COURSEWORK)', intake_semester='Semester I',
        )
        self.cyber_coordinator = User.objects.create_user(
            email='cross-programme-coordinator@example.test',
            full_name='Cyber Security Coordinator', role=User.Role.COORDINATOR,
        )
        Lecturer.objects.create(user=self.cyber_coordinator, staff_no='CROSS-COORD-001', department='Cyber Security')
        Coordinator.objects.create(lecturer=self.cyber_coordinator.lecturer, programme_managed=self.cyber_student.student.programme)

    def test_same_supervisor_and_panel_can_serve_students_in_different_programmes(self):
        # Programme belongs to Students/Coordinators. Lecturer eligibility is faculty-wide.
        students = [(self.student_user, self.coordinator, self.cyber_coordinator),
                    (self.cyber_student, self.cyber_coordinator, self.coordinator)]
        for student, coordinator, unrelated_coordinator in students:
            with self.subTest(programme=student.student.programme):
                self.student_user = student
                self.authenticate(student)
                candidates = self.client.get('/api/appointments/supervisor/candidates/')
                self.assertEqual(candidates.status_code, 200, candidates.data)
                self.assertIn(self.supervisor_user.lecturer.staff_no, [row['id'] for row in candidates.data])
                application_id = self.submit_application().data['id']
                self.assertEqual(self.accept_by_supervisor(application_id).status_code, 200)
                url = f'/api/appointments/supervisor/applications/{application_id}/coordinator-approve/'
                self.authenticate(unrelated_coordinator)
                self.assertEqual(self.client.post(url).status_code, 403)
                self.authenticate(coordinator)
                approved = self.client.post(url)
                self.assertEqual(approved.status_code, 200, approved.data)
                self.assertTrue(SupervisorAppointment.objects.filter(student=student.student, supervisor=self.supervisor_user, status='ACTIVE').exists())
                profile = StudentResearchProfile.objects.get(student=student)
                self.assertEqual(profile.programme, student.student.programme)

                self.authenticate(self.supervisor_user)
                candidates = self.client.get('/api/appointments/panel/candidates/')
                self.assertEqual(candidates.status_code, 200, candidates.data)
                self.assertIn(self.other_supervisor.lecturer.staff_no, [row['staffId'] for row in candidates.data])
                submitted = self.client.post('/api/appointments/panel/recommendations/', {
                    'studentId': student.student.matric_no,
                    'recommendedMemberId': self.other_supervisor.lecturer.staff_no,
                    'justification': 'Appropriate research expertise across programmes.',
                    'status': 'SUBMITTED_TO_PANEL',
                }, format='json')
                self.assertEqual(submitted.status_code, 201, submitted.data)
                recommendation_id = submitted.data['id']
                self.authenticate(self.other_supervisor)
                accepted = self.client.post(f'/api/appointments/panel/recommendations/{recommendation_id}/panel-accept/')
                self.assertEqual(accepted.status_code, 200, accepted.data)
                url = f'/api/appointments/panel/recommendations/{recommendation_id}/coordinator-approve/'
                self.authenticate(unrelated_coordinator)
                self.assertEqual(self.client.post(url).status_code, 403)
                self.authenticate(coordinator)
                approved = self.client.post(url)
                self.assertEqual(approved.status_code, 200, approved.data)
                self.assertTrue(PanelAppointment.objects.filter(profile=profile, panel_member=self.other_supervisor, status='ACTIVE').exists())

        self.assertEqual(SupervisorAppointment.objects.filter(supervisor=self.supervisor_user, status='ACTIVE').count(), 2)
        self.assertEqual(PanelAppointment.objects.filter(panel_member=self.other_supervisor, status='ACTIVE').count(), 2)
