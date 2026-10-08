"""Shared configuration used by all five owned workflows cannot bypass audits."""
from django.contrib import admin
from django.test import Client, RequestFactory, TestCase
from django.urls import reverse

from . import test_capacity as fixture
from .models import (
    AcademicSemester, AcademicSemesterAudit, LecturerAvailabilityWindow,
    LecturerCapacityEntry, LecturerCapacityAudit, SemesterCapacityPlan,
)


class AcademicConfigurationAdminBoundaryTests(TestCase):
    setUp = fixture.CapacityModelTests.setUp
    create_plan = fixture.CapacityModelTests.create_plan
    availability_values = fixture.CapacityModelTests.availability_values

    def admin_client(self):
        self.office.is_superuser = True
        self.office.save(update_fields=["is_superuser"])
        client = Client(raise_request_exception=False)
        client.force_login(self.office)
        return client

    def test_semester_lifecycle_cannot_bypass_closure_and_audit_services(self):
        self.semester.lifecycle_status = "ACTIVE"
        self.semester.save(update_fields=["lifecycle_status"])
        before = AcademicSemester.objects.values().get(pk=self.semester.pk)
        response = self.admin_client().post(reverse("admin:academics_academicsemester_change", args=[self.semester.pk]), {
            "academic_session": "2026/2027", "term": "SEMESTER_I",
            "starts_on": "2026-09-01", "ends_on": "2027-01-31",
            "lifecycle_status": "CLOSED", "created_by": self.office.pk, "_save": "Save",
        })
        self.assertEqual(response.status_code, 403)
        self.assertEqual(AcademicSemester.objects.values().get(pk=self.semester.pk), before)
        self.assertFalse(AcademicSemesterAudit.objects.exists())

    def test_draft_capacity_plan_cannot_be_created_without_configuration_audit(self):
        response = self.admin_client().post(reverse("admin:academics_semestercapacityplan_add"), {
            "academic_semester": self.semester.pk, "version": "1", "origin": "CREATED",
            "created_by": self.office.pk, "_save": "Save",
        })
        self.assertEqual(response.status_code, 403)
        self.assertFalse(SemesterCapacityPlan.objects.exists())
        self.assertFalse(LecturerCapacityAudit.objects.exists())

    def test_capacity_entry_cannot_be_changed_without_configuration_audit(self):
        plan = self.create_plan()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan, lecturer=self.lecturer, supervisor_limit=4, panel_limit=8,
            updated_by=self.office,
        )
        before = LecturerCapacityEntry.objects.values().get(pk=entry.pk)
        response = self.admin_client().post(reverse("admin:academics_lecturercapacityentry_change", args=[entry.pk]), {
            "plan": plan.pk, "lecturer": self.lecturer.pk, "supervisor_limit": "0",
            "panel_limit": "8", "updated_by": self.office.pk, "_save": "Save",
        })
        self.assertEqual(response.status_code, 403)
        self.assertEqual(LecturerCapacityEntry.objects.values().get(pk=entry.pk), before)
        self.assertFalse(LecturerCapacityAudit.objects.exists())

    def test_availability_cannot_be_created_without_configuration_audit(self):
        response = self.admin_client().post(reverse("admin:academics_lectureravailabilitywindow_add"), {
            "academic_semester": self.semester.pk, "lecturer": self.lecturer.pk,
            "role": "SUPERVISOR", "starts_on": "2026-09-01", "ends_on": "2026-09-06",
            "reason": "Unaudited leave", "created_by": self.office.pk, "_save": "Save",
        })
        self.assertEqual(response.status_code, 403)
        self.assertFalse(LecturerAvailabilityWindow.objects.exists())
        self.assertFalse(LecturerCapacityAudit.objects.exists())

    def test_governed_configuration_is_viewable_but_all_write_routes_are_denied(self):
        plan = self.create_plan()
        entry = LecturerCapacityEntry.objects.create(
            plan=plan, lecturer=self.lecturer, supervisor_limit=4, panel_limit=8, updated_by=self.office,
        )
        window = LecturerAvailabilityWindow.objects.create(**self.availability_values())
        client = self.admin_client()
        request = RequestFactory().get("/admin/")
        request.user = self.office
        for record in (self.semester, plan, entry, window):
            with self.subTest(model=record._meta.model_name):
                model_admin = admin.site._registry[type(record)]
                self.assertEqual(model_admin.get_form(request, record).base_fields, {})
                opts = record._meta
                route = f"admin:{opts.app_label}_{opts.model_name}"
                before = type(record).objects.values().get(pk=record.pk)
                self.assertEqual(client.get(reverse(f"{route}_change", args=[record.pk])).status_code, 200)
                self.assertEqual(client.post(reverse(f"{route}_add"), {}).status_code, 403)
                self.assertEqual(client.post(reverse(f"{route}_change", args=[record.pk]), {}).status_code, 403)
                self.assertEqual(client.post(reverse(f"{route}_delete", args=[record.pk]), {"post": "yes"}).status_code, 403)
                client.post(reverse(f"{route}_changelist"), {
                    "action": "delete_selected", "_selected_action": [record.pk], "post": "yes",
                })
                self.assertEqual(type(record).objects.values().get(pk=record.pk), before)
