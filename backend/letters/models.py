"""Letter templates and letter requests for the FSKTM PG Office system.

The office authors templates (name, status, body with ``{{PLACEHOLDER}}`` tags,
and any fields the office fills in itself, such as attendance). Students only
ever see an Active template's name and description, never its wording.

A student asks for a letter by creating a ``GeneratedLetter`` request. The
office approves it, filling in what the student's record cannot, and the
server then fills the template's current wording, issues the reference number
and saves the letter; or the office rejects it with a reason. Either way the
student is told. A template with pending requests cannot be deleted.

Appointment letters (UC22) come from templates used for a supervisor or panel
appointment. They are made by themselves when a coordinator approves the
appointment (see ``appointment_letters.py``), and go to the student and the
lecturers named on them.
"""
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.timezone import localtime


class LetterPurpose(models.TextChoices):
    REQUEST = "REQUEST", "Student requests"
    SUPERVISOR_APPOINTMENT = "SUPERVISOR_APPOINTMENT", "Supervisor appointment letter"
    PANEL_APPOINTMENT = "PANEL_APPOINTMENT", "Panel appointment letter"


AUTOMATIC_PURPOSES = (LetterPurpose.SUPERVISOR_APPOINTMENT, LetterPurpose.PANEL_APPOINTMENT)


class LetterTemplate(models.Model):
    """An official letter template managed by the postgraduate office."""

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        DRAFT = "Draft", "Draft"
        ARCHIVED = "Archived", "Archived"

    name = models.CharField(max_length=255)
    purpose = models.CharField(max_length=32, choices=LetterPurpose.choices, default=LetterPurpose.REQUEST)
    # Frontend calls this "type"; kept distinct from the Python builtin here.
    letter_type = models.CharField(max_length=128, default="Academic Certification")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    description = models.CharField(max_length=500, blank=True, default="")
    content = models.TextField(
        blank=True,
        default="",
        help_text="Letter body with {{PLACEHOLDER}} tags; the allowed tags are "
        "listed in letters/placeholders.py, plus this template's own fields.",
    )
    # Values the office types in when it approves a request, e.g.
    # [{"name": "ATTENDANCE", "label": "Attendance (%)", "hint": ""}].
    custom_fields = models.JSONField(default=list, blank=True)
    # Prefix used to build the student's reference number, e.g. "UMF/PG".
    reference_prefix = models.CharField(max_length=64, blank=True, default="UMF/PG")
    # Printed under the signature line; blank keeps the faculty default.
    signatory_name = models.CharField(max_length=120, blank=True, default="")
    signatory_title = models.CharField(max_length=120, blank=True, default="")
    modified_by = models.CharField(max_length=255, blank=True, default="Office Staff")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["purpose"],
                condition=Q(status="Active") & ~Q(purpose="REQUEST"),
                name="one_active_template_per_appointment_letter",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"

    @property
    def is_automatic(self):
        return self.purpose in AUTOMATIC_PURPOSES

    def to_public_dict(self, *, include_wording=True):
        """Shape this template the way the React frontend's ``LetterTemplate``
        type expects. Students get it without the wording or the office fields,
        so a letter cannot be copied before the office approves it."""
        data = {
            "id": str(self.pk),
            "name": self.name,
            "type": self.letter_type,
            "purpose": self.purpose,
            "status": self.status,
            "description": self.description,
            "referencePrefix": self.reference_prefix,
            "signatoryName": self.signatory_name,
            "signatoryTitle": self.signatory_title,
            "lastModified": localtime(self.updated_at).strftime("%b %d, %Y"),
            "modifiedBy": self.modified_by,
        }
        if include_wording:
            data["content"] = self.content
            data["customFields"] = list(self.custom_fields or [])
        return data


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


def _day(value):
    return value.strftime("%d %B %Y") if value else ""


def _moment(value):
    return localtime(value).isoformat() if value else None


class GeneratedLetter(models.Model):
    """A student's letter request and, once approved, the letter as issued.

    Pending requests have no reference number, wording or date yet; those are
    set when the office approves. Issued letters are kept exactly as issued.

    An appointment letter is linked to its supervisor or panel appointment and
    lists its recipients, the lecturers who may open it besides the student.
    """

    class Status(models.TextChoices):
        PENDING = "Pending", "Pending"
        ISSUED = "Issued", "Issued"
        REJECTED = "Rejected", "Rejected"
        WITHDRAWN = "Withdrawn", "Withdrawn"
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
    purpose = models.CharField(max_length=32, choices=LetterPurpose.choices, default=LetterPurpose.REQUEST)
    supervisor_appointment = models.ForeignKey(
        "appointments.SupervisorAppointment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="letters",
    )
    panel_appointment = models.ForeignKey(
        "appointments.PanelAppointment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="letters",
    )
    recipients = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="received_letters")
    replaced_by = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    signatory_name = models.CharField(max_length=120, blank=True, default="")
    signatory_title = models.CharField(max_length=120, blank=True, default="")
    # Set on approval. Several pending requests may hold no number at once.
    reference_number = models.CharField(max_length=96, unique=True, null=True, blank=True)
    content = models.TextField(
        blank=True, default="", help_text="The letter body with every placeholder filled in."
    )
    student_data = models.JSONField(
        default=dict, help_text="The student details the letter was filled from."
    )
    # What the office typed in on approval, keyed by placeholder name.
    office_values = models.JSONField(default=dict, blank=True)
    student_note = models.CharField(max_length=500, blank=True, default="")
    issued_on = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.CharField(max_length=500, blank=True, default="")
    withdrawn_at = models.DateTimeField(null=True, blank=True)
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
        indexes = [models.Index(fields=["status", "-created_at"])]
        constraints = [
            # One request at a time per letter: a second click, or a second
            # tab, cannot queue the same letter twice.
            models.UniqueConstraint(
                fields=["student", "template"],
                condition=Q(status="Pending", purpose="REQUEST"),
                name="one_pending_request_per_letter",
            ),
            # A retry or a second worker cannot make a second letter for the
            # same appointment; a revoked one can be replaced.
            models.UniqueConstraint(
                fields=["supervisor_appointment"],
                condition=Q(supervisor_appointment__isnull=False, status__in=["Pending", "Issued"]),
                name="one_live_letter_per_supervisor_appointment",
            ),
            models.UniqueConstraint(
                fields=["panel_appointment"],
                condition=Q(panel_appointment__isnull=False, status__in=["Pending", "Issued"]),
                name="one_live_letter_per_panel_appointment",
            ),
            models.CheckConstraint(
                condition=Q(supervisor_appointment__isnull=True) | Q(panel_appointment__isnull=True),
                name="letter_links_one_appointment",
            ),
        ]

    def __str__(self):
        return f"{self.reference_number or f'Request {self.pk}'} ({self.template_name})"

    @property
    def is_automatic(self):
        return self.purpose in AUTOMATIC_PURPOSES

    @property
    def appointment(self):
        return self.supervisor_appointment or self.panel_appointment

    def to_public_dict(self, *, include_content=True):
        snapshot = self.student_data or {}
        decider = self.decided_by
        data = {
            "id": str(self.pk),
            "referenceNumber": self.reference_number or "",
            "templateId": str(self.template_id) if self.template_id else None,
            "templateName": self.template_name,
            "letterType": self.letter_type,
            "purpose": self.purpose,
            "replacedById": str(self.replaced_by_id) if self.replaced_by_id else None,
            "status": self.status,
            "date": _day(self.issued_on),
            "requestedAt": _moment(self.created_at),
            "issuedAt": _moment(self.decided_at) if self.status in (self.Status.ISSUED, self.Status.REVOKED) else None,
            "studentName": snapshot.get("studentName", ""),
            "matricNumber": snapshot.get("matricNumber", ""),
            "programName": snapshot.get("programName", ""),
            "note": self.student_note,
            "decidedAt": _moment(self.decided_at),
            "decidedBy": (getattr(decider, "full_name", "") or getattr(decider, "email", "")) if decider else "",
            "rejectReason": self.reject_reason,
            "withdrawnAt": _moment(self.withdrawn_at),
            "revokedAt": _moment(self.revoked_at),
            "revokeReason": self.revoke_reason,
        }
        if include_content:
            data["content"] = self.content
        return data
