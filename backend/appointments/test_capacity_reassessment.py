from django.test import override_settings
from rest_framework.test import APITestCase
from . import test_appointment_lifecycle as fixture

@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class CapacityReassessmentTests(APITestCase):
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    def setUp(self):
        fixture.AppointmentLifecycleTests.setUp(self)
        self.office.is_staff = True
        self.office.save(update_fields=['is_staff'])
    def test_staff_collection_exists_and_student_cannot_read(self):
        self.client.force_authenticate(self.office)
        response = self.client.get('/api/appointments/capacity-reassessments/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['requests'], [])
        self.client.force_authenticate(self.student_user)
        self.assertEqual(self.client.get('/api/appointments/capacity-reassessments/').status_code, 403)

    def closed_request(self):
        from datetime import timedelta
        from django.utils import timezone
        from academics.models import AcademicSemester
        from academics.test_capacity_helpers import publish_test_capacity_plan
        from .models import SupervisorApplication
        AcademicSemester.objects.filter(pk=self.semester.pk).update(lifecycle_status='CLOSED')
        self.semester.refresh_from_db()
        self.active = AcademicSemester.objects.create(code='2100-2101-S1', academic_session='2100/2101', term='SEMESTER_I', starts_on=timezone.localdate()-timedelta(days=1), ends_on=timezone.localdate()+timedelta(days=90), lifecycle_status='ACTIVE', created_by=self.office)
        publish_test_capacity_plan(self.active, self.office)
        self.pending = SupervisorApplication.objects.create(student=self.student, proposed_supervisor=self.new_supervisor, academic_semester=self.semester, research_title='Carryover', research_area='AI', research_abstract='Research', status='PENDING_COORDINATOR', replaces_appointment=self.supervisor_appointment, replacement_reason='New supervision')
        return self.pending

    def authorize(self, row=None, **overrides):
        row = row or self.pending
        self.client.force_authenticate(self.office)
        data = {'reason':'Reassess pending carryover', 'expectedStatus':row.status, 'expectedActiveSemesterId':self.active.pk, 'expectedAuthorizationId':None, 'expectedEventId':None, **overrides}
        if 'expectedEventId' not in overrides and data['expectedAuthorizationId'] is not None:
            data['expectedEventId'] = data['expectedAuthorizationId']
        kind = 'SUPERVISOR' if row is self.pending else 'CO_SUPERVISOR'
        return self.client.post(f'/api/appointments/capacity-reassessments/{kind}/{row.pk}/authorize/', data, format='json')

    def test_authorized_supervisor_uses_current_policy_and_audits_consumption(self):
        from academics.models import LecturerAvailabilityWindow
        from django.utils import timezone
        from .supervisor_handoff import approve_supervisor_application
        self.closed_request()
        LecturerAvailabilityWindow.objects.create(academic_semester=self.semester, lecturer=self.new_supervisor.lecturer, starts_on=timezone.localdate(), ends_on=timezone.localdate(), reason='Original policy unavailable', role='SUPERVISOR', created_by=self.office)
        response = self.authorize()
        self.assertEqual(response.status_code, 200, response.data)
        approve_supervisor_application(application_id=self.pending.pk, actor=self.coordinator)
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.academic_semester_id, self.semester.pk)
        events = list(self.pending.capacity_reassessments.all())
        self.assertEqual([e.action for e in events], ['GRANTED','CONSUMED'])
        self.assertEqual(events[-1].policy['semesterId'], self.active.pk)

    def test_stale_authorization_blocks_final_approval(self):
        from academics.models import AcademicSemester
        from .supervisor_handoff import approve_supervisor_application, SupervisorApprovalConflict
        self.closed_request()
        self.assertEqual(self.authorize().status_code, 200)
        AcademicSemester.objects.filter(pk=self.active.pk).update(lifecycle_status='CLOSED')
        with self.assertRaises(SupervisorApprovalConflict):
            approve_supervisor_application(application_id=self.pending.pk, actor=self.coordinator)

    def test_grant_replace_revoke_and_stale_inputs_are_audited(self):
        from django.core.exceptions import ValidationError
        self.closed_request()
        granted = self.authorize()
        self.assertEqual(granted.status_code, 200)
        grant_id = granted.data['authorization']['id']
        self.assertEqual(self.authorize().status_code, 409)
        self.assertEqual(self.authorize(expectedStatus='SUBMITTED_TO_SUPERVISOR', expectedAuthorizationId=grant_id).status_code, 409)
        replaced = self.authorize(expectedAuthorizationId=grant_id)
        self.assertEqual(replaced.status_code, 200)
        replacement_id = replaced.data['authorization']['id']
        revoked = self.client.post(f'/api/appointments/capacity-reassessments/SUPERVISOR/{self.pending.pk}/revoke/', {'reason':'Policy review', 'expectedStatus':self.pending.status, 'expectedAuthorizationId':replacement_id, 'expectedEventId':replacement_id}, format='json')
        self.assertEqual(revoked.status_code, 200, revoked.data)
        self.assertEqual(revoked.data['authorization']['state'], 'REVOKED')
        self.assertEqual(self.authorize(expectedAuthorizationId=replacement_id, expectedEventId=replacement_id).status_code, 409)
        self.assertIsNone(revoked.data['history'][-1]['policy'])
        self.assertEqual([e.action for e in self.pending.capacity_reassessments.all()], ['GRANTED','REPLACED','REVOKED'])
        with self.assertRaises(ValidationError):
            self.pending.capacity_reassessments.all().update(reason='Rewrite')
        with self.assertRaises(ValidationError):
            self.pending.capacity_reassessments.first().delete()

    def test_closed_only_and_reason_and_office_required(self):
        from academics.models import AcademicSemester
        self.closed_request()
        self.assertEqual(self.authorize(reason='  ').status_code, 400)
        for state in ['ACTIVE','ARCHIVED']:
            AcademicSemester.objects.filter(pk=self.active.pk).update(lifecycle_status='CLOSED')
            AcademicSemester.objects.filter(pk=self.semester.pk).update(lifecycle_status=state)
            self.assertEqual(self.authorize().status_code, 409)
        self.client.force_authenticate(self.coordinator)
        self.assertEqual(self.client.post(f'/api/appointments/capacity-reassessments/SUPERVISOR/{self.pending.pk}/authorize/', {'reason':'Reason','expectedStatus':self.pending.status,'expectedAuthorizationId':None,'expectedEventId':None,'expectedActiveSemesterId':self.active.pk}, format='json').status_code, 403)

    def test_reads_scope_includes_acting_coordinator_and_denies_options(self):
        from django.utils import timezone
        from accounts.models import CoordinatorDelegation
        self.closed_request()
        self.authorize()
        self.client.force_authenticate(self.other_coordinator)
        url = '/api/appointments/capacity-reassessments/'
        self.assertEqual(self.client.get(url).data['requests'], [])
        CoordinatorDelegation.objects.create(coordinator=self.other_coordinator, programme=self.student.programme, starts_on=timezone.localdate(), ends_on=timezone.localdate(), justification='Cover', granted_by=self.office)
        self.assertEqual(len(self.client.get(url).data['requests']), 1)
        for actor in [self.student_user, self.new_supervisor]:
            self.client.force_authenticate(actor)
            self.assertEqual(self.client.get(url).status_code, 403)
            self.assertEqual(self.client.options(url).status_code, 403)

    def test_current_unavailability_rechecked_and_revoke_restores_source(self):
        from academics.models import LecturerAvailabilityWindow
        from django.utils import timezone
        from .supervisor_handoff import approve_supervisor_application, SupervisorApprovalConflict
        self.closed_request()
        granted = self.authorize()
        LecturerAvailabilityWindow.objects.create(academic_semester=self.active, lecturer=self.new_supervisor.lecturer, starts_on=timezone.localdate(), ends_on=timezone.localdate(), role='SUPERVISOR', reason='Unavailable', created_by=self.office)
        with self.assertRaises(SupervisorApprovalConflict):
            approve_supervisor_application(application_id=self.pending.pk, actor=self.coordinator)
        self.assertEqual(self.pending.capacity_reassessments.count(), 1)
        self.client.post(f'/api/appointments/capacity-reassessments/SUPERVISOR/{self.pending.pk}/revoke/', {'reason':'Use original policy', 'expectedStatus':self.pending.status, 'expectedAuthorizationId':granted.data['authorization']['id'], 'expectedEventId':granted.data['latestEventId']}, format='json')
        approve_supervisor_application(application_id=self.pending.pk, actor=self.coordinator)
        self.assertEqual(self.pending.capacity_reassessments.count(), 2)

    def test_co_supervisor_acceptance_and_final_use_current_policy(self):
        from academics.models import LecturerAvailabilityWindow
        from django.utils import timezone
        from .models import CoSupervisorNomination, SupervisorApplication
        from .co_supervision import decide
        self.closed_request()
        SupervisorApplication.objects.filter(pk=self.pending.pk).update(status='CANCELLED_BY_STUDENT')
        row = CoSupervisorNomination.objects.create(student=self.student, primary_appointment=self.supervisor_appointment, nominator=self.supervisor, candidate=self.new_supervisor, academic_semester=self.semester, justification='Support', status='SUBMITTED_TO_CO_SUPERVISOR')
        LecturerAvailabilityWindow.objects.create(academic_semester=self.semester, lecturer=self.new_supervisor.lecturer, starts_on=timezone.localdate(), ends_on=timezone.localdate(), role='SUPERVISOR', reason='Original unavailable', created_by=self.office)
        response = self.authorize(row)
        self.assertEqual(response.status_code, 200, response.data)
        decide(nomination_id=row.pk, actor=self.new_supervisor, action='accept')
        decide(nomination_id=row.pk, actor=self.coordinator, action='approve')
        row.refresh_from_db()
        self.assertEqual(row.status, 'APPROVED')
        self.assertEqual([e.action for e in row.capacity_reassessments.all()], ['GRANTED','CONSUMED'])

    def test_panel_self_reservation_is_excluded_and_policy_consumed(self):
        from .models import PanelRecommendation
        self.closed_request()
        row = PanelRecommendation.objects.create(profile=self.profile, supervisor=self.supervisor, recommended_member=self.panel, academic_semester=self.semester, status='PENDING_COORDINATOR')
        self.client.force_authenticate(self.office)
        response = self.client.post(f'/api/appointments/capacity-reassessments/PANEL/{row.pk}/authorize/', {'reason':'Carryover', 'expectedStatus':row.status,'expectedAuthorizationId':None,'expectedEventId':None,'expectedActiveSemesterId':self.active.pk}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['currentCapacity']['reservedLoad'], 0)
        self.client.force_authenticate(self.coordinator)
        response = self.client.post(f'/api/appointments/panel/recommendations/{row.pk}/coordinator-approve/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([e.action for e in row.capacity_reassessments.all()], ['GRANTED','CONSUMED'])
    def test_archived_acceptance_locked_but_full_capacity_acceptance_unchanged(self):
        from academics.models import AcademicSemester, LecturerAvailabilityWindow
        from django.utils import timezone
        from .models import SupervisorApplication, PanelRecommendation
        self.closed_request()
        SupervisorApplication.objects.filter(pk=self.pending.pk).update(status='SUBMITTED_TO_SUPERVISOR')
        LecturerAvailabilityWindow.objects.create(academic_semester=self.semester, lecturer=self.new_supervisor.lecturer, starts_on=timezone.localdate(), ends_on=timezone.localdate(), role='SUPERVISOR', reason='Unavailable', created_by=self.office)
        self.client.force_authenticate(self.new_supervisor)
        url = f'/api/appointments/supervisor/applications/{self.pending.pk}/supervisor-accept/'
        self.assertEqual(self.client.post(url).status_code, 200)
        SupervisorApplication.objects.filter(pk=self.pending.pk).update(status='SUBMITTED_TO_SUPERVISOR')
        AcademicSemester.objects.filter(pk=self.semester.pk).update(lifecycle_status='ARCHIVED')
        self.assertEqual(self.client.post(url).status_code, 409)
        row = PanelRecommendation.objects.create(profile=self.profile, supervisor=self.supervisor, recommended_member=self.panel, academic_semester=self.semester, status='SUBMITTED_TO_PANEL')
        self.client.force_authenticate(self.panel)
        self.assertEqual(self.client.post(f'/api/appointments/panel/recommendations/{row.pk}/panel-accept/').status_code, 409)
    def test_capacity_filled_after_grant_blocks_approval(self):
        from accounts.models import Supervisor, Student, User
        from .models import SupervisorApplication, SupervisorAppointment
        from .supervisor_handoff import approve_supervisor_application, SupervisorApprovalConflict
        Supervisor.objects.filter(pk=self.new_supervisor.pk).update(max_supervisees=1)
        self.closed_request()
        response = self.authorize()
        self.assertEqual(response.data['currentCapacity']['limit'], 1)
        other_user = User.objects.create_user(email='other-capacity@example.test', full_name='Other', role='STUDENT')
        other = Student.objects.create(user=other_user, matric_no='OTHER-CAP', programme=self.student.programme)
        application = SupervisorApplication.objects.create(student=other, proposed_supervisor=self.new_supervisor, academic_semester=self.active, status='APPROVED')
        SupervisorAppointment.objects.create(application=application, student=other, supervisor=self.new_supervisor, approved_by=self.coordinator)
        with self.assertRaises(SupervisorApprovalConflict):
            approve_supervisor_application(application_id=self.pending.pk, actor=self.coordinator)
        self.assertEqual(self.pending.capacity_reassessments.count(), 1)

    def test_stale_target_can_be_replaced_and_original_retained(self):
        from academics.models import AcademicSemester
        from academics.test_capacity_helpers import publish_test_capacity_plan
        self.closed_request()
        grant = self.authorize().data
        AcademicSemester.objects.filter(pk=self.active.pk).update(lifecycle_status='CLOSED')
        newer = AcademicSemester.objects.create(code='2101-2102-S1', academic_session='2101/2102', term='SEMESTER_I', starts_on=self.active.starts_on, ends_on=self.active.ends_on, lifecycle_status='ACTIVE', created_by=self.office)
        publish_test_capacity_plan(newer, self.office)
        self.active = newer
        result = self.authorize(expectedAuthorizationId=grant['authorization']['id'], expectedEventId=grant['latestEventId'])
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data['authorization']['targetSemester']['id'], newer.pk)
        self.assertEqual(result.data['originalSemester']['id'], self.semester.pk)
        self.assertEqual([event['action'] for event in result.data['history']], ['GRANTED', 'REPLACED'])

    def test_candidate_and_student_eligibility_rechecked_after_grant(self):
        from accounts.models import User, Student
        from .supervisor_handoff import approve_supervisor_application, SupervisorApprovalConflict
        self.closed_request()
        self.authorize()
        User.objects.filter(pk=self.new_supervisor.pk).update(is_active=False)
        with self.assertRaises(SupervisorApprovalConflict):
            approve_supervisor_application(application_id=self.pending.pk, actor=self.coordinator)
        User.objects.filter(pk=self.new_supervisor.pk).update(is_active=True)
        Student.objects.filter(pk=self.student.pk).update(status=Student.Status.DEFERRED)
        with self.assertRaises(SupervisorApprovalConflict):
            approve_supervisor_application(application_id=self.pending.pk, actor=self.coordinator)
        self.assertEqual(self.pending.capacity_reassessments.count(), 1)

    def test_unlinked_legacy_panel_cannot_be_authorized(self):
        from .models import PanelRecommendation
        self.closed_request()
        self.profile.student = None
        self.profile.save(update_fields=['student'])
        row = PanelRecommendation.objects.create(profile=self.profile, supervisor=self.supervisor, recommended_member=self.panel, academic_semester=self.semester, status='PENDING_COORDINATOR')
        self.client.force_authenticate(self.office)
        result = self.client.post(f'/api/appointments/capacity-reassessments/PANEL/{row.pk}/authorize/', {'reason':'Carryover','expectedStatus':row.status,'expectedAuthorizationId':None,'expectedEventId':None,'expectedActiveSemesterId':self.active.pk}, format='json')
        self.assertEqual(result.status_code, 409)

from rest_framework.test import APITransactionTestCase

@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class CapacityReassessmentConcurrencyTests(APITransactionTestCase):
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    setUp = CapacityReassessmentTests.setUp
    closed_request = CapacityReassessmentTests.closed_request
    authorize = CapacityReassessmentTests.authorize

    def _approval_race(self, mutation):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Event
        from django.db import close_old_connections, connections, transaction
        from academics.models import AcademicSemester, LecturerAvailabilityWindow
        from django.utils import timezone
        from .capacity_reassessment import decide, lock_policy_semesters
        from .supervisor_handoff import approve_supervisor_application, SupervisorApprovalConflict
        self.closed_request()
        grant = self.authorize().data
        LecturerAvailabilityWindow.objects.create(academic_semester=self.semester, lecturer=self.new_supervisor.lecturer, starts_on=timezone.localdate(), ends_on=timezone.localdate(), role='SUPERVISOR', reason='Original unavailable', created_by=self.office)
        held, started, release = Event(), Event(), Event()
        def mutate():
            close_old_connections()
            try:
                with transaction.atomic():
                    lock_policy_semesters()
                    if mutation == 'revoke':
                        decide(actor=self.office, kind='SUPERVISOR', pk=self.pending.pk, action='revoke', data={'reason':'Revoked during review','expectedStatus':self.pending.status,'expectedAuthorizationId':grant['authorization']['id'],'expectedEventId':grant['latestEventId']})
                    else:
                        AcademicSemester.objects.filter(pk=self.active.pk).update(lifecycle_status='CLOSED')
                    held.set()
                    if not release.wait(10):
                        raise AssertionError('Approval did not start')
            finally:
                connections.close_all()
        def approve():
            close_old_connections()
            try:
                started.set()
                try:
                    approve_supervisor_application(application_id=self.pending.pk, actor=self.coordinator)
                except SupervisorApprovalConflict:
                    return 'blocked'
                return 'approved'
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            first = pool.submit(mutate)
            self.assertTrue(held.wait(10))
            second = pool.submit(approve)
            self.assertTrue(started.wait(10))
            release.set()
            first.result(timeout=15)
            self.assertEqual(second.result(timeout=15), 'blocked')
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, 'PENDING_COORDINATOR')
        self.assertFalse(self.pending.capacity_reassessments.filter(action='CONSUMED').exists())

    def test_revocation_commits_before_waiting_approval(self):
        self._approval_race('revoke')

    def test_semester_closure_commits_before_waiting_approval(self):
        self._approval_race('close')
