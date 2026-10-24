from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from . import test_capacity as fixtures
from .models import LecturerAvailabilityWindow, LecturerCapacityAudit, SemesterCapacityPlan


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class CapacityBrowseTests(TestCase):
    setUp = fixtures.CapacityResolverTests.setUp
    create_lecturer = fixtures.CapacityResolverTests.create_lecturer
    create_semester = fixtures.CapacityResolverTests.create_semester

    def get_list(self, kind, **query):
        client = APIClient()
        client.force_authenticate(self.office)
        return client.get(f"/api/academics/semesters/{self.semester.pk}/{kind}/", query)

    def window(self, start, end, **values):
        return LecturerAvailabilityWindow.objects.create(
            academic_semester=self.semester, lecturer=self.lecturer,
            role="SUPERVISOR", starts_on=start, ends_on=end,
            reason="Research leave", created_by=self.office, **values,
        )

    def test_availability_filters_before_paging_and_keeps_legacy_array(self):
        today = timezone.localdate()
        for index in range(12):
            start = today + timedelta(days=2 + index * 3)
            self.window(start, start + timedelta(days=1))
        self.window(today - timedelta(days=4), today - timedelta(days=2))
        result = self.get_list("availability", pageResult="true", status="CURRENT", limit=10, offset=10, lecturerId=self.lecturer.pk)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["total"], 12)
        self.assertEqual(len(result.data["rows"]), 2)
        legacy = self.get_list("availability", limit=10)
        self.assertIsInstance(legacy.data, list)
        self.assertEqual(legacy["X-Total-Count"], "13")

    def test_availability_states_search_and_role(self):
        today = timezone.localdate()
        effective = self.window(today, today)
        scheduled = self.window(today + timedelta(days=2), today + timedelta(days=3))
        ended = self.window(today - timedelta(days=3), today - timedelta(days=2))
        cancelled = self.window(today + timedelta(days=6), today + timedelta(days=7), cancelled_at=timezone.now(), cancelled_by=self.office, cancellation_reason="Restored")
        for state, expected in [("EFFECTIVE", effective), ("SCHEDULED", scheduled), ("ENDED", ended), ("CANCELLED", cancelled)]:
            response = self.get_list("availability", pageResult="true", status=state, q=self.lecturer.staff_no, role="SUPERVISOR")
            self.assertEqual([row["id"] for row in response.data["rows"]], [expected.pk])
        self.assertEqual(self.get_list("availability", pageResult="true", role="PANEL").data["total"], 0)

    def test_version_scope_and_filtered_page(self):
        for version in range(1, 14):
            SemesterCapacityPlan.objects.create(
                academic_semester=self.semester, version=version,
                lifecycle_status="SUPERSEDED" if version < 12 else "DRAFT",
                created_by=self.office,
            )
        working = self.get_list("capacity-plans", scope="working")
        self.assertEqual([row["version"] for row in working.data], [13, 12])
        page = self.get_list("capacity-plans", pageResult="true", status="SUPERSEDED", limit=10, offset=10)
        self.assertEqual(page.data["total"], 11)
        self.assertEqual(len(page.data["rows"]), 1)
        match = self.get_list("capacity-plans", pageResult="true", q="Version 13")
        self.assertEqual([row["version"] for row in match.data["rows"]], [13])

    def test_invalid_filters_are_rejected(self):
        for query in [{"status": "UNKNOWN"}, {"lecturerId": "bad"}, {"role": "STUDENT"}, {"limit": 101}]:
            self.assertEqual(self.get_list("availability", **query).status_code, 400)
        self.assertEqual(self.get_list("capacity-plans", status="ENDED").status_code, 400)

    def test_pages_remain_office_only(self):
        client = APIClient()
        client.force_authenticate(self.lecturer.user)
        for collection in ["availability", "capacity-plans", "capacity-audits"]:
            self.assertEqual(client.get(f"/api/academics/semesters/{self.semester.pk}/{collection}/", {"pageResult": "true"}).status_code, 403)

    def test_roster_summary_counts_current_and_scheduled_without_private_reasons(self):
        today = timezone.localdate()
        self.window(today, today)
        self.window(today + timedelta(days=2), today + timedelta(days=3))
        result = self.get_list("capacity-workspace")
        row = next(item for item in result.data["lecturers"] if item["lecturerId"] == self.lecturer.pk)
        self.assertEqual(row["availabilitySummary"], {"current": 1, "scheduled": 1})
        self.assertNotIn("Research leave", str(result.data))

    def test_activity_search_is_applied_before_count_and_page(self):
        for index in range(12):
            LecturerCapacityAudit.objects.create(
                academic_semester=self.semester, actor=self.office,
                action="AVAILABILITY_CREATE", reason=f"Research leave {index}",
            )
        LecturerCapacityAudit.objects.create(academic_semester=self.other_semester, actor=self.office, action="AVAILABILITY_CREATE")
        response = self.get_list("capacity-audits", pageResult="true", q="Availability create", limit=10, offset=10)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 12)
        self.assertEqual(len(response.data["rows"]), 2)
        self.assertEqual(response["X-Total-Count"], "12")
