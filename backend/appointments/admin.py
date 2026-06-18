from django.contrib import admin

from .models import PanelAppointment, PanelRecommendation, StudentResearchProfile


@admin.register(StudentResearchProfile)
class StudentResearchProfileAdmin(admin.ModelAdmin):
    list_display = ("matric_no", "student_name", "programme", "supervisor")
    search_fields = ("matric_no", "student_name", "proposed_topic", "supervisor__full_name")
    list_filter = ("programme", "semester")


@admin.register(PanelRecommendation)
class PanelRecommendationAdmin(admin.ModelAdmin):
    list_display = ("profile", "recommended_member", "supervisor", "status", "updated_at")
    search_fields = (
        "profile__matric_no",
        "profile__student_name",
        "recommended_member__full_name",
        "supervisor__full_name",
    )
    list_filter = ("status",)


@admin.register(PanelAppointment)
class PanelAppointmentAdmin(admin.ModelAdmin):
    list_display = ("profile", "panel_member", "supervisor", "approved_by", "appointment_date", "status")
    search_fields = ("profile__matric_no", "profile__student_name", "panel_member__full_name")
    list_filter = ("status", "appointment_date")
