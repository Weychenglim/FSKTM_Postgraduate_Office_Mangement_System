from django.urls import path

from . import views

urlpatterns = [
    path("supervisor/", views.supervisor_records_view),
    path("supervisor/workload/", views.supervisor_workload_view),
    path(
        "supervisor/my-workload/",
        views.own_supervisor_workload_view,
    ),
    path("supervisor/candidates/", views.supervisor_candidates_view),
    path(
        "supervisor/document-requirements/active/",
        views.active_supervisor_document_requirements_view,
    ),
    path(
        "supervisor/document-requirements/audits/",
        views.supervisor_document_requirement_audits_view,
    ),
    path(
        "supervisor/document-requirements/",
        views.supervisor_document_requirements_view,
    ),
    path(
        "supervisor/document-requirements/<int:pk>/",
        views.supervisor_document_requirement_detail_view,
    ),
    path("supervisor/applications/", views.supervisor_applications_view),
    path(
        "supervisor/appointments/<int:pk>/end/",
        views.end_supervisor_appointment_view,
    ),
    path(
        "supervisor/applications/<int:pk>/",
        views.supervisor_application_detail_view,
    ),
    path(
        "supervisor/applications/<int:pk>/documents/<int:document_pk>/download/",
        views.supervisor_application_document_download_view,
    ),
    path(
        "supervisor/applications/<int:pk>/cancel/",
        views.cancel_supervisor_application_view,
    ),
    path("supervisor/requests/", views.supervisor_requests_view),
    path("supervisor/supervisees/", views.active_supervisees_view),
    path("supervisor/request-history/", views.supervisor_request_history_view),
    path("supervisor/coordinator-queue/", views.supervisor_coordinator_queue_view),
    path("supervisor/coordinator-records/", views.supervisor_coordinator_records_view),
    path(
        "supervisor/applications/<int:pk>/supervisor-accept/",
        views.supervisor_accept_view,
    ),
    path(
        "supervisor/applications/<int:pk>/supervisor-reject/",
        views.supervisor_reject_view,
    ),
    path(
        "supervisor/applications/<int:pk>/coordinator-approve/",
        views.supervisor_coordinator_approve_view,
    ),
    path(
        "supervisor/applications/<int:pk>/coordinator-reject/",
        views.supervisor_coordinator_reject_view,
    ),
    path("panel/", views.panel_records_view),
    path(
        "panel/appointments/<int:pk>/end/",
        views.end_panel_appointment_view,
    ),
    path("panel/workload/", views.panel_workload_view),
    path("panel/my-workload/", views.own_panel_workload_view),
    path("panel/eligible-supervisees/", views.eligible_supervisees_view),
    path("panel/candidates/", views.panel_candidates_view),
    path("panel/student/", views.student_panel_appointment_view),
    path("panel/recommendations/", views.recommendations_view),
    path(
        "panel/recommendations/<int:pk>/",
        views.panel_recommendation_detail_view,
    ),
    path("panel/review-queue/", views.review_queue_view),
    path("panel/coordinator-queue/", views.coordinator_queue_view),
    path("panel/coordinator-workspace/", views.coordinator_workspace_view),
    path("panel/review-history/", views.review_history_view),
    path("panel/recommendations/<int:pk>/panel-accept/", views.panel_accept_view),
    path("panel/recommendations/<int:pk>/panel-reject/", views.panel_reject_view),
    path(
        "panel/recommendations/<int:pk>/cancel/",
        views.cancel_panel_recommendation_view,
    ),
    path(
        "panel/recommendations/<int:pk>/coordinator-approve/",
        views.coordinator_approve_view,
    ),
    path(
        "panel/recommendations/<int:pk>/coordinator-reject/",
        views.coordinator_reject_view,
    ),
    path("panel/assignments/", views.assignments_view),
]
