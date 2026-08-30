from datetime import datetime

from django.utils import timezone

from .models import PanelRecommendation, SupervisorApplication


EMPTY_WAITING_METADATA = {
    "waitingSince": None,
    "waitingDays": None,
    "waitingOn": None,
}


def _local_date(value):
    if not isinstance(value, datetime):
        return value
    if timezone.is_naive(value):
        value = timezone.make_aware(value, timezone.get_current_timezone())
    return timezone.localdate(value)


def elapsed_calendar_days(waiting_since, *, now=None):
    if waiting_since is None:
        return None
    now = now or timezone.now()
    try:
        elapsed = (_local_date(now) - _local_date(waiting_since)).days
    except (AttributeError, TypeError, ValueError):
        return 0
    return max(0, elapsed)


def _stage_timestamp(record, primary_timestamp):
    if primary_timestamp is not None:
        return primary_timestamp

    workflow_events = getattr(record, "workflow_events", None)
    if workflow_events is not None:
        transition = (
            workflow_events.filter(new_status=record.status)
            .order_by("created_at", "id")
            .first()
        )
        if transition is not None:
            return transition.created_at
    return getattr(record, "updated_at", None)


def _waiting_metadata(record, *, timestamp, waiting_on, now=None):
    waiting_since = _stage_timestamp(record, timestamp)
    return {
        "waitingSince": waiting_since,
        "waitingDays": elapsed_calendar_days(waiting_since, now=now),
        "waitingOn": waiting_on,
    }


def supervisor_waiting_metadata(application, *, now=None):
    if (
        application.status
        == SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR
    ):
        return _waiting_metadata(
            application,
            timestamp=application.submitted_at,
            waiting_on="SUPERVISOR",
            now=now,
        )
    if application.status == SupervisorApplication.Status.PENDING_COORDINATOR:
        return _waiting_metadata(
            application,
            timestamp=application.supervisor_decided_at,
            waiting_on="PROGRAMME_COORDINATOR",
            now=now,
        )
    return EMPTY_WAITING_METADATA.copy()

def panel_waiting_metadata(recommendation, *, now=None, public=False):
    if recommendation.status == PanelRecommendation.Status.SUBMITTED_TO_PANEL:
        waiting_on = "FACULTY_PROCESSING" if public else "SELECTED_PANEL"
        return _waiting_metadata(
            recommendation,
            timestamp=recommendation.submitted_at,
            waiting_on=waiting_on,
            now=now,
        )
    if recommendation.status == PanelRecommendation.Status.PENDING_COORDINATOR:
        waiting_on = "FACULTY_PROCESSING" if public else "PROGRAMME_COORDINATOR"
        return _waiting_metadata(
            recommendation,
            timestamp=recommendation.panel_decided_at,
            waiting_on=waiting_on,
            now=now,
        )
    return EMPTY_WAITING_METADATA.copy()
