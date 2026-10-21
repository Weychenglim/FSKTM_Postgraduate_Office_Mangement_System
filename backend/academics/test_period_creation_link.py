from datetime import timedelta
from unittest.mock import patch
from unittest import skipUnless
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from zoneinfo import ZoneInfo

from django.db import IntegrityError, connection, close_old_connections
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from academics.models import AcademicSemester, OperationalPeriod, OperationalPeriodAudit, OperationalEnforcement
from academics import test_operational_periods as fixtures
BASE = fixtures.BASE
from dashboard.models import SemesterTimeline, SemesterTimelineEntry, TimelineAuditLog
from marks.models import EvaluationPeriod, Rubric


class PeriodCreationLinkTests(TestCase):
    setUp = fixtures.OperationalPeriodTests.setUp
    data = fixtures.OperationalPeriodTests.data

    def event(self, **values):
        timeline = values.pop('timeline', None) or SemesterTimeline.objects.create(
            academic_semester=self.semester, semester=self.semester.label,
            session=self.semester.academic_session, uploaded_by=self.office)
        return SemesterTimelineEntry.objects.create(timeline=timeline, level='P1', step=1,
            title='Supervisor application event', detail='Demo event', action_owner='Students',
            deadline_start=self.semester.starts_on, deadline_end=self.semester.starts_on,
            target_roles=['STUDENT'], **values)

    def test_creation_can_link_an_event_without_publishing_or_enabling_restrictions(self):
        entry = self.event()
        response = self.client.post(BASE, self.data(timelineEntryId=entry.pk), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        entry.refresh_from_db()
        period = OperationalPeriod.objects.get(pk=response.data['id'])
        self.assertEqual(entry.operational_period_id, period.pk)
        self.assertEqual(period.lifecycle_status, 'DRAFT')
        self.assertFalse(OperationalEnforcement.objects.filter(enabled=True).exists())
        self.assertEqual(entry.deadline_start, timezone.localdate(period.opens_at, timezone=ZoneInfo('Asia/Kuala_Lumpur')))
        self.assertEqual(entry.deadline_end, timezone.localdate(period.closes_at, timezone=ZoneInfo('Asia/Kuala_Lumpur')))
        self.assertEqual(entry.title, 'Supervisor application event')
        self.assertEqual(entry.target_roles, ['STUDENT'])
        audit = TimelineAuditLog.objects.get(entry=entry)
        self.assertEqual(audit.actor, self.office)
        self.assertEqual(audit.after_values['operationalPeriodId'], period.pk)
        self.assertIsNone(audit.before_values['operationalPeriodId'])
        self.assertEqual(period.audits.get().after_values['timelineEntryId'], entry.pk)

    def test_linking_is_optional_and_supports_panel_creation(self):
        response = self.client.post(BASE, self.data(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        entry = self.event()
        response = self.client.post(BASE, self.data(activity='PANEL_RECOMMENDATION', timelineEntryId=entry.pk), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        entry.refresh_from_db()
        self.assertEqual(entry.operational_period.activity, 'PANEL_RECOMMENDATION')

    def test_foreign_or_replaced_or_deleted_event_cannot_leave_a_draft(self):
        entry = self.event()
        for case in ['foreign', 'replaced', 'deleted']:
            with self.subTest(case=case):
                if case == 'foreign':
                    original_semester = entry.timeline.academic_semester
                    other = AcademicSemester.objects.create(code='2027-2028-S1', academic_session='2027/2028', term='SEMESTER_I',
                        starts_on=self.semester.ends_on+timedelta(days=1), ends_on=self.semester.ends_on+timedelta(days=100), created_by=self.office)
                    entry.timeline.academic_semester = other
                    entry.timeline.save()
                elif case == 'replaced':
                    entry.timeline.academic_semester = original_semester
                    entry.timeline.is_active = False
                    entry.timeline.save()
                else:
                    entry.delete()
                response = self.client.post(BASE, self.data(timelineEntryId=entry.pk or 999999), format='json')
                self.assertEqual(response.status_code, 409, response.data)
                self.assertFalse(OperationalPeriod.objects.exists())
                self.assertFalse(OperationalPeriodAudit.objects.exists())

    def test_existing_operational_or_marks_owner_is_not_replaced(self):
        entry = self.event()
        original = OperationalPeriod.objects.create(academic_semester=self.semester, activity='SUPERVISOR_APPLICATION', name='Existing',
            opens_at=timezone.now(), closes_at=timezone.now()+timedelta(days=1), created_by=self.office)
        entry.operational_period = original
        entry.save()
        response = self.client.post(BASE, self.data(timelineEntryId=entry.pk), format='json')
        self.assertEqual(response.status_code, 409, response.data)
        self.assertEqual(OperationalPeriod.objects.count(), 1)
        entry.refresh_from_db()
        self.assertEqual(entry.operational_period_id, original.pk)
        marks = EvaluationPeriod.objects.create(academic_semester=self.semester, name='Existing marks', semester=self.semester.label,
            rubric=Rubric.objects.create(name='Rubric', code='creation-link'), opens_at=timezone.now(), closes_at=timezone.now()+timedelta(days=1))
        entry.operational_period = None
        entry.marks_period = marks
        entry.save()
        response = self.client.post(BASE, self.data(timelineEntryId=entry.pk), format='json')
        self.assertEqual(response.status_code, 409, response.data)
        self.assertEqual(OperationalPeriod.objects.count(), 1)
        entry.refresh_from_db()
        self.assertEqual(entry.marks_period_id, marks.pk)

    def test_audit_failure_rolls_back_both_records_and_period_audit(self):
        entry = self.event()
        with patch('dashboard.models.TimelineAuditLog.objects.create', side_effect=IntegrityError('Synthetic audit failure')):
            response = self.client.post(BASE, self.data(timelineEntryId=entry.pk), format='json')
        self.assertEqual(response.status_code, 409, response.data)
        self.assertFalse(OperationalPeriod.objects.exists())
        self.assertFalse(OperationalPeriodAudit.objects.exists())
        entry.refresh_from_db()
        self.assertIsNone(entry.operational_period_id)
        self.assertEqual(entry.deadline_start, self.semester.starts_on)

    def test_closed_semester_and_nonoffice_actor_cannot_link(self):
        entry = self.event()
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(BASE, self.data(timelineEntryId=entry.pk), format='json').status_code, 403)
        self.client.force_authenticate(self.office)
        self.semester.lifecycle_status = 'CLOSED'
        self.semester.save()
        self.assertEqual(self.client.post(BASE, self.data(timelineEntryId=entry.pk), format='json').status_code, 400)
        self.assertFalse(OperationalPeriod.objects.exists())


@skipUnless(connection.vendor == 'postgresql', 'Requires real row-level locking')
class ConcurrentPeriodCreationLinkTests(TransactionTestCase):
    setUp = fixtures.OperationalPeriodTests.setUp
    data = fixtures.OperationalPeriodTests.data
    event = PeriodCreationLinkTests.event

    def test_two_creations_cannot_claim_the_same_event(self):
        from rest_framework.test import APIClient
        entry = self.event()
        barrier = Barrier(2)
        payload = self.data(timelineEntryId=entry.pk)
        def create():
            close_old_connections()
            try:
                client = APIClient()
                client.force_authenticate(self.office)
                barrier.wait(timeout=10)
                return client.post(BASE, payload, format='json').status_code
            finally:
                connection.close()
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda _: create(), range(2)))
        self.assertEqual(sorted(results), [201, 409])
        self.assertEqual(OperationalPeriod.objects.count(), 1)
        self.assertEqual(OperationalPeriodAudit.objects.count(), 1)
        self.assertEqual(TimelineAuditLog.objects.count(), 1)
        entry.refresh_from_db()
        self.assertEqual(entry.operational_period_id, OperationalPeriod.objects.get().pk)

