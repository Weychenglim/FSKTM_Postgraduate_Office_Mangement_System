from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from . import test_capacity as fixtures
from .capacity_services import (
    capacity_plan_content_fingerprint, create_capacity_plan, discard_capacity_plan, update_capacity_entry,
)
from .models import AcademicSemester, LecturerCapacityAudit, SemesterCapacityPlan


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class CapacityDiscardTests(TestCase):
    setUp = fixtures.CapacityModelTests.setUp

    def prepare(self):
        plan = create_capacity_plan(semester=self.semester, actor=self.office)
        update_capacity_entry(
            plan, lecturer=self.lecturer, actor=self.office,
            supervisor_limit=3, panel_limit=4,
            expected_fingerprint=capacity_plan_content_fingerprint(plan),
        )
        return plan

    def command(self, plan, **changes):
        return {
            "reason": "Duplicate planning draft.", "confirmed": True,
            "expectedVersion": plan.version,
            "expectedFingerprint": capacity_plan_content_fingerprint(plan),
            **changes,
        }

    def post(self, plan, command=None, user=None):
        client = APIClient()
        client.force_authenticate(user or self.office)
        return client.post(
            f"/api/academics/capacity-plans/{plan.pk}/discard/",
            self.command(plan) if command is None else command, format="json",
        )

    def test_discard_preserves_entries_audits_and_version_number(self):
        plan = self.prepare()
        entry_ids = list(plan.entries.values_list("pk", flat=True))
        existing_audits = list(plan.audits.values_list("pk", flat=True))
        response = self.post(plan)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["lifecycleStatus"], "DISCARDED")
        plan.refresh_from_db()
        self.assertEqual(plan.lifecycle_status, "DISCARDED")
        self.assertEqual(list(plan.entries.values_list("pk", flat=True)), entry_ids)
        self.assertTrue(all(plan.audits.filter(pk=pk).exists() for pk in existing_audits))
        audit = plan.audits.get(action="PLAN_DISCARD")
        self.assertEqual(audit.actor, self.office)
        self.assertEqual(audit.reason, "Duplicate planning draft.")
        self.assertEqual(audit.before_values["lifecycleStatus"], "DRAFT")
        self.assertEqual(audit.after_values["lifecycleStatus"], "DISCARDED")
        next_plan = create_capacity_plan(semester=self.semester, actor=self.office)
        self.assertEqual(next_plan.version, plan.version + 1)
        client = APIClient()
        client.force_authenticate(self.office)
        history = client.get(f"/api/academics/semesters/{self.semester.pk}/capacity-plans/")
        self.assertTrue(any(row["id"] == plan.pk and row["lifecycleStatus"] == "DISCARDED" for row in history.data))

    def test_non_drafts_cannot_be_discarded(self):
        for lifecycle in ["PUBLISHED", "SUPERSEDED", "DISCARDED"]:
            with self.subTest(lifecycle=lifecycle):
                plan = self.prepare()
                plan.lifecycle_status = lifecycle
                plan.save(update_fields=["lifecycle_status"])
                before = LecturerCapacityAudit.objects.count()
                self.assertEqual(self.post(plan).status_code, 409)
                self.assertEqual(LecturerCapacityAudit.objects.count(), before)

    def test_confirmation_reason_unknown_fields_and_fingerprint_are_validated(self):
        plan = self.prepare()
        for changes in [{"confirmed": False}, {"confirmed": "true"}, {"confirmed": 1}, {"reason": " "}, {"other": 1}, {"expectedFingerprint": "invalid"}]:
            with self.subTest(changes=changes):
                self.assertEqual(self.post(plan, self.command(plan, **changes)).status_code, 400)
        command = self.command(plan)
        del command["confirmed"]
        self.assertEqual(self.post(plan, command).status_code, 400)
        self.assertFalse(plan.audits.filter(action="PLAN_DISCARD").exists())

    def test_concurrent_changes_and_stale_version_are_rejected(self):
        plan = self.prepare()
        self.assertEqual(self.post(plan, self.command(plan, expectedVersion=99)).status_code, 409)
        stale = self.command(plan)
        update_capacity_entry(plan, lecturer=self.lecturer, actor=self.office, supervisor_limit=7, panel_limit=4, expected_fingerprint=stale["expectedFingerprint"])
        self.assertEqual(self.post(plan, stale).status_code, 409)
        self.assertFalse(plan.audits.filter(action="PLAN_DISCARD").exists())

    def test_permission_and_missing_plan(self):
        plan = self.prepare()
        client = APIClient()
        url = f"/api/academics/capacity-plans/{plan.pk}/discard/"
        self.assertEqual(client.post(url, self.command(plan), format="json").status_code, 401)
        self.assertEqual(self.post(plan, user=self.lecturer.user).status_code, 403)
        client.force_authenticate(self.office)
        self.assertEqual(client.post("/api/academics/capacity-plans/999999/discard/", self.command(plan), format="json").status_code, 404)
        self.assertEqual(client.delete(url).status_code, 405)

    def test_closed_semester_rejects_discard(self):
        plan = self.prepare()
        self.semester.lifecycle_status = AcademicSemester.Lifecycle.CLOSED
        self.semester.save(update_fields=["lifecycle_status"])
        self.assertEqual(self.post(plan).status_code, 409)

    def test_discarded_plan_cannot_be_edited_published_or_cloned(self):
        plan = self.prepare()
        self.assertEqual(self.post(plan).status_code, 200)
        plan.refresh_from_db()
        client = APIClient()
        client.force_authenticate(self.office)
        command = self.command(plan)
        command.pop("confirmed")
        self.assertEqual(client.post(f"/api/academics/capacity-plans/{plan.pk}/publish/", command, format="json").status_code, 409)
        self.assertEqual(client.post(f"/api/academics/capacity-plans/{plan.pk}/clone/", {}, format="json").status_code, 409)
        command.pop("reason")
        command.update(supervisorLimit=8, panelLimit=8)
        self.assertEqual(client.patch(f"/api/academics/capacity-plans/{plan.pk}/lecturers/{self.lecturer.pk}/", command, format="json").status_code, 409)

    def test_discard_does_not_change_published_policy(self):
        published = self.prepare()
        published.lifecycle_status = "PUBLISHED"
        published.save(update_fields=["lifecycle_status"])
        draft = self.prepare()
        self.assertEqual(self.post(draft).status_code, 200)
        published.refresh_from_db()
        self.assertEqual(published.lifecycle_status, "PUBLISHED")
        self.assertEqual(published.entries.get().supervisor_limit, 3)

    def test_failed_audit_rolls_back_discard(self):
        plan = self.prepare()
        fingerprint = capacity_plan_content_fingerprint(plan)
        before = plan.audits.count()
        with patch("academics.capacity_services._audit", side_effect=RuntimeError("Audit unavailable")):
            with self.assertRaises(RuntimeError):
                discard_capacity_plan(plan, actor=self.office, reason="Unused draft", expected_fingerprint=fingerprint)
        plan.refresh_from_db()
        self.assertEqual(plan.lifecycle_status, "DRAFT")
        self.assertEqual(capacity_plan_content_fingerprint(plan), fingerprint)
        self.assertEqual(plan.audits.count(), before)
