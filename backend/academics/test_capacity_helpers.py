from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import Lecturer, Panel, Supervisor

from .capacity_services import (
    capacity_eligible_lecturers,
    capacity_plan_content_fingerprint,
    create_capacity_plan,
    publish_capacity_plan,
    update_capacity_entry,
    validate_published_capacity_ready,
)
from .models import AcademicSemester, SemesterCapacityPlan

User = get_user_model()


def publish_test_capacity_plan(semester, actor, *, lecturers=None):
    existing_plans = list(
        SemesterCapacityPlan.objects.filter(academic_semester=semester).order_by("pk")
    )
    if existing_plans:
        published = [
            plan
            for plan in existing_plans
            if plan.lifecycle_status == SemesterCapacityPlan.Lifecycle.PUBLISHED
        ]
        readiness_errors = validate_published_capacity_ready(semester)
        if len(published) == 1 and not readiness_errors:
            return published[0]
        raise AssertionError(
            "Existing capacity policy is not a complete Published plan; the test "
            "helper will not replace or supersede it."
        )

    rows = list(capacity_eligible_lecturers() if lecturers is None else lecturers)
    plan = create_capacity_plan(semester=semester, actor=actor)
    for lecturer in rows:
        update_capacity_entry(
            plan,
            lecturer=lecturer,
            actor=actor,
            supervisor_limit=(
                lecturer.supervisor.max_supervisees
                if hasattr(lecturer, "supervisor")
                else None
            ),
            panel_limit=(
                lecturer.panel.max_appointments if hasattr(lecturer, "panel") else None
            ),
            expected_fingerprint=capacity_plan_content_fingerprint(plan),
        )
    return publish_capacity_plan(
        plan,
        actor=actor,
        reason="Test capacity baseline.",
        expected_fingerprint=capacity_plan_content_fingerprint(plan),
    )


class PublishTestCapacityPlanTests(TestCase):
    def setUp(self):
        self.office = User.objects.create_user(
            email="capacity.helper.office@example.test",
            password="local-test-password",
            full_name="Capacity Helper Office",
            role=User.Role.OFFICE_ADMIN,
        )
        lecturer_user = User.objects.create_user(
            email="capacity.helper.lecturer@example.test",
            password="local-test-password",
            full_name="Capacity Helper Lecturer",
            role=User.Role.LECTURER,
        )
        self.lecturer = Lecturer.objects.create(
            user=lecturer_user,
            staff_no="CAP-HELP-001",
            lifecycle_status=Lecturer.Lifecycle.ACTIVE,
        )
        Supervisor.objects.create(lecturer=self.lecturer, max_supervisees=6)
        Panel.objects.create(lecturer=self.lecturer, max_appointments=8)
        today = timezone.localdate()
        self.semester = AcademicSemester.objects.create(
            code=f"{today.year}-{today.year + 1}-S1",
            academic_session=f"{today.year}/{today.year + 1}",
            term=AcademicSemester.Term.SEMESTER_I,
            starts_on=today - timedelta(days=5),
            ends_on=today + timedelta(days=90),
            created_by=self.office,
        )

    def test_publishes_all_currently_eligible_role_limits(self):
        plan = publish_test_capacity_plan(self.semester, self.office)

        self.assertEqual(
            plan.lifecycle_status, SemesterCapacityPlan.Lifecycle.PUBLISHED
        )
        entry = plan.entries.get(lecturer=self.lecturer)
        self.assertEqual(entry.supervisor_limit, 6)
        self.assertEqual(entry.panel_limit, 8)

    def test_reuses_a_suitable_published_plan_without_creating_history(self):
        first = publish_test_capacity_plan(self.semester, self.office)
        plan_ids = list(
            SemesterCapacityPlan.objects.order_by("pk").values_list("pk", flat=True)
        )

        second = publish_test_capacity_plan(self.semester, self.office)

        self.assertEqual(second.pk, first.pk)
        self.assertEqual(
            list(
                SemesterCapacityPlan.objects.order_by("pk").values_list("pk", flat=True)
            ),
            plan_ids,
        )

    def test_refuses_to_replace_an_existing_unpublished_policy(self):
        SemesterCapacityPlan.objects.create(
            academic_semester=self.semester,
            version=1,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.DRAFT,
            origin=SemesterCapacityPlan.Origin.CREATED,
            created_by=self.office,
        )

        with self.assertRaisesRegex(AssertionError, "will not replace"):
            publish_test_capacity_plan(self.semester, self.office)

        self.assertEqual(SemesterCapacityPlan.objects.count(), 1)
