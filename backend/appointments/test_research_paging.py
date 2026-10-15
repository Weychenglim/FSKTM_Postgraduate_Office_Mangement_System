from datetime import timedelta
from unittest.mock import patch

from django.db import models
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import CoordinatorDelegation, Student, User
from . import research_amendments as service
from .models import ResearchAmendment, ResearchAmendmentEvent, StudentResearchProfile
from . import test_appointment_lifecycle as fixture


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class ResearchPagingTests(APITestCase):
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    base = '/api/appointments/research-amendments/'

    def setUp(self):
        fixture.AppointmentLifecycleTests.setUp(self)
        self.office.is_staff = True
        self.office.save(update_fields=['is_staff'])
        self.sequence = 0

    def row(self, status='PENDING_COORDINATOR', programme=None, kind='RESEARCH', title=True, abstract=False):
        self.sequence += 1
        programme = programme or self.student.programme
        user = User.objects.create_user(email=f'paging-{self.sequence}@example.test', full_name=f'Paging Student {self.sequence}', role=User.Role.STUDENT)
        student = Student.objects.create(user=user, matric_no=f'PAGE-{self.sequence:03}', programme=programme)
        profile = StudentResearchProfile.objects.create(student=user, student_name=user.full_name, matric_no=student.matric_no,
            programme=programme, semester=self.semester.label, proposed_topic='Original title', abstract='Original abstract', supervisor=self.supervisor)
        before = {'title': 'Original title', 'abstract': 'Original abstract', 'programme': programme}
        row = ResearchAmendment.objects.create(student=student, profile=profile, initiated_by=user, kind=kind, status=status,
            source_programme=programme, destination_programme=self.student.programme if kind == 'TRANSFER' else '', before_values=before,
            after_values={**before, 'title': 'Changed title' if title else before['title'], 'abstract': 'Changed abstract' if abstract else before['abstract']},
            baseline_revision=0, semester_snapshot={'label': self.semester.label}, academic_semester=self.semester,
            reason='Change explanation', student_name=user.full_name, matric_no=student.matric_no)
        return row

    def get(self, actor=None, **query):
        self.client.force_authenticate(user=actor or self.coordinator)
        response = self.client.get(self.base, query)
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_page_count_and_slice_happen_before_record_serialization(self):
        rows = [self.row('PENDING_SOURCE_COORDINATOR', kind='TRANSFER') for _ in range(12)]
        self.row('PENDING_SOURCE_COORDINATOR', programme='OUTSIDE PROGRAMME', kind='TRANSFER')
        with patch.object(service, 'request_payload', wraps=service.request_payload) as serialize:
            data = self.get(page=2, size=10, sort='oldest')
        self.assertIn('pagination', data)
        self.assertEqual(data['pagination']['total'], 12)
        self.assertEqual(data['pagination']['reviewCount'], 12)
        self.assertEqual(data['pagination']['pageCount'], 2)
        self.assertEqual([row['id'] for row in data['requests']], [rows[10].pk, rows[11].pk])
        self.assertEqual(serialize.call_count, 2)
        self.assertEqual(data['revisions'], [])

    def test_decision_default_and_all_ongoing_respect_active_participants(self):
        decision = self.row('PENDING_SOURCE_COORDINATOR', kind='TRANSFER')
        waiting = self.row('PENDING_SUPERVISOR')
        deferred = self.row('PENDING_SOURCE_COORDINATOR', kind='TRANSFER')
        Student.objects.filter(pk=deferred.student_id).update(status=Student.Status.DEFERRED)
        inactive = self.row('PENDING_SOURCE_COORDINATOR', kind='TRANSFER')
        User.objects.filter(pk=inactive.student_id).update(is_active=False)
        self.assertEqual([r['id'] for r in self.get(page=1)['requests']], [decision.pk])
        data = self.get(page=1, focus='all')
        self.assertEqual(data['pagination']['total'], 4)
        self.assertEqual(data['pagination']['reviewCount'], 1)
        self.assertIn(waiting.pk, [r['id'] for r in data['requests']])
        self.assertFalse(next(r for r in data['requests'] if r['id'] == inactive.pk)['canDecide'])
        self.assertFalse(self.client.get(self.base + f'{inactive.pk}/').data['canDecide'])

    def test_destination_and_acting_coordinator_scope_use_stage_programme(self):
        destination = self.row('PENDING_DESTINATION_COORDINATOR', programme='MASTER OF SOFTWARE ENGINEERING', kind='TRANSFER')
        delegated = self.row('PENDING_SOURCE_COORDINATOR', programme='DELEGATED PROGRAMME', kind='TRANSFER')
        CoordinatorDelegation.objects.create(coordinator=self.coordinator, programme='DELEGATED PROGRAMME',
            starts_on=timezone.localdate(), ends_on=timezone.localdate() + timedelta(days=2), granted_by=self.office, justification='Temporary cover')
        data = self.get(page=1)
        self.assertEqual({r['id'] for r in data['requests']}, {destination.pk, delegated.pk})
        self.assertEqual(data['pagination']['reviewCount'], 2)

    def test_search_type_programme_semester_and_history_outcome_dates(self):
        title = self.row('APPROVED')
        abstract = self.row('REJECTED', title=False, abstract=True)
        # History date filtering must use the outcome, not the earlier submission.
        models.QuerySet(model=ResearchAmendment).filter(pk=title.pk).update(created_at=timezone.now() - timedelta(days=40))
        for term in ('Title change', f'Research request #{title.pk}', f'Research amendment #{title.pk}', f'Request #{title.pk}', str(title.pk), title.matric_no):
            data = self.get(page=1, view='history', q=term, programme=self.student.programme, semester=self.semester.label)
            self.assertEqual([r['id'] for r in data['requests']], [title.pk], term)
        data = self.get(page=1, view='history', type='Abstract change', status='REJECTED', **{'from': timezone.localdate().isoformat(), 'to': timezone.localdate().isoformat()})
        self.assertEqual([r['id'] for r in data['requests']], [abstract.pk])
        self.assertEqual(self.get(page=1, view='history', status='APPROVED', **{'from': timezone.localdate().isoformat()})['pagination']['total'], 1)

    def test_student_withdrawals_hidden_from_pages_but_exact_audit_detail_remains(self):
        withdrawn = self.row('CANCELLED')
        ResearchAmendmentEvent.objects.create(request=withdrawn, actor=withdrawn.initiated_by, actor_role=User.Role.STUDENT,
            actor_name=withdrawn.student_name, action='CANCEL', previous_status='PENDING_SUPERVISOR', new_status='CANCELLED', reason='Withdrawn')
        office_cancelled = self.row('CANCELLED')
        ResearchAmendmentEvent.objects.create(request=office_cancelled, actor=self.office, actor_role=User.Role.OFFICE_ADMIN,
            actor_name=self.office.full_name, action='CANCEL', previous_status='PENDING_COORDINATOR', new_status='CANCELLED', reason='Office closure')
        data = self.get(page=1, view='history')
        self.assertEqual([r['id'] for r in data['requests']], [office_cancelled.pk])
        self.assertEqual(self.client.get(self.base + f'{withdrawn.pk}/', {'q': 'unrelated', 'view': 'requests'}).data['id'], withdrawn.pk)
        self.assertEqual(self.get(actor=withdrawn.initiated_by, page=1)['requests'][0]['id'], withdrawn.pk)

    def test_legacy_other_roles_keep_original_envelope_and_minimal_options_skip_profiles(self):
        self.row()
        for actor in (self.coordinator, self.office, self.student_user, self.supervisor):
            data = self.get(actor=actor, **({} if actor in (self.coordinator, self.office) else {'page': 1}))
            self.assertEqual(set(data), {'requests', 'revisions'})
        self.client.force_authenticate(user=self.coordinator)
        with patch.object(service, 'current_profiles', wraps=service.current_profiles) as profiles:
            options = self.client.get(self.base + 'options/', {'minimal': 'true'})
        self.assertEqual(options.status_code, 200)
        self.assertEqual(options.data['students'], [])
        self.assertEqual(profiles.call_count, 0)

    def test_waiting_sort_uses_current_stage_transition_and_stable_id_ties(self):
        old_submission = self.row()
        old_stage = self.row()
        tied_stage = self.row()
        now = timezone.now()
        models.QuerySet(model=ResearchAmendment).filter(pk=old_submission.pk).update(created_at=now - timedelta(days=30))
        for row, days in ((old_submission, 1), (old_stage, 8), (tied_stage, 8)):
            event = ResearchAmendmentEvent.objects.create(request=row, actor=self.supervisor, actor_role=User.Role.LECTURER,
                actor_name=self.supervisor.full_name, action='ENDORSE', previous_status='PENDING_SUPERVISOR', new_status='PENDING_COORDINATOR')
            event.created_at = now - timedelta(days=days)
            models.Model.save(event, update_fields=['created_at'])
        self.assertEqual([r['id'] for r in self.get(actor=self.office, page=1, sort='waiting')['requests']], [old_stage.pk, tied_stage.pk, old_submission.pk])
        self.assertEqual(self.get(actor=self.office, page=1, sort='oldest')['requests'][0]['id'], old_submission.pk)
        self.assertEqual(self.get(actor=self.office, page=1, sort='newest')['requests'][0]['id'], tied_stage.pk)

    def test_invalid_browse_parameters_are_rejected(self):
        self.client.force_authenticate(user=self.coordinator)
        for params in ({'sort':'invalid'}, {'view':'invalid'}, {'focus':'invalid'}, {'status':'invalid'}, {'type':'invalid'},
                       {'page':0}, {'page':'invalid'}, {'size':500}, {'from':'2026-13-01'}, {'to':'yesterday'},
                       {'from':'2026-10-10', 'to':'2026-10-01'}):
            response = self.client.get(self.base, {'page':1, **params})
            self.assertEqual(response.status_code, 400, params)
