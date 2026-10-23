"""Letter request routes, mounted under /api/letters/ by the project URLconf."""
from django.urls import path

from . import request_views as views

urlpatterns = [
    path("requests/", views.letter_requests, name="letter-requests"),
    path("requests/counts/", views.request_counts, name="letter-request-counts"),
    path("requests/recipient-options/", views.recipient_options_view, name="letter-recipient-options"),
    path("requests/<int:pk>/", views.letter_detail, name="letter-request-detail"),
    path("requests/<int:pk>/withdraw/", views.withdraw_request, name="letter-request-withdraw"),
    path("requests/<int:pk>/approve/", views.approve_request, name="letter-request-approve"),
    path("requests/<int:pk>/reject/", views.reject_request, name="letter-request-reject"),
    path("requests/<int:pk>/pdf/", views.letter_pdf, name="letter-request-pdf"),
    path(
        "requests/<int:pk>/resend-notification/",
        views.resend_notification,
        name="letter-request-resend-notification",
    ),
    path("requests/<int:pk>/revoke/", views.revoke_letter, name="letter-request-revoke"),
    path("requests/<int:pk>/reissue/", views.reissue, name="letter-request-reissue"),
    path("appointment-letters/missing/", views.missing_letters, name="appointment-letters-missing"),
    path("appointment-letters/create/", views.create_missing_letters, name="appointment-letters-create"),
    path("appointment-letters/received/", views.received_letters, name="appointment-letters-received"),
]
