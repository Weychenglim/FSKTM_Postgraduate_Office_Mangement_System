from copy import deepcopy
from decimal import Decimal
from uuid import uuid4

from django.test import override_settings
from rest_framework.test import APITestCase

from . import tests as fixtures
from .models import EvaluationTask, MarkEntry
from .serializers import EvaluationTaskSerializer
from .services import reopen_submitted_marks


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class MarkWriteReliabilityTests(APITestCase):
    setUp = fixtures.MarkEntryWorkflowTests.setUp

    def payload(self, problem='30.00', method='50.00', *, version=None):
        task = EvaluationTask.objects.select_related('mark_entry').get(pk=self.task.pk)
        return {
            'expectedVersion': version or EvaluationTaskSerializer(task).data.get('writeVersion', '0' * 64),
            'scores': [{'componentId': self.problem.pk, 'marksAwarded': problem, 'feedback': 'Problem feedback'},
                       {'componentId': self.method.pk, 'marksAwarded': method, 'feedback': 'Method feedback'}],
            'comments': 'Current assessment',
        }

    def draft(self, payload):
        self.client.force_authenticate(self.lecturer)
        return self.client.put(f'/api/marks/tasks/{self.task.pk}/draft/', payload, format='json')

    def submit(self, payload):
        self.client.force_authenticate(self.lecturer)
        return self.client.post(f'/api/marks/tasks/{self.task.pk}/submit/', payload, format='json')

    def submission(self, **values):
        return {**self.payload(**values), 'submissionId': str(uuid4())}

    def test_task_read_exposes_a_stable_write_version_that_changes_after_save(self):
        self.client.force_authenticate(self.lecturer)
        initial = self.client.get('/api/marks/my-evaluation-tasks/').data[0].get('writeVersion')
        self.assertIsNotNone(initial)
        self.assertEqual(len(initial), 64)
        saved = self.draft(self.payload())
        self.assertEqual(saved.status_code, 200, saved.data)
        self.assertNotEqual(saved.data['writeVersion'], initial)

    def test_missing_version_is_rejected_without_creating_a_draft(self):
        payload = self.payload()
        del payload['expectedVersion']
        self.assertEqual(self.draft(payload).status_code, 400)
        self.assertFalse(MarkEntry.objects.filter(task=self.task).exists())

    def test_older_tab_cannot_overwrite_newer_scores_or_feedback(self):
        original = self.payload()
        saved = self.draft(original)
        self.assertEqual(saved.status_code, 200, saved.data)
        newer = self.payload(problem='35.00')
        newer['comments'] = 'Newer tab comments'
        self.assertEqual(self.draft(newer).status_code, 200)
        stale = self.draft(original)
        self.assertEqual(stale.status_code, 409, stale.data)
        entry = MarkEntry.objects.get(task=self.task)
        self.assertEqual(entry.total_mark, Decimal('85.00'))
        self.assertEqual(entry.comments, 'Newer tab comments')

    def test_submission_saves_and_locks_the_reviewed_payload_without_a_prior_draft(self):
        result = self.submit(self.submission())
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data['status'], 'SUBMITTED')
        self.assertEqual(result.data['totalMark'], '80.00')
        self.assertFalse(result.data['canEdit'])
        self.assertEqual(MarkEntry.objects.get(task=self.task).comments, 'Current assessment')

    def test_invalid_submission_preserves_existing_draft_and_scores(self):
        self.assertEqual(self.draft(self.payload()).status_code, 200)
        before = MarkEntry.objects.get(task=self.task)
        payload = self.submission(problem='10.00')
        payload['scores'] = payload['scores'][:1]
        payload['comments'] = 'Must not replace saved draft'
        result = self.submit(payload)
        self.assertEqual(result.status_code, 400, result.data)
        after = MarkEntry.objects.get(task=self.task)
        self.assertEqual((after.status, after.total_mark, after.comments, after.updated_at),
                         (before.status, before.total_mark, before.comments, before.updated_at))

    def test_invalid_submission_does_not_leave_a_new_partial_draft(self):
        payload = self.submission()
        payload['scores'] = payload['scores'][:1]
        self.assertEqual(self.submit(payload).status_code, 400)
        self.assertFalse(MarkEntry.objects.filter(task=self.task).exists())

    def test_stale_submission_cannot_lock_a_newer_draft(self):
        old = self.submission()
        self.assertEqual(self.draft(self.payload(problem='35.00')).status_code, 200)
        self.assertEqual(self.submit(old).status_code, 409)
        entry = MarkEntry.objects.get(task=self.task)
        self.assertEqual(entry.status, 'DRAFT')
        self.assertEqual(entry.total_mark, Decimal('85.00'))

    def test_same_submission_retry_returns_success_without_writing_twice(self):
        payload = self.submission()
        first = self.submit(payload)
        self.assertEqual(first.status_code, 200, first.data)
        entry = MarkEntry.objects.get(task=self.task)
        retry = self.submit(payload)
        self.assertEqual(retry.status_code, 200, retry.data)
        latest = MarkEntry.objects.get(task=self.task)
        self.assertEqual((latest.submitted_at, latest.updated_at), (entry.submitted_at, entry.updated_at))
        from .models import MarkSubmissionReceipt
        self.assertEqual(MarkSubmissionReceipt.objects.filter(task=self.task).count(), 1)

    def test_reusing_submission_reference_for_changed_values_is_rejected(self):
        payload = self.submission()
        self.assertEqual(self.submit(payload).status_code, 200)
        changed = deepcopy(payload)
        changed['scores'][0]['marksAwarded'] = '35.00'
        self.assertEqual(self.submit(changed).status_code, 409)
        self.assertEqual(MarkEntry.objects.get(task=self.task).total_mark, Decimal('80.00'))

    def test_committed_retry_still_succeeds_after_period_closes(self):
        payload = self.submission()
        self.assertEqual(self.submit(payload).status_code, 200)
        self.period.lifecycle_status = 'CLOSED'
        self.period.save(update_fields=['lifecycle_status'])
        self.assertEqual(self.submit(payload).status_code, 200)

    def test_old_submission_retry_cannot_resubmit_a_reopened_entry(self):
        payload = self.submission()
        self.assertEqual(self.submit(payload).status_code, 200)
        reopen_submitted_marks(entry=MarkEntry.objects.get(task=self.task), actor=self.office_admin, reason='Review')
        self.assertEqual(self.submit(payload).status_code, 409)
        self.assertEqual(MarkEntry.objects.get(task=self.task).status, 'DRAFT')

    def test_another_lecturer_cannot_replay_an_owned_submission(self):
        payload = self.submission()
        self.assertEqual(self.submit(payload).status_code, 200)
        self.client.force_authenticate(self.other_lecturer)
        result = self.client.post(f'/api/marks/tasks/{self.task.pk}/submit/', payload, format='json')
        self.assertEqual(result.status_code, 404)

    def test_retry_cannot_present_an_old_result_after_an_office_correction(self):
        from .services import correct_submitted_marks
        payload = self.submission()
        self.assertEqual(self.submit(payload).status_code, 200)
        correct_submitted_marks(entry=MarkEntry.objects.get(task=self.task), actor=self.office_admin,
                                score_values={self.problem.pk: Decimal('31.00')}, reason='Authorized correction')
        self.assertEqual(self.submit(payload).status_code, 409)
        self.assertEqual(MarkEntry.objects.get(task=self.task).total_mark, Decimal('81.00'))

    def test_submission_receipt_cannot_be_rewritten_or_deleted(self):
        from django.core.exceptions import ValidationError
        from .models import MarkSubmissionReceipt
        self.assertEqual(self.submit(self.submission()).status_code, 200)
        receipt = MarkSubmissionReceipt.objects.get(task=self.task)
        with self.assertRaises(ValidationError):
            receipt.save()
        with self.assertRaises(ValidationError):
            receipt.delete()
        with self.assertRaises(ValidationError):
            MarkSubmissionReceipt.objects.filter(pk=receipt.pk).update(entry_version='0' * 64)
        with self.assertRaises(ValidationError):
            MarkSubmissionReceipt.objects.filter(pk=receipt.pk).delete()
