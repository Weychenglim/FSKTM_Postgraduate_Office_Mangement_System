from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from appointments.models import StudentResearchProfile

from .deadlines import mark_deadline_metadata
from .models import (
    EvaluationPeriod,
    EvaluationTask,
    MarkEntry,
    MarksConfigurationAudit,
    Rubric,
    RubricComponent,
)
from .serializers import (
    EvaluationPeriodCreateSerializer,
    EvaluationPeriodUpdateSerializer,
    EvaluationTaskSerializer,
    MarkDraftSerializer,
    ReasonSerializer,
    RubricComponentInputSerializer,
    RubricCreateSerializer,
    RubricUpdateSerializer,
    submit_entry,
)
from .services import (
    MarksStateConflict,
    archive_evaluation_period,
    clone_rubric_version,
    close_evaluation_period,
    create_evaluation_period,
    create_backup_evaluation_task,
    create_rubric,
    create_rubric_component,
    ensure_active_period_tasks,
    ensure_period_tasks,
    publish_evaluation_period,
    update_evaluation_period,
    update_rubric,
    update_rubric_component,
)


User = get_user_model()


def office_only(user):
    return user.role == User.Role.OFFICE_ADMIN


def task_entry_or_none(task):
    try:
        return task.mark_entry
    except MarkEntry.DoesNotExist:
        return None


def task_display_status(task):
    entry = task_entry_or_none(task)
    if entry and entry.status == MarkEntry.Status.SUBMITTED:
        return "SUBMITTED"
    if task.period.closes_at and task.period.closes_at < timezone.now():
        return "OVERDUE"
    if entry and entry.status == MarkEntry.Status.DRAFT:
        return "DRAFT"
    return "NOT_STARTED"


def mark_record_display_status(task, entry):
    if entry and entry.status == MarkEntry.Status.SUBMITTED:
        return "Submitted"
    if task.period.closes_at and task.period.closes_at < timezone.now():
        return "Overdue"
    if entry and entry.status == MarkEntry.Status.DRAFT:
        return "Draft"
    return "Not Started"


def period_task_totals(period):
    tasks = EvaluationTask.objects.filter(period=period).select_related("mark_entry")
    total = tasks.count()
    submitted = tasks.filter(mark_entry__status=MarkEntry.Status.SUBMITTED).count()
    return {
        "total": total,
        "supervisor": tasks.filter(
            evaluator_role=EvaluationTask.EvaluatorRole.SUPERVISOR,
        ).count(),
        "panel": tasks.filter(
            evaluator_role=EvaluationTask.EvaluatorRole.PANEL,
        ).count(),
        "backup": tasks.filter(
            evaluator_role=EvaluationTask.EvaluatorRole.BACKUP,
        ).count(),
        "submitted": submitted,
        "incomplete": total - submitted,
        "overdue": tasks.filter(
            period__closes_at__lt=timezone.now(),
        ).exclude(mark_entry__status=MarkEntry.Status.SUBMITTED).count(),
    }


def period_payload(period):
    return {
        "id": period.pk,
        "name": period.name,
        "semester": period.semester,
        "rubricId": period.rubric_id,
        "rubricName": period.rubric.name,
        "opensAt": period.opens_at.isoformat() if period.opens_at else None,
        "closesAt": period.closes_at.isoformat() if period.closes_at else None,
        "isOpen": period.accepts_submissions,
        "lifecycleStatus": period.lifecycle_status,
        "effectiveStatus": period.effective_status,
        "publishedAt": (
            period.published_at.isoformat() if period.published_at else None
        ),
        "closedAt": period.closed_at.isoformat() if period.closed_at else None,
        "archivedAt": (
            period.archived_at.isoformat() if period.archived_at else None
        ),
        "rubric": rubric_payload(period.rubric),
        "taskTotals": period_task_totals(period),
    }


def configuration_audit_payload(audit):
    return {
        "id": audit.pk,
        "entityType": audit.entity_type,
        "entityId": audit.entity_id,
        "action": audit.action,
        "actorName": audit.actor.full_name,
        "actorRole": audit.actor.get_role_display(),
        "reason": audit.reason,
        "beforeValues": audit.before_values,
        "afterValues": audit.after_values,
        "createdAt": audit.created_at.isoformat(),
    }


def rubric_component_payload(component):
    return {
        "id": component.pk,
        "code": component.code,
        "name": component.name,
        "description": component.description,
        "maxMarks": f"{component.max_marks:.2f}",
        "required": component.is_required,
        "isActive": component.is_active,
        "status": "ACTIVE" if component.is_active else "INACTIVE",
        "displayOrder": component.display_order,
    }


def rubric_payload(rubric, *, include_audit=False):
    payload = {
        "id": rubric.pk,
        "familyCode": rubric.family_code,
        "code": rubric.code,
        "name": rubric.name,
        "description": rubric.description,
        "version": rubric.version,
        "targetMark": f"{rubric.target_mark:.2f}",
        "componentTotal": f"{rubric.component_total:.2f}",
        "isReady": rubric.is_ready,
        "isLocked": rubric.is_locked,
        "isActive": rubric.is_active,
        "supersedesId": rubric.supersedes_id,
        "components": [
            rubric_component_payload(component)
            for component in rubric.components.order_by("display_order", "id")
        ],
    }
    if include_audit:
        audits = MarksConfigurationAudit.objects.filter(
            entity_type=MarksConfigurationAudit.EntityType.RUBRIC,
            entity_id=rubric.pk,
        ).select_related("actor")
        payload["auditEvents"] = [
            configuration_audit_payload(audit) for audit in audits
        ]
    return payload


def django_validation_response(exc, *, conflict=False):
    messages = getattr(exc, "messages", None) or [str(exc)]
    return Response(
        {"error": messages[0], "errors": messages},
        status=(
            status.HTTP_409_CONFLICT
            if conflict
            else status.HTTP_400_BAD_REQUEST
        ),
    )


def state_conflict_response(exc):
    return Response(
        {"error": str(exc)},
        status=status.HTTP_409_CONFLICT,
    )


def component_values(data):
    mapping = {
        "code": "code",
        "name": "name",
        "description": "description",
        "maxMarks": "max_marks",
        "required": "is_required",
        "isActive": "is_active",
        "displayOrder": "display_order",
    }
    return {
        target: data[source]
        for source, target in mapping.items()
        if source in data
    }


def task_option_payload(task):
    entry = task_entry_or_none(task)
    return {
        "taskId": task.pk,
        "id": f"EVT-{task.pk:05d}",
        "periodId": task.period_id,
        "studentId": task.profile.matric_no,
        "studentName": task.profile.student_name,
        "researchTitle": task.profile.proposed_topic,
        "panelMember": task.evaluator.full_name,
        "evaluatorId": task.evaluator_id,
        "evaluatorRole": task.evaluator_role,
        "evaluatorRoleLabel": task.get_evaluator_role_display(),
        "semester": task.period.semester,
        "status": task_display_status(task),
        **mark_deadline_metadata(
            task.period.closes_at,
            is_submitted=bool(
                entry and entry.status == MarkEntry.Status.SUBMITTED
            ),
        ),
    }


def lecturer_task_or_none(user, pk):
    if user.role != User.Role.LECTURER:
        return None
    return (
        EvaluationTask.objects.filter(pk=pk, evaluator=user)
        .select_related("profile", "period", "period__rubric", "mark_entry")
        .prefetch_related(
            "period__rubric__components",
            "mark_entry__scores__component",
        )
        .first()
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def evaluation_periods_view(request):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can view evaluation periods."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if request.method == "POST":
        serializer = EvaluationPeriodCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rubric = Rubric.objects.filter(
            pk=serializer.validated_data["rubricId"]
        ).first()
        if rubric is None:
            return Response(
                {"error": "Rubric version was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            period = create_evaluation_period(
                actor=request.user,
                name=serializer.validated_data["name"],
                semester=serializer.validated_data["semester"],
                rubric=rubric,
                opens_at=serializer.validated_data.get("opensAt"),
                closes_at=serializer.validated_data.get("closesAt"),
            )
        except DjangoValidationError as exc:
            return django_validation_response(exc)
        period = EvaluationPeriod.objects.select_related("rubric").get(
            pk=period.pk
        )
        return Response(period_payload(period), status=status.HTTP_201_CREATED)

    periods = EvaluationPeriod.objects.select_related("rubric")
    if request.query_params.get("includeArchived", "").lower() != "true":
        periods = periods.exclude(
            lifecycle_status=EvaluationPeriod.Lifecycle.ARCHIVED
        )
    periods = periods.all()[:100]
    return Response([period_payload(period) for period in periods])


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def evaluation_period_detail_view(request, pk):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can manage evaluation periods."},
            status=status.HTTP_403_FORBIDDEN,
        )
    period = EvaluationPeriod.objects.select_related("rubric").filter(pk=pk).first()
    if period is None:
        return Response(
            {"error": "Evaluation period was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    if request.method == "GET":
        payload = period_payload(period)
        audits = MarksConfigurationAudit.objects.filter(
            entity_type=MarksConfigurationAudit.EntityType.PERIOD,
            entity_id=period.pk,
        ).select_related("actor")
        payload["auditEvents"] = [
            configuration_audit_payload(audit) for audit in audits
        ]
        return Response(payload)

    serializer = EvaluationPeriodUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    values = {}
    for source, target in (
        ("name", "name"),
        ("semester", "semester"),
        ("opensAt", "opens_at"),
        ("closesAt", "closes_at"),
    ):
        if source in data:
            values[target] = data[source]
    if "rubricId" in data:
        rubric = Rubric.objects.filter(pk=data["rubricId"]).first()
        if rubric is None:
            return Response(
                {"error": "Rubric version was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        values["rubric"] = rubric
    try:
        period = update_evaluation_period(
            period=period,
            actor=request.user,
            values=values,
            reason=data.get("reason", ""),
        )
    except MarksStateConflict as exc:
        return state_conflict_response(exc)
    except DjangoValidationError as exc:
        return django_validation_response(exc)
    return Response(period_payload(period))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def publish_evaluation_period_view(request, pk):
    return period_transition_response(request, pk, "publish")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def close_evaluation_period_view(request, pk):
    return period_transition_response(request, pk, "close")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def archive_evaluation_period_view(request, pk):
    return period_transition_response(request, pk, "archive")


def period_transition_response(request, pk, action):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can manage evaluation periods."},
            status=status.HTTP_403_FORBIDDEN,
        )
    period = EvaluationPeriod.objects.filter(pk=pk).first()
    if period is None:
        return Response(
            {"error": "Evaluation period was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    reason = ""
    if action in {"close", "archive"}:
        serializer = ReasonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]
    try:
        if action == "publish":
            period = publish_evaluation_period(
                period=period,
                actor=request.user,
            )
        elif action == "close":
            period = close_evaluation_period(
                period=period,
                actor=request.user,
                reason=reason,
            )
        else:
            period = archive_evaluation_period(
                period=period,
                actor=request.user,
                reason=reason,
            )
    except MarksStateConflict as exc:
        return state_conflict_response(exc)
    except DjangoValidationError as exc:
        return django_validation_response(exc)
    period = EvaluationPeriod.objects.select_related("rubric").get(pk=period.pk)
    return Response(period_payload(period))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def rubrics_view(request):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can manage rubric configuration."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if request.method == "GET":
        rubrics = Rubric.objects.prefetch_related("components").order_by(
            "family_code",
            "-version",
        )
        return Response([rubric_payload(rubric) for rubric in rubrics])
    serializer = RubricCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    try:
        rubric = create_rubric(
            actor=request.user,
            family_code=data["familyCode"],
            name=data["name"],
            description=data.get("description", ""),
            target_mark=data["targetMark"],
        )
    except DjangoValidationError as exc:
        return django_validation_response(exc)
    return Response(rubric_payload(rubric), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def rubric_detail_view(request, pk):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can manage rubric configuration."},
            status=status.HTTP_403_FORBIDDEN,
        )
    rubric = Rubric.objects.prefetch_related("components").filter(pk=pk).first()
    if rubric is None:
        return Response(
            {"error": "Rubric version was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    if request.method == "GET":
        return Response(rubric_payload(rubric, include_audit=True))
    serializer = RubricUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    values = {}
    for source, target in (
        ("name", "name"),
        ("description", "description"),
        ("targetMark", "target_mark"),
        ("isActive", "is_active"),
    ):
        if source in data:
            values[target] = data[source]
    try:
        rubric = update_rubric(
            rubric=rubric,
            actor=request.user,
            values=values,
        )
    except MarksStateConflict as exc:
        return state_conflict_response(exc)
    except DjangoValidationError as exc:
        return django_validation_response(exc)
    return Response(rubric_payload(rubric))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def clone_rubric_view(request, pk):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can manage rubric configuration."},
            status=status.HTTP_403_FORBIDDEN,
        )
    rubric = Rubric.objects.filter(pk=pk).first()
    if rubric is None:
        return Response(
            {"error": "Rubric version was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    try:
        cloned = clone_rubric_version(rubric=rubric, actor=request.user)
    except DjangoValidationError as exc:
        return django_validation_response(exc)
    return Response(rubric_payload(cloned), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_rubric_component_view(request, pk):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can manage rubric configuration."},
            status=status.HTTP_403_FORBIDDEN,
        )
    rubric = Rubric.objects.filter(pk=pk).first()
    if rubric is None:
        return Response(
            {"error": "Rubric version was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    serializer = RubricComponentInputSerializer(
        data=request.data,
        context={"create": True},
    )
    serializer.is_valid(raise_exception=True)
    try:
        component = create_rubric_component(
            rubric=rubric,
            actor=request.user,
            values=component_values(serializer.validated_data),
        )
    except MarksStateConflict as exc:
        return state_conflict_response(exc)
    except DjangoValidationError as exc:
        return django_validation_response(exc)
    return Response(
        rubric_component_payload(component),
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def rubric_component_detail_view(request, pk, component_pk):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can manage rubric configuration."},
            status=status.HTTP_403_FORBIDDEN,
        )
    component = RubricComponent.objects.filter(
        pk=component_pk,
        rubric_id=pk,
    ).first()
    if component is None:
        return Response(
            {"error": "Rubric component was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    serializer = RubricComponentInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        component = update_rubric_component(
            component=component,
            actor=request.user,
            values=component_values(serializer.validated_data),
        )
    except MarksStateConflict as exc:
        return state_conflict_response(exc)
    except DjangoValidationError as exc:
        return django_validation_response(exc)
    return Response(rubric_component_payload(component))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def assignment_options_view(request):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can view assignment options."},
            status=status.HTTP_403_FORBIDDEN,
        )
    students = StudentResearchProfile.objects.select_related("supervisor").order_by(
        "student_name",
    )
    lecturers = User.objects.filter(
        role=User.Role.LECTURER,
        is_active=True,
    ).select_related("lecturer").order_by("full_name")
    tasks = EvaluationTask.objects.select_related(
        "profile",
        "evaluator",
        "period",
        "mark_entry",
    ).order_by("-assigned_at", "-id")
    return Response(
        {
            "students": [
                {
                    "studentId": student.matric_no,
                    "studentName": student.student_name,
                    "programme": student.programme,
                    "semester": student.semester,
                    "researchTitle": student.proposed_topic,
                    "supervisorName": student.supervisor.full_name,
                }
                for student in students
            ],
            "lecturers": [
                {
                    "userId": lecturer.pk,
                    "staffId": getattr(
                        getattr(lecturer, "lecturer", None),
                        "staff_no",
                        "",
                    ),
                    "fullName": lecturer.full_name,
                    "department": getattr(
                        getattr(lecturer, "lecturer", None),
                        "department",
                        "",
                    ),
                    "email": lecturer.email,
                }
                for lecturer in lecturers
            ],
            "tasks": [task_option_payload(task) for task in tasks],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_evaluation_tasks_view(request):
    if request.user.role != User.Role.LECTURER:
        return Response(
            {"error": "Only lecturers can view assigned evaluation tasks."},
            status=status.HTTP_403_FORBIDDEN,
        )
    ensure_active_period_tasks()
    tasks = (
        EvaluationTask.objects.filter(evaluator=request.user)
        .select_related("profile", "period", "period__rubric", "mark_entry")
        .prefetch_related(
            "period__rubric__components",
            "mark_entry__scores__component",
        )
    )
    return Response(EvaluationTaskSerializer(tasks, many=True).data)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def save_draft_view(request, pk):
    task = lecturer_task_or_none(request.user, pk)
    if task is None:
        return Response(
            {"error": "Evaluation task was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    serializer = MarkDraftSerializer(
        data=request.data,
        context={"task": task},
    )
    serializer.is_valid(raise_exception=True)
    try:
        serializer.save()
    except MarksStateConflict as exc:
        return state_conflict_response(exc)
    task = lecturer_task_or_none(request.user, pk)
    return Response(EvaluationTaskSerializer(task).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_marks_view(request, pk):
    task = lecturer_task_or_none(request.user, pk)
    if task is None:
        return Response(
            {"error": "Evaluation task was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    try:
        submit_entry(task)
    except MarksStateConflict as exc:
        return state_conflict_response(exc)
    task = lecturer_task_or_none(request.user, pk)
    return Response(EvaluationTaskSerializer(task).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mark_records_view(request):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can monitor mark records."},
            status=status.HTTP_403_FORBIDDEN,
        )
    tasks = EvaluationTask.objects.select_related(
        "profile",
        "evaluator",
        "period",
        "mark_entry",
    ).prefetch_related("mark_entry__scores__component")
    records = []
    for task in tasks:
        try:
            entry = task.mark_entry
        except MarkEntry.DoesNotExist:
            entry = None
        display_status = mark_record_display_status(task, entry)
        deadline_metadata = mark_deadline_metadata(
            task.period.closes_at,
            is_submitted=bool(
                entry and entry.status == MarkEntry.Status.SUBMITTED
            ),
        )
        records.append(
            {
                "id": f"MRK-{task.pk:05d}",
                "studentId": task.profile.matric_no,
                "studentName": task.profile.student_name,
                "studentInitials": "".join(
                    part[0] for part in task.profile.student_name.split()[:2]
                ).upper(),
                "researchTitle": task.profile.proposed_topic,
                "panelMember": task.evaluator.full_name,
                "evaluatorRole": task.evaluator_role,
                "evaluatorRoleLabel": task.get_evaluator_role_display(),
                "semester": task.period.semester,
                "programme": task.profile.programme,
                "totalMark": (
                    f"{entry.total_mark:.2f}"
                    if entry and entry.status == MarkEntry.Status.SUBMITTED
                    else "Draft"
                    if entry and entry.status == MarkEntry.Status.DRAFT
                    else None
                ),
                "status": display_status,
                "submittedDate": (
                    entry.submitted_at.strftime("%d %b %Y")
                    if entry and entry.submitted_at
                    else "-"
                ),
                **deadline_metadata,
            }
        )
    return Response(records)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mark_record_detail_view(request, record_id):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can view mark record details."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if not record_id.startswith("MRK-") or not record_id[4:].isdigit():
        return Response(
            {"error": "Mark record was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    task = (
        EvaluationTask.objects.filter(pk=int(record_id[4:]))
        .select_related(
            "profile",
            "evaluator",
            "evaluator__lecturer",
            "assigned_by",
            "period",
            "period__rubric",
            "mark_entry",
        )
        .prefetch_related(
            "period__rubric__components",
            "mark_entry__scores__component",
            "mark_entry__correction_audits__actor",
            "override_audits__actor",
            "override_audits__original_evaluator",
            "override_audits__new_evaluator",
        )
        .first()
    )
    if task is None:
        return Response(
            {"error": "Mark record was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    entry = task_entry_or_none(task)
    score_map = (
        {score.component_id: score for score in entry.scores.all()}
        if entry
        else {}
    )
    deadline = mark_deadline_metadata(
        task.period.closes_at,
        is_submitted=bool(
            entry and entry.status == MarkEntry.Status.SUBMITTED
        ),
    )
    lecturer_profile = getattr(task.evaluator, "lecturer", None)
    return Response(
        {
            "recordId": f"MRK-{task.pk:05d}",
            "taskId": task.pk,
            "student": {
                "studentId": task.profile.matric_no,
                "name": task.profile.student_name,
                "programme": task.profile.programme,
                "semester": task.profile.semester,
                "researchTitle": task.profile.proposed_topic,
            },
            "evaluator": {
                "userId": task.evaluator_id,
                "name": task.evaluator.full_name,
                "email": task.evaluator.email,
                "staffId": getattr(lecturer_profile, "staff_no", ""),
                "department": getattr(lecturer_profile, "department", ""),
                "role": task.evaluator_role,
                "roleLabel": task.get_evaluator_role_display(),
            },
            "assignment": {
                "assignedAt": task.assigned_at.isoformat(),
                "assignedBy": (
                    task.assigned_by.full_name if task.assigned_by else None
                ),
            },
            "period": {
                "id": task.period_id,
                "name": task.period.name,
                "semester": task.period.semester,
                "opensAt": (
                    task.period.opens_at.isoformat()
                    if task.period.opens_at
                    else None
                ),
                "closesAt": (
                    task.period.closes_at.isoformat()
                    if task.period.closes_at
                    else None
                ),
                "lifecycleStatus": task.period.lifecycle_status,
                "effectiveStatus": task.period.effective_status,
                **deadline,
            },
            "rubric": {
                "id": task.period.rubric_id,
                "familyCode": task.period.rubric.family_code,
                "name": task.period.rubric.name,
                "version": task.period.rubric.version,
                "targetMark": f"{task.period.rubric.target_mark:.2f}",
                "componentTotal": (
                    f"{task.period.rubric.component_total:.2f}"
                ),
                "components": [
                    {
                        **rubric_component_payload(component),
                        "marksAwarded": (
                            f"{score_map[component.pk].marks_awarded:.2f}"
                            if component.pk in score_map
                            else None
                        ),
                        "feedback": (
                            score_map[component.pk].feedback
                            if component.pk in score_map
                            else ""
                        ),
                    }
                    for component in task.period.rubric.components.filter(
                        is_active=True
                    ).order_by("display_order", "id")
                ],
            },
            "entry": {
                "status": (
                    entry.status
                    if entry
                    else MarkEntry.Status.NOT_STARTED
                ),
                "totalMark": f"{entry.total_mark:.2f}" if entry else None,
                "comments": entry.comments if entry else "",
                "submittedAt": (
                    entry.submitted_at.isoformat()
                    if entry and entry.submitted_at
                    else None
                ),
                "updatedAt": (
                    entry.updated_at.isoformat() if entry else None
                ),
                "isLocked": bool(entry and entry.is_locked),
            },
            "overrideHistory": [
                {
                    "id": audit.pk,
                    "actorName": audit.actor.full_name,
                    "originalEvaluator": (
                        audit.original_evaluator.full_name
                        if audit.original_evaluator
                        else None
                    ),
                    "newEvaluator": audit.new_evaluator.full_name,
                    "reason": audit.reason,
                    "createdAt": audit.created_at.isoformat(),
                }
                for audit in task.override_audits.all()
            ],
            "correctionHistory": [
                {
                    "id": audit.pk,
                    "action": audit.action,
                    "actorName": audit.actor.full_name,
                    "actorRole": audit.actor.get_role_display(),
                    "reason": audit.reason,
                    "beforeValues": audit.before_values,
                    "afterValues": audit.after_values,
                    "createdAt": audit.created_at.isoformat(),
                }
                for audit in (
                    entry.correction_audits.all() if entry else []
                )
            ],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rubric_components_view(request):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can view rubric configuration."},
            status=status.HTTP_403_FORBIDDEN,
        )
    components = RubricComponent.objects.select_related("rubric").order_by(
        "rubric__name", "display_order", "id"
    )
    return Response(
        [
            {
                "id": str(component.pk),
                "name": component.name,
                "description": component.description,
                "maxMarks": float(component.max_marks),
                "required": component.is_required,
                "status": "ACTIVE" if component.is_active else "INACTIVE",
                "displayOrder": component.display_order,
            }
            for component in components
        ]
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def evaluation_preview_tasks_view(request):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can view evaluation assignments."},
            status=status.HTTP_403_FORBIDDEN,
        )
    tasks = EvaluationTask.objects.select_related(
        "profile",
        "evaluator",
        "period",
        "mark_entry",
    )
    return Response([task_option_payload(task) for task in tasks])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_period_tasks_view(request, pk):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can generate evaluation tasks."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        period = EvaluationPeriod.objects.get(pk=pk)
    except EvaluationPeriod.DoesNotExist:
        return Response(
            {"error": "Evaluation period was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    try:
        result = ensure_period_tasks(period, actor=request.user)
    except MarksStateConflict as exc:
        return state_conflict_response(exc)
    return Response(
        {
            "createdCount": result["total"],
            "supervisorCreatedCount": result["supervisor"],
            "panelCreatedCount": result["panel"],
            "totalCount": result["period_total"],
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def manual_override_task_view(request, pk):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can assign backup evaluators."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        period = EvaluationPeriod.objects.get(pk=pk)
    except EvaluationPeriod.DoesNotExist:
        return Response(
            {"error": "Evaluation period was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    profile = StudentResearchProfile.objects.filter(
        matric_no=request.data.get("studentId")
    ).first()
    if profile is None:
        return Response(
            {"error": "Student research profile was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    evaluator = User.objects.filter(pk=request.data.get("evaluatorId")).first()
    if evaluator is None:
        return Response(
            {"error": "Backup evaluator was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    original_task = None
    original_task_id = request.data.get("originalTaskId")
    if original_task_id:
        original_task = EvaluationTask.objects.filter(
            pk=original_task_id,
            period=period,
        ).first()
        if original_task is None:
            return Response(
                {"error": "Original evaluation task was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
    try:
        task = create_backup_evaluation_task(
            period=period,
            profile=profile,
            evaluator=evaluator,
            actor=request.user,
            reason=request.data.get("reason", ""),
            original_task=original_task,
        )
    except MarksStateConflict as exc:
        return state_conflict_response(exc)
    except DjangoValidationError as exc:
        return Response({"error": exc.message}, status=status.HTTP_400_BAD_REQUEST)
    task = (
        EvaluationTask.objects.filter(pk=task.pk)
        .select_related("profile", "period", "period__rubric", "mark_entry")
        .prefetch_related(
            "period__rubric__components",
            "mark_entry__scores__component",
        )
        .get()
    )
    return Response(EvaluationTaskSerializer(task).data, status=status.HTTP_201_CREATED)
