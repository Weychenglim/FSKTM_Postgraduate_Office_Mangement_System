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
]

