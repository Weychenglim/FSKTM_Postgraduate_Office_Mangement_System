from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.views.decorators.cache import never_cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.eligibility import student_is_workflow_eligible
from accounts.models import Student, User

from .models import SupervisorApplicationDraft
from .research_intent import validate_application_draft


def eligible_draft_student(user):
    if user.role != User.Role.STUDENT:
        raise PermissionDenied("Only students can access their own application draft.")
    try:
        student = user.student
    except ObjectDoesNotExist:
        raise PermissionDenied("The student profile is not available.")
    if not student_is_workflow_eligible(student):
        raise PermissionDenied("Your lifecycle status does not permit a new supervisor application.")
    return student


def draft_payload(draft):
    return {
        "draft": draft.content if draft else None,
        "updatedAt": draft.updated_at.isoformat() if draft else None,
    }


@never_cache
@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def application_draft_view(request):
    student = eligible_draft_student(request.user)
    if request.method == "GET":
        return Response(draft_payload(SupervisorApplicationDraft.objects.filter(student=student).first()))
    content = validate_application_draft(request.data) if request.method == "PUT" else None
    with transaction.atomic():
        # Use the same student lock as submission, including when no draft exists yet.
        student = Student.objects.select_for_update().get(pk=student.pk)
        if not student_is_workflow_eligible(student):
            raise PermissionDenied("Your lifecycle status does not permit a new supervisor application.")
        if request.method == "DELETE":
            SupervisorApplicationDraft.objects.filter(student=student).delete()
            return Response(status=204)
        draft, _ = SupervisorApplicationDraft.objects.update_or_create(student=student, defaults={"content": content})
        return Response(draft_payload(draft))


@never_cache
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def application_research_intent_view(request, pk):
    from .views import can_view_supervisor_application, get_supervisor_application

    application = get_supervisor_application(pk)
    if application is None:
        return Response({"detail": "Supervisor application was not found."}, status=404)
    if not can_view_supervisor_application(request.user, application):
        raise PermissionDenied("You do not have permission to view this supervisor application.")
    return Response({"researchIntent": application.research_intent})
