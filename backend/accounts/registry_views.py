"""Student Registry API (UC05-UC09), mounted under ``/api/registry/``.

Office Staff/Admin manage postgraduate student records here; Programme
Coordinators and Lecturers get read-only access to the students in their scope.
The read shape matches the frontend ``StudentRecord`` type.

The supervisor shown on a record is read, never written, from the student's
active primary ``SupervisorAppointment`` in the ``appointments`` app.
"""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import get_connection, send_mail
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Prefetch, Q
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from appointments.models import (
    CoSupervisorAppointment,
    StudentResearchProfile,
    SupervisorAppointment,
)

from .account_emails import activation_email
from .authorization import coordinator_scope_q
from .models import Lecturer, OfficeStaff, RegistryImportBatch, Student, StudentRegistry
from .participant_lifecycle import ParticipantLifecycleConflict, transition_student
from .programmes import APPROVED_PROGRAMMES
from .registry_import import ImportFileError, read_import_file, validate_import_rows
from .session_tokens import blacklist_user_refresh_tokens
from .throttles import AccessLinkRateThrottle
from .tokens import activation_link
from .validators import matric_problem, validate_phone
from .views import send_password_reset_email

User = get_user_model()
logger = logging.getLogger(__name__)

# Mirrors the palette the Registry Management screen already renders.
AVATAR_PALETTE = [
    "bg-blue-100 text-blue-850 border-blue-200",
    "bg-indigo-100 text-indigo-850 border-indigo-200",
    "bg-emerald-100 text-emerald-850 border-emerald-200",
    "bg-amber-100 text-amber-850 border-amber-200",
    "bg-rose-100 text-rose-850 border-rose-200",
    "bg-violet-100 text-violet-850 border-violet-200",
]


def _require_office_admin(request):
    if getattr(request.user, "role", None) == User.Role.OFFICE_ADMIN:
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


def _registry_scope(user):
    """Students ``user`` may read, or ``None`` when they have no registry access.

    Office Staff/Admin read everything. Programme Coordinators read the
    programmes they currently manage (their own while eligible, plus active
    delegations), and Coordinators and Lecturers read the students they
    currently supervise or co-supervise.
    """
    if user.role == User.Role.OFFICE_ADMIN:
        return Student.objects.all()
    if user.role not in (User.Role.COORDINATOR, User.Role.LECTURER):
        return None
    scope = Q(
        supervisor_appointments__supervisor=user,
        supervisor_appointments__status=SupervisorAppointment.Status.ACTIVE,
    ) | Q(
        co_supervisor_appointments__supervisor=user,
        co_supervisor_appointments__status=CoSupervisorAppointment.Status.ACTIVE,
    )
    scope |= coordinator_scope_q(user)
    return Student.objects.filter(scope).distinct()


def _require_registry_reader(request):
    scope = _registry_scope(request.user)
    if scope is None:
        raise PermissionDenied("You do not have access to the student registry.")
    return scope


def _active_supervision():
    return Prefetch(
        "supervisor_appointments",
        queryset=SupervisorAppointment.objects.filter(
            status=SupervisorAppointment.Status.ACTIVE
        ).select_related("supervisor__lecturer"),
        to_attr="active_supervision",
    )


def _supervisor_of(student):
    supervision = getattr(student, "active_supervision", None)
    if supervision is None:
        supervision = list(
            student.supervisor_appointments.filter(
                status=SupervisorAppointment.Status.ACTIVE
            ).select_related("supervisor__lecturer")
        )
    return supervision[0].supervisor if supervision else None


def to_record(student) -> dict:
    """Shape a Student (+ optional registry row) as the frontend expects."""
    user = student.user
    registry = _registry_or_none(student)
    supervisor = _supervisor_of(student)
    supervisor_profile = supervisor._related_or_none("lecturer") if supervisor else None
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
        "supervisor": supervisor.full_name if supervisor else "",
        "supervisorStaffNo": supervisor_profile.staff_no if supervisor_profile else "",
        "intakeDate": student.intake_semester,
        # Lets the office spot accounts that were registered but never
        # activated, e.g. because the invitation bounced.
        "activated": user.has_usable_password(),
        "lastLogin": (user.last_portal_login or user.last_login).isoformat()
        if (user.last_portal_login or user.last_login)
        else None,
    }


class StudentRecordCreateSerializer(serializers.Serializer):
    """Office Staff registering a new postgraduate student."""

    id = serializers.CharField(max_length=64)
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField(max_length=254)
    programme = serializers.ChoiceField(choices=APPROVED_PROGRAMMES, required=False)
    phone = serializers.CharField(
        max_length=32, allow_blank=True, required=False, validators=[validate_phone]
    )
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
        problem = matric_problem(matric)
        if problem:
            raise serializers.ValidationError(problem)
        # Sign-in accepts a matric or a staff number, so one value must not be both.
        if (
            OfficeStaff.objects.filter(staff_no__iexact=matric).exists()
            or Lecturer.objects.filter(staff_no__iexact=matric).exists()
        ):
            raise serializers.ValidationError(
                f"'{matric}' is already used as a staff number."
            )
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

    def validate_academicStatus(self, value):
        if value != Student.Status.ACTIVE:
            raise serializers.ValidationError(
                "New students start as Active. Change the status afterwards with a reason."
            )
        return value


class StudentRecordUpdateSerializer(serializers.Serializer):
    """Fields Office Staff may correct from the Registry screen."""

    programme = serializers.ChoiceField(choices=APPROVED_PROGRAMMES, required=False)
    academicStatus = serializers.ChoiceField(
        choices=Student.Status.choices, required=False
    )
    statusReason = serializers.CharField(
        max_length=1000, allow_blank=True, required=False
    )
    accountStatus = serializers.ChoiceField(
        choices=["Verified", "Suspended"], required=False
    )
    phone = serializers.CharField(
        max_length=32, allow_blank=True, required=False, validators=[validate_phone]
    )
    semester = serializers.CharField(max_length=64, allow_blank=True, required=False)
    intakeDate = serializers.CharField(max_length=32, allow_blank=True, required=False)

    def to_internal_value(self, data):
        # An ignored key read as "saved" to the office (e.g. a name or email
        # edit), so anything this form cannot change is refused outright.
        if hasattr(data, "keys"):
            unknown = sorted(set(data.keys()) - set(self.fields))
            if unknown:
                raise serializers.ValidationError(
                    {key: ["This field cannot be changed from the registry."] for key in unknown}
                )
        return super().to_internal_value(data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def student_records_view(request):
    """List the records the caller may read, or register a new student."""
    if request.method == "POST":
        _require_office_admin(request)
        return _create_student(request)

    queryset = _require_registry_reader(request).select_related(
        "user", "registry"
    ).prefetch_related(_active_supervision())
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
    programme = (request.query_params.get("programme") or "").strip()
    if programme:
        queryset = queryset.filter(programme__iexact=programme)
    supervisor = (request.query_params.get("supervisor") or "").strip()
    if supervisor:
        queryset = queryset.filter(
            Q(supervisor_appointments__status=SupervisorAppointment.Status.ACTIVE)
            & (
                Q(supervisor_appointments__supervisor__full_name__icontains=supervisor)
                | Q(supervisor_appointments__supervisor__lecturer__staff_no__iexact=supervisor)
            )
        ).distinct()

    return Response([to_record(student) for student in queryset])


def send_activation_email(user, connection=None) -> bool:
    """Email the new student a link to choose their first password.

    The link has no time limit and stops working once a password is set (see
    ``accounts.tokens``), so no credential is ever generated or transmitted.
    Returns whether the send succeeded; the office needs to know when an
    address bounced.
    """
    subject, message = activation_email(user, activation_link(user))
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
            connection=connection,
        )
        return True
    except Exception:
        # Never fail the registration because mail is down; the office is told
        # in the response and can resend.
        logger.exception("Activation email to user %s could not be sent.", user.pk)
        return False


def _register_student(data):
    """Create the login account and the Student profile in one transaction.

    No password is set. The account starts with an unusable password and the
    student chooses their own through the activation link, so the office never
    handles or transmits a temporary credential.

    Returns the new ``Student``; raises ``IntegrityError`` if the matric number
    or email was taken after validation. The caller sends the invitation.
    """
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
    return student


def _create_student(request):
    serializer = StudentRecordCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        student = _register_student(serializer.validated_data)
    except IntegrityError:
        # The serializer's uniqueness checks leave a small window before the
        # insert; the database is the authority, so report the conflict rather
        # than letting it surface as a 500.
        return Response(
            {"error": "That matric number or email was just registered. Please reload."},
            status=status.HTTP_409_CONFLICT,
        )

    invitation_sent = (
        send_activation_email(student.user)
        if serializer.validated_data.get("sendInvite", True)
        else False
    )
    payload = to_record(student)
    payload["invitationSent"] = invitation_sent
    return Response(payload, status=status.HTTP_201_CREATED)


def _first_error(errors):
    for messages in errors.values():
        if messages:
            return str(messages[0])
    return "The record could not be created."


def _import_row(row):
    """Create one Ready row. Returns ``(result, student)``; student is None on failure."""
    serializer = StudentRecordCreateSerializer(
        data={
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "programme": row["programme"],
            "phone": row["phone"],
        }
    )
    if not serializer.is_valid():
        return {**row, "result": "failed", "issue": _first_error(serializer.errors)}, None
    try:
        student = _register_student(serializer.validated_data)
    except IntegrityError:
        return {
            **row,
            "result": "failed",
            "issue": "this matric number or email was registered during the import",
        }, None
    except DatabaseError:
        logger.exception("Import row %s could not be saved.", row.get("line"))
        return {**row, "result": "failed", "issue": "the record could not be saved"}, None
    return {**row, "result": "created", "invitationSent": False}, student


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def student_import_view(request):
    """Bulk-import students from a CSV or XLSX file (UC04).

    ``dryRun`` checks every row and writes nothing. Otherwise each Ready row is
    created on its own, duplicates are skipped, other problem rows are left
    out, and the run is recorded as a ``RegistryImportBatch``.
    """
    _require_office_admin(request)

    uploaded = request.FILES.get("file")
    if uploaded is None:
        return Response(
            {"error": "Choose a CSV or XLSX file to import."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        rows = validate_import_rows(read_import_file(uploaded))
    except ImportFileError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if str(request.data.get("dryRun", "")).lower() in {"1", "true", "yes"}:
        return Response({"fileName": uploaded.name, "rows": rows})

    results = []
    new_students = []
    for row in rows:
        if row["status"] == "Ready":
            result, student = _import_row(row)
            results.append(result)
            if student is not None:
                new_students.append((result, student))
        elif row["status"] in {"Duplicate In File", "Already Registered"}:
            results.append({**row, "result": "skipped"})
        else:
            results.append({**row, "result": "failed"})

    # Record the batch before any mail goes out, so a slow or interrupted send
    # never leaves created accounts without an import record.
    problems = [
        {"line": r["line"], "id": r["id"], "result": r["result"], "issue": r["issue"]}
        for r in results
        if r["result"] != "created"
    ]
    batch = RegistryImportBatch.objects.create(
        file_name=uploaded.name[:255],
        uploaded_by=request.user,
        uploaded_by_name=request.user.full_name,
        total_rows=len(results),
        created_count=len(new_students),
        skipped_count=sum(1 for r in results if r["result"] == "skipped"),
        failed_count=sum(1 for r in results if r["result"] == "failed"),
        problems=problems,
    )

    # One mail connection for the whole batch instead of one per student.
    connection = get_connection()
    try:
        connection.open()
    except Exception:
        logger.exception("Could not open the mail connection for import %s.", batch.pk)
    try:
        for result, student in new_students:
            result["invitationSent"] = send_activation_email(student.user, connection=connection)
    finally:
        try:
            connection.close()
        except Exception:
            pass

    unsent = [r for r, _ in new_students if not r["invitationSent"]]
    if unsent:
        batch.invitations_failed = len(unsent)
        batch.problems = problems + [
            {
                "line": r["line"],
                "id": r["id"],
                "result": "created",
                "issue": "activation email could not be sent",
            }
            for r in unsent
        ]
        batch.save(update_fields=["invitations_failed", "problems"])
    return Response(
        {"batch": batch.to_public_dict(), "rows": results},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def import_batches_view(request):
    """Most recent bulk imports, newest first (``?limit=``, 1-50, default 5)."""
    _require_office_admin(request)
    try:
        limit = int(request.query_params.get("limit", 5))
    except ValueError:
        limit = 5
    limit = max(1, min(limit, 50))
    return Response(
        [batch.to_public_dict() for batch in RegistryImportBatch.objects.all()[:limit]]
    )


def _find_student(matric_no, queryset=None):
    """Return ``(student, None)`` or ``(None, error_response)``.

    Pass the caller's registry scope as ``queryset`` so a student outside it
    reads as not found rather than confirming the record exists.
    """
    queryset = Student.objects.all() if queryset is None else queryset
    matches = list(
        queryset.select_related("user", "registry").filter(
            matric_no__iexact=matric_no
        )[:2]
    )
    if not matches:
        return None, Response(
            {"error": f"No student found with matric number '{matric_no}'."},
            status=status.HTTP_404_NOT_FOUND,
        )
    if len(matches) > 1:
        # `matric_no` is unique but case-sensitively so, so `iexact` can match
        # more than one row. Picking one arbitrarily previously edited (and
        # suspended) the wrong student, so refuse instead of guessing.
        return None, Response(
            {
                "error": (
                    f"More than one student matches '{matric_no}' when case is "
                    "ignored. Correct the duplicate matric numbers first."
                )
            },
            status=status.HTTP_409_CONFLICT,
        )
    return matches[0], None


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def student_record_detail_view(request, matric_no):
    """Retrieve one student's registry record, or correct it (Office only)."""
    if request.method == "GET":
        student, error = _find_student(matric_no, _require_registry_reader(request))
        if error:
            return error
        return Response(to_record(student))

    _require_office_admin(request)
    student, error = _find_student(matric_no)
    if error:
        return error

    serializer = StudentRecordUpdateSerializer(data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    status_change = "academicStatus" in data and data["academicStatus"] != student.status
    reason = data.get("statusReason", "").strip()
    if status_change and not reason:
        return Response(
            {"statusReason": ["A reason is required to change the academic status."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        if status_change:
            try:
                transition_student(
                    matric_no=student.matric_no,
                    actor=request.user,
                    target_status=data["academicStatus"].upper(),
                    reason=reason,
                )
            except PermissionError as exc:
                return Response({"error": str(exc)}, status=status.HTTP_403_FORBIDDEN)
            except ParticipantLifecycleConflict as exc:
                return Response(
                    {"error": str(exc), "blockers": exc.blockers},
                    status=status.HTTP_409_CONFLICT,
                )
            except ValueError as exc:
                return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            student.refresh_from_db()

        student_fields = []
        if "programme" in data and data["programme"] != student.programme:
            # The research profile carries its own programme, and amendments
            # require the two to match, so transfers go through that workflow.
            if StudentResearchProfile.objects.filter(student_id=student.user_id).exists():
                transaction.set_rollback(True)
                return Response(
                    {
                        "error": (
                            "This student has a research profile. Change the programme "
                            "with a programme-transfer amendment so both records stay in step."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            student.programme = data["programme"]
            student_fields.append("programme")
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
        if data.get("accountStatus") == "Suspended":
            # Without this, reinstating the account within seven days revived
            # every refresh session issued before the suspension.
            blacklist_user_refresh_tokens(student.user)

        if "semester" in data:
            registry, _ = StudentRegistry.objects.get_or_create(student=student)
            registry.current_semester = data["semester"]
            registry.save(update_fields=["current_semester", "updated_at"])

    student.refresh_from_db()
    return Response(to_record(student))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([AccessLinkRateThrottle])
def student_access_link_view(request, matric_no):
    """Email a student a way back in: the activation link if they never set a
    password, otherwise a password-reset link."""
    _require_office_admin(request)

    student, error = _find_student(matric_no)
    if error:
        return error
    user = student.user
    if not user.is_active:
        return Response(
            {"error": "Reinstate this account before sending an access link."},
            status=status.HTTP_409_CONFLICT,
        )

    if user.has_usable_password():
        return Response({"kind": "reset", "sent": send_password_reset_email(user)})
    return Response({"kind": "activation", "sent": send_activation_email(user)})
