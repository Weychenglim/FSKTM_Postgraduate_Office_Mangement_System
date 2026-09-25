from django.conf import settings
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)


def set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=str(refresh_token),
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
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
