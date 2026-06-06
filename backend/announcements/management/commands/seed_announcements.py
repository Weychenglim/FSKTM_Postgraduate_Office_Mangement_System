"""Seed a starter set of announcements and fan them out to recipients.

Idempotent: re-running clears the previously seeded rows (matched by title) and
their delivered notifications, then recreates them so the demo feed stays clean.

    python manage.py seed_announcements

Run ``seed_users`` first so there are recipients to deliver to.
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from announcements.models import Announcement
from announcements.views import _fan_out

User = get_user_model()

ANNOUNCEMENTS = [
    {
        "title": "Semester 1 Exam Schedule Released",
        "content": (
            "The examination schedule for Semester 1, Session 2025/2026 has been "
            "published. Please check the portal for your venue details and review "
            "the attached checklist before your assessment dates."
        ),
        "target": Announcement.Audience.STUDENTS,
        "priority": Announcement.Priority.URGENT,
    },
    {
        "title": "New Research Grant Opportunity",
        "content": (
            "An internal funding call is now open for faculty members with "
            "collaborative partners in South East Asia. Submit your expression of "
            "interest to the Postgraduate Office before the deadline."
        ),
        "target": Announcement.Audience.LECTURERS,
        "priority": Announcement.Priority.INFO,
    },
    {
        "title": "System Maintenance Notice",
        "content": (
            "The e-learning platform will be offline for approximately two hours "
            "this weekend for security renewal and scheduled backups. Plan your "
            "submissions accordingly."
        ),
        "target": Announcement.Audience.ALL,
        "priority": Announcement.Priority.GENERAL,
    },
]


class Command(BaseCommand):
    help = "Seed demo announcements and deliver them to the matching recipients."

    def handle(self, *args, **options):
        author = (
            User.objects.filter(role=User.Role.OFFICE_ADMIN).first()
            or User.objects.filter(is_superuser=True).first()
        )
        author_name = getattr(author, "full_name", "") if author else "Postgraduate Office"

        for data in ANNOUNCEMENTS:
            Announcement.objects.filter(title=data["title"]).delete()
            announcement = Announcement.objects.create(
                created_by=author,
                created_by_name=author_name or "Postgraduate Office",
                status=Announcement.Status.ACTIVE,
                **data,
            )
            delivered = _fan_out(announcement)
            self.stdout.write(
                f"  Published {announcement.target:<13} {announcement.title} "
                f"(delivered to {delivered})"
            )

        self.stdout.write(self.style.SUCCESS("\nDemo announcements ready."))
