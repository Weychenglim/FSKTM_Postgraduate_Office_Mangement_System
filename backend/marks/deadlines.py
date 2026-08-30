from datetime import datetime

from django.utils import timezone


def _local_date(value):
    if not isinstance(value, datetime):
        return value
    if timezone.is_naive(value):
        value = timezone.make_aware(value, timezone.get_current_timezone())
    return timezone.localdate(value)


def mark_deadline_metadata(due_at, *, is_submitted, now=None):
    now = now or timezone.now()
    days_until_due = None
    if due_at is not None:
        try:
            days_until_due = (_local_date(due_at) - _local_date(now)).days
        except (AttributeError, TypeError, ValueError):
            days_until_due = None

    if is_submitted:
        deadline_state = "COMPLETE"
    elif due_at is None:
        deadline_state = "NO_DEADLINE"
    elif due_at < now:
        deadline_state = "OVERDUE"
    elif days_until_due == 0:
        deadline_state = "DUE_TODAY"
    else:
        deadline_state = "UPCOMING"

    return {
        "dueAt": due_at,
        "daysUntilDue": days_until_due,
        "deadlineState": deadline_state,
    }
