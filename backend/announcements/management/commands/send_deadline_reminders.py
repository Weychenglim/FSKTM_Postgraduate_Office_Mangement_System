"""Remind people of timeline and Marks deadlines that are coming up.

Run it daily from Windows Task Scheduler or cron (see the backend README). It
is safe to run repeatedly: each person gets one reminder per deadline.
"""
from django.core.management.base import BaseCommand, CommandError

from announcements.reminders import send_deadline_reminders


class Command(BaseCommand):
    help = "Send in-app (and, where allowed, email) reminders for deadlines in the next few days."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=3,
            help="Remind about deadlines due within this many days (default 3).",
        )

    def handle(self, *args, **options):
        days = options["days"]
        if days < 0:
            raise CommandError("--days cannot be negative.")
        timeline, marks = send_deadline_reminders(days=days)
        self.stdout.write(f"Sent {timeline} timeline reminder(s) and {marks} Marks reminder(s).")
