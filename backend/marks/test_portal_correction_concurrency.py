"""Portal correction versions and period closure serialize on PostgreSQL."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Event
from unittest import skipUnless

from django.core.exceptions import ValidationError
from django.db import close_old_connections, connection, connections, transaction
from django.test import override_settings
from rest_framework.test import APIClient, APITransactionTestCase

from academics.models import AcademicSemester
from .models import MarkCorrectionAudit, MarkEntry
from .services import close_evaluation_period, reopen_submitted_marks, submitted_marks_version
from . import test_portal_corrections as fixture


@skipUnless(connection.vendor == 'postgresql', 'Requires PostgreSQL row locking')
@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class MarksPortalCorrectionConcurrencyTests(APITransactionTestCase):
    setUp = fixture.MarksPortalCorrectionTests.setUp
    score_payload = fixture.MarksPortalCorrectionTests.score_payload

    def run_threads(self, *operations):
        def run(operation):
            close_old_connections()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET lock_timeout TO '5s'")
                return operation()
            finally:
                connections['default'].close()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(run, operation) for operation in operations]
            return [future.result(timeout=15) for future in futures]

    def test_two_corrections_of_the_same_version_have_one_winner(self):
        version = submitted_marks_version(self.entry)
        barrier = Barrier(2)

        def correct(score):
            client = APIClient()
            client.force_authenticate(self.office_admin)
            barrier.wait(timeout=5)
            return client.post(self.url+'correct/', {
                'expectedVersion': version, 'reason': 'Concurrent correction review',
                'scores': [{'componentId': self.problem.pk, 'marksAwarded': score}],
            }, format='json').status_code

        self.assertCountEqual(self.run_threads(lambda: correct('35'), lambda: correct('36')), [200, 409])
        self.entry.refresh_from_db()
        self.assertIn(str(self.entry.total_mark), ['85.00', '86.00'])
        self.assertEqual(MarkCorrectionAudit.objects.filter(entry=self.entry).count(), 1)

    def test_period_closure_that_locks_first_prevents_reopening(self):
        closing, attempting_reopen = Event(), Event()
        version = submitted_marks_version(self.entry)

        def close():
            with transaction.atomic():
                AcademicSemester.objects.select_for_update().get(pk=self.period.academic_semester_id)
                closing.set()
                self.assertTrue(attempting_reopen.wait(5))
                close_evaluation_period(period=self.period, actor=self.office_admin, reason='Close before reopening')
            return 'closed'

        def reopen():
            self.assertTrue(closing.wait(5))
            attempting_reopen.set()
            try:
                reopen_submitted_marks(entry=self.entry, actor=self.office_admin,
                                       reason='Concurrent reopening', expected_version=version)
            except ValidationError:
                return 'rejected'
            return 'reopened'

        self.assertEqual(self.run_threads(close, reopen), ['closed', 'rejected'])
        self.entry.refresh_from_db()
        self.assertEqual(self.entry.status, MarkEntry.Status.SUBMITTED)
        self.assertFalse(MarkCorrectionAudit.objects.filter(entry=self.entry).exists())
