"""Coordinator-only opt-in browse APIs. Existing workflow endpoints remain authoritative."""
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academics.services import current_effective_semester
from accounts.authorization import office_actor, coordinator_scope_q
from accounts.models import User
from . import capacity_reassessment, co_supervision, coordinator_workspace as workspace, office_attention
from .models import SupervisorApplication
from .capacity_closure import supervisor_workload_summary
from .serializers import SupervisorApplicationSerializer
from .supervision_exports import supervision_workbook


def require_browse_staff(actor, office=False):
    expected = User.Role.OFFICE_ADMIN if office else User.Role.COORDINATOR
    allowed = office_actor(actor) if office else actor.role == expected and actor.is_active
    if not allowed:
        raise PermissionDenied("This staff workspace is not available to your account.")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def requests_view(request, office=False):
    require_browse_staff(request.user, office)
    return Response(workspace.requests_page(request.user, request.query_params))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teams_view(request, office=False):
    require_browse_staff(request.user, office)
    return Response(workspace.teams_page(request.user, request.query_params))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supervision_export_view(request, office=False):
    require_browse_staff(request.user, office)
    response = HttpResponse(supervision_workbook(request.user, request.query_params),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response["Content-Disposition"] = 'attachment; filename="current-supervision.xlsx"'
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def appointments_view(request, office=False):
    require_browse_staff(request.user, office)
    return Response(workspace.appointments_page(request.user, request.query_params))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def carryover_view(request, office=False):
    require_browse_staff(request.user, office)
    return Response(workspace.carryover_page(request.user, request.query_params))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def primary_request_view(request, pk, office=False):
    require_browse_staff(request.user, office)
    rows = SupervisorApplication.objects.filter(workspace.browse_scope_q(request.user, "student__programme"))
    row = get_object_or_404(rows.select_related("student__user", "academic_semester", "proposed_supervisor__lecturer",
        "appointment__ended_by", "appointment__supersedes").prefetch_related("documents", "workflow_events__actor",
        "appointment__lifecycle_events__actor"), pk=pk)
    payload = dict(SupervisorApplicationSerializer(row, context={"request": request}).data)
    if office:
        payload["email"] = row.student.user.email
        payload["workloadLimit"] = supervisor_workload_summary(row)
    payload["canDecide"] = rows.filter(pk=pk).filter(workspace.decision_q("primary", request.user)).exists()
    return Response(payload)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supporting_request_view(request, pk, office=False):
    require_browse_staff(request.user, office)
    row = get_object_or_404(co_supervision.nominations_queryset().filter(
        workspace.browse_scope_q(request.user, "student__programme")), pk=pk)
    return Response(co_supervision.serialize_nomination(row, request.user))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def supporting_appointment_view(request, pk, office=False):
    require_browse_staff(request.user, office)
    row = get_object_or_404(co_supervision.appointments_queryset().filter(
        workspace.browse_scope_q(request.user, "student__programme")), pk=pk)
    return Response(co_supervision.serialize_appointment(row, request.user))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def team_view(request, identity, office=False):
    require_browse_staff(request.user, office)
    students = co_supervision.visible_students(request.user)
    # Numeric matriculation numbers must not be confused with the student PK.
    student = students.filter(matric_no=identity).first()
    if student is None:
        student = get_object_or_404(students, pk=int(identity)) if identity.isdecimal() else get_object_or_404(students, matric_no=identity)
    team = co_supervision.serialize_team(student, request.user, include_details=True)
    primary = co_supervision.active_primary(student)
    application = primary.application if primary else workspace.routine_supervisor_requests(
        student.supervisor_applications.all(), request.user).order_by("-submitted_at", "-pk").first()
    return Response({"teams": [team], "appointments": team["appointments"], "nominations": team["nominations"],
                     "primaryApplication": SupervisorApplicationSerializer(application, context={"request": request}).data if application else None})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def carryover_detail_view(request, kind, pk, office=False):
    require_browse_staff(request.user, office)
    if kind not in capacity_reassessment.KINDS:
        raise Http404
    model = capacity_reassessment.KINDS[kind][0]
    student = "profile__student__student" if kind == "PANEL" else "student"
    rows = model.objects.filter(workspace.browse_scope_q(request.user, f"{student}__programme"))
    if kind == "PANEL":
        rows = rows.filter(profile__student__student__isnull=False)
    row = get_object_or_404(rows, pk=pk)
    active = current_effective_semester()
    return Response({"record": capacity_reassessment.request_payload(row, request.user, active),
                     "activeSemester": capacity_reassessment.semester_payload(active)})


urlpatterns = [
    path("supervision-export/", supervision_export_view),
    path("requests/", requests_view),
    path("requests/primary/<int:pk>/", primary_request_view),
    path("requests/supporting/<int:pk>/", supporting_request_view),
    path("teams/", teams_view),
    path("teams/<str:identity>/", team_view),
    path("appointments/", appointments_view),
    path("appointments/supporting/<int:pk>/", supporting_appointment_view),
    path("carryover/", carryover_view),
    path("carryover/<str:kind>/<int:pk>/", carryover_detail_view),
]

# Separate role-checked URL namespace sharing the same bounded read projections.
office_urlpatterns = [path(str(route.pattern), route.callback, {"office": True}) for route in urlpatterns]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def office_attention_view(request):
    require_browse_staff(request.user, office=True)
    return Response(office_attention.attention_page(request.query_params))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def office_attention_summary_view(request):
    require_browse_staff(request.user, office=True)
    return Response(office_attention.attention_summary())


office_urlpatterns += [path("attention/", office_attention_view),
                       path("attention-summary/", office_attention_summary_view)]
