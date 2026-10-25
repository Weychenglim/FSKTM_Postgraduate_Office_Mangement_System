from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from uuid import uuid4

from django.db import close_old_connections, connection, connections
from django.test import override_settings
from rest_framework.test import APIClient, APITransactionTestCase

from . import tests as fixtures
from . import test_write_reliability as write_fixtures
from .models import MarkEntry, MarkSubmissionReceipt


@skipUnless(connection.vendor == 'postgresql', 'Requires PostgreSQL row locking')
@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class MarkWriteConcurrencyTests(APITransactionTestCase):
    setUp = fixtures.MarkEntryWorkflowTests.setUp
    payload = write_fixtures.MarkWriteReliabilityTests.payload

    def race(self, endpoint, payloads):
        barrier = Barrier(2)
        def run(payload):
            close_old_connections()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET lock_timeout TO '5s'")
                client = APIClient()
                client.force_authenticate(self.lecturer)
                barrier.wait(timeout=5)
                method = client.put if endpoint == 'draft' else client.post
                return method(f'/api/marks/tasks/{self.task.pk}/{endpoint}/', payload, format='json').status_code
            finally:
                connections['default'].close()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(run, payload) for payload in payloads]
            return [future.result(timeout=20) for future in futures]

    def test_two_draft_tabs_have_one_winner(self):
        first = self.payload()
        second = {**first, 'comments': 'Other tab'}
        self.assertCountEqual(self.race('draft', [first, second]), [200, 409])
        self.assertEqual(MarkEntry.objects.filter(task=self.task).count(), 1)

    def test_same_submission_in_flight_twice_has_one_receipt_and_two_successes(self):
        payload = {**self.payload(), 'submissionId': str(uuid4())}
        self.assertEqual(self.race('submit', [payload, payload]), [200, 200])
        self.assertEqual(MarkSubmissionReceipt.objects.filter(task=self.task).count(), 1)
        self.assertEqual(MarkEntry.objects.get(task=self.task).status, 'SUBMITTED')

    def test_distinct_submissions_from_the_same_version_have_one_winner(self):
        payload = self.payload()
        first = {**payload, 'submissionId': str(uuid4())}
        second = {**payload, 'submissionId': str(uuid4()), 'comments': 'Other tab'}
        self.assertCountEqual(self.race('submit', [first, second]), [200, 409])
        self.assertEqual(MarkSubmissionReceipt.objects.filter(task=self.task).count(), 1)
