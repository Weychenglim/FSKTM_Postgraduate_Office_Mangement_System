"""Auth routes, mounted under /api/auth/ by the project URLconf."""
from django.urls import path

from . import views

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("me/", views.me_view, name="me"),
    path("me/letter-details/", views.my_letter_details_view, name="my-letter-details"),
    path("me/change-password/", views.change_password_view, name="change-password"),
    path(
        "me/notification-preferences/",
        views.notification_preferences_view,
        name="notification-preferences",
    ),
    path("password-reset/", views.password_reset_view, name="password-reset"),
    path(
        "password-reset/confirm/",
        views.password_reset_confirm_view,
        name="password-reset-confirm",
    ),
]
