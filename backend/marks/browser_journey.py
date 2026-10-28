"""Opt-in real HTTP/browser acceptance: manage.py test marks.browser_journey.

Requires frontend dependencies and Chrome/Edge. Never uses the development DB.
"""
import json
from pathlib import Path
import subprocess

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.db import connection
from django.test import LiveServerTestCase, override_settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import OfficeStaff
from academics.models import AcademicSemester
from academics.test_capacity_helpers import publish_test_capacity_plan
from . import test_period_targeting as fixtures
from .models import EvaluationPeriod, EvaluationTask, MarkCorrectionAudit, MarkEntry, MarkSubmissionReceipt, Rubric

User = get_user_model()


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class MarksBrowserJourney(LiveServerTestCase):
    host = '127.0.0.1'
    user = fixtures.PeriodTargetingTests.user
    lecturer = fixtures.PeriodTargetingTests.lecturer
    profile = fixtures.PeriodTargetingTests.profile

    def setUp(self):
        self.assertTrue(connection.settings_dict['NAME'].startswith('test_'), 'A disposable test database is required.')
        self.office = self.user('journey-office', User.Role.OFFICE_ADMIN)
        self.office.is_staff = False
        self.office.save(update_fields=['is_staff'])
        self.office.user_permissions.add(Permission.objects.get(
            content_type__app_label='marks', codename='change_markentry',
        ))
        OfficeStaff.objects.create(user=self.office, staff_no='JOURNEY-OFFICE')
        self.marker = self.lecturer('journey-marker')
        self.other = self.lecturer('journey-other')
        today = timezone.localdate()
        self.semester = AcademicSemester.objects.create(
            code='JOURNEY-S1', academic_session='2026/2027', term=AcademicSemester.Term.SEMESTER_I,
            starts_on=today - timezone.timedelta(days=30), ends_on=today + timezone.timedelta(days=90),
            lifecycle_status=AcademicSemester.Lifecycle.ACTIVE, created_by=self.office, activated_at=timezone.now(),
        )
        publish_test_capacity_plan(self.semester, self.office)
        self.supervisor, self.panel = self.marker, self.other
        self.supervisee = self.profile('JOURNEY-SUPERVISEE')
        self.supervisor, self.panel = self.other, self.marker
        self.panel_student = self.profile('JOURNEY-PANEL')

    def test_office_configuration_through_lecturer_submission_and_office_results(self):
        frontend = Path(__file__).resolve().parents[2] / 'frontend'
        config = {
            'backend': self.live_server_url,
            'officeToken': str(AccessToken.for_user(self.office)),
            'lecturerToken': str(AccessToken.for_user(self.marker)),
            'semesterId': self.semester.pk,
        }
        completed = subprocess.run(
            ['node', 'tests/marksJourney.browser.mjs'], cwd=frontend,
            input=json.dumps(config), text=True, capture_output=True, timeout=180,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        print(completed.stdout.strip())
        self.assertEqual(Rubric.objects.count(), 1)
        self.assertEqual(EvaluationPeriod.objects.count(), 1)
        self.assertEqual(EvaluationTask.objects.count(), 4)
        entries = MarkEntry.objects.filter(task__evaluator=self.marker).select_related('task')
        self.assertEqual({entry.task.evaluator_role: str(entry.total_mark) for entry in entries}, {'SUPERVISOR': '85.00', 'PANEL': '60.00'})
        self.assertTrue(all(entry.status == 'SUBMITTED' for entry in entries))
        self.assertFalse(MarkEntry.objects.filter(task__evaluator=self.other).exists())
        self.assertEqual(MarkSubmissionReceipt.objects.count(), 3, 'Two original submissions and one authorized resubmission; retries add no receipt.')
        self.assertFalse(User.objects.get(pk=self.office.pk).is_staff)
        audits = list(MarkCorrectionAudit.objects.order_by('pk'))
        self.assertEqual([row.action for row in audits], ['CORRECT', 'REOPEN'])
        self.assertTrue(all(row.actor_id == self.office.pk and row.reason.strip() for row in audits))
