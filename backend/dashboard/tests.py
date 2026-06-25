from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Coordinator, Lecturer, OfficeStaff, Student, Supervisor
from appointments.models import (
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
)
from marks.models import EvaluationPeriod, EvaluationTask, MarkEntry, Rubric


User = get_user_model()


class DashboardSummaryTests(APITestCase):
    def setUp(self):
        self.office = User.objects.create_user(
            email="summary-office@example.com",
            password="password123",
            full_name="Summary Office",
            role=User.Role.OFFICE_ADMIN,
        )
        OfficeStaff.objects.create(
            user=self.office,
            staff_no="DS1001",
            department="Postgraduate Office",
        )
        self.supervisor = User.objects.create_user(
            email="summary-supervisor@example.com",
            password="password123",
            full_name="Summary Supervisor",
            role=User.Role.LECTURER,
        )
        Lecturer.objects.create(
            user=self.supervisor,
            staff_no="DS1002",
            department="Artificial Intelligence",
        )
        Supervisor.objects.create(lecturer=self.supervisor.lecturer, max_supervisees=5)
        self.panel = User.objects.create_user(
            email="summary-panel@example.com",
            password="password123",
            full_name="Summary Panel",
            role=User.Role.LECTURER,
        )
        Lecturer.objects.create(
            user=self.panel,
            staff_no="DS1003",
            department="Artificial Intelligence",
        )
        self.coordinator = User.objects.create_user(
            email="summary-coordinator@example.com",
            password="password123",
            full_name="Summary Coordinator",
            role=User.Role.COORDINATOR,
        )
        Lecturer.objects.create(
            user=self.coordinator,
            staff_no="DS1004",
            department="Artificial Intelligence",
        )
        Coordinator.objects.create(
            lecturer=self.coordinator.lecturer,
            programme_managed="MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
        )
        self.student_user = User.objects.create_user(
            email="summary-student@example.com",
            password="password123",
            full_name="Summary Student",
            role=User.Role.STUDENT,
        )
        Student.objects.create(
            user=self.student_user,
            matric_no="MEA-DASH-001",
            programme="MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
        )
        self.profile = StudentResearchProfile.objects.create(
            student=self.student_user,
            matric_no=self.student_user.student.matric_no,
            student_name=self.student_user.full_name,
            programme=self.student_user.student.programme,
            semester="Sem 1 2025/2026",
            proposed_topic="Dashboard integration",
            supervisor=self.supervisor,
        )
        SupervisorApplication.objects.create(
            student=self.student_user.student,
            proposed_supervisor=self.supervisor,
            research_title="Dashboard integration",
            research_abstract="Summary test",
            status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
        )
        PanelRecommendation.objects.create(
            profile=self.profile,
            supervisor=self.supervisor,
            recommended_member=self.panel,
            status=PanelRecommendation.Status.PENDING_COORDINATOR,
        )
        rubric = Rubric.objects.create(name="Summary Rubric", code="summary-rubric")
        period = EvaluationPeriod.objects.create(
            name="Summary Period",
            semester="Sem 1 2025/2026",
            rubric=rubric,
            is_open=True,
        )
        task = EvaluationTask.objects.create(
            profile=self.profile,
            evaluator=self.panel,
            period=period,
        )
        MarkEntry.objects.create(task=task, status=MarkEntry.Status.DRAFT)

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_office_summary_uses_live_cross_module_counts(self):
        self.authenticate(self.office)

        response = self.client.get("/api/dashboard/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pendingSupervisorRequests"], 1)
        self.assertEqual(response.data["pendingPanelApprovals"], 1)
        self.assertEqual(response.data["incompleteMarkEntries"], 1)

    def test_lecturer_summary_is_scoped_to_own_work(self):
        self.authenticate(self.panel)

        response = self.client.get("/api/dashboard/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pendingSupervisorRequests"], 0)
        self.assertEqual(response.data["pendingPanelReviews"], 0)
        self.assertEqual(response.data["incompleteMarkEntries"], 1)

    def test_coordinator_summary_is_scoped_to_managed_programme(self):
        self.authenticate(self.coordinator)

        response = self.client.get("/api/dashboard/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pendingPanelApprovals"], 1)
        self.assertEqual(response.data["pendingSupervisorApprovals"], 0)
