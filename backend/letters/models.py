"""Letter template model for the FSKTM PG Office system.

A single template is authored by the office staff (status, name, body content
with ``{{PLACEHOLDER}}`` tags) and consumed by students, who generate an
official letter by substituting their own details into the placeholders. Staff
manage these records; students only ever see the ``Active`` ones.
"""
from django.db import models


class LetterTemplate(models.Model):
    """An official letter template managed by the postgraduate office."""

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        DRAFT = "Draft", "Draft"

    name = models.CharField(max_length=255)
    # Frontend calls this "type"; kept distinct from the Python builtin here.
    letter_type = models.CharField(max_length=128, default="Academic Certification")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    description = models.CharField(max_length=500, blank=True, default="")
    content = models.TextField(
        blank=True,
        default="",
        help_text="Letter body. Use placeholders such as {{STUDENT_NAME}}, "
        "{{STUDENT_ID}}, {{PROGRAMME_NAME}}, {{CURRENT_STATUS}}, "
        "{{SUPERVISOR_NAME}}, {{REFERENCE_NUMBER}}, {{CURRENT_DATE}}.",
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
            "lastModified": self.updated_at.strftime("%b %d, %Y"),
            "modifiedBy": self.modified_by,
        }
