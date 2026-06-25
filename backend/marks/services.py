from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

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
)


User = get_user_model()


def _assert_office_admin(actor):
    if actor.role != User.Role.OFFICE_ADMIN or not actor.is_staff:
        raise ValidationError("Only authorized Office Staff/Admin may modify submitted marks.")


def _active_periods():
    now = timezone.now()
    return EvaluationPeriod.objects.filter(is_open=True).filter(
        Q(opens_at__isnull=True) | Q(opens_at__lte=now),
        Q(closes_at__isnull=True) | Q(closes_at__gte=now),
    )


@transaction.atomic
def ensure_period_tasks(period, *, actor=None):
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
        "scores": {
            str(score.component_id): f"{score.marks_awarded:.2f}"
            for score in scores
        },
    }


@transaction.atomic
def correct_submitted_marks(*, entry, actor, score_values, reason):
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
    entry = MarkEntry.objects.select_for_update().get(pk=entry.pk)
    if entry.status != MarkEntry.Status.SUBMITTED:
        raise ValidationError("Only submitted marks can be reopened.")
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
