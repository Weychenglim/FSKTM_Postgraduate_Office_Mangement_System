"""Student Registry API (UC05-UC09), mounted under ``/api/registry/``.

Office Staff/Admin manage postgraduate student records here. The read shape
matches the frontend ``StudentRecord`` type so the existing Registry Management
screen can switch from mocks without changing its rendering.

Supervisor is intentionally returned blank: the supervisor relationship lives in
the teammate-owned ``appointments`` app, and this module does not reach into it.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Student, StudentRegistry

User = get_user_model()

# Mirrors the palette the Registry Management screen already renders.
# The system programme list from PROJECT_REQUIREMENTS.md. Mirrored in
# frontend/src/constants/programmes.ts — keep the two in step.
APPROVED_PROGRAMMES = [
    "MASTER OF DATA SCIENCE (COURSEWORK)",
    "MASTER OF CYBER SECURITY (COURSEWORK)",
    "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
]

AVATAR_PALETTE = [
    "bg-blue-100 text-blue-850 border-blue-200",
    "bg-indigo-100 text-indigo-850 border-indigo-200",
    "bg-emerald-100 text-emerald-850 border-emerald-200",
    "bg-amber-100 text-amber-850 border-amber-200",
    "bg-rose-100 text-rose-850 border-rose-200",
    "bg-violet-100 text-violet-850 border-violet-200",
]


def _require_office_admin(request):
    user = request.user
    if user.is_superuser or getattr(user, "role", None) == User.Role.OFFICE_ADMIN:
        return
    raise PermissionDenied("Only Office Staff/Admin may manage the student registry.")


def _initials(full_name: str) -> str:
    parts = [p for p in full_name.split() if p]
    return "".join(p[0].upper() for p in parts[:2]) or "ST"


def _avatar_bg(key: str) -> str:
    return AVATAR_PALETTE[sum(ord(c) for c in key) % len(AVATAR_PALETTE)]


def _registry_or_none(student):
    try:
        return student.registry
    except ObjectDoesNotExist:
        return None


def to_record(student) -> dict:
    """Shape a Student (+ optional registry row) as the frontend expects."""
    user = student.user
    registry = _registry_or_none(student)
    return {
        "id": student.matric_no,
        "name": user.full_name,
        "avatarText": _initials(user.full_name),
        "avatarBg": _avatar_bg(student.matric_no),
        "programme": student.programme,
        "academicStatus": student.status,
        "accountStatus": "Verified" if user.is_active else "Suspended",
        "semester": (registry.current_semester if registry else "")
        or student.intake_semester,
        "email": user.email,
        "phone": user.phone,
        # Owned by the appointments module; not read from here.
        "supervisor": "",
        "intakeDate": student.intake_semester,
        # Lets the office spot accounts that were registered but never
        # activated — e.g. because the invitation bounced.
        "activated": user.has_usable_password(),
        "lastLogin": user.last_login.isoformat() if user.last_login else None,
    }


class StudentRecordCreateSerializer(serializers.Serializer):
    """Office Staff registering a new postgraduate student."""

    id = serializers.CharField(max_length=64)
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    programme = serializers.ChoiceField(choices=APPROVED_PROGRAMMES, required=False)
    phone = serializers.CharField(max_length=32, allow_blank=True, required=False)
    semester = serializers.CharField(max_length=64, allow_blank=True, required=False)
    intakeDate = serializers.CharField(max_length=32, allow_blank=True, required=False)
    academicStatus = serializers.ChoiceField(
        choices=Student.Status.choices, required=False, default=Student.Status.ACTIVE
    )
    sendInvite = serializers.BooleanField(required=False, default=True)

    def validate_id(self, value):
        matric = value.strip()
        if not matric:
            raise serializers.ValidationError("Matric number is required.")
        # Case-insensitive: matric_no is unique case-*sensitively* in Postgres,
        # and near-duplicates make the detail route ambiguous.
        if Student.objects.filter(matric_no__iexact=matric).exists():
            raise serializers.ValidationError(
                f"A student with matric number '{matric}' already exists."
            )
        return matric

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email


class StudentRecordUpdateSerializer(serializers.Serializer):
    """Fields Office Staff may correct from the Registry screen."""

    programme = serializers.ChoiceField(choices=APPROVED_PROGRAMMES, required=False)
    academicStatus = serializers.ChoiceField(
        choices=Student.Status.choices, required=False
    )
    accountStatus = serializers.ChoiceField(
        choices=["Verified", "Suspended"], required=False
    )
    phone = serializers.CharField(max_length=32, allow_blank=True, required=False)
    semester = serializers.CharField(max_length=64, allow_blank=True, required=False)
    intakeDate = serializers.CharField(max_length=32, allow_blank=True, required=False)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def student_records_view(request):
    """List student registry records, or register a new student."""
    _require_office_admin(request)

    if request.method == "POST":
        return _create_student(request)

    queryset = Student.objects.select_related("user", "registry").all()
    search = (request.query_params.get("search") or "").strip()
    if search:
        queryset = queryset.filter(
            Q(matric_no__icontains=search)
            | Q(user__full_name__icontains=search)
            | Q(user__email__icontains=search)
            | Q(programme__icontains=search)
        )
    academic_status = (request.query_params.get("status") or "").strip()
    if academic_status:
        queryset = queryset.filter(status__iexact=academic_status)

    return Response([to_record(student) for student in queryset])


def send_activation_email(user) -> bool:
    """Email the new student a link to choose their first password.

    Uses the same signed token as password reset, so no credential is ever
    generated or transmitted. Returns whether the send succeeded — the office
    needs to know when an address bounced.
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    try:
        send_mail(
            "Activate your FSKTM Postgraduate Office account",
            (
                f"Hello {user.full_name},\n\n"
                "An account has been created for you at the FSKTM Postgraduate "
                "Office. Choose your password using the link below:\n\n"
                f"{link}\n\n"
                "The link expires in 30 minutes. If it expires, use "
                "\"Forgot password\" on the sign-in page to request a new one.\n\n"
                "— FSKTM Postgraduate Office"
            ),
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        return True
    except Exception:
        # Never fail the registration because mail is down; the office is told
        # in the response and can resend.
        return False


def _create_student(request):
    """Create the login account and the Student profile in one transaction.

    No password is set. The account starts with an unusable password and the
    student chooses their own through the activation link, so the office never
    handles or transmits a temporary credential.
    """
    serializer = StudentRecordCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        with transaction.atomic():
            user = User(
                email=data["email"],
                full_name=data["name"].strip(),
                role=User.Role.STUDENT,
                phone=data.get("phone", ""),
            )
            user.set_unusable_password()
            user.save()

            student = Student.objects.create(
                user=user,
                matric_no=data["id"],
                programme=data.get("programme", ""),
                status=data.get("academicStatus", Student.Status.ACTIVE),
                intake_semester=data.get("intakeDate", ""),
            )
            semester = data.get("semester", "")
            if semester:
                StudentRegistry.objects.create(student=student, current_semester=semester)
    except IntegrityError:
        # The serializer's uniqueness checks leave a small window before the
        # insert; the database is the authority, so report the conflict rather
        # than letting it surface as a 500.
        return Response(
            {"error": "That matric number or email was just registered. Please reload."},
            status=status.HTTP_409_CONFLICT,
        )

    payload = to_record(student)
    if data.get("sendInvite", True):
        payload["invitationSent"] = send_activation_email(user)
    else:
        payload["invitationSent"] = False
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def student_record_detail_view(request, matric_no):
    """Retrieve or correct one student's registry record."""
    _require_office_admin(request)

    matches = list(
        Student.objects.select_related("user", "registry").filter(
            matric_no__iexact=matric_no
        )[:2]
    )
    if not matches:
        return Response(
            {"error": f"No student found with matric number '{matric_no}'."},
            status=status.HTTP_404_NOT_FOUND,
        )
    if len(matches) > 1:
        # `matric_no` is unique but case-sensitively so, so `iexact` can match
        # more than one row. Picking one arbitrarily previously edited (and
        # suspended) the wrong student, so refuse instead of guessing.
        return Response(
            {
                "error": (
                    f"More than one student matches '{matric_no}' when case is "
                    "ignored. Correct the duplicate matric numbers first."
                )
            },
            status=status.HTTP_409_CONFLICT,
        )
    student = matches[0]

    if request.method == "GET":
        return Response(to_record(student))

    serializer = StudentRecordUpdateSerializer(data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    with transaction.atomic():
        student_fields = []
        if "programme" in data:
            student.programme = data["programme"]
            student_fields.append("programme")
        if "academicStatus" in data:
            student.status = data["academicStatus"]
            student_fields.append("status")
        if "intakeDate" in data:
            student.intake_semester = data["intakeDate"]
            student_fields.append("intake_semester")
        if student_fields:
            student.save(update_fields=student_fields)

        user_fields = []
        if "phone" in data:
            student.user.phone = data["phone"]
            user_fields.append("phone")
        if "accountStatus" in data:
            # Suspending yourself invalidates your own session mid-request, and
            # suspending a superuser locks the system's own escape hatch.
            if student.user_id == request.user.pk:
                raise PermissionDenied("You cannot change your own account status.")
            if student.user.is_superuser:
                raise PermissionDenied("You cannot change a superuser's account status.")
            student.user.is_active = data["accountStatus"] == "Verified"
            user_fields.append("is_active")
        if user_fields:
            student.user.save(update_fields=user_fields)

        if "semester" in data:
            registry, _ = StudentRegistry.objects.get_or_create(student=student)
            registry.current_semester = data["semester"]
            registry.save(update_fields=["current_semester", "updated_at"])

    student.refresh_from_db()
    return Response(to_record(student))
