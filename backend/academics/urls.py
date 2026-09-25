from django.urls import path

from . import views

urlpatterns = [
    path("semesters/active/", views.active_semester_view),
    path("semesters/", views.semester_list_view),
    path("semesters/<int:pk>/", views.semester_detail_view),
    path("semesters/<int:pk>/activate/", views.activate_semester_view),
    path("semesters/<int:pk>/close/", views.close_semester_view),
    path("semesters/<int:pk>/extend/", views.extend_semester_view),
    path("semesters/<int:pk>/archive/", views.archive_semester_view),
    path("semesters/<int:pk>/audits/", views.semester_audits_view),
    path(
        "semesters/<int:pk>/capacity-plans/",
        views.semester_capacity_plans_view,
    ),
    path(
        "capacity-plans/<int:pk>/",
        views.capacity_plan_detail_view,
    ),
    path(
        "capacity-plans/<int:pk>/clone/",
        views.clone_capacity_plan_view,
    ),
    path(
        "capacity-plans/<int:pk>/publish/",
        views.publish_capacity_plan_view,
    ),
    path(
        "capacity-plans/<int:pk>/lecturers/<int:lecturer_id>/",
        views.capacity_plan_entry_view,
    ),
    path(
        "semesters/<int:pk>/availability/",
        views.semester_availability_view,
    ),
    path(
        "availability/<int:pk>/cancel/",
        views.cancel_availability_view,
    ),
    path(
        "semesters/<int:pk>/capacity-audits/",
        views.semester_capacity_audits_view,
    ),
]
