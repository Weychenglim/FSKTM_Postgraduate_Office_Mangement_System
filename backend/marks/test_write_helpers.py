"""Explicit current-version payloads for API workflow fixtures."""
from uuid import uuid4

from .models import EvaluationTask
from .write_versions import entry_version


def with_version(task, payload):
    fresh = EvaluationTask.objects.select_related('mark_entry').get(pk=task.pk)
    return {'expectedVersion': entry_version(fresh, getattr(fresh, 'mark_entry', None)), **payload}


def submission_payload(task):
    fresh = EvaluationTask.objects.select_related('mark_entry').get(pk=task.pk)
    entry = getattr(fresh, 'mark_entry', None)
    return with_version(fresh, {
        'submissionId': str(uuid4()),
        'scores': [{'componentId': score.component_id, 'marksAwarded': str(score.marks_awarded), 'feedback': score.feedback} for score in entry.scores.all()] if entry else [],
        'comments': entry.comments if entry else '',
    })
