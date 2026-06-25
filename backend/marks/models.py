from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q, Sum
from django.utils import timezone


class Rubric(models.Model):
    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def maximum_mark(self):
        return self.components.aggregate(total=Sum("max_marks"))["total"] or Decimal(
            "0.00"
        )


class RubricComponent(models.Model):
    rubric = models.ForeignKey(
        Rubric,
        on_delete=models.CASCADE,
        related_name="components",
    )
    code = models.SlugField(max_length=64)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    max_marks = models.DecimalField(max_digits=7, decimal_places=2)
    is_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["rubric", "code"],
                name="unique_component_code_per_rubric",
            ),
            models.CheckConstraint(
                condition=Q(max_marks__gt=0),
                name="rubric_component_max_marks_positive",
            ),
        ]

    def __str__(self):
        return f"{self.rubric.code}: {self.name}"


class EvaluationPeriod(models.Model):
    name = models.CharField(max_length=255)
    semester = models.CharField(max_length=128)
    rubric = models.ForeignKey(
        Rubric,
        on_delete=models.PROTECT,
        related_name="evaluation_periods",
    )
    opens_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)
    is_open = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.semester})"


class EvaluationTask(models.Model):
    class EvaluatorRole(models.TextChoices):
        SUPERVISOR = "SUPERVISOR", "Supervisor"
        PANEL = "PANEL", "Panel"
        BACKUP = "BACKUP", "Backup / Manual Override"

    profile = models.ForeignKey(
        "appointments.StudentResearchProfile",
        on_delete=models.PROTECT,
        related_name="evaluation_tasks",
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="evaluation_tasks",
    )
    period = models.ForeignKey(
        EvaluationPeriod,
        on_delete=models.PROTECT,
        related_name="tasks",
    )
    evaluator_role = models.CharField(
        max_length=16,
        choices=EvaluatorRole.choices,
        default=EvaluatorRole.PANEL,
        db_index=True,
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_evaluation_tasks",
        null=True,
        blank=True,
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["profile__student_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "evaluator", "period", "evaluator_role"],
                name="unique_evaluation_task_assignment",
            )
        ]

    def __str__(self):
        return (
            f"{self.profile.matric_no} evaluated by {self.evaluator} "
            f"({self.evaluator_role})"
        )


class EvaluationTaskOverrideAudit(models.Model):
    task = models.ForeignKey(
        EvaluationTask,
        on_delete=models.PROTECT,
        related_name="override_audits",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="evaluation_task_override_audits",
    )
    original_evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="evaluation_task_overrides_replaced",
        null=True,
        blank=True,
    )
    new_evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="evaluation_task_overrides_received",
    )
    reason = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]


class MarkEntry(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = "NOT_STARTED", "Not Started"
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"

    task = models.OneToOneField(
        EvaluationTask,
        on_delete=models.CASCADE,
        related_name="mark_entry",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.NOT_STARTED,
        db_index=True,
    )
    total_mark = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    comments = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    @property
    def is_locked(self):
        return self.status == self.Status.SUBMITTED

    def recalculate_total(self, save=True):
        total = self.scores.aggregate(total=Sum("marks_awarded"))["total"] or Decimal(
            "0.00"
        )
        self.total_mark = total
        if save:
            self.save(update_fields=["total_mark", "updated_at"])
        return total


class MarkScore(models.Model):
    entry = models.ForeignKey(
        MarkEntry,
        on_delete=models.CASCADE,
        related_name="scores",
    )
    component = models.ForeignKey(
        RubricComponent,
        on_delete=models.PROTECT,
        related_name="scores",
    )
    marks_awarded = models.DecimalField(max_digits=7, decimal_places=2)
    feedback = models.TextField(blank=True)

    class Meta:
        ordering = ["component__display_order", "component_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["entry", "component"],
                name="unique_score_per_entry_component",
            ),
            models.CheckConstraint(
                condition=Q(marks_awarded__gte=0),
                name="mark_score_non_negative",
            ),
        ]

    def clean(self):
        super().clean()
        if self.marks_awarded > self.component.max_marks:
            from django.core.exceptions import ValidationError

            raise ValidationError(
                {
                    "marks_awarded": (
                        f"Marks cannot exceed {self.component.max_marks} "
                        f"for {self.component.name}."
                    )
                }
            )


class MarkCorrectionAudit(models.Model):
    class Action(models.TextChoices):
        CORRECT = "CORRECT", "Correct submitted marks"
        REOPEN = "REOPEN", "Reopen submitted marks"

    entry = models.ForeignKey(
        MarkEntry,
        on_delete=models.PROTECT,
        related_name="correction_audits",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="mark_correction_audits",
    )
    action = models.CharField(max_length=16, choices=Action.choices)
    reason = models.TextField()
    before_values = models.JSONField()
    after_values = models.JSONField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]
