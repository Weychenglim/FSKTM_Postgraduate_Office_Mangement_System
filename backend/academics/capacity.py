from dataclasses import dataclass
from datetime import date
from enum import StrEnum

from django.utils import timezone

from accounts.models import Lecturer, Panel, Supervisor

from .models import (
    LecturerAvailabilityWindow,
    LecturerCapacityEntry,
    SemesterCapacityPlan,
)


class CapacityRole(StrEnum):
    SUPERVISOR = "SUPERVISOR"
    PANEL = "PANEL"


class CapacityState(StrEnum):
    AVAILABLE = "AVAILABLE"
    FULL = "FULL"
    OVER_CAPACITY = "OVER_CAPACITY"
    TEMPORARILY_UNAVAILABLE = "TEMPORARILY_UNAVAILABLE"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    INELIGIBLE = "INELIGIBLE"


@dataclass(frozen=True)
class CapacityResolution:
    semester_id: int
    plan_id: int | None
    plan_version: int | None
    role: str
    limit: int | None
    active_load: int
    reserved_load: int
    available_slots: int
    state: str
    unavailable_until: date | None


class CapacityConflict(Exception):
    """Raised when current capacity policy blocks a new assignment."""


def _non_negative(value):
    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return 0


def _workloads(*, user, role, exclude_panel_recommendation_id=None):
    from appointments.models import (
        PanelAppointment,
        PanelRecommendation,
        SupervisorAppointment,
    )

    if role == CapacityRole.SUPERVISOR:
        active_load = SupervisorAppointment.objects.filter(
            supervisor=user,
            status=SupervisorAppointment.Status.ACTIVE,
        ).count()
        return _non_negative(active_load), 0

    active_load = PanelAppointment.objects.filter(
        panel_member=user,
        status=PanelAppointment.Status.ACTIVE,
    ).count()
    reserved_recommendations = PanelRecommendation.objects.filter(
        recommended_member=user,
        status__in=PanelRecommendation.WORKLOAD_RESERVED_STATUSES,
    )
    if exclude_panel_recommendation_id is not None:
        reserved_recommendations = reserved_recommendations.exclude(
            pk=exclude_panel_recommendation_id
        )
    reserved_load = reserved_recommendations.count()
    return _non_negative(active_load), _non_negative(reserved_load)


def _is_eligible(*, user, lecturer, role):
    if (
        not getattr(user, "is_active", False)
        or lecturer is None
        or lecturer.lifecycle_status != Lecturer.Lifecycle.ACTIVE
    ):
        return False

    role_model = Supervisor if role == CapacityRole.SUPERVISOR else Panel
    return role_model.objects.filter(lecturer_id=lecturer.pk).exists()


def derive_capacity_resolution(
    *,
    semester_id,
    plan_id,
    plan_version,
    role,
    limit,
    active_load,
    reserved_load,
    eligible,
    unavailable_until,
):
    """Apply the shared capacity-state precedence to caller-loaded values."""
    role = CapacityRole(role)
    active_load = _non_negative(active_load)
    reserved_load = _non_negative(reserved_load)
    limit = _non_negative(limit) if limit is not None else None
    total_load = active_load + reserved_load
    available_slots = max(limit - total_load, 0) if limit is not None else 0

    if not eligible:
        state = CapacityState.INELIGIBLE
    elif plan_id is None or limit is None:
        state = CapacityState.NOT_CONFIGURED
    elif unavailable_until is not None:
        state = CapacityState.TEMPORARILY_UNAVAILABLE
    elif total_load > limit:
        state = CapacityState.OVER_CAPACITY
    elif total_load == limit:
        state = CapacityState.FULL
    else:
        state = CapacityState.AVAILABLE

    return CapacityResolution(
        semester_id=semester_id,
        plan_id=plan_id,
        plan_version=plan_version,
        role=role,
        limit=limit,
        active_load=active_load,
        reserved_load=reserved_load,
        available_slots=available_slots,
        state=state,
        unavailable_until=(
            unavailable_until
            if state == CapacityState.TEMPORARILY_UNAVAILABLE
            else None
        ),
    )


def resolve_lecturer_capacity(
    *,
    user,
    semester,
    role,
    on_date=None,
    exclude_panel_recommendation_id=None,
) -> CapacityResolution:
    role = CapacityRole(role)
    on_date = on_date or timezone.localdate()

    lecturer = (
        Lecturer.objects.select_related("user")
        .filter(user_id=getattr(user, "pk", None))
        .first()
    )
    persisted_user = lecturer.user if lecturer is not None else user
    eligible = _is_eligible(
        user=persisted_user,
        lecturer=lecturer,
        role=role,
    )
    active_load, reserved_load = _workloads(
        user=user,
        role=role,
        exclude_panel_recommendation_id=exclude_panel_recommendation_id,
    )

    plan = (
        SemesterCapacityPlan.objects.filter(
            academic_semester_id=semester.pk,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.PUBLISHED,
        )
        .only("pk", "version")
        .first()
    )
    entry_values = None
    if plan is not None and lecturer is not None:
        entry_values = (
            LecturerCapacityEntry.objects.filter(
                plan_id=plan.pk,
                lecturer_id=lecturer.pk,
            )
            .values("supervisor_limit", "panel_limit")
            .first()
        )

    limit_field = (
        "supervisor_limit" if role == CapacityRole.SUPERVISOR else "panel_limit"
    )
    configured_limit = entry_values[limit_field] if entry_values is not None else None
    limit = _non_negative(configured_limit) if configured_limit is not None else None

    matched_window_end = None
    if lecturer is not None:
        matched_window_end = (
            LecturerAvailabilityWindow.objects.filter(
                academic_semester_id=semester.pk,
                lecturer_id=lecturer.pk,
                role=role.value,
                cancelled_at__isnull=True,
                starts_on__lte=on_date,
                ends_on__gte=on_date,
            )
            .order_by("-ends_on", "-pk")
            .values_list("ends_on", flat=True)
            .first()
        )

    return derive_capacity_resolution(
        semester_id=semester.pk,
        plan_id=plan.pk if plan is not None else None,
        plan_version=plan.version if plan is not None else None,
        role=role,
        limit=limit,
        active_load=active_load,
        reserved_load=reserved_load,
        eligible=eligible,
        unavailable_until=matched_window_end,
    )


def capacity_conflict_message(result):
    state = CapacityState(result.state)
    if (
        state == CapacityState.TEMPORARILY_UNAVAILABLE
        and result.unavailable_until is not None
    ):
        return (
            "Lecturer is temporarily unavailable for new assignments through "
            f"{result.unavailable_until.isoformat()}."
        )
    if state == CapacityState.NOT_CONFIGURED:
        return "Lecturer capacity is not configured for this assignment."
    if state == CapacityState.INELIGIBLE:
        return "Lecturer is not eligible for this assignment."
    if state == CapacityState.OVER_CAPACITY:
        return "Lecturer is over capacity and cannot accept a new assignment."
    if state == CapacityState.FULL:
        return "Lecturer has no available capacity for this assignment."
    return "Lecturer capacity allows this assignment."


def assert_capacity_allows_assignment(
    *,
    user,
    semester,
    role,
    on_date=None,
    exclude_panel_recommendation_id=None,
):
    if semester is None:
        raise CapacityConflict(
            "Lecturer capacity is not configured for this assignment."
        )
    result = resolve_lecturer_capacity(
        user=user,
        semester=semester,
        role=role,
        on_date=on_date,
        exclude_panel_recommendation_id=exclude_panel_recommendation_id,
    )
    if result.state != CapacityState.AVAILABLE:
        raise CapacityConflict(capacity_conflict_message(result))
    return result
