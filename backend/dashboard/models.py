from django.conf import settings
from django.db import models
from django.db.models import Q


class SemesterTimeline(models.Model):
    semester = models.CharField(max_length=128)
    session = models.CharField(max_length=64)
    is_active = models.BooleanField(default=True, db_index=True)
    source_filename = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_semester_timelines",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    replaced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-uploaded_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_active"],
                condition=Q(is_active=True),
                name="one_active_semester_timeline",
            )
        ]

    def __str__(self):
        return f"{self.semester} {self.session}"


class SemesterTimelineEntry(models.Model):
    class Level(models.TextChoices):
        P1 = "P1", "Research Project (P1)"
        P2 = "P2", "Research Project (P2)"

    class Status(models.TextChoices):
        COMPLETED = "Completed", "Completed"
        ACTIVE = "Active", "Active"
        DEADLINE = "Deadline", "Deadline"
        UPCOMING = "Upcoming", "Upcoming"

    VALID_TARGET_ROLES = {"STUDENT", "LECTURER", "OFFICE_STAFF", "ALL"}

    timeline = models.ForeignKey(
        SemesterTimeline,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    level = models.CharField(max_length=2, choices=Level.choices, db_index=True)
    step = models.PositiveIntegerField()
    detail = models.TextField()
    action_owner = models.CharField(max_length=255)
    deadline_start = models.DateField()
    deadline_end = models.DateField()
    week_label = models.CharField(max_length=64, blank=True)
    target_roles = models.JSONField(default=list)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.UPCOMING)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "level", "step", "deadline_start", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["timeline", "level", "step"],
                name="unique_step_per_timeline_level",
            )
        ]

    def __str__(self):
        return f"{self.timeline}: {self.level} step {self.step}"


class TimelineAuditLog(models.Model):
    class Action(models.TextChoices):
        UPLOAD = "UPLOAD", "Upload"
        REPLACE = "REPLACE", "Replace"
        EDIT_ENTRY = "EDIT_ENTRY", "Edit Entry"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="dashboard_timeline_audit_logs",
    )
    timeline = models.ForeignKey(
        SemesterTimeline,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    entry = models.ForeignKey(
        SemesterTimelineEntry,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    summary = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.action}: {self.summary}"

