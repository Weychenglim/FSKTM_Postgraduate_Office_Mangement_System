from django.core.exceptions import ObjectDoesNotExist

from .models import User


def coordinator_programme(user):
    """Return the sole authoritative managed programme for a Coordinator user."""
    if not user or user.role != User.Role.COORDINATOR:
        return ""
    try:
        return user.lecturer.coordinator.programme_managed.strip()
    except (AttributeError, ObjectDoesNotExist):
        return ""


def coordinator_manages_programme(user, programme):
    managed = coordinator_programme(user)
    return bool(
        managed
        and managed.casefold() == str(programme or "").strip().casefold()
    )
