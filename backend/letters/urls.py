"""Letter-template routes, mounted under /api/letter-templates/ by the project URLconf."""
from django.urls import path

from . import views

urlpatterns = [
    path("", views.templates_list, name="letter-templates-list"),
    path("placeholders/", views.placeholders_list, name="letter-template-placeholders"),
    path("<int:pk>/", views.templates_detail, name="letter-templates-detail"),
]
