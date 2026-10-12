"""Hold accounts flagged with ``must_change_password`` at the password change,
and keep Technical Administrator accounts out of the portal API.

Registered as the default DRF authentication class, so it covers every API view
that does not choose its own authenticators (only refresh and logout do, and
both must keep working while the flag is set).
"""
from django.urls import reverse
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


class PasswordChangeRequired(PermissionDenied):
    default_detail = {
        "detail": "Change your password before continuing.",
        "code": "password_change_required",
    }
    default_code = "password_change_required"


class TechnicalAccountForbidden(PermissionDenied):
    default_detail = {
        "detail": "This is a technical account. Sign in through the admin site instead.",
        "code": "technical_account",
    }
    default_code = "technical_account"


class PasswordPolicyJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None and result[0].is_technical_admin:
            raise TechnicalAccountForbidden()
        if result is not None and result[0].must_change_password:
            allowed = {
                ("GET", reverse("me")),
                ("POST", reverse("change-password")),
                ("GET", reverse("settings")),
                ("PATCH", reverse("settings")),
                ("POST", reverse("settings-password")),
            }
            if (request.method, request.path) not in allowed:
                raise PasswordChangeRequired()
        return result
