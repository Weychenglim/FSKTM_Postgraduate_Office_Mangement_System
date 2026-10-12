"""Issued-letter routes, mounted under /api/letters/ by the project URLconf."""
from django.urls import path

from . import request_views as views

urlpatterns = [
    path("requests/", views.letter_requests, name="letter-requests"),
    path("requests/<int:pk>/", views.letter_detail, name="letter-request-detail"),
    path("requests/<int:pk>/docx/", views.letter_docx, name="letter-request-docx"),
    path(
        "requests/<int:pk>/resend-notification/",
        views.resend_notification,
        name="letter-request-resend-notification",
    ),
    path("requests/<int:pk>/revoke/", views.revoke_letter, name="letter-request-revoke"),
]
