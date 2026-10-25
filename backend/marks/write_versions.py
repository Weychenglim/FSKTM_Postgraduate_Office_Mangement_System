"""Opaque state tokens and canonical submission identities for lecturer writes."""
import json

from django.utils.crypto import salted_hmac


def entry_version(task, entry):
    values = {'taskId': task.pk, 'entry': None}
    if entry is not None:
        values['entry'] = {
            'id': entry.pk, 'status': entry.status, 'updatedAt': entry.updated_at.isoformat(),
            'submittedAt': entry.submitted_at.isoformat() if entry.submitted_at else None,
            'totalMark': str(entry.total_mark), 'comments': entry.comments,
            'scores': sorted((score.component_id, str(score.marks_awarded), score.feedback) for score in entry.scores.all()),
        }
    return salted_hmac('marks.lecturer-write', json.dumps(values, sort_keys=True), algorithm='sha256').hexdigest()


def submission_fingerprint(data):
    values = {
        'expectedVersion': data['expectedVersion'], 'comments': data.get('comments', ''),
        'scores': sorted((score['componentId'], format(score['marksAwarded'], '.2f'), score.get('feedback', '')) for score in data['scores']),
    }
    return salted_hmac('marks.submission-request', json.dumps(values, sort_keys=True), algorithm='sha256').hexdigest()
