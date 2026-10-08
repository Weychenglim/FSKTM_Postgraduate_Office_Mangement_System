from django.utils import timezone
from rest_framework.test import APITestCase

from appointments import test_role_integrity as fixture
from appointments.models import (
    AppointmentLifecycleEvent, AppointmentWorkflowEvent, PanelAppointment,
    SupervisorAppointment,
)
from .models import WorkflowReconciliationAudit


class RoleIntegrityReconciliationTests(APITestCase):
    setUp = fixture.AppointmentRoleIntegrityTests.setUp
    _lecturer = fixture.AppointmentRoleIntegrityTests._lecturer
    primary_request = fixture.AppointmentRoleIntegrityTests.primary_request
    panel_role = fixture.AppointmentRoleIntegrityTests.panel_role

    def approval_event(self, row, *, panel=False):
        row.coordinator_decided_at = timezone.now()
        row.save(update_fields=["coordinator_decided_at"])
        AppointmentWorkflowEvent.objects.create(
            actor=self.coordinator, actor_role=self.coordinator.role,
            action="COORDINATOR_APPROVE", previous_status="PENDING_COORDINATOR",
            new_status="APPROVED",
            **{"panel_recommendation" if panel else "supervisor_application": row},
        )

    def repair(self, row, issue_type, action):
        self.office.is_staff = True
        self.office.save(update_fields=["is_staff"])
        self.client.force_authenticate(self.office)
        listing = self.client.get("/api/dashboard/reconciliation/")
        self.assertEqual(listing.status_code, 200, listing.data)
        issue = next(item for item in listing.data["results"]
                     if item["issueType"] == issue_type and item["recordId"] == str(row.pk))
        self.assertEqual(issue["repairability"], "REPAIRABLE")
        return self.client.post(
            f"/api/dashboard/reconciliation/issues/{issue['issueId']}/apply/",
            {"expectedFingerprint": issue["fingerprint"], "reason": "Verify legacy handoff.",
             "resolution": {"action": action}}, format="json",
        )

    def test_office_primary_handoff_repair_rejects_active_panel_and_rolls_back_profile(self):
        self.supervisor_appointment.status = "ENDED"
        self.supervisor_appointment.save(update_fields=["status"])
        application = self.primary_request("APPROVED")
        self.approval_event(application)
        self.panel_role("APPROVED")
        response = self.repair(application, "SUPERVISOR_HANDOFF_INCOMPLETE", "COMPLETE_SUPERVISOR_HANDOFF")
        self.assertEqual(response.status_code, 409, response.data)
        self.assertIn("Panel", str(response.data))
        self.assertFalse(SupervisorAppointment.objects.filter(application=application).exists())
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.supervisor, self.supervisor)
        self.assertEqual(PanelAppointment.objects.filter(status="ACTIVE").count(), 1)
        self.assertFalse(AppointmentLifecycleEvent.objects.exists())
        self.assertFalse(WorkflowReconciliationAudit.objects.exists())
        self.assertEqual(AppointmentWorkflowEvent.objects.count(), 1)

    def test_office_panel_handoff_repair_rejects_pending_primary(self):
        self.primary_request()
        recommendation = self.panel_role("APPROVED")
        PanelAppointment.objects.get(recommendation=recommendation).delete()
        self.approval_event(recommendation, panel=True)
        response = self.repair(recommendation, "PANEL_HANDOFF_INCOMPLETE", "COMPLETE_PANEL_HANDOFF")
        self.assertEqual(response.status_code, 409, response.data)
        self.assertIn("primary", str(response.data))
        self.assertFalse(PanelAppointment.objects.exists())
        self.assertFalse(AppointmentLifecycleEvent.objects.exists())
        self.assertFalse(WorkflowReconciliationAudit.objects.exists())
        self.assertEqual(AppointmentWorkflowEvent.objects.count(), 1)
