"""Seed the four demo login accounts.

These mirror the frontend's ``DEMO_CREDENTIALS`` (src/types/auth.ts) so the
login screen's demo-prefill buttons keep working against the real backend.

    python manage.py seed_users

Idempotent: re-running updates the existing rows (and resets their passwords).
"""
from django.core.management.base import BaseCommand

from accounts.models import User

DEMO_USERS = [
    {
        "email": "admin@fsktm.edu.my",
        "password": "staffAdmin2026",
        "full_name": "Puan Noraini binti Kamaruddin",
        "role": User.Role.OFFICE_ADMIN,
        "department": "Postgraduate Office Division",
        "staff_id": "M10492",
    },
    {
        "email": "coordinator@fsktm.edu.my",
        "password": "coordinator2026",
        "full_name": "Dr. Adrian Tan Kok Seng",
        "role": User.Role.COORDINATOR,
        "department": "Software Engineering Division",
        "staff_id": "C29402",
    },
    {
        "email": "lecturer@fsktm.edu.my",
        "password": "lecturer2026",
        "full_name": "Prof. Dr. Ahmad Shahrir",
        "role": User.Role.LECTURER,
        "department": "Artificial Intelligence Department",
        "staff_id": "L84920",
    },
    {
        "email": "WEA200192@fsktm.edu.my",
        "password": "student2026",
        "full_name": "Fatimah Al-Zahra",
        "role": User.Role.STUDENT,
        "department": "Master of Computer Science (By Coursework)",
        "student_id": "WEA200192",
    },
]


class Command(BaseCommand):
    help = "Seed/refresh the four demo login accounts."

    def handle(self, *args, **options):
        for entry in DEMO_USERS:
            data = dict(entry)
            password = data.pop("password")
            email = data.pop("email")
            user, created = User.objects.update_or_create(email=email, defaults=data)
            user.set_password(password)
            user.save()
            verb = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  {verb} {user.role:<22} {user.email}"))

        self.stdout.write(self.style.SUCCESS("\nDemo accounts ready."))
