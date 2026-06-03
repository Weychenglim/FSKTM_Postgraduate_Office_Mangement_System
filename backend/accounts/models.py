"""Custom user model for the FSKTM PG Office system.

Login is by email / student ID / staff ID (no username), so we use a custom
user with ``USERNAME_FIELD = 'email'``. The fields mirror the frontend
``DemoUser`` shape (id, email, role, fullName, department, studentId, staffId)
so the API can hand the React app exactly what it expects.
"""
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
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
    """Login account for every role in the system."""

    class Role(models.TextChoices):
        OFFICE_ADMIN = "Office Staff/Admin", "Office Staff/Admin"
        COORDINATOR = "Programme Coordinator", "Programme Coordinator"
        LECTURER = "Lecturer", "Lecturer"
        STUDENT = "Student", "Student"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=64, choices=Role.choices, default=Role.STUDENT)
    department = models.CharField(max_length=255, blank=True)
    # A student logs in with a matric no; staff with a staff no. Either may be
    # blank depending on the role, so keep them optional but indexed for lookups.
    student_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    staff_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)

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

    def to_public_dict(self):
        """Shape this user the way the React frontend's ``DemoUser`` expects."""
        return {
            "id": str(self.pk),
            "email": self.email,
            "role": self.role,
            "fullName": self.full_name,
            "department": self.department,
            "studentId": self.student_id or None,
            "staffId": self.staff_id or None,
        }
