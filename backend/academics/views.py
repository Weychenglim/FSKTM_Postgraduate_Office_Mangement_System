from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AcademicSemester
from .serializers import (
    AcademicSemesterUpdateSerializer,
    AcademicSemesterWriteSerializer,
    ExtendSerializer,
    ReasonSerializer,
    audit_payload,
    semester_payload,
)
from .services import (
    SemesterConflict,
    activate_semester,
    archive_semester,
    close_semester,
    create_semester,
    extend_semester,
    update_draft_semester,
)


def _office_denied(user):
    if user.role == user.Role.OFFICE_ADMIN:
        return None
    return Response(
        {"error": "Only Office Staff/Admin can manage academic semesters."},
        status=status.HTTP_403_FORBIDDEN,
    )


def _validation_response(exc):
    detail = getattr(exc, "message_dict", None) or getattr(
        exc, "messages", [str(exc)]
    )
    rendered = str(detail).lower()
    response_status = (
        status.HTTP_409_CONFLICT
        if "overlap" in rendered or "already exists" in rendered
        else status.HTTP_400_BAD_REQUEST
    )
    return Response(detail, status=response_status)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def active_semester_view(_request):
    semester = AcademicSemester.objects.filter(
        lifecycle_status=AcademicSemester.Lifecycle.ACTIVE
    ).first()
    return Response(
        {
            "available": bool(semester and semester.is_active),
            "semester": semester_payload(semester) if semester else None,
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def semester_list_view(request):
    denied = _office_denied(request.user)
    if denied:
        return denied
    if request.method == "GET":
        semesters = AcademicSemester.objects.all()
        if request.query_params.get("includeArchived", "").lower() != "true":
            semesters = semesters.exclude(
                lifecycle_status=AcademicSemester.Lifecycle.ARCHIVED
            )
        return Response(
            [semester_payload(item, include_counts=True) for item in semesters]
        )

    serializer = AcademicSemesterWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        semester = create_semester(
            actor=request.user,
            **serializer.service_values(),
        )
    except DjangoValidationError as exc:
        return _validation_response(exc)
    return Response(semester_payload(semester), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def semester_detail_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    semester = get_object_or_404(AcademicSemester, pk=pk)
    if request.method == "GET":
        return Response(semester_payload(semester, include_counts=True))
    serializer = AcademicSemesterUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        semester = update_draft_semester(
            semester,
            actor=request.user,
            values=serializer.service_values(),
        )
    except SemesterConflict as exc:
        return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)
    except IntegrityError:
        return Response(
            {"error": "Semester state changed concurrently. Reload and try again."},
            status=status.HTTP_409_CONFLICT,
        )
    except DjangoValidationError as exc:
        return _validation_response(exc)
    return Response(semester_payload(semester, include_counts=True))


def _reasoned_transition(request, pk, transition):
    denied = _office_denied(request.user)
    if denied:
        return denied
    semester = get_object_or_404(AcademicSemester, pk=pk)
    serializer = ReasonSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        semester = transition(
            semester,
            actor=request.user,
            reason=serializer.validated_data["reason"],
        )
    except SemesterConflict as exc:
        return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)
    except IntegrityError:
        return Response(
            {"error": "Semester state changed concurrently. Reload and try again."},
            status=status.HTTP_409_CONFLICT,
        )
    except DjangoValidationError as exc:
        return _validation_response(exc)
    return Response(semester_payload(semester, include_counts=True))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def activate_semester_view(request, pk):
    return _reasoned_transition(request, pk, activate_semester)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def close_semester_view(request, pk):
    return _reasoned_transition(request, pk, close_semester)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def archive_semester_view(request, pk):
    return _reasoned_transition(request, pk, archive_semester)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def extend_semester_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    semester = get_object_or_404(AcademicSemester, pk=pk)
    serializer = ExtendSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        semester = extend_semester(
            semester,
            actor=request.user,
            ends_on=serializer.validated_data["endsOn"],
            reason=serializer.validated_data["reason"],
        )
    except SemesterConflict as exc:
        return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)
    except IntegrityError:
        return Response(
            {"error": "Semester state changed concurrently. Reload and try again."},
            status=status.HTTP_409_CONFLICT,
        )
    except DjangoValidationError as exc:
        return _validation_response(exc)
    return Response(semester_payload(semester, include_counts=True))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def semester_audits_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    semester = get_object_or_404(AcademicSemester, pk=pk)
    return Response([audit_payload(audit) for audit in semester.audits.all()])
