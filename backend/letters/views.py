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


def _is_staff(user):
    # Keyed on the role, not ``is_staff`` — that flag only grants Django admin
    # access and should not confer template-management rights on its own.
    return bool(user.is_superuser or getattr(user, "role", None) in STAFF_ROLES)


def _require_staff(request):
    """Raise 403 unless the caller may manage templates."""
    if not _is_staff(request.user):
        raise PermissionDenied("Only office staff can manage letter templates.")


def _require_content(template):
    """Error dict when an Active template has no body, otherwise None."""
    if (
        template.status == LetterTemplate.Status.ACTIVE
        and not (template.content or "").strip()
    ):
        return {"content": "Letter content is required."}
    return None


def _actor(request):
    user = request.user
    return getattr(user, "full_name", "") or getattr(user, "email", "Office Staff")


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def templates_list(request):
    """GET: list templates (optional ?status=Active). POST: create one (staff)."""
    if request.method == "GET":
        queryset = LetterTemplate.objects.all()
        if not _is_staff(request.user):
            # Unpublished wording is office-internal; students and lecturers
            # only ever see live templates. Previously any authenticated user
            # could read drafts by passing ?status=Draft.
            queryset = queryset.filter(status=LetterTemplate.Status.ACTIVE)
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


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def templates_detail(request, pk):
    """Retrieve, update (PATCH), or delete a single template.

    PUT is intentionally unsupported: every serializer field except ``name`` is
    optional, so a PUT behaved identically to a PATCH rather than replacing the
    record, which is misleading for callers.
    """
    template = get_object_or_404(LetterTemplate, pk=pk)

    if request.method == "GET":
        if not _is_staff(request.user) and template.status != LetterTemplate.Status.ACTIVE:
            raise PermissionDenied("You cannot view this letter template.")
        return Response(template.to_public_dict())

    _require_staff(request)

    if request.method == "DELETE":
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = LetterTemplateSerializer(data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    for field, value in serializer.to_model_kwargs().items():
        setattr(template, field, value)

    invalid = _require_content(template)
    if invalid:
        return Response(invalid, status=status.HTTP_400_BAD_REQUEST)

    template.modified_by = _actor(request)
    template.save()
    return Response(template.to_public_dict())
