from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from . import capacity_reassessment as service

class StaffReader(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            service.require_reader(request.user)
            return True
        except service.ReassessmentForbidden:
            return False

class DecisionInput(serializers.Serializer):
    reason = serializers.CharField(max_length=4000, allow_blank=False)
    expectedEventId = serializers.IntegerField(min_value=1, allow_null=True)
    expectedStatus = serializers.CharField(max_length=40)
    expectedAuthorizationId = serializers.IntegerField(min_value=1, allow_null=True)
    expectedActiveSemesterId = serializers.IntegerField(min_value=1, required=False)

class FilterInput(serializers.Serializer):
    studentId = serializers.IntegerField(min_value=1, required=False)

def perform(action):
    try:
        return Response(action())
    except service.ReassessmentForbidden as exc:
        return Response({'error': str(exc)}, status=403)
    except (service.ReassessmentConflict, IntegrityError) as exc:
        return Response({'error': str(exc) if isinstance(exc, service.ReassessmentConflict) else 'The record changed; refresh before retrying.'}, status=409)
    except ObjectDoesNotExist:
        return Response({'error': 'Appointment request was not found.'}, status=404)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

@api_view(['GET'])
@permission_classes([StaffReader])
def collection(request):
    data = FilterInput(data=request.query_params)
    data.is_valid(raise_exception=True)
    return perform(lambda: service.collection(request.user, data.validated_data.get('studentId')))

@api_view(['POST'])
@permission_classes([StaffReader])
def decision(request, kind, pk, action):
    if action not in ('authorize', 'revoke'):
        return Response({'error': 'Unknown reassessment action.'}, status=404)
    data = DecisionInput(data=request.data)
    data.is_valid(raise_exception=True)
    if action == 'authorize' and 'expectedActiveSemesterId' not in data.validated_data:
        return Response({'error': 'Provide the current Active semester.'}, status=400)
    return perform(lambda: service.decide(actor=request.user, kind=kind, pk=pk, action=action, data=data.validated_data))
