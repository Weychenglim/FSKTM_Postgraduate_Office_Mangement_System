from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.db import close_old_connections, connection, connections, transaction
from django.utils import timezone
from rest_framework.test import APIClient, APITransactionTestCase

from .models import GeneratedLetter, LetterReferenceCounter, LetterTemplate
from .references import next_reference_number
from .test_letter_requests import REQUESTS, make_student


class ReferenceNumberConcurrencyTests(APITransactionTestCase):
    def parallel(self, functions):
        barrier = Barrier(len(functions))

        def worker(function):
            close_old_connections()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET lock_timeout = '10s'")
                    cursor.execute("SET statement_timeout = '20s'")
                barrier.wait(timeout=10)
                return function()
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=len(functions)) as pool:
            futures = [pool.submit(worker, function) for function in functions]
            return [future.result(timeout=30) for future in futures]

    def test_parallel_requests_never_share_a_number_even_for_a_new_prefix(self):
        def take():
            with transaction.atomic():
                return next_reference_number("UMF/PG/RACE", 2026)

        numbers = self.parallel([take] * 4)

        self.assertCountEqual(numbers, [f"UMF/PG/RACE/2026/{n:04d}" for n in range(1, 5)])
        self.assertEqual(
            LetterReferenceCounter.objects.get(prefix="UMF/PG/RACE", year=2026).last_number, 4
        )

    def test_students_generating_at_the_same_time_get_different_letters(self):
        template = LetterTemplate.objects.create(
            name="Confirmation of Study",
            status=LetterTemplate.Status.ACTIVE,
            reference_prefix="UMF/PG/ENR",
            content="Dear {{STUDENT_NAME}}, ref {{REFERENCE_NUMBER}}",
        )
        students = [make_student(f"RACE00{index}") for index in range(3)]

        def generate(user):
            def call():
                client = APIClient()
                client.force_authenticate(user)
                response = client.post(REQUESTS, {"templateId": template.pk}, format="json")
                return response.status_code, response.data.get("referenceNumber")

            return call

        results = self.parallel([generate(user) for user in students])

        year = timezone.localdate().year
        self.assertEqual([code for code, _ in results], [201, 201, 201])
        self.assertCountEqual(
            [reference for _, reference in results],
            [f"UMF/PG/ENR/{year}/{n:04d}" for n in range(1, 4)],
        )
        self.assertEqual(GeneratedLetter.objects.count(), 3)
