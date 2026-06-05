from django.contrib import admin

from .models import LetterTemplate


@admin.register(LetterTemplate)
class LetterTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "letter_type", "status", "modified_by", "updated_at")
    list_filter = ("status", "letter_type")
    search_fields = ("name", "description", "content")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("name", "letter_type", "status", "description")}),
        ("Body", {"fields": ("content", "reference_prefix")}),
        ("Audit", {"fields": ("modified_by", "created_at", "updated_at")}),
    )
