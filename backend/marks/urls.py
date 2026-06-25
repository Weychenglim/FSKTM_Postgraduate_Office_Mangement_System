from django.urls import path

from . import views


urlpatterns = [
    path("", views.mark_records_view),
    path("periods/", views.evaluation_periods_view),
    path("assignment-options/", views.assignment_options_view),
    path("rubric-components/", views.rubric_components_view),
    path("evaluation-tasks/", views.evaluation_preview_tasks_view),
    path("my-evaluation-tasks/", views.my_evaluation_tasks_view),
    path("periods/<int:pk>/generate-tasks/", views.generate_period_tasks_view),
    path("periods/<int:pk>/manual-overrides/", views.manual_override_task_view),
    path("tasks/<int:pk>/draft/", views.save_draft_view),
    path("tasks/<int:pk>/submit/", views.submit_marks_view),
]
