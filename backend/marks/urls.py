from django.urls import path

from . import views


urlpatterns = [
    path("", views.mark_records_view),
    path("records/<str:record_id>/", views.mark_record_detail_view),
    path("periods/", views.evaluation_periods_view),
    path("periods/<int:pk>/", views.evaluation_period_detail_view),
    path(
        "periods/<int:pk>/publish/",
        views.publish_evaluation_period_view,
    ),
    path("periods/<int:pk>/close/", views.close_evaluation_period_view),
    path("periods/<int:pk>/archive/", views.archive_evaluation_period_view),
    path("rubrics/", views.rubrics_view),
    path("rubrics/<int:pk>/", views.rubric_detail_view),
    path("rubrics/<int:pk>/clone/", views.clone_rubric_view),
    path(
        "rubrics/<int:pk>/components/",
        views.create_rubric_component_view,
    ),
    path(
        "rubrics/<int:pk>/components/<int:component_pk>/",
        views.rubric_component_detail_view,
    ),
    path("assignment-options/", views.assignment_options_view),
    path("rubric-components/", views.rubric_components_view),
    path("evaluation-tasks/", views.evaluation_preview_tasks_view),
    path("my-evaluation-tasks/", views.my_evaluation_tasks_view),
    path("periods/<int:pk>/generate-tasks/", views.generate_period_tasks_view),
    path("periods/<int:pk>/manual-overrides/", views.manual_override_task_view),
    path("tasks/<int:pk>/draft/", views.save_draft_view),
    path("tasks/<int:pk>/submit/", views.submit_marks_view),
]
