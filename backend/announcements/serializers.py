"""DRF serializer for creating / updating announcements.

Validates the text fields only. The file attachment is read from
``request.FILES`` in the view (multipart upload), and the camelCase date fields
are mapped back to the model's snake_case names.
"""
from rest_framework import serializers

from .models import Announcement


class AnnouncementSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    content = serializers.CharField(required=False, allow_blank=True)
    target = serializers.ChoiceField(
        choices=[choice.value for choice in Announcement.Audience],
        required=False,
    )
    priority = serializers.ChoiceField(
        choices=[choice.value for choice in Announcement.Priority],
        required=False,
    )
    status = serializers.ChoiceField(
        choices=[choice.value for choice in Announcement.Status],
        required=False,
    )
    startDate = serializers.DateField(required=False, allow_null=True)
    expiryDate = serializers.DateField(required=False, allow_null=True)

    # Frontend name -> model field name.
    FIELD_MAP = {"startDate": "start_date", "expiryDate": "expiry_date"}

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("A headline title is required.")
        return value.strip()

    def to_model_kwargs(self):
        """Return validated data keyed by model field names."""
        return {
            self.FIELD_MAP.get(key, key): value
            for key, value in self.validated_data.items()
        }
