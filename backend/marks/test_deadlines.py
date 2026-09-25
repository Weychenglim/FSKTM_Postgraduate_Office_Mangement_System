from datetime import datetime, time, timedelta

from django.test import SimpleTestCase
from django.utils import timezone

from marks.deadlines import mark_deadline_metadata


class MarkDeadlineMetadataTests(SimpleTestCase):
    def setUp(self):
        self.now = timezone.make_aware(
            datetime.combine(timezone.localdate(), time(hour=12)),
            timezone.get_current_timezone(),
        )

    def test_no_deadline_is_reported_without_fabricating_days(self):
        self.assertEqual(
            mark_deadline_metadata(None, is_submitted=False, now=self.now),
            {
                "dueAt": None,
                "daysUntilDue": None,
                "deadlineState": "NO_DEADLINE",
            },
        )

    def test_future_due_today_and_overdue_deadlines_are_distinct(self):
        future = self.now + timedelta(days=3)
        due_today = self.now + timedelta(hours=1)
        overdue = self.now - timedelta(days=2)

        self.assertEqual(
            mark_deadline_metadata(future, is_submitted=False, now=self.now),
            {
                "dueAt": future,
                "daysUntilDue": 3,
                "deadlineState": "UPCOMING",
            },
        )
        self.assertEqual(
            mark_deadline_metadata(due_today, is_submitted=False, now=self.now)[
                "deadlineState"
            ],
            "DUE_TODAY",
        )
        self.assertEqual(
            mark_deadline_metadata(overdue, is_submitted=False, now=self.now),
            {
                "dueAt": overdue,
                "daysUntilDue": -2,
                "deadlineState": "OVERDUE",
            },
        )

    def test_submitted_mark_is_complete_even_when_period_has_closed(self):
        due_at = self.now - timedelta(days=5)

        self.assertEqual(
            mark_deadline_metadata(due_at, is_submitted=True, now=self.now),
            {
                "dueAt": due_at,
                "daysUntilDue": -5,
                "deadlineState": "COMPLETE",
            },
        )
