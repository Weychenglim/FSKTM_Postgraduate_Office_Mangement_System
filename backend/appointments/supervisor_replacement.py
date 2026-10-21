"""Office initiation of Primary Supervisor changes using the existing approval chain."""

from django.db import transaction
from django.db.models import Q
from rest_framework import serializers
from rest_framework.exceptions import APIException, PermissionDenied, NotFound

from academics.capacity import CapacityRole, CapacityState, resolve_lecturer_capacity
from academics.operational_periods import assert_intake_allowed
from academics.services import current_effective_semester
from accounts.eligibility import student_is_workflow_eligible, user_is_assignable_lecturer
from accounts.models import Lecturer, Student, User
from .models import (
    CoSupervisorAppointment, CoSupervisorNomination,
    StudentResearchProfile, SupervisorApplication, SupervisorAppointment,
)
from .role_integrity import panel_role_candidate_ids, assert_no_panel_role, AppointmentRoleConflict

PENDING = ("SUBMITTED_TO_SUPERVISOR", "PENDING_COORDINATOR")


class ReplacementConflict(APIException):
    status_code = 409
    default_code = "supervisor_replacement_conflict"


def is_office_replacement(application):
    """Use immutable submission attribution, independent of an actor's later role."""
    return bool(application.replaces_appointment_id and any(
        event.action == "SUBMIT" and event.actor_role == User.Role.OFFICE_ADMIN
        for event in application.workflow_events.all()
    ))


def require_office(actor):
    if actor.role != User.Role.OFFICE_ADMIN or not actor.is_active:
        raise PermissionDenied("Only the Office can initiate a Supervisor change.")


def assert_current_predecessor(application):
    """Caller holds the Student/request locks; legacy replacement history stays valid."""
    if not is_office_replacement(application):
        return
    predecessor = SupervisorAppointment.objects.select_for_update().filter(
        pk=application.replaces_appointment_id, student_id=application.student_id,
        status=SupervisorAppointment.Status.ACTIVE,
    ).first()
    if predecessor is None or hasattr(predecessor, "replacement_appointment"):
        raise ReplacementConflict("The Supervisor appointment selected for this Office change is no longer current. Review the student's supervision.")


class ReplacementSerializer(serializers.Serializer):
    proposedSupervisorId = serializers.CharField(allow_blank=False)
    reason = serializers.CharField(allow_blank=False)

    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - {"proposedSupervisorId", "reason"}:
            raise serializers.ValidationError({"detail": "Only proposedSupervisorId and reason may be submitted."})
        for key, value in data.items():
            if not isinstance(value, str):
                raise serializers.ValidationError({key: "Enter text."})
        return super().to_internal_value(data)


def _assert_available(appointment, *, semester, lock=False):
    from .serializers import enforce_no_pending_transfer, NoEffectiveSemester
    student = appointment.student
    if appointment.status != SupervisorAppointment.Status.ACTIVE or hasattr(appointment, "replacement_appointment"):
        raise ReplacementConflict("Select the student's current active Supervisor appointment.")
    if not student_is_workflow_eligible(student):
        raise ReplacementConflict("The student's lifecycle status does not permit a Supervisor change.")
    if student.supervisor_applications.filter(status__in=PENDING).exists():
        raise ReplacementConflict("An active Supervisor application already exists. Review the pending request.")
    enforce_no_pending_transfer(student.pk)
    if semester is None:
        raise NoEffectiveSemester()
    # Intake and personal extensions belong to the Student, including Office-created requests.
    assert_intake_allowed(semester=semester, activity="SUPERVISOR_APPLICATION",
                          student=student, participant=student.user, lock=lock)


def resolve_replacement_profile(appointment, *, lock=False):
    """Resolve the same owned profile at initiation and approval, including legacy casing."""
    rows = StudentResearchProfile.objects.filter(
        Q(student_id=appointment.student.user_id) | Q(matric_no__iexact=appointment.student.matric_no)
    )
    if lock:
        rows = rows.select_for_update()
    profiles = list(rows)
    if len(profiles) > 1 or profiles and profiles[0].student_id not in {None, appointment.student.user_id}:
        raise ReplacementConflict("Conflicting research profiles must be resolved before changing the Supervisor.")
    if profiles and profiles[0].supervisor_id != appointment.supervisor_id:
        raise ReplacementConflict("The saved research profile does not match the current Supervisor appointment. Resolve the records before changing the Supervisor.")
    return profiles[0] if profiles else None


def _research_payload(appointment, *, lock=False):
    profile = resolve_replacement_profile(appointment, lock=lock)
    source = appointment.application
    return {
        "researchTitle": profile.proposed_topic if profile else source.research_title,
        "researchArea": profile.research_area if profile else source.research_area,
        "researchAbstract": profile.abstract if profile else source.research_abstract,
        # Project course codes have no mutable profile counterpart.
        "projectCourseCodes": source.project_course_codes,
    }


def replacement_context(appointment, actor):
    from .serializers import SupervisorCandidateSerializer
    require_office(actor)
    semester = current_effective_semester()
    reason = None
    try:
        _assert_available(appointment, semester=semester)
    except APIException as exc:
        reason = str(exc.detail)
    try:
        research = _research_payload(appointment)
    except APIException as exc:
        reason = str(exc.detail)
        # Conflicting research ownership must not expose another Student's research.
        research = {"researchTitle": "", "researchArea": "", "researchAbstract": "", "projectCourseCodes": ""}
    pending = appointment.student.supervisor_applications.filter(
        status__in=PENDING, replaces_appointment=appointment
    ).order_by("-submitted_at", "-pk").first()
    excluded = panel_role_candidate_ids(appointment.student) | {appointment.supervisor_id}
    excluded.update(CoSupervisorAppointment.objects.filter(
        student=appointment.student, status="ACTIVE").values_list("supervisor_id", flat=True))
    excluded.update(CoSupervisorNomination.objects.filter(
        student=appointment.student, status__in=CoSupervisorNomination.PENDING_STATUSES
    ).values_list("candidate_id", flat=True))
    candidates = list(User.objects.filter(role=User.Role.LECTURER, is_active=True,
        lecturer__lifecycle_status=Lecturer.Lifecycle.ACTIVE, lecturer__supervisor__isnull=False
    ).exclude(pk__in=excluded).select_related("lecturer__supervisor").order_by("full_name", "pk")) if semester else []
    resolutions = {row.pk: resolve_lecturer_capacity(user=row, semester=semester, role=CapacityRole.SUPERVISOR)
                   for row in candidates}
    candidates = [row for row in candidates if resolutions[row.pk].state not in {
        CapacityState.INELIGIBLE, CapacityState.TEMPORARILY_UNAVAILABLE}]
    return {
        "appointmentId": appointment.pk, "studentId": appointment.student.matric_no,
        "studentName": appointment.student.user.full_name, "programme": appointment.student.programme,
        "currentSupervisor": appointment.supervisor.full_name, **research,
        "candidates": SupervisorCandidateSerializer(candidates, many=True,
            context={"capacity_resolutions": resolutions}).data,
        "canSubmit": reason is None, "blockedReason": reason,
        "pendingApplicationId": pending.pk if pending else None,
    }


@transaction.atomic
def initiate_replacement(*, appointment_id, actor, proposed_supervisor_id, reason):
    from .capacity_reassessment import lock_policy_semesters
    from .serializers import enforce_no_supporting_role, enforce_capacity
    from .views import record_workflow_event, notify_workflow
    from announcements.models import Notification
    require_office(actor)
    # Follow the shared policy -> Student -> appointment/request -> Lecturer lock order.
    lock_policy_semesters()
    source = SupervisorAppointment.objects.filter(pk=appointment_id).values("student_id").first()
    if source is None:
        raise NotFound("Supervisor appointment was not found.")
    student = Student.objects.select_for_update(of=("self",)).select_related("user").get(pk=source["student_id"])
    appointment = SupervisorAppointment.objects.select_for_update(of=("self",)).select_related(
        "application", "supervisor").get(pk=appointment_id)
    appointment.student = student
    semester = current_effective_semester()
    _assert_available(appointment, semester=semester, lock=True)
    try:
        candidate = User.objects.select_related("lecturer").get(
            lecturer__staff_no__iexact=proposed_supervisor_id,
            lecturer__supervisor__isnull=False, role=User.Role.LECTURER, is_active=True)
    except User.DoesNotExist as exc:
        raise serializers.ValidationError("The selected Supervisor was not found.") from exc
    except User.MultipleObjectsReturned as exc:
        raise ReplacementConflict(
            "More than one lecturer matches this staff ID. Correct the duplicate staff IDs in the lecturer registry before trying again."
        ) from exc
    if candidate.pk == appointment.supervisor_id:
        raise ReplacementConflict("The proposed Supervisor must be different from the current Supervisor.")
    enforce_no_supporting_role(student.pk, candidate.pk)
    lecturer = Lecturer.objects.select_for_update().get(pk=candidate.pk)
    candidate.lecturer = lecturer
    if not user_is_assignable_lecturer(candidate):
        raise ReplacementConflict("The proposed Supervisor is not available for new assignments.")
    try:
        assert_no_panel_role(student=student, candidate_id=candidate.pk)
    except AppointmentRoleConflict as exc:
        raise ReplacementConflict(str(exc)) from exc
    enforce_capacity(user=candidate, semester=semester, role=CapacityRole.SUPERVISOR)
    research = _research_payload(appointment, lock=True)
    application = SupervisorApplication.objects.create(
        student=student, academic_semester=semester, proposed_supervisor=candidate,
        research_title=research["researchTitle"], research_area=research["researchArea"],
        research_abstract=research["researchAbstract"], project_course_codes=research["projectCourseCodes"],
        replaces_appointment=appointment, replacement_reason=reason, section_a=None,
    )
    record_workflow_event(actor=actor, action="SUBMIT", previous_status="", new_status=application.status,
                          reason=reason, supervisor_application=application)
    notify_workflow(recipients=[candidate], actor=actor, event_key=f"supervisor:{application.pk}:submit",
        title="Supervisor change requires your review",
        summary=f"The Office initiated a Supervisor change for {student.user.full_name}.",
        message="Open Supervisor Appointments to accept or reject this Office-initiated change.",
        module_label="Supervisor Appointment", target_module="SUPERVISOR_APPOINTMENTS",
        record_type="SUPERVISOR_APPLICATION", record_id=application.pk, priority=Notification.Priority.MEDIUM)
    return application
