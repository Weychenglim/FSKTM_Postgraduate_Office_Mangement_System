"""Targeting migration retains the legacy recipient scope of existing periods."""

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class PeriodTargetingMigrationTests(TransactionTestCase):
    def test_existing_periods_retain_all_programmes_and_both_official_roles(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        before = [("marks", "0007_evaluationtask_pause_reason_evaluationtask_paused_at_and_more")]
        after = [("marks", "0008_evaluation_period_targeting")]
        try:
            executor.migrate(before)
            old_apps = executor.loader.project_state(before).apps
            Rubric = old_apps.get_model("marks", "Rubric")
            Period = old_apps.get_model("marks", "EvaluationPeriod")
            rubric = Rubric.objects.create(name="Legacy targeting rubric", code="legacy-targeting")
            period_ids = [
                Period.objects.create(
                    name=f"Legacy {state}", semester="Legacy semester", rubric=rubric,
                    lifecycle_status=state, is_open=state == "PUBLISHED",
                ).pk
                for state in ("DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED")
            ]
            User = old_apps.get_model("accounts", "User")
            Profile = old_apps.get_model("appointments", "StudentResearchProfile")
            Task = old_apps.get_model("marks", "EvaluationTask")
            Entry = old_apps.get_model("marks", "MarkEntry")
            Score = old_apps.get_model("marks", "MarkScore")
            Component = old_apps.get_model("marks", "RubricComponent")
            evaluator = User.objects.create(
                email="migration-evaluator@example.test", full_name="Historical evaluator",
                role="LECTURER", password="!",
            )
            profile = Profile.objects.create(
                matric_no="TARGET-MIGRATION", student_name="Historical student",
                programme="Original programme", semester="Legacy semester",
                proposed_topic="Historical research", supervisor=evaluator,
            )
            component = Component.objects.create(
                rubric=rubric, code="historical-score", name="Historical score", max_marks="100.00",
            )
            for entry_status, period_id in zip(("DRAFT", "SUBMITTED"), period_ids[1:3]):
                task = Task.objects.create(profile=profile, evaluator=evaluator, period_id=period_id)
                entry = Entry.objects.create(task=task, status=entry_status, total_mark="87.00", comments="Preserved feedback")
                Score.objects.create(entry=entry, component=component, marks_awarded="87.00")
            preserved = {
                name: list(old_apps.get_model("marks", name).objects.order_by("pk").values())
                for name in ("EvaluationTask", "MarkEntry", "MarkScore")
            }
            executor = MigrationExecutor(connection)
            executor.migrate(after)
            new_apps = executor.loader.project_state(after).apps
            Period = new_apps.get_model("marks", "EvaluationPeriod")
            for period in Period.objects.filter(pk__in=period_ids):
                with self.subTest(state=period.lifecycle_status):
                    self.assertEqual(period.programme_scope, "ALL")
                    self.assertEqual(period.programmes, [])
                    self.assertEqual(period.evaluator_roles, ["SUPERVISOR", "PANEL"])
            self.assertEqual(Period.objects.filter(pk__in=period_ids).count(), 4)
            for name, rows in preserved.items():
                self.assertEqual(list(new_apps.get_model("marks", name).objects.order_by("pk").values()), rows)
        finally:
            MigrationExecutor(connection).migrate(latest)
