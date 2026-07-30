from django.contrib import admin

from .models import AcademicSemester, AcademicSemesterAudit


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

