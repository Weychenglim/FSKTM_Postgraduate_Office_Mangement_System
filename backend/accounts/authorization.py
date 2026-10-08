from functools import reduce
from operator import or_

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import CharField, Q
from django.db.models.functions import Trim

CharField.register_lookup(Trim)

from .models import Coordinator, CoordinatorDelegation, Lecturer, User


def coordinator_programme(user):
    """Regular programme only, retained for compatibility with existing callers."""
    if not user or user.role != User.Role.COORDINATOR:
        return ''
    try:
        return user.lecturer.coordinator.programme_managed.strip()
    except (AttributeError, ObjectDoesNotExist):
        return ''


def _eligible(user):
    return bool(user and user.pk and User.objects.filter(
        pk=user.pk, is_active=True, role=User.Role.COORDINATOR,
        lecturer__lifecycle_status=Lecturer.Lifecycle.ACTIVE,
        lecturer__coordinator__isnull=False,
    ).exists())


def _effective_delegations(user):
    from .delegations import today
    date = today()
    return CoordinatorDelegation.objects.filter(coordinator=user, revoked_at__isnull=True, starts_on__lte=date, ends_on__gte=date)


def coordinator_programmes(user):
    if not _eligible(user):
        return []
    regular = Coordinator.objects.get(pk=user.pk).programme_managed.strip()
    values = [regular] + list(_effective_delegations(user).values_list('programme', flat=True))
    result = {}
    for value in values:
        if value.strip():
            result.setdefault(value.strip().casefold(), value.strip())
    return list(result.values())


def coordinator_scope_q(user, field='programme'):
    return reduce(or_, (Q(**{f'{field}__trim__iexact': p}) for p in coordinator_programmes(user)), Q(pk__in=[]))


def coordinator_manages_programme(user, programme, *, lock=False):
    normalized = str(programme or '').strip().casefold()
    if not normalized or not _eligible(user):
        return False
    if lock:
        # Call inside atomic after workflow participant locks. Revocation locks this
        # same row, so a decision either completes first or observes revocation.
        rows = list(_effective_delegations(user).select_for_update().filter(programme__iexact=str(programme).strip()))
        if not _eligible(user):
            return False
        regular = Coordinator.objects.get(pk=user.pk).programme_managed.strip().casefold()
        from .delegations import today
        date = today()
        # Do not re-query the union here: a newly inserted grant would not have
        # been locked and could otherwise be revoked during this decision.
        return regular == normalized or any(
            row.revoked_at is None and row.starts_on <= date <= row.ends_on
            for row in rows
        )
    return normalized in [p.casefold() for p in coordinator_programmes(user)]


def programme_coordinators(programme):
    from .delegations import today
    programme = str(programme or '').strip()
    if not programme:
        return User.objects.none()
    date = today()
    return User.objects.filter(
        is_active=True, role=User.Role.COORDINATOR,
        lecturer__lifecycle_status=Lecturer.Lifecycle.ACTIVE,
        lecturer__coordinator__isnull=False,
    ).filter(
        Q(lecturer__coordinator__programme_managed__trim__iexact=programme) |
        Q(coordinator_delegations__programme__iexact=programme,
          coordinator_delegations__revoked_at__isnull=True,
          coordinator_delegations__starts_on__lte=date,
          coordinator_delegations__ends_on__gte=date)
    ).distinct()
