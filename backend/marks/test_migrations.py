from decimal import Decimal

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone


class MarksConfigurationMigrationTests(TransactionTestCase):
    migrate_from = (
        "marks",
        "0002_evaluationtask_evaluator_role_and_override_audit",
    )
    migrate_to = (
        "marks",
        "0003_marksconfigurationaudit_evaluationperiod_archived_at_and_more",
    )

    def setUp(self):
        super().setUp()
        executor = MigrationExecutor(connection)
        executor.migrate([self.migrate_from])
        old_apps = executor.loader.project_state([self.migrate_from]).apps

        Rubric = old_apps.get_model("marks", "Rubric")
        RubricComponent = old_apps.get_model("marks", "RubricComponent")
        EvaluationPeriod = old_apps.get_model("marks", "EvaluationPeriod")

        self.rubric = Rubric.objects.create(
            name="Legacy Faculty Evaluation",
            code="legacy-faculty-evaluation",
            description="Persisted before versioned rubric support.",
            is_active=True,
        )
        self.component_ids = [
            RubricComponent.objects.create(
                rubric=self.rubric,
                code="research",
                name="Research",
                max_marks=Decimal("70.00"),
                display_order=4,
            ).pk,
            RubricComponent.objects.create(
                rubric=self.rubric,
                code="presentation",
                name="Presentation",
                max_marks=Decimal("30.00"),
                display_order=9,
            ).pk,
        ]
        now = timezone.now()
        self.open_period = EvaluationPeriod.objects.create(
            name="Legacy Open Period",
            semester="Semester 1",
            rubric=self.rubric,
            opens_at=now - timezone.timedelta(days=1),
            closes_at=now + timezone.timedelta(days=1),
            is_open=True,
        )
        self.expired_period = EvaluationPeriod.objects.create(
            name="Legacy Expired Period",
            semester="Semester 2",
            rubric=self.rubric,
            opens_at=now - timezone.timedelta(days=3),
            closes_at=now - timezone.timedelta(days=1),
            is_open=False,
        )
        self.future_period = EvaluationPeriod.objects.create(
            name="Legacy Future Draft",
            semester="Semester 3",
            rubric=self.rubric,
            opens_at=now + timezone.timedelta(days=2),
            closes_at=now + timezone.timedelta(days=3),
            is_open=False,
        )

        executor = MigrationExecutor(connection)
        executor.migrate([self.migrate_to])
        self.apps = executor.loader.project_state([self.migrate_to]).apps

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        super().tearDown()

    def test_existing_configuration_is_versioned_without_changing_ids(self):
        Rubric = self.apps.get_model("marks", "Rubric")
        RubricComponent = self.apps.get_model("marks", "RubricComponent")
        EvaluationPeriod = self.apps.get_model("marks", "EvaluationPeriod")

        rubric = Rubric.objects.get(pk=self.rubric.pk)
        self.assertEqual(rubric.family_code, "legacy-faculty-evaluation")
        self.assertEqual(rubric.version, 1)
        self.assertEqual(rubric.target_mark, Decimal("100.00"))
        self.assertEqual(
            list(
                RubricComponent.objects.filter(rubric_id=rubric.pk)
                .order_by("display_order")
                .values_list("pk", "display_order")
            ),
            [(self.component_ids[0], 1), (self.component_ids[1], 2)],
        )
        self.assertEqual(
            EvaluationPeriod.objects.get(pk=self.open_period.pk).lifecycle_status,
            "PUBLISHED",
        )
        self.assertEqual(
            EvaluationPeriod.objects.get(
                pk=self.expired_period.pk
            ).lifecycle_status,
            "CLOSED",
        )
        self.assertEqual(
            EvaluationPeriod.objects.get(
                pk=self.future_period.pk
            ).lifecycle_status,
            "DRAFT",
        )
