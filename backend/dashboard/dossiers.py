from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.http import Http404
from django.utils import timezone

from accounts.models import Student
from appointments.ageing import (
    panel_waiting_metadata,
    supervisor_waiting_metadata,
)
from appointments.models import (
    PanelAppointment,
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorAppointment,
)
from appointments.serializers import AppointmentWorkflowEventSerializer
from marks.deadlines import mark_deadline_metadata
from marks.models import EvaluationTask, MarkEntry

from .models import SemesterTimeline


User = get_user_model()
SECTION_SUPERVISOR = "SUPERVISOR"
SECTION_PANEL = "PANEL"
SECTION_MARKS = "MARKS"
SECTION_TIMELINE = "TIMELINE"


def _coordinator_programme(user):
    try:
        return user.lecturer.coordinator.programme_managed.strip()
    except (AttributeError, ObjectDoesNotExist):
        return ""


def _research_profile(student):
    return (
        StudentResearchProfile.objects.select_related("supervisor")
        .filter(
            Q(student=student.user) | Q(matric_no__iexact=student.matric_no)
        )
        .first()
    )


def _lecturer_relationships(user, student, profile):
    supervisor_related = (
        SupervisorApplication.objects.filter(
            student=student,
            proposed_supervisor=user,
        ).exists()
        or SupervisorAppointment.objects.filter(
            student=student,
            supervisor=user,
        ).exists()
        or bool(profile and profile.supervisor_id == user.pk)
    )
    panel_related = bool(
        profile
        and (
            PanelRecommendation.objects.filter(profile=profile)
            .filter(Q(supervisor=user) | Q(recommended_member=user))
            .exists()
            or PanelAppointment.objects.filter(profile=profile)
            .filter(Q(supervisor=user) | Q(panel_member=user))
            .exists()
        )
    )
    marks_related = bool(
        profile
        and EvaluationTask.objects.filter(
            profile=profile,
            evaluator=user,
        ).exists()
    )
    return {
        SECTION_SUPERVISOR: supervisor_related,
        SECTION_PANEL: panel_related,
        SECTION_MARKS: marks_related,
    }


def _resolve_access(user, student, profile):
    if user.role == User.Role.OFFICE_ADMIN:
        return "INTERNAL", {
            SECTION_SUPERVISOR,
            SECTION_PANEL,
            SECTION_MARKS,
            SECTION_TIMELINE,
        }
    if user.role == User.Role.COORDINATOR:
        programme = _coordinator_programme(user)
        if not programme or student.programme != programme:
            raise Http404
        return "INTERNAL", {
            SECTION_SUPERVISOR,
            SECTION_PANEL,
            SECTION_TIMELINE,
        }
    if user.role == User.Role.LECTURER:
        relationships = _lecturer_relationships(user, student, profile)
        visible = {
            section for section, is_related in relationships.items() if is_related
        }
        if not visible:
            raise Http404
        visible.add(SECTION_TIMELINE)
        return "INTERNAL", visible
    if user.role == User.Role.STUDENT and student.user_id == user.pk:
        return "PUBLIC", {
            SECTION_SUPERVISOR,
            SECTION_PANEL,
            SECTION_MARKS,
            SECTION_TIMELINE,
        }
    raise Http404


def _iso(value):
    return value.isoformat() if value is not None else None


def _workflow(events):
    return AppointmentWorkflowEventSerializer(events, many=True).data


def _supervisor_records(student, user, visibility, now):
    applications_query = (
        SupervisorApplication.objects.filter(student=student)
        .select_related("proposed_supervisor", "appointment")
        .prefetch_related("workflow_events__actor")
        .order_by("-updated_at", "-created_at", "-id")
    )
    if user.role == User.Role.LECTURER:
        applications_query = applications_query.filter(proposed_supervisor=user)
    applications = sorted(
        applications_query,
        key=lambda application: (
            application.status in SupervisorApplication.ACTIVE_STATUSES,
            application.updated_at,
            application.pk,
        ),
        reverse=True,
    )

    records = []
    for application in applications:
        waiting = supervisor_waiting_metadata(application, now=now)
        record = {
            "recordId": str(application.pk),
            "status": application.status,
            "researchTitle": application.research_title,
            "proposedSupervisor": application.proposed_supervisor.full_name,
            "submittedAt": _iso(application.submitted_at),
            "supervisorDecisionAt": _iso(application.supervisor_decided_at),
            "coordinatorDecisionAt": _iso(application.coordinator_decided_at),
            "cancelledAt": _iso(application.cancelled_at),
            "rejectionReason": application.rejection_reason or None,
            "cancellationReason": application.cancellation_reason or None,
            "waitingSince": _iso(waiting["waitingSince"]),
            "waitingDays": waiting["waitingDays"],
            "waitingOn": waiting["waitingOn"],
            "targetModule": "SUPERVISOR_APPOINTMENTS",
            "recordType": "SUPERVISOR_APPLICATION",
            "appointment": None,
        }
        try:
            appointment = application.appointment
        except SupervisorAppointment.DoesNotExist:
            appointment = None
        if appointment:
            record["appointment"] = {
                "appointmentDate": appointment.appointment_date.isoformat(),
                "status": appointment.status,
                "supervisor": appointment.supervisor.full_name,
            }
        if visibility == "INTERNAL":
            record["workflow"] = _workflow(application.workflow_events.all())
        records.append(record)

    current = next(
        (
            record
            for record in records
            if record["status"] in SupervisorApplication.ACTIVE_STATUSES
        ),
        records[0] if records else None,
    )
    return {
        "currentRecordId": current["recordId"] if current else None,
        "records": records,
    }


def _public_panel_status(recommendation):
    if recommendation.status in PanelRecommendation.WORKLOAD_RESERVED_STATUSES:
        return "FACULTY_PROCESSING"
    if recommendation.status == PanelRecommendation.Status.APPROVED:
        return "APPROVED"
    if recommendation.status in {
        PanelRecommendation.Status.REJECTED_BY_PANEL,
        PanelRecommendation.Status.REJECTED_BY_COORDINATOR,
    }:
        return "REJECTED"
    if recommendation.status == PanelRecommendation.Status.CANCELLED_BY_SUPERVISOR:
        return "CANCELLED"
    return recommendation.status


def _panel_records(profile, user, visibility, now):
    if profile is None:
        return {"currentRecordId": None, "records": []}
    recommendations_query = (
        PanelRecommendation.objects.filter(profile=profile)
        .select_related("supervisor", "recommended_member", "panel_appointment")
        .prefetch_related("workflow_events__actor")
        .order_by("-updated_at", "-created_at", "-id")
    )
    if user.role == User.Role.LECTURER:
        recommendations_query = recommendations_query.filter(
            Q(supervisor=user) | Q(recommended_member=user)
        )
    recommendations = sorted(
        recommendations_query,
        key=lambda recommendation: (
            recommendation.status in PanelRecommendation.ACTIVE_STATUSES,
            recommendation.updated_at,
            recommendation.pk,
        ),
        reverse=True,
    )

    records = []
    for recommendation in recommendations:
        waiting = panel_waiting_metadata(
            recommendation,
            now=now,
            public=visibility == "PUBLIC",
        )
        if visibility == "PUBLIC":
            record = {
                "status": _public_panel_status(recommendation),
                "rejectionReason": (
                    recommendation.display_rejection_reason or None
                    if recommendation.status
                    in {
                        PanelRecommendation.Status.REJECTED_BY_PANEL,
                        PanelRecommendation.Status.REJECTED_BY_COORDINATOR,
                    }
                    else None
                ),
                "cancellationReason": (
                    recommendation.cancellation_reason or None
                    if recommendation.status
                    == PanelRecommendation.Status.CANCELLED_BY_SUPERVISOR
                    else None
                ),
                "waitingSince": _iso(waiting["waitingSince"]),
                "waitingDays": waiting["waitingDays"],
                "targetModule": "PANEL_APPOINTMENTS",
                "recordType": "PANEL_RECOMMENDATION",
            }
        else:
            record = {
                "recordId": str(recommendation.pk),
                "status": recommendation.status,
                "supervisor": recommendation.supervisor.full_name,
                "recommendedMember": recommendation.recommended_member.full_name,
                "submittedAt": _iso(recommendation.submitted_at),
                "panelDecisionAt": _iso(recommendation.panel_decided_at),
                "coordinatorDecisionAt": _iso(
                    recommendation.coordinator_decided_at
                ),
                "cancelledAt": _iso(recommendation.cancelled_at),
                "rejectionReason": recommendation.display_rejection_reason or None,
                "cancellationReason": recommendation.cancellation_reason or None,
                "waitingSince": _iso(waiting["waitingSince"]),
                "waitingDays": waiting["waitingDays"],
                "waitingOn": waiting["waitingOn"],
                "targetModule": "PANEL_APPOINTMENTS",
                "recordType": "PANEL_RECOMMENDATION",
                "workflow": _workflow(recommendation.workflow_events.all()),
            }
        try:
            appointment = recommendation.panel_appointment
        except PanelAppointment.DoesNotExist:
            appointment = None
        if appointment and recommendation.status == PanelRecommendation.Status.APPROVED:
            record["appointment"] = {
                "appointmentDate": appointment.appointment_date.isoformat(),
                "status": appointment.status,
                "panelMember": appointment.panel_member.full_name,
            }
        else:
            record["appointment"] = None
        records.append(record)

    current_index = next(
        (
            index
            for index, recommendation in enumerate(recommendations)
            if recommendation.status in PanelRecommendation.ACTIVE_STATUSES
        ),
        0 if records else None,
    )
    result = {"records": records}
    if visibility == "INTERNAL":
        result["currentRecordId"] = (
            records[current_index]["recordId"] if current_index is not None else None
        )
    return result


def _task_status(entry, deadline_state):
    if entry and entry.status == MarkEntry.Status.SUBMITTED:
        return "SUBMITTED"
    if deadline_state == "OVERDUE":
        return "OVERDUE"
    if entry and entry.status == MarkEntry.Status.DRAFT:
        return "DRAFT"
    return "NOT_STARTED"


def _marks_records(profile, user, visibility, now):
    if profile is None:
        return {"summaryStatus": None, "completionRate": None, "tasks": []}
    tasks = (
        EvaluationTask.objects.filter(profile=profile)
        .select_related("evaluator", "period", "mark_entry")
        .order_by("-period__closes_at", "-assigned_at", "-id")
    )
    if user.role == User.Role.LECTURER:
        tasks = tasks.filter(evaluator=user)

    rows = []
    for task in tasks:
        try:
            entry = task.mark_entry
        except MarkEntry.DoesNotExist:
            entry = None
        deadline = mark_deadline_metadata(
            task.period.closes_at,
            is_submitted=bool(entry and entry.status == MarkEntry.Status.SUBMITTED),
            now=now,
        )
        status = _task_status(entry, deadline["deadlineState"])
        if visibility == "PUBLIC":
            row = {
                "status": status,
                "period": task.period.name,
                "semester": task.period.semester,
                "dueAt": _iso(deadline["dueAt"]),
                "daysUntilDue": deadline["daysUntilDue"],
                "deadlineState": deadline["deadlineState"],
                "targetModule": "MARKS",
                "recordType": "MARK_TASK",
            }
        else:
            row = {
                "taskId": str(task.pk),
                "status": status,
                "period": task.period.name,
                "semester": task.period.semester,
                "evaluator": task.evaluator.full_name,
                "evaluatorRole": task.evaluator_role,
                "dueAt": _iso(deadline["dueAt"]),
                "daysUntilDue": deadline["daysUntilDue"],
                "deadlineState": deadline["deadlineState"],
                "targetModule": "MARKS",
                "recordType": "MARK_TASK",
            }
        rows.append(row)

    submitted = sum(row["status"] == "SUBMITTED" for row in rows)
    statuses = {row["status"] for row in rows}
    if "OVERDUE" in statuses:
        summary_status = "OVERDUE"
    elif "DRAFT" in statuses:
        summary_status = "DRAFT"
    elif "NOT_STARTED" in statuses:
        summary_status = "NOT_STARTED"
    elif rows:
        summary_status = "SUBMITTED"
    else:
        summary_status = None
    return {
        "summaryStatus": summary_status,
        "completionRate": round((submitted / len(rows)) * 100, 1) if rows else None,
        "tasks": rows,
    }


def _timeline_status(entry, today):
    if today < entry.deadline_start:
        return "UPCOMING"
    if today > entry.deadline_end:
        return "COMPLETED"
    if entry.deadline_start == entry.deadline_end:
        return "DEADLINE"
    return "ACTIVE"


def _timeline_section(today):
    timeline = (
        SemesterTimeline.objects.filter(is_active=True)
        .prefetch_related("entries")
        .first()
    )
    if timeline is None:
        return {
            "semester": None,
            "session": None,
            "entries": [],
        }
    entries = [
        {
            "recordId": str(entry.pk),
            "title": entry.title or entry.detail,
            "detail": entry.detail,
            "level": entry.level,
            "status": _timeline_status(entry, today),
            "deadlineStart": entry.deadline_start.isoformat(),
            "deadlineEnd": entry.deadline_end.isoformat(),
            "targetModule": "DASHBOARD",
            "recordType": "TIMELINE_ENTRY",
        }
        for entry in timeline.entries.all()
        if "STUDENT" in entry.target_roles
    ]
    return {
        "semester": timeline.semester,
        "session": timeline.session,
        "entries": entries,
    }


def _attention(supervisor, panel, marks, timeline, visibility):
    items = []
    for task in marks["tasks"] if marks else []:
        if task["deadlineState"] == "OVERDUE":
            items.append(
                {
                    "kind": "MARKS_DEADLINE",
                    "label": f'{task["period"]} marks are overdue',
                    "waitingDays": None,
                    "dueAt": task["dueAt"],
                    "targetModule": "MARKS",
                    "recordType": "MARK_TASK",
                    "recordId": task.get("taskId"),
                }
            )
    for section, module in (
        (supervisor, "SUPERVISOR_APPOINTMENTS"),
        (panel, "PANEL_APPOINTMENTS"),
    ):
        if section is None:
            continue
        for record in section["records"]:
            if record["waitingDays"] is None:
                continue
            item = {
                "kind": "WORKFLOW_WAIT",
                "label": f'{record["status"].replace("_", " ").title()}',
                "waitingDays": record["waitingDays"],
                "dueAt": None,
                "targetModule": module,
                "recordType": record["recordType"],
                "recordId": record.get("recordId"),
            }
            if visibility == "INTERNAL":
                item["waitingOn"] = record.get("waitingOn")
            else:
                item["waitingOn"] = (
                    "FACULTY_PROCESSING"
                    if module == "PANEL_APPOINTMENTS"
                    else record.get("waitingOn")
                )
            items.append(item)
    for entry in timeline["entries"] if timeline else []:
        if entry["status"] not in {"ACTIVE", "DEADLINE", "UPCOMING"}:
            continue
        items.append(
            {
                "kind": "TIMELINE_MILESTONE",
                "label": entry["title"],
                "waitingDays": None,
                "dueAt": entry["deadlineEnd"],
                "targetModule": "DASHBOARD",
                "recordType": "TIMELINE_ENTRY",
                "recordId": entry["recordId"],
            }
        )
    priority = {
        "MARKS_DEADLINE": 0,
        "WORKFLOW_WAIT": 1,
        "TIMELINE_MILESTONE": 2,
    }
    return sorted(
        items,
        key=lambda item: (
            priority[item["kind"]],
            -(item["waitingDays"] or 0),
            item["dueAt"] or "",
            item["label"],
        ),
    )


def build_student_progress_dossier(user, student_id, now=None):
    try:
        student = Student.objects.select_related("user").get(
            matric_no__iexact=student_id
        )
    except Student.DoesNotExist as exc:
        raise Http404 from exc

    now = now or timezone.now()
    profile = _research_profile(student)
    visibility, visible_set = _resolve_access(user, student, profile)
    ordered_sections = [
        section
        for section in (
            SECTION_SUPERVISOR,
            SECTION_PANEL,
            SECTION_MARKS,
            SECTION_TIMELINE,
        )
        if section in visible_set
    ]

    supervisor = (
        _supervisor_records(student, user, visibility, now)
        if SECTION_SUPERVISOR in visible_set
        else None
    )
    panel = (
        _panel_records(profile, user, visibility, now)
        if SECTION_PANEL in visible_set
        else None
    )
    marks = (
        _marks_records(profile, user, visibility, now)
        if SECTION_MARKS in visible_set
        else None
    )
    timeline = (
        _timeline_section(timezone.localdate(now))
        if SECTION_TIMELINE in visible_set
        else None
    )
    attention = _attention(
        supervisor,
        panel,
        marks,
        timeline,
        visibility,
    )

    supervisor_current = None
    if supervisor and supervisor["currentRecordId"]:
        supervisor_current = next(
            (
                row
                for row in supervisor["records"]
                if row["recordId"] == supervisor["currentRecordId"]
            ),
            None,
        )
    panel_current = None
    if panel and panel.get("records"):
        if visibility == "PUBLIC":
            panel_current = panel["records"][0]
        elif panel.get("currentRecordId"):
            panel_current = next(
                (
                    row
                    for row in panel["records"]
                    if row["recordId"] == panel["currentRecordId"]
                ),
                None,
            )

    return {
        "generatedAt": now.isoformat(),
        "visibility": visibility,
        "student": {
            "studentId": student.matric_no,
            "studentName": student.user.full_name,
            "programme": student.programme,
            "status": student.status,
            "intakeSemester": student.intake_semester,
            "research": (
                {
                    "semester": profile.semester,
                    "title": profile.proposed_topic,
                    "researchArea": profile.research_area,
                    "supervisor": profile.supervisor.full_name,
                }
                if profile
                else None
            ),
        },
        "visibleSections": ordered_sections,
        "overview": {
            "supervisorStatus": (
                supervisor_current["status"] if supervisor_current else None
            ),
            "panelStatus": panel_current["status"] if panel_current else None,
            "marksStatus": marks["summaryStatus"] if marks else None,
            "activeTimelineEntries": sum(
                entry["status"] in {"ACTIVE", "DEADLINE"}
                for entry in timeline["entries"] if timeline
            ),
            "attentionCount": len(attention),
        },
        "supervisor": supervisor,
        "panel": panel,
        "marks": marks,
        "timeline": timeline,
        "attention": attention,
    }
