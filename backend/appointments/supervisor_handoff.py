from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone

from .models import (
    AppointmentWorkflowEvent,
    StudentResearchProfile,
    SupervisorApplication,
    SupervisorAppointment,
    count_supervisor_workload,
    supervisor_workload_limit,
)


User = get_user_model()


class SupervisorApprovalConflict(Exception):
    pass


class SupervisorApprovalForbidden(Exception):
    pass


def _coordinator_programme(actor):
    try:
        return actor.lecturer.coordinator.programme_managed.strip()
    except (AttributeError, ObjectDoesNotExist):
        return ""


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
    if has_history and profile.supervisor_id != application.proposed_supervisor_id:
        raise SupervisorApprovalConflict(
            "The existing research profile has downstream records for another supervisor and cannot be changed automatically."
        )
    if has_history:
        if profile.student_id is None:
            profile.student = student_user
            profile.save(update_fields=["student", "updated_at"])
        return profile

    for field, value in values.items():
        setattr(profile, field, value)
    profile.save(update_fields=[*values.keys(), "updated_at"])
    return profile


@transaction.atomic
def approve_supervisor_application(*, application_id, actor):
    application = (
        SupervisorApplication.objects.select_for_update()
        .select_related(
            "student",
            "student__user",
            "proposed_supervisor",
        )
        .get(pk=application_id)
    )
    if actor.role != User.Role.COORDINATOR:
        raise SupervisorApprovalForbidden(
            "Only Programme Coordinators can approve supervisor applications."
        )
    programme = _coordinator_programme(actor)
    if not programme or programme.casefold() != application.student.programme.strip().casefold():
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
    if count_supervisor_workload(
        application.proposed_supervisor
    ) >= supervisor_workload_limit(application.proposed_supervisor):
        raise SupervisorApprovalConflict(
            "This supervisor has reached the configured workload limit."
        )

    _resolve_research_profile(application)
    previous_status = application.status
    application.status = SupervisorApplication.Status.APPROVED
    application.coordinator_decided_at = timezone.now()
    application.save(
        update_fields=["status", "coordinator_decided_at", "updated_at"]
    )
    SupervisorAppointment.objects.create(
        application=application,
        student=application.student,
        supervisor=application.proposed_supervisor,
        approved_by=actor,
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
