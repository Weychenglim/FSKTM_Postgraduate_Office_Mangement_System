from django.conf import settings
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


class PasswordResetRateThrottle(SettingsRateThrottle):
    scope = "auth_password_reset"
    setting_name = "AUTH_PASSWORD_RESET_THROTTLE_RATE"


class PasswordResetConfirmRateThrottle(SettingsRateThrottle):
    scope = "auth_password_reset_confirm"
    setting_name = "AUTH_PASSWORD_RESET_CONFIRM_THROTTLE_RATE"


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
