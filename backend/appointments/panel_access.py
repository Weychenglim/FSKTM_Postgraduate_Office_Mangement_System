"""Shared existing authorization for Panel recommendation detail links."""
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import F, Q
from django.db.models.functions import Trim
from accounts.authorization import coordinator_manages_programme, coordinator_scope_q
from accounts.models import Student, User


def coordinator_panel_scope_q(user, *, include_legacy=False):
    """Linked Student is authoritative; inconsistent profiles cannot grant access."""
    scope = coordinator_scope_q(user, "profile__student__student__programme") & Q(
        profile__programme__trim__iexact=Trim(F("profile__student__student__programme"))
    )
    if include_legacy:
        scope |= Q(profile__student__isnull=True) & coordinator_scope_q(user, "profile__programme")
    return scope


def coordinator_can_decide_panel(user, recommendation, *, lock=False):
    profile = recommendation.profile
    if lock:
        # Re-read agreement under a profile lock after the view locks the Student.
        # A changed link requires a fresh review, never a decision on a new student.
        profile = type(profile).objects.select_for_update().get(pk=profile.pk)
        if profile.student_id != recommendation.profile.student_id:
            return False
    if not profile.student_id:
        return False
    try:
        student = (Student.objects.select_for_update().get(pk=profile.student_id)
                   if lock else profile.student.student)
    except ObjectDoesNotExist:
        return False
    if profile.programme.strip().casefold() != student.programme.strip().casefold():
        return False
    return coordinator_manages_programme(user, student.programme, lock=lock)


def can_view_panel_recommendation(user, recommendation):
    if user.role == User.Role.OFFICE_ADMIN:
        return True
    if user.pk in [recommendation.supervisor_id, recommendation.recommended_member_id]:
        return True
    return user.role == User.Role.COORDINATOR and coordinator_can_decide_panel(user, recommendation)
