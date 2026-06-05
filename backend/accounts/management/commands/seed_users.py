"""Seed the four demo login accounts.

These mirror the frontend's ``DEMO_CREDENTIALS`` (src/types/auth.ts) so the
login screen's demo-prefill buttons keep working against the real backend.

    python manage.py seed_users

Idempotent: re-running updates the existing rows (and resets their passwords).
"""
from django.core.management.base import BaseCommand

from accounts.models import User
from appointments.models import StudentResearchProfile

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
        "email": "panelamina@fsktm.edu.my",
        "password": "lecturer2026",
        "full_name": "Assoc. Prof. Dr. Amina Malik",
        "role": User.Role.LECTURER,
        "department": "Data Science Department",
        "staff_id": "A004812",
    },
    {
        "email": "WEA200192@fsktm.edu.my",
        "password": "student2026",
        "full_name": "Fatimah Al-Zahra",
        "role": User.Role.STUDENT,
        "department": "Master of Computer Science (By Coursework)",
        "student_id": "WEA200192",
    },
    {
        "email": "MEA2209841@fsktm.edu.my",
        "password": "student2026",
        "full_name": "Ahmad Luqman",
        "role": User.Role.STUDENT,
        "department": "MSc. Computer Science",
        "student_id": "MEA2209841",
    },
]

PANEL_RESEARCH_PROFILES = [
    {
        "matric_no": "MEA2209841",
        "student_email": "MEA2209841@fsktm.edu.my",
        "student_name": "Ahmad Luqman",
        "programme": "MSc. Computer Science",
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

        for entry in PANEL_RESEARCH_PROFILES:
            student = User.objects.get(email=entry["student_email"])
            supervisor = User.objects.get(email=entry["supervisor_email"])
            profile, created = StudentResearchProfile.objects.update_or_create(
                matric_no=entry["matric_no"],
                defaults={
                    "student": student,
                    "student_name": entry["student_name"],
                    "programme": entry["programme"],
                    "semester": entry["semester"],
                    "proposed_topic": entry["proposed_topic"],
                    "research_area": entry["research_area"],
                    "abstract": entry["abstract"],
                    "supervisor": supervisor,
                },
            )
            verb = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  {verb} panel profile {profile.matric_no}"))

        self.stdout.write(self.style.SUCCESS("\nDemo accounts ready."))
