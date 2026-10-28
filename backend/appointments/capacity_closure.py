"""Close unaccepted requests only after confirmed workload fills their policy.

Callers hold policy-semester and Lecturer locks inside their activation transaction.
Reservations alone never close another student's request.
"""
from django.utils import timezone

from academics.capacity import CapacityConflict, resolve_lecturer_capacity
from .models import AppointmentWorkflowEvent, SupervisorApplication
from .notifications import publish_workflow_notification


def acceptance_capacity(application, *, cache=None):
    if application.status not in ("SUBMITTED_TO_SUPERVISOR", "PENDING_COORDINATOR"):
        return None
    return request_capacity(application, cache=cache)


def request_capacity(application, *, cache=None):
    """Current aggregate counts under this request's usable effective policy."""
    from .capacity_reassessment import capacity_semester
    try:
        semester = capacity_semester(application)
    except CapacityConflict:
        semester = None
    key = (application.proposed_supervisor_id, semester.pk if semester else None)
    if cache is not None and key in cache:
        return cache[key]
    if semester is None:
        # Preserve the global counts, but do not imply a usable policy for a
        # stale reassessment or legacy/unassigned request.
        from academics.capacity import _workloads
        active, reserved = _workloads(user=application.proposed_supervisor, role="SUPERVISOR")
        payload = {"activeLoad": active, "reservedLoad": reserved, "limit": None,
                "availableSlots": 0, "pendingRequests": SupervisorApplication.objects.filter(
                    proposed_supervisor_id=application.proposed_supervisor_id, status="SUBMITTED_TO_SUPERVISOR").count(),
                "state": "NOT_CONFIGURED"}
    else:
        result = resolve_lecturer_capacity(user=application.proposed_supervisor, semester=semester, role="SUPERVISOR")
        payload = {"activeLoad": result.active_load, "reservedLoad": result.reserved_load,
                "limit": result.limit, "availableSlots": result.available_slots,
                "pendingRequests": result.pending_requests, "state": str(result.state)}
    if cache is not None:
        cache[key] = payload
    return payload


def supervisor_workload_summary(application):
    capacity = request_capacity(application)
    return f"{capacity['activeLoad'] + capacity['reservedLoad']}/{capacity['limit'] or 0} Supervisees"


def close_capacity_full_requests(*, supervisor, actor):
    from .capacity_reassessment import capacity_semester
    rows = SupervisorApplication.objects.select_for_update(of=("self",)).filter(
        proposed_supervisor=supervisor, status="SUBMITTED_TO_SUPERVISOR"
    ).select_related("academic_semester", "student__user").order_by("pk")
    resolutions = {}
    for application in rows:
        try:
            semester = capacity_semester(application)
        except CapacityConflict:
            continue
        if semester is None:
            continue
        if semester.pk not in resolutions:
            resolutions[semester.pk] = resolve_lecturer_capacity(user=supervisor, semester=semester, role="SUPERVISOR")
        result = resolutions[semester.pk]
        if result.plan_id is None or result.limit is None or result.active_load < result.limit:
            continue
        application.status = SupervisorApplication.Status.CANCELLED_CAPACITY_FULL
        application.cancellation_reason = "This request was automatically closed because the Supervisor's confirmed workload reached the capacity limit."
        application.cancelled_at = timezone.now()
        application.save(update_fields=["status", "cancellation_reason", "cancelled_at", "updated_at"])
        AppointmentWorkflowEvent.objects.create(supervisor_application=application,
            actor=actor, actor_role="SYSTEM", action="SYSTEM_CLOSE_CAPACITY",
            previous_status="SUBMITTED_TO_SUPERVISOR", new_status=application.status,
            reason=application.cancellation_reason)
        for recipient in (application.student.user, supervisor):
            publish_workflow_notification(recipient=recipient, actor=actor,
                event_key=f"supervisor:{application.pk}:capacity-full", title="Supervisor capacity full",
                summary="The pending Supervisor request was automatically closed because capacity is full.",
                message=application.cancellation_reason, module_label="Supervisor Appointment",
                target_module="SUPERVISOR_APPOINTMENTS", record_type="SUPERVISOR_APPLICATION", record_id=application.pk)
