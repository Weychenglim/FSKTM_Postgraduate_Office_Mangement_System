from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from appointments.models import StudentResearchProfile

from .models import EvaluationPeriod, EvaluationTask, MarkEntry, RubricComponent
from .serializers import (
    EvaluationTaskSerializer,
    MarkDraftSerializer,
    submit_entry,
)
from .services import (
    create_backup_evaluation_task,
    ensure_active_period_tasks,
    ensure_period_tasks,
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
        "isOpen": period.is_open,
        "taskTotals": period_task_totals(period),
    }


def task_option_payload(task):
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def evaluation_periods_view(request):
    if not office_only(request.user):
        return Response(
            {"error": "Only Office Staff/Admin can view evaluation periods."},
            status=status.HTTP_403_FORBIDDEN,
        )
    periods = EvaluationPeriod.objects.select_related("rubric").all()[:25]
    return Response([period_payload(period) for period in periods])


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
    serializer.save()
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
    submit_entry(task)
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
            }
        )
    return Response(records)


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
    result = ensure_period_tasks(period, actor=request.user)
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
