from django.contrib import admin

from .models import Announcement, Notification


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "target", "priority", "status", "created_by_name", "created_at")
    list_filter = ("status", "priority", "target")
    search_fields = ("title", "content", "created_by_name")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("title", "content", "target", "priority", "status")}),
        ("Attachment", {"fields": ("attachment",)}),
        ("Audit", {"fields": ("created_by", "created_by_name", "created_at", "updated_at")}),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "priority", "is_read", "is_announcement", "created_at")
    list_filter = ("is_read", "is_announcement", "priority", "module_label")
    search_fields = ("title", "summary", "message", "recipient__email")
    readonly_fields = ("created_at",)
    autocomplete_fields = ()
