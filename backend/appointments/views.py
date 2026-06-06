from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PanelAppointment, PanelRecommendation, StudentResearchProfile
from .serializers import (
    PanelAssignmentSerializer,
    PanelCandidateSerializer,
    PanelRecommendationCreateSerializer,
    PanelRecommendationSerializer,
    ReasonSerializer,
    StudentPanelAppointmentSerializer,
    StudentResearchProfileSerializer,
    pending_student_panel_payload_from_user,
    student_panel_appointment_payload,
)


User = get_user_model()


def panel_record_from_appointment(appointment):
    return {
        "id": appointment.profile.matric_no,
        "studentName": appointment.profile.student_name,
        "programme": appointment.profile.programme,
        "semester": appointment.profile.semester,
        "supervisor": appointment.supervisor.full_name,
        "panelMember": appointment.panel_member.full_name,
        "status": "Approved",
        "updatedDate": appointment.updated_at.strftime("%d %b %Y"),
    }


def panel_record_from_recommendation(recommendation):
    return {
        "id": recommendation.profile.matric_no,
        "studentName": recommendation.profile.student_name,
        "programme": recommendation.profile.programme,
        "semester": recommendation.profile.semester,
        "supervisor": recommendation.supervisor.full_name,
        "panelMember": recommendation.recommended_member.full_name
        if recommendation.status != PanelRecommendation.Status.REJECTED_BY_PANEL
        else "Not Assigned",
        "status": "Rejected"
        if recommendation.status in [
            PanelRecommendation.Status.REJECTED_BY_PANEL,
            PanelRecommendation.Status.REJECTED_BY_COORDINATOR,
        ]
        else "Recommendation",
        "updatedDate": recommendation.updated_at.strftime("%d %b %Y"),
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
    appointments = PanelAppointment.objects.select_related(
        "profile", "supervisor", "panel_member"
    )
    appointment_profile_ids = appointments.values_list("profile_id", flat=True)
    recommendations = PanelRecommendation.objects.exclude(
        profile_id__in=appointment_profile_ids
    ).select_related("profile", "supervisor", "recommended_member")
    records = [
        *[panel_record_from_appointment(appointment) for appointment in appointments],
        *[panel_record_from_recommendation(recommendation) for recommendation in recommendations],
    ]
    return Response(records)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def eligible_supervisees_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response("Only lecturers can view eligible supervisees.", status.HTTP_403_FORBIDDEN)
    profiles = StudentResearchProfile.objects.filter(supervisor=request.user).select_related("supervisor")
    return Response(StudentResearchProfileSerializer(profiles, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def panel_candidates_view(request):
    if request.user.role != User.Role.LECTURER:
        return error_response("Only lecturers can view panel candidates.", status.HTTP_403_FORBIDDEN)
    lecturers = User.objects.filter(role=User.Role.LECTURER, is_active=True).exclude(pk=request.user.pk)
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
            "profile", "recommended_member"
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
    ).select_related("profile", "recommended_member")
    return Response(PanelRecommendationSerializer(recommendations, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def coordinator_queue_view(request):
    if request.user.role != User.Role.COORDINATOR:
        return error_response("Only Programme Coordinators can view coordinator review queues.", status.HTTP_403_FORBIDDEN)
    recommendations = PanelRecommendation.objects.filter(
        status=PanelRecommendation.Status.PENDING_COORDINATOR
    ).select_related("profile", "recommended_member")
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
