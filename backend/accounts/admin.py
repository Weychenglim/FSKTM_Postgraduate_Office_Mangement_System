"""Django admin for the custom user + role profiles — the 'super admin' screen
office staff use to create and manage accounts.

A User is edited together with its one matching profile (Student / Office staff /
Lecturer) via inlines. A Lecturer's overlapping specializations (Coordinator /
Supervisor / Panel) are managed on the dedicated Lecturer admin page.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .forms import UserCreationForm, UserChangeForm
from .models import (
    Coordinator,
    Lecturer,
    OfficeStaff,
    Panel,
    Student,
    StudentRegistry,
    Supervisor,
    User,
)


# ── Profile inlines shown on the User page ───────────────────────────────────


class StudentInline(admin.StackedInline):
    model = Student
    extra = 0
    verbose_name_plural = "Student profile"


class OfficeStaffInline(admin.StackedInline):
    model = OfficeStaff
    extra = 0
    verbose_name_plural = "Office staff profile"


class LecturerInline(admin.StackedInline):
    model = Lecturer
    extra = 0
    verbose_name_plural = "Lecturer profile"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = UserCreationForm
    form = UserChangeForm
    model = User
    inlines = [StudentInline, OfficeStaffInline, LecturerInline]

    list_display = ("email", "full_name", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = (
        "email",
        "full_name",
        "student__matric_no",
        "office_staff__staff_no",
        "lecturer__staff_no",
    )
    ordering = ("full_name",)
    filter_horizontal = ("groups", "user_permissions")
    readonly_fields = ("last_login", "date_joined")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name", "role", "phone", "must_change_password")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "role", "phone", "password1", "password2"),
            },
        ),
    )

    def get_inline_instances(self, request, obj=None):
        # Profiles can only attach to a saved user, so hide inlines on the add page.
        if obj is None:
            return []
        return super().get_inline_instances(request, obj)


# ── Lecturer specialization inlines (managed on the Lecturer page) ───────────


class CoordinatorInline(admin.StackedInline):
    model = Coordinator
    extra = 0


class SupervisorInline(admin.StackedInline):
    model = Supervisor
    extra = 0


class PanelInline(admin.StackedInline):
    model = Panel
    extra = 0


@admin.register(Lecturer)
class LecturerAdmin(admin.ModelAdmin):
    inlines = [CoordinatorInline, SupervisorInline, PanelInline]
    list_display = (
        "staff_no",
        "full_name",
        "department",
        "is_coordinator",
        "is_supervisor",
        "is_panel",
    )
    search_fields = ("staff_no", "user__full_name", "user__email")

    @admin.display(description="Name")
    def full_name(self, obj):
        return obj.user.full_name

    @admin.display(boolean=True, description="Coordinator")
    def is_coordinator(self, obj):
        return Coordinator.objects.filter(pk=obj.pk).exists()

    @admin.display(boolean=True, description="Supervisor")
    def is_supervisor(self, obj):
        return Supervisor.objects.filter(pk=obj.pk).exists()

    @admin.display(boolean=True, description="Panel")
    def is_panel(self, obj):
        return Panel.objects.filter(pk=obj.pk).exists()


class StudentRegistryInline(admin.StackedInline):
    model = StudentRegistry
    extra = 0
    verbose_name_plural = "Registry details (for official letters)"


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    inlines = [StudentRegistryInline]
    list_display = ("matric_no", "full_name", "programme", "status", "has_registry")
    list_filter = ("status",)
    search_fields = ("matric_no", "user__full_name", "user__email")

    @admin.display(description="Name")
    def full_name(self, obj):
        return obj.user.full_name

    @admin.display(boolean=True, description="Registry details")
    def has_registry(self, obj):
        return StudentRegistry.objects.filter(pk=obj.pk).exists()


@admin.register(OfficeStaff)
class OfficeStaffAdmin(admin.ModelAdmin):
    list_display = ("staff_no", "full_name", "department", "position")
    search_fields = ("staff_no", "user__full_name", "user__email")

    @admin.display(description="Name")
    def full_name(self, obj):
        return obj.user.full_name
