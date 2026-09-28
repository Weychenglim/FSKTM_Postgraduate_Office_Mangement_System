from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless

from django.db import close_old_connections, connection, connections
from django.test import override_settings
from rest_framework.test import APITransactionTestCase

from accounts.participant_lifecycle import transition_student
from . import test_research_amendments as fixture
from .models import ResearchAmendment, ResearchProfileRevision
from .research_amendments import AmendmentConflict, submit, decide


@skipUnless(connection.vendor == 'postgresql', 'Requires PostgreSQL row locking')
@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class AmendmentConcurrencyTests(APITransactionTestCase):
    setUp = fixture.ResearchAmendmentTests.setUp
    _lecturer = fixture.ResearchAmendmentTests._lecturer

    def race(self, first, second):
        barrier = Barrier(2)
        def run(fn):
            close_old_connections()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET lock_timeout TO '5s'")
                barrier.wait(timeout=5)
                try:
                    fn()
                    return 'ok'
                except AmendmentConflict:
                    return 'conflict'
            finally:
                connections['default'].close()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(run, fn) for fn in (first, second)]
            return [future.result(timeout=15) for future in futures]

    def request(self):
        return submit(actor=self.student_user, data={'kind': 'RESEARCH', 'title': 'Revised research', 'reason': 'Academic refinement.'})

    def test_concurrent_requests_leave_one_proposal_and_one_initial_event(self):
        self.assertCountEqual(self.race(self.request, self.request), ['ok', 'conflict'])
        self.assertEqual(ResearchAmendment.objects.count(), 1)
        self.assertEqual(ResearchAmendment.objects.get().events.count(), 1)

    def test_concurrent_final_approvals_apply_one_revision(self):
        row = self.request()
        decide(request_id=row.pk, actor=self.supervisor, decision='APPROVE', expected_status='PENDING_SUPERVISOR')
        approve = lambda: decide(request_id=row.pk, actor=self.coordinator, decision='APPROVE', expected_status='PENDING_COORDINATOR')
        self.assertCountEqual(self.race(approve, approve), ['ok', 'conflict'])
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.revision, 1)
        self.assertEqual(ResearchProfileRevision.objects.filter(profile=self.profile).count(), 2)

    def test_withdrawal_and_final_decision_never_leave_pending_work(self):
        row = self.request()
        decide(request_id=row.pk, actor=self.supervisor, decision='APPROVE', expected_status='PENDING_SUPERVISOR')
        results = self.race(
            lambda: decide(request_id=row.pk, actor=self.coordinator, decision='APPROVE', expected_status='PENDING_COORDINATOR'),
            lambda: transition_student(matric_no=self.student.matric_no, actor=self.office,
                                       target_status='WITHDRAWN', reason='Student withdrawal.'),
        )
        self.assertIn('ok', results)
        row.refresh_from_db()
        self.assertIn(row.status, ['APPROVED', 'CANCELLED'])
        self.student.refresh_from_db()
        self.assertEqual(self.student.status, 'Withdrawn')
