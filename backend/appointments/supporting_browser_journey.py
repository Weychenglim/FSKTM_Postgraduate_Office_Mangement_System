"""Opt-in production-component/real-HTTP supporting-supervision acceptance.

Run explicitly with appointments.supporting_browser_journey. All academic
records belong to Django's disposable test database, never the development DB.
"""

import json
from pathlib import Path
import subprocess

from django.db import connection
from django.test import LiveServerTestCase, override_settings
from rest_framework_simplejwt.tokens import AccessToken

from marks.models import (
    EvaluationTask,
    EvaluationTaskHandoverAudit,
    EvaluationTaskLifecycleAudit,
    MarkEntry,
    MarkScore,
)
from .models import (
    CoSupervisorAppointment,
    CoSupervisorNomination,
    PanelAppointment,
    StudentResearchProfile,
    SupervisorAppointment,
)
from . import test_appointment_lifecycle as primary_fixtures
from .test_co_supervision_lifecycle import submitted_marks


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class SupportingSupervisionBrowserJourney(LiveServerTestCase):
    host = "127.0.0.1"

    def _lecturer(self, email, staff_no, *, supervisor=False, panel=False):
        # Establish both incoming candidates' supervision eligibility before
        # the shared fixture publishes its immutable capacity policy.
        return primary_fixtures.AppointmentLifecycleTests._lecturer(
            self, email, staff_no, supervisor=supervisor or panel, panel=panel
        )

    def setUp(self):
        self.assertTrue(
            str(connection.settings_dict["NAME"]).startswith("test_"),
            "A disposable test database is required.",
        )
        primary_fixtures.AppointmentLifecycleTests.setUp(self)
        self.office.is_staff = True
        self.office.save(update_fields=["is_staff"])
        self.panel_appointment = (
            primary_fixtures.AppointmentLifecycleTests._panel_appointment(self)
        )
        self.entry, self.period = submitted_marks(self)
        self.first = self.new_supervisor
        self.second = self.new_panel
        for user, name in (
            (self.first, "Journey supporting candidate One"),
            (self.second, "Journey supporting candidate Two"),
        ):
            user.full_name = name
            user.save(update_fields=["full_name"])
        self.preserved_models = (
            SupervisorAppointment,
            PanelAppointment,
            StudentResearchProfile,
            EvaluationTask,
            MarkEntry,
            MarkScore,
            EvaluationTaskLifecycleAudit,
            EvaluationTaskHandoverAudit,
        )
        self.before = {
            model: list(model.objects.order_by("pk").values())
            for model in self.preserved_models
        }

    def run_journey(self, width):
        actors = {
            "office": self.office,
            "primary": self.supervisor,
            "first": self.first,
            "second": self.second,
            "coordinator": self.coordinator,
            "foreignCoordinator": self.other_coordinator,
            "student": self.student_user,
        }
        config = {
            "backend": self.live_server_url,
            "width": width,
            "tokens": {
                name: str(AccessToken.for_user(user)) for name, user in actors.items()
            },
            "first": {"id": self.first.pk, "name": self.first.full_name},
            "second": {"id": self.second.pk, "name": self.second.full_name},
            "studentId": self.student.pk,
            "matricNo": self.student.matric_no,
            "taskId": self.entry.task_id,
            "applicationId": self.application.pk,
            "panelId": self.panel.pk,
        }
        completed = subprocess.run(
            ["node", "tests/supportingJourney.browser.mjs"],
            cwd=Path(__file__).resolve().parents[2] / "frontend",
            input=json.dumps(config),
            text=True,
            capture_output=True,
            timeout=240,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        print(completed.stdout.strip())
        for model, snapshot in self.before.items():
            self.assertEqual(
                list(model.objects.order_by("pk").values()), snapshot, model.__name__
            )
        nominations = list(CoSupervisorNomination.objects.order_by("pk"))
        self.assertEqual(
            [row.status for row in nominations],
            [
                "REJECTED_BY_CO_SUPERVISOR",
                "CANCELLED",
                "REJECTED_BY_COORDINATOR",
                "APPROVED",
                "APPROVED",
            ],
        )
        self.assertEqual(
            [row.workflow_events.count() for row in nominations], [2, 2, 3, 3, 3]
        )
        for row in nominations[3:]:
            approval = row.workflow_events.get(action="APPROVE")
            self.assertEqual(approval.actor_id, self.coordinator.pk)
        appointments = list(CoSupervisorAppointment.objects.order_by("pk"))
        self.assertEqual(len(appointments), 2)
        outgoing, incoming = appointments
        self.assertEqual((outgoing.status, incoming.status), ("ENDED", "ENDED"))
        self.assertEqual(incoming.supersedes_id, outgoing.pk)
        self.assertEqual(incoming.end_outcome, "COMPLETED")
        self.assertEqual(incoming.end_reason, "Private supporting closure reason")
        self.assertEqual([row.lifecycle_events.count() for row in appointments], [2, 2])
        self.assertFalse(
            EvaluationTask.objects.filter(evaluator__in=[self.first, self.second]).exists()
        )

    def test_supporting_supervision_desktop(self):
        self.run_journey(1440)

    def test_supporting_supervision_phone(self):
        self.run_journey(390)
