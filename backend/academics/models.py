import re

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


SESSION_PATTERN = re.compile(r"^(?P<start>\d{4})/(?P<end>\d{4})$")


class AcademicSemester(models.Model):
    class Term(models.TextChoices):
        SEMESTER_I = "SEMESTER_I", "Semester I"
        SEMESTER_II = "SEMESTER_II", "Semester II"
        SPECIAL = "SPECIAL", "Special Semester"

    class Lifecycle(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Closed"
        ARCHIVED = "ARCHIVED", "Archived"

    TERM_CODES = {
        Term.SEMESTER_I: "S1",
        Term.SEMESTER_II: "S2",
        Term.SPECIAL: "SP",
    }

    code = models.CharField(max_length=32, unique=True, editable=False)
    academic_session = models.CharField(max_length=9)
    term = models.CharField(max_length=16, choices=Term.choices)
    starts_on = models.DateField()
    ends_on = models.DateField()
    lifecycle_status = models.CharField(
        max_length=16,
        choices=Lifecycle.choices,
        default=Lifecycle.DRAFT,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_academic_semesters",
    )
    activated_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-starts_on", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["academic_session", "term"],
                name="unique_academic_session_term",
            ),
            models.UniqueConstraint(
                fields=["lifecycle_status"],
                condition=Q(lifecycle_status="ACTIVE"),
                name="one_active_academic_semester",
            ),
            models.CheckConstraint(
                condition=Q(ends_on__gte=models.F("starts_on")),
                name="academic_semester_valid_date_range",
            ),
        ]

    @property
    def label(self):
        return f"{self.get_term_display()} {self.academic_session}"

    @property
    def effective_status(self):
        if self.lifecycle_status == self.Lifecycle.ACTIVE:
            today = timezone.localdate()
            if today < self.starts_on or today > self.ends_on:
                return "EXPIRED"
        return self.lifecycle_status

    @property
    def is_active(self):
        return self.effective_status == self.Lifecycle.ACTIVE

    def clean(self):
        errors = {}
        match = SESSION_PATTERN.fullmatch(self.academic_session or "")
        if not match or int(match.group("end")) != int(match.group("start")) + 1:
            errors["academic_session"] = (
                "Academic session must use consecutive years such as 2026/2027."
            )
        if self.starts_on and self.ends_on and self.ends_on < self.starts_on:
            errors["ends_on"] = "End date must be on or after the start date."
        if self.academic_session and self.term in self.TERM_CODES and match:
            self.code = (
                f"{match.group('start')}-{match.group('end')}-"
                f"{self.TERM_CODES[self.term]}"
            )
        if self.starts_on and self.ends_on:
            overlap = AcademicSemester.objects.exclude(pk=self.pk).exclude(
                lifecycle_status=self.Lifecycle.ARCHIVED
            ).filter(
                starts_on__lte=self.ends_on,
                ends_on__gte=self.starts_on,
            )
            if overlap.exists():
                errors["starts_on"] = "Semester dates overlap another semester."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return self.label


class AcademicSemesterAudit(models.Model):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        ACTIVATE = "ACTIVATE", "Activate"
        HANDOVER_CLOSE = "HANDOVER_CLOSE", "Handover close"
        CLOSE = "CLOSE", "Close"
        EXTEND = "EXTEND", "Extend"
        ARCHIVE = "ARCHIVE", "Archive"

    semester = models.ForeignKey(
        AcademicSemester,
        on_delete=models.PROTECT,
        related_name="audits",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="academic_semester_audits",
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    reason = models.TextField(blank=True)
    before_values = models.JSONField(default=dict)
    after_values = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Academic semester audits are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Academic semester audits are immutable.")

