"""Regressions for the deadlines people can actually use, rather than base dates."""
from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.core import mail
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from marks import test_completion_windows as fixtures
from marks.completion_windows import grant_completion_windows, revoke_completion_window
from marks.models import EvaluationPeriod, MarkEntry
from .models import Notification, DeadlineEmailDelivery, DeadlineReminderRun
from .deadline_delivery import enqueue_deadline_notice, deliver_deadline_emails
from .connected_reminders import notice
from .reminders import send_deadline_reminders


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'],
                   EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ConnectedMarksReminderTests(APITestCase):
    user = fixtures.CompletionWindowTests.user
    lecturer = fixtures.CompletionWindowTests.lecturer
    profile = fixtures.CompletionWindowTests.profile
    payload = fixtures.CompletionWindowTests.payload
    period = fixtures.CompletionWindowTests.period
    publish = fixtures.CompletionWindowTests.publish
    setUp = fixtures.CompletionWindowTests.setUp

    def prepare(self, *, closed=False):
        self.now = timezone.now()
        self.period_obj.closes_at = self.now + timedelta(days=1)
        if closed:
            self.period_obj.lifecycle_status = EvaluationPeriod.Lifecycle.CLOSED
        self.period_obj.save()

    def grant_until(self, days):
        return grant_completion_windows(task_ids=[self.task.pk],
            deadline=self.now + timedelta(days=days), actor=self.office,
            reason='Approved time to finish the outstanding evaluation')[0]

    def due_notices(self):
        return Notification.objects.filter(recipient=self.supervisor, target_module='MARKS',
                                           title__istartswith='Marks due')

    def test_later_personal_deadline_suppresses_normal_period_due_notice(self):
        self.prepare()
        self.grant_until(6)
        send_deadline_reminders(now=self.now)
        self.assertFalse(self.due_notices().exists())

    def test_closed_period_recovery_uses_personal_deadline_and_staff_audience(self):
        self.prepare(closed=True)
        self.grant_until(1)
        send_deadline_reminders(now=self.now)
        self.assertEqual(self.due_notices().count(), 1)
        notice = self.due_notices().get()
        self.assertIn('tomorrow', notice.title)
        self.assertIn('completion', notice.message.lower())
        self.assertFalse(Notification.objects.filter(recipient=self.student_profile.student).exists())
        send_deadline_reminders(now=self.now)
        self.assertEqual(self.due_notices().count(), 1)

    def test_revoked_closed_recovery_never_sends_its_old_deadline(self):
        self.prepare(closed=True)
        window = self.grant_until(1)
        revoke_completion_window(window_id=window.pk, actor=self.office,
                                 reason='The exceptional access is no longer required')
        send_deadline_reminders(now=self.now)
        self.assertFalse(self.due_notices().exists())

    def test_submitted_and_paused_tasks_are_excluded_from_deadline_reminders(self):
        self.prepare()
        MarkEntry.objects.create(task=self.task, status='SUBMITTED', submitted_at=self.now)
        send_deadline_reminders(now=self.now)
        self.assertFalse(self.due_notices().exists())
        self.task.mark_entry.delete()
        self.task.lifecycle_status = 'PAUSED'
        self.task.save()
        send_deadline_reminders(now=self.now)
        self.assertFalse(self.due_notices().exists())

    def test_three_day_notice_does_not_suppress_one_day_followup(self):
        self.prepare()
        self.period_obj.closes_at = self.now + timedelta(days=3)
        self.period_obj.save()
        send_deadline_reminders(now=self.now)
        send_deadline_reminders(now=self.now + timedelta(days=2))
        self.assertEqual(self.due_notices().count(), 2)

    def test_dry_run_does_not_create_notifications_or_send_email(self):
        self.prepare()
        before = Notification.objects.count()
        output = StringIO()
        call_command('send_deadline_reminders', '--dry-run', stdout=output)
        self.assertEqual(Notification.objects.count(), before)
        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(DeadlineReminderRun.objects.exists())
        self.assertIn('Dry run', output.getvalue())

    def test_failed_email_retries_without_duplicating_the_in_app_notice(self):
        self.prepare()
        self.supervisor.email_notifications=True
        self.supervisor.save()
        item=notice(self.supervisor,'retry-case','Extra time granted','Original deadline',
                    'MARKS','EVALUATION_PERIOD',self.period_obj.pk)
        self.assertEqual(enqueue_deadline_notice(item),1)
        self.assertEqual(enqueue_deadline_notice(item),0)
        with patch('announcements.deadline_delivery.email_users',return_value=0):
            self.assertEqual(deliver_deadline_emails(now=self.now),(0,1))
        queued=DeadlineEmailDelivery.objects.get()
        self.assertEqual(queued.attempts,1)
        self.assertIsNone(queued.delivered_at)
        self.assertEqual(Notification.objects.filter(event_key='retry-case').count(),1)
        self.assertEqual(deliver_deadline_emails(now=self.now+timedelta(minutes=30)),(1,0))
        self.assertEqual(len(mail.outbox),1)
        self.assertEqual(deliver_deadline_emails(now=self.now+timedelta(hours=1)),(0,0))

    def test_stale_or_newly_unauthorised_recipient_email_is_not_sent(self):
        self.prepare()
        self.supervisor.email_notifications=True
        self.supervisor.save()
        item=notice(self.supervisor,'shared-calendar-event','Deadline approaching','An event',
                    'DASHBOARD','TIMELINE_ENTRY',99)
        enqueue_deadline_notice(item)
        # The same event key still targets a different user, not this recipient.
        self.assertEqual(deliver_deadline_emails(now=self.now,
            valid_keys={(self.office.pk,'shared-calendar-event')}),(0,0))
        self.assertEqual(len(mail.outbox),0)
        self.assertIsNotNone(DeadlineEmailDelivery.objects.get().delivered_at)

    def test_retry_uses_current_deadline_content_without_rewriting_notification_history(self):
        self.prepare()
        self.supervisor.email_notifications=True
        self.supervisor.save()
        item=notice(self.supervisor,'extra:marks:example','Extra time granted','Deadline: 20 October',
                    'MARKS','EVALUATION_PERIOD',self.period_obj.pk)
        enqueue_deadline_notice(item)
        latest=dict(item,message='Effective deadline: 25 October')
        current={(self.supervisor.pk,item['eventKey']):latest}
        deliver_deadline_emails(now=self.now,valid_keys=set(current),current_notices=current)
        self.assertIn('25 October',mail.outbox[0].body)
        self.assertEqual(Notification.objects.get().message,'Deadline: 20 October')

    def test_transaction_rollback_leaves_no_queued_delivery(self):
        from django.db import transaction
        self.prepare()
        self.supervisor.email_notifications=True
        self.supervisor.save()
        with self.assertRaises(ValueError):
            with transaction.atomic():
                enqueue_deadline_notice(notice(self.supervisor,'rolled-back','Opening','Opening notice',
                    'MARKS','EVALUATION_PERIOD',self.period_obj.pk))
                raise ValueError('Cancel academic transaction')
        self.assertFalse(Notification.objects.exists())
        self.assertFalse(DeadlineEmailDelivery.objects.exists())
        self.assertEqual(len(mail.outbox),0)

    def test_stale_backlog_does_not_consume_limit_for_current_emails(self):
        self.prepare()
        self.supervisor.email_notifications=True
        self.supervisor.save()
        for index in range(201):
            enqueue_deadline_notice(notice(self.supervisor,f'old:{index}','Expired deadline','Expired',
                'MARKS','EVALUATION_PERIOD',self.period_obj.pk))
        current=notice(self.supervisor,'current','Current deadline','Current',
                       'MARKS','EVALUATION_PERIOD',self.period_obj.pk)
        enqueue_deadline_notice(current)
        self.assertEqual(deliver_deadline_emails(now=self.now,limit=1,
            valid_keys={(self.supervisor.pk,'current')}),(1,0))
        self.assertEqual(len(mail.outbox),1)

    def test_current_student_role_never_receives_queued_staff_marks_email(self):
        self.prepare()
        self.supervisor.email_notifications=True
        self.supervisor.save()
        item=notice(self.supervisor,'queued-marks','Marks due','Staff-only evaluation information',
                    'MARKS','EVALUATION_PERIOD',self.period_obj.pk)
        enqueue_deadline_notice(item)
        self.supervisor.role=self.supervisor.Role.STUDENT
        self.supervisor.save()
        self.assertEqual(deliver_deadline_emails(now=self.now,
            valid_keys={(self.supervisor.pk,'queued-marks')}),(0,0))
        self.assertEqual(len(mail.outbox),0)

    def test_student_cannot_read_retained_staff_notices_through_feed_or_direct_id(self):
        student=self.student_profile.student
        hidden=Notification.objects.create(recipient=student,title='Private evaluator task',
            message='Staff-only period and task details',target_module='MARKS',record_type='EVALUATION_PERIOD')
        self.client.force_authenticate(student)
        response=self.client.get('/api/notifications/')
        self.assertEqual(response.status_code,200)
        self.assertNotIn(str(hidden.pk),{item['id'] for item in response.data})
        response=self.client.post(f'/api/notifications/{hidden.pk}/read/',{},format='json')
        self.assertEqual(response.status_code,404)


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'],
                   EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ConnectedAppointmentReminderTests(APITestCase):
    user = fixtures.CompletionWindowTests.user
    lecturer = fixtures.CompletionWindowTests.lecturer
    profile = fixtures.CompletionWindowTests.profile
    payload = fixtures.CompletionWindowTests.payload
    period = fixtures.CompletionWindowTests.period
    publish = fixtures.CompletionWindowTests.publish
    setUp = fixtures.CompletionWindowTests.setUp
    def operation(self, activity='SUPERVISOR_APPLICATION', *, end_days=3):
        from academics.models import OperationalPeriod, OperationalEnforcement
        from appointments.models import SupervisorAppointment, PanelAppointment
        self.now=timezone.now()
        if activity=='SUPERVISOR_APPLICATION':
            SupervisorAppointment.objects.filter(student_id=self.student_profile.student_id).update(status='ENDED')
        else:
            PanelAppointment.objects.filter(profile=self.student_profile).update(status='ENDED')
        period=OperationalPeriod.objects.create(academic_semester=self.semester,activity=activity,
            name='Appointment intake',opens_at=self.now-timedelta(days=3),
            closes_at=self.now+timedelta(days=end_days),lifecycle_status='PUBLISHED',created_by=self.office)
        OperationalEnforcement.objects.create(academic_semester=self.semester,activity=activity,
            enabled=True,updated_by=self.office)
        return period

    def test_opening_and_closing_events_are_distinct_and_repeat_runs_are_idempotent(self):
        self.operation()
        send_deadline_reminders(now=self.now)
        student=self.student_profile.student
        notices=Notification.objects.filter(recipient=student,record_type='OPERATIONAL_PERIOD')
        self.assertEqual(notices.count(),2)
        send_deadline_reminders(now=self.now)
        self.assertEqual(notices.count(),2)
        send_deadline_reminders(now=self.now+timedelta(days=2))
        self.assertEqual(notices.count(),3)

    def test_panel_operational_reminders_go_to_supervisor_and_never_student(self):
        self.operation('PANEL_RECOMMENDATION')
        send_deadline_reminders(now=self.now)
        self.assertTrue(Notification.objects.filter(recipient=self.supervisor,record_type='OPERATIONAL_PERIOD').exists())
        self.assertFalse(Notification.objects.filter(recipient=self.student_profile.student).exists())

    def test_personal_appointment_deadline_supersedes_expired_period(self):
        from academics.operational_periods import grant_exception
        period=self.operation(end_days=-1)
        student=self.student_profile.student
        grant_exception(actor=self.office,period=period,student=student.student,participant=student,
            deadline=self.now+timedelta(days=1),reason='Approved late application')
        send_deadline_reminders(now=self.now)
        notices=Notification.objects.filter(recipient=student,record_type='OPERATIONAL_PERIOD')
        self.assertTrue(notices.filter(title__startswith='Submission due tomorrow').exists())
        self.assertTrue(notices.filter(title__startswith='Extra time granted').exists())

    def test_disabled_enforcement_and_already_submitted_cases_are_not_reminded(self):
        from academics.models import OperationalEnforcement
        from appointments.models import SupervisorApplication
        self.operation()
        OperationalEnforcement.objects.update(enabled=False)
        send_deadline_reminders(now=self.now)
        self.assertFalse(Notification.objects.filter(record_type='OPERATIONAL_PERIOD').exists())
        OperationalEnforcement.objects.update(enabled=True)
        SupervisorApplication.objects.filter(student_id=self.student_profile.student_id).update(status='PENDING_COORDINATOR')
        send_deadline_reminders(now=self.now)
        self.assertFalse(Notification.objects.filter(record_type='OPERATIONAL_PERIOD').exists())
