from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import override_settings
from rest_framework.test import APITransactionTestCase

from . import test_completion_windows as fixture


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class CompletionMigrationTests(APITransactionTestCase):
    setUp = fixture.CompletionWindowTests.setUp
    user = fixture.CompletionWindowTests.user
    lecturer = fixture.CompletionWindowTests.lecturer
    profile = fixture.CompletionWindowTests.profile
    payload = fixture.CompletionWindowTests.payload
    period = fixture.CompletionWindowTests.period
    publish = fixture.CompletionWindowTests.publish

    def test_existing_assignments_drafts_and_submitted_scores_are_preserved(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        before_target = [node for node in latest if node[0] != 'marks'] + [('marks', '0008_evaluation_period_targeting')]
        labels = ('appointments.SupervisorAppointment', 'appointments.PanelAppointment',
                  'appointments.StudentResearchProfile', 'marks.EvaluationPeriod',
                  'marks.EvaluationTask', 'marks.MarkEntry', 'marks.MarkScore')
        try:
            executor.migrate(before_target)
            apps = executor.loader.project_state(before_target).apps
            Entry = apps.get_model('marks', 'MarkEntry')
            Task = apps.get_model('marks', 'EvaluationTask')
            Score = apps.get_model('marks', 'MarkScore')
            submitted = Entry.objects.create(task_id=self.task.pk, status='SUBMITTED', total_mark=81)
            other = Task.objects.create(period_id=self.period_obj.pk, evaluator_id=self.panel.pk,
                                        profile_id=self.student_profile.pk, evaluator_role='PANEL')
            draft = Entry.objects.create(task=other, status='DRAFT', total_mark=72)
            for entry, mark in ((submitted, 81), (draft, 72)):
                Score.objects.create(entry=entry, component_id=self.rubric.components.get().pk,
                                     marks_awarded=mark, feedback='Preserved feedback')
            before = {label: list(apps.get_model(label).objects.order_by('pk').values()) for label in labels}
            executor = MigrationExecutor(connection)
            executor.migrate(latest)
            apps = executor.loader.project_state(latest).apps
            for label, rows in before.items():
                if rows:
                    self.assertEqual(list(apps.get_model(label).objects.order_by('pk').values(*rows[0])), rows)
            self.assertFalse(apps.get_model('marks', 'TaskCompletionWindow').objects.exists())
            self.assertFalse(apps.get_model('marks', 'MarkEntry').objects.filter(submitted_due_recorded=True).exists())
        finally:
            MigrationExecutor(connection).migrate(latest)
