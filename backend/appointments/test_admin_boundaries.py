from django.contrib import admin
from django.test import Client, RequestFactory
from django.urls import reverse
from rest_framework.test import APITestCase

from marks.models import EvaluationPeriod, EvaluationTask, MarkEntry, Rubric
from . import test_appointment_lifecycle as fixture
from .models import (
    AppointmentLifecycleEvent,
    AppointmentWorkflowEvent,
    PanelAppointment,
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorAppointment,
    SupervisorDocumentRequirement,
    SupervisorDocumentRequirementAudit,
)


class AppointmentAdminBoundaryTests(APITestCase):
    setUp = fixture.AppointmentLifecycleTests.setUp
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    _panel_appointment = fixture.AppointmentLifecycleTests._panel_appointment

    def records(self):
        panel = self._panel_appointment()
        workflow = AppointmentWorkflowEvent.objects.create(
            actor=self.coordinator, actor_role=self.coordinator.role,
            action="COORDINATOR_APPROVE", previous_status="PENDING_COORDINATOR",
            new_status="APPROVED", supervisor_application=self.application,
        )
        return [self.application, self.supervisor_appointment, panel.recommendation,
                panel, SupervisorDocumentRequirement.objects.get(code="research-proposal"),
                workflow]

    def admin_request(self):
        self.office.is_staff = True
        self.office.is_superuser = True
        self.office.save(update_fields=["is_staff", "is_superuser"])
        request = RequestFactory().get("/admin/")
        request.user = self.office
        return request

    def test_governed_records_are_viewable_with_no_editable_fields_or_write_permissions(self):
        request = self.admin_request()
        for record in self.records():
            model_admin = admin.site._registry[type(record)]
            with self.subTest(model=record._meta.model_name):
                self.assertTrue(model_admin.has_view_permission(request, record))
                self.assertFalse(model_admin.has_add_permission(request))
                self.assertFalse(model_admin.has_change_permission(request, record))
                self.assertFalse(model_admin.has_delete_permission(request, record))
                self.assertEqual(model_admin.get_form(request, record).base_fields, {})
                self.assertNotIn("delete_selected", model_admin.get_actions(request))

    def test_admin_posts_cannot_change_or_delete_workflow_state_and_dependent_marks(self):
        records = self.records()
        self.admin_request()
        rubric = Rubric.objects.create(code="admin-boundary", name="Admin boundary")
        period = EvaluationPeriod.objects.create(
            name="Boundary period", semester=self.semester.label,
            academic_semester=self.semester, rubric=rubric,
        )
        task = EvaluationTask.objects.create(
            profile=self.profile, period=period, evaluator=self.supervisor,
            evaluator_role="SUPERVISOR",
        )
        entry = MarkEntry.objects.create(task=task, status="DRAFT", comments="Preserve this draft")
        client = Client()
        client.force_login(self.office)
        for record in records:
            model = type(record)
            opts = record._meta
            before = model.objects.values().get(pk=record.pk)
            with self.subTest(model=opts.model_name):
                detail = client.get(reverse(f"admin:{opts.app_label}_{opts.model_name}_change", args=[record.pk]))
                self.assertEqual(detail.status_code, 200)
                edited = client.post(reverse(f"admin:{opts.app_label}_{opts.model_name}_change", args=[record.pk]),
                    {"status": "ENDED", "supervisor": self.new_supervisor.pk,
                     "proposed_supervisor": self.new_supervisor.pk, "label": "Unaudited label",
                     "is_required": "", "_save": "Save"})
                self.assertEqual(edited.status_code, 403)
                deleted = client.post(reverse(f"admin:{opts.app_label}_{opts.model_name}_delete", args=[record.pk]), {"post": "yes"})
                self.assertEqual(deleted.status_code, 403)
                created = client.post(reverse(f"admin:{opts.app_label}_{opts.model_name}_add"), {})
                self.assertEqual(created.status_code, 403)
                bulk = client.post(reverse(f"admin:{opts.app_label}_{opts.model_name}_changelist"),
                    {"action": "delete_selected", "_selected_action": [record.pk], "post": "yes"})
                self.assertIn(bulk.status_code, (200, 302))
                self.assertEqual(model.objects.values().get(pk=record.pk), before)
        entry.refresh_from_db()
        task.refresh_from_db()
        self.assertEqual(entry.comments, "Preserve this draft")
        self.assertEqual(entry.status, "DRAFT")
        self.assertEqual(task.lifecycle_status, "ACTIVE")
        self.assertEqual(task.evaluator, self.supervisor)
        self.assertEqual(AppointmentWorkflowEvent.objects.count(), 1)
        self.assertFalse(AppointmentLifecycleEvent.objects.exists())
        self.assertFalse(SupervisorDocumentRequirementAudit.objects.exists())

    def test_profile_provisioning_stays_available_but_existing_profile_is_read_only(self):
        request = self.admin_request()
        model_admin = admin.site._registry[StudentResearchProfile]
        self.assertTrue(model_admin.has_add_permission(request))
        self.assertIn("supervisor", model_admin.get_form(request).base_fields)
        self.assertIn("proposed_topic", model_admin.get_form(request).base_fields)
        self.assertFalse(model_admin.has_change_permission(request, self.profile))
        self.assertFalse(model_admin.has_delete_permission(request, self.profile))
        self.assertEqual(model_admin.get_form(request, self.profile).base_fields, {})

    def test_profile_admin_post_cannot_reassign_existing_supervisor(self):
        self.admin_request()
        client = Client()
        client.force_login(self.office)
        response = client.post(reverse("admin:appointments_studentresearchprofile_change", args=[self.profile.pk]),
                               {"supervisor": self.new_supervisor.pk, "_save": "Save"})
        self.assertEqual(response.status_code, 403)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.supervisor, self.supervisor)
