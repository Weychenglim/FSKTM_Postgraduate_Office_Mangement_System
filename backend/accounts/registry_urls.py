"""Student Registry routes, mounted under /api/registry/ by the project URLconf."""
from django.urls import path

from . import registry_views

urlpatterns = [
    path("students/", registry_views.student_records_view, name="registry-students"),
    path(
        "students/<str:matric_no>/",
        registry_views.student_record_detail_view,
        name="registry-student-detail",
    ),
]
