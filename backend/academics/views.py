from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Lecturer

from .capacity import CapacityConflict
from .capacity_services import (
    CapacityLifecycleConflict,
    CapacityPlanConflict,
    cancel_availability_window,
    clone_capacity_plan,
    create_availability_window,
    create_capacity_plan,
    publish_capacity_plan,
    update_capacity_entry,
)
from .models import (
    AcademicSemester,
    LecturerAvailabilityWindow,
    LecturerCapacityAudit,
    SemesterCapacityPlan,
)
from .serializers import (
    AcademicSemesterUpdateSerializer,
    AcademicSemesterWriteSerializer,
    AvailabilityWriteSerializer,
    CapacityEntryWriteSerializer,
    CapacityPlanCommandSerializer,
    CapacityPlanCreateSerializer,
    CapacityPlanPatchSerializer,
    ExtendSerializer,
    ReasonSerializer,
    availability_payload,
    audit_payload,
    capacity_audit_payload,
    capacity_plan_payload,
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
        {"error": "Only Office Staff/Admin can manage academic configuration."},
        status=status.HTTP_403_FORBIDDEN,
    )


def _validation_response(exc):
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", [str(exc)])
    rendered = str(detail).lower()
    response_status = (
        status.HTTP_409_CONFLICT
        if "overlap" in rendered or "already exists" in rendered
        else status.HTTP_400_BAD_REQUEST
    )
    return Response(detail, status=response_status)


def _capacity_validation_response(exc):
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", [str(exc)])
    field_names = {
        "academic_semester": "semesterId",
        "lecturer": "lecturerId",
        "supervisor_limit": "supervisorLimit",
        "panel_limit": "panelLimit",
        "starts_on": "startsOn",
        "ends_on": "endsOn",
        "expected_fingerprint": "expectedFingerprint",
    }
    if isinstance(detail, dict):
        detail = {field_names.get(key, key): value for key, value in detail.items()}
    return Response(detail, status=status.HTTP_400_BAD_REQUEST)


def _capacity_conflict_response(exc):
    return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)


def _concurrent_capacity_response():
    return Response(
        {"error": "Capacity state changed concurrently. Reload and try again."},
        status=status.HTTP_409_CONFLICT,
    )


def _capacity_plan_queryset():
    return SemesterCapacityPlan.objects.select_related(
        "academic_semester",
        "supersedes",
        "created_by",
        "published_by",
    )


def _capacity_window_queryset():
    return LecturerAvailabilityWindow.objects.select_related(
        "academic_semester",
        "lecturer__user",
        "created_by",
        "cancelled_by",
    )


def _current_capacity_plan(plan_id):
    return _capacity_plan_queryset().get(pk=plan_id)


def _require_expected_version(plan, expected_version):
    if plan.version != expected_version:
        raise CapacityPlanConflict(
            "Capacity plan version changed concurrently; reload and retry."
        )


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


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def semester_capacity_plans_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    semester = get_object_or_404(AcademicSemester, pk=pk)
    if request.method == "GET":
        plans = (
            _capacity_plan_queryset()
            .filter(academic_semester=semester)
            .order_by("-version", "-pk")
        )
        return Response([capacity_plan_payload(plan) for plan in plans])

    serializer = CapacityPlanCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    copy_from_id = serializer.validated_data["copyFromPlanId"]
    copy_from = (
        get_object_or_404(_capacity_plan_queryset(), pk=copy_from_id)
        if copy_from_id is not None
        else None
    )
    try:
        plan = create_capacity_plan(
            semester=semester,
            actor=request.user,
            copy_from=copy_from,
        )
    except (CapacityLifecycleConflict, CapacityConflict) as exc:
        return _capacity_conflict_response(exc)
    except IntegrityError:
        return _concurrent_capacity_response()
    except DjangoValidationError as exc:
        return _capacity_validation_response(exc)
    return Response(
        capacity_plan_payload(_current_capacity_plan(plan.pk)),
        status=status.HTTP_201_CREATED,
    )


def _update_capacity_plan_entry(*, request, plan, lecturer, serializer):
    data = serializer.validated_data
    try:
        _require_expected_version(plan, data["expectedVersion"])
        update_capacity_entry(
            plan,
            lecturer=lecturer,
            actor=request.user,
            supervisor_limit=data["supervisorLimit"],
            panel_limit=data["panelLimit"],
            expected_fingerprint=data["expectedFingerprint"],
        )
    except (CapacityLifecycleConflict, CapacityConflict) as exc:
        return _capacity_conflict_response(exc)
    except IntegrityError:
        return _concurrent_capacity_response()
    except DjangoValidationError as exc:
        return _capacity_validation_response(exc)
    return Response(capacity_plan_payload(_current_capacity_plan(plan.pk)))


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def capacity_plan_detail_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    plan = get_object_or_404(_capacity_plan_queryset(), pk=pk)
    if request.method == "GET":
        return Response(capacity_plan_payload(plan))

    serializer = CapacityPlanPatchSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    lecturer = get_object_or_404(
        Lecturer.objects.select_related("user"),
        pk=serializer.validated_data["lecturerId"],
    )
    return _update_capacity_plan_entry(
        request=request,
        plan=plan,
        lecturer=lecturer,
        serializer=serializer,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def clone_capacity_plan_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    plan = get_object_or_404(_capacity_plan_queryset(), pk=pk)
    try:
        cloned = clone_capacity_plan(plan, actor=request.user)
    except (CapacityLifecycleConflict, CapacityConflict) as exc:
        return _capacity_conflict_response(exc)
    except IntegrityError:
        return _concurrent_capacity_response()
    except DjangoValidationError as exc:
        return _capacity_validation_response(exc)
    return Response(
        capacity_plan_payload(_current_capacity_plan(cloned.pk)),
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def publish_capacity_plan_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    plan = get_object_or_404(_capacity_plan_queryset(), pk=pk)
    serializer = CapacityPlanCommandSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    try:
        _require_expected_version(plan, data["expectedVersion"])
        published = publish_capacity_plan(
            plan,
            actor=request.user,
            reason=data["reason"],
            expected_fingerprint=data["expectedFingerprint"],
        )
    except (CapacityLifecycleConflict, CapacityConflict) as exc:
        return _capacity_conflict_response(exc)
    except IntegrityError:
        return _concurrent_capacity_response()
    except DjangoValidationError as exc:
        return _capacity_validation_response(exc)
    return Response(capacity_plan_payload(_current_capacity_plan(published.pk)))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def capacity_plan_entry_view(request, pk, lecturer_id):
    denied = _office_denied(request.user)
    if denied:
        return denied
    plan = get_object_or_404(_capacity_plan_queryset(), pk=pk)
    lecturer = get_object_or_404(
        Lecturer.objects.select_related("user"),
        pk=lecturer_id,
    )
    serializer = CapacityEntryWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return _update_capacity_plan_entry(
        request=request,
        plan=plan,
        lecturer=lecturer,
        serializer=serializer,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def semester_availability_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    semester = get_object_or_404(AcademicSemester, pk=pk)
    if request.method == "GET":
        windows = (
            _capacity_window_queryset()
            .filter(academic_semester=semester)
            .order_by(
                "lecturer__staff_no",
                "lecturer_id",
                "role",
                "starts_on",
                "ends_on",
                "pk",
            )
        )
        return Response([availability_payload(window) for window in windows])

    serializer = AvailabilityWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    lecturer = get_object_or_404(
        Lecturer.objects.select_related("user"),
        pk=data["lecturerId"],
    )
    try:
        window = create_availability_window(
            semester=semester,
            lecturer=lecturer,
            role=data["role"],
            starts_on=data["startsOn"],
            ends_on=data["endsOn"],
            actor=request.user,
            reason=data["reason"],
        )
    except (CapacityLifecycleConflict, CapacityConflict) as exc:
        return _capacity_conflict_response(exc)
    except IntegrityError:
        return _concurrent_capacity_response()
    except DjangoValidationError as exc:
        return _capacity_validation_response(exc)
    return Response(
        availability_payload(
            get_object_or_404(_capacity_window_queryset(), pk=window.pk)
        ),
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_availability_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    window = get_object_or_404(_capacity_window_queryset(), pk=pk)
    serializer = ReasonSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        cancelled = cancel_availability_window(
            window,
            actor=request.user,
            reason=serializer.validated_data["reason"],
        )
    except (CapacityLifecycleConflict, CapacityConflict) as exc:
        return _capacity_conflict_response(exc)
    except IntegrityError:
        return _concurrent_capacity_response()
    except DjangoValidationError as exc:
        return _capacity_validation_response(exc)
    return Response(
        availability_payload(
            get_object_or_404(_capacity_window_queryset(), pk=cancelled.pk)
        )
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def semester_capacity_audits_view(request, pk):
    denied = _office_denied(request.user)
    if denied:
        return denied
    semester = get_object_or_404(AcademicSemester, pk=pk)
    audits = (
        LecturerCapacityAudit.objects.filter(academic_semester=semester)
        .select_related("actor")
        .order_by("-created_at", "-pk")
    )
    return Response([capacity_audit_payload(audit) for audit in audits])
