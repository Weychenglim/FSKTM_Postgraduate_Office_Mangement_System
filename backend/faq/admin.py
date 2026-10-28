from django.contrib import admin

from .models import FaqCategory, FaqChange, FaqEntry


@admin.register(FaqCategory)
class FaqCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "position")


@admin.register(FaqEntry)
class FaqEntryAdmin(admin.ModelAdmin):
    list_display = ("question", "category", "status", "updated_at")
    list_filter = ("status", "category")
    search_fields = ("question", "answer")
    readonly_fields = ("source_ref", "source_text", "source_note", "source_page", "checked_by", "checked_at")


@admin.register(FaqChange)
class FaqChangeAdmin(admin.ModelAdmin):
    list_display = ("created_at", "question", "action", "actor_name")
    list_filter = ("action",)
    readonly_fields = tuple(field.name for field in FaqChange._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
