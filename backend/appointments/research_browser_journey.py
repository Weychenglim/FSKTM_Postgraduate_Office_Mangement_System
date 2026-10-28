"""Opt-in real HTTP/component acceptance for research changes and transfers."""

import json
from pathlib import Path
import subprocess

from django.db import connection
from django.test import LiveServerTestCase, override_settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from marks.completion_windows import grant_completion_windows
from marks.models import (
    EvaluationTask,
    EvaluationTaskHandoverAudit,
    EvaluationTaskLifecycleAudit,
    MarkEntry,
    MarkScore,
    TaskCompletionWindow,
    TaskCompletionWindowAudit,
)
from . import co_supervision
from . import test_appointment_lifecycle as primary_fixtures
from .models import (
    CoSupervisorAppointment,
    CoSupervisorNomination,
    PanelAppointment,
    ResearchAmendment,
    ResearchProfileRevision,
    SupervisorApplication,
    SupervisorAppointment,
)
from .test_co_supervision_lifecycle import submitted_marks


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class ResearchTransferBrowserJourney(LiveServerTestCase):
    host = "127.0.0.1"
    _lecturer = primary_fixtures.AppointmentLifecycleTests._lecturer

    def setUp(self):
        self.assertTrue(
            str(connection.settings_dict["NAME"]).startswith("test_"),
            "A disposable test database is required.",
        )
        primary_fixtures.AppointmentLifecycleTests.setUp(self)
        self.office.is_staff = False
        self.office.save(update_fields=["is_staff"])
        primary_fixtures.AppointmentLifecycleTests._panel_appointment(self)
        supporting = co_supervision.nominate(
            actor=self.supervisor,
            student_id=self.student.pk,
            candidate_id=self.new_supervisor.pk,
            justification="Existing supporting membership for transfer acceptance.",
        )
        co_supervision.decide(
            nomination_id=supporting.pk, actor=self.new_supervisor, action="accept"
        )
        co_supervision.decide(
            nomination_id=supporting.pk, actor=self.coordinator, action="approve"
        )
        self.entry, self.period = submitted_marks(self)
        draft_task = EvaluationTask.objects.create(
            profile=self.profile,
            period=self.period,
            evaluator=self.panel,
            evaluator_role="PANEL",
        )
        self.draft = MarkEntry.objects.create(
            task=draft_task, status="DRAFT", total_mark=70,
            comments="Preserved Panel draft",
        )
        MarkScore.objects.create(
            entry=self.draft, component=self.period.rubric.components.get(),
            marks_awarded=70,
        )
        grant_completion_windows(
            task_ids=[draft_task.pk], actor=self.office,
            reason="Existing approved completion window",
            deadline=timezone.now() + timezone.timedelta(days=5),
        )
        self.source_programme = self.student.programme
        self.destination_programme = "MASTER OF SOFTWARE ENGINEERING"
        self.preserved_models = (
            SupervisorApplication, SupervisorAppointment, PanelAppointment,
            CoSupervisorAppointment, CoSupervisorNomination,
            EvaluationTask, MarkEntry, MarkScore, TaskCompletionWindow,
            TaskCompletionWindowAudit, EvaluationTaskLifecycleAudit,
            EvaluationTaskHandoverAudit,
        )
        self.before = {
            model: list(model.objects.order_by("pk").values())
            for model in self.preserved_models
        }

    def run_journey(self, width):
        actors = {
            "office": self.office, "student": self.student_user,
            "primary": self.supervisor, "supporting": self.new_supervisor,
            "source": self.coordinator, "destination": self.other_coordinator,
            "unrelated": self.new_panel,
        }
        config = {
            "backend": self.live_server_url, "width": width,
            "tokens": {
                name: str(AccessToken.for_user(user)) for name, user in actors.items()
            },
            "studentId": self.student.pk, "matricNo": self.student.matric_no,
            "sourceProgramme": self.source_programme,
            "destinationProgramme": self.destination_programme,
            "originalTitle": self.profile.proposed_topic,
            "originalAbstract": self.profile.abstract,
            "supportingId": self.new_supervisor.pk,
            "primaryId": self.supervisor.pk, "panelId": self.panel.pk,
        }
        completed = subprocess.run(
            ["node", "tests/researchJourney.browser.mjs"],
            cwd=Path(__file__).resolve().parents[2] / "frontend",
            input=json.dumps(config), text=True, capture_output=True, timeout=300,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        print(completed.stdout.strip())
        for model, snapshot in self.before.items():
            self.assertEqual(
                list(model.objects.order_by("pk").values()), snapshot, model.__name__
            )
        rows = list(ResearchAmendment.objects.order_by("pk"))
        self.assertEqual(
            [row.status for row in rows],
            ["CANCELLED", "REJECTED", "APPROVED", "REJECTED", "CANCELLED",
             "REJECTED", "REJECTED", "APPROVED"],
        )
        self.assertEqual([row.events.count() for row in rows], [2, 2, 2, 2, 2, 2, 3, 3])
        self.assertEqual(rows[2].events.get(action="APPROVE").actor_id, self.supervisor.pk)
        transfer = rows[-1]
        source = transfer.events.get(action="ENDORSE")
        destination = transfer.events.get(action="APPROVE")
        self.assertEqual(source.actor_id, self.coordinator.pk)
        self.assertEqual(destination.actor_id, self.other_coordinator.pk)
        self.assertTrue(source.retain_team)
        self.assertTrue(destination.retain_team)
        self.student.refresh_from_db()
        self.profile.refresh_from_db()
        self.assertEqual(self.student.programme, self.destination_programme)
        self.assertEqual(self.profile.programme, self.destination_programme)
        self.assertEqual(self.profile.proposed_topic, "Accepted journey research title")
        self.assertEqual(self.profile.abstract, "Accepted journey research abstract.")
        self.assertEqual(self.profile.revision, 2)
        self.assertEqual(ResearchProfileRevision.objects.filter(profile=self.profile).count(), 3)
        self.assertEqual(transfer.team_snapshot["primary"]["userId"], self.supervisor.pk)
        self.assertEqual(len(transfer.team_snapshot["coSupervisors"]), 1)
        self.assertEqual(len(transfer.team_snapshot["panel"]), 1)

    def test_research_and_transfer_desktop(self):
        self.run_journey(1440)

    def test_research_and_transfer_phone(self):
        self.run_journey(390)
