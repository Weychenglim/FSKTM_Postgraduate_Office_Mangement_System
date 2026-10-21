from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.views.decorators.cache import never_cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers

from academics.services import current_effective_semester
from accounts.eligibility import student_is_workflow_eligible
from accounts.models import User, StudentRegistry
from accounts.validators import validate_phone

from .section_a import DECLARATION_TEXT, proposal_requirement, student_particulars


class ApplicationContactSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=32, allow_blank=True, required=False, validators=[validate_phone])
    address = serializers.CharField(max_length=2000, allow_blank=True, required=False)

    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - {"phone", "address"}:
            raise serializers.ValidationError({"detail": "Only phone and address can be changed here."})
        for key, value in data.items():
            if not isinstance(value, str):
                raise serializers.ValidationError({key: "Enter text."})
        return super().to_internal_value(data)


@never_cache
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def application_contact_view(request):
    if request.user.role != User.Role.STUDENT:
        return Response({"detail": "Only students can update their own application contact details."}, status=403)
    try:
        student = request.user.student
    except ObjectDoesNotExist:
        return Response({"detail": "The student profile is not available."}, status=403)
    if not student_is_workflow_eligible(student):
        return Response({"detail": "Your lifecycle status does not permit a new supervisor application."}, status=403)
    serializer = ApplicationContactSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        # Serialise concurrent self-service updates; never accept a target user ID.
        user = User.objects.select_for_update().get(pk=request.user.pk)
        if "phone" in serializer.validated_data:
            user.phone = serializer.validated_data["phone"]
            user.save(update_fields=["phone"])
        if "address" in serializer.validated_data:
            registry, _ = StudentRegistry.objects.get_or_create(student=student)
            registry.address = serializer.validated_data["address"]
            registry.save(update_fields=["address", "updated_at"])
        particulars = student_particulars(student, current_effective_semester())
    return Response({"studentParticulars": particulars})


@never_cache
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def application_prefill_view(request):
    if request.user.role != User.Role.STUDENT:
        return Response({"detail": "Only students can view their application prefill."}, status=403)
    try:
        student = request.user.student
    except ObjectDoesNotExist:
        return Response({"detail": "The student profile is not available."}, status=403)
    if not student_is_workflow_eligible(student):
        return Response({"detail": "Your lifecycle status does not permit a new supervisor application."}, status=403)
    requirement = proposal_requirement()
    from .models import SupervisorAppointment
    if SupervisorAppointment.objects.filter(student=student, status="ACTIVE").exists():
        return Response({"detail": "Only the Office can initiate a Supervisor change. Contact the Office for assistance."}, status=403)
    return Response({
        "studentParticulars": student_particulars(student, current_effective_semester()),
        "proposalRequirementCode": requirement.code if requirement else None,
        "declarationText": DECLARATION_TEXT,
    })


@never_cache
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def application_section_a_view(request, pk):
    # Reuse the exact-record permission boundary without importing views at module load.
    from .views import can_view_supervisor_application, get_supervisor_application

    application = get_supervisor_application(pk)
    if application is None:
        return Response({"detail": "Supervisor application was not found."}, status=404)
    if not can_view_supervisor_application(request.user, application):
        return Response({"detail": "You do not have permission to view this supervisor application."}, status=403)
    return Response({"sectionA": application.section_a})
