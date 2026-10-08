from django.contrib import admin

from .models import (
    AppointmentLifecycleEvent,
    AppointmentWorkflowEvent,
    PanelAppointment,
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorApplicationDocument,
    SupervisorAppointment,
    SupervisorDocumentRequirement,
    SupervisorDocumentRequirementAudit,
)


class ReadOnlyWorkflowAdmin(admin.ModelAdmin):
    """Governed writes belong to the audited application services."""

    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AppointmentLifecycleEvent)
class AppointmentLifecycleEventAdmin(admin.ModelAdmin):
    list_display = ("action", "actor", "outcome", "created_at")
    list_filter = ("action", "outcome", "created_at")
    readonly_fields = (
        "supervisor_appointment",
        "panel_appointment",
        "actor",
        "actor_role",
        "action",
        "previous_status",
        "new_status",
        "outcome",
        "reason",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(StudentResearchProfile)
class StudentResearchProfileAdmin(admin.ModelAdmin):
    list_display = ("matric_no", "student_name", "programme", "supervisor")
    search_fields = ("matric_no", "student_name", "proposed_topic", "supervisor__full_name")
    list_filter = ("programme", "semester")

    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.fields) if obj else ("revision",)

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PanelRecommendation)
class PanelRecommendationAdmin(ReadOnlyWorkflowAdmin):
    list_display = ("profile", "recommended_member", "supervisor", "status", "updated_at")
    search_fields = (
        "profile__matric_no",
        "profile__student_name",
        "recommended_member__full_name",
        "supervisor__full_name",
    )
    list_filter = ("status",)


@admin.register(PanelAppointment)
class PanelAppointmentAdmin(ReadOnlyWorkflowAdmin):
    list_display = ("profile", "panel_member", "supervisor", "approved_by", "appointment_date", "status")
    search_fields = ("profile__matric_no", "profile__student_name", "panel_member__full_name")
    list_filter = ("status", "appointment_date")


class SupervisorApplicationDocumentInline(admin.TabularInline):
    model = SupervisorApplicationDocument
    extra = 0
    can_delete = False
    readonly_fields = (
        "requirement",
        "file",
        "name",
        "category",
        "content_type",
        "size",
        "requirement_code",
        "requirement_label",
        "checksum_sha256",
        "uploaded_at",
    )

    def has_add_permission(self, request, obj=None):
        return False


class SupervisorWorkflowEventInline(admin.TabularInline):
    model = AppointmentWorkflowEvent
    fk_name = "supervisor_application"
    extra = 0
    can_delete = False
    readonly_fields = (
        "actor",
        "actor_role",
        "action",
        "previous_status",
        "new_status",
        "reason",
        "created_at",
    )

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SupervisorApplication)
class SupervisorApplicationAdmin(ReadOnlyWorkflowAdmin):
    list_display = (
        "student",
        "proposed_supervisor",
        "status",
        "submitted_at",
        "updated_at",
    )
    list_filter = ("status", "student__programme")
    search_fields = (
        "student__matric_no",
        "student__user__full_name",
        "proposed_supervisor__full_name",
        "research_title",
    )
    readonly_fields = (
        "submitted_at",
        "supervisor_decided_at",
        "coordinator_decided_at",
        "cancelled_at",
        "cancellation_reason",
        "created_at",
        "updated_at",
    )
    inlines = [SupervisorApplicationDocumentInline, SupervisorWorkflowEventInline]


@admin.register(SupervisorAppointment)
class SupervisorAppointmentAdmin(ReadOnlyWorkflowAdmin):
    list_display = (
        "student",
        "supervisor",
        "approved_by",
        "appointment_date",
        "status",
    )
    list_filter = ("status", "appointment_date")
    search_fields = (
        "student__matric_no",
        "student__user__full_name",
        "supervisor__full_name",
    )


@admin.register(SupervisorDocumentRequirement)
class SupervisorDocumentRequirementAdmin(ReadOnlyWorkflowAdmin):
    list_display = ("code", "label", "is_required", "is_active", "display_order")
    list_filter = ("is_required", "is_active")
    search_fields = ("code", "label", "description")
    readonly_fields = ("code",)


@admin.register(SupervisorDocumentRequirementAudit)
class SupervisorDocumentRequirementAuditAdmin(admin.ModelAdmin):
    list_display = ("requirement", "action", "actor", "created_at")
    list_filter = ("action", "created_at")
    readonly_fields = (
        "requirement",
        "actor",
        "action",
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


@admin.register(AppointmentWorkflowEvent)
class AppointmentWorkflowEventAdmin(ReadOnlyWorkflowAdmin):
    list_display = (
        "action",
        "actor",
        "actor_role",
        "previous_status",
        "new_status",
        "created_at",
    )
    list_filter = ("action", "actor_role", "new_status")
    search_fields = ("actor__full_name", "reason")
    readonly_fields = (
        "panel_recommendation",
        "supervisor_application",
        "actor",
        "actor_role",
        "action",
        "previous_status",
        "new_status",
        "reason",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
