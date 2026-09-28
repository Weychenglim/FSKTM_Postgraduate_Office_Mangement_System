"""Locked closure snapshots and signed acknowledgement of unfinished Marks work."""
import hashlib
import json

from django.core import signing
from django.db import transaction
from django.utils import timezone

from academics.models import AcademicSemester
from academics.services import SemesterConflict, lock_academic_semesters
from .models import EvaluationPeriod, EvaluationTask, MarkEntry

COUNT_KEYS = ('submitted', 'notStarted', 'draft', 'paused', 'activeWindows', 'unfinished')
TOKEN_SALT = 'marks.closure-preview.v1'


def _counts():
    return dict.fromkeys(COUNT_KEYS, 0)


def _row(instance):
    return {field.attname: str(getattr(instance, field.attname)) for field in instance._meta.concrete_fields}


def _snapshot(semester, *, period=None, target_semester=None):
    """Caller owns semester locks; retain descendants until its transaction ends."""
    from .models import TaskCompletionWindow

    periods = EvaluationPeriod.objects.select_for_update(no_key=True).order_by('pk')
    if period is not None:
        periods = periods.filter(pk=period.pk)
    elif semester is not None:
        periods = periods.filter(academic_semester=semester)
    else:
        periods = periods.none()
    periods = list(periods)
    task_query = EvaluationTask.objects.select_for_update().filter(period_id__in=[p.pk for p in periods]).order_by('pk')
    tasks = list(task_query)
    # A handover that already held an original task may insert its replacement
    # before releasing that task. Re-read after waiting so the preview includes
    # the replacement, rather than silently reporting no unfinished work.
    while True:
        refreshed = list(task_query.all())
        stable = {task.pk for task in tasks} == {task.pk for task in refreshed}
        tasks = refreshed
        if stable:
            break
    windows = list(TaskCompletionWindow.objects.select_for_update().filter(task_id__in=[t.pk for t in tasks]).order_by('pk'))
    entries = list(MarkEntry.objects.select_for_update().filter(task_id__in=[t.pk for t in tasks]).order_by('pk'))
    entries_by_task = {entry.task_id: entry for entry in entries}
    now = timezone.now()
    active_task_ids = {window.task_id for window in windows if window.ended_at is None and window.deadline > now}
    rows = {p.pk: {'periodId': p.pk, 'name': p.name, **_counts()} for p in periods}
    protected = False
    for task in tasks:
        if task.lifecycle_status == EvaluationTask.Lifecycle.RETIRED:
            continue
        row = rows[task.period_id]
        entry = entries_by_task.get(task.pk)
        if entry and entry.status == MarkEntry.Status.SUBMITTED:
            row['submitted'] += 1
        else:
            row['unfinished'] += 1
            if task.lifecycle_status == EvaluationTask.Lifecycle.PAUSED:
                row['paused'] += 1
            elif entry and entry.status == MarkEntry.Status.DRAFT:
                row['draft'] += 1
            else:
                row['notStarted'] += 1
            protected = protected or task.pk in active_task_ids
        if task.pk in active_task_ids and not (entry and entry.status == MarkEntry.Status.SUBMITTED):
            row['activeWindows'] += 1
    totals = {key: sum(row[key] for row in rows.values()) for key in COUNT_KEYS}
    state = {
        'scope': 'period' if period is not None else ('handover' if target_semester else 'semester'),
        'semester': _row(semester) if semester else None,
        'target': _row(target_semester) if target_semester else None,
        'periods': [_row(p) for p in periods],
        'tasks': [_row(t) for t in tasks],
        'windows': [_row(w) for w in windows],
        'entries': [_row(e) for e in entries],
        'activeTaskIds': sorted(active_task_ids),
    }
    digest = hashlib.sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()
    payload = {'semesterId': semester.pk if semester else None, 'periods': list(rows.values()), 'totals': totals, 'requiresAcknowledgement': bool(totals['unfinished'])}
    if period is not None:
        payload['periodId'] = period.pk
    payload['previewToken'] = signing.dumps({'fingerprint': digest}, salt=TOKEN_SALT)
    return payload, digest, protected


@transaction.atomic
def period_closure_preview(period):
    semesters = lock_academic_semesters([period.academic_semester_id])
    semester = semesters.get(period.academic_semester_id)
    return _snapshot(semester, period=period)[0]


@transaction.atomic
def semester_closure_preview(semester, *, target_semester=None):
    semesters = lock_academic_semesters()
    if target_semester is not None:
        target_semester = semesters[target_semester.pk]
        semester = next((s for s in semesters.values() if s.lifecycle_status == AcademicSemester.Lifecycle.ACTIVE and s.pk != target_semester.pk), None)
    else:
        semester = semesters[semester.pk]
    return _snapshot(semester, target_semester=target_semester)[0]


def _validate(snapshot, *, preview_token=None, acknowledge_unfinished=False):
    payload, fingerprint, _protected = snapshot
    if not preview_token:
        if payload['requiresAcknowledgement']:
            raise SemesterConflict('Review a fresh closure preview and acknowledge unfinished Marks work before continuing.')
        return
    try:
        token = signing.loads(preview_token, salt=TOKEN_SALT, max_age=1800)
    except (signing.BadSignature, TypeError, ValueError):
        raise SemesterConflict('The closure preview is invalid or expired. Refresh it and try again.')
    if not isinstance(token, dict) or token.get('fingerprint') != fingerprint:
        raise SemesterConflict('Marks work changed since the closure preview. Refresh it and try again.')
    if payload['requiresAcknowledgement'] and acknowledge_unfinished is not True:
        raise SemesterConflict('Acknowledge unfinished Marks work before continuing.')


def validate_period_closure(period, *, preview_token=None, acknowledge_unfinished=False):
    semester = AcademicSemester.objects.filter(pk=period.academic_semester_id).first()
    _validate(_snapshot(semester, period=period), preview_token=preview_token, acknowledge_unfinished=acknowledge_unfinished)


def validate_semester_closure(semester, *, target_semester=None, preview_token=None, acknowledge_unfinished=False):
    _validate(_snapshot(semester, target_semester=target_semester), preview_token=preview_token, acknowledge_unfinished=acknowledge_unfinished)


def assert_period_archive_allowed(period):
    semester = AcademicSemester.objects.filter(pk=period.academic_semester_id).first()
    if _snapshot(semester, period=period)[2]:
        raise SemesterConflict('Unfinished Marks work has active completion windows. Complete the work or revoke those windows before archiving.')


def assert_semester_archive_allowed(semester):
    if _snapshot(semester)[2]:
        raise SemesterConflict('Unfinished Marks work has active completion windows. Complete the work or revoke those windows before archiving.')
