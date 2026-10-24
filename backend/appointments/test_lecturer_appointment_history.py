from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from . import test_appointment_lifecycle as fixture
from .models import CoSupervisorAppointment, CoSupervisorNomination, SupervisorApplication, SupervisorAppointment


class LecturerAppointmentHistoryTests(APITestCase):
    setUp = fixture.AppointmentLifecycleTests.setUp
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    path = "/api/appointments/supervisor/my-appointments/history/"

    def end_primary(self):
        row = self.supervisor_appointment
        row.status = "ENDED"
        row.end_outcome = "REPLACED"
        row.ended_at = timezone.now()
        row.save()
        return row

    def supporting(self, supervisor, status="ENDED"):
        nomination = CoSupervisorNomination.objects.create(
            student=self.student, primary_appointment=self.supervisor_appointment,
            nominator=self.supervisor, candidate=supervisor,
            academic_semester=self.semester, justification="Private nomination text",
            status="APPROVED",
        )
        return CoSupervisorAppointment.objects.create(
            nomination=nomination, student=self.student, supervisor=supervisor,
            approved_by=self.coordinator, status=status,
            ended_at=timezone.now() if status == "ENDED" else None,
            end_outcome="COMPLETED" if status == "ENDED" else "",
        )

    def test_own_primary_and_supporting_history_without_current_team_access(self):
        primary = self.end_primary()
        supporting = self.supporting(self.supervisor)
        self.supporting(self.new_supervisor)
        foreign_application = SupervisorApplication.objects.create(
            student=self.student, proposed_supervisor=self.new_supervisor,
            academic_semester=self.semester, status="APPROVED", research_title="Foreign appointment",
        )
        SupervisorAppointment.objects.create(
            application=foreign_application, student=self.student,
            supervisor=self.new_supervisor, approved_by=self.coordinator,
            status="ENDED", ended_at=timezone.now(), end_outcome="COMPLETED",
        )
        self.client.force_authenticate(self.supervisor)
        response = self.client.get(self.path)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 2)
        rows = {row["key"]: row for row in response.data["results"]}
        self.assertEqual(set(rows), {f"primary-{primary.pk}", f"supporting-{supporting.pk}"})
        self.assertEqual(rows[f"primary-{primary.pk}"]["outcome"], "REPLACED")
        self.assertEqual(rows[f"supporting-{supporting.pk}"]["outcome"], "COMPLETED")
        self.assertNotIn("Private nomination text", str(response.data))
        self.assertNotIn("researchAbstract", str(response.data))
        # Historical access does not grant the former supervisor current team access.
        team = self.client.get(f"/api/appointments/co-supervisor/students/{self.student.pk}/")
        self.assertEqual(team.status_code, 403)

    def test_active_appointments_excluded_even_in_an_old_semester(self):
        self.supporting(self.supervisor, "ACTIVE")
        type(self.semester).objects.filter(pk=self.semester.pk).update(
            lifecycle_status="ARCHIVED",
            starts_on=timezone.localdate() - timedelta(days=365),
            ends_on=timezone.localdate() - timedelta(days=180),
        )
        self.client.force_authenticate(self.supervisor)
        response = self.client.get(self.path)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 0)

    def test_filters_and_pagination_cannot_expand_ownership(self):
        self.end_primary()
        self.supporting(self.supervisor)
        foreign = self.supporting(self.new_supervisor)
        self.client.force_authenticate(self.supervisor)
        result = self.client.get(self.path, {"type": "supporting", "page": 999, "size": 10})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["total"], 1)
        self.assertEqual(result.data["page"], 1)
        self.assertNotEqual(result.data["results"][0]["id"], foreign.pk)
        self.assertEqual(self.client.get(self.path, {"q": "does-not-exist"}).data["total"], 0)
        self.assertEqual(self.client.get(self.path, {"size": 10000}).status_code, 400)
        self.assertEqual(self.client.get(self.path, {"from": "invalid"}).status_code, 400)

    def test_past_records_remain_paged_and_filter_by_role_semester_and_end_date(self):
        self.end_primary()
        for _ in range(12):
            self.supporting(self.supervisor)
        self.client.force_authenticate(self.supervisor)
        page1 = self.client.get(self.path, {"sort": "newest"}).data
        page2 = self.client.get(self.path, {"sort": "newest", "page": 2}).data
        self.assertEqual(page1["total"], 13)
        self.assertEqual(len(page1["results"]), 10)
        self.assertEqual(len(page2["results"]), 3)
        self.assertFalse({r["key"] for r in page1["results"]} & {r["key"] for r in page2["results"]})
        self.assertEqual(self.client.get(self.path, {"type": "primary", "semester": self.semester.label}).data["total"], 1)
        tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()
        self.assertEqual(self.client.get(self.path, {"from": tomorrow}).data["total"], 0)

    def test_pending_nomination_is_not_a_past_appointment(self):
        CoSupervisorNomination.objects.create(
            student=self.student, primary_appointment=self.supervisor_appointment,
            nominator=self.supervisor, candidate=self.new_supervisor,
            academic_semester=self.semester, justification="Pending request",
        )
        self.client.force_authenticate(self.new_supervisor)
        result = self.client.get(self.path)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["total"], 0)

    def test_endpoint_is_read_only_and_lecturer_only(self):
        self.assertEqual(self.client.get(self.path).status_code, 401)
        for actor in (self.office, self.coordinator, self.student_user):
            self.client.force_authenticate(actor)
            self.assertEqual(self.client.get(self.path).status_code, 403)
        self.client.force_authenticate(self.supervisor)
        self.assertEqual(self.client.post(self.path, {}).status_code, 405)
