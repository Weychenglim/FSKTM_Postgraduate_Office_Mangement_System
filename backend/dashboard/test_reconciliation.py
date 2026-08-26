from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import (
    Coordinator,
    Lecturer,
    OfficeStaff,
    Panel,
    Student,
    Supervisor,
)
from academics.models import AcademicSemester
from academics.test_capacity_helpers import publish_test_capacity_plan
from appointments.models import (
    AppointmentLifecycleEvent,
    AppointmentWorkflowEvent,
    PanelAppointment,
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorAppointment,
)
from dashboard.models import WorkflowReconciliationAudit
from marks.models import (
    EvaluationPeriod,
    EvaluationTask,
    EvaluationTaskLifecycleAudit,
    Rubric,
    RubricComponent,
)

User = get_user_model()
PROGRAMME = "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)"


class WorkflowReconciliationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.office = User.objects.create_user(
            email="reconciliation.office@example.test",
            password="password123",
            full_name="Reconciliation Office",
            role=User.Role.OFFICE_ADMIN,
            is_staff=True,
        )
        OfficeStaff.objects.create(
            user=self.office,
            staff_no="REC-OFFICE-001",
            department="Postgraduate Office",
        )
        self.lecturer = User.objects.create_user(
            email="reconciliation.lecturer@example.test",
            password="password123",
            full_name="Reconciliation Lecturer",
            role=User.Role.LECTURER,
        )
        Lecturer.objects.create(
            user=self.lecturer,
            staff_no="REC-LECT-001",
            department="Artificial Intelligence",
        )
        Supervisor.objects.create(
            lecturer=self.lecturer.lecturer,
            max_supervisees=5,
        )
        self.panel_member = User.objects.create_user(
            email="handoff.panel@example.test",
            password="password123",
            full_name="Handoff Panel",
            role=User.Role.LECTURER,
        )
        panel_lecturer = Lecturer.objects.create(
            user=self.panel_member,
            staff_no="REC-PANEL-HANDOFF",
            department="Artificial Intelligence",
        )
        Panel.objects.create(lecturer=panel_lecturer, max_appointments=5)
        self.student_user = User.objects.create_user(
            email="reconciliation.student@example.test",
            password="password123",
            full_name="Reconciliation Student",
            role=User.Role.STUDENT,
        )
        self.student = Student.objects.create(
            user=self.student_user,
            matric_no="REC-STUDENT-001",
            programme=PROGRAMME,
        )
        today = timezone.localdate()
        self.semester = AcademicSemester.objects.create(
            code=f"{today.year}-{today.year + 1}-S1",
            academic_session=f"{today.year}/{today.year + 1}",
            term=AcademicSemester.Term.SEMESTER_I,
            starts_on=today - timezone.timedelta(days=30),
            ends_on=today + timezone.timedelta(days=120),
            lifecycle_status=AcademicSemester.Lifecycle.ACTIVE,
            created_by=self.office,
            activated_at=timezone.now(),
        )
        publish_test_capacity_plan(self.semester, self.office)

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def issue(self, issue_type, *, record_type=None, record_id=None):
        response = self.client.get("/api/dashboard/reconciliation/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return next(
            item
            for item in response.data["results"]
            if item["issueType"] == issue_type
            and (record_type is None or item["recordType"] == record_type)
            and (record_id is None or item["recordId"] == str(record_id))
        )

    def apply_issue(
        self, issue, resolution, reason="Verified against faculty records."
    ):
        return self.client.post(
            f"/api/dashboard/reconciliation/issues/{issue['issueId']}/apply/",
            {
                "expectedFingerprint": issue["fingerprint"],
                "reason": reason,
                "resolution": resolution,
            },
            format="json",
        )

    def test_office_list_derives_repairable_and_review_required_issues(self):
        coordinator_user = User.objects.create_user(
            email="reconciliation.coordinator@example.test",
            password="password123",
            full_name="Reconciliation Coordinator",
            role=User.Role.COORDINATOR,
        )
        Lecturer.objects.create(
            user=coordinator_user,
            staff_no="REC-COORD-001",
            department="Artificial Intelligence",
        )
        Coordinator.objects.create(
            lecturer=coordinator_user.lecturer,
            programme_managed="",
        )
        application = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.lecturer,
            research_title="Reconciliation workflow",
            research_area="Workflow integrity",
            research_abstract="Persisted application with a missing semester.",
            status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
            academic_semester=None,
        )
        profile = StudentResearchProfile.objects.create(
            student=None,
            matric_no=self.student.matric_no,
            student_name=self.student_user.full_name,
            programme=PROGRAMME,
            semester=self.semester.label,
            proposed_topic="Reconciliation workflow",
            supervisor=self.lecturer,
        )
        recommendation = PanelRecommendation.objects.create(
            profile=profile,
            academic_semester=self.semester,
            supervisor=self.lecturer,
            recommended_member=coordinator_user,
            status=PanelRecommendation.Status.APPROVED,
            coordinator_decided_at=timezone.now(),
        )
        AppointmentWorkflowEvent.objects.create(
            panel_recommendation=recommendation,
            actor=coordinator_user,
            actor_role=User.Role.COORDINATOR,
            action="COORDINATOR_APPROVE",
            previous_status=PanelRecommendation.Status.PENDING_COORDINATOR,
            new_status=PanelRecommendation.Status.APPROVED,
        )

        self.authenticate(self.office)
        response = self.client.get("/api/dashboard/reconciliation/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["summary"]["total"], 4)
        issue_types = {item["issueType"] for item in response.data["results"]}
        self.assertIn("COORDINATOR_PROGRAMME_MISSING", issue_types)
        self.assertIn("SEMESTER_UNASSIGNED", issue_types)
        self.assertIn("RESEARCH_PROFILE_UNLINKED", issue_types)
        self.assertIn("PANEL_HANDOFF_INCOMPLETE", issue_types)
        semester_issue = next(
            item
            for item in response.data["results"]
            if item["issueType"] == "SEMESTER_UNASSIGNED"
            and item["recordId"] == str(application.pk)
        )
        self.assertEqual(semester_issue["repairability"], "REPAIRABLE")
        self.assertEqual(semester_issue["suggestion"]["semesterId"], self.semester.pk)
        self.assertTrue(semester_issue["fingerprint"])

    def test_reconciliation_list_is_office_only(self):
        self.authenticate(self.student_user)

        response = self.client.get("/api/dashboard/reconciliation/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.get(
                "/api/dashboard/reconciliation/issues/unknown/preview/"
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(
                "/api/dashboard/reconciliation/issues/unknown/apply/",
                {},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.get("/api/dashboard/reconciliation/audits/").status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_semester_repair_previews_applies_audits_and_rejects_stale_state(self):
        application = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.lecturer,
            research_title="Legacy semester repair",
            research_area="Workflow integrity",
            research_abstract="Application requiring a semester link.",
            status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
            academic_semester=None,
        )
        self.authenticate(self.office)
        listing = self.client.get("/api/dashboard/reconciliation/")
        issue = next(
            item
            for item in listing.data["results"]
            if item["issueType"] == "SEMESTER_UNASSIGNED"
            and item["recordType"] == "SUPERVISOR_APPLICATION"
            and item["recordId"] == str(application.pk)
        )

        preview = self.client.get(
            f"/api/dashboard/reconciliation/issues/{issue['issueId']}/preview/"
        )

        self.assertEqual(preview.status_code, status.HTTP_200_OK)
        self.assertEqual(preview.data["issue"]["fingerprint"], issue["fingerprint"])
        self.assertEqual(
            preview.data["allowedResolutions"][0]["action"], "ASSIGN_SEMESTER"
        )

        stale = self.client.post(
            f"/api/dashboard/reconciliation/issues/{issue['issueId']}/apply/",
            {
                "expectedFingerprint": "0" * 64,
                "reason": "Attach the verified active semester.",
                "resolution": {
                    "action": "ASSIGN_SEMESTER",
                    "semesterId": self.semester.pk,
                },
            },
            format="json",
        )
        self.assertEqual(stale.status_code, status.HTTP_409_CONFLICT)
        application.refresh_from_db()
        self.assertIsNone(application.academic_semester_id)

        applied = self.client.post(
            f"/api/dashboard/reconciliation/issues/{issue['issueId']}/apply/",
            {
                "expectedFingerprint": issue["fingerprint"],
                "reason": "Attach the verified active semester.",
                "resolution": {
                    "action": "ASSIGN_SEMESTER",
                    "semesterId": self.semester.pk,
                },
            },
            format="json",
        )

        self.assertEqual(applied.status_code, status.HTTP_200_OK)
        self.assertTrue(applied.data["resolved"])
        application.refresh_from_db()
        self.assertEqual(application.academic_semester_id, self.semester.pk)
        audit = WorkflowReconciliationAudit.objects.get(
            entity_type="SUPERVISOR_APPLICATION",
            entity_id=str(application.pk),
        )
        self.assertEqual(audit.action, "ASSIGN_SEMESTER")
        self.assertEqual(audit.before_values["academicSemesterId"], None)
        self.assertEqual(audit.after_values["academicSemesterId"], self.semester.pk)
        audit_response = self.client.get("/api/dashboard/reconciliation/audits/")
        self.assertEqual(audit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(audit_response.data["results"][0]["id"], audit.pk)
        audit.reason = "Attempted rewrite"
        with self.assertRaises(ValidationError):
            audit.save()
        with self.assertRaises(ValidationError):
            audit.delete()
        refreshed = self.client.get("/api/dashboard/reconciliation/")
        self.assertNotIn(
            issue["issueId"],
            {item["issueId"] for item in refreshed.data["results"]},
        )

    def test_reconciliation_filters_paginates_and_rejects_invalid_page_values(self):
        for index in range(3):
            SupervisorApplication.objects.create(
                student=self.student,
                proposed_supervisor=self.lecturer,
                research_title=f"Legacy record {index}",
                research_area="Workflow integrity",
                research_abstract="Unassigned historical semester.",
                status=SupervisorApplication.Status.REJECTED_BY_SUPERVISOR,
                academic_semester=None,
            )
        self.authenticate(self.office)
        response = self.client.get(
            "/api/dashboard/reconciliation/",
            {
                "module": "SUPERVISOR_APPOINTMENTS",
                "severity": "WARNING",
                "repairability": "REPAIRABLE",
                "search": "Legacy / Unassigned",
                "page": 2,
                "pageSize": 1,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["page"], 2)
        self.assertEqual(response.data["pageSize"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertTrue(
            all(
                item["module"] == "SUPERVISOR_APPOINTMENTS"
                for item in response.data["results"]
            )
        )
        invalid = self.client.get("/api/dashboard/reconciliation/", {"page": "invalid"})
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_coordinator_profile_and_programme_repairs_require_valid_role(self):
        coordinator_user = User.objects.create_user(
            email="repair.coordinator@example.test",
            password="password123",
            full_name="Repair Coordinator",
            role=User.Role.COORDINATOR,
        )
        lecturer = Lecturer.objects.create(
            user=coordinator_user,
            staff_no="REC-COORD-REPAIR",
            department="Artificial Intelligence",
        )
        self.authenticate(self.office)
        missing = self.issue(
            "COORDINATOR_PROFILE_MISSING", record_id=coordinator_user.pk
        )

        created = self.apply_issue(
            missing,
            {"action": "CREATE_COORDINATOR_PROFILE", "programme": PROGRAMME},
        )

        self.assertEqual(created.status_code, status.HTTP_200_OK)
        lecturer.refresh_from_db()
        self.assertEqual(lecturer.coordinator.programme_managed, PROGRAMME)

        lecturer.coordinator.programme_managed = ""
        lecturer.coordinator.save(update_fields=["programme_managed"])
        blank = self.issue("COORDINATOR_PROGRAMME_MISSING", record_id=lecturer.pk)
        assigned = self.apply_issue(
            blank,
            {"action": "ASSIGN_COORDINATOR_PROGRAMME", "programme": PROGRAMME},
        )
        self.assertEqual(assigned.status_code, status.HTTP_200_OK)
        lecturer.coordinator.refresh_from_db()
        self.assertEqual(lecturer.coordinator.programme_managed, PROGRAMME)

    def test_unlinked_profile_repair_preserves_primary_key_and_blocks_used_history(
        self,
    ):
        profile = StudentResearchProfile.objects.create(
            student=None,
            matric_no=self.student.matric_no,
            student_name=self.student_user.full_name,
            programme=PROGRAMME,
            semester=self.semester.label,
            proposed_topic="Exact identity repair",
            supervisor=self.lecturer,
        )
        self.authenticate(self.office)
        issue = self.issue("RESEARCH_PROFILE_UNLINKED", record_id=profile.pk)

        applied = self.apply_issue(issue, {"action": "LINK_RESEARCH_PROFILE"})

        self.assertEqual(applied.status_code, status.HTTP_200_OK)
        profile.refresh_from_db()
        self.assertEqual(profile.student_id, self.student_user.pk)
        self.assertEqual(profile.pk, int(issue["recordId"]))

        second_student_user = User.objects.create_user(
            email="used.profile.student@example.test",
            password="password123",
            full_name="Used Profile Student",
            role=User.Role.STUDENT,
        )
        second_student = Student.objects.create(
            user=second_student_user,
            matric_no="REC-STUDENT-USED",
            programme=PROGRAMME,
        )
        used_profile = StudentResearchProfile.objects.create(
            student=None,
            matric_no=second_student.matric_no,
            student_name=second_student_user.full_name,
            programme=PROGRAMME,
            semester=self.semester.label,
            proposed_topic="Used identity",
            supervisor=self.lecturer,
        )
        PanelRecommendation.objects.create(
            profile=used_profile,
            academic_semester=self.semester,
            supervisor=self.lecturer,
            recommended_member=self.office,
            status=PanelRecommendation.Status.REJECTED_BY_PANEL,
        )
        blocked = self.issue("RESEARCH_PROFILE_UNLINKED", record_id=used_profile.pk)
        self.assertEqual(blocked["repairability"], "REVIEW_REQUIRED")
        preview = self.client.get(
            f"/api/dashboard/reconciliation/issues/{blocked['issueId']}/preview/"
        )
        self.assertEqual(preview.data["allowedResolutions"], [])

    def test_profile_supervisor_sync_uses_the_sole_active_appointment(self):
        other_supervisor = User.objects.create_user(
            email="other.supervisor@example.test",
            password="password123",
            full_name="Other Supervisor",
            role=User.Role.LECTURER,
        )
        Lecturer.objects.create(
            user=other_supervisor,
            staff_no="REC-LECT-OTHER",
            department="Artificial Intelligence",
        )
        application = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.lecturer,
            research_title="Authoritative appointment",
            research_area="Data integrity",
            research_abstract="Approved source.",
            status=SupervisorApplication.Status.APPROVED,
            academic_semester=self.semester,
            coordinator_decided_at=timezone.now(),
        )
        appointment = SupervisorAppointment.objects.create(
            application=application,
            student=self.student,
            supervisor=self.lecturer,
            approved_by=self.office,
        )
        profile = StudentResearchProfile.objects.create(
            student=self.student_user,
            matric_no=self.student.matric_no,
            student_name=self.student_user.full_name,
            programme=PROGRAMME,
            semester=self.semester.label,
            proposed_topic="Authoritative appointment",
            supervisor=other_supervisor,
        )
        self.authenticate(self.office)
        issue = self.issue("RESEARCH_PROFILE_SUPERVISOR_MISMATCH", record_id=profile.pk)

        applied = self.apply_issue(issue, {"action": "SYNC_PROFILE_SUPERVISOR"})

        self.assertEqual(applied.status_code, status.HTTP_200_OK)
        profile.refresh_from_db()
        self.assertEqual(profile.supervisor_id, appointment.supervisor_id)

    def test_missing_approved_handoffs_preserve_original_approval_attribution(self):
        coordinator_user = User.objects.create_user(
            email="handoff.coordinator@example.test",
            password="password123",
            full_name="Handoff Coordinator",
            role=User.Role.COORDINATOR,
        )
        coordinator_lecturer = Lecturer.objects.create(
            user=coordinator_user,
            staff_no="REC-COORD-HANDOFF",
            department="Artificial Intelligence",
        )
        Coordinator.objects.create(
            lecturer=coordinator_lecturer,
            programme_managed=PROGRAMME,
        )
        decided_at = timezone.now() - timezone.timedelta(days=2)
        application = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.lecturer,
            research_title="Recovered handoff",
            research_area="Data integrity",
            research_abstract="Approved but missing appointment.",
            status=SupervisorApplication.Status.APPROVED,
            academic_semester=self.semester,
            coordinator_decided_at=decided_at,
        )
        AppointmentWorkflowEvent.objects.create(
            supervisor_application=application,
            actor=coordinator_user,
            actor_role=User.Role.COORDINATOR,
            action="COORDINATOR_APPROVE",
            previous_status=SupervisorApplication.Status.PENDING_COORDINATOR,
            new_status=SupervisorApplication.Status.APPROVED,
            created_at=decided_at,
        )
        self.authenticate(self.office)
        supervisor_issue = self.issue(
            "SUPERVISOR_HANDOFF_INCOMPLETE", record_id=application.pk
        )

        supervisor_result = self.apply_issue(
            supervisor_issue, {"action": "COMPLETE_SUPERVISOR_HANDOFF"}
        )

        self.assertEqual(supervisor_result.status_code, status.HTTP_200_OK)
        supervisor_appointment = SupervisorAppointment.objects.get(
            application=application
        )
        self.assertEqual(supervisor_appointment.approved_by_id, coordinator_user.pk)
        self.assertEqual(supervisor_appointment.appointment_date, decided_at.date())
        profile = StudentResearchProfile.objects.get(student=self.student_user)
        self.assertEqual(profile.supervisor_id, self.lecturer.pk)

        recommendation = PanelRecommendation.objects.create(
            profile=profile,
            academic_semester=self.semester,
            supervisor=self.lecturer,
            recommended_member=self.panel_member,
            status=PanelRecommendation.Status.APPROVED,
            coordinator_decided_at=decided_at,
        )
        AppointmentWorkflowEvent.objects.create(
            panel_recommendation=recommendation,
            actor=coordinator_user,
            actor_role=User.Role.COORDINATOR,
            action="COORDINATOR_APPROVE",
            previous_status=PanelRecommendation.Status.PENDING_COORDINATOR,
            new_status=PanelRecommendation.Status.APPROVED,
            created_at=decided_at,
        )
        panel_issue = self.issue(
            "PANEL_HANDOFF_INCOMPLETE", record_id=recommendation.pk
        )

        panel_result = self.apply_issue(
            panel_issue, {"action": "COMPLETE_PANEL_HANDOFF"}
        )

        self.assertEqual(panel_result.status_code, status.HTTP_200_OK)
        panel_appointment = PanelAppointment.objects.get(recommendation=recommendation)
        self.assertEqual(panel_appointment.approved_by_id, coordinator_user.pk)
        self.assertEqual(panel_appointment.appointment_date, decided_at.date())
        self.assertTrue(
            AppointmentLifecycleEvent.objects.filter(
                panel_appointment=panel_appointment,
                actor=self.office,
                action=AppointmentLifecycleEvent.Action.ACTIVATED,
            ).exists()
        )

    def test_marks_generation_retirement_and_resume_use_audited_task_lifecycle(self):
        application = SupervisorApplication.objects.create(
            student=self.student,
            proposed_supervisor=self.lecturer,
            research_title="Marks reconciliation",
            research_area="Data quality",
            research_abstract="Active approved appointment.",
            status=SupervisorApplication.Status.APPROVED,
            academic_semester=self.semester,
            coordinator_decided_at=timezone.now(),
        )
        appointment = SupervisorAppointment.objects.create(
            application=application,
            student=self.student,
            supervisor=self.lecturer,
            approved_by=self.office,
        )
        profile = StudentResearchProfile.objects.create(
            student=self.student_user,
            matric_no=self.student.matric_no,
            student_name=self.student_user.full_name,
            programme=PROGRAMME,
            semester=self.semester.label,
            proposed_topic="Marks reconciliation",
            supervisor=self.lecturer,
        )
        rubric = Rubric.objects.create(
            name="Reconciliation Rubric",
            code="rec-rubric-v1",
            family_code="rec-rubric",
            target_mark="100.00",
        )
        RubricComponent.objects.create(
            rubric=rubric,
            code="total",
            name="Total",
            max_marks="100.00",
            display_order=1,
        )
        period = EvaluationPeriod.objects.create(
            name="Reconciliation Period",
            semester=self.semester.label,
            academic_semester=self.semester,
            rubric=rubric,
            opens_at=timezone.now() - timezone.timedelta(days=1),
            closes_at=timezone.now() + timezone.timedelta(days=5),
            lifecycle_status=EvaluationPeriod.Lifecycle.PUBLISHED,
        )
        self.authenticate(self.office)
        missing = self.issue("MARKS_TASKS_MISSING", record_id=period.pk)

        generated = self.apply_issue(
            missing, {"action": "GENERATE_MISSING_MARKS_TASKS"}
        )

        self.assertEqual(generated.status_code, status.HTTP_200_OK)
        task = EvaluationTask.objects.get(
            period=period,
            profile=profile,
            evaluator=self.lecturer,
            evaluator_role=EvaluationTask.EvaluatorRole.SUPERVISOR,
        )

        appointment.status = SupervisorAppointment.Status.ENDED
        appointment.end_outcome = SupervisorAppointment.EndOutcome.OTHER
        appointment.end_reason = "Legacy inconsistent closure."
        appointment.ended_at = timezone.now()
        appointment.ended_by = self.office
        appointment.save(
            update_fields=[
                "status",
                "end_outcome",
                "end_reason",
                "ended_at",
                "ended_by",
            ]
        )
        invalid = self.issue("MARKS_TASK_INCONSISTENT", record_id=task.pk)
        retired = self.apply_issue(invalid, {"action": "RETIRE_MARKS_TASK"})
        self.assertEqual(retired.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.lifecycle_status, EvaluationTask.Lifecycle.RETIRED)
        self.assertTrue(
            EvaluationTaskLifecycleAudit.objects.filter(
                task=task,
                action=EvaluationTaskLifecycleAudit.Action.RETIRED,
                actor=self.office,
            ).exists()
        )

        appointment.status = SupervisorAppointment.Status.ACTIVE
        appointment.end_outcome = ""
        appointment.end_reason = ""
        appointment.ended_at = None
        appointment.ended_by = None
        appointment.save(
            update_fields=[
                "status",
                "end_outcome",
                "end_reason",
                "ended_at",
                "ended_by",
            ]
        )
        paused = EvaluationTask.objects.create(
            period=period,
            profile=profile,
            evaluator=self.lecturer,
            evaluator_role=EvaluationTask.EvaluatorRole.SUPERVISOR,
            lifecycle_status=EvaluationTask.Lifecycle.PAUSED,
            paused_at=timezone.now(),
            paused_by=self.office,
            pause_reason="Legacy pause requiring reconciliation.",
        )
        resume_issue = self.issue("MARKS_TASK_INCONSISTENT", record_id=paused.pk)
        self.assertEqual(resume_issue["suggestion"]["action"], "RESUME_MARKS_TASK")
        resumed = self.apply_issue(resume_issue, {"action": "RESUME_MARKS_TASK"})
        self.assertEqual(resumed.status_code, status.HTTP_200_OK)
        paused.refresh_from_db()
        self.assertEqual(paused.lifecycle_status, EvaluationTask.Lifecycle.ACTIVE)
