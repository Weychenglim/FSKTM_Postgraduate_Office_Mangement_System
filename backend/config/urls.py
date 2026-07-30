"""Project URL configuration."""
from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse


def health(_request):
    return JsonResponse({"status": "ok", "service": "fsktm-pg-office-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("accounts.urls")),
    path("api/academics/", include("academics.urls")),
    path("api/appointments/", include("appointments.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/marks/", include("marks.urls")),
    path("api/letter-templates/", include("letters.urls")),
    path("api/", include("announcements.urls")),
]
