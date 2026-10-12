"""Letter template model for the FSKTM PG Office system.

A single template is authored by the office staff (status, name, body content
with ``{{PLACEHOLDER}}`` tags) and consumed by students, who generate an
official letter by substituting their own details into the placeholders. Staff
manage these records; students only ever see the ``Active`` ones. ``Archived``
retires a template without deleting its wording.

Every generated letter is saved as a ``GeneratedLetter``: the filled wording,
the student details it used, and a reference number issued by the server.
"""
from django.conf import settings
from django.db import models
from django.utils.timezone import localtime


class LetterTemplate(models.Model):
    """An official letter template managed by the postgraduate office."""

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        DRAFT = "Draft", "Draft"
        ARCHIVED = "Archived", "Archived"

    name = models.CharField(max_length=255)
    # Frontend calls this "type"; kept distinct from the Python builtin here.
    letter_type = models.CharField(max_length=128, default="Academic Certification")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    description = models.CharField(max_length=500, blank=True, default="")
    content = models.TextField(
        blank=True,
        default="",
        help_text="Letter body with {{PLACEHOLDER}} tags; the allowed tags are "
        "listed in letters/placeholders.py.",
    )
    # Prefix used to build the student's reference number, e.g. "UMF/PG".
    reference_prefix = models.CharField(max_length=64, blank=True, default="UMF/PG")
    modified_by = models.CharField(max_length=255, blank=True, default="Office Staff")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.status})"

    def to_public_dict(self):
        """Shape this template the way the React frontend's ``LetterTemplate``
        type expects."""
        return {
            "id": str(self.pk),
            "name": self.name,
            "type": self.letter_type,
            "status": self.status,
            "description": self.description,
            "content": self.content,
            "referencePrefix": self.reference_prefix,
            "lastModified": localtime(self.updated_at).strftime("%b %d, %Y"),
            "modifiedBy": self.modified_by,
        }


class LetterReferenceCounter(models.Model):
    """The last reference number issued for one prefix in one year."""

    prefix = models.CharField(max_length=64)
    year = models.PositiveIntegerField()
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["prefix", "year"], name="unique_letter_reference_counter"
            )
        ]

    def __str__(self):
        return f"{self.prefix}/{self.year}: {self.last_number}"


class GeneratedLetter(models.Model):
    """A letter issued to a student, kept exactly as it was generated."""

    class Status(models.TextChoices):
        ISSUED = "Issued", "Issued"
        REVOKED = "Revoked", "Revoked"

    # SET_NULL keeps the register intact if an account or template is removed;
    # the snapshots below still say who the letter was for and what it was.
    student = models.ForeignKey(
        "accounts.Student",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="generated_letters",
    )
    template = models.ForeignKey(
        LetterTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="generated_letters",
    )
    template_name = models.CharField(max_length=255)
    letter_type = models.CharField(max_length=128, blank=True, default="")
    reference_number = models.CharField(max_length=96, unique=True)
    content = models.TextField(help_text="The letter body with every placeholder filled in.")
    student_data = models.JSONField(
        default=dict, help_text="The student details the letter was filled from."
    )
    issued_on = models.DateField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ISSUED)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    resend_count = models.PositiveIntegerField(default=0)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    revoke_reason = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.reference_number} ({self.template_name})"

    def to_public_dict(self, *, include_content=True):
        snapshot = self.student_data or {}
        data = {
            "id": str(self.pk),
            "referenceNumber": self.reference_number,
            "templateId": str(self.template_id) if self.template_id else None,
            "templateName": self.template_name,
            "letterType": self.letter_type,
            "status": self.status,
            "date": self.issued_on.strftime("%d %B %Y"),
            "issuedAt": localtime(self.created_at).isoformat(),
            "studentName": snapshot.get("studentName", ""),
            "matricNumber": snapshot.get("matricNumber", ""),
            "programName": snapshot.get("programName", ""),
            "revokedAt": localtime(self.revoked_at).isoformat() if self.revoked_at else None,
            "revokeReason": self.revoke_reason,
        }
        if include_content:
            data["content"] = self.content
        return data
