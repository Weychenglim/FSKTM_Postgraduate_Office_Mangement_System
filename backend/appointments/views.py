from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from announcements.models import Notification

from .ageing import panel_waiting_metadata, supervisor_waiting_metadata
from .models import (
    AppointmentWorkflowEvent,
    PanelAppointment,
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorAppointment,
    count_supervisor_workload,
    panel_workload_limit,
    supervisor_workload_limit,
)
from .notifications import publish_workflow_notification
from .serializers import (
    PanelAssignmentSerializer,
    PanelCandidateSerializer,
    PanelRecommendationCreateSerializer,
    PanelRecommendationSerializer,
    ReasonSerializer,
    AppointmentWorkflowEventSerializer,
    SupervisorApplicationCreateSerializer,
    SupervisorApplicationSerializer,
    SupervisorCandidateSerializer,
    StudentPanelAppointmentSerializer,
    StudentResearchProfileSerializer,
    department_for_user,
    format_display_date,
    pending_student_panel_payload_from_user,
    staff_no_for_user,
    student_panel_appointment_payload,
)


User = get_user_model()


def workflow_semester_payload(record):
    semester = getattr(record, "academic_semester", None)
    return {
        "semester": semester.label if semester else "Legacy / Unassigned",
        "semesterId": semester.pk if semester else None,
        "semesterCode": semester.code if semester else None,
    }


def panel_record_from_appointment(appointment):
    panel_member = appointment.panel_member
    recommendation = appointment.recommendation
    return {
        "recordId": f"appointment-{appointment.pk}",
        "recommendationId": recommendation.pk,
        "id": appointment.profile.matric_no,
        "studentName": appointment.profile.student_name,
        "programme": appointment.profile.programme,
        **workflow_semester_payload(recommendation),
        "researchTitle": appointment.profile.proposed_topic,
        "researchArea": appointment.profile.research_area,
        "abstract": appointment.profile.abstract,
        "supervisor": appointment.supervisor.full_name,
        "panelMember": panel_member.full_name,
        "panelMemberId": staff_no_for_user(panel_member),
        "panelMemberDepartment": department_for_user(panel_member),
        "panelMemberEmail": panel_member.email,
        "appointmentDate": format_display_date(appointment.appointment_date),
        "recommendationSubmittedAt": recommendation.submitted_at,
        "panelDecisionAt": recommendation.panel_decided_at,
        "coordinatorDecisionAt": recommendation.coordinator_decided_at,
        "appointmentConfirmedAt": recommendation.coordinator_decided_at or appointment.created_at,
        "rejectionStage": None,
        "rejectionReason": "",
        "workflow": AppointmentWorkflowEventSerializer(
            appointment.recommendation.workflow_events.all(),
            many=True,
        ).data,
        "status": "Approved",
        "updatedDate": appointment.updated_at.strftime("%d %b %Y"),
        **panel_waiting_metadata(recommendation),
    }


def panel_record_from_recommendation(recommendation):
    if recommendation.status == PanelRecommendation.Status.SUBMITTED_TO_PANEL:
        display_status = "Recommendation"
    elif recommendation.status == PanelRecommendation.Status.PENDING_COORDINATOR:
        display_status = "Pending"
    elif recommendation.status in [
        PanelRecommendation.Status.REJECTED_BY_PANEL,
        PanelRecommendation.Status.REJECTED_BY_COORDINATOR,
    ]:
        display_status = "Rejected"
    elif recommendation.status == PanelRecommendation.Status.CANCELLED_BY_SUPERVISOR:
        display_status = "Cancelled"
    else:
        display_status = "Approved"

    rejection_stage = None
    if recommendation.status == PanelRecommendation.Status.REJECTED_BY_PANEL:
        rejection_stage = "Selected Panel"
    elif recommendation.status == PanelRecommendation.Status.REJECTED_BY_COORDINATOR:
        rejection_stage = "Programme Coordinator"

    return {
        "recordId": f"recommendation-{recommendation.pk}",
        "recommendationId": recommendation.pk,
        "id": recommendation.profile.matric_no,
        "studentName": recommendation.profile.student_name,
        "programme": recommendation.profile.programme,
        **workflow_semester_payload(recommendation),
        "researchTitle": recommendation.profile.proposed_topic,
        "researchArea": recommendation.profile.research_area,
        "abstract": recommendation.profile.abstract,
        "supervisor": recommendation.supervisor.full_name,
        "panelMember": recommendation.recommended_member.full_name,
        "panelMemberId": staff_no_for_user(recommendation.recommended_member),
        "panelMemberDepartment": department_for_user(recommendation.recommended_member),
        "panelMemberEmail": recommendation.recommended_member.email,
        "appointmentDate": "",
        "recommendationSubmittedAt": recommendation.submitted_at,
        "panelDecisionAt": recommendation.panel_decided_at,
        "coordinatorDecisionAt": recommendation.coordinator_decided_at,
        "cancelledAt": recommendation.cancelled_at,
        "appointmentConfirmedAt": None,
        "rejectionStage": rejection_stage,
        "rejectionReason": recommendation.display_rejection_reason,
        "cancellationReason": recommendation.cancellation_reason,
        "workflow": AppointmentWorkflowEventSerializer(
            recommendation.workflow_events.all(),
            many=True,
        ).data,
        "status": display_status,
        "updatedDate": recommendation.updated_at.strftime("%d %b %Y"),
        **panel_waiting_metadata(recommendation),
    }


def panel_record_from_profile(profile):
    return {
        "recordId": f"profile-{profile.pk}",
        "recommendationId": None,
        "id": profile.matric_no,
        "studentName": profile.student_name,
        "programme": profile.programme,
        "semester": "Legacy / Unassigned",
        "semesterId": None,
        "semesterCode": None,
        "researchTitle": profile.proposed_topic,
        "researchArea": profile.research_area,
        "abstract": profile.abstract,
        "supervisor": profile.supervisor.full_name,
        "panelMember": "Not Assigned",
        "panelMemberId": "",
        "panelMemberDepartment": "",
        "panelMemberEmail": "",
        "appointmentDate": "",
        "recommendationSubmittedAt": None,
        "panelDecisionAt": None,
        "coordinatorDecisionAt": None,
        "appointmentConfirmedAt": None,
        "rejectionStage": None,
        "rejectionReason": "",
        "workflow": [],
        "status": "No Panel",
        "updatedDate": profile.updated_at.strftime("%d %b %Y"),
        "waitingSince": None,
        "waitingDays": None,
        "waitingOn": None,
    }


def initials_for_name(name):
    return "".join(part[0] for part in name.split()[:2]).upper()


def panel_workload_availability(count, limit):
    if count >= limit:
        return "Full Load"
    if count >= max(limit - 1, 1):
        return "Near Limit"
    return "Available"


def supervisor_workload_row(lecturer):
    active_appointments = list(
        SupervisorAppointment.objects.filter(
            supervisor=lecturer,
            status=SupervisorAppointment.Status.ACTIVE,
        ).select_related(
            "student",
            "student__user",
            "application",
        )
    )
    workload_count = len(active_appointments)
    workload_limit = supervisor_workload_limit(lecturer)
    return {
        "lecturerId": staff_no_for_user(lecturer),
        "lecturerName": lecturer.full_name,
        "department": department_for_user(lecturer),
        "currentStudents": workload_count,
        "workloadLimit": workload_limit,
        "availability": panel_workload_availability(
            workload_count,
            workload_limit,
        ),
        "email": lecturer.email,
        "supervisees": [
            {
                "id": appointment.student.matric_no,
                "name": appointment.student.user.full_name,
                "programme": appointment.student.programme,
                "status": "Approved",
                "topic": appointment.application.research_title,
                "appointmentDate": format_display_date(
                    appointment.appointment_date
                ),
            }
            for appointment in active_appointments
        ],
    }


def panel_workload_row(lecturer):
    confirmed_appointments = list(
        PanelAppointment.objects.filter(
            panel_member=lecturer,
            status=PanelAppointment.Status.ACTIVE,
        ).select_related("profile")
    )
    pending_nominations = list(
        PanelRecommendation.objects.filter(
            recommended_member=lecturer,
            status__in=PanelRecommendation.WORKLOAD_RESERVED_STATUSES,
        ).select_related("profile")
    )
    workload_count = len(confirmed_appointments) + len(pending_nominations)
    workload_limit = panel_workload_limit(lecturer)
    workload_items = [
        {
            "type": "Confirmed Appointment",
            "studentName": appointment.profile.student_name,
            "studentId": appointment.profile.matric_no,
            "researchTitle": appointment.profile.proposed_topic,
            "date": format_display_date(appointment.appointment_date),
        }
        for appointment in confirmed_appointments
    ] + [
        {
            "type": "Pending Nomination",
            "studentName": recommendation.profile.student_name,
            "studentId": recommendation.profile.matric_no,
            "researchTitle": recommendation.profile.proposed_topic,
            "date": format_display_date(recommendation.submitted_at or recommendation.updated_at),
        }
        for recommendation in pending_nominations
    ]
    return {
        "id": staff_no_for_user(lecturer),
        "name": lecturer.full_name,
        "department": department_for_user(lecturer),
        "currentStudents": workload_count,
        "workloadLimit": workload_limit,
        "availability": panel_workload_availability(workload_count, workload_limit),
        "initials": initials_for_name(lecturer.full_name),
        "confirmedAppointments": len(confirmed_appointments),
        "pendingNominations": len(pending_nominations),
        "workloadItems": workload_items,
    }


def error_response(message, response_status=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message}, status=response_status)


def record_workflow_event(
    *,
    actor,
    action,
    previous_status,
    new_status,
    reason="",
    panel_recommendation=None,
    supervisor_application=None,
):
    return AppointmentWorkflowEvent.objects.create(
        actor=actor,
        actor_role=actor.role,
        action=action,
        previous_status=previous_status,
        new_status=new_status,
        reason=reason,
        panel_recommendation=panel_recommendation,
        supervisor_application=supervisor_application,
    )


def programme_coordinators(programme):
    return User.objects.filter(
        role=User.Role.COORDINATOR,
        is_active=True,
        lecturer__coordinator__programme_managed=programme,
    )


def notify_workflow(
    *,
    recipients,
    actor,
    event_key,
    title,
    summary,
    message,
    module_label,
    target_module,
    record_type,
    record_id,
    priority=Notification.Priority.NORMAL,
):
    for recipient in recipients:
        publish_workflow_notification(
            recipient=recipient,
            actor=actor,
            event_key=event_key,
            title=title,
            summary=summary,
            message=message,
            module_label=module_label,
            target_module=target_module,
            record_type=record_type,
            record_id=record_id,
            priority=priority,
        )


def get_recommendation_or_404(pk):
    try:
        return PanelRecommendation.objects.select_related(
            "profile", "supervisor", "recommended_member"
        ).get(pk=pk)
    except PanelRecommendation.DoesNotExist:
        return None


def can_view_panel_recommendation(user, recommendation):
    if user.role == User.Role.OFFICE_ADMIN:
        return True
    if user.pk in [
        recommendation.supervisor_id,
        recommendation.recommended_member_id,
    ]:
        return True
    return (
        user.role == User.Role.COORDINATOR
        and coordinator_can_access_recommendation(user, recommendation)
    )


def coordinator_programme(user):
    if user.role != User.Role.COORDINATOR:
        return None
    try:
        return user.lecturer.coordinator.programme_managed.strip()
    except (AttributeError, User.lecturer.RelatedObjectDoesNotExist):
        return ""


def coordinator_can_access_recommendation(user, recommendation):
    programme = coordinator_programme(user)
    return bool(programme) and recommendation.profile.programme == programme


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def panel_records_view(request):
    if request.user.role != User.Role.OFFICE_ADMIN:
        return error_response(
            "Only Office Staff/Admin can view panel records.",
            status.HTTP_403_FORBIDDEN,
        )

    appointments = list(PanelAppointment.objects.select_related(
        "profile", "supervisor", "panel_member", "recommendation"
    ).prefetch_related("recommendation__workflow_events__actor"))
    appointment_recommendation_ids = {
        appointment.recommendation_id for appointment in appointments
    }
    recommendations = list(PanelRecommendation.objects.select_related(
        "profile", "supervisor", "recommended_member"
    ).prefetch_related("workflow_events__actor").exclude(pk__in=appointment_recommendation_ids))

    workflow_records = [
        (appointment.updated_at, panel_record_from_appointment(appointment))
        for appointment in appointments
    ] + [
        (recommendation.updated_at, panel_record_from_recommendation(recommendation))
        for recommendation in recommendations
    ]
    workflow_records.sort(key=lambda item: item[0], reverse=True)

    profiles_with_workflow = {
        appointment.profile_id for appointment in appointments
    } | {
        recommendation.profile_id for recommendation in recommendations
    }
    no_panel_profiles = StudentResearchProfile.objects.select_related("supervisor").exclude(
        pk__in=profiles_with_workflow
    ).order_by("student_name")
    records = [record for _, record in workflow_records]
    records.extend(panel_record_from_profile(profile) for profile in no_panel_profiles)

    return Response(records)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def panel_workload_view(request):
    if request.user.role != User.Role.OFFICE_ADMIN:
        return error_response("Only Office Staff/Admin can view panel workload monitoring.", status.HTTP_403_FORBIDDEN)

    lecturers = User.objects.filter(role=User.Role.LECTURER, is_active=True).select_related("lecturer")
    return Response([panel_workload_row(lecturer) for lecturer in lecturers])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supervisor_workload_view(request):
    if request.user.role != User.Role.OFFICE_ADMIN:
        return error_response(
            "Only Office Staff/Admin can view supervisor workload monitoring.",
            status.HTTP_403_FORBIDDEN,
        )
    lecturers = (
        User.objects.filter(
            role=User.Role.LECTURER,
            is_active=True,
            lecturer__supervisor__isnull=False,
        )
        .select_related("lecturer", "lecturer__supervisor")
        .order_by("full_name")
    )
    return Response(
        [supervisor_workload_row(lecturer) for lecturer in lecturers]
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def own_supervisor_workload_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response(
            "Only lecturers can view their supervisor workload.",
            status.HTTP_403_FORBIDDEN,
        )
    current_students = count_supervisor_workload(request.user)
    workload_limit = supervisor_workload_limit(request.user)
    return Response(
        {
            "currentStudents": current_students,
            "workloadLimit": workload_limit,
            "availableSlots": max(workload_limit - current_students, 0),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def eligible_supervisees_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response("Only lecturers can view eligible supervisees.", status.HTTP_403_FORBIDDEN)
    profiles = StudentResearchProfile.objects.filter(supervisor=request.user).select_related(
        "supervisor", "supervisor__lecturer"
    )
    return Response(StudentResearchProfileSerializer(profiles, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def panel_candidates_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response("Only lecturers can view panel candidates.", status.HTTP_403_FORBIDDEN)
    lecturers = User.objects.filter(role=User.Role.LECTURER, is_active=True).select_related(
        "lecturer"
    ).exclude(pk=request.user.pk)
    return Response(PanelCandidateSerializer(lecturers, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_panel_appointment_view(request):
    if request.user.role != User.Role.STUDENT:
        return error_response("Only students can view their panel appointment.", status.HTTP_403_FORBIDDEN)

    try:
        profile = StudentResearchProfile.objects.select_related("supervisor").get(student=request.user)
    except StudentResearchProfile.DoesNotExist:
        serializer = StudentPanelAppointmentSerializer(pending_student_panel_payload_from_user(request.user))
        return Response(serializer.data)

    serializer = StudentPanelAppointmentSerializer(student_panel_appointment_payload(profile))
    return Response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def recommendations_view(request):
    if request.method == "GET":
        if request.user.role != User.Role.LECTURER:
            return error_response("Only lecturers can view submitted panel recommendations.", status.HTTP_403_FORBIDDEN)
        recommendations = PanelRecommendation.objects.filter(supervisor=request.user).select_related(
            "profile", "recommended_member", "recommended_member__lecturer"
        )
        return Response(PanelRecommendationSerializer(recommendations, many=True).data)

    serializer = PanelRecommendationCreateSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        recommendation = serializer.save()
        record_workflow_event(
            actor=request.user,
            action="SUBMIT",
            previous_status="",
            new_status=recommendation.status,
            panel_recommendation=recommendation,
        )
        notify_workflow(
            recipients=[recommendation.recommended_member],
            actor=request.user,
            event_key=f"panel:{recommendation.pk}:submit",
            title="Panel recommendation requires your review",
            summary=f"{recommendation.profile.student_name} was recommended for your panel review.",
            message="Open Panel Appointments to accept or reject this recommendation.",
            module_label="Panel Appointment",
            target_module="PANEL_APPOINTMENTS",
            record_type="PANEL_RECOMMENDATION",
            record_id=recommendation.pk,
            priority=Notification.Priority.MEDIUM,
        )
    return Response(PanelRecommendationSerializer(recommendation).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def panel_recommendation_detail_view(request, pk):
    recommendation = get_recommendation_or_404(pk)
    if recommendation is None:
        return error_response(
            "Panel recommendation was not found.",
            status.HTTP_404_NOT_FOUND,
        )
    if not can_view_panel_recommendation(request.user, recommendation):
        return error_response(
            "You do not have permission to view this recommendation.",
            status.HTTP_403_FORBIDDEN,
        )
    return Response(PanelRecommendationSerializer(recommendation).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def review_queue_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response("Only lecturers can view selected-panel review queues.", status.HTTP_403_FORBIDDEN)
    recommendations = PanelRecommendation.objects.filter(
        recommended_member=request.user,
        status=PanelRecommendation.Status.SUBMITTED_TO_PANEL,
    ).select_related("profile", "recommended_member", "recommended_member__lecturer")
    return Response(PanelRecommendationSerializer(recommendations, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def coordinator_queue_view(request):
    if request.user.role != User.Role.COORDINATOR:
        return error_response("Only Programme Coordinators can view coordinator review queues.", status.HTTP_403_FORBIDDEN)
    programme = coordinator_programme(request.user)
    if not programme:
        return Response([])
    recommendations = PanelRecommendation.objects.filter(
        status=PanelRecommendation.Status.PENDING_COORDINATOR,
        profile__programme=programme,
    ).select_related(
        "profile", "supervisor", "recommended_member", "recommended_member__lecturer"
    )
    return Response(PanelRecommendationSerializer(recommendations, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def coordinator_workspace_view(request):
    if request.user.role != User.Role.COORDINATOR:
        return error_response(
            "Only Programme Coordinators can view the coordinator panel workspace.",
            status.HTTP_403_FORBIDDEN,
        )

    programme = coordinator_programme(request.user)
    if not programme:
        return Response(
            {
                "programme": "",
                "pendingCount": 0,
                "queue": [],
                "records": [],
                "message": "No programme assigned",
            }
        )

    recommendations = PanelRecommendation.objects.filter(
        profile__programme=programme
    ).select_related(
        "profile", "supervisor", "recommended_member", "recommended_member__lecturer"
    ).order_by("-updated_at", "-created_at")
    queue = [
        recommendation
        for recommendation in recommendations
        if recommendation.status == PanelRecommendation.Status.PENDING_COORDINATOR
    ]
    return Response(
        {
            "programme": programme,
            "pendingCount": len(queue),
            "queue": PanelRecommendationSerializer(queue, many=True).data,
            "records": PanelRecommendationSerializer(recommendations, many=True).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def review_history_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response(
            "Only lecturers can view selected-panel review history.",
            status.HTTP_403_FORBIDDEN,
        )
    recommendations = PanelRecommendation.objects.filter(
        recommended_member=request.user,
    ).filter(
        Q(panel_decided_at__isnull=False)
        | Q(status=PanelRecommendation.Status.CANCELLED_BY_SUPERVISOR)
    ).select_related(
        "profile", "supervisor", "recommended_member", "recommended_member__lecturer"
    ).order_by("-updated_at")
    return Response(PanelRecommendationSerializer(recommendations, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_panel_recommendation_view(request, pk):
    with transaction.atomic():
        try:
            recommendation = PanelRecommendation.objects.select_for_update().select_related(
                "profile", "supervisor", "recommended_member"
            ).get(pk=pk)
        except PanelRecommendation.DoesNotExist:
            return error_response(
                "Panel recommendation was not found.",
                status.HTTP_404_NOT_FOUND,
            )
        if request.user.pk != recommendation.supervisor_id:
            return error_response(
                "Only the submitting supervisor can cancel this recommendation.",
                status.HTTP_403_FORBIDDEN,
            )
        if recommendation.status != PanelRecommendation.Status.SUBMITTED_TO_PANEL:
            return error_response(
                "Only recommendations awaiting selected panel review can be cancelled."
            )

        reason_serializer = ReasonSerializer(data=request.data)
        reason_serializer.is_valid(raise_exception=True)
        previous_status = recommendation.status
        recommendation.status = PanelRecommendation.Status.CANCELLED_BY_SUPERVISOR
        recommendation.cancellation_reason = reason_serializer.validated_data["reason"]
        recommendation.cancelled_at = timezone.now()
        recommendation.save(
            update_fields=[
                "status",
                "cancellation_reason",
                "cancelled_at",
                "updated_at",
            ]
        )
        record_workflow_event(
            actor=request.user,
            action="SUPERVISOR_CANCEL",
            previous_status=previous_status,
            new_status=recommendation.status,
            reason=recommendation.cancellation_reason,
            panel_recommendation=recommendation,
        )
        notify_workflow(
            recipients=[recommendation.recommended_member],
            actor=request.user,
            event_key=f"panel:{recommendation.pk}:supervisor-cancel",
            title="Panel recommendation cancelled",
            summary=f"The recommendation for {recommendation.profile.student_name} was cancelled.",
            message=recommendation.cancellation_reason,
            module_label="Panel Appointment",
            target_module="PANEL_APPOINTMENTS",
            record_type="PANEL_RECOMMENDATION",
            record_id=recommendation.pk,
            priority=Notification.Priority.MEDIUM,
        )
    return Response(PanelRecommendationSerializer(recommendation).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def panel_accept_view(request, pk):
    recommendation = get_recommendation_or_404(pk)
    if recommendation is None:
        return error_response("Panel recommendation was not found.", status.HTTP_404_NOT_FOUND)
    if request.user.pk != recommendation.recommended_member_id:
        return error_response("Only the selected panel lecturer can accept this recommendation.", status.HTTP_403_FORBIDDEN)
    if recommendation.status != PanelRecommendation.Status.SUBMITTED_TO_PANEL:
        return error_response("This recommendation is not awaiting selected panel review.")

    with transaction.atomic():
        previous_status = recommendation.status
        recommendation.status = PanelRecommendation.Status.PENDING_COORDINATOR
        recommendation.panel_decided_at = timezone.now()
        recommendation.save(update_fields=["status", "panel_decided_at", "updated_at"])
        record_workflow_event(
            actor=request.user,
            action="PANEL_ACCEPT",
            previous_status=previous_status,
            new_status=recommendation.status,
            panel_recommendation=recommendation,
        )
        notify_workflow(
            recipients=[
                recommendation.supervisor,
                *programme_coordinators(recommendation.profile.programme),
            ],
            actor=request.user,
            event_key=f"panel:{recommendation.pk}:panel-accept",
            title="Panel recommendation accepted",
            summary=f"{request.user.full_name} accepted the recommendation for {recommendation.profile.student_name}.",
            message="The recommendation is now awaiting Programme Coordinator confirmation.",
            module_label="Panel Appointment",
            target_module="PANEL_APPOINTMENTS",
            record_type="PANEL_RECOMMENDATION",
            record_id=recommendation.pk,
            priority=Notification.Priority.MEDIUM,
        )
    return Response(PanelRecommendationSerializer(recommendation).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def panel_reject_view(request, pk):
    recommendation = get_recommendation_or_404(pk)
    if recommendation is None:
        return error_response("Panel recommendation was not found.", status.HTTP_404_NOT_FOUND)
    if request.user.pk != recommendation.recommended_member_id:
        return error_response("Only the selected panel lecturer can reject this recommendation.", status.HTTP_403_FORBIDDEN)
    if recommendation.status != PanelRecommendation.Status.SUBMITTED_TO_PANEL:
        return error_response("This recommendation is not awaiting selected panel review.")

    reason_serializer = ReasonSerializer(data=request.data)
    reason_serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        previous_status = recommendation.status
        recommendation.status = PanelRecommendation.Status.REJECTED_BY_PANEL
        recommendation.panel_rejection_reason = reason_serializer.validated_data["reason"]
        recommendation.panel_decided_at = timezone.now()
        recommendation.save(
            update_fields=["status", "panel_rejection_reason", "panel_decided_at", "updated_at"]
        )
        record_workflow_event(
            actor=request.user,
            action="PANEL_REJECT",
            previous_status=previous_status,
            new_status=recommendation.status,
            reason=recommendation.panel_rejection_reason,
            panel_recommendation=recommendation,
        )
        notify_workflow(
            recipients=[recommendation.supervisor],
            actor=request.user,
            event_key=f"panel:{recommendation.pk}:panel-reject",
            title="Panel recommendation rejected",
            summary=f"The selected panel rejected the recommendation for {recommendation.profile.student_name}.",
            message=recommendation.panel_rejection_reason,
            module_label="Panel Appointment",
            target_module="PANEL_APPOINTMENTS",
            record_type="PANEL_RECOMMENDATION",
            record_id=recommendation.pk,
            priority=Notification.Priority.MEDIUM,
        )
    return Response(PanelRecommendationSerializer(recommendation).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def coordinator_approve_view(request, pk):
    recommendation = get_recommendation_or_404(pk)
    if recommendation is None:
        return error_response("Panel recommendation was not found.", status.HTTP_404_NOT_FOUND)
    if request.user.role != User.Role.COORDINATOR:
        return error_response("Only Programme Coordinators can approve panel recommendations.", status.HTTP_403_FORBIDDEN)
    if not coordinator_can_access_recommendation(request.user, recommendation):
        return error_response(
            "This recommendation is outside your managed programme.",
            status.HTTP_403_FORBIDDEN,
        )
    if recommendation.status != PanelRecommendation.Status.PENDING_COORDINATOR:
        return error_response("This recommendation is not awaiting Programme Coordinator review.")

    with transaction.atomic():
        previous_status = recommendation.status
        recommendation.status = PanelRecommendation.Status.APPROVED
        recommendation.coordinator_decided_at = timezone.now()
        recommendation.save(update_fields=["status", "coordinator_decided_at", "updated_at"])
        PanelAppointment.objects.get_or_create(
            recommendation=recommendation,
            defaults={
                "profile": recommendation.profile,
                "supervisor": recommendation.supervisor,
                "panel_member": recommendation.recommended_member,
                "approved_by": request.user,
            },
        )
        record_workflow_event(
            actor=request.user,
            action="COORDINATOR_APPROVE",
            previous_status=previous_status,
            new_status=recommendation.status,
            panel_recommendation=recommendation,
        )
        notify_workflow(
            recipients=[
                recommendation.supervisor,
                recommendation.recommended_member,
                recommendation.profile.student,
            ],
            actor=request.user,
            event_key=f"panel:{recommendation.pk}:coordinator-approve",
            title="Panel appointment confirmed",
            summary=f"The panel appointment for {recommendation.profile.student_name} was confirmed.",
            message="The Programme Coordinator approved the panel recommendation.",
            module_label="Panel Appointment",
            target_module="PANEL_APPOINTMENTS",
            record_type="PANEL_RECOMMENDATION",
            record_id=recommendation.pk,
        )
    return Response(PanelRecommendationSerializer(recommendation).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def coordinator_reject_view(request, pk):
    recommendation = get_recommendation_or_404(pk)
    if recommendation is None:
        return error_response("Panel recommendation was not found.", status.HTTP_404_NOT_FOUND)
    if request.user.role != User.Role.COORDINATOR:
        return error_response("Only Programme Coordinators can reject panel recommendations.", status.HTTP_403_FORBIDDEN)
    if not coordinator_can_access_recommendation(request.user, recommendation):
        return error_response(
            "This recommendation is outside your managed programme.",
            status.HTTP_403_FORBIDDEN,
        )
    if recommendation.status != PanelRecommendation.Status.PENDING_COORDINATOR:
        return error_response("This recommendation is not awaiting Programme Coordinator review.")

    reason_serializer = ReasonSerializer(data=request.data)
    reason_serializer.is_valid(raise_exception=True)
    reason = reason_serializer.validated_data["reason"]
    with transaction.atomic():
        previous_status = recommendation.status
        recommendation.status = PanelRecommendation.Status.REJECTED_BY_COORDINATOR
        recommendation.coordinator_rejection_reason = str(reason).strip()
        recommendation.coordinator_decided_at = timezone.now()
        recommendation.save(
            update_fields=["status", "coordinator_rejection_reason", "coordinator_decided_at", "updated_at"]
        )
        record_workflow_event(
            actor=request.user,
            action="COORDINATOR_REJECT",
            previous_status=previous_status,
            new_status=recommendation.status,
            reason=recommendation.coordinator_rejection_reason,
            panel_recommendation=recommendation,
        )
        notify_workflow(
            recipients=[recommendation.supervisor, recommendation.recommended_member],
            actor=request.user,
            event_key=f"panel:{recommendation.pk}:coordinator-reject",
            title="Panel recommendation rejected by coordinator",
            summary=f"The recommendation for {recommendation.profile.student_name} was not approved.",
            message=recommendation.coordinator_rejection_reason,
            module_label="Panel Appointment",
            target_module="PANEL_APPOINTMENTS",
            record_type="PANEL_RECOMMENDATION",
            record_id=recommendation.pk,
            priority=Notification.Priority.MEDIUM,
        )
    return Response(PanelRecommendationSerializer(recommendation).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def assignments_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response("Only lecturers can view panel assignments.", status.HTTP_403_FORBIDDEN)
    appointments = PanelAppointment.objects.filter(panel_member=request.user).select_related(
        "profile", "supervisor"
    )
    return Response(PanelAssignmentSerializer(appointments, many=True).data)


def supervisor_programme_access(user, application):
    programme = coordinator_programme(user)
    return bool(programme) and application.student.programme == programme


def get_supervisor_application(pk):
    try:
        return SupervisorApplication.objects.select_related(
            "student",
            "student__user",
            "proposed_supervisor",
            "proposed_supervisor__lecturer",
        ).prefetch_related("documents", "workflow_events__actor").get(pk=pk)
    except SupervisorApplication.DoesNotExist:
        return None


def can_view_supervisor_application(user, application):
    if user.role == User.Role.OFFICE_ADMIN:
        return True
    if user.pk in [
        application.student.user_id,
        application.proposed_supervisor_id,
    ]:
        return True
    return (
        user.role == User.Role.COORDINATOR
        and supervisor_programme_access(user, application)
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supervisor_candidates_view(request):
    if request.user.role != User.Role.STUDENT:
        return error_response(
            "Only students can view supervisor candidates.",
            status.HTTP_403_FORBIDDEN,
        )
    candidates = User.objects.filter(
        role=User.Role.LECTURER,
        is_active=True,
        lecturer__supervisor__isnull=False,
    ).select_related("lecturer", "lecturer__supervisor")
    return Response(SupervisorCandidateSerializer(candidates, many=True).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def supervisor_applications_view(request):
    if request.method == "GET":
        if request.user.role != User.Role.STUDENT:
            return error_response(
                "Only students can view their supervisor applications.",
                status.HTTP_403_FORBIDDEN,
            )
        applications = SupervisorApplication.objects.filter(
            student=request.user.student
        ).select_related(
            "student",
            "student__user",
            "proposed_supervisor",
            "proposed_supervisor__lecturer",
        ).prefetch_related("documents", "workflow_events__actor")
        return Response(SupervisorApplicationSerializer(applications, many=True).data)

    serializer = SupervisorApplicationCreateSerializer(
        data=request.data,
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        application = serializer.save()
        record_workflow_event(
            actor=request.user,
            action="SUBMIT",
            previous_status="",
            new_status=application.status,
            supervisor_application=application,
        )
        notify_workflow(
            recipients=[application.proposed_supervisor],
            actor=request.user,
            event_key=f"supervisor:{application.pk}:submit",
            title="Supervisor request requires your review",
            summary=f"{application.student.user.full_name} requested you as supervisor.",
            message="Open Supervisor Appointments to accept or reject this request.",
            module_label="Supervisor Appointment",
            target_module="SUPERVISOR_APPOINTMENTS",
            record_type="SUPERVISOR_APPLICATION",
            record_id=application.pk,
            priority=Notification.Priority.MEDIUM,
        )
    application = get_supervisor_application(application.pk)
    return Response(
        SupervisorApplicationSerializer(application).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supervisor_application_detail_view(request, pk):
    application = get_supervisor_application(pk)
    if application is None:
        return error_response(
            "Supervisor application was not found.",
            status.HTTP_404_NOT_FOUND,
        )
    if not can_view_supervisor_application(request.user, application):
        return error_response(
            "You do not have permission to view this supervisor application.",
            status.HTTP_403_FORBIDDEN,
        )
    return Response(SupervisorApplicationSerializer(application).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_supervisor_application_view(request, pk):
    with transaction.atomic():
        try:
            application = SupervisorApplication.objects.select_for_update().select_related(
                "student",
                "student__user",
                "proposed_supervisor",
            ).prefetch_related("documents", "workflow_events__actor").get(pk=pk)
        except SupervisorApplication.DoesNotExist:
            return error_response(
                "Supervisor application was not found.",
                status.HTTP_404_NOT_FOUND,
            )
        if request.user.pk != application.student.user_id:
            return error_response(
                "Only the student who submitted this request can cancel it.",
                status.HTTP_403_FORBIDDEN,
            )
        if application.status != SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR:
            return error_response(
                "Only requests awaiting supervisor review can be cancelled."
            )

        reason_serializer = ReasonSerializer(data=request.data)
        reason_serializer.is_valid(raise_exception=True)
        previous_status = application.status
        application.status = SupervisorApplication.Status.CANCELLED_BY_STUDENT
        application.cancellation_reason = reason_serializer.validated_data["reason"]
        application.cancelled_at = timezone.now()
        application.save(
            update_fields=[
                "status",
                "cancellation_reason",
                "cancelled_at",
                "updated_at",
            ]
        )
        record_workflow_event(
            actor=request.user,
            action="STUDENT_CANCEL",
            previous_status=previous_status,
            new_status=application.status,
            reason=application.cancellation_reason,
            supervisor_application=application,
        )
        notify_workflow(
            recipients=[application.proposed_supervisor],
            actor=request.user,
            event_key=f"supervisor:{application.pk}:student-cancel",
            title="Supervisor request cancelled",
            summary=f"{application.student.user.full_name} cancelled their supervisor request.",
            message=application.cancellation_reason,
            module_label="Supervisor Appointment",
            target_module="SUPERVISOR_APPOINTMENTS",
            record_type="SUPERVISOR_APPLICATION",
            record_id=application.pk,
            priority=Notification.Priority.MEDIUM,
        )
    return Response(SupervisorApplicationSerializer(application).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supervisor_requests_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response(
            "Only lecturers can view supervisor requests.",
            status.HTTP_403_FORBIDDEN,
        )
    applications = SupervisorApplication.objects.filter(
        proposed_supervisor=request.user,
        status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
    ).select_related("student", "student__user", "proposed_supervisor")
    rows = [
        {
            "applicationId": application.pk,
            "studentId": application.student.matric_no,
            "studentName": application.student.user.full_name,
            "programme": application.student.programme,
            "proposedTopic": application.research_title,
            "submittedDate": format_display_date(application.submitted_at),
            "receivedTime": application.submitted_at.isoformat(),
            "status": "Pending Review",
            "abstract": application.research_abstract,
            **supervisor_waiting_metadata(application),
        }
        for application in applications
    ]
    return Response(rows)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def supervisor_accept_view(request, pk):
    application = get_supervisor_application(pk)
    if application is None:
        return error_response(
            "Supervisor application was not found.",
            status.HTTP_404_NOT_FOUND,
        )
    if request.user.pk != application.proposed_supervisor_id:
        return error_response(
            "Only the requested supervisor can accept this application.",
            status.HTTP_403_FORBIDDEN,
        )
    if application.status != SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR:
        return error_response(
            "This application is not awaiting supervisor review."
        )
    if count_supervisor_workload(request.user) >= supervisor_workload_limit(
        request.user
    ):
        return error_response(
            "This supervisor has reached the configured workload limit."
        )

    with transaction.atomic():
        previous_status = application.status
        application.status = SupervisorApplication.Status.PENDING_COORDINATOR
        application.supervisor_decided_at = timezone.now()
        application.save(
            update_fields=["status", "supervisor_decided_at", "updated_at"]
        )
        record_workflow_event(
            actor=request.user,
            action="SUPERVISOR_ACCEPT",
            previous_status=previous_status,
            new_status=application.status,
            supervisor_application=application,
        )
        notify_workflow(
            recipients=[
                application.student.user,
                *programme_coordinators(application.student.programme),
            ],
            actor=request.user,
            event_key=f"supervisor:{application.pk}:supervisor-accept",
            title="Supervisor request accepted",
            summary=f"{request.user.full_name} accepted the supervisor request.",
            message="The request is now awaiting Programme Coordinator confirmation.",
            module_label="Supervisor Appointment",
            target_module="SUPERVISOR_APPOINTMENTS",
            record_type="SUPERVISOR_APPLICATION",
            record_id=application.pk,
            priority=Notification.Priority.MEDIUM,
        )
    return Response(SupervisorApplicationSerializer(application).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def supervisor_reject_view(request, pk):
    application = get_supervisor_application(pk)
    if application is None:
        return error_response(
            "Supervisor application was not found.",
            status.HTTP_404_NOT_FOUND,
        )
    if request.user.pk != application.proposed_supervisor_id:
        return error_response(
            "Only the requested supervisor can reject this application.",
            status.HTTP_403_FORBIDDEN,
        )
    if application.status != SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR:
        return error_response(
            "This application is not awaiting supervisor review."
        )
    reason_serializer = ReasonSerializer(data=request.data)
    reason_serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        previous_status = application.status
        application.status = SupervisorApplication.Status.REJECTED_BY_SUPERVISOR
        application.supervisor_rejection_reason = reason_serializer.validated_data[
            "reason"
        ]
        application.supervisor_decided_at = timezone.now()
        application.save(
            update_fields=[
                "status",
                "supervisor_rejection_reason",
                "supervisor_decided_at",
                "updated_at",
            ]
        )
        record_workflow_event(
            actor=request.user,
            action="SUPERVISOR_REJECT",
            previous_status=previous_status,
            new_status=application.status,
            reason=application.supervisor_rejection_reason,
            supervisor_application=application,
        )
        notify_workflow(
            recipients=[application.student.user],
            actor=request.user,
            event_key=f"supervisor:{application.pk}:supervisor-reject",
            title="Supervisor request rejected",
            summary=f"{request.user.full_name} rejected the supervisor request.",
            message=application.supervisor_rejection_reason,
            module_label="Supervisor Appointment",
            target_module="SUPERVISOR_APPOINTMENTS",
            record_type="SUPERVISOR_APPLICATION",
            record_id=application.pk,
            priority=Notification.Priority.MEDIUM,
        )
    return Response(SupervisorApplicationSerializer(application).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supervisor_coordinator_queue_view(request):
    if request.user.role != User.Role.COORDINATOR:
        return error_response(
            "Only Programme Coordinators can view supervisor approvals.",
            status.HTTP_403_FORBIDDEN,
        )
    programme = coordinator_programme(request.user)
    if not programme:
        return Response([])
    applications = SupervisorApplication.objects.filter(
        student__programme=programme,
        status=SupervisorApplication.Status.PENDING_COORDINATOR,
    ).select_related("student", "student__user", "proposed_supervisor")
    return Response(SupervisorApplicationSerializer(applications, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def supervisor_coordinator_approve_view(request, pk):
    application = get_supervisor_application(pk)
    if application is None:
        return error_response(
            "Supervisor application was not found.",
            status.HTTP_404_NOT_FOUND,
        )
    if request.user.role != User.Role.COORDINATOR:
        return error_response(
            "Only Programme Coordinators can approve supervisor applications.",
            status.HTTP_403_FORBIDDEN,
        )
    if not supervisor_programme_access(request.user, application):
        return error_response(
            "This application is outside your managed programme.",
            status.HTTP_403_FORBIDDEN,
        )
    if application.status != SupervisorApplication.Status.PENDING_COORDINATOR:
        return error_response(
            "This application is not awaiting Programme Coordinator review."
        )
    if count_supervisor_workload(
        application.proposed_supervisor
    ) >= supervisor_workload_limit(application.proposed_supervisor):
        return error_response(
            "This supervisor has reached the configured workload limit."
        )

    with transaction.atomic():
        previous_status = application.status
        application.status = SupervisorApplication.Status.APPROVED
        application.coordinator_decided_at = timezone.now()
        application.save(
            update_fields=["status", "coordinator_decided_at", "updated_at"]
        )
        SupervisorAppointment.objects.get_or_create(
            application=application,
            defaults={
                "student": application.student,
                "supervisor": application.proposed_supervisor,
                "approved_by": request.user,
            },
        )
        record_workflow_event(
            actor=request.user,
            action="COORDINATOR_APPROVE",
            previous_status=previous_status,
            new_status=application.status,
            supervisor_application=application,
        )
        notify_workflow(
            recipients=[application.student.user, application.proposed_supervisor],
            actor=request.user,
            event_key=f"supervisor:{application.pk}:coordinator-approve",
            title="Supervisor appointment approved",
            summary=f"The supervisor appointment for {application.student.user.full_name} was approved.",
            message="The Programme Coordinator confirmed the supervisor appointment.",
            module_label="Supervisor Appointment",
            target_module="SUPERVISOR_APPOINTMENTS",
            record_type="SUPERVISOR_APPLICATION",
            record_id=application.pk,
        )
    return Response(SupervisorApplicationSerializer(application).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def supervisor_coordinator_reject_view(request, pk):
    application = get_supervisor_application(pk)
    if application is None:
        return error_response(
            "Supervisor application was not found.",
            status.HTTP_404_NOT_FOUND,
        )
    if request.user.role != User.Role.COORDINATOR:
        return error_response(
            "Only Programme Coordinators can reject supervisor applications.",
            status.HTTP_403_FORBIDDEN,
        )
    if not supervisor_programme_access(request.user, application):
        return error_response(
            "This application is outside your managed programme.",
            status.HTTP_403_FORBIDDEN,
        )
    if application.status != SupervisorApplication.Status.PENDING_COORDINATOR:
        return error_response(
            "This application is not awaiting Programme Coordinator review."
        )
    reason_serializer = ReasonSerializer(data=request.data)
    reason_serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        previous_status = application.status
        application.status = SupervisorApplication.Status.REJECTED_BY_COORDINATOR
        application.coordinator_rejection_reason = reason_serializer.validated_data[
            "reason"
        ]
        application.coordinator_decided_at = timezone.now()
        application.save(
            update_fields=[
                "status",
                "coordinator_rejection_reason",
                "coordinator_decided_at",
                "updated_at",
            ]
        )
        record_workflow_event(
            actor=request.user,
            action="COORDINATOR_REJECT",
            previous_status=previous_status,
            new_status=application.status,
            reason=application.coordinator_rejection_reason,
            supervisor_application=application,
        )
        notify_workflow(
            recipients=[application.student.user, application.proposed_supervisor],
            actor=request.user,
            event_key=f"supervisor:{application.pk}:coordinator-reject",
            title="Supervisor request rejected by coordinator",
            summary=f"The supervisor request for {application.student.user.full_name} was not approved.",
            message=application.coordinator_rejection_reason,
            module_label="Supervisor Appointment",
            target_module="SUPERVISOR_APPOINTMENTS",
            record_type="SUPERVISOR_APPLICATION",
            record_id=application.pk,
            priority=Notification.Priority.MEDIUM,
        )
    return Response(SupervisorApplicationSerializer(application).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def active_supervisees_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response(
            "Only lecturers can view active supervisees.",
            status.HTTP_403_FORBIDDEN,
        )
    appointments = SupervisorAppointment.objects.filter(
        supervisor=request.user,
        status=SupervisorAppointment.Status.ACTIVE,
    ).select_related(
        "student",
        "student__user",
        "application",
        "supervisor",
    )
    return Response(
        [
            {
                "appointmentId": appointment.pk,
                "studentId": appointment.student.matric_no,
                "studentName": appointment.student.user.full_name,
                "programme": appointment.student.programme,
                **workflow_semester_payload(appointment.application),
                "email": appointment.student.user.email,
                "researchTitle": appointment.application.research_title,
                "researchAbstract": (
                    appointment.application.research_abstract
                ),
                "supervisorName": appointment.supervisor.full_name,
                "appointmentDate": format_display_date(
                    appointment.appointment_date
                ),
                "status": "Active",
            }
            for appointment in appointments
        ]
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supervisor_request_history_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response(
            "Only lecturers can view supervisor request history.",
            status.HTTP_403_FORBIDDEN,
        )
    applications = SupervisorApplication.objects.filter(
        proposed_supervisor=request.user,
    ).filter(
        Q(supervisor_decided_at__isnull=False)
        | Q(status=SupervisorApplication.Status.CANCELLED_BY_STUDENT)
    ).select_related("student", "student__user")
    return Response(
        [
            {
                "requestId": f"SV-REQ-{application.pk:05d}",
                "studentName": application.student.user.full_name,
                "studentId": application.student.matric_no,
                "programme": application.student.programme,
                "researchTitle": application.research_title,
                "submittedDate": format_display_date(application.submitted_at),
                "decision": (
                    "Cancelled"
                    if application.status
                    == SupervisorApplication.Status.CANCELLED_BY_STUDENT
                    else "Rejected"
                    if application.status
                    == SupervisorApplication.Status.REJECTED_BY_SUPERVISOR
                    else "Approved"
                ),
                **workflow_semester_payload(application),
                "abstract": application.research_abstract,
                "decisionReason": (
                    application.cancellation_reason
                    or application.supervisor_rejection_reason
                ),
            }
            for application in applications
        ]
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supervisor_records_view(request):
    if request.user.role != User.Role.OFFICE_ADMIN:
        return error_response(
            "Only Office Staff/Admin can view supervisor records.",
            status.HTTP_403_FORBIDDEN,
        )
    applications = SupervisorApplication.objects.select_related(
        "student",
        "student__user",
        "proposed_supervisor",
        "proposed_supervisor__lecturer",
    ).prefetch_related("workflow_events__actor")

    def display_status(application):
        if application.status == SupervisorApplication.Status.APPROVED:
            return "Approved"
        if application.status in [
            SupervisorApplication.Status.REJECTED_BY_SUPERVISOR,
            SupervisorApplication.Status.REJECTED_BY_COORDINATOR,
        ]:
            return "Rejected"
        if application.status == SupervisorApplication.Status.CANCELLED_BY_STUDENT:
            return "Cancelled"
        return "Pending"

    return Response(
        [
            {
                "studentId": application.student.matric_no,
                "studentName": application.student.user.full_name,
                "programme": application.student.programme,
                "supervisor": application.proposed_supervisor.full_name,
                "status": display_status(application),
                "updatedDate": format_display_date(application.updated_at),
                "email": application.student.user.email,
                **workflow_semester_payload(application),
                "researchTopic": application.research_title,
                "abstract": application.research_abstract,
                "appointmentId": f"SV-APP-{application.pk:05d}",
                "workloadLimit": (
                    f"{count_supervisor_workload(application.proposed_supervisor)}/"
                    f"{supervisor_workload_limit(application.proposed_supervisor)} Supervisees"
                ),
                "approvedDate": format_display_date(
                    application.coordinator_decided_at
                ),
                "cancelledAt": application.cancelled_at,
                "cancellationReason": application.cancellation_reason,
                "workflow": AppointmentWorkflowEventSerializer(
                    application.workflow_events.all(),
                    many=True,
                ).data,
                **supervisor_waiting_metadata(application),
            }
            for application in applications
        ]
    )
