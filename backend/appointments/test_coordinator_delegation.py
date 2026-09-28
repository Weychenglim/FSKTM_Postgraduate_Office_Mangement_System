from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from . import test_co_supervision as fixture
from .models import PanelRecommendation, SupervisorApplication


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class DelegatedAppointmentTests(APITestCase):
    setUp = fixture.CoSupervisionTests.setUp
    _lecturer = fixture.CoSupervisionTests._lecturer
    _panel_appointment = fixture.CoSupervisionTests._panel_appointment
    nominate = fixture.CoSupervisionTests.nominate
    decide = fixture.CoSupervisionTests.decide
    activate = fixture.CoSupervisionTests.activate

    def grant(self):
        self.office.is_staff = True
        self.office.save(update_fields=["is_staff"])
        self.client.force_authenticate(self.office)
        response = self.client.post("/api/accounts/coordinator-delegations/", {
            "programme": self.student.programme,
            "coordinatorId": self.other_coordinator.pk,
            "startsOn": timezone.localdate().isoformat(),
            "endsOn": (timezone.localdate() + timezone.timedelta(days=2)).isoformat(),
            "justification": "Cover annual leave",
        }, format="json")
        self.assertEqual(response.status_code, 201, getattr(response, "data", None))
        return response.data["id"]

    def revoke(self, pk):
        self.client.force_authenticate(self.office)
        response = self.client.post(f"/api/accounts/coordinator-delegations/{pk}/revoke/",
                                    {"reason": "Coordinator returned"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)

    def test_supervisor_history_and_team_access_are_revoked(self):
        pk = self.grant()
        self.client.force_authenticate(self.other_coordinator)
        records = self.client.get("/api/appointments/supervisor/coordinator-records/")
        self.assertEqual(records.status_code, 200)
        self.assertEqual(len(records.data), 1)
        url = f"/api/appointments/co-supervisor/students/{self.student.pk}/"
        self.assertEqual(self.client.get(url).status_code, 200)
        self.revoke(pk)
        self.client.force_authenticate(self.other_coordinator)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.client.get("/api/appointments/supervisor/coordinator-records/").data, [])
        self.client.force_authenticate(self.coordinator)
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_primary_approval_is_scoped_and_preserves_actual_actor(self):
        self.grant()
        self.supervisor_appointment.delete()
        self.application.status = SupervisorApplication.Status.PENDING_COORDINATOR
        self.application.save(update_fields=["status"])
        self.client.force_authenticate(self.other_coordinator)
        queue = self.client.get("/api/appointments/supervisor/coordinator-queue/")
        self.assertEqual(len(queue.data), 1)
        result = self.client.post(f"/api/appointments/supervisor/applications/{self.application.pk}/coordinator-approve/", {}, format="json")
        self.assertEqual(result.status_code, 200, result.data)
        self.application.refresh_from_db()
        self.assertEqual(self.application.appointment.approved_by_id, self.other_coordinator.pk)

    def test_panel_queue_and_approval_include_delegated_programme(self):
        self.grant()
        recommendation = PanelRecommendation.objects.create(
            profile=self.profile, supervisor=self.supervisor, recommended_member=self.panel,
            academic_semester=self.semester, status="PENDING_COORDINATOR",
            submitted_at=timezone.now(), panel_decided_at=timezone.now(),
        )
        self.client.force_authenticate(self.other_coordinator)
        queue = self.client.get("/api/appointments/panel/coordinator-queue/")
        self.assertEqual(len(queue.data), 1)
        workspace = self.client.get("/api/appointments/panel/coordinator-workspace/")
        self.assertIn(self.student.programme, workspace.data["programmes"])
        result = self.client.post(f"/api/appointments/panel/recommendations/{recommendation.pk}/coordinator-approve/", {}, format="json")
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(recommendation.panel_appointment.approved_by_id, self.other_coordinator.pk)

    def test_supporting_approval_and_closure_use_delegated_authority(self):
        self.grant()
        pk = self.nominate().data["id"]
        self.assertEqual(self.decide(pk, "accept", self.new_supervisor).status_code, 200)
        result = self.decide(pk, "approve", self.other_coordinator)
        self.assertEqual(result.status_code, 200, result.data)
        from .models import CoSupervisorAppointment
        appointment = CoSupervisorAppointment.objects.get(nomination_id=pk)
        self.client.force_authenticate(self.other_coordinator)
        closed = self.client.post(f"/api/appointments/co-supervisor/appointments/{appointment.pk}/end/",
                                  {"outcome": "COMPLETED", "reason": "Supporting work complete"}, format="json")
        self.assertEqual(closed.status_code, 200, closed.data)

    def test_revoked_decision_is_denied_without_mutation(self):
        pk = self.grant()
        nomination = self.nominate().data["id"]
        self.decide(nomination, "accept", self.new_supervisor)
        self.revoke(pk)
        response = self.decide(nomination, "approve", self.other_coordinator)
        self.assertEqual(response.status_code, 403, response.data)
        from .models import CoSupervisorNomination
        self.assertEqual(CoSupervisorNomination.objects.get(pk=nomination).status, "PENDING_COORDINATOR")

    def test_expiry_removes_pending_decision_and_student_access(self):
        from unittest.mock import patch
        from accounts.delegations import today
        from .models import CoSupervisorNomination

        self.grant()
        nomination = self.nominate().data["id"]
        self.decide(nomination, "accept", self.new_supervisor)
        after_end = today() + timezone.timedelta(days=3)
        with patch("accounts.delegations.today", return_value=after_end):
            response = self.decide(nomination, "approve", self.other_coordinator)
            self.assertEqual(response.status_code, 403, response.data)
            self.assertEqual(self.client.get(
                f"/api/appointments/co-supervisor/students/{self.student.pk}/"
            ).status_code, 403)
        self.assertEqual(CoSupervisorNomination.objects.get(pk=nomination).status, "PENDING_COORDINATOR")

    def test_delegated_rejections_preserve_decision_actor(self):
        self.grant()
        self.supervisor_appointment.delete()
        self.application.status = SupervisorApplication.Status.PENDING_COORDINATOR
        self.application.save(update_fields=["status"])
        recommendation = PanelRecommendation.objects.create(
            profile=self.profile, supervisor=self.supervisor, recommended_member=self.panel,
            academic_semester=self.semester, status="PENDING_COORDINATOR",
            submitted_at=timezone.now(), panel_decided_at=timezone.now(),
        )
        self.client.force_authenticate(self.other_coordinator)
        for kind, record in (("supervisor/applications", self.application),
                             ("panel/recommendations", recommendation)):
            response = self.client.post(
                f"/api/appointments/{kind}/{record.pk}/coordinator-reject/",
                {"reason": "Requires revision"}, format="json",
            )
            self.assertEqual(response.status_code, 200, response.data)
            record.refresh_from_db()
            self.assertEqual(record.status, "REJECTED_BY_COORDINATOR")
            self.assertEqual(
                record.workflow_events.get(action="COORDINATOR_REJECT").actor_id,
                self.other_coordinator.pk,
            )
