"""Authenticated APIs for supporting supervision, with no document or Marks projections."""

from functools import wraps

from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Student
from . import co_supervision as service


def guarded(methods):
    def decorate(function):
        @api_view(methods)
        @permission_classes([IsAuthenticated])
        @wraps(function)
        def view(request, *args, **kwargs):
            try:
                return function(request, *args, **kwargs)
            except service.CoSupervisionForbidden as exc:
                return Response({"detail": str(exc)}, status=403)
            except service.CoSupervisionConflict as exc:
                return Response({"detail": str(exc)}, status=409)
            except IntegrityError:
                return Response(
                    {
                        "detail": "A conflicting team decision occurred. Refresh and try again."
                    },
                    status=409,
                )
            except ObjectDoesNotExist:
                return Response(
                    {"detail": "The requested record was not found."}, status=404
                )
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=400)

        return view

    return decorate


class NominationInput(serializers.Serializer):
    studentId = serializers.IntegerField(min_value=1)
    candidateId = serializers.IntegerField(min_value=1)
    justification = serializers.CharField(allow_blank=False)
    replacesAppointmentId = serializers.IntegerField(
        min_value=1, required=False, allow_null=True
    )


class DecisionInput(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class ClosureInput(serializers.Serializer):
    reason = serializers.CharField(allow_blank=False)
    outcome = serializers.ChoiceField(choices=["COMPLETED", "WITHDRAWN", "OTHER"])


@guarded(["GET"])
def workspace_view(request):
    return Response(service.workspace(request.user))


@guarded(["GET"])
def team_view(request, student_id):
    student = Student.objects.select_related("user").get(pk=student_id)
    return Response(service.serialize_team(student, request.user))


@guarded(["GET"])
def candidates_view(request, student_id):
    student = Student.objects.select_related("user").get(pk=student_id)
    return Response(service.candidates(student=student, actor=request.user))


@guarded(["POST"])
def nominations_view(request):
    data = NominationInput(data=request.data)
    data.is_valid(raise_exception=True)
    row = service.nominate(
        actor=request.user,
        student_id=data.validated_data["studentId"],
        candidate_id=data.validated_data["candidateId"],
        justification=data.validated_data["justification"],
        replaces_appointment_id=data.validated_data.get("replacesAppointmentId"),
    )
    return Response(service.serialize_nomination(row, request.user), status=201)


@guarded(["POST"])
def decision_view(request, pk, action):
    data = DecisionInput(data=request.data)
    data.is_valid(raise_exception=True)
    row = service.decide(
        nomination_id=pk,
        actor=request.user,
        action=action,
        reason=data.validated_data["reason"],
    )
    return Response(service.serialize_nomination(row, request.user))


@guarded(["POST"])
def end_view(request, pk):
    data = ClosureInput(data=request.data)
    data.is_valid(raise_exception=True)
    row = service.end_appointment(
        appointment_id=pk, actor=request.user, **data.validated_data
    )
    return Response(service.serialize_appointment(row, request.user))
