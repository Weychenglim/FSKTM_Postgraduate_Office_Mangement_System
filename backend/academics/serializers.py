from rest_framework import serializers

from .models import AcademicSemester, AcademicSemesterAudit


class AcademicSemesterWriteSerializer(serializers.Serializer):
    academicSession = serializers.CharField(max_length=9)
    term = serializers.ChoiceField(choices=AcademicSemester.Term.choices)
    startsOn = serializers.DateField()
    endsOn = serializers.DateField()

    def service_values(self):
        data = self.validated_data
        return {
            "academic_session": data["academicSession"],
            "term": data["term"],
            "starts_on": data["startsOn"],
            "ends_on": data["endsOn"],
        }


class AcademicSemesterUpdateSerializer(serializers.Serializer):
    academicSession = serializers.CharField(max_length=9, required=False)
    term = serializers.ChoiceField(
        choices=AcademicSemester.Term.choices,
        required=False,
    )
    startsOn = serializers.DateField(required=False)
    endsOn = serializers.DateField(required=False)

    def service_values(self):
        names = {
            "academicSession": "academic_session",
            "term": "term",
            "startsOn": "starts_on",
            "endsOn": "ends_on",
        }
        return {
            names[key]: value for key, value in self.validated_data.items()
        }


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField()


class ExtendSerializer(ReasonSerializer):
    endsOn = serializers.DateField()


def semester_payload(semester, *, include_counts=False):
    payload = {
        "id": semester.pk,
        "code": semester.code,
        "academicSession": semester.academic_session,
        "term": semester.term,
        "label": semester.label,
        "startsOn": semester.starts_on.isoformat(),
        "endsOn": semester.ends_on.isoformat(),
        "lifecycleStatus": semester.lifecycle_status,
        "effectiveStatus": semester.effective_status,
        "isActive": semester.is_active,
        "activatedAt": semester.activated_at,
        "closedAt": semester.closed_at,
        "archivedAt": semester.archived_at,
    }
    if include_counts:
        timelines = getattr(semester, "timelines", None)
        periods = getattr(semester, "evaluation_periods", None)
        period_rows = list(periods.all()) if periods is not None else []
        payload.update(
            {
                "timelineCount": timelines.count() if timelines is not None else 0,
                "marksPeriodCount": len(period_rows),
                "marksTaskCount": sum(
                    period.tasks.count() for period in period_rows
                ),
            }
        )
    return payload


def audit_payload(audit):
    return {
        "id": audit.pk,
        "action": audit.action,
        "reason": audit.reason,
        "actor": audit.actor.full_name,
        "beforeValues": audit.before_values,
        "afterValues": audit.after_values,
        "createdAt": audit.created_at,
    }
