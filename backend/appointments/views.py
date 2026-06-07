from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PANEL_WORKLOAD_LIMIT, PanelAppointment, PanelRecommendation, StudentResearchProfile
from .serializers import (
    PanelAssignmentSerializer,
    PanelCandidateSerializer,
    PanelRecommendationCreateSerializer,
    PanelRecommendationSerializer,
    ReasonSerializer,
    StudentPanelAppointmentSerializer,
    StudentResearchProfileSerializer,
    department_for_user,
    format_display_date,
    pending_student_panel_payload_from_user,
    staff_no_for_user,
    student_panel_appointment_payload,
)


User = get_user_model()


def panel_record_from_appointment(appointment):
    panel_member = appointment.panel_member
    recommendation = appointment.recommendation
    return {
        "id": appointment.profile.matric_no,
        "studentName": appointment.profile.student_name,
        "programme": appointment.profile.programme,
        "semester": appointment.profile.semester,
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
        "status": "Approved",
        "updatedDate": appointment.updated_at.strftime("%d %b %Y"),
    }


def panel_record_from_recommendation(recommendation):
    if recommendation.status == PanelRecommendation.Status.SUBMITTED_TO_PANEL:
        display_status = "Recommendation"
    elif recommendation.status in [
        PanelRecommendation.Status.ACCEPTED_BY_PANEL,
        PanelRecommendation.Status.PENDING_COORDINATOR,
    ]:
        display_status = "Pending"
    elif recommendation.status in [
        PanelRecommendation.Status.REJECTED_BY_PANEL,
        PanelRecommendation.Status.REJECTED_BY_COORDINATOR,
    ]:
        display_status = "Rejected"
    else:
        display_status = "Approved"

    return {
        "id": recommendation.profile.matric_no,
        "studentName": recommendation.profile.student_name,
        "programme": recommendation.profile.programme,
        "semester": recommendation.profile.semester,
        "researchTitle": recommendation.profile.proposed_topic,
        "researchArea": recommendation.profile.research_area,
        "abstract": recommendation.profile.abstract,
        "supervisor": recommendation.supervisor.full_name,
        "panelMember": recommendation.recommended_member.full_name
        if recommendation.status != PanelRecommendation.Status.REJECTED_BY_PANEL
        else "Not Assigned",
        "panelMemberId": staff_no_for_user(recommendation.recommended_member)
        if recommendation.status != PanelRecommendation.Status.REJECTED_BY_PANEL
        else "",
        "panelMemberDepartment": department_for_user(recommendation.recommended_member)
        if recommendation.status != PanelRecommendation.Status.REJECTED_BY_PANEL
        else "",
        "panelMemberEmail": recommendation.recommended_member.email
        if recommendation.status != PanelRecommendation.Status.REJECTED_BY_PANEL
        else "",
        "appointmentDate": "",
        "recommendationSubmittedAt": recommendation.submitted_at,
        "panelDecisionAt": recommendation.panel_decided_at,
        "coordinatorDecisionAt": recommendation.coordinator_decided_at,
        "appointmentConfirmedAt": None,
        "status": display_status,
        "updatedDate": recommendation.updated_at.strftime("%d %b %Y"),
    }


def panel_record_from_profile(profile):
    return {
        "id": profile.matric_no,
        "studentName": profile.student_name,
        "programme": profile.programme,
        "semester": profile.semester,
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
        "status": "No Panel",
        "updatedDate": profile.updated_at.strftime("%d %b %Y"),
    }


def initials_for_name(name):
    return "".join(part[0] for part in name.split()[:2]).upper()


def panel_workload_availability(count):
    if count >= PANEL_WORKLOAD_LIMIT:
        return "Full Load"
    if count >= max(PANEL_WORKLOAD_LIMIT - 1, 1):
        return "Near Limit"
    return "Available"


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
        "workloadLimit": PANEL_WORKLOAD_LIMIT,
        "availability": panel_workload_availability(workload_count),
        "initials": initials_for_name(lecturer.full_name),
        "confirmedAppointments": len(confirmed_appointments),
        "pendingNominations": len(pending_nominations),
        "workloadItems": workload_items,
    }


def error_response(message, response_status=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message}, status=response_status)


def get_recommendation_or_404(pk):
    try:
        return PanelRecommendation.objects.select_related(
            "profile", "supervisor", "recommended_member"
        ).get(pk=pk)
    except PanelRecommendation.DoesNotExist:
        return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def panel_records_view(request):
    appointments = list(PanelAppointment.objects.select_related(
        "profile", "supervisor", "panel_member"
    ))
    appointments_by_profile = {appointment.profile_id: appointment for appointment in appointments}

    latest_recommendations_by_profile = {}
    recommendations = PanelRecommendation.objects.select_related(
        "profile", "supervisor", "recommended_member"
    ).order_by("profile_id", "-updated_at", "-created_at")
    for recommendation in recommendations:
        latest_recommendations_by_profile.setdefault(recommendation.profile_id, recommendation)

    profiles = StudentResearchProfile.objects.select_related("supervisor").order_by("student_name")
    records = []
    for profile in profiles:
        appointment = appointments_by_profile.get(profile.pk)
        if appointment:
            records.append(panel_record_from_appointment(appointment))
            continue

        recommendation = latest_recommendations_by_profile.get(profile.pk)
        if recommendation:
            records.append(panel_record_from_recommendation(recommendation))
            continue

        records.append(panel_record_from_profile(profile))

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
    recommendation = serializer.save()
    return Response(PanelRecommendationSerializer(recommendation).data, status=status.HTTP_201_CREATED)


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
    recommendations = PanelRecommendation.objects.filter(
        status=PanelRecommendation.Status.PENDING_COORDINATOR
    ).select_related("profile", "recommended_member", "recommended_member__lecturer")
    return Response(PanelRecommendationSerializer(recommendations, many=True).data)


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

    recommendation.status = PanelRecommendation.Status.PENDING_COORDINATOR
    recommendation.panel_decided_at = timezone.now()
    recommendation.save(update_fields=["status", "panel_decided_at", "updated_at"])
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
    recommendation.status = PanelRecommendation.Status.REJECTED_BY_PANEL
    recommendation.panel_rejection_reason = reason_serializer.validated_data["reason"]
    recommendation.panel_decided_at = timezone.now()
    recommendation.save(
        update_fields=["status", "panel_rejection_reason", "panel_decided_at", "updated_at"]
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
    if recommendation.status != PanelRecommendation.Status.PENDING_COORDINATOR:
        return error_response("This recommendation is not awaiting Programme Coordinator review.")

    with transaction.atomic():
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
    return Response(PanelRecommendationSerializer(recommendation).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def coordinator_reject_view(request, pk):
    recommendation = get_recommendation_or_404(pk)
    if recommendation is None:
        return error_response("Panel recommendation was not found.", status.HTTP_404_NOT_FOUND)
    if request.user.role != User.Role.COORDINATOR:
        return error_response("Only Programme Coordinators can reject panel recommendations.", status.HTTP_403_FORBIDDEN)
    if recommendation.status != PanelRecommendation.Status.PENDING_COORDINATOR:
        return error_response("This recommendation is not awaiting Programme Coordinator review.")

    reason = request.data.get("reason", "")
    recommendation.status = PanelRecommendation.Status.REJECTED_BY_COORDINATOR
    recommendation.coordinator_rejection_reason = str(reason).strip()
    recommendation.coordinator_decided_at = timezone.now()
    recommendation.save(
        update_fields=["status", "coordinator_rejection_reason", "coordinator_decided_at", "updated_at"]
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
