"""Announcement + Notification API.

Mounted under ``/api/`` by the project URLconf:

    GET  /api/announcements/                  list (senders: all, students: their feed)
    POST /api/announcements/                  publish/draft (senders only, multipart)
    GET  /api/announcements/<id>/             retrieve one
    PATCH/DELETE /api/announcements/<id>/      edit / remove (senders only)
    GET  /api/announcements/<id>/attachment/  download the file (recipients + senders)

    GET  /api/notifications/                  the caller's own in-app feed
    POST /api/notifications/<id>/read/        mark one read/unread
    POST /api/notifications/mark-all-read/    mark every unread one read
"""
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Announcement, Notification
from .serializers import AnnouncementSerializer
from .upload_security import validate_attachment

User = get_user_model()

# Roles allowed to publish announcements. Students are receive-only.
SENDER_ROLES = {"Office Staff/Admin", "Programme Coordinator", "Lecturer"}

# Announcement priority -> notification priority used in the bell feed.
PRIORITY_TO_NOTIFICATION = {
    Announcement.Priority.URGENT: Notification.Priority.HIGH,
    Announcement.Priority.INFO: Notification.Priority.MEDIUM,
    Announcement.Priority.GENERAL: Notification.Priority.NORMAL,
}

# The bell and the notifications page show the newest notifications only.
NOTIFICATION_FEED_LIMIT = 200

# Announcement audience -> the User.role that should receive it.
AUDIENCE_TO_ROLE = {
    Announcement.Audience.STUDENTS: User.Role.STUDENT,
    Announcement.Audience.LECTURERS: User.Role.LECTURER,
    Announcement.Audience.STAFF: User.Role.OFFICE_ADMIN,
    Announcement.Audience.COORDINATORS: User.Role.COORDINATOR,
}


# ── Helpers ──────────────────────────────────────────────────────────────────


def _is_sender(user):
    # Keyed on the role, not on ``is_staff`` or superuser status. Those only
    # concern Django admin, and treating them as a sender let a Student with the
    # flag set publish announcements and read other audiences' broadcasts.
    return getattr(user, "role", None) in SENDER_ROLES


def _require_sender(request):
    """Raise 403 unless the caller may publish/manage announcements."""
    if not _is_sender(request.user):
        raise PermissionDenied("You do not have permission to send announcements.")


def _is_office_admin(user):
    """Office Staff/Admin may moderate anyone's announcement; other senders own only theirs."""
    return getattr(user, "role", None) == User.Role.OFFICE_ADMIN


def _require_can_manage(request, announcement):
    """Raise 403 unless the caller owns this announcement or is Office Staff/Admin."""
    _require_sender(request)
    if _is_office_admin(request.user):
        return
    if announcement.created_by_id != request.user.pk:
        raise PermissionDenied("You can only modify announcements you created.")


def _audiences_for(user):
    """The audiences a user belongs to: everyone, plus their own role's audience."""
    role = getattr(user, "role", None)
    return [Announcement.Audience.ALL] + [
        audience for audience, audience_role in AUDIENCE_TO_ROLE.items() if audience_role == role
    ]


def _can_read(user, announcement):
    """Office reads everything and authors read their own; everyone else reads
    published announcements addressed to them, so a Staff-only or
    Coordinators-only notice stays with its audience."""
    if _is_office_admin(user):
        return True
    if _is_sender(user) and announcement.created_by_id == user.pk:
        return True
    return (
        announcement.status == Announcement.Status.ACTIVE
        and announcement.target in _audiences_for(user)
    )


def _require_can_read(request, announcement):
    # 404 rather than 403, so ids of drafts and other audiences' notices stay hidden.
    if not _can_read(request.user, announcement):
        raise NotFound("Announcement not found.")


def _can_manage(user, announcement):
    return _is_sender(user) and (
        _is_office_admin(user) or announcement.created_by_id == user.pk
    )


def _present(announcement, user):
    payload = announcement.to_public_dict()
    payload["canManage"] = _can_manage(user, announcement)
    return payload


def _recipients_for(target):
    """Active users an announcement with this target should reach."""
    active = User.objects.filter(is_active=True).exclude(role=User.TECHNICAL_ADMIN)
    if target == Announcement.Audience.ALL:
        return active
    role = AUDIENCE_TO_ROLE.get(target)
    return active.filter(role=role) if role else User.objects.none()


def _user_is_targeted(user, announcement):
    """True if this user is in the announcement's audience (used for downloads)."""
    if announcement.target == Announcement.Audience.ALL:
        return True
    return getattr(user, "role", None) == AUDIENCE_TO_ROLE.get(announcement.target)


def _fan_out(announcement):
    """Deliver one notification per targeted recipient. Returns the total.

    ``event_key`` makes delivery idempotent: the unique (recipient, event_key)
    constraint means republishing after a retraction reuses the existing row
    instead of appending a duplicate. Without it, toggling Draft/Active
    multiplied every recipient's feed without limit.
    """
    event_key = f"ANN-{announcement.pk}"
    recipients = _recipients_for(announcement.target)
    if announcement.priority != Announcement.Priority.URGENT:
        recipients = recipients.filter(announcement_alerts=True)
    notifications = [
        Notification(
            recipient=recipient,
            title=announcement.title,
            service=(announcement.created_by_name or "Postgraduate Office")[:128],
            summary=announcement.summary,
            message=announcement.content,
            priority=PRIORITY_TO_NOTIFICATION.get(
                announcement.priority, Notification.Priority.NORMAL
            ),
            is_announcement=True,
            reference=event_key,
            event_key=event_key,
            module_label="Announcement",
            announcement=announcement,
        )
        for recipient in recipients
    ]
    Notification.objects.bulk_create(notifications, ignore_conflicts=True)
    return Notification.objects.filter(announcement=announcement).count()


def _retract(announcement):
    """Withdraw an announcement from every recipient's feed.

    Notifications carry a copy of the body, so leaving them in place would keep
    a retracted announcement readable even though the announcement endpoints
    correctly deny access to it.
    """
    Notification.objects.filter(announcement=announcement).delete()


def _sync_delivery(announcement):
    """Make delivered copies match a published announcement. Returns the total.

    Rows of recipients who are no longer in the audience are removed (a
    retarget or an Expired round trip must not leave the text with them), the
    remaining copies get the current wording, and anyone missing is delivered
    to (an upgrade to Urgent reaches people who turned alerts off). Untouched
    rows keep their read state.
    """
    Notification.objects.filter(announcement=announcement).exclude(
        recipient__in=_recipients_for(announcement.target)
    ).delete()
    _resync_notifications(announcement)
    return _fan_out(announcement)


def _resync_notifications(announcement):
    """Push an edit of a still-published announcement into delivered rows."""
    Notification.objects.filter(announcement=announcement).update(
        title=announcement.title,
        summary=announcement.summary,
        message=announcement.content,
        priority=PRIORITY_TO_NOTIFICATION.get(
            announcement.priority, Notification.Priority.NORMAL
        ),
    )


def _publishable(announcement):
    """Error dict when an announcement may not go live, otherwise None."""
    if (
        announcement.status == Announcement.Status.ACTIVE
        and not (announcement.content or "").strip()
    ):
        return {"content": "Announcement content is required to publish."}
    return None


# ── Announcements ────────────────────────────────────────────────────────────


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def announcements_list(request):
    """GET: list announcements. POST: publish or save a draft (senders only)."""
    if request.method == "GET":
        queryset = Announcement.objects.all()
        if not _is_office_admin(request.user):
            # Published notices addressed to the caller, plus a sender's own work.
            visible = Q(
                status=Announcement.Status.ACTIVE,
                target__in=_audiences_for(request.user),
            )
            if _is_sender(request.user):
                visible |= Q(created_by=request.user)
            queryset = queryset.filter(visible)
        status_param = request.query_params.get("status")
        if status_param and _is_sender(request.user):
            queryset = queryset.filter(status__iexact=status_param)
        return Response([_present(a, request.user) for a in queryset])

    _require_sender(request)
    serializer = AnnouncementSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    fields = serializer.to_model_kwargs()

    is_active = fields.get("status", Announcement.Status.ACTIVE) == Announcement.Status.ACTIVE
    if is_active and not fields.get("content", "").strip():
        return Response(
            {"content": "Announcement content is required to publish."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    attachment = request.FILES.get("attachment")
    errors = validate_attachment(attachment)
    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    announcement = Announcement(
        created_by=request.user,
        created_by_name=getattr(request.user, "full_name", "") or request.user.email,
        **fields,
    )
    if attachment is not None:
        announcement.attachment = attachment
    with transaction.atomic():
        announcement.save()
        delivered = _fan_out(announcement) if is_active else 0
    payload = _present(announcement, request.user)
    payload["deliveredTo"] = delivered
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def announcement_detail(request, pk):
    """Retrieve, edit, or delete one announcement."""
    announcement = get_object_or_404(Announcement, pk=pk)

    if request.method == "GET":
        _require_can_read(request, announcement)
        return Response(_present(announcement, request.user))

    if not _can_read(request.user, announcement):
        raise NotFound("Announcement not found.")
    _require_can_manage(request, announcement)

    if request.method == "DELETE":
        stored_file = announcement.attachment.name if announcement.attachment else ""
        with transaction.atomic():
            announcement.delete()
            _delete_file_after_commit(announcement.attachment, stored_file)
        return Response(status=status.HTTP_204_NO_CONTENT)

    attachment = request.FILES.get("attachment")
    errors = validate_attachment(attachment)
    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)
    try:
        remove_attachment = serializers.BooleanField().to_internal_value(
            request.data.get("removeAttachment", False)
        )
    except serializers.ValidationError:
        return Response(
            {"removeAttachment": ["Must be true or false."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    was_active = announcement.status == Announcement.Status.ACTIVE
    previous_file = announcement.attachment.name if announcement.attachment else ""
    partial = request.method == "PATCH"
    serializer = AnnouncementSerializer(data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    for field, value in serializer.to_model_kwargs().items():
        setattr(announcement, field, value)
    if attachment is not None:
        announcement.attachment = attachment
    elif remove_attachment:
        announcement.attachment = None

    invalid = _publishable(announcement)
    if invalid:
        return Response(invalid, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        announcement.save()
        if previous_file and previous_file != (announcement.attachment.name if announcement.attachment else ""):
            _delete_file_after_commit(announcement.attachment, previous_file)
        payload = _present(announcement, request.user)
        if announcement.status == Announcement.Status.ACTIVE:
            payload["deliveredTo"] = _sync_delivery(announcement)
        elif was_active and announcement.status != Announcement.Status.EXPIRED:
            # Back to Draft or Scheduled withdraws delivered copies. Expiring is
            # the natural end of a notice, so recipients keep it in their history.
            _retract(announcement)
    return Response(payload)


def _delete_file_after_commit(field_file, name):
    """Remove a replaced or deleted attachment from storage once the change is
    committed, so a rolled-back edit never loses the file it still points at."""
    if not name:
        return
    storage = field_file.storage
    transaction.on_commit(lambda: storage.delete(name))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def announcement_attachment(request, pk):
    """Stream the announcement's attachment to an authorised recipient."""
    announcement = get_object_or_404(Announcement, pk=pk)
    _require_can_read(request, announcement)
    if not announcement.attachment:
        return Response(
            {"error": "This announcement has no attachment."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return FileResponse(
        announcement.attachment.open("rb"),
        as_attachment=True,
        filename=announcement.attachment_name,
    )


# ── Notifications ────────────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    """The caller's own notification feed (optionally ``?unread=true``)."""
    queryset = Notification.objects.filter(recipient=request.user).select_related(
        "recipient", "announcement"
    )
    if request.query_params.get("unread", "").lower() in ("1", "true", "yes"):
        queryset = queryset.filter(is_read=False)
    return Response([n.to_public_dict() for n in queryset[:NOTIFICATION_FEED_LIMIT]])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notification_mark_read(request, pk):
    """Mark one of the caller's notifications read (or unread via ``isRead``)."""
    notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
    try:
        is_read = serializers.BooleanField().to_internal_value(request.data.get("isRead", True))
    except serializers.ValidationError:
        return Response({"isRead": ["Must be true or false."]}, status=status.HTTP_400_BAD_REQUEST)
    notification.is_read = is_read
    notification.save(update_fields=["is_read"])
    return Response(notification.to_public_dict())


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notifications_mark_all_read(request):
    """Mark every unread notification of the caller read."""
    updated = Notification.objects.filter(
        recipient=request.user, is_read=False
    ).update(is_read=True)
    return Response({"updated": updated})
