"""Seed the demo login accounts and their role profiles.

These mirror the frontend's ``DEMO_CREDENTIALS`` (src/types/auth.ts) so the
login screen's demo-prefill buttons keep working against the real backend.

    python manage.py seed_users

Idempotent: re-running updates the existing rows (and resets their passwords).
The coordinator is seeded as a Lecturer that *also* has a Coordinator profile,
and the lecturer also gets Supervisor + Panel profiles — demonstrating the
overlapping Lecturer specializations.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import (
    Coordinator,
    Lecturer,
    OfficeStaff,
    Panel,
    Student,
    Supervisor,
    User,
)

DEMO_USERS = [
    {
        "email": "admin@fsktm.edu.my",
        "password": "staffAdmin2026",
        "full_name": "Puan Noraini binti Kamaruddin",
        "role": User.Role.OFFICE_ADMIN,
        "office_staff": {
            "staff_no": "M10492",
            "department": "Postgraduate Office Division",
            "position": "Senior Administrative Officer",
        },
    },
    {
        "email": "coordinator@fsktm.edu.my",
        "password": "coordinator2026",
        "full_name": "Dr. Adrian Tan Kok Seng",
        "role": User.Role.COORDINATOR,
        "lecturer": {
            "staff_no": "C29402",
            "department": "Software Engineering Division",
            "title": "Dr.",
            "specialization": "Software Engineering",
        },
        "coordinator": {"programme_managed": "Master of Software Engineering"},
    },
    {
        "email": "lecturer@fsktm.edu.my",
        "password": "lecturer2026",
        "full_name": "Prof. Dr. Ahmad Shahrir",
        "role": User.Role.LECTURER,
        "lecturer": {
            "staff_no": "L84920",
            "department": "Artificial Intelligence Department",
            "title": "Prof. Dr.",
            "specialization": "Artificial Intelligence",
        },
        "supervisor": {"max_supervisees": 5},
        "panel": {"max_appointments": 10},
    },
    {
        "email": "WEA200192@fsktm.edu.my",
        "password": "student2026",
        "full_name": "Fatimah Al-Zahra",
        "role": User.Role.STUDENT,
        "student": {
            "matric_no": "WEA200192",
            "programme": "Master of Computer Science (By Coursework)",
            "status": Student.Status.ACTIVE,
            "intake_semester": "2024/2025 Semester 1",
        },
    },
]


class Command(BaseCommand):
    help = "Seed/refresh the demo login accounts and their role profiles."

    @transaction.atomic
    def handle(self, *args, **options):
        for entry in DEMO_USERS:
            data = dict(entry)
            password = data.pop("password")
            email = data.pop("email")

            student = data.pop("student", None)
            office_staff = data.pop("office_staff", None)
            lecturer = data.pop("lecturer", None)
            coordinator = data.pop("coordinator", None)
            supervisor = data.pop("supervisor", None)
            panel = data.pop("panel", None)

            # Demo accounts skip the FR-04 forced-change-on-first-login friction.
            data["must_change_password"] = False

            user, created = User.objects.update_or_create(email=email, defaults=data)
            user.set_password(password)
            user.save()

            if student is not None:
                Student.objects.update_or_create(user=user, defaults=student)
            if office_staff is not None:
                OfficeStaff.objects.update_or_create(user=user, defaults=office_staff)

            lecturer_obj = None
            if lecturer is not None:
                lecturer_obj, _ = Lecturer.objects.update_or_create(
                    user=user, defaults=lecturer
                )
            if lecturer_obj is not None and coordinator is not None:
                Coordinator.objects.update_or_create(
                    lecturer=lecturer_obj, defaults=coordinator
                )
            if lecturer_obj is not None and supervisor is not None:
                Supervisor.objects.update_or_create(
                    lecturer=lecturer_obj, defaults=supervisor
                )
            if lecturer_obj is not None and panel is not None:
                Panel.objects.update_or_create(lecturer=lecturer_obj, defaults=panel)

            verb = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(f"  {verb} {user.role:<22} {user.email}")
            )

        self.stdout.write(self.style.SUCCESS("\nDemo accounts + role profiles ready."))
