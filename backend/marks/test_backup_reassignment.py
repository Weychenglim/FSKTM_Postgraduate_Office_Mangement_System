from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework.test import APITransactionTestCase

from . import test_completion_windows as fixture
from .models import EvaluationTask, EvaluationTaskOverrideAudit, MarkEntry
from .services import (
    MarksStateConflict, create_backup_evaluation_task,
    pause_student_evaluation_tasks, resume_student_evaluation_tasks,
)


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class BackupReassignmentTests(APITestCase):
    setUp = fixture.CompletionWindowTests.setUp
    user = fixture.CompletionWindowTests.user
    lecturer = fixture.CompletionWindowTests.lecturer
    profile = fixture.CompletionWindowTests.profile
    payload = fixture.CompletionWindowTests.payload
    period = fixture.CompletionWindowTests.period
    publish = fixture.CompletionWindowTests.publish

    def assign(self):
        return create_backup_evaluation_task(
            period=self.period_obj, profile=self.student_profile,
            evaluator=self.backup, actor=self.office, reason="Cover evaluation",
        )

    def test_reassignment_after_scheduled_deferral_preserves_retired_draft(self):
        self.period_obj.opens_at = timezone.now() + timezone.timedelta(days=1)
        self.period_obj.save(update_fields=["opens_at"])
        previous = self.assign()
        draft = MarkEntry.objects.create(task=previous, status="DRAFT", comments="Original feedback")
        pause_student_evaluation_tasks(profile=self.student_profile, actor=self.office, reason="Deferral")
        resume_student_evaluation_tasks(profile=self.student_profile, actor=self.office, reason="Return")
        previous.refresh_from_db()
        self.assertEqual(previous.lifecycle_status, "RETIRED")
        self.period_obj.opens_at = timezone.now() - timezone.timedelta(hours=1)
        self.period_obj.save(update_fields=["opens_at"])
        new = self.assign()
        self.assertNotEqual(new.pk, previous.pk)
        self.assertEqual(new.lifecycle_status, "ACTIVE")
        draft.refresh_from_db()
        self.assertEqual(draft.comments, "Original feedback")
        self.assertEqual(draft.task_id, previous.pk)
        self.assertFalse(MarkEntry.objects.filter(task=new).exists())
        self.assertEqual(EvaluationTaskOverrideAudit.objects.filter(task=new).count(), 1)

    def test_multiple_historical_backups_do_not_make_reassignment_ambiguous(self):
        for _ in range(2):
            EvaluationTask.objects.create(
                profile=self.student_profile, evaluator=self.backup,
                period=self.period_obj, evaluator_role="BACKUP", lifecycle_status="RETIRED",
            )
        self.assertEqual(self.assign().lifecycle_status, "ACTIVE")
        self.assertEqual(EvaluationTask.objects.filter(evaluator=self.backup, lifecycle_status="RETIRED").count(), 2)

    def test_live_paused_and_submitted_assignments_cannot_be_assigned_again(self):
        task = self.assign()
        audit_count = EvaluationTaskOverrideAudit.objects.count()
        for state in ("ACTIVE", "PAUSED"):
            EvaluationTask.objects.filter(pk=task.pk).update(lifecycle_status=state)
            with self.assertRaises(MarksStateConflict):
                self.assign()
        EvaluationTask.objects.filter(pk=task.pk).update(lifecycle_status="ACTIVE")
        MarkEntry.objects.create(task=task, status="SUBMITTED", comments="Final feedback")
        with self.assertRaises(MarksStateConflict):
            self.assign()
        self.assertEqual(EvaluationTaskOverrideAudit.objects.count(), audit_count)
        self.assertEqual(EvaluationTask.objects.filter(evaluator=self.backup).count(), 1)

    def test_duplicate_assignment_api_returns_conflict_without_audit(self):
        self.assign()
        count = EvaluationTaskOverrideAudit.objects.count()
        response = self.client.post(
            f"/api/marks/periods/{self.period_obj.pk}/manual-overrides/",
            {"studentId": self.student_profile.matric_no, "evaluatorId": self.backup.pk, "reason": "Repeated assignment"},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(EvaluationTaskOverrideAudit.objects.count(), count)


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class BackupReassignmentConcurrencyTests(APITransactionTestCase):
    setUp = fixture.CompletionWindowTests.setUp
    user = fixture.CompletionWindowTests.user
    lecturer = fixture.CompletionWindowTests.lecturer
    profile = fixture.CompletionWindowTests.profile
    payload = fixture.CompletionWindowTests.payload
    period = fixture.CompletionWindowTests.period
    publish = fixture.CompletionWindowTests.publish
    assign = BackupReassignmentTests.assign

    def test_concurrent_backup_requests_create_one_task_and_one_audit(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier
        from django.db import close_old_connections, connection, connections

        barrier = Barrier(2)

        def assign():
            close_old_connections()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET lock_timeout = '5s'")
                barrier.wait(timeout=10)
                try:
                    self.assign()
                    return "created"
                except MarksStateConflict:
                    return "conflict"
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(assign) for _ in range(2)]
            outcomes = [future.result(timeout=20) for future in futures]
        self.assertCountEqual(outcomes, ["created", "conflict"])
        self.assertEqual(EvaluationTask.objects.filter(evaluator=self.backup).count(), 1)
        self.assertEqual(EvaluationTaskOverrideAudit.objects.count(), 1)
