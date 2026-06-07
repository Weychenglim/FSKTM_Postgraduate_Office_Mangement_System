from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .excel import build_template_workbook, parse_timeline_workbook
from .models import SemesterTimeline, SemesterTimelineEntry, TimelineAuditLog
from .serializers import (
    TimelineAuditLogSerializer,
    TimelineEntryCreateSerializer,
    TimelineEntrySerializer,
    TimelineEntryUpdateSerializer,
    active_timeline_payload,
)


User = get_user_model()


def is_office_admin(user):
    return user.role == User.Role.OFFICE_ADMIN


def admin_required_response(user):
    if not is_office_admin(user):
        return Response(
            {"error": "Only Office Staff/Admin can manage semester timelines."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def get_active_timeline():
    return (
        SemesterTimeline.objects.filter(is_active=True)
        .prefetch_related("entries")
        .select_related("uploaded_by")
        .first()
    )


def derive_entry_status(deadline_start, deadline_end):
    today = timezone.localdate()
    if today < deadline_start:
        return SemesterTimelineEntry.Status.UPCOMING
    if today > deadline_end:
        return SemesterTimelineEntry.Status.COMPLETED
    if deadline_start == deadline_end:
        return SemesterTimelineEntry.Status.DEADLINE
    return SemesterTimelineEntry.Status.ACTIVE


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def active_timeline_view(_request):
    timeline = get_active_timeline()
    if timeline is None:
        return Response(
            {
                "available": False,
                "message": "No timeline available at now",
                "levels": [],
            }
        )
    return Response(active_timeline_payload(timeline))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def template_view(request):
    denied = admin_required_response(request.user)
    if denied:
        return denied

    response = HttpResponse(
        build_template_workbook(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = 'attachment; filename="FSKTM_Semester_Timeline_Template.xlsx"'
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_timeline_view(request):
    denied = admin_required_response(request.user)
    if denied:
        return denied

    uploaded_file = request.FILES.get("file")
    if uploaded_file is None:
        return Response({"errors": ["Timeline Excel file is required."]}, status=status.HTTP_400_BAD_REQUEST)
    if not uploaded_file.name.lower().endswith(".xlsx"):
        return Response({"errors": ["Only .xlsx timeline templates are accepted."]}, status=status.HTTP_400_BAD_REQUEST)

    rows, errors = parse_timeline_workbook(uploaded_file)
    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    semester = str(request.data.get("semester") or "Semester II").strip()
    session = str(request.data.get("session") or "2025/2026").strip()
    replaced_existing = SemesterTimeline.objects.filter(is_active=True).exists()

    with transaction.atomic():
        SemesterTimeline.objects.filter(is_active=True).update(
            is_active=False,
            replaced_at=timezone.now(),
        )
        timeline = SemesterTimeline.objects.create(
            semester=semester,
            session=session,
            source_filename=uploaded_file.name,
            uploaded_by=request.user,
            is_active=True,
        )
        entries = [
            SemesterTimelineEntry(timeline=timeline, **row)
            for row in rows
        ]
        SemesterTimelineEntry.objects.bulk_create(entries)
        timeline = get_active_timeline()
        TimelineAuditLog.objects.create(
            actor=request.user,
            timeline=timeline,
            action=TimelineAuditLog.Action.REPLACE if replaced_existing else TimelineAuditLog.Action.UPLOAD,
            summary=f"Imported {len(rows)} timeline entries from {uploaded_file.name}.",
        )

    return Response(
        {
            "importedCount": len(rows),
            "timeline": active_timeline_payload(timeline),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def timeline_entry_list_view(request):
    denied = admin_required_response(request.user)
    if denied:
        return denied

    timeline = get_active_timeline()
    if timeline is None:
        return Response(
            {"error": "No active semester timeline exists. Upload a timeline before adding entries."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = TimelineEntryCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    with transaction.atomic():
        level_entries = SemesterTimelineEntry.objects.select_for_update().filter(
            timeline=timeline,
            level=data["level"],
        )
        next_step = (level_entries.aggregate(max_step=Max("step"))["max_step"] or 0) + 1
        next_display_order = (
            SemesterTimelineEntry.objects.select_for_update().filter(timeline=timeline)
            .aggregate(max_order=Max("display_order"))["max_order"]
            or 0
        ) + 1
        entry = SemesterTimelineEntry.objects.create(
            timeline=timeline,
            level=data["level"],
            step=next_step,
            title=data["title"],
            detail=data["detail"],
            action_owner=data["action"],
            deadline_start=data["deadlineStart"],
            deadline_end=data["deadlineEnd"],
            week_label=data.get("weekLabel", ""),
            target_roles=data["targetRoles"],
            status=derive_entry_status(data["deadlineStart"], data["deadlineEnd"]),
            display_order=next_display_order,
        )
        TimelineAuditLog.objects.create(
            actor=request.user,
            timeline=timeline,
            entry=entry,
            action=TimelineAuditLog.Action.ADD_ENTRY,
            summary=f"Added {entry.level} entry: {(entry.title or entry.detail)[:120]}",
        )

    return Response(TimelineEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def timeline_entry_detail_view(request, pk):
    denied = admin_required_response(request.user)
    if denied:
        return denied

    try:
        entry = SemesterTimelineEntry.objects.select_related("timeline").get(pk=pk)
    except SemesterTimelineEntry.DoesNotExist:
        return Response({"error": "Timeline entry was not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        timeline = entry.timeline
        summary = f"Deleted {entry.level} entry: {(entry.title or entry.detail)[:120]}"
        TimelineAuditLog.objects.create(
            actor=request.user,
            timeline=timeline,
            entry=entry,
            action=TimelineAuditLog.Action.DELETE_ENTRY,
            summary=summary,
        )
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = TimelineEntryUpdateSerializer(data=request.data, context={"entry": entry}, partial=True)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    if "level" in data and data["level"] != entry.level:
        target_level_entries = SemesterTimelineEntry.objects.filter(
            timeline=entry.timeline,
            level=data["level"],
        )
        entry.level = data["level"]
        entry.step = (target_level_entries.aggregate(max_step=Max("step"))["max_step"] or 0) + 1

    for api_field, model_field in [
        ("detail", "detail"),
        ("title", "title"),
        ("action", "action_owner"),
        ("deadlineStart", "deadline_start"),
        ("deadlineEnd", "deadline_end"),
        ("weekLabel", "week_label"),
        ("targetRoles", "target_roles"),
    ]:
        if api_field in data:
            setattr(entry, model_field, data[api_field])

    if "deadlineStart" in data or "deadlineEnd" in data:
        entry.status = derive_entry_status(entry.deadline_start, entry.deadline_end)

    entry.save()
    TimelineAuditLog.objects.create(
        actor=request.user,
        timeline=entry.timeline,
        entry=entry,
        action=TimelineAuditLog.Action.EDIT_ENTRY,
        summary=f"Updated {entry.level} entry: {(entry.title or entry.detail)[:120]}",
    )
    return Response(TimelineEntrySerializer(entry).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def timeline_audit_logs_view(request):
    denied = admin_required_response(request.user)
    if denied:
        return denied

    logs = (
        TimelineAuditLog.objects.select_related("actor", "timeline", "entry")
        .order_by("-created_at", "-id")[:50]
    )
    return Response({"logs": TimelineAuditLogSerializer(logs, many=True).data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_tasks_view(request):
    tasks = []
    if is_office_admin(request.user):
        tasks.append(
            {
                "id": "task_upload",
                "name": "Upload semester timeline",
                "status": "critical",
                "statusText": "Required before dashboard timeline is available",
                "target": "Timeline Management",
            }
        )
        timeline = get_active_timeline()
        if timeline:
            owner_entries = timeline.entries.filter(target_roles__contains=["OFFICE_STAFF"])
            office_named_entries = timeline.entries.filter(action_owner__icontains="office")
            tdit_entries = timeline.entries.filter(action_owner__icontains="tdit")
            seen = set()
            for entry in [*owner_entries, *office_named_entries, *tdit_entries]:
                if entry.pk in seen:
                    continue
                seen.add(entry.pk)
                tasks.append(
                    {
                        "id": f"timeline_{entry.pk}",
                        "name": entry.title or entry.detail,
                        "status": derive_entry_status(entry.deadline_start, entry.deadline_end).lower(),
                        "statusText": entry.week_label or derive_entry_status(entry.deadline_start, entry.deadline_end),
                        "target": "Timeline Management",
                    }
                )
    return Response({"tasks": tasks})
