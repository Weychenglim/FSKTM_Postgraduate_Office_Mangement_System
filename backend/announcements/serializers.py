"""DRF serializer for creating / updating announcements.

Validates the text fields only. The file attachment is read from
``request.FILES`` in the view (multipart upload).
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

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("A headline title is required.")
        return value.strip()

    def to_model_kwargs(self):
        """Return validated data keyed by model field names."""
        return dict(self.validated_data)
