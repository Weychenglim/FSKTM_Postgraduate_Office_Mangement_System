"""Opt-in real HTTP carryover and semester journeys; test databases only."""

from datetime import timedelta
import json
from pathlib import Path
import subprocess

from django.db import connection
from django.test import LiveServerTestCase, override_settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from academics.models import AcademicSemester, AcademicSemesterAudit, LecturerAvailabilityWindow
from academics.test_capacity_helpers import publish_test_capacity_plan
from marks.completion_windows import grant_completion_windows
from marks.models import (
    EvaluationTask, EvaluationTaskHandoverAudit, EvaluationTaskLifecycleAudit,
    MarkEntry, MarkScore, MarksConfigurationAudit, TaskCompletionWindow,
    TaskCompletionWindowAudit,
)
from . import co_supervision, test_appointment_lifecycle as fixtures
from .models import (
    CoSupervisorAppointment, PanelAppointment, PanelRecommendation,
    SupervisorApplication, SupervisorAppointment,
)
from .test_co_supervision_lifecycle import submitted_marks


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class CarryoverBrowserJourney(LiveServerTestCase):
    host = "127.0.0.1"
    _lecturer = fixtures.AppointmentLifecycleTests._lecturer

    def setUp(self):
        self.assertTrue(str(connection.settings_dict["NAME"]).startswith("test_"))
        fixtures.AppointmentLifecycleTests.setUp(self)
        self.office.is_staff = False
        self.office.save(update_fields=["is_staff"])
        self.entry, self.period = submitted_marks(self)
        self.preserved_models = (
            MarkEntry, MarkScore, EvaluationTask, EvaluationTaskLifecycleAudit,
            EvaluationTaskHandoverAudit, TaskCompletionWindow, TaskCompletionWindowAudit,
        )

    def snapshot(self):
        self.before = {
            model: list(model.objects.order_by("pk").values())
            for model in self.preserved_models
        }
        self.original_application = SupervisorApplication.objects.values().get(pk=self.application.pk)

    def run_journey(self, width, mode, **config):
        actors = {
            "office": self.office, "coordinator": self.coordinator,
            "acting": self.other_coordinator, "student": self.student_user,
            "primary": self.supervisor, "panel": self.panel,
        }
        payload = {
            "backend": self.live_server_url, "width": width, "mode": mode,
            "tokens": {key: str(AccessToken.for_user(user)) for key, user in actors.items()},
            "sourceId": self.semester.pk, "sourceLabel": self.semester.label,
            "activeId": self.target.pk, "targetLabel": self.target.label,
            "matricNo": self.student.matric_no, "entryId": self.entry.pk,
            **config,
        }
        result = subprocess.run(
            ["node", "tests/carryoverJourney.browser.mjs"],
            cwd=Path(__file__).resolve().parents[2] / "frontend",
            input=json.dumps(payload), text=True, capture_output=True, timeout=300,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        print(result.stdout.strip())
        for model, before in self.before.items():
            self.assertEqual(list(model.objects.order_by("pk").values()), before, model.__name__)
        self.assertEqual(
            SupervisorApplication.objects.values().get(pk=self.application.pk),
            self.original_application,
        )

    def target_semester(self, status="ACTIVE"):
        today = timezone.localdate()
        self.target = AcademicSemester.objects.create(
            code="2100-2101-S2", academic_session="2100/2101", term="SEMESTER_II",
            starts_on=today, ends_on=today + timedelta(days=90),
            lifecycle_status=status, created_by=self.office,
        )
        publish_test_capacity_plan(self.target, self.office)

    def reassessment(self, width, kind):
        if kind == "SUPERVISOR":
            row = SupervisorApplication.objects.create(
                student=self.student, academic_semester=self.semester,
                proposed_supervisor=self.new_supervisor, research_title="Carryover research",
                research_area="AI", research_abstract="Fictional carryover replacement",
                status="PENDING_COORDINATOR", replaces_appointment=self.supervisor_appointment,
                replacement_reason="Acceptance replacement",
            )
            candidate = self.new_supervisor
            approve_path = f"/appointments/supervisor/applications/{row.pk}/coordinator-approve/"
        elif kind == "CO_SUPERVISOR":
            row = co_supervision.nominate(
                actor=self.supervisor, student_id=self.student.pk,
                candidate_id=self.new_supervisor.pk, justification="Carryover support",
            )
            co_supervision.decide(nomination_id=row.pk, actor=self.new_supervisor, action="accept")
            row.refresh_from_db()
            candidate = self.new_supervisor
            approve_path = f"/appointments/co-supervisor/nominations/{row.pk}/approve/"
        else:
            row = PanelRecommendation.objects.create(
                profile=self.profile, academic_semester=self.semester,
                supervisor=self.supervisor, recommended_member=self.panel,
                status="PENDING_COORDINATOR", panel_decided_at=timezone.now(),
            )
            candidate = self.panel
            approve_path = f"/appointments/panel/recommendations/{row.pk}/coordinator-approve/"
        AcademicSemester.objects.filter(pk=self.semester.pk).update(lifecycle_status="CLOSED")
        self.period.lifecycle_status = "CLOSED"
        self.period.is_open = False
        self.period.save()
        self.target_semester()
        today = timezone.localdate()
        LecturerAvailabilityWindow.objects.create(
            academic_semester=self.semester, lecturer=candidate.lecturer,
            starts_on=today, ends_on=today,
            role="PANEL" if kind == "PANEL" else "SUPERVISOR",
            reason="Private original-semester unavailability", created_by=self.office,
        )
        self.snapshot()
        self.run_journey(width, kind, requestId=row.pk, approvePath=approve_path)
        row.refresh_from_db()
        self.assertEqual(row.status, "APPROVED")
        self.assertEqual(row.academic_semester_id, self.semester.pk)
        events = list(row.capacity_reassessments.order_by("pk"))
        self.assertEqual(
            [event.action for event in events],
            ["GRANTED", "REPLACED", "REVOKED", "GRANTED", "REPLACED", "CONSUMED"],
        )
        self.assertTrue(all(event.actor_id == self.office.pk for event in events[:-1]))
        self.assertEqual(events[-1].actor_id, self.coordinator.pk)
        self.assertEqual(events[-1].policy["semesterId"], self.target.pk)
        self.assertEqual(events[-1].policy["planId"], self.target.capacity_plans.get(lifecycle_status="PUBLISHED").pk)
        if kind == "SUPERVISOR":
            self.assertTrue(SupervisorAppointment.objects.filter(application=row, status="ACTIVE").exists())
        elif kind == "CO_SUPERVISOR":
            self.assertTrue(CoSupervisorAppointment.objects.filter(nomination=row, status="ACTIVE").exists())
        else:
            self.assertTrue(PanelAppointment.objects.filter(recommendation=row, status="ACTIVE").exists())

    def handover(self, width):
        today = timezone.localdate()
        AcademicSemester.objects.filter(pk=self.semester.pk).update(ends_on=today - timedelta(days=1))
        self.target_semester("DRAFT")
        recommendation = PanelRecommendation.objects.create(
            profile=self.profile, academic_semester=self.semester,
            supervisor=self.supervisor, recommended_member=self.panel, status="APPROVED",
        )
        PanelAppointment.objects.create(
            recommendation=recommendation, profile=self.profile,
            panel_member=self.panel, supervisor=self.supervisor, approved_by=self.coordinator,
        )
        draft_task = EvaluationTask.objects.create(
            period=self.period, profile=self.profile, evaluator=self.panel, evaluator_role="PANEL",
        )
        draft = MarkEntry.objects.create(task=draft_task, status="DRAFT", total_mark=70, comments="Retained semester draft")
        MarkScore.objects.create(entry=draft, component=self.period.rubric.components.get(), marks_awarded=70)
        window = grant_completion_windows(
            task_ids=[draft_task.pk], deadline=timezone.now() + timedelta(days=6),
            reason="Handover acceptance completion window", actor=self.office,
        )[0]
        self.snapshot()
        academic_before = {
            model: list(model.objects.order_by("pk").values())
            for model in (SupervisorAppointment, PanelAppointment, PanelRecommendation)
        }
        self.run_journey(width, "HANDOVER", draftTaskId=draft_task.pk, windowId=window.pk, periodId=self.period.pk)
        self.semester.refresh_from_db()
        self.target.refresh_from_db()
        self.period.refresh_from_db()
        self.assertEqual(self.semester.lifecycle_status, "CLOSED")
        self.assertEqual(self.target.lifecycle_status, "ACTIVE")
        self.assertEqual(self.period.lifecycle_status, "CLOSED")
        self.assertFalse(self.period.is_open)
        audits = list(AcademicSemesterAudit.objects.order_by("pk"))
        self.assertEqual([row.action for row in audits], ["HANDOVER_CLOSE", "ACTIVATE"])
        self.assertTrue(all(row.actor_id == self.office.pk and row.reason == "Semester acceptance handover" for row in audits))
        self.assertEqual(MarksConfigurationAudit.objects.filter(action="SEMESTER_CLOSE", entity_id=self.period.pk).count(), 1)
        for model, before in academic_before.items():
            self.assertEqual(list(model.objects.order_by("pk").values()), before)

    def test_primary_desktop(self):
        self.reassessment(1440, "SUPERVISOR")

    def test_primary_phone(self):
        self.reassessment(390, "SUPERVISOR")

    def test_supporting_desktop(self):
        self.reassessment(1440, "CO_SUPERVISOR")

    def test_supporting_phone(self):
        self.reassessment(390, "CO_SUPERVISOR")

    def test_panel_desktop(self):
        self.reassessment(1440, "PANEL")

    def test_panel_phone(self):
        self.reassessment(390, "PANEL")

    def test_handover_desktop(self):
        self.handover(1440)

    def test_handover_phone(self):
        self.handover(390)
