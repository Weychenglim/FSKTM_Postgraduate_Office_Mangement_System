from rest_framework import serializers
from django.utils import timezone

from .models import SemesterTimelineEntry


def derive_entry_status(deadline_start, deadline_end):
    today = timezone.localdate()
    if today < deadline_start:
        return SemesterTimelineEntry.Status.UPCOMING
    if today > deadline_end:
        return SemesterTimelineEntry.Status.COMPLETED
    if deadline_start == deadline_end:
        return SemesterTimelineEntry.Status.DEADLINE
    return SemesterTimelineEntry.Status.ACTIVE


class RejectUnknownFieldsMixin:
    def to_internal_value(self, data):
        unknown_fields = set(data) - set(self.fields)
        if unknown_fields:
            raise serializers.ValidationError({
                field: ["This field is system-derived and cannot be provided."]
                for field in sorted(unknown_fields)
            })
        return super().to_internal_value(data)


class TimelineEntrySerializer(serializers.ModelSerializer):
    action = serializers.CharField(source="action_owner")
    deadlineStart = serializers.DateField(source="deadline_start")
    deadlineEnd = serializers.DateField(source="deadline_end")
    weekLabel = serializers.CharField(source="week_label", allow_blank=True)
    targetRoles = serializers.JSONField(source="target_roles")
    displayOrder = serializers.IntegerField(source="display_order")
    status = serializers.SerializerMethodField()

    class Meta:
        model = SemesterTimelineEntry
        fields = [
            "id",
            "level",
            "step",
            "title",
            "detail",
            "action",
            "deadlineStart",
            "deadlineEnd",
            "weekLabel",
            "targetRoles",
            "status",
            "displayOrder",
        ]

    def get_status(self, obj):
        return derive_entry_status(obj.deadline_start, obj.deadline_end)


class TimelineEntryUpdateSerializer(RejectUnknownFieldsMixin, serializers.Serializer):
    level = serializers.ChoiceField(choices=SemesterTimelineEntry.Level.choices, required=False)
    title = serializers.CharField(required=False, allow_blank=False, trim_whitespace=True)
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


class TimelineEntryCreateSerializer(RejectUnknownFieldsMixin, serializers.Serializer):
    level = serializers.ChoiceField(choices=SemesterTimelineEntry.Level.choices)
    title = serializers.CharField(allow_blank=False, trim_whitespace=True)
    detail = serializers.CharField(allow_blank=False, trim_whitespace=True)
    action = serializers.CharField(allow_blank=False, trim_whitespace=True)
    deadlineStart = serializers.DateField()
    deadlineEnd = serializers.DateField()
    weekLabel = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    targetRoles = serializers.ListField(
        child=serializers.CharField(trim_whitespace=True),
        allow_empty=False,
    )

    def validate_targetRoles(self, value):
        normalized = [role.upper() for role in value]
        invalid = [role for role in normalized if role not in SemesterTimelineEntry.VALID_TARGET_ROLES]
        if invalid:
            raise serializers.ValidationError(f"Invalid target role(s): {', '.join(invalid)}")
        return normalized

    def validate(self, attrs):
        if attrs["deadlineEnd"] < attrs["deadlineStart"]:
            raise serializers.ValidationError("Deadline End cannot be before Deadline Start.")
        return attrs


class TimelineAuditLogSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    actorName = serializers.SerializerMethodField()
    action = serializers.CharField()
    summary = serializers.CharField()
    createdAt = serializers.DateTimeField(source="created_at")
    entryId = serializers.IntegerField(source="entry_id", allow_null=True)
    timelineId = serializers.IntegerField(source="timeline_id")

    def get_actorName(self, obj):
        return getattr(obj.actor, "full_name", "") or obj.actor.email


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
        "semesterId": timeline.academic_semester_id,
        "semesterCode": (
            timeline.academic_semester.code
            if timeline.academic_semester_id
            else None
        ),
        "sourceFilename": timeline.source_filename,
        "uploadedAt": timeline.uploaded_at,
        "levels": grouped,
    }
