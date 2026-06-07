"""Seed the demo login accounts and their role profiles.

These mirror the frontend's DEMO_CREDENTIALS so the login screen's
demo-prefill buttons keep working against the real backend.

    python manage.py seed_users

Idempotent: re-running updates the existing rows and resets passwords.

Number format standard:
- Student matric_no: numbers only, for example 200192, 2209841
- Lecturer / Panel staff_no: L + 5 digits, for example L84920, L04812
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
from appointments.models import StudentResearchProfile


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
            "staff_no": "L29402",
            "department": "Software Engineering Division",
            "title": "Dr.",
            "specialization": "Software Engineering",
        },
        "coordinator": {
            "programme_managed": "MASTER OF CYBER SECURITY (COURSEWORK)",
        },
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
        "supervisor": {
            "max_supervisees": 5,
        },
        "panel": {
            "max_appointments": 10,
        },
    },
    {
        "email": "panelamina@fsktm.edu.my",
        "password": "lecturer2026",
        "full_name": "Assoc. Prof. Dr. Amina Malik",
        "role": User.Role.LECTURER,
        "lecturer": {
            "staff_no": "L04812",
            "department": "Data Science Department",
            "title": "Assoc. Prof. Dr.",
            "specialization": "Data Science",
        },
        "panel": {
            "max_appointments": 10,
        },
    },
    {
        "email": "WEA200192@fsktm.edu.my",
        "password": "student2026",
        "full_name": "Fatimah Al-Zahra",
        "role": User.Role.STUDENT,
        "student": {
            "matric_no": "200192",
            "programme": "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
            "status": Student.Status.ACTIVE,
            "intake_semester": "2024/2025 Semester 1",
        },
    },
    {
        "email": "MEA2209841@fsktm.edu.my",
        "password": "student2026",
        "full_name": "Ahmad Luqman",
        "role": User.Role.STUDENT,
        "student": {
            "matric_no": "2209841",
            "programme": "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
            "status": Student.Status.ACTIVE,
            "intake_semester": "2025/2026 Semester 1",
        },
    },
]


PANEL_RESEARCH_PROFILES = [
    {
        "matric_no": "2209841",
        "student_email": "MEA2209841@fsktm.edu.my",
        "student_name": "Ahmad Luqman",
        "programme": "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
        "semester": "Sem 1 2025/2026",
        "proposed_topic": "Optimizing Generative Adversarial Networks for Low-Resource Languages",
        "research_area": "Artificial Intelligence",
        "abstract": (
            "This research explores novel architectural improvements for GANs to improve "
            "synthetic data quality in languages with limited linguistic resources."
        ),
        "supervisor_email": "lecturer@fsktm.edu.my",
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

            # Demo accounts skip the forced password change on first login.
            data["must_change_password"] = False

            user, created = User.objects.update_or_create(
                email=email,
                defaults=data,
            )

            user.set_password(password)
            user.save()

            if student is not None:
                Student.objects.update_or_create(
                    user=user,
                    defaults=student,
                )

            if office_staff is not None:
                OfficeStaff.objects.update_or_create(
                    user=user,
                    defaults=office_staff,
                )

            lecturer_obj = None

            if lecturer is not None:
                lecturer_obj, _ = Lecturer.objects.update_or_create(
                    user=user,
                    defaults=lecturer,
                )

            if lecturer_obj is not None and coordinator is not None:
                Coordinator.objects.update_or_create(
                    lecturer=lecturer_obj,
                    defaults=coordinator,
                )

            if lecturer_obj is not None and supervisor is not None:
                Supervisor.objects.update_or_create(
                    lecturer=lecturer_obj,
                    defaults=supervisor,
                )

            if lecturer_obj is not None and panel is not None:
                Panel.objects.update_or_create(
                    lecturer=lecturer_obj,
                    defaults=panel,
                )

            verb = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(f"  {verb} {user.role:<22} {user.email}")
            )

        for entry in PANEL_RESEARCH_PROFILES:
            student_user = User.objects.get(email=entry["student_email"])
            supervisor_user = User.objects.get(email=entry["supervisor_email"])

            profile, created = StudentResearchProfile.objects.update_or_create(
                student=student_user,
                defaults={
                    "matric_no": entry["matric_no"],
                    "student_name": entry["student_name"],
                    "programme": entry["programme"],
                    "semester": entry["semester"],
                    "proposed_topic": entry["proposed_topic"],
                    "research_area": entry["research_area"],
                    "abstract": entry["abstract"],
                    "supervisor": supervisor_user,
                },
            )
            verb = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(f"  {verb} panel profile {profile.matric_no}")
            )

        self.stdout.write(
            self.style.SUCCESS("\nDemo accounts + role profiles ready.")
        )