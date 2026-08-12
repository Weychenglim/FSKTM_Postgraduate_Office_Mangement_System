import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

PANEL_WORKLOAD_LIMIT = 10


class StudentResearchProfile(models.Model):
    """Research profile required before a supervisor can recommend a panel."""

    student = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="research_profile",
        null=True,
        blank=True,
    )
    matric_no = models.CharField(max_length=64, unique=True, db_index=True)
    student_name = models.CharField(max_length=255)
    programme = models.CharField(max_length=255)
    semester = models.CharField(max_length=128)
    proposed_topic = models.CharField(max_length=500)
    research_area = models.CharField(max_length=255, blank=True)
    abstract = models.TextField(blank=True)
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="supervised_research_profiles",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["student_name"]

    def __str__(self):
        return f"{self.student_name} ({self.matric_no})"


class PanelRecommendation(models.Model):
    """Supervisor recommendation and approval lifecycle for one panel member."""

    class Status(models.TextChoices):
        SUBMITTED_TO_PANEL = "SUBMITTED_TO_PANEL", "Submitted to Panel"
        REJECTED_BY_PANEL = "REJECTED_BY_PANEL", "Rejected by Panel"
        PENDING_COORDINATOR = "PENDING_COORDINATOR", "Pending Coordinator"
        REJECTED_BY_COORDINATOR = "REJECTED_BY_COORDINATOR", "Rejected by Coordinator"
        CANCELLED_BY_SUPERVISOR = (
            "CANCELLED_BY_SUPERVISOR",
            "Cancelled by Supervisor",
        )
        APPROVED = "APPROVED", "Approved"

    ACTIVE_STATUSES = (
        Status.SUBMITTED_TO_PANEL,
        Status.PENDING_COORDINATOR,
        Status.APPROVED,
    )
    WORKLOAD_RESERVED_STATUSES = (
        Status.SUBMITTED_TO_PANEL,
        Status.PENDING_COORDINATOR,
    )

    profile = models.ForeignKey(
        StudentResearchProfile,
        on_delete=models.PROTECT,
        related_name="panel_recommendations",
    )
    academic_semester = models.ForeignKey(
        "academics.AcademicSemester",
        on_delete=models.PROTECT,
        related_name="panel_recommendations",
        null=True,
        blank=True,
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="submitted_panel_recommendations",
    )
    recommended_member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="panel_recommendations_to_review",
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.SUBMITTED_TO_PANEL,
        db_index=True,
    )
    justification = models.TextField(blank=True)
    panel_rejection_reason = models.TextField(blank=True)
    coordinator_rejection_reason = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    panel_decided_at = models.DateTimeField(null=True, blank=True)
    coordinator_decided_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile"],
                condition=Q(
                    status__in=[
                        "SUBMITTED_TO_PANEL",
                        "PENDING_COORDINATOR",
                        "APPROVED",
                    ]
                ),
                name="one_active_panel_recommendation_per_student",
            )
        ]

    def submit_if_needed(self):
        if self.status == self.Status.SUBMITTED_TO_PANEL and self.submitted_at is None:
            self.submitted_at = timezone.now()

    @property
    def display_rejection_reason(self):
        return self.panel_rejection_reason or self.coordinator_rejection_reason

    def __str__(self):
        return f"{self.profile.matric_no} -> {self.recommended_member}"


class PanelAppointment(models.Model):
    """Final approved panel assignment produced from an approved recommendation."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"

    recommendation = models.OneToOneField(
        PanelRecommendation,
        on_delete=models.PROTECT,
        related_name="panel_appointment",
    )
    profile = models.ForeignKey(
        StudentResearchProfile,
        on_delete=models.PROTECT,
        related_name="panel_appointments",
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="supervised_panel_appointments",
    )
    panel_member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="panel_appointments",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="approved_panel_appointments",
    )
    appointment_date = models.DateField(default=timezone.localdate)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-appointment_date", "profile__student_name"]

    def __str__(self):
        return f"{self.profile.matric_no} panel: {self.panel_member}"


class SupervisorApplication(models.Model):
    """Student request for a supervisor and its two-stage decision lifecycle."""

    class Status(models.TextChoices):
        SUBMITTED_TO_SUPERVISOR = (
            "SUBMITTED_TO_SUPERVISOR",
            "Submitted to Supervisor",
        )
        REJECTED_BY_SUPERVISOR = (
            "REJECTED_BY_SUPERVISOR",
            "Rejected by Supervisor",
        )
        PENDING_COORDINATOR = "PENDING_COORDINATOR", "Pending Coordinator"
        REJECTED_BY_COORDINATOR = (
            "REJECTED_BY_COORDINATOR",
            "Rejected by Coordinator",
        )
        CANCELLED_BY_STUDENT = (
            "CANCELLED_BY_STUDENT",
            "Cancelled by Student",
        )
        APPROVED = "APPROVED", "Approved"

    ACTIVE_STATUSES = (
        Status.SUBMITTED_TO_SUPERVISOR,
        Status.PENDING_COORDINATOR,
        Status.APPROVED,
    )

    student = models.ForeignKey(
        "accounts.Student",
        on_delete=models.PROTECT,
        related_name="supervisor_applications",
    )
    academic_semester = models.ForeignKey(
        "academics.AcademicSemester",
        on_delete=models.PROTECT,
        related_name="supervisor_applications",
        null=True,
        blank=True,
    )
    proposed_supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="supervisor_applications_to_review",
    )
    research_title = models.CharField(max_length=500)
    research_area = models.CharField(max_length=255, blank=True, default="")
    research_abstract = models.TextField()
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.SUBMITTED_TO_SUPERVISOR,
        db_index=True,
    )
    supervisor_rejection_reason = models.TextField(blank=True)
    coordinator_rejection_reason = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(default=timezone.now)
    supervisor_decided_at = models.DateTimeField(null=True, blank=True)
    coordinator_decided_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["student"],
                condition=Q(
                    status__in=[
                        "SUBMITTED_TO_SUPERVISOR",
                        "PENDING_COORDINATOR",
                        "APPROVED",
                    ]
                ),
                name="one_active_supervisor_application_per_student",
            )
        ]

    @property
    def rejection_reason(self):
        return (
            self.supervisor_rejection_reason
            or self.coordinator_rejection_reason
        )

    def __str__(self):
        return f"{self.student.matric_no} -> {self.proposed_supervisor}"


def supervisor_document_upload_path(instance, filename):
    extension = Path(filename).suffix.lower()
    return (
        f"supervisor-applications/{instance.application_id}/"
        f"{uuid.uuid4().hex}{extension}"
    )


class SupervisorApplicationDocument(models.Model):
    """Immutable private document supplied with a supervisor request."""

    application = models.ForeignKey(
        SupervisorApplication,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    requirement = models.ForeignKey(
        "SupervisorDocumentRequirement",
        on_delete=models.PROTECT,
        related_name="application_documents",
        null=True,
        blank=True,
    )
    file = models.FileField(
        upload_to=supervisor_document_upload_path,
        max_length=500,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=64)
    content_type = models.CharField(max_length=128, blank=True)
    size = models.PositiveBigIntegerField(default=0)
    requirement_code = models.SlugField(max_length=64, blank=True)
    requirement_label = models.CharField(max_length=255, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["application", "requirement"],
                condition=Q(requirement__isnull=False),
                name="one_supervisor_document_per_requirement",
            )
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Submitted supervisor application documents are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Submitted supervisor application documents are immutable.")


class SupervisorDocumentRequirement(models.Model):
    """Office-configurable checklist item for supervisor applications."""

    code = models.SlugField(max_length=64, unique=True)
    label = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "label"]

    def save(self, *args, **kwargs):
        if self.pk:
            persisted_code = type(self).objects.only("code").get(pk=self.pk).code
            if self.code != persisted_code:
                raise ValidationError("Document requirement codes are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Document requirements cannot be deleted; deactivate them instead.")


class SupervisorDocumentRequirementAudit(models.Model):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"

    requirement = models.ForeignKey(
        SupervisorDocumentRequirement,
        on_delete=models.PROTECT,
        related_name="audits",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="supervisor_document_requirement_audits",
    )
    action = models.CharField(max_length=16, choices=Action.choices)
    reason = models.TextField(blank=True)
    before_values = models.JSONField(default=dict)
    after_values = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Supervisor document requirement audits are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Supervisor document requirement audits are immutable.")


class SupervisorAppointment(models.Model):
    """Final active supervisor assignment created after coordinator approval."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ENDED = "ENDED", "Ended"

    application = models.OneToOneField(
        SupervisorApplication,
        on_delete=models.PROTECT,
        related_name="appointment",
    )
    student = models.ForeignKey(
        "accounts.Student",
        on_delete=models.PROTECT,
        related_name="supervisor_appointments",
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="active_supervisor_appointments",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="approved_supervisor_appointments",
    )
    appointment_date = models.DateField(default=timezone.localdate)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-appointment_date", "student__matric_no"]


class AppointmentWorkflowEvent(models.Model):
    """Immutable audit event shared by supervisor and panel workflows."""

    panel_recommendation = models.ForeignKey(
        PanelRecommendation,
        on_delete=models.CASCADE,
        related_name="workflow_events",
        null=True,
        blank=True,
    )
    supervisor_application = models.ForeignKey(
        SupervisorApplication,
        on_delete=models.CASCADE,
        related_name="workflow_events",
        null=True,
        blank=True,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="appointment_workflow_events",
    )
    actor_role = models.CharField(max_length=64)
    action = models.CharField(max_length=64)
    previous_status = models.CharField(max_length=64, blank=True)
    new_status = models.CharField(max_length=64)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(
                        panel_recommendation__isnull=False,
                        supervisor_application__isnull=True,
                    )
                    | Q(
                        panel_recommendation__isnull=True,
                        supervisor_application__isnull=False,
                    )
                ),
                name="workflow_event_has_exactly_one_record",
            )
        ]


def count_supervisor_workload(supervisor):
    return SupervisorAppointment.objects.filter(
        supervisor=supervisor,
        status=SupervisorAppointment.Status.ACTIVE,
    ).count()


def supervisor_workload_limit(supervisor):
    try:
        return supervisor.lecturer.supervisor.max_supervisees
    except (AttributeError, models.ObjectDoesNotExist):
        return 5


def count_panel_workload(panel_member):
    """Count confirmed panel seats plus submitted nominations reserving capacity."""

    active_appointments = PanelAppointment.objects.filter(
        panel_member=panel_member,
        status=PanelAppointment.Status.ACTIVE,
    ).count()
    pending_nominations = PanelRecommendation.objects.filter(
        recommended_member=panel_member,
        status__in=PanelRecommendation.WORKLOAD_RESERVED_STATUSES,
    ).count()
    return active_appointments + pending_nominations


def panel_workload_limit(panel_member):
    """Return the configured limit for a panel lecturer, with a safe default."""

    try:
        return panel_member.lecturer.panel.max_appointments
    except (AttributeError, models.ObjectDoesNotExist):
        return PANEL_WORKLOAD_LIMIT
