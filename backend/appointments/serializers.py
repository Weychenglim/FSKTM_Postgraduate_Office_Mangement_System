from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from .models import (
    PANEL_WORKLOAD_LIMIT,
    PanelAppointment,
    PanelRecommendation,
    StudentResearchProfile,
    count_panel_workload,
)


User = get_user_model()


def related_or_none(obj, attr):
    try:
        return getattr(obj, attr)
    except ObjectDoesNotExist:
        return None


def staff_no_for_user(user):
    lecturer = related_or_none(user, "lecturer")
    if lecturer:
        return lecturer.staff_no
    office_staff = related_or_none(user, "office_staff")
    if office_staff:
        return office_staff.staff_no
    return ""


def department_for_user(user):
    lecturer = related_or_none(user, "lecturer")
    if lecturer:
        return lecturer.department
    office_staff = related_or_none(user, "office_staff")
    if office_staff:
        return office_staff.department
    student = related_or_none(user, "student")
    if student:
        return student.programme
    return ""


def student_no_for_user(user):
    student = related_or_none(user, "student")
    return student.matric_no if student else ""


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
    supervisorId = serializers.SerializerMethodField()
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

    def get_supervisorId(self, obj):
        return staff_no_for_user(obj.supervisor)


class PanelCandidateSerializer(serializers.ModelSerializer):
    staffId = serializers.SerializerMethodField()
    name = serializers.CharField(source="full_name")
    department = serializers.SerializerMethodField()
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

    def get_staffId(self, obj):
        return staff_no_for_user(obj)

    def get_department(self, obj):
        return department_for_user(obj)

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
    recommendedMemberId = serializers.SerializerMethodField()
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

    def get_recommendedMemberId(self, obj):
        return staff_no_for_user(obj.recommended_member)


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
                lecturer__staff_no__iexact=attrs["recommendedMemberId"],
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
    researchArea = serializers.CharField(source="profile.research_area")
    supervisor = serializers.CharField(source="supervisor.full_name")
    supervisorDepartment = serializers.SerializerMethodField()
    supervisorEmail = serializers.EmailField(source="supervisor.email")
    appointmentDate = serializers.SerializerMethodField()
    programme = serializers.CharField(source="profile.programme")
    intake = serializers.CharField(source="profile.semester")
    abstract = serializers.CharField(source="profile.abstract")
    initials = serializers.SerializerMethodField()
    recommendationSubmittedAt = serializers.DateTimeField(source="recommendation.submitted_at", read_only=True)
    panelDecisionAt = serializers.DateTimeField(source="recommendation.panel_decided_at", read_only=True)
    coordinatorDecisionAt = serializers.DateTimeField(source="recommendation.coordinator_decided_at", read_only=True)
    appointmentConfirmedAt = serializers.DateTimeField(source="recommendation.coordinator_decided_at", read_only=True)

    class Meta:
        model = PanelAppointment
        fields = [
            "studentId",
            "studentName",
            "researchTitle",
            "researchArea",
            "supervisor",
            "supervisorDepartment",
            "supervisorEmail",
            "appointmentDate",
            "status",
            "programme",
            "intake",
            "abstract",
            "initials",
            "recommendationSubmittedAt",
            "panelDecisionAt",
            "coordinatorDecisionAt",
            "appointmentConfirmedAt",
        ]

    def get_appointmentDate(self, obj):
        return format_display_date(obj.appointment_date)

    def get_initials(self, obj):
        return "".join(part[0] for part in obj.profile.student_name.split()[:2]).upper()

    def get_supervisorDepartment(self, obj):
        return department_for_user(obj.supervisor)


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
        .select_related("panel_member", "panel_member__lecturer", "supervisor")
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
        "panelMemberId": staff_no_for_user(panel_member),
        "panelMemberDepartment": department_for_user(panel_member),
        "panelMemberEmail": panel_member.email,
        "appointmentDate": format_display_date(appointment.appointment_date),
    }


def pending_student_panel_payload_from_user(user):
    return {
        "status": "PENDING",
        "studentName": user.full_name,
        "studentId": student_no_for_user(user),
        "programme": department_for_user(user),
        "semester": "Not available yet",
        "researchTitle": "Not available yet",
        "supervisorName": "Not assigned yet",
        "panelMemberName": None,
        "panelMemberId": None,
        "panelMemberDepartment": None,
        "panelMemberEmail": None,
        "appointmentDate": None,
    }
