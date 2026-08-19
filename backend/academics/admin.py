from django.contrib import admin

from .models import (
    AcademicSemester,
    AcademicSemesterAudit,
    LecturerAvailabilityWindow,
    LecturerCapacityAudit,
    LecturerCapacityEntry,
    SemesterCapacityPlan,
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
    readonly_fields = ("created_at", "published_at")

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.lifecycle_status != SemesterCapacityPlan.Lifecycle.DRAFT:
            return _all_model_fields(self.model)
        return super().get_readonly_fields(request, obj)

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
    readonly_fields = _all_model_fields(LecturerCapacityAudit)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

