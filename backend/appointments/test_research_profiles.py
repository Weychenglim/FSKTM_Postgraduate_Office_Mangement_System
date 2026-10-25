from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase

from accounts.models import Student, User
from . import research_amendments as service
from .models import StudentResearchProfile
from . import test_appointment_lifecycle as fixture


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class ResearchProfileDirectoryTests(APITestCase):
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    base = '/api/appointments/research-amendments/profiles/'

    def setUp(self):
        fixture.AppointmentLifecycleTests.setUp(self)
        self.office.is_staff = True
        self.office.save(update_fields=['is_staff'])
        self.client.force_authenticate(self.office)
        for index in range(32):
            user = User.objects.create_user(email=f'directory-{index}@example.test', full_name=f'Directory Student {index:02}', role=User.Role.STUDENT)
            student = Student.objects.create(user=user, matric_no=f'DIR-{index:03}', programme='Computing' if index < 30 else 'Other programme')
            StudentResearchProfile.objects.create(student=user, student_name=user.full_name, matric_no=student.matric_no,
                programme=student.programme, proposed_topic=f'Research topic {index:02}', supervisor=self.supervisor)

    def test_paging_search_sort_and_facets(self):
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(self.base, {'page': 3, 'size': 10, 'programme': 'Computing'})
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data['pagination']['total'], 30)
        self.assertEqual(len(data['students']), 10)
        self.assertEqual(data['students'][0]['name'], 'Directory Student 20')
        self.assertEqual(len(queries), 3, 'Facets, count and one sliced result query; no per-student queries')
        self.assertIn('LIMIT 10 OFFSET 20', queries[-1]['sql'])
        self.assertIn('Other programme', data['programmes'])
        for query in ['DIR-021', 'Student 21', 'topic 21']:
            result = self.client.get(self.base, {'q': query}).data
            self.assertEqual(result['pagination']['total'], 1)
            self.assertEqual(result['students'][0]['matricNo'], 'DIR-021')
        last = self.client.get(self.base, {'programme': 'Computing', 'sort': 'name_desc', 'page': 999}).data
        self.assertEqual(last['pagination']['page'], 3)
        self.assertEqual(last['students'][0]['name'], 'Directory Student 09')
        self.assertEqual(self.client.get(self.base, {'q': 'absent'}).data['pagination']['total'], 0)
        self.assertEqual(self.client.get(self.base, {'size': 1000}).status_code, 400)

    def test_existing_profile_permissions_bound_directory_and_facets(self):
        for actor in [self.coordinator, self.supervisor, self.other_coordinator]:
            self.client.force_authenticate(actor)
            allowed = set(service.current_profiles(actor).values_list('student_id', flat=True))
            data = self.client.get(self.base, {'size': 50}).data
            self.assertEqual({row['id'] for row in data['students']}, allowed)
            self.assertNotIn('Other programme', data['programmes'])
            self.assertEqual(self.client.get('/api/appointments/research-amendments/options/',
                {'studentId': StudentResearchProfile.objects.get(matric_no='DIR-021').student_id, 'selectedOnly': 'true'}).status_code, 404)
        self.client.force_authenticate(self.student_user)
        self.assertEqual(self.client.get(self.base).status_code, 403)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.base).status_code, [401, 403])
        self.office.is_staff = False
        self.office.save(update_fields=['is_staff'])
        self.client.force_authenticate(self.office)
        self.assertEqual(self.client.get(self.base).status_code, 403)

    def test_selected_only_options_do_not_serialize_the_full_roster(self):
        selected = StudentResearchProfile.objects.filter(matric_no='DIR-021').get()
        data = self.client.get('/api/appointments/research-amendments/options/', {'studentId': selected.student_id, 'selectedOnly': 'true'}).data
        self.assertEqual([row['id'] for row in data['students']], [selected.student_id])
        self.assertEqual(data['profile']['studentId'], selected.student_id)
