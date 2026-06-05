"""Letter-template API: list/create + retrieve/update/delete.

Mounted under ``/api/letter-templates/`` by the project URLconf.

- Any authenticated user can read templates (students fetch ``?status=Active``).
- Only office staff / coordinators (or Django staff/superusers) can create,
  update, or delete them.
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import LetterTemplate
from .serializers import LetterTemplateSerializer

# Roles allowed to manage (write) templates. Students/lecturers are read-only.
STAFF_ROLES = {"Office Staff/Admin", "Programme Coordinator"}


def _require_staff(request):
    """Raise 403 unless the caller may manage templates."""
    user = request.user
    if user.is_staff or user.is_superuser or getattr(user, "role", None) in STAFF_ROLES:
        return
    raise PermissionDenied("Only office staff can manage letter templates.")


def _actor(request):
    user = request.user
    return getattr(user, "full_name", "") or getattr(user, "email", "Office Staff")


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def templates_list(request):
    """GET: list templates (optional ?status=Active). POST: create one (staff)."""
    if request.method == "GET":
        queryset = LetterTemplate.objects.all()
        status_param = request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status__iexact=status_param)
        return Response([t.to_public_dict() for t in queryset])

    _require_staff(request)
    serializer = LetterTemplateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if not serializer.validated_data.get("content", "").strip():
        return Response(
            {"content": "Letter content is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    template = LetterTemplate.objects.create(
        modified_by=_actor(request), **serializer.to_model_kwargs()
    )
    return Response(template.to_public_dict(), status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def templates_detail(request, pk):
    """Retrieve, update (PUT/PATCH), or delete a single template."""
    template = get_object_or_404(LetterTemplate, pk=pk)

    if request.method == "GET":
        return Response(template.to_public_dict())

    _require_staff(request)

    if request.method == "DELETE":
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == "PATCH"
    serializer = LetterTemplateSerializer(data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    for field, value in serializer.to_model_kwargs().items():
        setattr(template, field, value)
    template.modified_by = _actor(request)
    template.save()
    return Response(template.to_public_dict())
