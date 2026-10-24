from django.urls import path

from . import views
from .capacity_workspace import capacity_workspace_view
from .lecturer_availability import my_availability_view, cancel_my_availability_view

urlpatterns = [
    path('my-availability/', my_availability_view),
    path('my-availability/<int:pk>/cancel/', cancel_my_availability_view),
    path('semesters/<int:pk>/capacity-workspace/', capacity_workspace_view),
    path("semesters/<int:pk>/closure-preview/", views.semester_closure_preview_view),
    path("semesters/<int:pk>/handover-preview/", views.semester_handover_preview_view),
    path("semesters/<int:pk>/activation-readiness/", views.semester_activation_readiness_view),
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
    path("capacity-plans/<int:pk>/discard/", views.discard_capacity_plan_view),
    path("capacity-plans/<int:pk>/entries/bulk/", views.capacity_plan_bulk_entries_view),
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

from . import operational_period_views as operational_views

urlpatterns += [
    path('operational-periods/', operational_views.period_list),
    path('operational-periods/enforcement/', operational_views.enforcement),
    path('operational-periods/availability/', operational_views.availability),
    path('operational-periods/<int:pk>/', operational_views.period_detail),
    path('operational-periods/<int:pk>/publish/', operational_views.period_action, {'action':'PUBLISH'}),
    path('operational-periods/<int:pk>/extend/', operational_views.period_action, {'action':'EXTEND'}),
    path('operational-periods/<int:pk>/close/', operational_views.period_action, {'action':'CLOSE'}),
    path('operational-periods/<int:pk>/archive/', operational_views.period_action, {'action':'ARCHIVE'}),
    path('operational-periods/<int:pk>/exceptions/', operational_views.exceptions),
    path('operational-periods/<int:pk>/exception-candidates/', operational_views.exception_candidates),
    path('operational-exceptions/<int:pk>/revoke/', operational_views.revoke_exception),
]
