import hashlib
import secrets

from django.conf import settings
from django.core.cache import cache
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

# A reload that cuts off a refresh leaves the browser holding the refresh
# cookie the server has just replaced, which signed people out. For a short
# time after a rotation that browser, and only it, may renew with the replaced
# cookie: it must also send the session key cookie set when it signed in, which
# a copied refresh token alone does not carry.
SESSION_KEY_COOKIE = "fsktm_session_key"
ROTATION_GRACE_SECONDS = 30


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


class CookieRefreshToken(SessionRefreshToken):
    """The refresh cookie's token. Its blacklist check is made by
    RefreshCookieAuthentication, which also applies the rotation grace."""

    def check_blacklist(self):
        pass


class SessionTokenRefreshSerializer(TokenRefreshSerializer):
    """Rotates the refresh token without losing the "Remember me" choice."""

    token_class = CookieRefreshToken


def new_session_key():
    return secrets.token_urlsafe(32)


def _session_key_hash(request):
    key = request.COOKIES.get(SESSION_KEY_COOKIE)
    return hashlib.sha256(key.encode()).hexdigest() if key else None


def _rotated_key(token):
    return f"auth:rotated:{token[api_settings.JTI_CLAIM]}"


def is_blacklisted(token):
    return BlacklistedToken.objects.filter(token__jti=token[api_settings.JTI_CLAIM]).exists()


def note_rotation(request, replaced_token):
    """Let this browser renew with the replaced token for a short time."""
    key = _session_key_hash(request)
    if key:
        cache.set(_rotated_key(replaced_token), key, ROTATION_GRACE_SECONDS)


def rotation_grace_allows(request, token):
    """True when a blacklisted token was replaced moments ago in this browser's
    session, and that session has not been signed out."""
    key = _session_key_hash(request)
    return bool(key) and cache.get(_rotated_key(token)) == key and not cache.get(f"auth:ended:{key}")


def end_session(request):
    """Sign-out: the replaced tokens of this session may no longer renew it."""
    key = _session_key_hash(request)
    if key:
        lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
        cache.set(f"auth:ended:{key}", True, int(lifetime.total_seconds()))


def issue_refresh(user, remember):
    """A refresh token for a new sign-in, remembered on this device or not."""
    refresh = SessionRefreshToken.for_user(user)
    refresh[REMEMBER_CLAIM] = bool(remember)
    refresh.set_exp()
    OutstandingToken.objects.filter(jti=refresh[api_settings.JTI_CLAIM]).update(
        expires_at=datetime_from_epoch(refresh["exp"])
    )
    return refresh


def set_refresh_cookie(response, refresh_token, remember=True, session_key=None):
    """A remembered session keeps its cookie for the refresh lifetime;
    otherwise the browser drops the cookie when it closes. The session key
    cookie, when given, is kept the same way."""
    lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    cookies = [(settings.JWT_REFRESH_COOKIE_NAME, str(refresh_token))]
    if session_key:
        cookies.append((SESSION_KEY_COOKIE, session_key))
    for name, value in cookies:
        response.set_cookie(
            key=name,
            value=value,
            max_age=int(lifetime.total_seconds()) if remember else None,
            secure=settings.JWT_REFRESH_COOKIE_SECURE,
            httponly=True,
            samesite="Strict",
            path=settings.JWT_REFRESH_COOKIE_PATH,
        )
    return response


def delete_refresh_cookie(response):
    for name in (settings.JWT_REFRESH_COOKIE_NAME, SESSION_KEY_COOKIE):
        response.set_cookie(
            key=name,
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
