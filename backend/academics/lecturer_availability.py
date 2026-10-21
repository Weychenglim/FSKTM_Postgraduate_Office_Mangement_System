"""Lecturer-owned availability restrictions, using the shared capacity lifecycle."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Lecturer, User

from .capacity import CapacityConflict
from .capacity_services import (
    CapacityLifecycleConflict,
    WRITABLE_SEMESTER_LIFECYCLES,
    cancel_availability_window,
    create_availability_window,
)
from .models import AcademicSemester, LecturerAvailabilityWindow
from .serializers import (
    CapacityReasonSerializer,
    StrictCapacitySerializer,
    availability_payload,
    semester_payload,
)
from .views import (
    _capacity_conflict_response,
    _capacity_page_response,
    _capacity_validation_response,
    _capacity_window_queryset,
    _concurrent_capacity_response,
    _paginate_capacity_queryset,
)


class LiteralConfirmationField(serializers.BooleanField):
    def to_internal_value(self, data):
        if data is not True:
            raise serializers.ValidationError("Explicit confirmation is required.")
        return True


class MyAvailabilityWriteSerializer(StrictCapacitySerializer):
    semesterId = serializers.IntegerField(min_value=1)
    role = serializers.ChoiceField(choices=LecturerAvailabilityWindow.Role.choices)
    startsOn = serializers.DateField()
    endsOn = serializers.DateField()
    reason = serializers.CharField(allow_blank=False)
    confirmed = LiteralConfirmationField()


class MyAvailabilityCancelSerializer(CapacityReasonSerializer):
    confirmed = LiteralConfirmationField()


def _own_lecturer(user):
    if user.role != User.Role.LECTURER or not user.is_active:
        raise PermissionDenied("Only Lecturers can manage their own availability.")
    lecturer = (
        Lecturer.objects.select_related("user", "supervisor", "panel")
        .filter(user_id=user.pk)
        .first()
    )
    if lecturer is None:
        raise PermissionDenied("A Lecturer profile is required.")
    return lecturer


def _selected_semester(semesters, query_params):
    if "semesterId" in query_params:
        try:
            semester_id = int(query_params["semesterId"])
        except (TypeError, ValueError):
            raise Http404("Academic semester not found.")
        semester = next((item for item in semesters if item.pk == semester_id), None)
        if semester is None:
            raise Http404("Academic semester not found.")
        return semester
    for lifecycle in (
        AcademicSemester.Lifecycle.ACTIVE,
        AcademicSemester.Lifecycle.DRAFT,
    ):
        semester = next(
            (item for item in semesters if item.lifecycle_status == lifecycle), None
        )
        if semester is not None:
            return semester
    return semesters[0] if semesters else None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def my_availability_view(request):
    lecturer = _own_lecturer(request.user)
    if request.method == "GET":
        semesters = list(AcademicSemester.objects.order_by("-starts_on", "-pk"))
        semester = _selected_semester(semesters, request.query_params)
        roles = [
            role
            for role, profile in (
                (LecturerAvailabilityWindow.Role.SUPERVISOR, "supervisor"),
                (LecturerAvailabilityWindow.Role.PANEL, "panel"),
            )
            if hasattr(lecturer, profile)
        ]
        windows = (
            _capacity_window_queryset()
            .filter(lecturer=lecturer, academic_semester=semester)
            .order_by("-starts_on", "-pk")
        )
        windows, pagination = _paginate_capacity_queryset(request, windows)
        return _capacity_page_response(
            {
                "semesters": [semester_payload(item) for item in semesters],
                "semesterId": semester.pk if semester else None,
                "restrictions": [availability_payload(window) for window in windows],
                "roles": roles,
                "canManage": bool(
                    semester
                    and semester.lifecycle_status in WRITABLE_SEMESTER_LIFECYCLES
                    and lecturer.lifecycle_status == Lecturer.Lifecycle.ACTIVE
                    and roles
                ),
                "pagination": pagination,
            },
            pagination,
        )

    serializer = MyAvailabilityWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    semester = get_object_or_404(AcademicSemester, pk=data["semesterId"])
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
def cancel_my_availability_view(request, pk):
    lecturer = _own_lecturer(request.user)
    window = get_object_or_404(_capacity_window_queryset(), pk=pk, lecturer=lecturer)
    serializer = MyAvailabilityCancelSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        cancelled = cancel_availability_window(
            window, actor=request.user, reason=serializer.validated_data["reason"]
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
