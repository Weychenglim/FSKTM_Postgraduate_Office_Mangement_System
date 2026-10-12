import hashlib

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.throttling import SimpleRateThrottle


class SettingsRateThrottle(SimpleRateThrottle):
    setting_name = ""

    def get_rate(self):
        return getattr(settings, self.setting_name)

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginRateThrottle(SettingsRateThrottle):
    scope = "auth_login"
    setting_name = "AUTH_LOGIN_THROTTLE_RATE"


class LoginIdentifierRateThrottle(SettingsRateThrottle):
    """Sign-in attempts per identifier, so rotating client addresses cannot buy
    unlimited guesses at one account."""

    scope = "auth_login_identifier"
    setting_name = "AUTH_LOGIN_IDENTIFIER_THROTTLE_RATE"

    def get_cache_key(self, request, view):
        data = request.data
        identifier = data.get("identifier") if hasattr(data, "get") else None
        if not isinstance(identifier, str) or not identifier.strip():
            return None
        ident = hashlib.sha256(identifier.strip().lower().encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": ident}


class PasswordResetRateThrottle(SettingsRateThrottle):
    scope = "auth_password_reset"
    setting_name = "AUTH_PASSWORD_RESET_THROTTLE_RATE"


def is_password_link_check(request):
    """A set-password request that only checks its link (``dryRun``)."""
    data = request.data
    value = data.get("dryRun") if hasattr(data, "get") else None
    return str(value).lower() in {"1", "true", "yes"}


class PasswordResetConfirmRateThrottle(SettingsRateThrottle):
    scope = "auth_password_reset_confirm"
    setting_name = "AUTH_PASSWORD_RESET_CONFIRM_THROTTLE_RATE"

    def get_cache_key(self, request, view):
        # Link checks have their own budget below, so opening the page never
        # uses up the attempts to set the password.
        if is_password_link_check(request):
            return None
        return super().get_cache_key(request, view)


class PasswordLinkCheckRateThrottle(SettingsRateThrottle):
    """``dryRun`` requests: opening an activation or reset link checks it
    before the form is shown."""

    scope = "auth_password_link_check"
    setting_name = "AUTH_PASSWORD_LINK_CHECK_THROTTLE_RATE"

    def get_cache_key(self, request, view):
        if not is_password_link_check(request):
            return None
        return super().get_cache_key(request, view)


class ChangePasswordRateThrottle(SettingsRateThrottle):
    """Signed-in password change.

    Keyed on the account, not the client IP: sharing an IP key with the
    anonymous reset-confirm endpoint let either one exhaust the other's budget,
    so a stranger on the same NAT could block a user from rotating a password.
    """

    scope = "auth_change_password"
    setting_name = "AUTH_CHANGE_PASSWORD_THROTTLE_RATE"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class AccessLinkRateThrottle(SettingsRateThrottle):
    """Office-sent access links, counted per student so one inbox is not flooded.

    Only office requests count: anyone else is refused by the view, and letting
    them spend the budget would block the office from sending a real link.
    """

    scope = "registry_access_link"
    setting_name = "REGISTRY_ACCESS_LINK_THROTTLE_RATE"

    def get_cache_key(self, request, view):
        office_role = get_user_model().Role.OFFICE_ADMIN
        if getattr(request.user, "role", None) != office_role:
            return None
        matric_no = str(view.kwargs.get("matric_no", "")).lower()
        return self.cache_format % {"scope": self.scope, "ident": matric_no}


class BatchInvitationRateThrottle(SettingsRateThrottle):
    """Activation emails for a whole import, counted per import. Only office
    requests count, as for single access links."""

    scope = "registry_batch_invitations"
    setting_name = "REGISTRY_BATCH_INVITE_THROTTLE_RATE"

    def get_cache_key(self, request, view):
        office_role = get_user_model().Role.OFFICE_ADMIN
        if getattr(request.user, "role", None) != office_role:
            return None
        return self.cache_format % {"scope": self.scope, "ident": view.kwargs.get("batch_id")}


class SettingsPasswordRateThrottle(SimpleRateThrottle):
    scope = "auth_settings_password"
    rate = "5/hour"

    def get_cache_key(self, request, view):
        if not request.user.is_authenticated:
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}
