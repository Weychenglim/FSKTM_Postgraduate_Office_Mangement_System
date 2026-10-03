from decimal import Decimal

from rest_framework.test import APITestCase

from . import tests as fixture
from .models import EvaluationPeriod, EvaluationTask, MarkEntry
from .serializers import EvaluationTaskSerializer, MarkDraftSerializer


class MarksReviewRegressionTests(APITestCase):
    setUp = fixture.MarkEntryWorkflowTests.setUp
    score_payload = fixture.MarkEntryWorkflowTests.score_payload

    def test_negative_new_score_returns_validation_error_without_draft(self):
        self.client.force_authenticate(self.lecturer)
        response = self.client.put(f"/api/marks/tasks/{self.task.pk}/draft/",
            self.score_payload(problem="-1.00"), format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("marksAwarded", str(response.data))
        self.assertFalse(MarkEntry.objects.filter(task=self.task).exists())
        submitted = self.client.post(f"/api/marks/tasks/{self.task.pk}/submit/")
        self.assertEqual(submitted.status_code, 400)
        self.assertFalse(MarkEntry.objects.filter(task=self.task).exists())

    def test_negative_existing_score_preserves_draft_and_submission_values(self):
        self.client.force_authenticate(self.lecturer)
        saved = self.client.put(f"/api/marks/tasks/{self.task.pk}/draft/",
            self.score_payload(), format="json")
        self.assertEqual(saved.status_code, 200)
        entry = MarkEntry.objects.get(task=self.task)
        before = list(entry.scores.values("pk", "marks_awarded", "feedback"))
        updated_at = entry.updated_at
        response = self.client.put(f"/api/marks/tasks/{self.task.pk}/draft/",
            {**self.score_payload(method="-0.01"), "comments": "Invalid edit"}, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("marksAwarded", str(response.data))
        entry.refresh_from_db()
        self.assertEqual(list(entry.scores.values("pk", "marks_awarded", "feedback")), before)
        self.assertEqual(entry.updated_at, updated_at)
        self.assertEqual(entry.comments, "Overall comments")
        self.assertEqual(entry.status, "DRAFT")
        submitted = self.client.post(f"/api/marks/tasks/{self.task.pk}/submit/")
        self.assertEqual(submitted.status_code, 200, submitted.data)
        self.assertEqual(Decimal(submitted.data["totalMark"]), Decimal("80.00"))

    def test_negative_decimal_is_rejected_during_serializer_validation(self):
        serializer = MarkDraftSerializer(data=self.score_payload(problem="-0.01"),
                                         context={"task": self.task})
        self.assertFalse(serializer.is_valid())
        self.assertIn("marksAwarded", str(serializer.errors))

    def test_zero_score_can_be_saved_and_submitted(self):
        self.client.force_authenticate(self.lecturer)
        saved = self.client.put(f"/api/marks/tasks/{self.task.pk}/draft/",
            self.score_payload(problem="0.00", method="0.00"), format="json")
        self.assertEqual(saved.status_code, 200, saved.data)
        submitted = self.client.post(f"/api/marks/tasks/{self.task.pk}/submit/")
        self.assertEqual(submitted.status_code, 200, submitted.data)
        self.assertEqual(submitted.data["totalMark"], "0.00")

    def test_task_list_uses_each_period_semester_after_profile_handover(self):
        self.profile.semester = "Retained profile semester"
        self.profile.supervisor = self.lecturer
        self.profile.save(update_fields=["semester", "supervisor"])
        historical = EvaluationPeriod.objects.create(
            name="Historic evaluation", semester="Semester II 2024/2025",
            rubric=self.rubric, lifecycle_status="CLOSED", is_open=False,
        )
        old_task = EvaluationTask.objects.create(
            profile=self.profile, evaluator=self.lecturer, period=historical,
        )
        self.client.force_authenticate(self.lecturer)
        response = self.client.get("/api/marks/my-evaluation-tasks/")
        self.assertEqual(response.status_code, 200, response.data)
        by_id = {row["id"]: row for row in response.data}
        self.assertEqual(by_id[self.task.pk]["semester"], self.period.semester)
        self.assertEqual(by_id[old_task.pk]["semester"], historical.semester)
        self.assertFalse(by_id[old_task.pk]["canEdit"])
        old_task.lifecycle_status = EvaluationTask.Lifecycle.RETIRED
        old_task.save(update_fields=["lifecycle_status"])
        self.assertEqual(EvaluationTaskSerializer(old_task).data["semester"], historical.semester)
