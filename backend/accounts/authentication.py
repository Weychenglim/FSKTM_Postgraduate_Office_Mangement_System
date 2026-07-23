from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken


class RefreshCookieAuthentication(JWTAuthentication):
    """Authenticate refresh/logout requests from the scoped refresh cookie."""

    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not raw_token:
            raise AuthenticationFailed("A valid refresh session is required.")

        try:
            refresh = RefreshToken(raw_token)
            user = self.get_user(refresh)
        except TokenError as error:
            raise AuthenticationFailed("The refresh session is invalid or expired.") from error

        return user, refresh

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
