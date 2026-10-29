"""Capacity promises must remain valid from acceptance through final activation."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import timedelta

from django.db import close_old_connections, connection, connections
from rest_framework.test import APITestCase, APITransactionTestCase, APIClient

from academics.capacity import resolve_lecturer_capacity
from academics.models import AcademicSemester, LecturerCapacityEntry, SemesterCapacityPlan
from academics.test_capacity_helpers import publish_test_capacity_plan
from django.utils import timezone
from accounts.models import Student, User
from announcements.models import Notification
from . import test_supervisor_workflow as fixture
from .models import SupervisorApplication, SupervisorAppointment, CoSupervisorNomination


class ReservationFixture:
    setUp = fixture.SupervisorAppointmentWorkflowTests.setUp

    def application(self, *, accepted=False, semester=None):
        index = Student.objects.count() + 1
        user = User.objects.create_user(email=f"reservation-{index}@example.test", full_name=f"Applicant {index}", role=User.Role.STUDENT)
        student = Student.objects.create(user=user, matric_no=f"RES-{index}", programme=self.student_user.student.programme, intake_semester="Synthetic semester")
        return SupervisorApplication.objects.create(student=student, proposed_supervisor=self.supervisor_user,
            academic_semester=semester or self.academic_semester, research_title="Synthetic capacity research", research_abstract="Synthetic proposal.",
            status="PENDING_COORDINATOR" if accepted else "SUBMITTED_TO_SUPERVISOR")

    def limit(self, value):
        from academics.capacity_services import clone_capacity_plan, update_capacity_entry, publish_capacity_plan, capacity_plan_content_fingerprint
        from academics.models import SemesterCapacityPlan
        previous = SemesterCapacityPlan.objects.get(academic_semester=self.academic_semester, lifecycle_status="PUBLISHED")
        plan = clone_capacity_plan(previous, actor=self.office_admin)
        update_capacity_entry(plan, lecturer=self.supervisor_user.lecturer, actor=self.office_admin,
            supervisor_limit=value, panel_limit=None, expected_fingerprint=capacity_plan_content_fingerprint(plan))
        publish_capacity_plan(plan, actor=self.office_admin, reason="Synthetic test capacity", expected_fingerprint=capacity_plan_content_fingerprint(plan))

    def accept(self, row, actor=None):
        self.client.force_authenticate(actor or self.supervisor_user)
        return self.client.post(f"/api/appointments/supervisor/applications/{row.pk}/supervisor-accept/")

    def approve(self, row):
        self.client.force_authenticate(self.coordinator)
        return self.client.post(f"/api/appointments/supervisor/applications/{row.pk}/coordinator-approve/")

    def supporting(self):
        primary = self.application()
        primary.proposed_supervisor = self.other_supervisor
        primary.status = "APPROVED"
        primary.save()
        appointment = SupervisorAppointment.objects.create(application=primary, student=primary.student, supervisor=self.other_supervisor, approved_by=self.coordinator)
        return CoSupervisorNomination.objects.create(student=primary.student, primary_appointment=appointment,
            nominator=self.other_supervisor, candidate=self.supervisor_user, academic_semester=self.academic_semester,
            justification="Synthetic supporting appointment", status="PENDING_COORDINATOR")


class SupervisorCapacityReservationTests(ReservationFixture, APITestCase):
    def test_acceptance_reserves_last_place_and_blocks_competing_acceptance(self):
        self.limit(1)
        first, second = self.application(), self.application()
        self.assertEqual(self.accept(first).status_code, 200)
        self.assertEqual(self.accept(second).status_code, 409)
        second.refresh_from_db()
        self.assertEqual(second.status, "SUBMITTED_TO_SUPERVISOR")
        result = resolve_lecturer_capacity(user=self.supervisor_user, semester=self.academic_semester, role="SUPERVISOR")
        self.assertEqual((result.active_load, result.reserved_load, result.available_slots), (0, 1, 0))

    def test_ongoing_student_and_request_capacity_distinguishes_active_and_reserved(self):
        self.limit(1)
        self.application(accepted=True)
        waiting = self.application()
        self.client.force_authenticate(waiting.student.user)
        payload = self.client.get("/api/appointments/supervisor/applications/").data[0]
        self.assertEqual(payload.get("acceptanceCapacity"), {"activeLoad": 0, "reservedLoad": 1, "limit": 1, "availableSlots": 0, "pendingRequests": 1, "state": "FULL"})
        self.client.force_authenticate(self.supervisor_user)
        payload = self.client.get("/api/appointments/supervisor/requests/").data[0]
        self.assertEqual(payload.get("acceptanceCapacity", {}).get("reservedLoad"), 1)

    def test_final_approval_converts_own_reservation_and_closes_waiting_once(self):
        self.limit(1)
        accepted, waiting = self.application(accepted=True), self.application()
        result = self.approve(accepted)
        self.assertEqual(result.status_code, 200, result.data)
        waiting.refresh_from_db()
        self.assertEqual(waiting.status, "CANCELLED_CAPACITY_FULL")
        self.assertIsNotNone(waiting.cancelled_at)
        event = waiting.workflow_events.get(action="SYSTEM_CLOSE_CAPACITY")
        self.assertEqual((event.actor_id, event.actor_role), (self.coordinator.pk, "SYSTEM"))
        self.assertIsNone(waiting.supervisor_decided_at)
        count = Notification.objects.filter(record_id=str(waiting.pk), event_key__contains="capacity-full").count()
        self.assertGreater(count, 0)
        self.assertEqual(self.approve(accepted).status_code, 200)
        self.assertEqual(waiting.workflow_events.count(), 1)
        self.assertEqual(Notification.objects.filter(record_id=str(waiting.pk), event_key__contains="capacity-full").count(), count)
        self.client.force_authenticate(waiting.student.user)
        detail = self.client.get(f"/api/appointments/supervisor/applications/{waiting.pk}/").data
        self.assertEqual(detail["workflow"][0]["actorName"], "System")
        self.assertIsNone(detail.get("acceptanceCapacity"))
        self.assertEqual(SupervisorAppointment.objects.filter(supervisor=self.supervisor_user, status="ACTIVE").count(), 1)

    def test_coordinator_rejection_releases_reservation(self):
        self.limit(1)
        accepted, waiting = self.application(accepted=True), self.application()
        self.client.force_authenticate(self.coordinator)
        response = self.client.post(f"/api/appointments/supervisor/applications/{accepted.pk}/coordinator-reject/", {"reason": "Synthetic decision"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.accept(waiting).status_code, 200)

    def test_publication_cannot_lower_limit_below_existing_reservations(self):
        from academics.capacity_services import CapacityLifecycleConflict
        self.application(accepted=True)
        with self.assertRaises(CapacityLifecycleConflict):
            self.limit(0)

    def test_capacity_projections_use_active_and_reserved_counts(self):
        self.limit(1)
        accepted = self.application(accepted=True)
        self.application()
        self.client.force_authenticate(self.supervisor_user)
        workload = self.client.get("/api/appointments/supervisor/my-workload/").data
        self.assertEqual((workload.get("currentStudents"), workload.get("reservedLoad"), workload.get("workloadCount")), (0, 1, 1))
        self.client.force_authenticate(accepted.student.user)
        own = self.client.get("/api/appointments/supervisor/applications/").data[0]
        self.assertEqual(own["acceptanceCapacity"]["reservedLoad"], 1)
        self.client.force_authenticate(self.office_admin)
        roster = self.client.get(f"/api/academics/semesters/{self.academic_semester.pk}/capacity-workspace/").data
        lecturer = next(row for row in roster["lecturers"] if row["id"] == self.supervisor_user.pk)
        self.assertEqual(lecturer["supervisor"]["reservedLoad"], 1)
        rows = self.client.get("/api/appointments/office-workspace/attention/", {"category": "workload", "status": "full"}).data
        row = next(row for row in rows["results"] if row["lecturerId"] == self.supervisor_user.lecturer.staff_no)
        self.assertEqual((row["currentStudents"], row["reservedLoad"], row["capacityState"]), (0, 1, "FULL"))

    def test_candidate_and_office_dossier_include_reserved_commitments(self):
        self.limit(1)
        accepted = self.application(accepted=True)
        self.client.force_authenticate(self.student_user)
        candidates = self.client.get("/api/appointments/supervisor/candidates/").data
        row = next(row for row in candidates if row["id"] == self.supervisor_user.lecturer.staff_no)
        self.assertEqual((row["filled"], row["reservedLoad"], row["workloadCount"], row["availableSlots"]), (0, 1, 1, 0))
        self.client.force_authenticate(self.office_admin)
        dossier = self.client.get(f"/api/appointments/office-workspace/requests/primary/{accepted.pk}/").data
        self.assertEqual(dossier["workloadLimit"], "1/1 Supervisees")
        records = self.client.get("/api/appointments/supervisor/").data
        self.assertEqual(records[0]["workloadLimit"], "1/1 Supervisees")

    def test_workload_without_active_semester_still_reports_reserved_promises(self):
        self.application(accepted=True)
        AcademicSemester.objects.filter(pk=self.academic_semester.pk).update(lifecycle_status="CLOSED")
        self.client.force_authenticate(self.supervisor_user)
        payload = self.client.get("/api/appointments/supervisor/my-workload/").data
        self.assertEqual((payload["activeLoad"], payload["reservedLoad"], payload["workloadCount"]), (0, 1, 1))
        self.assertEqual(payload["capacityState"], "NOT_CONFIGURED")

    def test_closure_respects_each_request_policy_and_preserves_accepted(self):
        self.limit(2)
        today = timezone.localdate()
        prior = AcademicSemester.objects.create(code="2095-2096-S1", academic_session="2095/2096", term="SEMESTER_I",
            starts_on=today - timedelta(days=400), ends_on=today - timedelta(days=200), created_by=self.office_admin)
        from accounts.models import Supervisor
        Supervisor.objects.filter(lecturer=self.supervisor_user.lecturer).update(max_supervisees=1)
        publish_test_capacity_plan(prior, self.office_admin)
        prior.lifecycle_status = "CLOSED"
        prior.save(update_fields=["lifecycle_status"])
        waiting = self.application(semester=prior)
        reassessed = self.application(semester=prior)
        archived_semester = AcademicSemester.objects.create(code="2094-2095-S1", academic_session="2094/2095", term="SEMESTER_I",
            starts_on=today - timedelta(days=800), ends_on=today - timedelta(days=600), created_by=self.office_admin)
        publish_test_capacity_plan(archived_semester, self.office_admin)
        archived_semester.lifecycle_status = "ARCHIVED"
        archived_semester.save(update_fields=["lifecycle_status"])
        archived = self.application(semester=archived_semester)
        accepted = self.application(accepted=True)
        reserved = self.application(accepted=True)
        higher = self.application()
        from .capacity_reassessment import decide
        decide(actor=self.office_admin, kind="SUPERVISOR", pk=reassessed.pk, action="authorize", data={
            "reason": "Synthetic current-policy authorization", "expectedStatus": "SUBMITTED_TO_SUPERVISOR",
            "expectedActiveSemesterId": self.academic_semester.pk, "expectedAuthorizationId": None, "expectedEventId": None})
        missing_policy = AcademicSemester.objects.create(code="2093-2094-S1", academic_session="2093/2094", term="SEMESTER_I",
            starts_on=today - timedelta(days=1200), ends_on=today - timedelta(days=1000), created_by=self.office_admin)
        unconfigured = self.application(semester=missing_policy)
        legacy = self.application()
        legacy.academic_semester = None
        legacy.save()
        other = self.application()
        other.proposed_supervisor = self.other_supervisor
        other.save()
        self.assertEqual(self.approve(accepted).status_code, 200)
        for row, expected in [(waiting, "CANCELLED_CAPACITY_FULL"), (reserved, "PENDING_COORDINATOR"), (archived, "SUBMITTED_TO_SUPERVISOR"), (higher, "SUBMITTED_TO_SUPERVISOR"), (reassessed, "SUBMITTED_TO_SUPERVISOR"), (unconfigured, "SUBMITTED_TO_SUPERVISOR"), (legacy, "SUBMITTED_TO_SUPERVISOR"), (other, "SUBMITTED_TO_SUPERVISOR")]:
            row.refresh_from_db()
            self.assertEqual(row.status, expected)
        self.client.force_authenticate(self.supervisor_user)
        history = self.client.get("/api/appointments/supervisor/request-history/").data
        self.assertTrue(any(row["applicationId"] == waiting.pk and row["decision"] == "Capacity full" for row in history))

    def test_office_cancellation_releases_reservation_for_another_student(self):
        self.limit(1)
        accepted, waiting = self.application(accepted=True), self.application()
        from accounts.participant_lifecycle import cancel_pending_work
        cancel_pending_work(participant=accepted.student, actor=self.office_admin, record_type="SUPERVISOR_APPLICATION", record_id=accepted.pk, reason="Choose another supervisor")
        self.assertEqual(self.accept(waiting).status_code, 200)

    def test_student_can_cancel_unaccepted_request_while_place_is_reserved(self):
        self.limit(1)
        self.application(accepted=True)
        waiting = self.application()
        self.client.force_authenticate(waiting.student.user)
        response = self.client.post(f"/api/appointments/supervisor/applications/{waiting.pk}/cancel/", {"reason": "Choose another supervisor"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)

    def test_reconciliation_handoff_cannot_steal_an_accepted_place(self):
        from types import SimpleNamespace
        from dashboard.reconciliation import _apply_supervisor_handoff, ReconciliationConflict
        from .models import AppointmentWorkflowEvent
        self.limit(1)
        self.application(accepted=True)
        historical = self.application()
        historical.status = "APPROVED"
        historical.coordinator_decided_at = timezone.now()
        historical.save()
        AppointmentWorkflowEvent.objects.create(supervisor_application=historical, actor=self.coordinator,
            actor_role=self.coordinator.role, action="COORDINATOR_APPROVE", new_status="APPROVED")
        with self.assertRaisesRegex(ReconciliationConflict, "capacity|workload"):
            _apply_supervisor_handoff(SimpleNamespace(record_id=historical.pk), self.office_admin)
        from dashboard.reconciliation import detect_reconciliation_issues
        issue = next(row for row in detect_reconciliation_issues() if row.issue_type == "SUPERVISOR_HANDOFF_INCOMPLETE" and str(row.record_id) == str(historical.pk))
        self.assertEqual(issue.repairability, "REVIEW_REQUIRED")

    def test_supporting_approval_cannot_take_a_reserved_primary_place(self):
        self.limit(1)
        nomination = self.supporting()
        self.application(accepted=True)
        self.client.force_authenticate(self.coordinator)
        response = self.client.post(f"/api/appointments/co-supervisor/nominations/{nomination.pk}/approve/")
        self.assertEqual(response.status_code, 409)

    def test_reconciliation_activation_closes_waiting_requests_at_capacity(self):
        from types import SimpleNamespace
        from dashboard.reconciliation import _apply_supervisor_handoff
        from .models import AppointmentWorkflowEvent
        self.limit(1)
        historical, waiting = self.application(), self.application()
        historical.status = "APPROVED"
        historical.coordinator_decided_at = timezone.now()
        historical.save()
        AppointmentWorkflowEvent.objects.create(supervisor_application=historical, actor=self.coordinator,
            actor_role=self.coordinator.role, action="COORDINATOR_APPROVE", new_status="APPROVED")
        _apply_supervisor_handoff(SimpleNamespace(record_id=historical.pk), self.office_admin)
        waiting.refresh_from_db()
        self.assertEqual(waiting.status, "CANCELLED_CAPACITY_FULL")

    def test_supporting_final_approval_closes_unaccepted_primary(self):
        self.limit(1)
        nomination = self.supporting()
        waiting = self.application()
        self.client.force_authenticate(self.coordinator)
        response = self.client.post(f"/api/appointments/co-supervisor/nominations/{nomination.pk}/approve/")
        self.assertEqual(response.status_code, 200, response.data)
        waiting.refresh_from_db()
        self.assertEqual(waiting.status, "CANCELLED_CAPACITY_FULL")

    def test_capacity_closure_preserves_incumbent_on_office_replacement(self):
        from .models import AppointmentWorkflowEvent
        self.limit(1)
        accepted, replacement = self.application(accepted=True), self.application()
        incumbent_source = SupervisorApplication.objects.create(student=replacement.student, proposed_supervisor=self.other_supervisor,
            academic_semester=self.academic_semester, research_title="Incumbent research", research_abstract="Synthetic incumbent.", status="APPROVED")
        incumbent = SupervisorAppointment.objects.create(application=incumbent_source, student=replacement.student,
            supervisor=self.other_supervisor, approved_by=self.coordinator)
        replacement.replaces_appointment = incumbent
        replacement.save()
        AppointmentWorkflowEvent.objects.create(supervisor_application=replacement, actor=self.office_admin,
            actor_role="OFFICE_ADMIN", action="SUBMIT", new_status="SUBMITTED_TO_SUPERVISOR")
        self.assertEqual(self.approve(accepted).status_code, 200)
        replacement.refresh_from_db()
        incumbent.refresh_from_db()
        self.assertEqual((replacement.status, incumbent.status), ("CANCELLED_CAPACITY_FULL", "ACTIVE"))

    def test_full_capacity_still_allows_rejection_and_blocks_unauthorized_acceptance(self):
        self.limit(1)
        self.application(accepted=True)
        waiting = self.application()
        self.assertEqual(self.accept(waiting, self.other_supervisor).status_code, 403)
        self.assertEqual(self.accept(waiting).status_code, 409)
        self.client.force_authenticate(self.supervisor_user)
        response = self.client.post(f"/api/appointments/supervisor/applications/{waiting.pk}/supervisor-reject/", {"reason": "Synthetic refusal"}, format="json")
        self.assertEqual(response.status_code, 200)


class SupervisorAcceptanceConcurrencyTests(ReservationFixture, APITransactionTestCase):
    def test_real_competing_acceptances_cannot_promise_the_same_place(self):
        if connection.vendor != "postgresql":
            self.skipTest("Requires PostgreSQL row locks")
        self.limit(1)
        rows = [self.application(), self.application()]
        barrier = Barrier(2)

        def accept(pk):
            close_old_connections()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET statement_timeout = '20s'")
                client = APIClient()
                client.force_authenticate(self.supervisor_user)
                barrier.wait(timeout=20)
                response = client.post(f"/api/appointments/supervisor/applications/{pk}/supervisor-accept/")
                return response.status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(accept, [row.pk for row in rows]))
        self.assertCountEqual(outcomes, [200, 409])
        self.assertEqual(SupervisorApplication.objects.filter(status="PENDING_COORDINATOR").count(), 1)
