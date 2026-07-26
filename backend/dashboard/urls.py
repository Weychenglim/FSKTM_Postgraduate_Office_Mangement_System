from django.urls import path

from . import views


urlpatterns = [
    path("timeline/active/", views.active_timeline_view),
    path("timeline/template/", views.template_view),
    path("timeline/upload/", views.upload_timeline_view),
    path("timeline/audit-logs/", views.timeline_audit_logs_view),
    path("timeline/entries/", views.timeline_entry_list_view),
    path("timeline/entries/<int:pk>/", views.timeline_entry_detail_view),
    path("tasks/", views.dashboard_tasks_view),
    path("summary/", views.dashboard_summary_view),
    path("reports/", views.workflow_report_view),
    path("reports/export/", views.workflow_report_export_view),
    path(
        "progress/<str:student_id>/",
        views.student_progress_dossier_view,
    ),
]
