from django.conf import settings
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import datetime_from_epoch

# Whether the person ticked "Remember me" when signing in. Sessions from
# before the choice existed have no claim and stay remembered, as they were.
REMEMBER_CLAIM = "remember"


def remembered(token):
    return token is None or token.get(REMEMBER_CLAIM, True) is not False


class SessionRefreshToken(RefreshToken):
    """A refresh token that keeps the "Remember me" choice. Without it the
    session ends JWT_SESSION_REFRESH_LIFETIME after its last use, so a
    browser that restores closed tabs cannot keep it open for days."""

    def set_exp(self, claim="exp", from_time=None, lifetime=None):
        if lifetime is None and claim == "exp" and not remembered(self):
            lifetime = settings.JWT_SESSION_REFRESH_LIFETIME
        super().set_exp(claim=claim, from_time=from_time, lifetime=lifetime)


class SessionTokenRefreshSerializer(TokenRefreshSerializer):
    """Rotates the refresh token without losing the "Remember me" choice."""

    token_class = SessionRefreshToken


def issue_refresh(user, remember):
    """A refresh token for a new sign-in, remembered on this device or not."""
    refresh = SessionRefreshToken.for_user(user)
    refresh[REMEMBER_CLAIM] = bool(remember)
    refresh.set_exp()
    OutstandingToken.objects.filter(jti=refresh[api_settings.JTI_CLAIM]).update(
        expires_at=datetime_from_epoch(refresh["exp"])
    )
    return refresh


def set_refresh_cookie(response, refresh_token, remember=True):
    """A remembered session keeps its cookie for the refresh lifetime;
    otherwise the browser drops the cookie when it closes."""
    lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=str(refresh_token),
        max_age=int(lifetime.total_seconds()) if remember else None,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        httponly=True,
        samesite="Strict",
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )
    return response


def delete_refresh_cookie(response):
    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value="",
        max_age=0,
        expires="Thu, 01 Jan 1970 00:00:00 GMT",
        path=settings.JWT_REFRESH_COOKIE_PATH,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        httponly=True,
        samesite="Strict",
    )
    return response


def blacklist_user_refresh_tokens(user):
    outstanding_tokens = OutstandingToken.objects.filter(user=user).exclude(
        blacklistedtoken__isnull=False
    )
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=token) for token in outstanding_tokens],
        ignore_conflicts=True,
    )
