from django.conf import settings
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
        ACCEPTED_BY_PANEL = "ACCEPTED_BY_PANEL", "Accepted by Panel"
        PENDING_COORDINATOR = "PENDING_COORDINATOR", "Pending Coordinator"
        REJECTED_BY_COORDINATOR = "REJECTED_BY_COORDINATOR", "Rejected by Coordinator"
        APPROVED = "APPROVED", "Approved"

    ACTIVE_STATUSES = (
        Status.SUBMITTED_TO_PANEL,
        Status.ACCEPTED_BY_PANEL,
        Status.PENDING_COORDINATOR,
        Status.APPROVED,
    )
    WORKLOAD_RESERVED_STATUSES = (
        Status.SUBMITTED_TO_PANEL,
        Status.ACCEPTED_BY_PANEL,
        Status.PENDING_COORDINATOR,
    )

    profile = models.ForeignKey(
        StudentResearchProfile,
        on_delete=models.PROTECT,
        related_name="panel_recommendations",
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
    submitted_at = models.DateTimeField(null=True, blank=True)
    panel_decided_at = models.DateTimeField(null=True, blank=True)
    coordinator_decided_at = models.DateTimeField(null=True, blank=True)
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
                        "ACCEPTED_BY_PANEL",
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
