from decimal import Decimal

from django import forms
from django.contrib import admin, messages
from django.core.exceptions import ValidationError

from .models import (
    EvaluationPeriod,
    EvaluationTask,
    EvaluationTaskHandoverAudit,
    EvaluationTaskOverrideAudit,
    MarkCorrectionAudit,
    MarkEntry,
    MarkScore,
    MarksConfigurationAudit,
    Rubric,
    RubricComponent,
)
from .services import correct_submitted_marks, reopen_submitted_marks


class RubricComponentInline(admin.TabularInline):
    model = RubricComponent
    extra = 0
    readonly_fields = (
        "code",
        "name",
        "description",
        "max_marks",
        "is_required",
        "is_active",
        "display_order",
    )
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Rubric)
class RubricAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "version",
        "maximum_mark",
        "target_mark",
        "is_active",
        "updated_at",
    )
    list_filter = ("is_active",)
    search_fields = ("code", "name")
    inlines = [RubricComponentInline]
    readonly_fields = (
        "name",
        "code",
        "family_code",
        "version",
        "target_mark",
        "supersedes",
        "description",
        "is_active",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EvaluationPeriod)
class EvaluationPeriodAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "semester",
        "rubric",
        "lifecycle_status",
        "opens_at",
        "closes_at",
    )
    list_filter = ("lifecycle_status", "semester")
    search_fields = ("name", "semester")
    readonly_fields = (
        "name",
        "semester",
        "rubric",
        "opens_at",
        "closes_at",
        "lifecycle_status",
        "is_open",
        "published_at",
        "closed_at",
        "archived_at",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MarksConfigurationAudit)
class MarksConfigurationAuditAdmin(admin.ModelAdmin):
    list_display = (
        "entity_type",
        "entity_id",
        "action",
        "actor",
        "created_at",
    )
    list_filter = ("entity_type", "action")
    search_fields = ("actor__full_name", "reason")
    readonly_fields = (
        "entity_type",
        "entity_id",
        "action",
        "actor",
        "reason",
        "before_values",
        "after_values",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EvaluationTask)
class EvaluationTaskAdmin(admin.ModelAdmin):
    list_display = (
        "profile",
        "evaluator",
        "evaluator_role",
        "period",
        "lifecycle_status",
        "assigned_at",
    )
    list_filter = ("period", "evaluator_role", "lifecycle_status")
    search_fields = (
        "profile__matric_no",
        "profile__student_name",
        "evaluator__full_name",
    )


@admin.register(EvaluationTaskOverrideAudit)
class EvaluationTaskOverrideAuditAdmin(admin.ModelAdmin):
    list_display = ("task", "actor", "original_evaluator", "new_evaluator", "created_at")
    search_fields = (
        "task__profile__matric_no",
        "actor__full_name",
        "new_evaluator__full_name",
        "reason",
    )
    readonly_fields = (
        "task",
        "actor",
        "original_evaluator",
        "new_evaluator",
        "reason",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(EvaluationTaskHandoverAudit)
class EvaluationTaskHandoverAuditAdmin(admin.ModelAdmin):
    list_display = ("task", "replacement_task", "actor", "created_at")
    readonly_fields = (
        "task",
        "replacement_task",
        "actor",
        "reason",
        "draft_snapshot",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class MarkScoreInline(admin.TabularInline):
    model = MarkScore
    extra = 0
    readonly_fields = ("component", "marks_awarded", "feedback")
    can_delete = False


class MarkCorrectionForm(forms.ModelForm):
    correction_reason = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={"rows": 3}),
        help_text="Required when correcting or reopening submitted marks.",
    )
    reopen_for_lecturer = forms.BooleanField(required=False)
    corrected_scores = forms.CharField(
        required=False,
        help_text=(
            "Optional corrections as component_id=mark pairs, for example: "
            "12=18.5,13=22"
        ),
    )

    class Meta:
        model = MarkEntry
        fields = ("comments",)

    def clean_corrected_scores(self):
        raw = self.cleaned_data.get("corrected_scores", "").strip()
        if not raw:
            return {}
        parsed = {}
        try:
            for pair in raw.split(","):
                component_id, value = pair.split("=", 1)
                parsed[int(component_id.strip())] = Decimal(value.strip())
        except (ValueError, ArithmeticError) as exc:
            raise forms.ValidationError(
                "Use component_id=mark pairs separated by commas."
            ) from exc
        return parsed

    def clean(self):
        cleaned = super().clean()
        comments_changed = "comments" in self.changed_data
        submitted_comment_change = (
            self.instance.status == MarkEntry.Status.SUBMITTED
            and comments_changed
        )
        if (
            cleaned.get("reopen_for_lecturer")
            or cleaned.get("corrected_scores")
            or submitted_comment_change
        ) and not cleaned.get("correction_reason", "").strip():
            raise forms.ValidationError(
                "A correction reason is required for submitted mark changes."
            )
        if cleaned.get("reopen_for_lecturer") and (
            cleaned.get("corrected_scores") or comments_changed
        ):
            raise forms.ValidationError(
                "Reopen the entry before changing scores or comments."
            )
        return cleaned


@admin.register(MarkEntry)
class MarkEntryAdmin(admin.ModelAdmin):
    form = MarkCorrectionForm
    inlines = [MarkScoreInline]
    list_display = ("task", "status", "total_mark", "submitted_at", "updated_at")
    list_filter = ("status", "task__period")
    search_fields = (
        "task__profile__matric_no",
        "task__profile__student_name",
        "task__evaluator__full_name",
    )
    readonly_fields = ("status", "total_mark", "submitted_at", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            super().save_model(request, obj, form, change)
            return
        reason = form.cleaned_data.get("correction_reason", "")
        try:
            if form.cleaned_data.get("reopen_for_lecturer"):
                reopen_submitted_marks(entry=obj, actor=request.user, reason=reason)
                self.message_user(
                    request,
                    "Submitted marks were reopened for lecturer editing.",
                    messages.SUCCESS,
                )
            elif form.cleaned_data.get("corrected_scores"):
                correct_submitted_marks(
                    entry=obj,
                    actor=request.user,
                    score_values=form.cleaned_data["corrected_scores"],
                    reason=reason,
                    comments=form.cleaned_data["comments"],
                )
                self.message_user(
                    request,
                    "Submitted marks were corrected and audited.",
                    messages.SUCCESS,
                )
            elif (
                obj.status == MarkEntry.Status.SUBMITTED
                and "comments" in form.changed_data
            ):
                correct_submitted_marks(
                    entry=obj,
                    actor=request.user,
                    score_values={},
                    reason=reason,
                    comments=form.cleaned_data["comments"],
                )
                self.message_user(
                    request,
                    "Submitted comments were corrected and audited.",
                    messages.SUCCESS,
                )
            else:
                super().save_model(request, obj, form, change)
        except ValidationError as exc:
            form.add_error(None, exc)
            raise


@admin.register(MarkCorrectionAudit)
class MarkCorrectionAuditAdmin(admin.ModelAdmin):
    list_display = ("entry", "action", "actor", "reason", "created_at")
    list_filter = ("action",)
    search_fields = (
        "entry__task__profile__matric_no",
        "actor__full_name",
        "reason",
    )
    readonly_fields = (
        "entry",
        "action",
        "actor",
        "reason",
        "before_values",
        "after_values",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
