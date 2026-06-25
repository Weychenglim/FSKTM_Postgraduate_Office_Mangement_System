from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import EvaluationTask, MarkEntry, MarkScore


def initials(name):
    return "".join(part[0] for part in name.split()[:2]).upper()


def task_status(task):
    try:
        status = task.mark_entry.status
    except MarkEntry.DoesNotExist:
        status = MarkEntry.Status.NOT_STARTED
    return {
        MarkEntry.Status.NOT_STARTED: "NOT STARTED",
        MarkEntry.Status.DRAFT: "DRAFT SAVED",
        MarkEntry.Status.SUBMITTED: "SUBMITTED",
    }[status]


class EvaluationTaskSerializer(serializers.ModelSerializer):
    studentId = serializers.CharField(source="profile.matric_no")
    studentName = serializers.CharField(source="profile.student_name")
    initials = serializers.SerializerMethodField()
    researchTitle = serializers.CharField(source="profile.proposed_topic")
    semester = serializers.CharField(source="profile.semester")
    deadline = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    evaluatorRole = serializers.CharField(source="evaluator_role")
    evaluatorRoleLabel = serializers.CharField(source="get_evaluator_role_display")
    totalMark = serializers.SerializerMethodField()
    submittedDate = serializers.SerializerMethodField()
    components = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationTask
        fields = [
            "id",
            "studentId",
            "studentName",
            "initials",
            "researchTitle",
            "semester",
            "deadline",
            "status",
            "evaluatorRole",
            "evaluatorRoleLabel",
            "totalMark",
            "submittedDate",
            "components",
            "comments",
        ]

    def get_initials(self, obj):
        return initials(obj.profile.student_name)

    def get_deadline(self, obj):
        closes_at = obj.period.closes_at
        return closes_at.strftime("%d %b %Y") if closes_at else "-"

    def get_status(self, obj):
        return task_status(obj)

    def get_totalMark(self, obj):
        try:
            return f"{obj.mark_entry.total_mark:.2f}"
        except MarkEntry.DoesNotExist:
            return None

    def get_submittedDate(self, obj):
        try:
            submitted_at = obj.mark_entry.submitted_at
        except MarkEntry.DoesNotExist:
            return None
        return submitted_at.strftime("%d %b %Y") if submitted_at else None

    def get_comments(self, obj):
        try:
            return obj.mark_entry.comments
        except MarkEntry.DoesNotExist:
            return ""

    def get_components(self, obj):
        try:
            score_map = {
                score.component_id: score
                for score in obj.mark_entry.scores.all()
            }
        except MarkEntry.DoesNotExist:
            score_map = {}
        return [
            {
                "id": component.pk,
                "code": component.code,
                "name": component.name,
                "description": component.description,
                "maxMarks": f"{component.max_marks:.2f}",
                "required": component.is_required,
                "marksAwarded": (
                    f"{score_map[component.pk].marks_awarded:.2f}"
                    if component.pk in score_map
                    else None
                ),
                "feedback": (
                    score_map[component.pk].feedback
                    if component.pk in score_map
                    else ""
                ),
            }
            for component in obj.period.rubric.components.filter(is_active=True)
        ]


class ScoreInputSerializer(serializers.Serializer):
    componentId = serializers.IntegerField()
    marksAwarded = serializers.DecimalField(max_digits=7, decimal_places=2)
    feedback = serializers.CharField(required=False, allow_blank=True)


class MarkDraftSerializer(serializers.Serializer):
    scores = ScoreInputSerializer(many=True)
    comments = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        task = self.context["task"]
        components = {
            component.pk: component
            for component in task.period.rubric.components.filter(is_active=True)
        }
        submitted_ids = [score["componentId"] for score in attrs["scores"]]
        if len(submitted_ids) != len(set(submitted_ids)):
            raise serializers.ValidationError("Each rubric component may appear only once.")
        invalid = set(submitted_ids) - set(components)
        if invalid:
            raise serializers.ValidationError("One or more rubric components are invalid.")
        for score in attrs["scores"]:
            component = components[score["componentId"]]
            if score["marksAwarded"] > component.max_marks:
                raise serializers.ValidationError(
                    f"{component.name} cannot exceed {component.max_marks} marks."
                )
        attrs["components"] = components
        return attrs

    @transaction.atomic
    def save(self):
        task = self.context["task"]
        entry, _ = MarkEntry.objects.select_for_update().get_or_create(task=task)
        if entry.status == MarkEntry.Status.SUBMITTED:
            raise serializers.ValidationError("Submitted marks are locked.")
        entry.status = MarkEntry.Status.DRAFT
        entry.comments = self.validated_data.get("comments", "")
        entry.save(update_fields=["status", "comments", "updated_at"])
        for score_data in self.validated_data["scores"]:
            score, _ = MarkScore.objects.get_or_create(
                entry=entry,
                component=self.validated_data["components"][
                    score_data["componentId"]
                ],
                defaults={
                    "marks_awarded": score_data["marksAwarded"],
                    "feedback": score_data.get("feedback", ""),
                },
            )
            score.marks_awarded = score_data["marksAwarded"]
            score.feedback = score_data.get("feedback", "")
            try:
                score.full_clean()
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.message_dict) from exc
            score.save()
        entry.recalculate_total()
        return entry


def submit_entry(task):
    try:
        entry = task.mark_entry
    except MarkEntry.DoesNotExist as exc:
        raise serializers.ValidationError(
            "Save a complete draft before submission."
        ) from exc
    if entry.status == MarkEntry.Status.SUBMITTED:
        raise serializers.ValidationError("Marks have already been submitted.")
    required_ids = set(
        task.period.rubric.components.filter(
            is_active=True,
            is_required=True,
        ).values_list("id", flat=True)
    )
    entered_ids = set(entry.scores.values_list("component_id", flat=True))
    if not required_ids.issubset(entered_ids):
        raise serializers.ValidationError(
            "All required rubric components must be entered before submission."
        )
    entry.status = MarkEntry.Status.SUBMITTED
    entry.submitted_at = timezone.now()
    entry.save(update_fields=["status", "submitted_at", "updated_at"])
    return entry
