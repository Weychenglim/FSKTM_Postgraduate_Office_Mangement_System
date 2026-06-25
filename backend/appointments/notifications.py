from announcements.models import Notification


def publish_workflow_notification(
    *,
    recipient,
    actor,
    event_key,
    title,
    summary,
    message,
    module_label,
    target_module,
    record_type,
    record_id,
    priority=Notification.Priority.NORMAL,
):
    """Create one idempotent in-app workflow notification."""

    if recipient is None or recipient.pk == actor.pk:
        return None
    notification, _ = Notification.objects.get_or_create(
        recipient=recipient,
        event_key=event_key,
        defaults={
            "title": title,
            "service": "Postgraduate Office",
            "summary": summary,
            "message": message,
            "priority": priority,
            "is_announcement": False,
            "reference": f"{record_type}-{record_id}",
            "module_label": module_label,
            "target_module": target_module,
            "record_type": record_type,
            "record_id": str(record_id),
        },
    )
    return notification
