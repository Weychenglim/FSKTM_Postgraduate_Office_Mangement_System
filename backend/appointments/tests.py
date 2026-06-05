from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import PanelAppointment, PanelRecommendation, StudentResearchProfile


User = get_user_model()


class PanelRecommendationWorkflowTests(APITestCase):
    def setUp(self):
        self.supervisor = User.objects.create_user(
            email="supervisor@example.com",
            password="password123",
            full_name="Dr. Supervisor",
            role=User.Role.LECTURER,
            staff_id="L10001",
        )
        self.panel = User.objects.create_user(
            email="panel@example.com",
            password="password123",
            full_name="Dr. Panel",
            role=User.Role.LECTURER,
            staff_id="L10002",
        )
        self.other_panel = User.objects.create_user(
            email="other-panel@example.com",
            password="password123",
            full_name="Dr. Other Panel",
            role=User.Role.LECTURER,
            staff_id="L10003",
        )
        self.coordinator = User.objects.create_user(
            email="coordinator@example.com",
            password="password123",
            full_name="Dr. Coordinator",
            role=User.Role.COORDINATOR,
            staff_id="C10001",
        )
        self.student = User.objects.create_user(
            email="student@example.com",
            password="password123",
            full_name="Nur Student",
            role=User.Role.STUDENT,
            student_id="MEA999001",
        )
        self.profile = StudentResearchProfile.objects.create(
            student=self.student,
            matric_no="MEA999001",
            student_name="Nur Student",
            programme="MSc. Computer Science",
            semester="Sem 1 2025/2026",
            proposed_topic="Secure Workflow Automation",
            research_area="Software Engineering",
            abstract="Research abstract",
            supervisor=self.supervisor,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def create_submitted_recommendation(self):
        self.authenticate(self.supervisor)
        response = self.client.post(
            "/api/appointments/panel/recommendations/",
            {
                "studentId": self.profile.matric_no,
                "recommendedMemberId": self.panel.staff_id,
                "justification": "Strong match for the research topic.",
                "status": PanelRecommendation.Status.SUBMITTED_TO_PANEL,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data

    def create_profile(self, matric_no, supervisor=None):
        student = User.objects.create_user(
            email=f"{matric_no.lower()}@example.com",
            password="password123",
            full_name=f"Student {matric_no}",
            role=User.Role.STUDENT,
            student_id=matric_no,
        )
        return StudentResearchProfile.objects.create(
            student=student,
            matric_no=matric_no,
            student_name=f"Student {matric_no}",
            programme="MSc. Computer Science",
            semester="Sem 1 2025/2026",
            proposed_topic=f"Research Topic {matric_no}",
            research_area="Software Engineering",
            abstract="Research abstract",
            supervisor=supervisor or self.other_panel,
        )

    def reserve_panel_workload(self, panel_member, count):
        for index in range(count):
            profile = self.create_profile(f"MEA888{index:03d}")
            PanelRecommendation.objects.create(
                profile=profile,
                supervisor=profile.supervisor,
                recommended_member=panel_member,
                justification="Existing pending nomination.",
                status=PanelRecommendation.Status.SUBMITTED_TO_PANEL,
            )

    def test_supervisor_can_submit_one_recommendation_and_duplicate_is_blocked(self):
        recommendation = self.create_submitted_recommendation()
        self.assertEqual(recommendation["status"], PanelRecommendation.Status.SUBMITTED_TO_PANEL)
        self.assertEqual(recommendation["studentId"], self.profile.matric_no)
        self.assertEqual(recommendation["recommendedMemberId"], self.panel.staff_id)
        self.assertIsNotNone(recommendation["submittedAt"])
        self.assertIsNone(recommendation["panelDecisionAt"])
        self.assertIsNone(recommendation["coordinatorDecisionAt"])

        duplicate = self.client.post(
            "/api/appointments/panel/recommendations/",
            {
                "studentId": self.profile.matric_no,
                "recommendedMemberId": self.other_panel.staff_id,
                "justification": "Try another active recommendation.",
                "status": PanelRecommendation.Status.SUBMITTED_TO_PANEL,
            },
            format="json",
        )
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_supervisor_cannot_save_panel_recommendation_as_draft(self):
        self.authenticate(self.supervisor)
        response = self.client.post(
            "/api/appointments/panel/recommendations/",
            {
                "studentId": self.profile.matric_no,
                "recommendedMemberId": self.panel.staff_id,
                "justification": "Save this for later.",
                "status": "DRAFT",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(PanelRecommendation.objects.filter(profile=self.profile).exists())

    def test_full_panel_workload_blocks_new_submission(self):
        self.reserve_panel_workload(self.panel, 5)

        self.authenticate(self.supervisor)
        response = self.client.post(
            "/api/appointments/panel/recommendations/",
            {
                "studentId": self.profile.matric_no,
                "recommendedMemberId": self.panel.staff_id,
                "justification": "Strong match for the research topic.",
                "status": PanelRecommendation.Status.SUBMITTED_TO_PANEL,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("workload", str(response.data).lower())

    def test_panel_candidates_include_pending_nomination_workload(self):
        self.reserve_panel_workload(self.panel, 4)

        self.authenticate(self.supervisor)
        response = self.client.get("/api/appointments/panel/candidates/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        candidate = next(item for item in response.data if item["staffId"] == self.panel.staff_id)
        self.assertEqual(candidate["workloadCount"], 4)
        self.assertEqual(candidate["workloadLimit"], 5)
        self.assertTrue(candidate["canSubmit"])
        self.assertIn("submitted nominations", candidate["workloadHelpText"])

    def test_selected_panel_accepts_then_coordinator_approves_final_assignment(self):
        recommendation = self.create_submitted_recommendation()

        self.authenticate(self.panel)
        accept = self.client.post(
            f"/api/appointments/panel/recommendations/{recommendation['id']}/panel-accept/",
            format="json",
        )
        self.assertEqual(accept.status_code, status.HTTP_200_OK)
        self.assertEqual(accept.data["status"], PanelRecommendation.Status.PENDING_COORDINATOR)
        self.assertIsNotNone(accept.data["panelDecisionAt"])

        self.authenticate(self.coordinator)
        approve = self.client.post(
            f"/api/appointments/panel/recommendations/{recommendation['id']}/coordinator-approve/",
            format="json",
        )
        self.assertEqual(approve.status_code, status.HTTP_200_OK)
        self.assertEqual(approve.data["status"], PanelRecommendation.Status.APPROVED)
        self.assertIsNotNone(approve.data["coordinatorDecisionAt"])

        self.authenticate(self.panel)
        assignments = self.client.get("/api/appointments/panel/assignments/")
        self.assertEqual(assignments.status_code, status.HTTP_200_OK)
        self.assertEqual(assignments.data[0]["studentId"], self.profile.matric_no)
        self.assertEqual(assignments.data[0]["status"], "ACTIVE")
        self.assertTrue(PanelAppointment.objects.filter(recommendation_id=recommendation["id"]).exists())

    def test_wrong_users_cannot_make_panel_or_coordinator_decisions(self):
        recommendation = self.create_submitted_recommendation()

        self.authenticate(self.supervisor)
        supervisor_accept = self.client.post(
            f"/api/appointments/panel/recommendations/{recommendation['id']}/panel-accept/",
            format="json",
        )
        self.assertEqual(supervisor_accept.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.other_panel)
        wrong_panel_accept = self.client.post(
            f"/api/appointments/panel/recommendations/{recommendation['id']}/panel-accept/",
            format="json",
        )
        self.assertEqual(wrong_panel_accept.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.panel)
        self.client.post(
            f"/api/appointments/panel/recommendations/{recommendation['id']}/panel-accept/",
            format="json",
        )

        self.authenticate(self.panel)
        panel_coordinator_approve = self.client.post(
            f"/api/appointments/panel/recommendations/{recommendation['id']}/coordinator-approve/",
            format="json",
        )
        self.assertEqual(panel_coordinator_approve.status_code, status.HTTP_403_FORBIDDEN)

    def test_panel_reject_requires_reason_and_allows_new_recommendation(self):
        recommendation = self.create_submitted_recommendation()

        self.authenticate(self.panel)
        missing_reason = self.client.post(
            f"/api/appointments/panel/recommendations/{recommendation['id']}/panel-reject/",
            {"reason": ""},
            format="json",
        )
        self.assertEqual(missing_reason.status_code, status.HTTP_400_BAD_REQUEST)

        rejected = self.client.post(
            f"/api/appointments/panel/recommendations/{recommendation['id']}/panel-reject/",
            {"reason": "Workload conflict."},
            format="json",
        )
        self.assertEqual(rejected.status_code, status.HTTP_200_OK)
        self.assertEqual(rejected.data["status"], PanelRecommendation.Status.REJECTED_BY_PANEL)
        self.assertEqual(rejected.data["rejectionReason"], "Workload conflict.")

        self.authenticate(self.supervisor)
        replacement = self.client.post(
            "/api/appointments/panel/recommendations/",
            {
                "studentId": self.profile.matric_no,
                "recommendedMemberId": self.other_panel.staff_id,
                "justification": "Replacement recommendation.",
                "status": PanelRecommendation.Status.SUBMITTED_TO_PANEL,
            },
            format="json",
        )
        self.assertEqual(replacement.status_code, status.HTTP_201_CREATED)
