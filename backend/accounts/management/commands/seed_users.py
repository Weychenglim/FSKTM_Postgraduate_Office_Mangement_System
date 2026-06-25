"""Seed the demo login accounts and their role profiles.

These mirror the frontend's DEMO_CREDENTIALS so the login screen's
demo-prefill buttons keep working against the real backend.

    python manage.py seed_users

Idempotent: re-running updates the existing rows and resets passwords.

Number format standard:
- Student matric_no: numbers only, for example 200192, 2209841
- Student email: matric_no@siswa.um.edu.my, for example 200192@siswa.um.edu.my
- Lecturer / Panel staff_no: L + 5 digits, for example L84920, L04812
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import Permission
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
from appointments.models import StudentResearchProfile


# Optional migration helper:
# If old demo accounts already exist, update their emails to the new format.
OLD_TO_NEW_EMAILS = {
    "admin@fsktm.edu.my": "admin@siswa.um.edu.my",
    "coordinator@fsktm.edu.my": "coordinator@siswa.um.edu.my",
    "lecturer@fsktm.edu.my": "lecturer@siswa.um.edu.my",
    "WEA200192@fsktm.edu.my": "200192@siswa.um.edu.my",
    "MEA2209841@fsktm.edu.my": "2209841@siswa.um.edu.my",
    "MEA2301123@fsktm.edu.my": "2301123@siswa.um.edu.my",
}


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
        "email": "200192@siswa.um.edu.my",
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
    {
        "email": "2209841@siswa.um.edu.my",
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
    {
        "email": "2301123@siswa.um.edu.my",
        "password": "student2026",
        "full_name": "Nur Aisyah binti Rahman",
        "role": User.Role.STUDENT,
        "student": {
            "matric_no": "2301123",
            "programme": "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
            "status": Student.Status.ACTIVE,
            "intake_semester": "2025/2026 Semester 1",
        },
    },
]


PANEL_RESEARCH_PROFILES = [
    {
        "matric_no": "2209841",
        "student_email": "2209841@siswa.um.edu.my",
        "student_name": "Ahmad Luqman",
        "programme": "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
        "semester": "Sem 1 2025/2026",
        "proposed_topic": "Optimizing Generative Adversarial Networks for Low-Resource Languages",
        "research_area": "Artificial Intelligence",
        "abstract": (
            "This research explores novel architectural improvements for GANs to improve "
            "synthetic data quality in languages with limited linguistic resources."
        ),
        "supervisor_email": "lecturer@siswa.um.edu.my",
    },
    {
        "matric_no": "2301123",
        "student_email": "2301123@siswa.um.edu.my",
        "student_name": "Nur Aisyah binti Rahman",
        "programme": "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
        "semester": "Sem 1 2025/2026",
        "proposed_topic": "Enhancing Explainable AI for Academic Performance Prediction",
        "research_area": "Artificial Intelligence",
        "abstract": (
            "This research investigates explainable artificial intelligence techniques "
            "for predicting student academic performance while improving transparency "
            "and interpretability of the prediction results."
        ),
        "supervisor_email": "lecturer@siswa.um.edu.my",
    },
]


class Command(BaseCommand):
    help = "Seed/refresh the demo login accounts and their role profiles."

    @staticmethod
    def _profile_conflict(entry):
        """Find an account with the same unique matric/staff number."""
        email = entry["email"]
        if "student" in entry:
            return User.objects.filter(
                student__matric_no=entry["student"]["matric_no"]
            ).exclude(email=email).first()
        if "office_staff" in entry:
            return User.objects.filter(
                office_staff__staff_no=entry["office_staff"]["staff_no"]
            ).exclude(email=email).first()
        if "lecturer" in entry:
            return User.objects.filter(
                lecturer__staff_no=entry["lecturer"]["staff_no"]
            ).exclude(email=email).first()
        return None

    def _adopt_profile_conflict(self, entry):
        """Reuse a legacy account so protected foreign keys remain valid."""
        conflicting_user = self._profile_conflict(entry)
        if conflicting_user is None:
            return

        email = entry["email"]
        target_user = User.objects.filter(email=email).first()
        if target_user is not None and target_user.pk != conflicting_user.pk:
            raise CommandError(
                f"Cannot seed {email}: its profile number belongs to "
                f"{conflicting_user.email}, and both accounts exist."
            )

        old_email = conflicting_user.email
        conflicting_user.email = email
        conflicting_user.save(update_fields=["email"])
        self.stdout.write(
            self.style.SUCCESS(f"  Migrated account email {old_email} -> {email}")
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # Migrate known legacy demo emails to the canonical format in place.
        # This prevents duplicates without breaking protected user references.
        for old_email, new_email in OLD_TO_NEW_EMAILS.items():
            old_user = User.objects.filter(email=old_email).first()
            new_user = User.objects.filter(email=new_email).first()

            if old_user is not None:
                if new_user is not None and new_user.pk != old_user.pk:
                    raise CommandError(
                        f"Cannot migrate {old_email} to {new_email}: "
                        "both accounts exist."
                    )
                else:
                    old_user.email = new_email
                    old_user.save(update_fields=["email"])
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  Migrated account email {old_email} -> {new_email}"
                        )
                    )

        for entry in DEMO_USERS:
            self._adopt_profile_conflict(entry)

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

            # Demo accounts skip the forced password change on first login.
            data["must_change_password"] = False
            data["is_staff"] = data["role"] == User.Role.OFFICE_ADMIN

            user, created = User.objects.update_or_create(
                email=email,
                defaults=data,
            )

            user.set_password(password)
            user.save()
            if user.role == User.Role.OFFICE_ADMIN:
                user.user_permissions.add(
                    *Permission.objects.filter(content_type__app_label="marks")
                )

            if student is not None:
                student_obj, _ = Student.objects.update_or_create(
                    user=user, defaults=student
                )
                if student_registry is not None:
                    StudentRegistry.objects.update_or_create(
                        student=student_obj, defaults=student_registry
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
