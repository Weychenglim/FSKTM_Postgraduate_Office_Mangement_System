from django.contrib import admin

from .models import SemesterTimeline, SemesterTimelineEntry, TimelineAuditLog


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

