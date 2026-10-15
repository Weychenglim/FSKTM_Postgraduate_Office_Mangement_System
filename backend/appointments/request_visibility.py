"""Hide Student withdrawals from routine staff projections, retaining audit records."""
from accounts.models import User
from .models import ResearchAmendmentEvent, SupervisorApplication


def routine_supervisor_requests(rows, actor):
    if actor.role == User.Role.STUDENT:
        return rows
    return rows.exclude(status=SupervisorApplication.Status.CANCELLED_BY_STUDENT)


def routine_research_requests(rows, actor):
    if actor.role == User.Role.STUDENT:
        return rows
    student_withdrawals = ResearchAmendmentEvent.objects.filter(
        action='CANCEL', actor_role=User.Role.STUDENT, new_status='CANCELLED',
    ).values('request_id')
    return rows.exclude(status='CANCELLED', pk__in=student_withdrawals)
