from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from academics.models import AcademicSemester, AcademicSemesterAudit
from academics.test_capacity_helpers import publish_test_capacity_plan


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class SemesterActivationReadinessTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.office = User.objects.create_user(email='activation@example.test', password='test', full_name='Office', role=User.Role.OFFICE_ADMIN)
        self.client.force_authenticate(self.office)
        self.today = timezone.localdate()
        self.current = AcademicSemester.objects.create(code='ACT-CURRENT', academic_session='2026/2027', term='SEMESTER_I', starts_on=self.today-timedelta(days=30), ends_on=self.today-timedelta(days=1), lifecycle_status='ACTIVE', created_by=self.office)
        self.target = AcademicSemester.objects.create(code='ACT-TARGET', academic_session='2026/2027', term='SEMESTER_II', starts_on=self.today, ends_on=self.today+timedelta(days=30), created_by=self.office)
        publish_test_capacity_plan(self.target, self.office)
        self.base = f'/api/academics/semesters/{self.target.pk}'

    def readiness(self):
        response = self.client.get(self.base + '/activation-readiness/')
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_ready_read_is_non_mutating_and_activation_matches(self):
        before = AcademicSemesterAudit.objects.count()
        payload = self.readiness()
        self.assertTrue(payload['canActivate'])
        self.assertTrue(all(check['ready'] for check in payload['checks']))
        self.assertEqual(payload['currentSemester']['id'], self.current.pk)
        self.assertEqual(payload['checkedOn'], self.today.isoformat())
        self.assertEqual(AcademicSemesterAudit.objects.count(), before)
        response = self.client.post(self.base + '/activate/', {'reason': 'Begin semester'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.current.refresh_from_db()
        self.assertEqual(self.current.lifecycle_status, 'CLOSED')

    def test_current_semester_end_date_is_inclusive_and_blocks_direct_post(self):
        from marks.models import EvaluationPeriod, Rubric
        period = EvaluationPeriod.objects.create(name='Current evaluations', semester=self.current.label, academic_semester=self.current, rubric=Rubric.objects.create(name='Current', code='activation-current'), lifecycle_status='PUBLISHED', is_open=True)
        self.current.ends_on = self.today
        self.current.save()
        self.assertFalse(self.readiness()['canActivate'])
        response = self.client.post(self.base + '/activate/', {'reason': 'Too early'}, format='json')
        self.assertEqual(response.status_code, 409, response.data)
        self.assertIn('current semester', str(response.data).lower())
        self.current.refresh_from_db()
        self.target.refresh_from_db()
        self.assertEqual(self.current.lifecycle_status, 'ACTIVE')
        self.assertEqual(self.target.lifecycle_status, 'DRAFT')
        self.assertFalse(AcademicSemesterAudit.objects.exists())
        period.refresh_from_db()
        self.assertEqual(period.lifecycle_status, 'PUBLISHED')
        self.assertTrue(period.is_open)

    def test_no_current_semester_can_activate_when_other_checks_pass(self):
        self.current.lifecycle_status = 'CLOSED'
        self.current.save()
        payload = self.readiness()
        self.assertIsNone(payload['currentSemester'])
        self.assertTrue(payload['canActivate'])
        response = self.client.post(self.base + '/activate/', {'reason': 'First active semester'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_future_and_expired_target_dates_are_not_ready(self):
        for offset in [-60, 60]:
            with patch('academics.services.timezone.localdate', return_value=self.today+timedelta(days=offset)):
                self.assertFalse(self.readiness()['canActivate'])
                response = self.client.post(self.base + '/activate/', {'reason': 'Outside dates'}, format='json')
                self.assertEqual(response.status_code, 409)

    def test_capacity_readiness_uses_publication_gate(self):
        self.target.capacity_plans.update(lifecycle_status='DRAFT')
        payload = self.readiness()
        self.assertFalse(payload['canActivate'])
        self.assertFalse(next(check for check in payload['checks'] if check['key']=='capacity')['ready'])
        response = self.client.post(self.base + '/activate/', {'reason': 'No plan'}, format='json')
        self.assertEqual(response.status_code, 409)

    def test_changed_current_dates_are_rechecked_after_readiness(self):
        self.assertTrue(self.readiness()['canActivate'])
        self.current.ends_on = self.today+timedelta(days=5)
        self.current.save()
        response = self.client.post(self.base + '/activate/', {'reason': 'Stale readiness'}, format='json')
        self.assertEqual(response.status_code, 409)
        self.target.refresh_from_db()
        self.assertEqual(self.target.lifecycle_status, 'DRAFT')

    def test_read_requires_office_and_non_draft_is_not_ready(self):
        self.target.lifecycle_status = 'CLOSED'
        self.target.save()
        self.assertFalse(self.readiness()['canActivate'])
        self.office.role = 'LECTURER'
        self.office.save()
        self.assertEqual(self.client.get(self.base + '/activation-readiness/').status_code, 403)
