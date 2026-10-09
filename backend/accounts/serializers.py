"""DRF serializers for the auth endpoints."""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    """Validates the shape of a login request. Credential checking happens in
    the view so it can return 401 (rather than 400) on a bad email/password."""

    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False, style={"input_type": "password"})


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class StrictSettingsSerializer(serializers.Serializer):
    """Do not silently discard unrecognized self-service settings."""

    def to_internal_value(self, data):
        if isinstance(data, dict):
            unknown = set(data) - set(self.fields)
            if unknown:
                raise serializers.ValidationError({key: "Unknown field." for key in unknown})
        return super().to_internal_value(data)


class StrictBooleanField(serializers.BooleanField):
    def to_internal_value(self, data):
        if type(data) is not bool:
            self.fail("invalid", input=data)
        return data


class SettingsPreferencesSerializer(StrictSettingsSerializer):
    announcementAlerts = StrictBooleanField()


class AccountSettingsSerializer(StrictSettingsSerializer):
    phone = serializers.CharField(max_length=32, allow_blank=True, required=False)
    preferences = SettingsPreferencesSerializer(required=False)

    def to_internal_value(self, data):
        if isinstance(data, dict) and "phone" in data and not isinstance(data["phone"], str):
            raise serializers.ValidationError({"phone": "Must be a string."})
        return super().to_internal_value(data)


class SettingsPasswordSerializer(StrictSettingsSerializer):
    currentPassword = serializers.CharField(write_only=True, trim_whitespace=False)
    newPassword = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_newPassword(self, value):
        try:
            validate_password(value, user=self.context["user"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class ContactDetailsSerializer(serializers.Serializer):
    """Self-service contact edits from the Settings module."""

    phone = serializers.CharField(
        max_length=32, allow_blank=True, required=False, trim_whitespace=True
    )


class ChangePasswordSerializer(serializers.Serializer):
    """Signed-in password change. Requires the current password."""

    current_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    new_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    def validate_current_password(self, value):
        user = self.context["user"]
        if not user.check_password(value):
            raise serializers.ValidationError("Your current password is incorrect.")
        return value

    def validate_new_password(self, value):
        try:
            validate_password(value, user=self.context["user"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, attrs):
        if attrs.get("current_password") == attrs.get("new_password"):
            raise serializers.ValidationError(
                {"new_password": "Choose a password different from your current one."}
            )
        return attrs


class NotificationPreferenceSerializer(serializers.Serializer):
    emailNotifications = serializers.BooleanField(required=False)
    announcementAlerts = serializers.BooleanField(required=False)
    deadlineReminders = serializers.BooleanField(required=False)
    weeklySummary = serializers.BooleanField(required=False)
