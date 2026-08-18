from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Creates users with a hashed password, using email as the unique key."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.OFFICE_ADMIN)
        extra_fields.setdefault("full_name", "Administrator")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Login account (the superclass). Role-specific data lives in the profile
    tables below, linked one-to-one on this row's primary key."""

    class Role(models.TextChoices):
        OFFICE_ADMIN = "Office Staff/Admin", "Office Staff/Admin"
        COORDINATOR = "Programme Coordinator", "Programme Coordinator"
        LECTURER = "Lecturer", "Lecturer"
        STUDENT = "Student", "Student"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=64, choices=Role.choices, default=Role.STUDENT)
    phone = models.CharField(max_length=32, blank=True, default="")
    # Set True when an account is created with a temporary password (FR-04); the
    # login flow can then force a password change on first sign-in.
    must_change_password = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into the Django admin site.",
    )
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "role"]

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.full_name} <{self.email}> ({self.role})"

    def _related_or_none(self, attr):
        """Return the linked profile row for ``attr`` (e.g. 'student'), or None
        if this user has no such profile."""
        try:
            return getattr(self, attr)
        except ObjectDoesNotExist:
            return None

    def to_public_dict(self):
        """Flatten this user + its role profile into the shape the React
        frontend's ``DemoUser`` expects."""
        student = self._related_or_none("student")
        office_staff = self._related_or_none("office_staff")
        lecturer = self._related_or_none("lecturer")

        if student:
            department, student_no, staff_no = student.programme, student.matric_no, None
        elif office_staff:
            department, student_no, staff_no = office_staff.department, None, office_staff.staff_no
        elif lecturer:
            department, student_no, staff_no = lecturer.department, None, lecturer.staff_no
        else:
            department, student_no, staff_no = "", None, None

        return {
            "id": str(self.pk),
            "email": self.email,
            "role": self.role,
            "fullName": self.full_name,
            "phone": self.phone,
            "department": department,
            "studentId": student_no,
            "staffId": staff_no,
            "participantLifecycleStatus": (
                student.status.upper()
                if student
                else lecturer.lifecycle_status if lecturer else None
            ),
            "accountAccess": (
                "DISABLED"
                if not self.is_active
                else "READ_ONLY"
                if student and student.status != Student.Status.ACTIVE
                else "ACTIVE"
            ),
        }


# ── Top-level subtypes (User → Student / OfficeStaff / Lecturer) ─────────────


class Student(models.Model):
    """Postgraduate student profile (FR-11)."""

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        GRADUATED = "Graduated", "Graduated"
        DEFERRED = "Deferred", "Deferred"
        WITHDRAWN = "Withdrawn", "Withdrawn"

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="student"
    )
    matric_no = models.CharField(max_length=64, unique=True)
    programme = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.ACTIVE
    )
    intake_semester = models.CharField(max_length=32, blank=True, default="")
    status_changed_at = models.DateTimeField(null=True, blank=True)
    status_changed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="student_status_changes",
        null=True,
        blank=True,
    )
    status_reason = models.TextField(blank=True)

    def __str__(self):
        return f"{self.matric_no} — {self.user.full_name}"


class StudentRegistry(models.Model):
    """Extended registry details for a Student — the data an official letter
    (e.g. the visa / confirmation-of-study letter) needs that the base Student
    profile does not hold (passport, nationality, programme mode, semesters…).

    One-to-one *specialization* of Student: it shares the student's primary key
    (``student_id`` PK = FK), exactly like Coordinator/Supervisor/Panel
    specialize Lecturer. So every registry row belongs to exactly one student and
    is reachable as ``student.registry``. Letters read their placeholder values
    from here (see the frontend ``letterDocument.ts`` placeholder set)."""

    class ProgrammeMode(models.TextChoices):
        COURSEWORK = "Coursework", "Coursework"
        RESEARCH = "Research", "Research"
        MIXED = "Mixed Mode", "Mixed Mode"

    class StudyMode(models.TextChoices):
        FULL_TIME = "Full Time", "Full Time"
        PART_TIME = "Part Time", "Part Time"

    student = models.OneToOneField(
        Student, on_delete=models.CASCADE, primary_key=True, related_name="registry"
    )
    # Identity — a local student has an IC; an international student a passport.
    ic_number = models.CharField(max_length=32, blank=True, default="")
    passport_number = models.CharField(max_length=32, blank=True, default="")
    nationality = models.CharField(max_length=64, blank=True, default="")  # {{COUNTRY}}
    address = models.TextField(blank=True, default="")
    # Programme-of-study details printed on the confirmation / visa letter.
    programme_mode = models.CharField(
        max_length=32, choices=ProgrammeMode.choices, blank=True, default=""
    )  # {{PROGRAMME_MODE}}
    field_of_study = models.CharField(max_length=255, blank=True, default="")  # {{FIELD_OF_RESEARCH}}
    mode_of_study = models.CharField(
        max_length=32, choices=StudyMode.choices, blank=True, default=""
    )  # {{MODE_OF_STUDY}}
    current_semester = models.CharField(max_length=64, blank=True, default="")  # {{CURRENT_SEMESTER}}
    max_semester = models.CharField(max_length=64, blank=True, default="")  # {{MAX_SEMESTER}}
    expected_completion = models.CharField(max_length=64, blank=True, default="")  # {{EXPECTED_COMPLETION}}
    sponsor = models.CharField(max_length=255, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Student registry detail"
        verbose_name_plural = "Student registry details"

    def __str__(self):
        return f"Registry — {self.student.matric_no}"

    def to_letter_dict(self):
        """The letter-placeholder values for this student (camelCase to match the
        frontend). ``initialSemester`` reuses the base Student's intake to avoid a
        second source of truth; a passport falls back to the IC for local students."""
        return {
            "passportNumber": self.passport_number or self.ic_number,
            "country": self.nationality,
            "programmeMode": self.programme_mode,
            "fieldOfResearch": self.field_of_study,
            "modeOfStudy": self.mode_of_study,
            "initialSemester": self.student.intake_semester,
            "currentSemester": self.current_semester,
            "maxSemester": self.max_semester,
            "expectedCompletion": self.expected_completion,
        }


class OfficeStaff(models.Model):
    """Postgraduate office staff / admin profile."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="office_staff"
    )
    staff_no = models.CharField(max_length=64, unique=True)
    department = models.CharField(max_length=255, blank=True, default="")
    position = models.CharField(max_length=128, blank=True, default="")

    class Meta:
        verbose_name = "Office staff"
        verbose_name_plural = "Office staff"

    def __str__(self):
        return f"{self.staff_no} — {self.user.full_name}"


class Lecturer(models.Model):
    """Academic staff profile. A lecturer may additionally act as a Coordinator,
    Supervisor, and/or Panel member (overlapping specializations below)."""

    class Lifecycle(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        RETIRING = "RETIRING", "Retiring"
        RETIRED = "RETIRED", "Retired"

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="lecturer"
    )
    staff_no = models.CharField(max_length=64, unique=True)
    department = models.CharField(max_length=255, blank=True, default="")
    title = models.CharField(max_length=64, blank=True, default="")
    specialization = models.CharField(max_length=255, blank=True, default="")
    lifecycle_status = models.CharField(
        max_length=16,
        choices=Lifecycle.choices,
        default=Lifecycle.ACTIVE,
        db_index=True,
    )
    lifecycle_changed_at = models.DateTimeField(null=True, blank=True)
    lifecycle_changed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="lecturer_lifecycle_changes",
        null=True,
        blank=True,
    )
    lifecycle_reason = models.TextField(blank=True)

    def __str__(self):
        return f"{self.staff_no} — {self.user.full_name}"


# ── Lecturer specializations (Lecturer → Coordinator / Supervisor / Panel) ───


class ParticipantLifecycleAudit(models.Model):
    """Append-only audit for authoritative Student/Lecturer lifecycle changes."""

    student = models.ForeignKey(
        Student,
        on_delete=models.PROTECT,
        related_name="lifecycle_audits",
        null=True,
        blank=True,
    )
    lecturer = models.ForeignKey(
        Lecturer,
        on_delete=models.PROTECT,
        related_name="lifecycle_audits",
        null=True,
        blank=True,
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="participant_lifecycle_audits",
    )
    previous_status = models.CharField(max_length=32)
    new_status = models.CharField(max_length=32)
    reason = models.TextField()
    affected_records = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(student__isnull=False, lecturer__isnull=True)
                    | models.Q(student__isnull=True, lecturer__isnull=False)
                ),
                name="participant_audit_exactly_one_subject",
            )
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            from django.core.exceptions import ValidationError

            raise ValidationError("Participant lifecycle audits are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        from django.core.exceptions import ValidationError

        raise ValidationError("Participant lifecycle audits are immutable.")


class Coordinator(models.Model):
    """Programme Coordinator role of a lecturer (panel approval authority,
    UC31)."""

    lecturer = models.OneToOneField(
        Lecturer, on_delete=models.CASCADE, primary_key=True, related_name="coordinator"
    )
    programme_managed = models.CharField(max_length=255, blank=True, default="")
    appointed_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Coordinator — {self.lecturer.user.full_name}"


class Supervisor(models.Model):
    """Supervisor role of a lecturer. ``max_supervisees`` caps how many students
    this lecturer may supervise (FR-22 workload validation)."""

    lecturer = models.OneToOneField(
        Lecturer, on_delete=models.CASCADE, primary_key=True, related_name="supervisor"
    )
    max_supervisees = models.PositiveIntegerField(default=5)

    def __str__(self):
        return f"Supervisor — {self.lecturer.user.full_name}"


class Panel(models.Model):
    """Panel-member role of a lecturer. ``max_appointments`` caps panel load
    (relates to FR-29 selection-count tracking)."""

    lecturer = models.OneToOneField(
        Lecturer, on_delete=models.CASCADE, primary_key=True, related_name="panel"
    )
    max_appointments = models.PositiveIntegerField(default=10)

    class Meta:
        verbose_name = "Panel member"

    def __str__(self):
        return f"Panel — {self.lecturer.user.full_name}"
