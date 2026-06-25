from decimal import Decimal

from django import forms
from django.contrib import admin, messages
from django.core.exceptions import ValidationError

from .models import (
    EvaluationPeriod,
    EvaluationTask,
    EvaluationTaskOverrideAudit,
    MarkCorrectionAudit,
    MarkEntry,
    MarkScore,
    Rubric,
    RubricComponent,
)
from .services import correct_submitted_marks, reopen_submitted_marks


class RubricComponentInline(admin.TabularInline):
    model = RubricComponent
    extra = 0


@admin.register(Rubric)
class RubricAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "maximum_mark", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("code", "name")
    inlines = [RubricComponentInline]


@admin.register(EvaluationPeriod)
class EvaluationPeriodAdmin(admin.ModelAdmin):
    list_display = ("name", "semester", "rubric", "is_open", "opens_at", "closes_at")
    list_filter = ("is_open", "semester")
    search_fields = ("name", "semester")


@admin.register(EvaluationTask)
class EvaluationTaskAdmin(admin.ModelAdmin):
    list_display = ("profile", "evaluator", "evaluator_role", "period", "assigned_at")
    list_filter = ("period", "evaluator_role")
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
        if (
            cleaned.get("reopen_for_lecturer")
            or cleaned.get("corrected_scores")
        ) and not cleaned.get("correction_reason", "").strip():
            raise forms.ValidationError(
                "A correction reason is required for submitted mark changes."
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
                )
                self.message_user(
                    request,
                    "Submitted marks were corrected and audited.",
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
