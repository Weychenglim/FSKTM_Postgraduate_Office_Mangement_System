from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import override_settings
from rest_framework.test import APITransactionTestCase

from marks import test_completion_windows as fixture


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class CapacityReassessmentMigrationTests(APITransactionTestCase):
    setUp = fixture.CompletionWindowTests.setUp
    user = fixture.CompletionWindowTests.user
    lecturer = fixture.CompletionWindowTests.lecturer
    profile = fixture.CompletionWindowTests.profile
    payload = fixture.CompletionWindowTests.payload
    period = fixture.CompletionWindowTests.period
    publish = fixture.CompletionWindowTests.publish
    grant = fixture.CompletionWindowTests.grant

    def test_additive_schema_preserves_appointments_marks_and_completion_history(self):
        self.assertEqual(self.grant().status_code, 201)
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        before_targets = [node for node in latest if node[0] != "appointments"] + [
            ("appointments", "0014_research_revision_baselines")
        ]
        try:
            executor.migrate(before_targets)
            apps = executor.loader.project_state(before_targets).apps
            Task = apps.get_model("marks", "EvaluationTask")
            Entry = apps.get_model("marks", "MarkEntry")
            Score = apps.get_model("marks", "MarkScore")
            submitted = Entry.objects.create(
                task_id=self.task.pk, status="SUBMITTED", total_mark=81
            )
            backup = Task.objects.create(
                period_id=self.period_obj.pk,
                evaluator_id=self.panel.pk,
                profile_id=self.student_profile.pk,
                evaluator_role="BACKUP",
            )
            draft = Entry.objects.create(task=backup, status="DRAFT", total_mark=72)
            for entry, score in ((submitted, 81), (draft, 72)):
                Score.objects.create(
                    entry=entry,
                    component_id=self.rubric.components.get().pk,
                    marks_awarded=score,
                    feedback="Preserve original feedback",
                )
            labels = (
                "accounts.Student",
                "appointments.SupervisorApplication",
                "appointments.SupervisorAppointment",
                "appointments.PanelRecommendation",
                "appointments.PanelAppointment",
                "appointments.StudentResearchProfile",
                "appointments.ResearchProfileRevision",
                "marks.EvaluationPeriod",
                "marks.EvaluationTask",
                "marks.MarkEntry",
                "marks.MarkScore",
                "marks.TaskCompletionWindow",
                "marks.TaskCompletionWindowAudit",
            )
            snapshots = {
                label: list(apps.get_model(label).objects.order_by("pk").values())
                for label in labels
            }
            old_models = {
                model._meta.label for model in apps.get_app_config("appointments").get_models()
            }
            executor = MigrationExecutor(connection)
            executor.migrate(latest)
            migrated = executor.loader.project_state(latest).apps
            for label, rows in snapshots.items():
                with self.subTest(model=label):
                    self.assertEqual(
                        list(migrated.get_model(label).objects.order_by("pk").values()), rows
                    )
            added_models = [
                model
                for model in migrated.get_app_config("appointments").get_models()
                if model._meta.label not in old_models
            ]
            self.assertTrue(added_models, "The reassessment migration must add its records.")
            for model in added_models:
                self.assertFalse(model.objects.exists(), "Do not infer historical authorizations.")
        finally:
            MigrationExecutor(connection).migrate(latest)
