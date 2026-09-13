from datetime import timedelta
from io import BytesIO

from django.utils import timezone
from openpyxl import load_workbook
from rest_framework.test import APITestCase

from appointments import test_appointment_lifecycle as fixture
from appointments.models import CoSupervisorAppointment, CoSupervisorNomination
from dashboard.actions import build_dashboard_tasks
from dashboard.dossiers import build_student_progress_dossier
from dashboard.reconciliation import detect_reconciliation_issues
from dashboard.reports import build_workflow_report, build_workflow_report_workbook


class CoSupervisionTrackingTests(APITestCase):
    setUp = fixture.AppointmentLifecycleTests.setUp
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    _panel_appointment = fixture.AppointmentLifecycleTests._panel_appointment

    def nomination(self, **changes):
        values = dict(
            student=self.student,
            primary_appointment=self.supervisor_appointment,
            nominator=self.supervisor,
            candidate=self.new_supervisor,
            academic_semester=self.semester,
            justification="Supporting research expertise",
            submitted_at=timezone.now() - timedelta(days=5),
        )
        values.update(changes)
        return CoSupervisorNomination.objects.create(**values)

    def test_dashboard_actions_include_scoped_waiting_co_supervision(self):
        row = self.nomination()
        actions = build_dashboard_tasks(self.new_supervisor)
        action = next(
            item for item in actions if item["recordType"] == "CO_SUPERVISOR_NOMINATION"
        )
        self.assertEqual(action["recordId"], str(row.pk))
        self.assertEqual(action["waitingOn"], "CO_SUPERVISOR")
        self.assertEqual(action["waitingDays"], 5)
        self.assertFalse(
            any(
                item["recordType"] == "CO_SUPERVISOR_NOMINATION"
                for item in build_dashboard_tasks(self.new_panel)
            )
        )
        self.assertFalse(
            any(
                item["recordType"] == "CO_SUPERVISOR_NOMINATION"
                for item in build_dashboard_tasks(self.other_coordinator)
            )
        )

    def test_report_filters_and_export_include_supporting_role_and_lifecycle(self):
        row = self.nomination(status="APPROVED")
        CoSupervisorAppointment.objects.create(
            nomination=row,
            student=self.student,
            supervisor=self.new_supervisor,
            approved_by=self.coordinator,
            status="ENDED",
            end_outcome="COMPLETED",
            end_reason="Research complete",
            ended_at=timezone.now(),
            ended_by=self.office,
        )
        report = build_workflow_report(self.office, {"semester": "all"})
        supporting = [
            record
            for record in report["supervisor"]["records"]
            if record["recordType"] == "CO_SUPERVISOR_NOMINATION"
        ]
        self.assertEqual(len(supporting), 1)
        self.assertEqual(supporting[0]["appointmentOutcome"], "COMPLETED")
        self.assertEqual(supporting[0]["appointmentEndReason"], "Research complete")
        self.assertEqual(supporting[0]["supervisionRole"], "CO_SUPERVISOR")
        workbook = load_workbook(BytesIO(build_workflow_report_workbook(report)))
        sheet = workbook["Supervisor"]
        rows = list(sheet.values)
        self.assertIn("Supervision Role", rows[0])
        self.assertTrue(any("CO_SUPERVISOR" in values for values in rows[1:]))
        foreign = build_workflow_report(self.other_coordinator, {"semester": "all"})
        self.assertFalse(
            any(
                record["recordType"] == "CO_SUPERVISOR_NOMINATION"
                for record in foreign["supervisor"]["records"]
            )
        )
        excluded = build_workflow_report(
            self.office,
            {"semester": "all", "startDate": timezone.localdate().isoformat()},
        )
        self.assertFalse(
            any(
                record["recordType"] == "CO_SUPERVISOR_NOMINATION"
                for record in excluded["supervisor"]["records"]
            )
        )

    def test_dossier_includes_team_without_granting_supporting_internal_access(self):
        row = self.nomination(status="APPROVED")
        CoSupervisorAppointment.objects.create(
            nomination=row,
            student=self.student,
            supervisor=self.new_supervisor,
            approved_by=self.coordinator,
        )
        dossier = build_student_progress_dossier(self.office, self.student.matric_no)
        self.assertEqual(
            dossier["supervisoryTeam"]["appointments"][0]["supervisor"]["id"],
            self.new_supervisor.pk,
        )
        self.client.force_authenticate(user=self.new_supervisor)
        self.assertEqual(
            self.client.get(
                f"/api/dashboard/progress/{self.student.matric_no}/"
            ).status_code,
            404,
        )

    def test_reconciliation_reports_missing_approval_handoff_as_review_only(self):
        row = self.nomination(status="APPROVED")
        issues = [
            issue
            for issue in detect_reconciliation_issues()
            if issue.record_type == "CO_SUPERVISOR_NOMINATION"
        ]
        issue = next(issue for issue in issues if issue.record_id == str(row.pk))
        self.assertEqual(issue.repairability, "REVIEW_REQUIRED")
        self.assertEqual(issue.issue_type, "CO_SUPERVISOR_HANDOFF_MISSING")

    def test_reconciliation_detects_corrupt_team_and_panel_overlap(self):
        row = self.nomination(status="APPROVED")
        appointment = CoSupervisorAppointment.objects.create(
            nomination=row,
            student=self.student,
            supervisor=self.panel,
            approved_by=self.coordinator,
        )
        self._panel_appointment()
        issues = [
            issue
            for issue in detect_reconciliation_issues()
            if issue.record_type == "CO_SUPERVISOR_APPOINTMENT"
            and issue.record_id == str(appointment.pk)
        ]
        self.assertTrue(
            any(
                issue.issue_type == "CO_SUPERVISOR_RECORD_INCONSISTENT"
                for issue in issues
            )
        )
        self.assertTrue(
            any(issue.issue_type == "CO_SUPERVISOR_PANEL_OVERLAP" for issue in issues)
        )
        self.assertTrue(
            all(issue.repairability == "REVIEW_REQUIRED" for issue in issues)
        )
