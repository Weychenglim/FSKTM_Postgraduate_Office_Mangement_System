"""Staff and lecturer accounts (UC03).

The office creates and looks after office staff, lecturer and programme
coordinator accounts here instead of in the Django admin site. No password is
ever made or seen: a new account gets the same activation link as an imported
student (D1, D7). Every change is kept as an ``AccountChange`` row.

Technical Administrator accounts never appear here.
"""
import hashlib
import logging
from itertools import chain

from django.conf import settings
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from django.contrib.auth.models import Permission
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.db import connection, transaction
from django.db.models import Q

from .account_emails import email_changed_email
from .delegations import today
from .models import (
    AccountChange,
    Coordinator,
    Lecturer,
    OfficeStaff,
    Panel,
    Student,
    Supervisor,
    User,
)
from .programmes import APPROVED_PROGRAMMES
from .registry_views import send_activation_email
from .tokens import ACTIVATION, RESET, activation_link
from .validators import MATRIC_PATTERN
from .views import send_password_reset_email

logger = logging.getLogger(__name__)

OFFICE = User.Role.OFFICE_ADMIN
LECTURER = User.Role.LECTURER
COORDINATOR = User.Role.COORDINATOR
STAFF_ROLES = (OFFICE, LECTURER, COORDINATOR)
ROLE_FILTERS = {"OFFICE": OFFICE, "LECTURER": LECTURER, "COORDINATOR": COORDINATOR}

ACTIVE = "ACTIVE"
NOT_ACTIVATED = "NOT_ACTIVATED"
SIGN_IN_OFF = "SIGN_IN_OFF"
STATUSES = (ACTIVE, NOT_ACTIVATED, SIGN_IN_OFF)

SUPERVISOR = "Supervisor"
PANEL = "Panel"
DUTIES = (SUPERVISOR, PANEL)

# Fields the office edits on the account page, as the API names them.
USER_FIELDS = {"name": "full_name", "email": "email", "phone": "phone"}
PROFILE_FIELDS = {"staffId": "staff_no", "department": "department"}
LECTURER_FIELDS = {"title": "title", "researchArea": "specialization"}
OFFICE_FIELDS = {"position": "position"}
FIELD_LABELS = {
    "name": "Full name",
    "email": "Email",
    "phone": "Phone",
    "staffId": "Staff ID",
    "department": "Department",
    "title": "Title",
    "researchArea": "Research area",
    "position": "Position",
}

EMAIL_TAKEN = "Another account already uses this email."
STAFF_ID_TAKEN = "Another account already uses this Staff ID."
STAFF_ID_IS_MATRIC = (
    "This is already a student's matric number. Sign-in accepts both, so they must differ."
)
HISTORY_LIMIT = 200

_LOCK_KEY = int.from_bytes(
    hashlib.sha256(b"accounts:staff-accounts").digest()[:8], "big", signed=True
)


class StaffAccountError(Exception):
    """A refused change. ``errors`` maps a field, or "error", to its message;
    ``existing`` names the account that already holds a value, per field."""

    def __init__(self, errors, *, existing=None, status=400):
        super().__init__(next(iter(errors.values())))
        self.errors = errors
        self.existing = existing or {}
        self.status = status


def _lock_staff_accounts():
    # A Staff ID is unique across two tables and a programme has one
    # coordinator, which no database constraint can hold. Account changes are
    # rare, so they simply take turns.
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(%s)", [_LOCK_KEY])


def staff_id_problem(value):
    if not MATRIC_PATTERN.match(value):
        return "Use letters, digits, '.', '_' or '-' only in the Staff ID (no spaces or '/')."
    return None


def staff_accounts():
    return User.objects.filter(role__in=STAFF_ROLES).select_related(
        "office_staff",
        "lecturer__coordinator",
        "lecturer__supervisor",
        "lecturer__panel",
    )


def find_account(account_id, *, lock=False):
    queryset = User.objects.filter(role__in=STAFF_ROLES)
    if lock:
        queryset = queryset.select_for_update()
    return queryset.filter(pk=account_id).first()


def _part(row, name):
    if row is None:
        return None
    try:
        return getattr(row, name)
    except ObjectDoesNotExist:
        return None


def account_status(user):
    if not user.is_active:
        return SIGN_IN_OFF
    return ACTIVE if user.has_usable_password() else NOT_ACTIVATED


def duties_of(user):
    lecturer = user._related_or_none("lecturer")
    return [
        duty
        for duty, name in ((SUPERVISOR, "supervisor"), (PANEL, "panel"))
        if _part(lecturer, name) is not None
    ]


def to_staff_dict(user, viewer=None):
    office = user._related_or_none("office_staff")
    lecturer = user._related_or_none("lecturer")
    profile = office or lecturer
    coordinator = _part(lecturer, "coordinator")
    signed_in = user.last_portal_login or user.last_login
    return {
        "id": str(user.pk),
        "name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "staffId": profile.staff_no if profile else "",
        "department": profile.department if profile else "",
        "title": lecturer.title if lecturer else "",
        "researchArea": lecturer.specialization if lecturer else "",
        "position": office.position if office else "",
        "duties": duties_of(user),
        "programme": coordinator.programme_managed if coordinator else "",
        "status": account_status(user),
        "lifecycle": lecturer.lifecycle_status if lecturer else None,
        "lastSignedIn": signed_in.isoformat() if signed_in else None,
        "createdAt": user.date_joined.isoformat(),
        "isYou": bool(viewer and viewer.pk == user.pk),
    }


def filter_staff(queryset, *, search="", role="", status=""):
    if search:
        queryset = queryset.filter(
            Q(full_name__icontains=search)
            | Q(email__icontains=search)
            | Q(office_staff__staff_no__icontains=search)
            | Q(lecturer__staff_no__icontains=search)
            | Q(office_staff__department__icontains=search)
            | Q(lecturer__department__icontains=search)
        )
    if role:
        queryset = queryset.filter(role=ROLE_FILTERS[role])
    unusable = Q(password__startswith=UNUSABLE_PASSWORD_PREFIX)
    if status == SIGN_IN_OFF:
        queryset = queryset.filter(is_active=False)
    elif status == NOT_ACTIVATED:
        queryset = queryset.filter(unusable, is_active=True)
    elif status == ACTIVE:
        queryset = queryset.filter(is_active=True).exclude(unusable)
    return queryset


def _holder(user):
    """The account holding a duplicate value, as far as the office may open it."""
    if user.role in STAFF_ROLES:
        return {"kind": "staff", "id": str(user.pk), "name": user.full_name, "role": user.role}
    student = user._related_or_none("student")
    if student is not None:
        return {"kind": "student", "id": student.matric_no, "name": user.full_name}
    return {"kind": "other"}


def _email_holder(email, account=None):
    queryset = User.objects.filter(email__iexact=email).select_related("student")
    if account is not None:
        queryset = queryset.exclude(pk=account.pk)
    return queryset.first()


def _staff_id_holder(staff_id, account=None):
    """``(message, holder)`` when ``staff_id`` is taken, else ``(None, None)``."""
    for model in (OfficeStaff, Lecturer):
        queryset = model.objects.filter(staff_no__iexact=staff_id).select_related("user")
        if account is not None:
            queryset = queryset.exclude(user=account)
        row = queryset.first()
        if row is not None:
            return STAFF_ID_TAKEN, row.user
    student = Student.objects.filter(matric_no__iexact=staff_id).select_related("user").first()
    if student is not None:
        return STAFF_ID_IS_MATRIC, student.user
    return None, None


def programme_coordinator(programme, account=None):
    """The signed-in-able coordinator who already manages ``programme``."""
    wanted = programme.strip().casefold()
    rows = Coordinator.objects.filter(lecturer__user__is_active=True).select_related("lecturer__user")
    for row in rows:
        user = row.lecturer.user
        if account is not None and user.pk == account.pk:
            continue
        if row.programme_managed.strip().casefold() == wanted:
            return user
    return None


def _check_unique(*, email=None, staff_id=None, programme=None, account=None):
    errors, existing = {}, {}
    if email is not None:
        holder = _email_holder(email, account)
        if holder is not None:
            errors["email"] = EMAIL_TAKEN
            existing["email"] = _holder(holder)
    if staff_id is not None:
        message, holder = _staff_id_holder(staff_id, account)
        if holder is not None:
            errors["staffId"] = message
            existing["staffId"] = _holder(holder)
    if programme:
        holder = programme_coordinator(programme, account)
        if holder is not None:
            errors["programme"] = f"{holder.full_name} already coordinates this programme."
            existing["programme"] = _holder(holder)
    if errors:
        raise StaffAccountError(errors, existing=existing)


def record(account, actor, action, details=None):
    return AccountChange.objects.create(
        account=account,
        account_name=account.full_name,
        account_email=account.email,
        actor=actor,
        actor_name=actor.full_name if actor else "",
        action=action,
        details=details or {},
    )


def _grant_office_powers(user):
    # The office screens built on ``is_staff`` and the marks permissions (see
    # seed_users) need both, so a new office account matches the existing ones.
    user.user_permissions.add(*Permission.objects.filter(content_type__app_label="marks"))


@transaction.atomic
def create_account(*, actor, data):
    """Create the account and its profile rows. The caller sends the
    activation email once this has committed."""
    _lock_staff_accounts()
    role = data["role"]
    _check_unique(
        email=data["email"],
        staff_id=data["staffId"],
        programme=data.get("programme") if role == COORDINATOR else None,
    )
    user = User(
        email=data["email"],
        full_name=data["name"],
        role=role,
        phone=data.get("phone", ""),
        is_staff=role == OFFICE,
    )
    user.set_unusable_password()
    user.save()
    details = {"role": role, "staffId": data["staffId"]}
    if role == OFFICE:
        OfficeStaff.objects.create(
            user=user,
            staff_no=data["staffId"],
            department=data.get("department", ""),
            position=data.get("position", ""),
        )
        _grant_office_powers(user)
    else:
        lecturer = Lecturer.objects.create(
            user=user,
            staff_no=data["staffId"],
            department=data.get("department", ""),
            title=data.get("title", ""),
            specialization=data.get("researchArea", ""),
        )
        if role == COORDINATOR:
            Coordinator.objects.create(
                lecturer=lecturer, programme_managed=data["programme"], appointed_date=today()
            )
            details["programme"] = data["programme"]
        else:
            duties = data.get("duties", [])
            if SUPERVISOR in duties:
                Supervisor.objects.create(lecturer=lecturer)
            if PANEL in duties:
                Panel.objects.create(lecturer=lecturer)
            details["duties"] = duties
    record(user, actor, AccountChange.Action.CREATED, details)
    return staff_accounts().get(pk=user.pk)


@transaction.atomic
def edit_account(*, actor, account_id, data):
    """Apply the office's edits. Returns ``(user, old_email)``; ``old_email``
    is set when the email changed, so the old address can be told."""
    _lock_staff_accounts()
    user = find_account(account_id, lock=True)
    if user is None:
        raise StaffAccountError({"error": "No such account."}, status=404)
    office = OfficeStaff.objects.select_for_update().filter(user=user).first()
    lecturer = Lecturer.objects.select_for_update().filter(user=user).first()
    profile = office or lecturer

    refused = {}
    for field in (*PROFILE_FIELDS, *LECTURER_FIELDS, *OFFICE_FIELDS):
        if field not in data:
            continue
        if profile is None:
            refused[field] = "This account has no staff details yet. Ask the technical administrator."
        elif field in LECTURER_FIELDS and lecturer is None:
            refused[field] = "Only lecturer and coordinator accounts have this."
        elif field in OFFICE_FIELDS and office is None:
            refused[field] = "Only office staff accounts have a position."
        elif field == "department" and lecturer is not None and not data[field]:
            refused[field] = "Enter the department."
    if refused:
        raise StaffAccountError(refused)

    _check_unique(
        email=data["email"] if "email" in data and data["email"] != user.email else None,
        staff_id=data.get("staffId") if "staffId" in data and data["staffId"] != profile.staff_no else None,
        account=user,
    )

    changes = []

    def apply(row, mapping):
        fields = []
        for name, attribute in mapping.items():
            if name in data and data[name] != getattr(row, attribute):
                if name != "email":
                    changes.append({"field": name, "from": getattr(row, attribute), "to": data[name]})
                setattr(row, attribute, data[name])
                fields.append(attribute)
        if fields:
            row.save(update_fields=fields)

    old_email = user.email
    apply(user, USER_FIELDS)
    if profile is not None:
        apply(profile, PROFILE_FIELDS)
    if lecturer is not None:
        apply(lecturer, LECTURER_FIELDS)
    if office is not None:
        apply(office, OFFICE_FIELDS)

    if changes:
        record(user, actor, AccountChange.Action.DETAILS_EDITED, {"changes": changes})
    if user.email != old_email:
        record(user, actor, AccountChange.Action.EMAIL_CHANGED, {"from": old_email, "to": user.email})
    else:
        old_email = None
    return staff_accounts().get(pk=user.pk), old_email


def tell_old_address(user, old_email):
    """Email the old address after an email change. Returns whether it went."""
    subject, message = email_changed_email(user, old_email)
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [old_email], fail_silently=False)
        return True
    except Exception:
        logger.exception("Email-change notice for user %s could not be sent.", user.pk)
        return False


def link_kind(user):
    """Which link fits: activation until a password is set, then reset."""
    if not user.is_active:
        raise StaffAccountError(
            {"error": "Turn sign-in back on before sending a link."}, status=409
        )
    return RESET if user.has_usable_password() else ACTIVATION


def send_access_link(*, actor, user, kind):
    sent = send_activation_email(user) if kind == ACTIVATION else send_password_reset_email(user)
    record(user, actor, AccountChange.Action.LINK_SENT, {"kind": kind, "sent": sent})
    return sent


@transaction.atomic
def copy_activation_link(*, actor, account_id):
    """The activation link itself, for the office to pass on when the email
    keeps failing. Reset links are never handed out, so the office cannot
    sign in as someone who already has a password."""
    user = find_account(account_id, lock=True)
    if user is None:
        raise StaffAccountError({"error": "No such account."}, status=404)
    if link_kind(user) != ACTIVATION:
        raise StaffAccountError(
            {"error": "This account is already activated. Send a password reset link instead."},
            status=409,
        )
    record(user, actor, AccountChange.Action.LINK_COPIED)
    return activation_link(user)


def account_history(user):
    return [
        {
            "id": row.pk,
            "action": row.action,
            "actor": row.actor_name,
            "at": row.created_at.isoformat(),
            "details": row.details,
        }
        for row in user.account_changes.all()[:HISTORY_LIMIT]
    ]


def staff_options():
    """What the Add account form offers: departments already in use, and
    each programme with the coordinator who manages it, if any."""
    departments = {}
    for value in chain(
        Lecturer.objects.values_list("department", flat=True),
        OfficeStaff.objects.values_list("department", flat=True),
    ):
        if value.strip():
            departments.setdefault(value.strip().casefold(), value.strip())
    programmes = []
    for programme in APPROVED_PROGRAMMES:
        holder = programme_coordinator(programme)
        programmes.append(
            {
                "programme": programme,
                "coordinator": {"id": str(holder.pk), "name": holder.full_name} if holder else None,
            }
        )
    return {
        "departments": sorted(departments.values(), key=str.casefold),
        "programmes": programmes,
    }
