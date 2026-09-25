from django.contrib import admin
from django.core.exceptions import ValidationError
from django.db import router, transaction

from .models import (
    AcademicSemester,
    AcademicSemesterAudit,
    LecturerAvailabilityWindow,
    LecturerCapacityAudit,
    LecturerCapacityEntry,
    SemesterCapacityPlan,
    capacity_plans_for_update,
)


@admin.register(AcademicSemester)
class AcademicSemesterAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "academic_session",
        "term",
        "starts_on",
        "ends_on",
        "lifecycle_status",
    )
    list_filter = ("lifecycle_status", "term", "academic_session")
    search_fields = ("code", "academic_session")
    readonly_fields = (
        "code",
        "activated_at",
        "closed_at",
        "archived_at",
        "created_at",
        "updated_at",
    )


@admin.register(AcademicSemesterAudit)
class AcademicSemesterAuditAdmin(admin.ModelAdmin):
    list_display = ("semester", "action", "actor", "created_at")
    list_filter = ("action",)
    readonly_fields = (
        "semester",
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


def _all_model_fields(model):
    return tuple(field.name for field in model._meta.fields)


@admin.register(SemesterCapacityPlan)
class SemesterCapacityPlanAdmin(admin.ModelAdmin):
    list_display = (
        "academic_semester",
        "version",
        "lifecycle_status",
        "origin",
        "created_by",
        "created_at",
    )
    list_filter = ("lifecycle_status", "origin", "academic_semester")
    search_fields = ("academic_semester__code", "created_by__email")
    readonly_fields = (
        "lifecycle_status",
        "published_by",
        "publication_reason",
        "published_at",
        "created_at",
    )

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.lifecycle_status != SemesterCapacityPlan.Lifecycle.DRAFT:
            return _all_model_fields(self.model)
        return super().get_readonly_fields(request, obj)

    def save_model(self, request, obj, form, change):
        using = obj._state.db or router.db_for_write(self.model, instance=obj)
        with transaction.atomic(using=using):
            if change:
                persisted = (
                    capacity_plans_for_update(using=using)
                    .only(
                        "lifecycle_status",
                        "published_by_id",
                        "publication_reason",
                        "published_at",
                    )
                    .get(pk=obj.pk)
                )
                if persisted.lifecycle_status != SemesterCapacityPlan.Lifecycle.DRAFT:
                    raise ValidationError(
                        "Capacity plan is no longer Draft; reload and retry."
                    )
                obj.lifecycle_status = persisted.lifecycle_status
                obj.published_by_id = persisted.published_by_id
                obj.publication_reason = persisted.publication_reason
                obj.published_at = persisted.published_at
            else:
                obj.lifecycle_status = SemesterCapacityPlan.Lifecycle.DRAFT
                obj.published_by = None
                obj.publication_reason = ""
                obj.published_at = None
            super().save_model(request, obj, form, change)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LecturerCapacityEntry)
class LecturerCapacityEntryAdmin(admin.ModelAdmin):
    list_display = (
        "plan",
        "lecturer",
        "supervisor_limit",
        "panel_limit",
        "updated_by",
        "updated_at",
    )
    list_filter = ("plan__lifecycle_status", "plan__academic_semester")
    search_fields = ("lecturer__staff_no", "lecturer__user__full_name")
    readonly_fields = ("created_at", "updated_at")

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "plan":
            kwargs["queryset"] = SemesterCapacityPlan.objects.filter(
                lifecycle_status=SemesterCapacityPlan.Lifecycle.DRAFT
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.plan.lifecycle_status != SemesterCapacityPlan.Lifecycle.DRAFT:
            return _all_model_fields(self.model)
        return super().get_readonly_fields(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LecturerAvailabilityWindow)
class LecturerAvailabilityWindowAdmin(admin.ModelAdmin):
    list_display = (
        "academic_semester",
        "lecturer",
        "role",
        "starts_on",
        "ends_on",
        "cancelled_at",
    )
    list_filter = ("role", "academic_semester")
    search_fields = ("lecturer__staff_no", "lecturer__user__full_name", "reason")
    readonly_fields = ("created_at",)

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return _all_model_fields(self.model)
        return super().get_readonly_fields(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LecturerCapacityAudit)
class LecturerCapacityAuditAdmin(admin.ModelAdmin):
    list_display = (
        "academic_semester",
        "action",
        "actor",
        "plan",
        "lecturer",
        "created_at",
    )
    list_filter = ("action", "academic_semester")
    search_fields = ("actor__email", "lecturer__staff_no", "reason")
    list_select_related = (
        "academic_semester",
        "plan",
        "plan__academic_semester",
        "lecturer",
        "lecturer__user",
        "actor",
    )
    readonly_fields = _all_model_fields(LecturerCapacityAudit)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
