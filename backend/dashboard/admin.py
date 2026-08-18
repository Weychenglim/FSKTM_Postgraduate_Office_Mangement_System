from django.contrib import admin

from .models import (
    SemesterTimeline,
    SemesterTimelineEntry,
    TimelineAuditLog,
    WorkflowReconciliationAudit,
)


class SemesterTimelineEntryInline(admin.TabularInline):
    model = SemesterTimelineEntry
    extra = 0


@admin.register(SemesterTimeline)
class SemesterTimelineAdmin(admin.ModelAdmin):
    list_display = ("semester", "session", "is_active", "source_filename", "uploaded_by", "uploaded_at")
    list_filter = ("is_active", "session")
    search_fields = ("semester", "session", "source_filename")
    inlines = [SemesterTimelineEntryInline]


@admin.register(TimelineAuditLog)
class TimelineAuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "actor", "timeline", "summary", "created_at")
    list_filter = ("action",)
    search_fields = ("summary", "actor__full_name", "timeline__semester", "timeline__session")


@admin.register(WorkflowReconciliationAudit)
class WorkflowReconciliationAuditAdmin(admin.ModelAdmin):
    list_display = (
        "issue_type",
        "entity_type",
        "entity_id",
        "action",
        "actor",
        "created_at",
    )
    list_filter = ("issue_type", "entity_type", "action")
    search_fields = ("entity_id", "reason", "actor__full_name")
    readonly_fields = (
        "issue_type",
        "entity_type",
        "entity_id",
        "action",
        "actor",
        "reason",
        "fingerprint",
        "before_values",
        "after_values",
        "affected_records",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

