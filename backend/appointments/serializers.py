from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    PANEL_WORKLOAD_LIMIT,
    PanelAppointment,
    PanelRecommendation,
    StudentResearchProfile,
    count_panel_workload,
)


User = get_user_model()


def format_display_date(value):
    if not value:
        return ""
    if hasattr(value, "date"):
        value = value.date()
    return value.strftime("%d %b %Y")


class StudentResearchProfileSerializer(serializers.ModelSerializer):
    studentId = serializers.CharField(source="matric_no")
    studentName = serializers.CharField(source="student_name")
    proposedTopic = serializers.CharField(source="proposed_topic")
    researchArea = serializers.CharField(source="research_area")
    supervisorName = serializers.CharField(source="supervisor.full_name")
    supervisorId = serializers.CharField(source="supervisor.staff_id")
    canRecommend = serializers.SerializerMethodField()

    class Meta:
        model = StudentResearchProfile
        fields = [
            "studentId",
            "studentName",
            "programme",
            "semester",
            "proposedTopic",
            "researchArea",
            "abstract",
            "supervisorName",
            "supervisorId",
            "canRecommend",
        ]

    def get_canRecommend(self, obj):
        return not obj.panel_recommendations.filter(
            status__in=PanelRecommendation.ACTIVE_STATUSES
        ).exists()


class PanelCandidateSerializer(serializers.ModelSerializer):
    staffId = serializers.CharField(source="staff_id")
    name = serializers.CharField(source="full_name")
    workloadCount = serializers.SerializerMethodField()
    workloadLimit = serializers.SerializerMethodField()
    canSubmit = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    workloadHelpText = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "staffId",
            "name",
            "department",
            "workloadCount",
            "workloadLimit",
            "canSubmit",
            "availability",
            "workloadHelpText",
        ]

    def get_workloadCount(self, obj):
        return count_panel_workload(obj)

    def get_workloadLimit(self, obj):
        return PANEL_WORKLOAD_LIMIT

    def get_canSubmit(self, obj):
        return count_panel_workload(obj) < PANEL_WORKLOAD_LIMIT

    def get_availability(self, obj):
        return "Available" if count_panel_workload(obj) < PANEL_WORKLOAD_LIMIT else "Workload Full"

    def get_workloadHelpText(self, obj):
        return "Workload includes confirmed active panel appointments and submitted nominations."


class PanelRecommendationSerializer(serializers.ModelSerializer):
    studentId = serializers.CharField(source="profile.matric_no", read_only=True)
    studentName = serializers.CharField(source="profile.student_name", read_only=True)
    programme = serializers.CharField(source="profile.programme", read_only=True)
    semester = serializers.CharField(source="profile.semester", read_only=True)
    proposedTopic = serializers.CharField(source="profile.proposed_topic", read_only=True)
    researchArea = serializers.CharField(source="profile.research_area", read_only=True)
    abstract = serializers.CharField(source="profile.abstract", read_only=True)
    recommendedMember = serializers.CharField(source="recommended_member.full_name", read_only=True)
    recommendedMemberId = serializers.CharField(source="recommended_member.staff_id", read_only=True)
    submittedDate = serializers.SerializerMethodField()
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    panelDecisionAt = serializers.DateTimeField(source="panel_decided_at", read_only=True)
    coordinatorDecisionAt = serializers.DateTimeField(source="coordinator_decided_at", read_only=True)
    rejectionReason = serializers.CharField(source="display_rejection_reason", read_only=True)

    class Meta:
        model = PanelRecommendation
        fields = [
            "id",
            "studentId",
            "studentName",
            "programme",
            "semester",
            "proposedTopic",
            "researchArea",
            "abstract",
            "recommendedMember",
            "recommendedMemberId",
            "submittedDate",
            "submittedAt",
            "panelDecisionAt",
            "coordinatorDecisionAt",
            "status",
            "justification",
            "rejectionReason",
        ]

    def get_submittedDate(self, obj):
        return format_display_date(obj.submitted_at or obj.created_at)


class PanelRecommendationCreateSerializer(serializers.Serializer):
    studentId = serializers.CharField()
    recommendedMemberId = serializers.CharField()
    justification = serializers.CharField(allow_blank=True, required=False)
    status = serializers.ChoiceField(
        choices=[
            PanelRecommendation.Status.SUBMITTED_TO_PANEL,
        ],
        default=PanelRecommendation.Status.SUBMITTED_TO_PANEL,
    )

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        if user.role != User.Role.LECTURER:
            raise serializers.ValidationError("Only lecturers can submit panel recommendations.")

        try:
            profile = StudentResearchProfile.objects.get(
                matric_no__iexact=attrs["studentId"],
                supervisor=user,
            )
        except StudentResearchProfile.DoesNotExist as exc:
            raise serializers.ValidationError("This student is not assigned to you as supervisor.") from exc

        try:
            recommended_member = User.objects.get(
                staff_id__iexact=attrs["recommendedMemberId"],
                role=User.Role.LECTURER,
                is_active=True,
            )
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("Selected panel lecturer was not found.") from exc

        if recommended_member.pk == user.pk:
            raise serializers.ValidationError("A supervisor cannot recommend themself as panel member.")

        if profile.panel_recommendations.filter(status__in=PanelRecommendation.ACTIVE_STATUSES).exists():
            raise serializers.ValidationError("An active panel recommendation already exists for this student.")

        if count_panel_workload(recommended_member) >= PANEL_WORKLOAD_LIMIT:
            raise serializers.ValidationError(
                "Selected panel lecturer has reached the panel workload limit. Please choose another panel member."
            )

        attrs["profile"] = profile
        attrs["recommended_member"] = recommended_member
        return attrs

    def create(self, validated_data):
        recommendation = PanelRecommendation(
            profile=validated_data["profile"],
            supervisor=self.context["request"].user,
            recommended_member=validated_data["recommended_member"],
            justification=validated_data.get("justification", ""),
            status=validated_data["status"],
        )
        recommendation.submit_if_needed()
        recommendation.save()
        return recommendation


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)


class PanelAssignmentSerializer(serializers.ModelSerializer):
    studentId = serializers.CharField(source="profile.matric_no")
    studentName = serializers.CharField(source="profile.student_name")
    researchTitle = serializers.CharField(source="profile.proposed_topic")
    supervisor = serializers.CharField(source="supervisor.full_name")
    appointmentDate = serializers.SerializerMethodField()
    programme = serializers.CharField(source="profile.programme")
    abstract = serializers.CharField(source="profile.abstract")
    initials = serializers.SerializerMethodField()

    class Meta:
        model = PanelAppointment
        fields = [
            "studentId",
            "studentName",
            "researchTitle",
            "supervisor",
            "appointmentDate",
            "status",
            "programme",
            "abstract",
            "initials",
        ]

    def get_appointmentDate(self, obj):
        return format_display_date(obj.appointment_date)

    def get_initials(self, obj):
        return "".join(part[0] for part in obj.profile.student_name.split()[:2]).upper()


class StudentPanelAppointmentSerializer(serializers.Serializer):
    status = serializers.CharField()
    studentName = serializers.CharField()
    studentId = serializers.CharField()
    programme = serializers.CharField()
    semester = serializers.CharField()
    researchTitle = serializers.CharField()
    supervisorName = serializers.CharField()
    panelMemberName = serializers.CharField(allow_null=True)
    panelMemberId = serializers.CharField(allow_null=True)
    panelMemberDepartment = serializers.CharField(allow_blank=True, allow_null=True)
    panelMemberEmail = serializers.EmailField(allow_null=True)
    appointmentDate = serializers.CharField(allow_blank=True, allow_null=True)


def student_panel_appointment_payload(profile):
    appointment = (
        PanelAppointment.objects.filter(
            profile=profile,
            status=PanelAppointment.Status.ACTIVE,
        )
        .select_related("panel_member", "supervisor")
        .first()
    )
    base = {
        "status": "PENDING",
        "studentName": profile.student_name,
        "studentId": profile.matric_no,
        "programme": profile.programme,
        "semester": profile.semester,
        "researchTitle": profile.proposed_topic,
        "supervisorName": profile.supervisor.full_name,
        "panelMemberName": None,
        "panelMemberId": None,
        "panelMemberDepartment": None,
        "panelMemberEmail": None,
        "appointmentDate": None,
    }
    if not appointment:
        return base

    panel_member = appointment.panel_member
    return {
        **base,
        "status": "CONFIRMED",
        "panelMemberName": panel_member.full_name,
        "panelMemberId": panel_member.staff_id,
        "panelMemberDepartment": panel_member.department,
        "panelMemberEmail": panel_member.email,
        "appointmentDate": format_display_date(appointment.appointment_date),
    }


def pending_student_panel_payload_from_user(user):
    return {
        "status": "PENDING",
        "studentName": user.full_name,
        "studentId": user.student_id or "",
        "programme": user.department or "",
        "semester": "Not available yet",
        "researchTitle": "Not available yet",
        "supervisorName": "Not assigned yet",
        "panelMemberName": None,
        "panelMemberId": None,
        "panelMemberDepartment": None,
        "panelMemberEmail": None,
        "appointmentDate": None,
    }
