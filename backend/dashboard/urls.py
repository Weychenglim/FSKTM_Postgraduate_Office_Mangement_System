from django.urls import path

from . import views


urlpatterns = [
    path("timeline/active/", views.active_timeline_view),
    path("timeline/template/", views.template_view),
    path("timeline/upload/", views.upload_timeline_view),
    path("timeline/entries/<int:pk>/", views.timeline_entry_detail_view),
    path("tasks/", views.dashboard_tasks_view),
]

