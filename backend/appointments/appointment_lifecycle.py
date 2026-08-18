from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.authorization import coordinator_programme

from .models import (
    AppointmentLifecycleEvent,
    PanelAppointment,
    SupervisorAppointment,
)


User = get_user_model()


class AppointmentLifecycleConflict(Exception):
    pass


class AppointmentLifecycleForbidden(Exception):
    pass


def _appointment_programme(appointment):
    if isinstance(appointment, SupervisorAppointment):
        return appointment.student.programme.strip()
    return appointment.profile.programme.strip()


def assert_can_manage_appointment(actor, appointment):
    if actor.role == User.Role.OFFICE_ADMIN:
        return
    if (
        actor.role == User.Role.COORDINATOR
        and coordinator_programme(actor).casefold()
        == _appointment_programme(appointment).casefold()
    ):
        return
    raise AppointmentLifecycleForbidden(
        "This appointment is outside your lifecycle management scope."
    )


def _event(appointment, *, actor, action, previous_status, outcome="", reason=""):
    values = {
        "actor": actor,
        "actor_role": actor.role,
        "action": action,
        "previous_status": previous_status,
        "new_status": appointment.status,
        "outcome": outcome,
        "reason": reason,
    }
    if isinstance(appointment, SupervisorAppointment):
        values["supervisor_appointment"] = appointment
    else:
        values["panel_appointment"] = appointment
    return AppointmentLifecycleEvent.objects.create(**values)


def _retire_marks(appointment, *, actor, reason, replacement_evaluator=None):
    from marks.services import retire_official_evaluation_tasks

    if isinstance(appointment, SupervisorAppointment):
        try:
            profile = appointment.student.user.research_profile
        except ObjectDoesNotExist:
            return []
        evaluator_role = "SUPERVISOR"
        evaluator = appointment.supervisor
    else:
        profile = appointment.profile
        evaluator_role = "PANEL"
        evaluator = appointment.panel_member
    return retire_official_evaluation_tasks(
        profile=profile,
        evaluator=evaluator,
        evaluator_role=evaluator_role,
        actor=actor,
        reason=reason,
        replacement_evaluator=replacement_evaluator,
    )


def _end_locked(appointment, *, actor, outcome, reason, replacement_evaluator=None):
    if appointment.status != appointment.Status.ACTIVE:
        raise AppointmentLifecycleConflict("This appointment is no longer active.")
    previous_status = appointment.status
    appointment.status = appointment.Status.ENDED
    appointment.end_outcome = outcome
    appointment.end_reason = reason
    appointment.ended_at = timezone.now()
    appointment.ended_by = actor
    appointment.save(
        update_fields=[
            "status",
            "end_outcome",
            "end_reason",
            "ended_at",
            "ended_by",
            "updated_at",
        ]
    )
    _event(
        appointment,
        actor=actor,
        action=(
            AppointmentLifecycleEvent.Action.REPLACED
            if outcome == appointment.EndOutcome.REPLACED
            else AppointmentLifecycleEvent.Action.ENDED
        ),
        previous_status=previous_status,
        outcome=outcome,
        reason=reason,
    )
    _retire_marks(
        appointment,
        actor=actor,
        reason=reason,
        replacement_evaluator=replacement_evaluator,
    )
    return appointment


@transaction.atomic
def end_appointment(*, model, appointment_id, actor, outcome, reason):
    reason = str(reason or "").strip()
    if not reason:
        raise AppointmentLifecycleConflict("A lifecycle reason is required.")
    valid_outcomes = {
        model.EndOutcome.COMPLETED,
        model.EndOutcome.WITHDRAWN,
        model.EndOutcome.OTHER,
    }
    if outcome not in valid_outcomes:
        raise AppointmentLifecycleConflict(
            "Select Completed, Withdrawn, or Other for a direct closure."
        )
    appointment = (
        model.objects.select_for_update()
        .select_related(
            "student__user" if model is SupervisorAppointment else "profile",
        )
        .get(pk=appointment_id)
    )
    assert_can_manage_appointment(actor, appointment)
    return _end_locked(
        appointment,
        actor=actor,
        outcome=outcome,
        reason=reason,
    )


def activate_replacement(
    *,
    model,
    replacement_source,
    actor,
    create_values,
):
    """End the referenced appointment and activate its successor atomically."""

    target_id = replacement_source.replaces_appointment_id
    target = None
    if target_id:
        target = model.objects.select_for_update().get(pk=target_id)
        if hasattr(target, "replacement_appointment"):
            raise AppointmentLifecycleConflict(
                "This appointment has already been superseded."
            )
        if target.status not in {model.Status.ACTIVE, model.Status.ENDED}:
            raise AppointmentLifecycleConflict(
                "The referenced appointment cannot be replaced."
            )
    active = model.objects.select_for_update().filter(status=model.Status.ACTIVE)
    if model is SupervisorAppointment:
        active = active.filter(student=replacement_source.student)
        replacement_evaluator = replacement_source.proposed_supervisor
    else:
        active = active.filter(profile=replacement_source.profile)
        replacement_evaluator = replacement_source.recommended_member
    active = active.first()
    if active and (target is None or active.pk != target.pk):
        raise AppointmentLifecycleConflict(
            "Another active appointment exists and was not selected for replacement."
        )
    if target and target.status == model.Status.ACTIVE:
        _end_locked(
            target,
            actor=actor,
            outcome=model.EndOutcome.REPLACED,
            reason=replacement_source.replacement_reason,
            replacement_evaluator=replacement_evaluator,
        )
    try:
        appointment = model.objects.create(
            **create_values,
            supersedes=target,
        )
    except IntegrityError as exc:
        raise AppointmentLifecycleConflict(
            "A conflicting active appointment was created concurrently."
        ) from exc
    _event(
        appointment,
        actor=actor,
        action=AppointmentLifecycleEvent.Action.ACTIVATED,
        previous_status="",
    )
    if target and target.status == model.Status.ENDED:
        from marks.services import ensure_replacement_evaluation_tasks

        ensure_replacement_evaluation_tasks(
            old_appointment=target,
            replacement_appointment=appointment,
            actor=actor,
            reason=replacement_source.replacement_reason,
        )
    return appointment
