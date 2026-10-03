from django.utils import timezone
from rest_framework.test import APITestCase

from academics.models import AcademicSemester
from appointments import test_dashboard_timeline as fixture
from .models import SemesterTimeline, SemesterTimelineEntry, TimelineAuditLog


class TimelineCreationContractTests(APITestCase):
    setUp = fixture.DashboardTimelineApiTests.setUp

    def payload(self, semester_id):
        return {
            "semesterId": semester_id,
            "level": "P1",
            "title": "Proposal presentation",
            "detail": "Present the proposal.",
            "action": "Student / Supervisor",
            "deadlineStart": timezone.localdate().isoformat(),
            "deadlineEnd": timezone.localdate().isoformat(),
            "weekLabel": "Week 2",
            "targetRoles": ["STUDENT", "LECTURER"],
        }

    def timeline(self, semester):
        return SemesterTimeline.objects.create(
            academic_semester=semester,
            semester=semester.get_term_display(),
            session=semester.academic_session,
            source_filename="timeline.xlsx",
            uploaded_by=self.admin,
        )

    def test_frontend_add_entry_payload_targets_selected_active_semester(self):
        timeline = self.timeline(self.academic_semester)
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/dashboard/timeline/entries/",
                                    self.payload(self.academic_semester.pk), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        entry = SemesterTimelineEntry.objects.get(pk=response.data["id"])
        self.assertEqual(entry.timeline, timeline)
        self.assertTrue(TimelineAuditLog.objects.filter(
            entry=entry, timeline=timeline, action="ADD_ENTRY", actor=self.admin
        ).exists())

    def test_selected_draft_does_not_write_to_effective_active_semester(self):
        active = self.timeline(self.academic_semester)
        draft = AcademicSemester.objects.create(
            code="2100-2101-S2", academic_session="2100/2101",
            term=AcademicSemester.Term.SEMESTER_II,
            starts_on=timezone.localdate() + timezone.timedelta(days=150),
            ends_on=timezone.localdate() + timezone.timedelta(days=300),
            created_by=self.admin,
        )
        timeline = self.timeline(draft)
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/dashboard/timeline/entries/",
                                    self.payload(draft.pk), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(SemesterTimelineEntry.objects.get(pk=response.data["id"]).timeline, timeline)
        self.assertFalse(active.entries.exists())

    def test_locked_and_missing_semesters_leave_entries_and_audits_unchanged(self):
        self.timeline(self.academic_semester)
        self.client.force_authenticate(self.admin)
        for lifecycle in ("CLOSED", "ARCHIVED"):
            self.academic_semester.lifecycle_status = lifecycle
            self.academic_semester.save(update_fields=["lifecycle_status"])
            response = self.client.post("/api/dashboard/timeline/entries/",
                                        self.payload(self.academic_semester.pk), format="json")
            self.assertEqual(response.status_code, 409, response.data)
        response = self.client.post("/api/dashboard/timeline/entries/",
                                    self.payload(999999), format="json")
        self.assertEqual(response.status_code, 409)
        self.assertFalse(SemesterTimelineEntry.objects.exists())
        self.assertFalse(TimelineAuditLog.objects.exists())

    def test_selected_semester_does_not_allow_system_derived_fields(self):
        self.timeline(self.academic_semester)
        self.client.force_authenticate(self.admin)
        for field, value in (("status", "Completed"), ("step", 99), ("timelineId", 99)):
            response = self.client.post("/api/dashboard/timeline/entries/",
                {**self.payload(self.academic_semester.pk), field: value}, format="json")
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(SemesterTimelineEntry.objects.exists())
