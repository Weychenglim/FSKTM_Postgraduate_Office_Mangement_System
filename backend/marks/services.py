from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from academics.models import AcademicSemester
from appointments.models import (
    PanelAppointment,
    StudentResearchProfile,
    SupervisorAppointment,
)

from .models import (
    EvaluationPeriod,
    EvaluationTask,
    EvaluationTaskOverrideAudit,
    MarkCorrectionAudit,
    MarkEntry,
    MarkScore,
    MarksConfigurationAudit,
    Rubric,
    RubricComponent,
)


User = get_user_model()


class MarksStateConflict(Exception):
    pass


def _assert_period_allows_task_creation(period):
    if (
        period.lifecycle_status != EvaluationPeriod.Lifecycle.PUBLISHED
        or (period.closes_at and period.closes_at < timezone.now())
        or period.academic_semester_id is None
        or not period.academic_semester.is_active
    ):
        raise MarksStateConflict(
            "Evaluation tasks can only be created for a published period "
            "that has not ended."
        )


def _assert_office_admin(actor):
    if actor.role != User.Role.OFFICE_ADMIN or not actor.is_staff:
        raise ValidationError("Only authorized Office Staff/Admin may modify submitted marks.")


def _active_periods():
    now = timezone.now()
    return EvaluationPeriod.objects.filter(
        lifecycle_status=EvaluationPeriod.Lifecycle.PUBLISHED,
        academic_semester__lifecycle_status=AcademicSemester.Lifecycle.ACTIVE,
        academic_semester__starts_on__lte=timezone.localdate(),
        academic_semester__ends_on__gte=timezone.localdate(),
    ).filter(
        Q(opens_at__isnull=True) | Q(opens_at__lte=now),
        Q(closes_at__isnull=True) | Q(closes_at__gte=now),
    )


def _rubric_snapshot(rubric):
    return {
        "id": rubric.pk,
        "familyCode": rubric.family_code,
        "code": rubric.code,
        "name": rubric.name,
        "description": rubric.description,
        "version": rubric.version,
        "targetMark": f"{rubric.target_mark:.2f}",
        "componentTotal": f"{rubric.component_total:.2f}",
        "isActive": rubric.is_active,
        "components": [
            {
                "id": component.pk,
                "code": component.code,
                "name": component.name,
                "description": component.description,
                "maxMarks": f"{component.max_marks:.2f}",
                "required": component.is_required,
                "isActive": component.is_active,
                "displayOrder": component.display_order,
            }
            for component in rubric.components.order_by("display_order", "id")
        ],
    }


def _period_snapshot(period):
    return {
        "id": period.pk,
        "name": period.name,
        "semester": period.semester,
        "semesterId": period.academic_semester_id,
        "semesterCode": (
            period.academic_semester.code
            if period.academic_semester_id
            else None
        ),
        "rubricId": period.rubric_id,
        "opensAt": period.opens_at.isoformat() if period.opens_at else None,
        "closesAt": period.closes_at.isoformat() if period.closes_at else None,
        "lifecycleStatus": period.lifecycle_status,
        "effectiveStatus": period.effective_status,
    }


def _configuration_audit(
    *,
    entity_type,
    entity_id,
    action,
    actor,
    before_values=None,
    after_values=None,
    reason="",
):
    return MarksConfigurationAudit.objects.create(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        reason=str(reason).strip(),
        before_values=before_values or {},
        after_values=after_values or {},
    )


@transaction.atomic
def clone_rubric_version(*, rubric, actor):
    _assert_office_admin(actor)
    rubric = Rubric.objects.select_for_update().get(pk=rubric.pk)
    source_snapshot = _rubric_snapshot(rubric)
    latest_version = (
        Rubric.objects.filter(family_code=rubric.family_code)
        .order_by("-version")
        .values_list("version", flat=True)
        .first()
        or 0
    )
    new_version = latest_version + 1
    cloned = Rubric.objects.create(
        family_code=rubric.family_code,
        code=f"{rubric.family_code}-v{new_version}",
        name=rubric.name,
        description=rubric.description,
        version=new_version,
        target_mark=rubric.target_mark,
        supersedes=rubric,
        is_active=True,
    )
    RubricComponent.objects.bulk_create(
        [
            RubricComponent(
                rubric=cloned,
                code=component.code,
                name=component.name,
                description=component.description,
                max_marks=component.max_marks,
                is_required=component.is_required,
                is_active=component.is_active,
                display_order=component.display_order,
            )
            for component in rubric.components.order_by("display_order", "id")
        ]
    )
    Rubric.objects.filter(
        family_code=rubric.family_code,
        is_active=True,
    ).exclude(pk=cloned.pk).update(is_active=False)
    rubric.refresh_from_db()
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.RUBRIC,
        entity_id=cloned.pk,
        action="CLONE",
        actor=actor,
        before_values=source_snapshot,
        after_values=_rubric_snapshot(cloned),
    )
    return cloned


@transaction.atomic
def create_rubric(*, actor, family_code, name, description, target_mark):
    _assert_office_admin(actor)
    family_code = slugify(family_code)[:64]
    if not family_code:
        raise ValidationError("Rubric family code is required.")
    if Rubric.objects.filter(family_code=family_code).exists():
        raise ValidationError("Rubric family code is already in use.")
    rubric = Rubric.objects.create(
        family_code=family_code,
        code=f"{family_code}-v1",
        name=str(name).strip(),
        description=str(description).strip(),
        version=1,
        target_mark=target_mark,
        is_active=True,
    )
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.RUBRIC,
        entity_id=rubric.pk,
        action="CREATE",
        actor=actor,
        after_values=_rubric_snapshot(rubric),
    )
    return rubric


@transaction.atomic
def update_rubric(*, rubric, actor, values):
    _assert_office_admin(actor)
    rubric = Rubric.objects.select_for_update().get(pk=rubric.pk)
    if rubric.is_locked:
        raise MarksStateConflict(
            "Locked rubric versions must be cloned before editing."
        )
    before = _rubric_snapshot(rubric)
    for field in ("name", "description", "target_mark", "is_active"):
        if field in values:
            setattr(rubric, field, values[field])
    rubric.full_clean()
    rubric.save()
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.RUBRIC,
        entity_id=rubric.pk,
        action="UPDATE",
        actor=actor,
        before_values=before,
        after_values=_rubric_snapshot(rubric),
    )
    return rubric


def _validate_component_order(rubric, display_order, *, exclude_id=None):
    duplicate = rubric.components.filter(
        is_active=True,
        display_order=display_order,
    )
    if exclude_id:
        duplicate = duplicate.exclude(pk=exclude_id)
    if duplicate.exists():
        raise ValidationError("Display order must be unique within the rubric.")


def _validate_period_dates(academic_semester, opens_at, closes_at):
    for value, label in (
        (opens_at, "Opening timestamp"),
        (closes_at, "Closing timestamp"),
    ):
        if value is None:
            continue
        local_date = (
            timezone.localtime(value).date()
            if timezone.is_aware(value)
            else value.date()
        )
        if (
            local_date < academic_semester.starts_on
            or local_date > academic_semester.ends_on
        ):
            raise ValidationError(
                f"{label} must fall within the academic semester dates."
            )


@transaction.atomic
def create_rubric_component(*, rubric, actor, values):
    _assert_office_admin(actor)
    rubric = Rubric.objects.select_for_update().get(pk=rubric.pk)
    if rubric.is_locked:
        raise MarksStateConflict(
            "Locked rubric versions must be cloned before editing."
        )
    if values.get("is_active", True):
        _validate_component_order(rubric, values["display_order"])
    component = RubricComponent(rubric=rubric, **values)
    component.full_clean()
    component.save()
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.RUBRIC,
        entity_id=rubric.pk,
        action="ADD_COMPONENT",
        actor=actor,
        before_values={},
        after_values=_rubric_snapshot(rubric),
    )
    return component


@transaction.atomic
def update_rubric_component(*, component, actor, values):
    _assert_office_admin(actor)
    component = (
        RubricComponent.objects.select_for_update()
        .select_related("rubric")
        .get(pk=component.pk)
    )
    rubric = component.rubric
    if rubric.is_locked:
        raise MarksStateConflict(
            "Locked rubric versions must be cloned before editing."
        )
    before = _rubric_snapshot(rubric)
    next_order = values.get("display_order", component.display_order)
    next_active = values.get("is_active", component.is_active)
    if next_active:
        _validate_component_order(
            rubric,
            next_order,
            exclude_id=component.pk,
        )
    for field in (
        "code",
        "name",
        "description",
        "max_marks",
        "is_required",
        "is_active",
        "display_order",
    ):
        if field in values:
            setattr(component, field, values[field])
    component.full_clean()
    component.save()
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.RUBRIC,
        entity_id=rubric.pk,
        action="UPDATE_COMPONENT",
        actor=actor,
        before_values=before,
        after_values=_rubric_snapshot(rubric),
    )
    return component


@transaction.atomic
def create_evaluation_period(
    *,
    actor,
    name,
    academic_semester,
    rubric,
    opens_at,
    closes_at,
):
    _assert_office_admin(actor)
    if opens_at and closes_at and opens_at >= closes_at:
        raise ValidationError("Opening timestamp must be before closing timestamp.")
    if academic_semester.lifecycle_status not in {
        AcademicSemester.Lifecycle.DRAFT,
        AcademicSemester.Lifecycle.ACTIVE,
    }:
        raise MarksStateConflict(
            "Evaluation periods can only be prepared for Draft or Active semesters."
        )
    _validate_period_dates(academic_semester, opens_at, closes_at)
    period = EvaluationPeriod.objects.create(
        name=str(name).strip(),
        semester=academic_semester.label,
        academic_semester=academic_semester,
        rubric=rubric,
        opens_at=opens_at,
        closes_at=closes_at,
        lifecycle_status=EvaluationPeriod.Lifecycle.DRAFT,
    )
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.PERIOD,
        entity_id=period.pk,
        action="CREATE",
        actor=actor,
        after_values=_period_snapshot(period),
    )
    return period


@transaction.atomic
def update_evaluation_period(*, period, actor, values, reason=""):
    _assert_office_admin(actor)
    period = (
        EvaluationPeriod.objects.select_for_update()
        .select_related("rubric")
        .get(pk=period.pk)
    )
    before = _period_snapshot(period)
    if period.lifecycle_status == EvaluationPeriod.Lifecycle.DRAFT:
        for field in (
            "name",
            "academic_semester",
            "rubric",
            "opens_at",
            "closes_at",
        ):
            if field in values:
                setattr(period, field, values[field])
        if period.academic_semester_id is None:
            raise MarksStateConflict(
                "Select a Draft or Active academic semester."
            )
        if period.academic_semester.lifecycle_status not in {
            AcademicSemester.Lifecycle.DRAFT,
            AcademicSemester.Lifecycle.ACTIVE,
        }:
            raise MarksStateConflict(
                "Evaluation periods can only use Draft or Active semesters."
            )
        period.semester = period.academic_semester.label
        _validate_period_dates(
            period.academic_semester,
            period.opens_at,
            period.closes_at,
        )
        if (
            period.opens_at
            and period.closes_at
            and period.opens_at >= period.closes_at
        ):
            raise ValidationError(
                "Opening timestamp must be before closing timestamp."
            )
        action = "UPDATE"
    elif period.lifecycle_status == EvaluationPeriod.Lifecycle.PUBLISHED:
        if set(values) != {"closes_at"}:
            raise MarksStateConflict(
                "Published periods only permit a closing-time extension."
            )
        reason = str(reason).strip()
        if not reason:
            raise ValidationError("A deadline extension reason is required.")
        closes_at = values["closes_at"]
        if (
            closes_at is None
            or (period.closes_at and closes_at <= period.closes_at)
            or closes_at <= timezone.now()
        ):
            raise ValidationError(
                "The new closing timestamp must extend the current deadline."
            )
        period.closes_at = closes_at
        _validate_period_dates(
            period.academic_semester,
            period.opens_at,
            period.closes_at,
        )
        action = "EXTEND"
    else:
        raise MarksStateConflict("Closed or archived periods cannot be edited.")
    period.save()
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.PERIOD,
        entity_id=period.pk,
        action=action,
        actor=actor,
        reason=reason,
        before_values=before,
        after_values=_period_snapshot(period),
    )
    return period


@transaction.atomic
def publish_evaluation_period(*, period, actor):
    _assert_office_admin(actor)
    period = (
        EvaluationPeriod.objects.select_for_update()
        .select_related("rubric")
        .get(pk=period.pk)
    )
    if period.lifecycle_status != EvaluationPeriod.Lifecycle.DRAFT:
        raise ValidationError("Only draft evaluation periods can be published.")
    if period.academic_semester_id is None or not period.academic_semester.is_active:
        raise MarksStateConflict(
            "Evaluation periods can only be published for the active academic semester."
        )
    if not period.opens_at or not period.closes_at:
        raise ValidationError("Opening and closing timestamps are required.")
    if period.opens_at >= period.closes_at:
        raise ValidationError("Opening timestamp must be before closing timestamp.")
    if not period.rubric.is_ready:
        raise ValidationError(
            "Rubric components must match the configured target mark."
        )
    duplicate = EvaluationPeriod.objects.exclude(pk=period.pk).filter(
        name__iexact=period.name,
        semester__iexact=period.semester,
    ).exclude(lifecycle_status=EvaluationPeriod.Lifecycle.ARCHIVED)
    if duplicate.exists():
        raise ValidationError(
            "A non-archived evaluation period already uses this name and semester."
        )
    before = _period_snapshot(period)
    period.lifecycle_status = EvaluationPeriod.Lifecycle.PUBLISHED
    period.published_at = timezone.now()
    period.save(
        update_fields=[
            "lifecycle_status",
            "published_at",
            "is_open",
            "updated_at",
        ]
    )
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.PERIOD,
        entity_id=period.pk,
        action="PUBLISH",
        actor=actor,
        before_values=before,
        after_values=_period_snapshot(period),
    )
    return period


@transaction.atomic
def close_evaluation_period(*, period, actor, reason):
    _assert_office_admin(actor)
    reason = str(reason).strip()
    if not reason:
        raise ValidationError("A closing reason is required.")
    period = EvaluationPeriod.objects.select_for_update().get(pk=period.pk)
    if period.lifecycle_status != EvaluationPeriod.Lifecycle.PUBLISHED:
        raise MarksStateConflict("Only published periods can be closed.")
    before = _period_snapshot(period)
    period.lifecycle_status = EvaluationPeriod.Lifecycle.CLOSED
    period.closed_at = timezone.now()
    period.save(
        update_fields=[
            "lifecycle_status",
            "closed_at",
            "is_open",
            "updated_at",
        ]
    )
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.PERIOD,
        entity_id=period.pk,
        action="CLOSE",
        actor=actor,
        reason=reason,
        before_values=before,
        after_values=_period_snapshot(period),
    )
    return period


@transaction.atomic
def archive_evaluation_period(*, period, actor, reason):
    _assert_office_admin(actor)
    reason = str(reason).strip()
    if not reason:
        raise ValidationError("An archival reason is required.")
    period = EvaluationPeriod.objects.select_for_update().get(pk=period.pk)
    if period.lifecycle_status != EvaluationPeriod.Lifecycle.CLOSED:
        raise MarksStateConflict("Only closed periods can be archived.")
    before = _period_snapshot(period)
    period.lifecycle_status = EvaluationPeriod.Lifecycle.ARCHIVED
    period.archived_at = timezone.now()
    period.save(
        update_fields=[
            "lifecycle_status",
            "archived_at",
            "is_open",
            "updated_at",
        ]
    )
    _configuration_audit(
        entity_type=MarksConfigurationAudit.EntityType.PERIOD,
        entity_id=period.pk,
        action="ARCHIVE",
        actor=actor,
        reason=reason,
        before_values=before,
        after_values=_period_snapshot(period),
    )
    return period


@transaction.atomic
def ensure_period_tasks(period, *, actor=None):
    period = EvaluationPeriod.objects.select_for_update().get(pk=period.pk)
    _assert_period_allows_task_creation(period)
    created = {
        "supervisor": 0,
        "panel": 0,
    }
    supervisor_appointments = SupervisorAppointment.objects.filter(
        status=SupervisorAppointment.Status.ACTIVE
    ).select_related("student", "student__user", "supervisor")
    for appointment in supervisor_appointments:
        profile = StudentResearchProfile.objects.filter(
            matric_no=appointment.student.matric_no
        ).first()
        if profile is None:
            continue
        _, was_created = EvaluationTask.objects.get_or_create(
            profile=profile,
            evaluator=appointment.supervisor,
            period=period,
            evaluator_role=EvaluationTask.EvaluatorRole.SUPERVISOR,
            defaults={"assigned_by": actor},
        )
        created["supervisor"] += int(was_created)

    panel_appointments = PanelAppointment.objects.filter(
        status=PanelAppointment.Status.ACTIVE
    ).select_related("profile", "panel_member")
    for appointment in panel_appointments:
        _, was_created = EvaluationTask.objects.get_or_create(
            profile=appointment.profile,
            evaluator=appointment.panel_member,
            period=period,
            evaluator_role=EvaluationTask.EvaluatorRole.PANEL,
            defaults={"assigned_by": actor},
        )
        created["panel"] += int(was_created)

    created["total"] = created["supervisor"] + created["panel"]
    created["period_total"] = EvaluationTask.objects.filter(period=period).count()
    return created


def ensure_active_period_tasks():
    for period in _active_periods():
        ensure_period_tasks(period)


@transaction.atomic
def create_backup_evaluation_task(
    *,
    period,
    profile,
    evaluator,
    actor,
    reason,
    original_task=None,
):
    _assert_office_admin(actor)
    period = EvaluationPeriod.objects.select_for_update().get(pk=period.pk)
    _assert_period_allows_task_creation(period)
    reason = str(reason).strip()
    if not reason:
        raise ValidationError("A manual override reason is required.")
    if evaluator.role != User.Role.LECTURER:
        raise ValidationError("Backup evaluator must be a lecturer.")
    task, _ = EvaluationTask.objects.get_or_create(
        profile=profile,
        evaluator=evaluator,
        period=period,
        evaluator_role=EvaluationTask.EvaluatorRole.BACKUP,
        defaults={"assigned_by": actor},
    )
    EvaluationTaskOverrideAudit.objects.create(
        task=task,
        actor=actor,
        original_evaluator=original_task.evaluator if original_task else None,
        new_evaluator=evaluator,
        reason=reason,
    )
    return task


def entry_snapshot(entry):
    entry.refresh_from_db()
    scores = entry.scores.select_related("component").order_by(
        "component__display_order", "component_id"
    )
    return {
        "status": entry.status,
        "totalMark": f"{entry.total_mark:.2f}",
        "comments": entry.comments,
        "scores": {
            str(score.component_id): f"{score.marks_awarded:.2f}"
            for score in scores
        },
    }


@transaction.atomic
def correct_submitted_marks(
    *,
    entry,
    actor,
    score_values,
    reason,
    comments=None,
):
    _assert_office_admin(actor)
    reason = str(reason).strip()
    if not reason:
        raise ValidationError("A correction reason is required.")
    entry = MarkEntry.objects.select_for_update().get(pk=entry.pk)
    if entry.status != MarkEntry.Status.SUBMITTED:
        raise ValidationError("Only submitted marks can be corrected.")
    before = entry_snapshot(entry)
    scores = {
        score.component_id: score
        for score in entry.scores.select_related("component")
    }
    for component_id, value in score_values.items():
        if component_id not in scores:
            raise ValidationError("The selected rubric component is not part of this entry.")
        score = scores[component_id]
        score.marks_awarded = Decimal(value)
        score.full_clean()
        score.save(update_fields=["marks_awarded"])
    if comments is not None:
        entry.comments = str(comments)
        entry.save(update_fields=["comments", "updated_at"])
    entry.recalculate_total()
    after = entry_snapshot(entry)
    MarkCorrectionAudit.objects.create(
        entry=entry,
        actor=actor,
        action=MarkCorrectionAudit.Action.CORRECT,
        reason=reason,
        before_values=before,
        after_values=after,
    )
    return entry


@transaction.atomic
def reopen_submitted_marks(*, entry, actor, reason):
    _assert_office_admin(actor)
    reason = str(reason).strip()
    if not reason:
        raise ValidationError("A reopening reason is required.")
    entry = (
        MarkEntry.objects.select_for_update()
        .select_related("task__period")
        .get(pk=entry.pk)
    )
    if entry.status != MarkEntry.Status.SUBMITTED:
        raise ValidationError("Only submitted marks can be reopened.")
    if not entry.task.period.accepts_submissions:
        raise ValidationError(
            "Marks may only be reopened while the evaluation period is open."
        )
    before = entry_snapshot(entry)
    entry.status = MarkEntry.Status.DRAFT
    entry.submitted_at = None
    entry.save(update_fields=["status", "submitted_at", "updated_at"])
    after = entry_snapshot(entry)
    MarkCorrectionAudit.objects.create(
        entry=entry,
        actor=actor,
        action=MarkCorrectionAudit.Action.REOPEN,
        reason=reason,
        before_values=before,
        after_values=after,
    )
    return entry
