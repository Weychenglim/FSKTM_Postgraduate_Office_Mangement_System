"""Signed links that let someone choose a password.

Reset links use Django's ``default_token_generator`` and expire after
``PASSWORD_RESET_TIMEOUT``. Activation links have no time limit, but they only
work while the account has never had a password. Both tokens are tied to the
stored password, so either kind stops working as soon as a password is set.
"""
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from django.utils.crypto import constant_time_compare
from django.utils.encoding import force_bytes
from django.utils.http import base36_to_int, urlsafe_base64_encode

ACTIVATION = "activation"
RESET = "reset"

ACTIVATION_PATH = "/activate-account"
RESET_PATH = "/reset-password"


class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    # A separate salt, so a 30-minute reset token never passes as an activation token.
    key_salt = "accounts.tokens.AccountActivationTokenGenerator"

    def check_token(self, user, token):
        if not (user and token) or user.has_usable_password():
            return False
        try:
            ts_b36, _ = token.split("-")
            timestamp = base36_to_int(ts_b36)
        except ValueError:
            return False
        return any(
            constant_time_compare(self._make_token_with_timestamp(user, timestamp, secret), token)
            for secret in [self.secret, *self.secret_fallbacks]
        )


activation_token_generator = AccountActivationTokenGenerator()


def password_link_kind(user, token):
    """``ACTIVATION``, ``RESET``, or None when the link can no longer be used."""
    if default_token_generator.check_token(user, token):
        return RESET
    if activation_token_generator.check_token(user, token):
        return ACTIVATION
    return None


def _link(path, user, generator):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = generator.make_token(user)
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}?uid={uid}&token={token}"


def activation_link(user):
    return _link(ACTIVATION_PATH, user, activation_token_generator)


def reset_link(user):
    return _link(RESET_PATH, user, default_token_generator)
