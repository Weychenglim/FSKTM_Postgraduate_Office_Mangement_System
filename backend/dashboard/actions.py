from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from academics.services import current_effective_semester
from appointments.ageing import (
    panel_waiting_metadata,
    supervisor_waiting_metadata,
)
from appointments.models import (
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
)
from marks.deadlines import mark_deadline_metadata
from marks.models import EvaluationTask, MarkEntry

from .models import SemesterTimeline, SemesterTimelineEntry


User = get_user_model()
MAX_DASHBOARD_ACTIONS = 20


def _empty_task_fields():
    return {
        "recordType": None,
        "recordId": None,
        "waitingSince": None,
        "waitingDays": None,
        "waitingOn": None,
        "dueAt": None,
        "daysUntilDue": None,
        "deadlineState": None,
        "semester": None,
        "semesterCode": None,
    }


def _task(**values):
    return {**_empty_task_fields(), **values}


def _waiting_text(metadata):
    days = metadata["waitingDays"]
    owner = {
        "SUPERVISOR": "Supervisor",
        "SELECTED_PANEL": "Selected panel",
        "PROGRAMME_COORDINATOR": "Programme Coordinator",
        "FACULTY_PROCESSING": "Faculty processing",
    }.get(metadata["waitingOn"], "Review")
    day_label = "day" if days == 1 else "days"
    return f"{owner} for {days or 0} calendar {day_label}"


def _deadline_text(metadata):
    state = metadata["deadlineState"]
    days = metadata["daysUntilDue"]
    if state == "OVERDUE":
        overdue_days = abs(days or 0)
        if overdue_days == 0:
            return "Overdue today"
        return f"{overdue_days} day{'s' if overdue_days != 1 else ''} overdue"
    if state == "DUE_TODAY":
        return "Due today"
    if state == "UPCOMING":
        return f"Due in {days} day{'s' if days != 1 else ''}"
    if state == "COMPLETE":
        return "Complete"
    return "No deadline configured"


def _programme_for_coordinator(user):
    try:
        return user.lecturer.coordinator.programme_managed.strip()
    except (AttributeError, ObjectDoesNotExist):
        return ""


def _supervisor_actions(user, now):
    pending_statuses = [
        SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
        SupervisorApplication.Status.PENDING_COORDINATOR,
    ]
    applications = SupervisorApplication.objects.filter(
        status__in=pending_statuses,
    )
    if user.role == User.Role.COORDINATOR:
        programme = _programme_for_coordinator(user)
        applications = applications.filter(
            student__programme=programme,
            status=SupervisorApplication.Status.PENDING_COORDINATOR,
        ) if programme else applications.none()
    elif user.role == User.Role.LECTURER:
        applications = applications.filter(
            proposed_supervisor=user,
            status=SupervisorApplication.Status.SUBMITTED_TO_SUPERVISOR,
        )
    elif user.role == User.Role.STUDENT:
        try:
            applications = applications.filter(student=user.student)
        except ObjectDoesNotExist:
            applications = applications.none()
    elif user.role != User.Role.OFFICE_ADMIN:
        applications = applications.none()

    applications = applications.select_related(
        "student",
        "student__user",
        "proposed_supervisor",
        "academic_semester",
    ).prefetch_related("workflow_events")
    return [
        _task(
            id=f"supervisor_{application.pk}",
            name=f"Supervisor appointment: {application.student.user.full_name}",
            status="pending",
            statusText=_waiting_text(metadata),
            target="Supervisor Appointments",
            targetModule="SUPERVISOR_APPOINTMENTS",
            recordType="SUPERVISOR_APPLICATION",
            recordId=str(application.pk),
            semester=(
                application.academic_semester.label
                if application.academic_semester_id
                else "Legacy / Unassigned"
            ),
            semesterCode=(
                application.academic_semester.code
                if application.academic_semester_id
                else None
            ),
            **metadata,
        )
        for application in applications
        for metadata in [supervisor_waiting_metadata(application, now=now)]
    ]


def _panel_actions(user, now):
    pending_statuses = list(PanelRecommendation.WORKLOAD_RESERVED_STATUSES)
    recommendations = PanelRecommendation.objects.filter(
        status__in=pending_statuses,
    )
    public = user.role == User.Role.STUDENT
    if user.role == User.Role.COORDINATOR:
        programme = _programme_for_coordinator(user)
        recommendations = recommendations.filter(
            profile__programme=programme,
            status=PanelRecommendation.Status.PENDING_COORDINATOR,
        ) if programme else recommendations.none()
    elif user.role == User.Role.LECTURER:
        recommendations = recommendations.filter(
            recommended_member=user,
            status=PanelRecommendation.Status.SUBMITTED_TO_PANEL,
        )
    elif user.role == User.Role.STUDENT:
        profile = StudentResearchProfile.objects.filter(student=user).first()
        recommendations = (
            recommendations.filter(profile=profile)
            if profile is not None
            else recommendations.none()
        )
    elif user.role != User.Role.OFFICE_ADMIN:
        recommendations = recommendations.none()

    recommendations = recommendations.select_related(
        "profile",
        "recommended_member",
        "academic_semester",
    ).prefetch_related("workflow_events")
    return [
        _task(
            id=f"panel_{recommendation.pk}",
            name=(
                "Panel appointment processing"
                if public
                else f"Panel appointment: {recommendation.profile.student_name}"
            ),
            status="pending",
            statusText=_waiting_text(metadata),
            target="Panel Appointments",
            targetModule="PANEL_APPOINTMENTS",
            recordType="PANEL_RECOMMENDATION" if not public else None,
            recordId=str(recommendation.pk) if not public else None,
            semester=(
                recommendation.academic_semester.label
                if recommendation.academic_semester_id
                else "Legacy / Unassigned"
            ),
            semesterCode=(
                recommendation.academic_semester.code
                if recommendation.academic_semester_id
                else None
            ),
            **metadata,
        )
        for recommendation in recommendations
        for metadata in [
            panel_waiting_metadata(recommendation, now=now, public=public)
        ]
    ]


def _mark_actions(user, now):
    semester = current_effective_semester()
    if semester is None:
        return []
    tasks = EvaluationTask.objects.exclude(
        mark_entry__status=MarkEntry.Status.SUBMITTED,
    ).filter(period__academic_semester=semester)
    if user.role == User.Role.LECTURER:
        tasks = tasks.filter(evaluator=user)
    elif user.role != User.Role.OFFICE_ADMIN:
        tasks = tasks.none()

    tasks = tasks.select_related(
        "profile",
        "evaluator",
        "period",
        "period__academic_semester",
        "mark_entry",
    )
    actions = []
    for task in tasks:
        metadata = mark_deadline_metadata(
            task.period.closes_at,
            is_submitted=False,
            now=now,
        )
        status = {
            "OVERDUE": "overdue",
            "DUE_TODAY": "deadline",
            "UPCOMING": "upcoming",
            "NO_DEADLINE": "pending",
        }[metadata["deadlineState"]]
        actions.append(
            _task(
                id=f"marks_{task.pk}",
                name=f"Marks entry: {task.profile.student_name}",
                status=status,
                statusText=_deadline_text(metadata),
                target="Marks Entry",
                targetModule="MARKS",
                recordType="EVALUATION_TASK",
                recordId=str(task.pk),
                semester=task.period.academic_semester.label,
                semesterCode=task.period.academic_semester.code,
                **metadata,
            )
        )
    return actions


def _timeline_actions(user, now):
    semester = current_effective_semester()
    if semester is None:
        return []
    role = {
        User.Role.OFFICE_ADMIN: "OFFICE_STAFF",
        User.Role.LECTURER: "LECTURER",
        User.Role.STUDENT: "STUDENT",
    }.get(user.role)
    if role is None:
        return []

    entries = SemesterTimelineEntry.objects.filter(
        timeline__is_active=True,
        timeline__academic_semester=semester,
        target_roles__contains=[role],
    ).select_related("timeline")
    today = timezone.localdate(now)
    actions = []
    for entry in entries:
        if today > entry.deadline_end:
            continue
        days_until_due = (entry.deadline_end - today).days
        if days_until_due == 0:
            display_status = SemesterTimelineEntry.Status.DEADLINE
            deadline_state = "DUE_TODAY"
        elif entry.deadline_start <= today:
            display_status = SemesterTimelineEntry.Status.ACTIVE
            deadline_state = "UPCOMING"
        else:
            display_status = SemesterTimelineEntry.Status.UPCOMING
            deadline_state = "UPCOMING"
        metadata = {
            "dueAt": entry.deadline_end,
            "daysUntilDue": days_until_due,
            "deadlineState": deadline_state,
        }
        actions.append(
            _task(
                id=f"timeline_{entry.pk}",
                name=entry.title or entry.detail,
                status=display_status.lower(),
                statusText=entry.week_label or _deadline_text(metadata),
                target="Timeline Management",
                targetModule="DASHBOARD",
                recordType="TIMELINE_ENTRY",
                recordId=str(entry.pk),
                **metadata,
            )
        )
    return actions


def _sort_key(task):
    due_value = str(task["dueAt"] or "")
    if task["deadlineState"] == "OVERDUE":
        return (0, due_value, task["id"])
    if task["deadlineState"] == "DUE_TODAY":
        return (1, due_value, task["id"])
    if task["waitingDays"] is not None:
        return (2, -task["waitingDays"], str(task["waitingSince"] or ""), task["id"])
    if task["targetModule"] == "DASHBOARD" and task["status"] == "active":
        return (3, due_value, task["id"])
    if task["deadlineState"] == "UPCOMING":
        return (4, due_value, task["id"])
    return (5, due_value, task["id"])


def build_dashboard_tasks(user, *, now=None):
    now = now or timezone.now()
    semester = current_effective_semester()
    active_timeline = (
        SemesterTimeline.objects.filter(
            is_active=True,
            academic_semester=semester,
        ).first()
        if semester
        else None
    )
    tasks = [
        *_supervisor_actions(user, now),
        *_panel_actions(user, now),
        *_mark_actions(user, now),
        *_timeline_actions(user, now),
    ]
    if user.role == User.Role.OFFICE_ADMIN:
        tasks.append(
            _task(
                id="task_upload",
                name="Upload semester timeline",
                status="completed" if active_timeline else "critical",
                statusText=(
                    "Done"
                    if active_timeline
                    else "Required before dashboard timeline is available"
                ),
                target="Timeline Management",
                targetModule="DASHBOARD",
            )
        )
    return sorted(tasks, key=_sort_key)[:MAX_DASHBOARD_ACTIONS]
