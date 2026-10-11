"""Deadline reminders and the weekly summary email (UC33).

Run by the ``send_deadline_reminders`` and ``send_weekly_summary`` commands from
Task Scheduler or cron. Both are safe to rerun: a reminder is one notification
per person per deadline (``event_key``), and a summary is one email per person
per week (``WeeklySummaryLog``).

People with "Deadline reminders" off get no reminders; email copies also need
"Email alerts" (see ``emails.py``).
"""
from collections import Counter
from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from academics.services import current_effective_semester
from dashboard.models import SemesterTimelineEntry
from marks.models import EvaluationPeriod, EvaluationTask, MarkEntry

from .emails import DEADLINE, SIGN_OFF, SUMMARY, email_users, portal_link
from .models import Notification, WeeklySummaryLog

User = get_user_model()

# Timeline target roles -> portal roles, the same mapping the dashboard uses.
TIMELINE_ROLES = {
    "STUDENT": User.Role.STUDENT,
    "LECTURER": User.Role.LECTURER,
    "OFFICE_STAFF": User.Role.OFFICE_ADMIN,
}
SUMMARY_ITEMS = 20


def _due_in(days):
    if days <= 0:
        return "today"
    if days == 1:
        return "tomorrow"
    return f"in {days} days"


def _remind(users, *, event_key, title, summary, message, link, target_module, record_type, record_id, urgent):
    """Give each user this reminder once, and email it where allowed. Returns how many were new."""
    have = set(
        Notification.objects.filter(event_key=event_key, recipient__in=users).values_list("recipient_id", flat=True)
    )
    fresh = [user for user in users if user.pk not in have]
    if not fresh:
        return 0
    Notification.objects.bulk_create(
        [
            Notification(
                recipient=user,
                title=title[:255],
                service="Postgraduate Office",
                summary=summary[:255],
                message=message,
                priority=Notification.Priority.HIGH if urgent else Notification.Priority.MEDIUM,
                is_announcement=False,
                reference=f"{record_type}-{record_id}"[:64],
                module_label="Deadline Reminder",
                target_module=target_module,
                record_type=record_type,
                record_id=str(record_id),
                event_key=event_key,
            )
            for user in fresh
        ],
        ignore_conflicts=True,
    )
    email_users(
        fresh,
        DEADLINE,
        title,
        f"{message}\n\nOpen the portal: {portal_link(link)}\n\n"
        "You get this email because email alerts and deadline reminders are on in your Settings.\n\n"
        f"{SIGN_OFF}",
    )
    return len(fresh)


def _timeline_reminders(today, days):
    semester = current_effective_semester()
    if semester is None:
        return 0
    entries = SemesterTimelineEntry.objects.filter(
        timeline__is_active=True,
        timeline__academic_semester=semester,
        deadline_end__gte=today,
        deadline_end__lte=today + timedelta(days=days),
    ).order_by("deadline_end", "display_order")
    created = 0
    for entry in entries:
        roles = [TIMELINE_ROLES[role] for role in entry.target_roles if role in TIMELINE_ROLES]
        users = list(User.objects.filter(is_active=True, role__in=roles, deadline_reminders=True))
        if not users:
            continue
        left = (entry.deadline_end - today).days
        created += _remind(
            users,
            event_key=f"reminder:timeline:{entry.pk}:{entry.deadline_end.isoformat()}",
            title=f"Deadline {_due_in(left)}: {entry.title or entry.detail[:80]}",
            summary=f"Due {entry.deadline_end:%d %b %Y}",
            message=f"{entry.detail}\n\nDue: {entry.deadline_end:%d %B %Y}. Action by: {entry.action_owner}.",
            link="/dashboard",
            target_module="DASHBOARD",
            record_type="TIMELINE_ENTRY",
            record_id=entry.pk,
            urgent=left <= 1,
        )
    return created


def _marks_reminders(now, today, days):
    horizon = timezone.make_aware(datetime.combine(today + timedelta(days=days + 1), time.min))
    periods = EvaluationPeriod.objects.filter(
        lifecycle_status=EvaluationPeriod.Lifecycle.PUBLISHED,
        closes_at__gte=now,
        closes_at__lt=horizon,
    ).filter(Q(opens_at__isnull=True) | Q(opens_at__lte=now))
    created = 0
    for period in periods:
        unfinished = Counter(
            EvaluationTask.objects.filter(period=period, lifecycle_status=EvaluationTask.Lifecycle.ACTIVE)
            .exclude(mark_entry__status=MarkEntry.Status.SUBMITTED)
            .values_list("evaluator_id", flat=True)
        )
        closes = timezone.localtime(period.closes_at)
        left = (closes.date() - today).days
        for evaluator in User.objects.filter(pk__in=unfinished, is_active=True, deadline_reminders=True):
            count = unfinished[evaluator.pk]
            created += _remind(
                [evaluator],
                event_key=f"reminder:marks:{period.pk}:{period.closes_at.isoformat()}",
                title=f"Marks due {_due_in(left)}: {period.name}",
                summary=f"{count} evaluation task{'s' if count != 1 else ''} not submitted",
                message=(
                    f"You have {count} evaluation task{'s' if count != 1 else ''} in {period.name} "
                    f"not submitted yet. The period closes on {closes:%d %B %Y, %I:%M %p}."
                ),
                link="/marks",
                target_module="MARKS",
                record_type="EVALUATION_PERIOD",
                record_id=period.pk,
                urgent=left <= 1,
            )
    return created


def send_deadline_reminders(days=3, now=None):
    """Remind people of timeline and Marks deadlines in the next ``days`` days.
    Returns ``(timeline, marks)``: how many new reminders each part created."""
    now = now or timezone.now()
    today = timezone.localdate(now)
    return _timeline_reminders(today, days), _marks_reminders(now, today, days)


def send_weekly_summaries(now=None):
    """Email everyone who turned the weekly summary on a list of their unread
    notifications from the past seven days. Returns how many emails were sent."""
    now = now or timezone.now()
    today = timezone.localdate(now)
    week_start = today - timedelta(days=today.weekday())
    since = now - timedelta(days=7)
    sent = 0
    people = (
        User.objects.filter(is_active=True, weekly_summary=True)
        .exclude(email="")
        .exclude(role=User.TECHNICAL_ADMIN)
    )
    for user in people:
        unread = Notification.objects.filter(recipient=user, is_read=False, created_at__gte=since)
        total = unread.count()
        if not total:
            continue
        with transaction.atomic():
            log, created = WeeklySummaryLog.objects.get_or_create(
                user=user, week_start=week_start, defaults={"notification_count": total}
            )
        if not created:
            continue
        lines = [
            f"- {item.title} ({timezone.localtime(item.created_at):%d %b, %I:%M %p})"
            for item in unread.order_by("-created_at")[:SUMMARY_ITEMS]
        ]
        if total > SUMMARY_ITEMS:
            lines.append(f"- and {total - SUMMARY_ITEMS} more")
        message = (
            f"Hello {user.full_name or user.email},\n\n"
            f"You have {total} unread notification{'s' if total != 1 else ''} from the past week:\n\n"
            + "\n".join(lines)
            + f"\n\nRead them in the portal: {portal_link('/notifications')}\n\n"
            "You get this email because the weekly summary is on in your Settings.\n\n"
            f"{SIGN_OFF}"
        )
        if email_users([user], SUMMARY, "Your FSKTM PG Office weekly summary", message):
            sent += 1
        else:
            # Nothing went out, so let a later run try again this week.
            log.delete()
    return sent
