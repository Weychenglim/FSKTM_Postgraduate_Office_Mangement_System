from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.core.files.base import ContentFile
from rest_framework import serializers
from rest_framework.exceptions import APIException

from academics.services import current_effective_semester

from .ageing import panel_waiting_metadata, supervisor_waiting_metadata
from .models import (
    PANEL_WORKLOAD_LIMIT,
    PanelAppointment,
    PanelRecommendation,
    AppointmentWorkflowEvent,
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorApplicationDocument,
    SupervisorDocumentRequirement,
    count_panel_workload,
    count_supervisor_workload,
    panel_workload_limit,
    supervisor_workload_limit,
)


User = get_user_model()


class NoEffectiveSemester(APIException):
    status_code = 409
    default_detail = (
        "No active academic semester is currently accepting new workflows."
    )
    default_code = "academic_semester_unavailable"


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
        return panel_workload_limit(obj)

    def get_canSubmit(self, obj):
        return count_panel_workload(obj) < panel_workload_limit(obj)

    def get_availability(self, obj):
        return "Available" if count_panel_workload(obj) < panel_workload_limit(obj) else "Workload Full"

    def get_workloadHelpText(self, obj):
        return "Workload includes confirmed active panel appointments and submitted nominations."


class PanelRecommendationSerializer(serializers.ModelSerializer):
    studentId = serializers.CharField(source="profile.matric_no", read_only=True)
    studentName = serializers.CharField(source="profile.student_name", read_only=True)
    programme = serializers.CharField(source="profile.programme", read_only=True)
    semester = serializers.SerializerMethodField()
    semesterId = serializers.SerializerMethodField()
    semesterCode = serializers.SerializerMethodField()
    proposedTopic = serializers.CharField(source="profile.proposed_topic", read_only=True)
    researchArea = serializers.CharField(source="profile.research_area", read_only=True)
    abstract = serializers.CharField(source="profile.abstract", read_only=True)
    recommendedMember = serializers.CharField(source="recommended_member.full_name", read_only=True)
    recommendedMemberId = serializers.SerializerMethodField()
    supervisorName = serializers.CharField(source="supervisor.full_name", read_only=True)
    submittedDate = serializers.SerializerMethodField()
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    panelDecisionAt = serializers.DateTimeField(source="panel_decided_at", read_only=True)
    coordinatorDecisionAt = serializers.DateTimeField(source="coordinator_decided_at", read_only=True)
    cancelledAt = serializers.DateTimeField(source="cancelled_at", read_only=True)
    cancellationReason = serializers.CharField(source="cancellation_reason", read_only=True)
    rejectionReason = serializers.CharField(source="display_rejection_reason", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    selectedPanelDecision = serializers.SerializerMethodField()
    workflow = serializers.SerializerMethodField()
    waitingSince = serializers.SerializerMethodField()
    waitingDays = serializers.SerializerMethodField()
    waitingOn = serializers.SerializerMethodField()

    class Meta:
        model = PanelRecommendation
        fields = [
            "id",
            "studentId",
            "studentName",
            "programme",
            "semester",
            "semesterId",
            "semesterCode",
            "proposedTopic",
            "researchArea",
            "abstract",
            "recommendedMember",
            "recommendedMemberId",
            "supervisorName",
            "submittedDate",
            "submittedAt",
            "panelDecisionAt",
            "coordinatorDecisionAt",
            "cancelledAt",
            "status",
            "justification",
            "rejectionReason",
            "cancellationReason",
            "updatedAt",
            "selectedPanelDecision",
            "workflow",
            "waitingSince",
            "waitingDays",
            "waitingOn",
        ]

    def get_submittedDate(self, obj):
        return format_display_date(obj.submitted_at or obj.created_at)

    def get_semester(self, obj):
        return (
            obj.academic_semester.label
            if obj.academic_semester_id
            else "Legacy / Unassigned"
        )

    def get_semesterId(self, obj):
        return obj.academic_semester_id

    def get_semesterCode(self, obj):
        return obj.academic_semester.code if obj.academic_semester_id else None

    def get_recommendedMemberId(self, obj):
        return staff_no_for_user(obj.recommended_member)

    def get_selectedPanelDecision(self, obj):
        if obj.panel_decided_at is None:
            return None
        if obj.status == PanelRecommendation.Status.REJECTED_BY_PANEL:
            return "REJECTED"
        return "ACCEPTED"

    def get_workflow(self, obj):
        return AppointmentWorkflowEventSerializer(
            obj.workflow_events.all(),
            many=True,
        ).data

    def _waiting_metadata(self, obj):
        cache = getattr(self, "_waiting_metadata_cache", {})
        if obj.pk not in cache:
            cache[obj.pk] = panel_waiting_metadata(obj)
            self._waiting_metadata_cache = cache
        return cache[obj.pk]

    def get_waitingSince(self, obj):
        return self._waiting_metadata(obj)["waitingSince"]

    def get_waitingDays(self, obj):
        return self._waiting_metadata(obj)["waitingDays"]

    def get_waitingOn(self, obj):
        return self._waiting_metadata(obj)["waitingOn"]


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

        if count_panel_workload(recommended_member) >= panel_workload_limit(recommended_member):
            raise serializers.ValidationError(
                "Selected panel lecturer has reached the panel workload limit. Please choose another panel member."
            )

        academic_semester = current_effective_semester()
        if academic_semester is None:
            raise NoEffectiveSemester()
        attrs["profile"] = profile
        attrs["recommended_member"] = recommended_member
        attrs["academic_semester"] = academic_semester
        return attrs

    def create(self, validated_data):
        recommendation = PanelRecommendation(
            profile=validated_data["profile"],
            academic_semester=validated_data["academic_semester"],
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


class SupervisorApplicationDocumentSerializer(serializers.ModelSerializer):
    requirementCode = serializers.CharField(source="requirement_code", read_only=True)
    requirementLabel = serializers.SerializerMethodField()
    contentType = serializers.SerializerMethodField()
    checksum = serializers.CharField(source="checksum_sha256", read_only=True)
    availability = serializers.SerializerMethodField()
    uploadedAt = serializers.DateTimeField(source="uploaded_at", read_only=True)

    class Meta:
        model = SupervisorApplicationDocument
        fields = [
            "id",
            "requirementCode",
            "requirementLabel",
            "name",
            "contentType",
            "size",
            "checksum",
            "availability",
            "uploadedAt",
        ]

    def get_requirementLabel(self, obj):
        return obj.requirement_label or obj.category or "Supporting document"

    def get_contentType(self, obj):
        return obj.content_type if obj.file else None

    def get_availability(self, obj):
        return "AVAILABLE" if obj.file else "LEGACY_METADATA"


class SupervisorDocumentRequirementSerializer(serializers.ModelSerializer):
    isRequired = serializers.BooleanField(source="is_required")
    isActive = serializers.BooleanField(source="is_active")
    displayOrder = serializers.IntegerField(source="display_order")
    isUsed = serializers.SerializerMethodField()

    class Meta:
        model = SupervisorDocumentRequirement
        fields = [
            "id",
            "code",
            "label",
            "description",
            "isRequired",
            "isActive",
            "displayOrder",
            "isUsed",
        ]

    def get_isUsed(self, obj):
        return obj.application_documents.exists()


class SupervisorDocumentRequirementWriteSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    isRequired = serializers.BooleanField(required=False, default=True)
    isActive = serializers.BooleanField(required=False, default=True)
    displayOrder = serializers.IntegerField(required=False, min_value=0, default=0)

    def service_values(self):
        data = self.validated_data
        return {
            "label": data["label"],
            "description": data.get("description", ""),
            "is_required": data.get("isRequired", True),
            "is_active": data.get("isActive", True),
            "display_order": data.get("displayOrder", 0),
        }


class SupervisorDocumentRequirementUpdateSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    isRequired = serializers.BooleanField(required=False)
    isActive = serializers.BooleanField(required=False)
    displayOrder = serializers.IntegerField(required=False, min_value=0)
    reason = serializers.CharField(allow_blank=False, trim_whitespace=True)

    def validate(self, attrs):
        if not set(attrs) - {"reason"}:
            raise serializers.ValidationError("At least one requirement field must change.")
        return attrs

    def service_values(self):
        mapping = {
            "label": "label",
            "description": "description",
            "isRequired": "is_required",
            "isActive": "is_active",
            "displayOrder": "display_order",
        }
        return {
            target: self.validated_data[source]
            for source, target in mapping.items()
            if source in self.validated_data
        }


class AppointmentWorkflowEventSerializer(serializers.ModelSerializer):
    actorName = serializers.CharField(source="actor.full_name", read_only=True)
    actorRole = serializers.CharField(source="actor_role", read_only=True)
    previousStatus = serializers.CharField(source="previous_status", read_only=True)
    newStatus = serializers.CharField(source="new_status", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = AppointmentWorkflowEvent
        fields = [
            "id",
            "action",
            "actorName",
            "actorRole",
            "previousStatus",
            "newStatus",
            "reason",
            "createdAt",
        ]


class SupervisorApplicationSerializer(serializers.ModelSerializer):
    studentId = serializers.CharField(source="student.matric_no", read_only=True)
    studentName = serializers.CharField(source="student.user.full_name", read_only=True)
    programme = serializers.CharField(source="student.programme", read_only=True)
    semester = serializers.SerializerMethodField()
    semesterId = serializers.SerializerMethodField()
    semesterCode = serializers.SerializerMethodField()
    proposedSupervisor = serializers.CharField(
        source="proposed_supervisor.full_name",
        read_only=True,
    )
    proposedSupervisorId = serializers.SerializerMethodField()
    researchTitle = serializers.CharField(source="research_title", read_only=True)
    researchAbstract = serializers.CharField(source="research_abstract", read_only=True)
    rejectionReason = serializers.CharField(source="rejection_reason", read_only=True)
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    supervisorDecisionAt = serializers.DateTimeField(
        source="supervisor_decided_at",
        read_only=True,
    )
    coordinatorDecisionAt = serializers.DateTimeField(
        source="coordinator_decided_at",
        read_only=True,
    )
    cancelledAt = serializers.DateTimeField(source="cancelled_at", read_only=True)
    cancellationReason = serializers.CharField(
        source="cancellation_reason",
        read_only=True,
    )
    documents = SupervisorApplicationDocumentSerializer(many=True, read_only=True)
    workflow = AppointmentWorkflowEventSerializer(
        source="workflow_events",
        many=True,
        read_only=True,
    )
    waitingSince = serializers.SerializerMethodField()
    waitingDays = serializers.SerializerMethodField()
    waitingOn = serializers.SerializerMethodField()

    class Meta:
        model = SupervisorApplication
        fields = [
            "id",
            "studentId",
            "studentName",
            "programme",
            "semester",
            "semesterId",
            "semesterCode",
            "proposedSupervisor",
            "proposedSupervisorId",
            "researchTitle",
            "researchAbstract",
            "status",
            "rejectionReason",
            "submittedAt",
            "supervisorDecisionAt",
            "coordinatorDecisionAt",
            "cancelledAt",
            "cancellationReason",
            "documents",
            "workflow",
            "waitingSince",
            "waitingDays",
            "waitingOn",
        ]

    def get_proposedSupervisorId(self, obj):
        return staff_no_for_user(obj.proposed_supervisor)

    def get_semester(self, obj):
        return (
            obj.academic_semester.label
            if obj.academic_semester_id
            else "Legacy / Unassigned"
        )

    def get_semesterId(self, obj):
        return obj.academic_semester_id

    def get_semesterCode(self, obj):
        return obj.academic_semester.code if obj.academic_semester_id else None

    def _waiting_metadata(self, obj):
        cache = getattr(self, "_waiting_metadata_cache", {})
        if obj.pk not in cache:
            cache[obj.pk] = supervisor_waiting_metadata(obj)
            self._waiting_metadata_cache = cache
        return cache[obj.pk]

    def get_waitingSince(self, obj):
        return self._waiting_metadata(obj)["waitingSince"]

    def get_waitingDays(self, obj):
        return self._waiting_metadata(obj)["waitingDays"]

    def get_waitingOn(self, obj):
        return self._waiting_metadata(obj)["waitingOn"]


class SupervisorApplicationCreateSerializer(serializers.Serializer):
    proposedSupervisorId = serializers.CharField()
    researchTitle = serializers.CharField(max_length=500)
    researchAbstract = serializers.CharField()

    def validate(self, attrs):
        request = self.context["request"]
        if request.user.role != User.Role.STUDENT:
            raise serializers.ValidationError(
                "Only students can submit supervisor applications."
            )
        try:
            student = request.user.student
        except ObjectDoesNotExist as exc:
            raise serializers.ValidationError(
                "The student profile is not available."
            ) from exc
        if student.supervisor_applications.filter(
            status__in=SupervisorApplication.ACTIVE_STATUSES
        ).exists():
            raise serializers.ValidationError(
                "An active supervisor application already exists."
            )
        try:
            supervisor = User.objects.get(
                lecturer__staff_no__iexact=attrs["proposedSupervisorId"],
                lecturer__supervisor__isnull=False,
                role=User.Role.LECTURER,
                is_active=True,
            )
        except User.DoesNotExist as exc:
            raise serializers.ValidationError(
                "The selected supervisor was not found."
            ) from exc
        academic_semester = current_effective_semester()
        if academic_semester is None:
            raise NoEffectiveSemester()
        attrs["student"] = student
        attrs["supervisor"] = supervisor
        attrs["academic_semester"] = academic_semester
        return attrs

    def create(self, validated_data):
        documents = validated_data.pop("validated_documents", [])
        self.saved_file_names = []
        application = SupervisorApplication.objects.create(
            student=validated_data["student"],
            academic_semester=validated_data["academic_semester"],
            proposed_supervisor=validated_data["supervisor"],
            research_title=validated_data["researchTitle"],
            research_abstract=validated_data["researchAbstract"],
        )
        for document in documents:
            record = SupervisorApplicationDocument(
                application=application,
                requirement=document.requirement,
                name=document.original_name,
                category=document.requirement.code.upper().replace("-", "_"),
                content_type=document.content_type,
                size=document.size,
                requirement_code=document.requirement.code,
                requirement_label=document.requirement.label,
                checksum_sha256=document.checksum,
            )
            record.file.save(
                document.original_name,
                ContentFile(document.content),
                save=False,
            )
            self.saved_file_names.append(record.file.name)
            record.save()
        return application


class SupervisorCandidateSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    name = serializers.CharField(source="full_name")
    domain = serializers.SerializerMethodField()
    filled = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "domain", "filled", "total", "initials"]

    def get_id(self, obj):
        return staff_no_for_user(obj)

    def get_domain(self, obj):
        return obj.lecturer.specialization or obj.lecturer.department

    def get_filled(self, obj):
        return count_supervisor_workload(obj)

    def get_total(self, obj):
        return supervisor_workload_limit(obj)

    def get_initials(self, obj):
        return "".join(part[0] for part in obj.full_name.split()[:2]).upper()


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
    intake = serializers.SerializerMethodField()
    semesterId = serializers.SerializerMethodField()
    semesterCode = serializers.SerializerMethodField()
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
            "semesterId",
            "semesterCode",
            "abstract",
            "initials",
            "recommendationSubmittedAt",
            "panelDecisionAt",
            "coordinatorDecisionAt",
            "appointmentConfirmedAt",
        ]

    def get_appointmentDate(self, obj):
        return format_display_date(obj.appointment_date)

    def get_intake(self, obj):
        semester = obj.recommendation.academic_semester
        return semester.label if semester else "Legacy / Unassigned"

    def get_semesterId(self, obj):
        return obj.recommendation.academic_semester_id

    def get_semesterCode(self, obj):
        semester = obj.recommendation.academic_semester
        return semester.code if semester else None

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
    semesterId = serializers.IntegerField(allow_null=True)
    semesterCode = serializers.CharField(allow_null=True)
    researchTitle = serializers.CharField()
    supervisorName = serializers.CharField()
    panelMemberName = serializers.CharField(allow_null=True)
    panelMemberId = serializers.CharField(allow_null=True)
    panelMemberDepartment = serializers.CharField(allow_blank=True, allow_null=True)
    panelMemberEmail = serializers.EmailField(allow_null=True)
    appointmentDate = serializers.CharField(allow_blank=True, allow_null=True)
    waitingSince = serializers.DateTimeField(allow_null=True)
    waitingDays = serializers.IntegerField(allow_null=True)
    waitingOn = serializers.CharField(allow_null=True)


def student_panel_appointment_payload(profile):
    appointment = (
        PanelAppointment.objects.filter(
            profile=profile,
            status=PanelAppointment.Status.ACTIVE,
        )
        .select_related(
            "panel_member",
            "panel_member__lecturer",
            "supervisor",
            "recommendation",
            "recommendation__academic_semester",
        )
        .first()
    )
    base = {
        "status": "PENDING",
        "studentName": profile.student_name,
        "studentId": profile.matric_no,
        "programme": profile.programme,
        "semester": "Legacy / Unassigned",
        "semesterId": None,
        "semesterCode": None,
        "researchTitle": profile.proposed_topic,
        "supervisorName": profile.supervisor.full_name,
        "panelMemberName": None,
        "panelMemberId": None,
        "panelMemberDepartment": None,
        "panelMemberEmail": None,
        "appointmentDate": None,
        "waitingSince": None,
        "waitingDays": None,
        "waitingOn": None,
    }
    if not appointment:
        recommendation = (
            profile.panel_recommendations.filter(
                status__in=PanelRecommendation.WORKLOAD_RESERVED_STATUSES,
            )
            .prefetch_related("workflow_events")
            .select_related("academic_semester")
            .order_by("-updated_at", "-id")
            .first()
        )
        if recommendation:
            return {
                **base,
                "semester": (
                    recommendation.academic_semester.label
                    if recommendation.academic_semester_id
                    else "Legacy / Unassigned"
                ),
                "semesterId": recommendation.academic_semester_id,
                "semesterCode": (
                    recommendation.academic_semester.code
                    if recommendation.academic_semester_id
                    else None
                ),
                **panel_waiting_metadata(recommendation, public=True),
            }
        return base

    panel_member = appointment.panel_member
    return {
        **base,
        "status": "CONFIRMED",
        "semester": (
            appointment.recommendation.academic_semester.label
            if appointment.recommendation.academic_semester_id
            else "Legacy / Unassigned"
        ),
        "semesterId": appointment.recommendation.academic_semester_id,
        "semesterCode": (
            appointment.recommendation.academic_semester.code
            if appointment.recommendation.academic_semester_id
            else None
        ),
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
        "semesterId": None,
        "semesterCode": None,
        "researchTitle": "Not available yet",
        "supervisorName": "Not assigned yet",
        "panelMemberName": None,
        "panelMemberId": None,
        "panelMemberDepartment": None,
        "panelMemberEmail": None,
        "appointmentDate": None,
        "waitingSince": None,
        "waitingDays": None,
        "waitingOn": None,
    }
