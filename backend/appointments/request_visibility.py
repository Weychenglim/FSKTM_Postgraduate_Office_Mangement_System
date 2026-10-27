"""Shared application access and routine withdrawal visibility, retaining audit records."""
from accounts.models import User
from accounts.authorization import coordinator_manages_programme
from .models import ResearchAmendmentEvent, SupervisorApplication


def can_view_supervisor_application(user, application):
    """Shared application evidence boundary, including team navigation projections."""
    if user.role == User.Role.OFFICE_ADMIN:
        return True
    if user.pk in [application.student.user_id, application.proposed_supervisor_id]:
        return True
    return user.role == User.Role.COORDINATOR and coordinator_manages_programme(
        user, application.student.programme
    )


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
