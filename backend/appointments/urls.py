from django.urls import path

from . import views


urlpatterns = [
    path("panel/", views.panel_records_view),
    path("panel/eligible-supervisees/", views.eligible_supervisees_view),
    path("panel/candidates/", views.panel_candidates_view),
    path("panel/student/", views.student_panel_appointment_view),
    path("panel/recommendations/", views.recommendations_view),
    path("panel/review-queue/", views.review_queue_view),
    path("panel/coordinator-queue/", views.coordinator_queue_view),
    path("panel/recommendations/<int:pk>/panel-accept/", views.panel_accept_view),
    path("panel/recommendations/<int:pk>/panel-reject/", views.panel_reject_view),
    path("panel/recommendations/<int:pk>/coordinator-approve/", views.coordinator_approve_view),
    path("panel/recommendations/<int:pk>/coordinator-reject/", views.coordinator_reject_view),
    path("panel/assignments/", views.assignments_view),
]
