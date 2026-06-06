"""Announcement + notification routes, mounted under /api/ by the project URLconf."""
from django.urls import path

from . import views

urlpatterns = [
    path("announcements/", views.announcements_list, name="announcements-list"),
    path("announcements/<int:pk>/", views.announcement_detail, name="announcement-detail"),
    path(
        "announcements/<int:pk>/attachment/",
        views.announcement_attachment,
        name="announcement-attachment",
    ),
    path("notifications/", views.notifications_list, name="notifications-list"),
    path(
        "notifications/mark-all-read/",
        views.notifications_mark_all_read,
        name="notifications-mark-all-read",
    ),
    path(
        "notifications/<int:pk>/read/",
        views.notification_mark_read,
        name="notification-mark-read",
    ),
]
