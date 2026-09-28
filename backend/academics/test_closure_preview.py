from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from academics.models import AcademicSemester, AcademicSemesterAudit
from appointments.models import StudentResearchProfile
from marks.models import EvaluationPeriod, EvaluationTask, MarkEntry, Rubric


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class ClosurePreviewTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.office = User.objects.create_user(email='closure@example.test', password='test', full_name='Office', role=User.Role.OFFICE_ADMIN, is_staff=True)
        self.client.force_authenticate(self.office)
        today = timezone.localdate()
        self.semester = AcademicSemester.objects.create(code='CLOSE', academic_session='2026/2027', term='SEMESTER_I', starts_on=today-timezone.timedelta(days=1), ends_on=today+timezone.timedelta(days=30), lifecycle_status='ACTIVE', created_by=self.office)
        self.period = EvaluationPeriod.objects.create(name='Review', semester='Close', academic_semester=self.semester, rubric=Rubric.objects.create(name='Close', code='close'), lifecycle_status='PUBLISHED')
        profile = StudentResearchProfile.objects.create(matric_no='CLOSE1', student_name='Student', programme='MSc', semester='Close', proposed_topic='Research', supervisor=self.office)
        self.task = EvaluationTask.objects.create(profile=profile, evaluator=self.office, period=self.period)
        self.base = f'/api/academics/semesters/{self.semester.pk}'

    def preview(self):
        response = self.client.get(self.base + '/closure-preview/')
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_preview_counts_and_office_only(self):
        payload = self.preview()
        self.assertEqual(payload['totals'], dict(submitted=0, notStarted=1, draft=0, paused=0, activeWindows=0, unfinished=1))
        self.assertTrue(payload['requiresAcknowledgement'])
        self.office.role = 'LECTURER'
        self.office.save()
        self.assertEqual(self.client.get(self.base + '/closure-preview/').status_code, 403)

    def test_missing_acknowledgement_prevents_close_without_side_effects(self):
        response = self.client.post(self.base + '/close/', {'reason': 'Close'}, format='json')
        self.assertEqual(response.status_code, 409)
        self.semester.refresh_from_db()
        self.period.refresh_from_db()
        self.assertEqual(self.semester.lifecycle_status, 'ACTIVE')
        self.assertEqual(self.period.lifecycle_status, 'PUBLISHED')
        self.assertFalse(AcademicSemesterAudit.objects.filter(semester=self.semester).exists())

    def test_acknowledged_current_preview_closes(self):
        payload = self.preview()
        response = self.client.post(self.base + '/close/', {'reason': 'Close', 'previewToken': payload['previewToken'], 'acknowledgeUnfinished': True}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_changed_task_identity_invalidates_preview_even_with_same_counts(self):
        payload = self.preview()
        self.task.lifecycle_status = 'RETIRED'
        self.task.save()
        EvaluationTask.objects.create(profile=self.task.profile, evaluator=self.office, period=self.period)
        response = self.client.post(self.base + '/close/', {'reason': 'Close', 'previewToken': payload['previewToken'], 'acknowledgeUnfinished': True}, format='json')
        self.assertEqual(response.status_code, 409)

    def test_paused_and_submitted_are_disjoint_and_retired_excluded(self):
        self.task.lifecycle_status = 'PAUSED'
        self.task.save()
        self.assertEqual(self.preview()['totals']['paused'], 1)
        MarkEntry.objects.create(task=self.task, status='SUBMITTED')
        totals = self.preview()['totals']
        self.assertEqual(totals['submitted'], 1)
        self.assertEqual(totals['paused'], 0)
        self.task.lifecycle_status = 'RETIRED'
        self.task.save()
        self.assertEqual(self.preview()['totals']['submitted'], 0)

    def window(self):
        from marks.models import TaskCompletionWindow
        return TaskCompletionWindow.objects.create(task=self.task, deadline=timezone.now()+timezone.timedelta(days=3), reason='Complete work', granted_by=self.office)

    def test_window_change_invalidates_preview(self):
        payload = self.preview()
        self.window()
        response = self.client.post(self.base + '/close/', {'reason': 'Close', 'previewToken': payload['previewToken'], 'acknowledgeUnfinished': True}, format='json')
        self.assertEqual(response.status_code, 409)

    def test_archive_blocked_by_unfinished_live_window(self):
        window = self.window()
        payload = self.preview()
        self.assertEqual(payload['totals']['activeWindows'], 1)
        response = self.client.post(self.base + '/close/', {'reason': 'Close', 'previewToken': payload['previewToken'], 'acknowledgeUnfinished': True}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        window.refresh_from_db()
        self.assertIsNone(window.ended_at)
        response = self.client.post(self.base + '/archive/', {'reason': 'Archive'}, format='json')
        self.assertEqual(response.status_code, 409)
        self.semester.refresh_from_db()
        self.assertEqual(self.semester.lifecycle_status, 'CLOSED')

    def test_expired_window_does_not_block_archive(self):
        from unittest.mock import patch
        window = self.window()
        self.semester.lifecycle_status = 'CLOSED'
        self.semester.save()
        with patch('marks.closure_preview.timezone.now', return_value=window.deadline + timezone.timedelta(seconds=1)):
            response = self.client.post(self.base + '/archive/', {'reason': 'Archive'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_no_unfinished_work_keeps_legacy_close_compatible(self):
        MarkEntry.objects.create(task=self.task, status='SUBMITTED')
        response = self.client.post(self.base + '/close/', {'reason': 'Close'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_token_cannot_be_reused_for_another_period(self):
        payload = self.preview()
        response = self.client.post(f'/api/marks/periods/{self.period.pk}/close/', {'reason': 'Close', 'previewToken': payload['previewToken'], 'acknowledgeUnfinished': True}, format='json')
        self.assertEqual(response.status_code, 409)


    def target(self):
        from academics.test_capacity_helpers import publish_test_capacity_plan
        today = timezone.localdate()
        target = AcademicSemester.objects.create(code='NEXT', academic_session='2026/2027', term='SEMESTER_II', starts_on=today, ends_on=today+timezone.timedelta(days=60), created_by=self.office)
        publish_test_capacity_plan(target, self.office)
        return target

    def test_handover_requires_outgoing_preview_and_preserves_window(self):
        target = self.target()
        window = self.window()
        url = f'/api/academics/semesters/{target.pk}'
        preview = self.client.get(url + '/handover-preview/')
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.data['semesterId'], self.semester.pk)
        denied = self.client.post(url + '/activate/', {'reason': 'Handover'}, format='json')
        self.assertEqual(denied.status_code, 409)
        accepted = self.client.post(url + '/activate/', {'reason': 'Handover', 'previewToken': preview.data['previewToken'], 'acknowledgeUnfinished': True}, format='json')
        self.assertEqual(accepted.status_code, 200, accepted.data)
        window.refresh_from_db()
        self.assertIsNone(window.ended_at)
        self.semester.refresh_from_db()
        self.assertEqual(self.semester.lifecycle_status, 'CLOSED')

    def test_handover_rejects_token_for_different_target(self):
        target = self.target()
        preview = self.client.get(f'/api/academics/semesters/{target.pk}/handover-preview/')
        self.assertEqual(preview.status_code, 200)
        target.term = 'SPECIAL'
        target.save()
        response = self.client.post(f'/api/academics/semesters/{target.pk}/activate/', {'reason': 'Handover', 'previewToken': preview.data['previewToken'], 'acknowledgeUnfinished': True}, format='json')
        self.assertEqual(response.status_code, 409)
        self.semester.refresh_from_db()
        self.assertEqual(self.semester.lifecycle_status, 'ACTIVE')

    def test_submitted_task_window_is_consumed_and_not_counted_active(self):
        self.window()
        MarkEntry.objects.create(task=self.task, status='SUBMITTED')
        totals = self.preview()['totals']
        self.assertEqual(totals['submitted'], 1)
        self.assertEqual(totals['activeWindows'], 0)
