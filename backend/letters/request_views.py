"""Saved letter requests (UC23).

Mounted under ``/api/letters/`` by the project URLconf.

- Students generate a letter from an Active template. The server fills it from
  their record, issues the reference number, saves it and notifies them.
- Students see only their own letters; office staff see the whole register,
  can resend the notification and can revoke a letter issued in error.
- Like generation, reprints and Word downloads need the student to be Active.
"""
import re
from datetime import date

from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from announcements.models import Notification

from .details import letter_details
from .eligibility import inactive_student_refusal
from .models import GeneratedLetter, LetterTemplate
from .pdf_export import build_letter_pdf
from .placeholders import fill_placeholders, missing_labels, placeholder_problems
from .references import next_reference_number

PDF_TYPE = "application/pdf"
LETTERS_MODULE = "LETTERS"
LETTER_RECORD = "GENERATED_LETTER"


def _is_office(user):
    return getattr(user, "role", None) == User.Role.OFFICE_ADMIN


def _require_office(request):
    if not _is_office(request.user):
        raise PermissionDenied("Only office staff can manage issued letters.")


def _own_student(request):
    if getattr(request.user, "role", None) != User.Role.STUDENT:
        return None
    return request.user._related_or_none("student")


def _inactive_refusal(request):
    """A 403 response for a student who is not Active, otherwise None."""
    if _is_office(request.user):
        return None
    refusal = inactive_student_refusal(request.user)
    return Response(refusal, status=status.HTTP_403_FORBIDDEN) if refusal else None


def _letter_for(request, pk):
    """The letter if the caller is its student or office staff, else 404."""
    letter = get_object_or_404(GeneratedLetter, pk=pk)
    if _is_office(request.user):
        return letter
    student = _own_student(request)
    if student is None or letter.student_id != student.pk:
        raise NotFound("Letter not found.")
    return letter


def _notify(letter, *, event_key, title, summary, message, priority=Notification.Priority.NORMAL):
    Notification.objects.get_or_create(
        recipient=letter.student.user,
        event_key=event_key,
        defaults={
            "title": title[:255],
            "service": "Postgraduate Office",
            "summary": summary[:255],
            "message": message,
            "priority": priority,
            "is_announcement": False,
            "reference": letter.reference_number[:64],
            "module_label": "Letter Generation",
            "target_module": LETTERS_MODULE,
            "record_type": LETTER_RECORD,
            "record_id": str(letter.pk),
        },
    )


def _notify_ready(letter, event_key):
    _notify(
        letter,
        event_key=event_key,
        title=f"Letter ready: {letter.template_name}",
        summary=f"Reference {letter.reference_number}",
        message=(
            f"Your {letter.template_name} was issued on {letter.issued_on.strftime('%d %B %Y')} "
            f"with reference {letter.reference_number}. You can print it again or download "
            "the Word file from My Letters."
        ),
    )


def _parse_day(value, field):
    try:
        return date.fromisoformat(value), None
    except ValueError:
        return None, {field: "Use the YYYY-MM-DD format."}


def _office_register(params):
    """The full register for office staff, narrowed by the optional filters."""
    letters = GeneratedLetter.objects.all()
    search = (params.get("search") or "").strip()
    if search:
        letters = letters.filter(
            Q(reference_number__icontains=search)
            | Q(student_data__studentName__icontains=search)
            | Q(student_data__matricNumber__icontains=search)
        )
    for field, lookup in (("from", "issued_on__gte"), ("to", "issued_on__lte")):
        value = (params.get(field) or "").strip()
        if value:
            day, error = _parse_day(value, field)
            if error:
                return None, error
            letters = letters.filter(**{lookup: day})
    status_param = (params.get("status") or "").strip()
    if status_param:
        letters = letters.filter(status__iexact=status_param)
    return letters, None


def _generate(request):
    student = _own_student(request)
    if student is None:
        raise PermissionDenied("Only students can generate letters.")
    refusal = inactive_student_refusal(request.user)
    if refusal:
        return Response(refusal, status=status.HTTP_403_FORBIDDEN)

    try:
        template_id = int(request.data.get("templateId"))
    except (TypeError, ValueError):
        return Response(
            {"templateId": "Choose a letter template."}, status=status.HTTP_400_BAD_REQUEST
        )
    template = LetterTemplate.objects.filter(
        pk=template_id, status=LetterTemplate.Status.ACTIVE
    ).first()
    if template is None:
        raise NotFound("This letter template is no longer available.")
    unknown, malformed = placeholder_problems(template.content)
    if unknown or malformed or not template.content.strip():
        return Response(
            {
                "detail": "This letter template cannot be used right now. "
                "Please contact the postgraduate office."
            },
            status=status.HTTP_409_CONFLICT,
        )

    values = letter_details(student)
    missing = missing_labels(template.content, values)
    if missing:
        return Response(
            {
                "detail": (
                    f"Your student record is missing: {', '.join(missing)}. "
                    "Please contact the postgraduate office to complete it."
                ),
                "missingFields": missing,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    issued_on = timezone.localdate()
    with transaction.atomic():
        reference = next_reference_number(template.reference_prefix, issued_on.year)
        values.update(referenceNumber=reference, date=issued_on.strftime("%d %B %Y"))
        letter = GeneratedLetter.objects.create(
            student=student,
            template=template,
            template_name=template.name,
            letter_type=template.letter_type,
            reference_number=reference,
            content=fill_placeholders(template.content, values),
            student_data=values,
            issued_on=issued_on,
            requested_by=request.user,
        )
        _notify_ready(letter, f"letters:letter-ready:{letter.pk}")
    return Response(letter.to_public_dict(), status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def letter_requests(request):
    """GET: the caller's letters (office: the register). POST: generate one (students)."""
    if request.method == "POST":
        return _generate(request)
    if _is_office(request.user):
        letters, error = _office_register(request.query_params)
        if error:
            return Response(error, status=status.HTTP_400_BAD_REQUEST)
    else:
        student = _own_student(request)
        if student is None:
            raise PermissionDenied("Only students and office staff can view issued letters.")
        refused = _inactive_refusal(request)
        if refused:
            return refused
        letters = GeneratedLetter.objects.filter(student=student)
    return Response([letter.to_public_dict(include_content=False) for letter in letters])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def letter_detail(request, pk):
    """One letter with its wording. A revoked letter's wording is office-only."""
    refused = _inactive_refusal(request)
    if refused:
        return refused
    letter = _letter_for(request, pk)
    show_content = _is_office(request.user) or letter.status == GeneratedLetter.Status.ISSUED
    return Response(letter.to_public_dict(include_content=show_content))


def _file_name(letter):
    slug = re.sub(r"[^a-z0-9]+", "_", letter.template_name, flags=re.IGNORECASE).strip("_")
    matric = re.sub(r"[^a-z0-9]+", "", (letter.student_data or {}).get("matricNumber", ""), flags=re.IGNORECASE)
    return f"UM_{slug or 'Letter'}{f'_{matric}' if matric else ''}.pdf"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def letter_pdf(request, pk):
    """The letter as a PDF locked against editing, for its student or office staff."""
    refused = _inactive_refusal(request)
    if refused:
        return refused
    letter = _letter_for(request, pk)
    if letter.status == GeneratedLetter.Status.REVOKED:
        return Response(
            {"detail": "This letter was revoked and can no longer be downloaded."},
            status=status.HTTP_409_CONFLICT,
        )
    response = HttpResponse(build_letter_pdf(letter), content_type=PDF_TYPE)
    response["Content-Disposition"] = f'attachment; filename="{_file_name(letter)}"'
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resend_notification(request, pk):
    """Office: send the student the "letter ready" notification again."""
    _require_office(request)
    with transaction.atomic():
        letter = get_object_or_404(GeneratedLetter.objects.select_for_update(), pk=pk)
        if letter.status == GeneratedLetter.Status.REVOKED:
            return Response(
                {"detail": "This letter was revoked, so there is nothing to resend."},
                status=status.HTTP_409_CONFLICT,
            )
        if letter.student is None:
            return Response(
                {"detail": "The student's account no longer exists."},
                status=status.HTTP_409_CONFLICT,
            )
        letter.resend_count += 1
        letter.save(update_fields=["resend_count"])
        _notify_ready(letter, f"letters:letter-ready:{letter.pk}:resend-{letter.resend_count}")
    return Response(
        {"detail": f"Notification sent again to {letter.student_data.get('studentName') or 'the student'}."}
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def revoke_letter(request, pk):
    """Office: revoke a letter issued in error. The reason is shown to the student."""
    _require_office(request)
    reason = str(request.data.get("reason") or "").strip()
    if not reason:
        return Response(
            {"reason": "Give a reason for revoking this letter."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(reason) > 500:
        return Response(
            {"reason": "Keep the reason under 500 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    with transaction.atomic():
        letter = get_object_or_404(GeneratedLetter.objects.select_for_update(), pk=pk)
        if letter.status == GeneratedLetter.Status.REVOKED:
            return Response(
                {"detail": "This letter is already revoked."}, status=status.HTTP_409_CONFLICT
            )
        letter.status = GeneratedLetter.Status.REVOKED
        letter.revoked_at = timezone.now()
        letter.revoked_by = request.user
        letter.revoke_reason = reason
        letter.save(update_fields=["status", "revoked_at", "revoked_by", "revoke_reason"])
        if letter.student is not None:
            _notify(
                letter,
                event_key=f"letters:letter-revoked:{letter.pk}",
                title=f"Letter revoked: {letter.template_name}",
                summary=f"Reference {letter.reference_number}",
                message=(
                    f"The postgraduate office revoked your {letter.template_name} "
                    f"({letter.reference_number}). Reason: {reason}"
                ),
                priority=Notification.Priority.HIGH,
            )
    return Response(letter.to_public_dict())
