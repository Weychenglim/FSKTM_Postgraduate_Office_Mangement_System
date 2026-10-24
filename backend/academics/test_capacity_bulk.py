"""Batch changes are draft-only, explicit, atomic and audited."""
from django.test import TestCase, TransactionTestCase
from django.db import close_old_connections
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch
from accounts.models import Lecturer, Supervisor, User
from rest_framework.test import APIClient
from . import test_capacity as fixtures
from .capacity_services import create_capacity_plan, capacity_plan_content_fingerprint
from .models import LecturerCapacityEntry, LecturerCapacityAudit


class CapacityBulkTests(TestCase):
    setUpTestData = classmethod(fixtures.CapacityLifecycleTests.setUpTestData.__func__)
    create_lecturer = classmethod(fixtures.CapacityLifecycleTests.create_lecturer.__func__)
    complete_plan = fixtures.CapacityLifecycleTests.complete_plan
    publish_complete_plan = fixtures.CapacityLifecycleTests.publish_complete_plan

    def setUp(self):
        self.plan = create_capacity_plan(semester=self.semester, actor=self.office)
        self.client = APIClient()
        self.client.force_authenticate(self.office)
        self.url = f"/api/academics/capacity-plans/{self.plan.pk}/entries/bulk/"

    def command(self, entries=None, mode="MISSING_ONLY"):
        return {"entries": entries or [
            {"lecturerId": self.supervisor_only.pk, "supervisorLimit": 4},
            {"lecturerId": self.lecturer.pk, "supervisorLimit": 5, "panelLimit": 8},
        ], "mode": mode, "expectedVersion": self.plan.version,
            "expectedFingerprint": capacity_plan_content_fingerprint(self.plan)}

    def send(self, command=None):
        return self.client.patch(self.url, command or self.command(), format="json")

    def test_creates_multiple_entries_with_per_lecturer_audits(self):
        before = LecturerCapacityAudit.objects.count()
        old_fingerprint = capacity_plan_content_fingerprint(self.plan)
        result = self.send()
        self.assertEqual(result.status_code, 200, result.data)
        self.assertTrue(result.data["isComplete"])
        self.assertEqual(len(result.data["entries"]), 2)
        self.assertEqual(LecturerCapacityAudit.objects.count(), before + 2)
        self.assertNotEqual(result.data["contentFingerprint"], old_fingerprint)
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.lifecycle_status, "DRAFT")
        audit = LecturerCapacityAudit.objects.filter(lecturer=self.lecturer).latest("pk")
        self.assertIsNone(audit.before_values["entry"])
        self.assertEqual(audit.after_values["entry"]["panelLimit"], 8)

    def test_missing_only_preserves_existing_values_and_zero(self):
        self.assertEqual(self.send().status_code, 200)
        result = self.send(self.command(mode="REPLACE", entries=[{"lecturerId": self.lecturer.pk, "supervisorLimit": 0}]))
        self.assertEqual(result.status_code, 200)
        before = LecturerCapacityAudit.objects.count()
        result = self.send()
        entry = LecturerCapacityEntry.objects.get(plan=self.plan, lecturer=self.lecturer)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(entry.supervisor_limit, 0)
        self.assertEqual(entry.panel_limit, 8)
        self.assertEqual(LecturerCapacityAudit.objects.count(), before)

    def test_replace_changes_only_supplied_role_and_leaves_other_lecturers_alone(self):
        self.send()
        result = self.send(self.command(entries=[{"lecturerId": self.lecturer.pk, "panelLimit": 12}], mode="REPLACE"))
        self.assertEqual(result.status_code, 200)
        entry = LecturerCapacityEntry.objects.get(plan=self.plan, lecturer=self.lecturer)
        self.assertEqual((entry.supervisor_limit, entry.panel_limit), (5, 12))
        self.assertEqual(LecturerCapacityEntry.objects.get(plan=self.plan, lecturer=self.supervisor_only).supervisor_limit, 4)

    def test_invalid_final_entry_rolls_back_every_entry_and_audit(self):
        before = LecturerCapacityAudit.objects.count()
        command = self.command(entries=[{"lecturerId": self.supervisor_only.pk, "supervisorLimit": 4}, {"lecturerId": self.lecturer.pk, "supervisorLimit": 5}])
        result = self.send(command)
        self.assertEqual(result.status_code, 400, result.data)
        self.assertFalse(LecturerCapacityEntry.objects.filter(plan=self.plan).exists())
        self.assertEqual(LecturerCapacityAudit.objects.count(), before)

    def test_rejects_stale_fingerprint_and_wrong_version(self):
        old = self.command()
        self.assertEqual(self.send(old).status_code, 200)
        before = LecturerCapacityAudit.objects.count()
        self.assertEqual(self.send(old).status_code, 409)
        command = self.command(); command["expectedVersion"] += 1
        self.assertEqual(self.send(command).status_code, 409)
        self.assertEqual(LecturerCapacityAudit.objects.count(), before)

    def test_rejects_unsupported_role_and_ineligible_lecturer_atomically(self):
        result = self.send(self.command(entries=[{"lecturerId": self.supervisor_only.pk, "panelLimit": 8}]))
        self.assertEqual(result.status_code, 409)
        self.lecturer.user.is_active = False; self.lecturer.user.save(update_fields=["is_active"])
        self.assertEqual(self.send().status_code, 409)
        self.assertFalse(LecturerCapacityEntry.objects.filter(plan=self.plan).exists())

    def test_strict_payload_validation(self):
        base = self.command()
        for patch in [{"entries": []}, {"entries": [base["entries"][0]] * 2}, {"entries": [{"lecturerId": self.lecturer.pk}]},
                      {"entries": [{"lecturerId": self.lecturer.pk, "panelLimit": None}]},
                      {"entries": [{"lecturerId": self.lecturer.pk, "panelLimit": -1}]},
                      {"entries": [{"lecturerId": self.lecturer.pk, "panelLimit": 1.5}]},
                      {"mode": "UNKNOWN"}, {"unexpected": True}]:
            with self.subTest(patch=patch):
                self.assertEqual(self.send({**base, **patch}).status_code, 400)
        self.assertFalse(LecturerCapacityEntry.objects.filter(plan=self.plan).exists())

    def test_non_office_and_anonymous_denied(self):
        self.client.force_authenticate(self.lecturer.user)
        self.assertEqual(self.send().status_code, 403)
        self.client.force_authenticate(None)
        self.assertIn(self.send().status_code, [401, 403])

    def test_batch_size_boundary_is_checked_before_any_write(self):
        before = LecturerCapacityAudit.objects.count()
        entries = [{"lecturerId": 1000000 + index, "supervisorLimit": 5} for index in range(1001)]
        result = self.send(self.command(entries=entries))
        self.assertEqual(result.status_code, 400, result.data)
        self.assertIn("entries", result.data)
        # Exactly 1000 passes payload validation and reaches the eligibility guard.
        result = self.send(self.command(entries=entries[:1000]))
        self.assertEqual(result.status_code, 409, result.data)
        self.assertFalse(LecturerCapacityEntry.objects.filter(plan=self.plan).exists())
        self.assertEqual(LecturerCapacityAudit.objects.count(), before)

    def test_limit_boundaries_and_nested_unknown_fields(self):
        before = LecturerCapacityAudit.objects.count()
        for invalid in [{"supervisorLimit": 2147483648}, {"unexpected": True}]:
            with self.subTest(invalid=invalid):
                entries = [{"lecturerId": self.supervisor_only.pk, "supervisorLimit": 4, **invalid}]
                self.assertEqual(self.send(self.command(entries=entries)).status_code, 400)
        self.assertEqual(LecturerCapacityAudit.objects.count(), before)
        result = self.send(self.command(entries=[
            {"lecturerId": self.supervisor_only.pk, "supervisorLimit": 0},
            {"lecturerId": self.lecturer.pk, "supervisorLimit": 2147483647, "panelLimit": 0},
        ]))
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(LecturerCapacityEntry.objects.get(plan=self.plan, lecturer=self.supervisor_only).supervisor_limit, 0)
        entry = LecturerCapacityEntry.objects.get(plan=self.plan, lecturer=self.lecturer)
        self.assertEqual((entry.supervisor_limit, entry.panel_limit), (2147483647, 0))

    def test_published_and_closed_semester_are_immutable(self):
        self.publish_complete_plan(self.plan)
        self.assertEqual(self.send().status_code, 409)
        other = create_capacity_plan(semester=self.semester, actor=self.office)
        self.plan = other; self.url = f"/api/academics/capacity-plans/{other.pk}/entries/bulk/"
        self.semester.lifecycle_status = "CLOSED"; self.semester.save(update_fields=["lifecycle_status"])
        self.assertEqual(self.send().status_code, 409)

    def test_more_than_fifty_lecturers_save_in_one_batch(self):
        entries = []
        for index in range(52):
            user = User.objects.create_user(email=f"bulk.{index}@example.test", full_name=f"Bulk {index}", role=User.Role.LECTURER)
            lecturer = Lecturer.objects.create(user=user, staff_no=f"BULK-{index}", department="Computing")
            Supervisor.objects.create(lecturer=lecturer, max_supervisees=5)
            entries.append({"lecturerId": lecturer.pk, "supervisorLimit": 7})
        result = self.send(self.command(entries=entries))
        self.assertEqual(result.status_code, 200)
        self.assertEqual(LecturerCapacityEntry.objects.filter(plan=self.plan, supervisor_limit=7).count(), 52)
        self.assertFalse(LecturerCapacityEntry.objects.filter(plan=self.plan, lecturer=self.lecturer).exists())

    def test_storage_failure_rolls_back_entries_and_audits(self):
        from . import capacity_services
        audit = capacity_services._audit
        calls = []
        def fail_second(**kwargs):
            calls.append(kwargs)
            if len(calls) == 2:
                raise RuntimeError("Synthetic audit storage failure")
            return audit(**kwargs)
        before = LecturerCapacityAudit.objects.count()
        with patch.object(capacity_services, "_audit", side_effect=fail_second):
            with self.assertRaisesRegex(RuntimeError, "storage failure"):
                self.send()
        self.assertFalse(LecturerCapacityEntry.objects.filter(plan=self.plan).exists())
        self.assertEqual(LecturerCapacityAudit.objects.count(), before)


class CapacityBulkConcurrencyTests(TransactionTestCase):
    setUp = fixtures.CapacityConcurrencyTests.setUp

    def test_batch_and_individual_edit_with_same_fingerprint_only_one_commits(self):
        from .capacity_services import update_capacity_entries_bulk, update_capacity_entry, CapacityPlanConflict
        from .models import SemesterCapacityPlan
        expected = capacity_plan_content_fingerprint(self.plan)
        barrier = Barrier(2)
        before = LecturerCapacityAudit.objects.count()
        def edit(bulk):
            close_old_connections()
            try:
                plan = SemesterCapacityPlan.objects.get(pk=self.plan.pk)
                actor = User.objects.get(pk=self.office.pk)
                lecturer = Lecturer.objects.get(pk=self.lecturer.pk)
                barrier.wait(timeout=10)
                if bulk:
                    update_capacity_entries_bulk(plan, actor=actor, entries=[{"lecturerId": lecturer.pk, "supervisorLimit": 7}], mode="REPLACE", expected_fingerprint=expected)
                else:
                    update_capacity_entry(plan, actor=actor, lecturer=lecturer, supervisor_limit=6, panel_limit=None, expected_fingerprint=expected)
                return "updated"
            except CapacityPlanConflict:
                return "conflict"
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(edit, bulk) for bulk in [True, False]]
            self.assertEqual(sorted(future.result(timeout=30) for future in futures), ["conflict", "updated"])
        self.assertEqual(LecturerCapacityAudit.objects.count(), before + 1)
        self.assertIn(LecturerCapacityEntry.objects.get(plan=self.plan).supervisor_limit, [6, 7])
