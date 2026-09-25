from django.db import migrations
from django.db.models import Max
from django.utils import timezone

UNRESOLVED_SUPERVISOR_STATUSES = (
    "SUBMITTED_TO_SUPERVISOR",
    "PENDING_COORDINATOR",
)
UNRESOLVED_PANEL_STATUSES = (
    "SUBMITTED_TO_PANEL",
    "PENDING_COORDINATOR",
)


def seed_capacity_baselines(apps, schema_editor):
    AcademicSemester = apps.get_model("academics", "AcademicSemester")
    SemesterCapacityPlan = apps.get_model("academics", "SemesterCapacityPlan")
    LecturerCapacityEntry = apps.get_model("academics", "LecturerCapacityEntry")
    User = apps.get_model("accounts", "User")
    Lecturer = apps.get_model("accounts", "Lecturer")
    Supervisor = apps.get_model("accounts", "Supervisor")
    Panel = apps.get_model("accounts", "Panel")
    SupervisorApplication = apps.get_model("appointments", "SupervisorApplication")
    PanelRecommendation = apps.get_model("appointments", "PanelRecommendation")

    using = schema_editor.connection.alias
    target_semester_ids = set(
        AcademicSemester.objects.using(using)
        .filter(lifecycle_status="ACTIVE")
        .values_list("pk", flat=True)
    )
    target_semester_ids.update(
        SupervisorApplication.objects.using(using)
        .filter(
            status__in=UNRESOLVED_SUPERVISOR_STATUSES,
            academic_semester_id__isnull=False,
        )
        .values_list("academic_semester_id", flat=True)
    )
    target_semester_ids.update(
        PanelRecommendation.objects.using(using)
        .filter(
            status__in=UNRESOLVED_PANEL_STATUSES,
            academic_semester_id__isnull=False,
        )
        .values_list("academic_semester_id", flat=True)
    )
    if not target_semester_ids:
        return

    supervisor_limits = dict(
        Supervisor.objects.using(using).values_list("lecturer_id", "max_supervisees")
    )
    panel_limits = dict(
        Panel.objects.using(using).values_list("lecturer_id", "max_appointments")
    )
    role_lecturer_ids = set(supervisor_limits) | set(panel_limits)
    lecturers = list(
        Lecturer.objects.using(using)
        .filter(
            pk__in=role_lecturer_ids,
            lifecycle_status="ACTIVE",
            user__is_active=True,
        )
        .order_by("staff_no", "pk")
    )
    office_actor_id = (
        User.objects.using(using)
        .filter(role="Office Staff/Admin", is_active=True)
        .order_by("pk")
        .values_list("pk", flat=True)
        .first()
    )
    published_at = timezone.now()

    semesters = (
        AcademicSemester.objects.using(using)
        .filter(pk__in=target_semester_ids)
        .order_by("pk")
    )
    for semester in semesters:
        plans = SemesterCapacityPlan.objects.using(using).filter(
            academic_semester_id=semester.pk
        )
        if plans.filter(lifecycle_status="PUBLISHED").exists():
            continue

        next_version = (plans.aggregate(value=Max("version"))["value"] or 0) + 1
        actor_id = office_actor_id or semester.created_by_id
        plan = SemesterCapacityPlan.objects.using(using).create(
            academic_semester_id=semester.pk,
            version=next_version,
            lifecycle_status="PUBLISHED",
            origin="MIGRATED_BASELINE",
            created_by_id=actor_id,
            published_by_id=actor_id,
            publication_reason=(
                "Migration baseline preserving eligible lecturers' legacy limits."
            ),
            published_at=published_at,
        )
        LecturerCapacityEntry.objects.using(using).bulk_create(
            [
                LecturerCapacityEntry(
                    plan_id=plan.pk,
                    lecturer_id=lecturer.pk,
                    supervisor_limit=supervisor_limits.get(lecturer.pk),
                    panel_limit=panel_limits.get(lecturer.pk),
                    updated_by_id=actor_id,
                )
                for lecturer in lecturers
            ]
        )


def preserve_capacity_baselines(apps, schema_editor):
    # A baseline may later be referenced or superseded. Reversal therefore
    # preserves all rows instead of risking loss of subsequent history.
    return None


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0002_semester_capacity_plan"),
        ("accounts", "0004_lecturer_lifecycle_changed_at_and_more"),
        ("appointments", "0011_alter_panelrecommendation_status_and_more"),
    ]

    operations = [
        migrations.RunPython(
            seed_capacity_baselines,
            preserve_capacity_baselines,
        ),
    ]
