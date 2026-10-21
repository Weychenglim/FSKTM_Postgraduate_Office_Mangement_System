"""Idempotent in-app delivery with a durable retry queue for optional email copies.

The scheduled command derives events from committed period/audit records. Module
mutations do not call email services or roll back if mail delivery is unavailable.
"""
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .emails import DEADLINE, SIGN_OFF, allows, email_users, portal_link
from .models import DeadlineEmailDelivery, Notification


def enqueue_deadline_notice(notice):
    user = notice['recipient']
    if not user.is_active or not user.deadline_reminders:
        return 0
    with transaction.atomic():
        notification, created = Notification.objects.get_or_create(
            recipient=user, event_key=notice['eventKey'],
            defaults={
                'title': notice['title'][:255], 'summary': notice['summary'][:255],
                'message': notice['message'], 'service': 'Postgraduate Office',
                'priority': 'high' if notice.get('urgent') else 'medium',
                'is_announcement': False, 'module_label': 'Deadline Reminder',
                'target_module': notice['targetModule'], 'record_type': notice['recordType'],
                'record_id': str(notice['recordId']),
                'reference': f"{notice['recordType']}-{notice['recordId']}"[:64],
            },
        )
        if created and allows(user, DEADLINE) and user.email:
            DeadlineEmailDelivery.objects.create(notification=notification, link=notice['link'])
    return int(created)


def deliver_deadline_emails(*, now=None, limit=200, valid_keys=None, current_notices=None, notice_loader=None):
    now = now or timezone.now()
    delivered = failed = 0
    # Claim each queue item under a lock, so simultaneous schedulers cannot send it twice.
    ids = DeadlineEmailDelivery.objects.filter(delivered_at__isnull=True).filter(
        Q(attempts=0) | Q(next_attempt_at__lte=now)).order_by('pk').values_list('pk', flat=True).iterator(chunk_size=200)
    for pk in ids:
        if delivered + failed >= limit:
            break
        with transaction.atomic():
            item = DeadlineEmailDelivery.objects.select_for_update().select_related(
                'notification__recipient').get(pk=pk)
            if item.delivered_at or (item.attempts > 0 and item.next_attempt_at > now):
                continue
            notification = item.notification
            user = notification.recipient
            staff_only = notification.target_module in ('MARKS', 'PANEL_APPOINTMENTS')
            current = (current_notices or {}).get((user.pk, notification.event_key))
            if notice_loader is not None:
                current = notice_loader(notification, max(now, timezone.now()))
            if staff_only and user.role != user.Role.LECTURER:
                item.delivered_at = now
                item.last_error = 'Skipped: staff audience is no longer eligible.'
            elif notice_loader is not None and current is None:
                item.delivered_at = now
                item.last_error = 'Skipped: current action or deadline changed.'
            elif valid_keys is not None and (notification.recipient_id, notification.event_key) not in valid_keys:
                item.delivered_at = now
                item.last_error = 'Skipped: deadline or outstanding action changed.'
            elif not user.is_active or not user.deadline_reminders or not allows(user, DEADLINE):
                item.delivered_at = now
                item.last_error = 'Skipped: recipient preferences or account changed.'
            else:
                item.attempts += 1
                try:
                    title = current['title'] if current else notification.title
                    message = current['message'] if current else notification.message
                    count = email_users([user], DEADLINE, title,
                        f"{message}\n\nOpen the portal: {portal_link(item.link)}\n\n{SIGN_OFF}")
                    if not count:
                        raise RuntimeError('Mail backend did not accept delivery.')
                    item.delivered_at = now
                    item.last_error = ''
                    delivered += 1
                except Exception as error:
                    item.last_error = type(error).__name__
                    item.next_attempt_at = now + timedelta(minutes=min(1440, 5 * 2 ** min(item.attempts, 8)))
                    failed += 1
            item.save(update_fields=['attempts', 'delivered_at', 'last_error', 'next_attempt_at'])
    return delivered, failed
