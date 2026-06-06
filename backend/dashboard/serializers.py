from rest_framework import serializers

from .models import SemesterTimelineEntry


class TimelineEntrySerializer(serializers.ModelSerializer):
    action = serializers.CharField(source="action_owner")
    deadlineStart = serializers.DateField(source="deadline_start")
    deadlineEnd = serializers.DateField(source="deadline_end")
    weekLabel = serializers.CharField(source="week_label", allow_blank=True)
    targetRoles = serializers.JSONField(source="target_roles")
    displayOrder = serializers.IntegerField(source="display_order")

    class Meta:
        model = SemesterTimelineEntry
        fields = [
            "id",
            "level",
            "step",
            "detail",
            "action",
            "deadlineStart",
            "deadlineEnd",
            "weekLabel",
            "targetRoles",
            "status",
            "displayOrder",
        ]


class TimelineEntryUpdateSerializer(serializers.Serializer):
    detail = serializers.CharField(required=False, allow_blank=False, trim_whitespace=True)
    action = serializers.CharField(required=False, allow_blank=False, trim_whitespace=True)
    deadlineStart = serializers.DateField(required=False)
    deadlineEnd = serializers.DateField(required=False)
    weekLabel = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    targetRoles = serializers.ListField(
        child=serializers.CharField(trim_whitespace=True),
        required=False,
        allow_empty=False,
    )
    status = serializers.ChoiceField(choices=SemesterTimelineEntry.Status.choices, required=False)

    def validate_targetRoles(self, value):
        normalized = [role.upper() for role in value]
        invalid = [role for role in normalized if role not in SemesterTimelineEntry.VALID_TARGET_ROLES]
        if invalid:
            raise serializers.ValidationError(f"Invalid target role(s): {', '.join(invalid)}")
        return normalized

    def validate(self, attrs):
        entry = self.context["entry"]
        start = attrs.get("deadlineStart", entry.deadline_start)
        end = attrs.get("deadlineEnd", entry.deadline_end)
        if end < start:
            raise serializers.ValidationError("Deadline End cannot be before Deadline Start.")
        return attrs


def active_timeline_payload(timeline):
    entries = list(timeline.entries.all())
    grouped = []
    for level in ["P1", "P2"]:
        level_entries = [entry for entry in entries if entry.level == level]
        if level_entries:
            grouped.append(
                {
                    "level": level,
                    "entries": TimelineEntrySerializer(level_entries, many=True).data,
                }
            )
    return {
        "available": True,
        "id": timeline.id,
        "semester": timeline.semester,
        "session": timeline.session,
        "sourceFilename": timeline.source_filename,
        "uploadedAt": timeline.uploaded_at,
        "levels": grouped,
    }

