"""In-app notices about letters, sent at most once per person and event."""
from announcements.models import Notification

LETTERS_MODULE = "LETTERS"


def send_notice(recipient, *, event_key, title, summary, message, record_type, record_id, reference="",
                priority=Notification.Priority.NORMAL):
    Notification.objects.get_or_create(
        recipient=recipient,
        event_key=event_key,
        defaults={
            "title": title[:255],
            "service": "Postgraduate Office",
            "summary": summary[:255],
            "message": message,
            "priority": priority,
            "is_announcement": False,
            "reference": (reference or "")[:64],
            "module_label": "Letter Generation",
            "target_module": LETTERS_MODULE,
            "record_type": record_type,
            "record_id": str(record_id),
        },
    )
