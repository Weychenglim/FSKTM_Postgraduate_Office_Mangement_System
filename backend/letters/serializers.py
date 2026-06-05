"""DRF serializer for creating / updating letter templates.

Accepts the frontend field names (``type``, ``referencePrefix``) and maps them
to the model fields. Output is produced by ``LetterTemplate.to_public_dict``
in the views, so this serializer only validates input.
"""
from rest_framework import serializers

from .models import LetterTemplate


class LetterTemplateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    type = serializers.CharField(max_length=128, required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=[LetterTemplate.Status.ACTIVE, LetterTemplate.Status.DRAFT],
        required=False,
    )
    description = serializers.CharField(max_length=500, required=False, allow_blank=True)
    content = serializers.CharField(required=False, allow_blank=True)
    referencePrefix = serializers.CharField(max_length=64, required=False, allow_blank=True)

    # Frontend name -> model field name.
    FIELD_MAP = {"type": "letter_type", "referencePrefix": "reference_prefix"}

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Template name is required.")
        return value.strip()

    def to_model_kwargs(self):
        """Return validated data keyed by model field names."""
        return {
            self.FIELD_MAP.get(key, key): value
            for key, value in self.validated_data.items()
        }
