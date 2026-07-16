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
