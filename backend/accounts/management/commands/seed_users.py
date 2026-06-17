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
    StudentRegistry,
    Supervisor,
    User,
)

DEMO_USERS = [
    {
        "email": "admin@siswa.um.edu.my",
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
        "email": "coordinator@siswa.um.edu.my",
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
        "email": "lecturer@siswa.um.edu.my",
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
        "email": "WEA200192@siswa.um.edu.my",
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
    {
        # Primary viva demo account (real UM mailbox, used for the live
        # forgot-password / reset-email demonstration).
        "email": "23004955@siswa.um.edu.my",
        "password": "Kkx@041125",
        "full_name": "Ku Kian Xiang",
        "role": User.Role.STUDENT,
        "student": {
            "matric_no": "23004955",
            "programme": "Master of Computer Science (By Coursework)",
            "status": Student.Status.ACTIVE,
            "intake_semester": "2024/2025 Semester 1",
        },
        # Extended registry details so the confirmation/visa letter can fill its
        # placeholders. Demo values — editable in the Django admin (Student page).
        "student_registry": {
            "ic_number": "051104-14-5523",
            "passport_number": "",
            "nationality": "Malaysian",
            "address": "Faculty of Computer Science & Information Technology, "
            "Universiti Malaya, 50603 Kuala Lumpur",
            "programme_mode": StudentRegistry.ProgrammeMode.COURSEWORK,
            "field_of_study": "Computer Science",
            "mode_of_study": StudentRegistry.StudyMode.FULL_TIME,
            "current_semester": "Semester II, 2025/2026 Session",
            "max_semester": "Semester I, 2027/2028 Session",
            "expected_completion": "Semester I, 2027/2028 Session",
            "sponsor": "Self-funded",
        },
    },
]


class Command(BaseCommand):
    help = "Seed/refresh the demo login accounts and their role profiles."

    @staticmethod
    def _purge_conflicts(entry):
        """Delete any pre-existing account that collides on a unique profile
        number (matric_no / staff_no) but uses a *different* email — e.g. a row
        left over from an earlier seed under the old ``@fsktm.edu.my`` domain.
        Cascades remove the linked profile rows so the new email can reuse the
        number. Re-running with the same emails is a no-op (excluded by email)."""
        email = entry["email"]
        if "student" in entry:
            User.objects.filter(
                student__matric_no=entry["student"]["matric_no"]
            ).exclude(email=email).delete()
        if "office_staff" in entry:
            User.objects.filter(
                office_staff__staff_no=entry["office_staff"]["staff_no"]
            ).exclude(email=email).delete()
        if "lecturer" in entry:
            User.objects.filter(
                lecturer__staff_no=entry["lecturer"]["staff_no"]
            ).exclude(email=email).delete()

    @transaction.atomic
    def handle(self, *args, **options):
        for entry in DEMO_USERS:
            self._purge_conflicts(entry)

            data = dict(entry)
            password = data.pop("password")
            email = data.pop("email")

            student = data.pop("student", None)
            student_registry = data.pop("student_registry", None)
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
                student_obj, _ = Student.objects.update_or_create(
                    user=user, defaults=student
                )
                if student_registry is not None:
                    StudentRegistry.objects.update_or_create(
                        student=student_obj, defaults=student_registry
                    )
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
