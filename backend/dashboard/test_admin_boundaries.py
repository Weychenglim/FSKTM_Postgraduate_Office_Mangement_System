from django.contrib import admin
from django.test import Client, RequestFactory
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from appointments import test_dashboard_timeline as fixture
from .models import SemesterTimeline, SemesterTimelineEntry, TimelineAuditLog


class TimelineAdminBoundaryTests(APITestCase):
    setUp = fixture.DashboardTimelineApiTests.setUp

    def records(self):
        self.admin.is_staff = True
        self.admin.is_superuser = True
        self.admin.save(update_fields=["is_staff", "is_superuser"])
        timeline = SemesterTimeline.objects.create(
            academic_semester=self.academic_semester,
            semester=self.academic_semester.get_term_display(),
            session=self.academic_semester.academic_session,
            uploaded_by=self.admin,
        )
        entry = SemesterTimelineEntry.objects.create(
            timeline=timeline, level="P1", step=1, title="Audited milestone",
            detail="Keep this entry", action_owner="Student",
            deadline_start=timezone.localdate(), deadline_end=timezone.localdate(),
            target_roles=["STUDENT"],
        )
        audit = TimelineAuditLog.objects.create(
            timeline=timeline, entry=entry, actor=self.admin,
            action="ADD_ENTRY", summary="Original audited creation",
        )
        return timeline, entry, audit

    def test_timeline_audit_and_inline_are_viewable_but_have_no_write_permissions(self):
        timeline, entry, audit = self.records()
        request = RequestFactory().get("/admin/")
        request.user = self.admin
        for record in (timeline, audit):
            model_admin = admin.site._registry[type(record)]
            with self.subTest(model=record._meta.model_name):
                self.assertTrue(model_admin.has_view_permission(request, record))
                self.assertFalse(model_admin.has_add_permission(request))
                self.assertFalse(model_admin.has_change_permission(request, record))
                self.assertFalse(model_admin.has_delete_permission(request, record))
                self.assertEqual(model_admin.get_form(request, record).base_fields, {})
                self.assertNotIn("delete_selected", model_admin.get_actions(request))
        inline = admin.site._registry[SemesterTimeline].get_inline_instances(request, timeline)[0]
        self.assertTrue(inline.has_view_permission(request, timeline))
        self.assertFalse(inline.has_add_permission(request, timeline))
        self.assertFalse(inline.has_change_permission(request, timeline))
        self.assertFalse(inline.has_delete_permission(request, timeline))
        self.assertEqual(inline.get_formset(request, timeline).form.base_fields, {})

    def test_admin_posts_cannot_change_timeline_inline_or_forge_and_delete_audits(self):
        timeline, entry, audit = self.records()
        client = Client()
        client.force_login(self.admin)
        snapshots = [(record, type(record).objects.values().get(pk=record.pk))
                     for record in (timeline, entry, audit)]
        for record in (timeline, audit):
            opts = record._meta
            route = f"admin:{opts.app_label}_{opts.model_name}"
            with self.subTest(model=opts.model_name):
                self.assertEqual(client.get(reverse(f"{route}_change", args=[record.pk])).status_code, 200)
                response = client.post(reverse(f"{route}_change", args=[record.pk]), {
                    "semester": "Unaudited semester", "summary": "Forged history",
                    "entries-TOTAL_FORMS": "1", "entries-INITIAL_FORMS": "1",
                    "entries-0-id": entry.pk, "entries-0-detail": "Unaudited inline edit",
                    "entries-0-DELETE": "on", "_save": "Save",
                })
                self.assertEqual(response.status_code, 403)
                self.assertEqual(client.post(reverse(f"{route}_add"), {}).status_code, 403)
                self.assertEqual(client.post(reverse(f"{route}_delete", args=[record.pk]),
                                             {"post": "yes"}).status_code, 403)
                client.post(reverse(f"{route}_changelist"), {
                    "action": "delete_selected", "_selected_action": [record.pk], "post": "yes",
                })
        for record, before in snapshots:
            self.assertEqual(type(record).objects.values().get(pk=record.pk), before)
        self.assertEqual(TimelineAuditLog.objects.count(), 1)
