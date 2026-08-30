import importlib
from datetime import date

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class CapacityBaselineMigrationTests(TransactionTestCase):
    migrate_from = [
        ("academics", "0002_semester_capacity_plan"),
        ("accounts", "0004_lecturer_lifecycle_changed_at_and_more"),
        ("appointments", "0011_alter_panelrecommendation_status_and_more"),
    ]
    migrate_to = [
        ("academics", "0003_seed_capacity_baselines"),
        ("accounts", "0004_lecturer_lifecycle_changed_at_and_more"),
        ("appointments", "0011_alter_panelrecommendation_status_and_more"),
    ]

    def setUp(self):
        super().setUp()
        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_from)
        old_apps = executor.loader.project_state(self.migrate_from).apps

        User = old_apps.get_model("accounts", "User")
        Lecturer = old_apps.get_model("accounts", "Lecturer")
        Student = old_apps.get_model("accounts", "Student")
        Supervisor = old_apps.get_model("accounts", "Supervisor")
        Panel = old_apps.get_model("accounts", "Panel")
        Semester = old_apps.get_model("academics", "AcademicSemester")
        Plan = old_apps.get_model("academics", "SemesterCapacityPlan")
        SupervisorApplication = old_apps.get_model(
            "appointments", "SupervisorApplication"
        )
        ResearchProfile = old_apps.get_model("appointments", "StudentResearchProfile")
        PanelRecommendation = old_apps.get_model("appointments", "PanelRecommendation")

        self.office = User.objects.create(
            email="migration.office@example.test",
            password="!",
            full_name="Migration Office",
            role="Office Staff/Admin",
            is_active=True,
        )

        def lecturer(email, staff_no, *, is_active=True, lifecycle="ACTIVE"):
            user = User.objects.create(
                email=email,
                password="!",
                full_name=staff_no,
                role="Lecturer",
                is_active=is_active,
            )
            row = Lecturer.objects.create(
                user_id=user.pk,
                staff_no=staff_no,
                lifecycle_status=lifecycle,
            )
            return user, row

        self.supervisor_user, self.supervisor_lecturer = lecturer(
            "migration.supervisor@example.test", "MIG-SUP-001"
        )
        Supervisor.objects.create(
            lecturer_id=self.supervisor_lecturer.pk,
            max_supervisees=5,
        )
        self.panel_user, self.panel_lecturer = lecturer(
            "migration.panel@example.test", "MIG-PANEL-001"
        )
        Panel.objects.create(
            lecturer_id=self.panel_lecturer.pk,
            max_appointments=10,
        )
        self.both_user, self.both_lecturer = lecturer(
            "migration.both@example.test", "MIG-BOTH-001"
        )
        Supervisor.objects.create(
            lecturer_id=self.both_lecturer.pk,
            max_supervisees=7,
        )
        Panel.objects.create(
            lecturer_id=self.both_lecturer.pk,
            max_appointments=9,
        )
        _, retired = lecturer(
            "migration.retired@example.test",
            "MIG-RET-001",
            lifecycle="RETIRED",
        )
        Supervisor.objects.create(lecturer_id=retired.pk, max_supervisees=3)
        _, disabled = lecturer(
            "migration.disabled@example.test",
            "MIG-DIS-001",
            is_active=False,
        )
        Panel.objects.create(lecturer_id=disabled.pk, max_appointments=4)

        def semester(code, session, term, starts_on, ends_on, status="CLOSED"):
            return Semester.objects.create(
                code=code,
                academic_session=session,
                term=term,
                starts_on=starts_on,
                ends_on=ends_on,
                lifecycle_status=status,
                created_by_id=self.office.pk,
            )

        self.active_semester = semester(
            "2026-2027-S1",
            "2026/2027",
            "SEMESTER_I",
            date(2026, 1, 1),
            date(2026, 6, 30),
            "ACTIVE",
        )
        self.supervisor_semester = semester(
            "2025-2026-S2",
            "2025/2026",
            "SEMESTER_II",
            date(2025, 7, 1),
            date(2025, 12, 31),
        )
        self.panel_semester = semester(
            "2025-2026-S1",
            "2025/2026",
            "SEMESTER_I",
            date(2025, 1, 1),
            date(2025, 6, 30),
        )
        self.non_target_semester = semester(
            "2024-2025-S2",
            "2024/2025",
            "SEMESTER_II",
            date(2024, 7, 1),
            date(2024, 12, 31),
        )
        self.existing_draft = Plan.objects.create(
            academic_semester_id=self.active_semester.pk,
            version=4,
            lifecycle_status="DRAFT",
            origin="CREATED",
            created_by_id=self.office.pk,
        )
        self.existing_published = Plan.objects.create(
            academic_semester_id=self.panel_semester.pk,
            version=3,
            lifecycle_status="PUBLISHED",
            origin="CREATED",
            created_by_id=self.office.pk,
            published_by_id=self.office.pk,
            publication_reason="Existing faculty policy.",
        )

        student_user = User.objects.create(
            email="migration.student@example.test",
            password="!",
            full_name="Migration Student",
            role="Student",
            is_active=True,
        )
        student = Student.objects.create(
            user_id=student_user.pk,
            matric_no="MIG-STUDENT-001",
            programme="Migration Programme",
        )
        self.application = SupervisorApplication.objects.create(
            student_id=student.pk,
            academic_semester_id=self.supervisor_semester.pk,
            proposed_supervisor_id=self.supervisor_user.pk,
            research_title="Migration application",
            research_area="Data quality",
            research_abstract="Migration fixture.",
            status="PENDING_COORDINATOR",
        )
        panel_student_user = User.objects.create(
            email="migration.panel.student@example.test",
            password="!",
            full_name="Migration Panel Student",
            role="Student",
            is_active=True,
        )
        profile = ResearchProfile.objects.create(
            student_id=panel_student_user.pk,
            matric_no="MIG-STUDENT-002",
            student_name="Migration Panel Student",
            programme="Migration Programme",
            semester="Legacy Semester Label",
            proposed_topic="Migration panel recommendation",
            supervisor_id=self.supervisor_user.pk,
        )
        self.recommendation = PanelRecommendation.objects.create(
            profile_id=profile.pk,
            academic_semester_id=self.panel_semester.pk,
            supervisor_id=self.supervisor_user.pk,
            recommended_member_id=self.panel_user.pk,
            status="SUBMITTED_TO_PANEL",
        )
        self.profile_id = profile.pk
        self.application_id = self.application.pk
        self.recommendation_id = self.recommendation.pk

        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_to)
        self.apps = executor.loader.project_state(self.migrate_to).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_migration_creates_only_required_complete_baselines(self):
        Plan = self.apps.get_model("academics", "SemesterCapacityPlan")
        Entry = self.apps.get_model("academics", "LecturerCapacityEntry")
        SupervisorApplication = self.apps.get_model(
            "appointments", "SupervisorApplication"
        )
        PanelRecommendation = self.apps.get_model("appointments", "PanelRecommendation")
        ResearchProfile = self.apps.get_model(
            "appointments",
            "StudentResearchProfile",
        )

        active_baseline = Plan.objects.get(
            academic_semester_id=self.active_semester.pk,
            origin="MIGRATED_BASELINE",
        )
        self.assertEqual(active_baseline.version, 5)
        self.assertEqual(active_baseline.lifecycle_status, "PUBLISHED")
        supervisor_baseline = Plan.objects.get(
            academic_semester_id=self.supervisor_semester.pk,
            origin="MIGRATED_BASELINE",
        )
        self.assertEqual(supervisor_baseline.version, 1)
        self.assertFalse(
            Plan.objects.filter(
                academic_semester_id=self.panel_semester.pk,
                origin="MIGRATED_BASELINE",
            ).exists()
        )
        self.assertFalse(
            Plan.objects.filter(
                academic_semester_id=self.non_target_semester.pk
            ).exists()
        )
        self.assertTrue(Plan.objects.filter(pk=self.existing_draft.pk).exists())
        self.assertEqual(
            Plan.objects.filter(
                academic_semester_id=self.panel_semester.pk,
                lifecycle_status="PUBLISHED",
            )
            .get()
            .pk,
            self.existing_published.pk,
        )

        entries = {
            row.lecturer_id: row for row in Entry.objects.filter(plan=active_baseline)
        }
        self.assertEqual(
            set(entries),
            {
                self.supervisor_lecturer.pk,
                self.panel_lecturer.pk,
                self.both_lecturer.pk,
            },
        )
        self.assertEqual(entries[self.supervisor_lecturer.pk].supervisor_limit, 5)
        self.assertIsNone(entries[self.supervisor_lecturer.pk].panel_limit)
        self.assertIsNone(entries[self.panel_lecturer.pk].supervisor_limit)
        self.assertEqual(entries[self.panel_lecturer.pk].panel_limit, 10)
        self.assertEqual(entries[self.both_lecturer.pk].supervisor_limit, 7)
        self.assertEqual(entries[self.both_lecturer.pk].panel_limit, 9)

        application = SupervisorApplication.objects.get(pk=self.application_id)
        recommendation = PanelRecommendation.objects.get(pk=self.recommendation_id)
        profile = ResearchProfile.objects.get(pk=self.profile_id)
        self.assertEqual(application.academic_semester_id, self.supervisor_semester.pk)
        self.assertEqual(recommendation.academic_semester_id, self.panel_semester.pk)
        self.assertEqual(profile.semester, "Legacy Semester Label")

    def test_forward_operation_is_idempotent(self):
        Plan = self.apps.get_model("academics", "SemesterCapacityPlan")
        Entry = self.apps.get_model("academics", "LecturerCapacityEntry")
        before_plan_ids = list(Plan.objects.order_by("pk").values_list("pk", flat=True))
        before_entry_ids = list(
            Entry.objects.order_by("pk").values_list("pk", flat=True)
        )
        migration = importlib.import_module(
            "academics.migrations.0003_seed_capacity_baselines"
        )
        with connection.schema_editor() as schema_editor:
            migration.seed_capacity_baselines(self.apps, schema_editor)

        self.assertEqual(
            list(Plan.objects.order_by("pk").values_list("pk", flat=True)),
            before_plan_ids,
        )
        self.assertEqual(
            list(Entry.objects.order_by("pk").values_list("pk", flat=True)),
            before_entry_ids,
        )
