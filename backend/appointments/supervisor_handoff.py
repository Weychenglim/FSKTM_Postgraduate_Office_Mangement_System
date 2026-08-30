from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from academics.capacity import (
    CapacityConflict,
    CapacityRole,
    assert_capacity_allows_assignment,
)
from accounts.authorization import coordinator_programme
from accounts.eligibility import (
    student_is_workflow_eligible,
    user_is_assignable_lecturer,
)
from accounts.models import Lecturer

from .models import (
    AppointmentWorkflowEvent,
    PanelRecommendation,
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorAppointment,
)
from .appointment_lifecycle import (
    AppointmentLifecycleConflict,
    activate_replacement,
)

User = get_user_model()


class SupervisorApprovalConflict(Exception):
    pass


class SupervisorApprovalForbidden(Exception):
    pass


def _profile_has_downstream_history(profile):
    return (
        profile.panel_recommendations.exists()
        or profile.panel_appointments.exists()
        or profile.evaluation_tasks.exists()
    )


def _resolve_research_profile(application):
    student_user = application.student.user
    by_student = (
        StudentResearchProfile.objects.select_for_update()
        .filter(student=student_user)
        .first()
    )
    by_matric = (
        StudentResearchProfile.objects.select_for_update()
        .filter(matric_no=application.student.matric_no)
        .first()
    )
    if by_student and by_matric and by_student.pk != by_matric.pk:
        raise SupervisorApprovalConflict(
            "Conflicting research profiles exist for this student. Office Staff must resolve the records before approval."
        )

    profile = by_student or by_matric
    semester_label = (
        application.academic_semester.label
        if application.academic_semester_id
        else "Legacy / Unassigned"
    )
    values = {
        "student": student_user,
        "matric_no": application.student.matric_no,
        "student_name": student_user.full_name,
        "programme": application.student.programme,
        "semester": semester_label,
        "proposed_topic": application.research_title,
        "research_area": application.research_area,
        "abstract": application.research_abstract,
        "supervisor": application.proposed_supervisor,
    }
    if profile is None:
        return StudentResearchProfile.objects.create(**values)

    if profile.student_id not in {None, student_user.pk}:
        raise SupervisorApprovalConflict(
            "The matric-number research profile belongs to another student account and cannot be linked automatically."
        )

    has_history = _profile_has_downstream_history(profile)
    is_replacement = application.replaces_appointment_id is not None
    if (
        has_history
        and profile.supervisor_id != application.proposed_supervisor_id
        and not is_replacement
    ):
        raise SupervisorApprovalConflict(
            "The existing research profile has downstream records for another supervisor and cannot be changed automatically."
        )
    if has_history:
        update_fields = []
        if profile.student_id is None:
            profile.student = student_user
            update_fields.append("student")
        if is_replacement:
            profile.supervisor = application.proposed_supervisor
            update_fields.append("supervisor")
        if update_fields:
            profile.save(update_fields=[*update_fields, "updated_at"])
        return profile

    for field, value in values.items():
        setattr(profile, field, value)
    profile.save(update_fields=[*values.keys(), "updated_at"])
    return profile


@transaction.atomic
def approve_supervisor_application(*, application_id, actor):
    student_id = (
        SupervisorApplication.objects.only("student_id")
        .get(pk=application_id)
        .student_id
    )
    from accounts.models import Student

    Student.objects.select_for_update().get(pk=student_id)
    application = (
        SupervisorApplication.objects.select_for_update(of=("self",))
        .select_related(
            "student",
            "student__user",
            "proposed_supervisor",
            "academic_semester",
        )
        .get(pk=application_id)
    )
    if actor.role != User.Role.COORDINATOR:
        raise SupervisorApprovalForbidden(
            "Only Programme Coordinators can approve supervisor applications."
        )
    programme = coordinator_programme(actor)
    if (
        not programme
        or programme.casefold() != application.student.programme.strip().casefold()
    ):
        raise SupervisorApprovalForbidden(
            "This application is outside your managed programme."
        )

    if application.status == SupervisorApplication.Status.APPROVED:
        appointment = SupervisorAppointment.objects.filter(
            application=application,
            status=SupervisorAppointment.Status.ACTIVE,
        ).first()
        profile = StudentResearchProfile.objects.filter(
            student=application.student.user,
            supervisor=application.proposed_supervisor,
        ).first()
        if appointment and profile:
            return application, False
        raise SupervisorApprovalConflict(
            "The approved application is missing its appointment or research profile handoff."
        )

    if application.status != SupervisorApplication.Status.PENDING_COORDINATOR:
        raise SupervisorApprovalConflict(
            "This application is not awaiting Programme Coordinator review."
        )
    if not student_is_workflow_eligible(application.student):
        raise SupervisorApprovalConflict(
            "The student's lifecycle status does not permit final approval."
        )
    if not user_is_assignable_lecturer(application.proposed_supervisor):
        raise SupervisorApprovalConflict(
            "The proposed supervisor is not eligible for a new appointment."
        )
    Lecturer.objects.select_for_update().get(pk=application.proposed_supervisor_id)
    try:
        assert_capacity_allows_assignment(
            user=application.proposed_supervisor,
            semester=application.academic_semester,
            role=CapacityRole.SUPERVISOR,
        )
    except CapacityConflict as exc:
        raise SupervisorApprovalConflict(str(exc)) from exc

    _resolve_research_profile(application)
    previous_status = application.status
    application.status = SupervisorApplication.Status.APPROVED
    application.coordinator_decided_at = timezone.now()
    application.save(update_fields=["status", "coordinator_decided_at", "updated_at"])
    try:
        appointment = activate_replacement(
            model=SupervisorAppointment,
            replacement_source=application,
            actor=actor,
            create_values={
                "application": application,
                "student": application.student,
                "supervisor": application.proposed_supervisor,
                "approved_by": actor,
            },
        )
    except AppointmentLifecycleConflict as exc:
        raise SupervisorApprovalConflict(str(exc)) from exc
    if application.replaces_appointment_id:
        now = timezone.now()
        pending_recommendations = (
            PanelRecommendation.objects.select_for_update().filter(
                profile__student=application.student.user,
                supervisor=application.replaces_appointment.supervisor,
                status__in=PanelRecommendation.WORKLOAD_RESERVED_STATUSES,
            )
        )
        for recommendation in pending_recommendations:
            previous_panel_status = recommendation.status
            recommendation.status = PanelRecommendation.Status.CANCELLED_BY_SUPERVISOR
            recommendation.cancellation_reason = "Automatically cancelled because the Supervisor appointment was replaced."
            recommendation.cancelled_at = now
            recommendation.save(
                update_fields=[
                    "status",
                    "cancellation_reason",
                    "cancelled_at",
                    "updated_at",
                ]
            )
            AppointmentWorkflowEvent.objects.create(
                actor=actor,
                actor_role=actor.role,
                action="SYSTEM_CANCEL_SUPERVISOR_REPLACED",
                previous_status=previous_panel_status,
                new_status=recommendation.status,
                reason=recommendation.cancellation_reason,
                panel_recommendation=recommendation,
            )
    AppointmentWorkflowEvent.objects.create(
        actor=actor,
        actor_role=actor.role,
        action="COORDINATOR_APPROVE",
        previous_status=previous_status,
        new_status=application.status,
        supervisor_application=application,
    )
    return application, True
