from django.db import transaction
from django.test import override_settings
from unittest.mock import patch
from accounts.models import User
from rest_framework.test import APITestCase
from . import test_coordinator_delegation as fixture
from .models import PanelRecommendation, PanelAppointment
from .panel_access import can_view_panel_recommendation


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class PanelProgrammeGuardTests(APITestCase):
    setUp = fixture.DelegatedAppointmentTests.setUp
    _lecturer = fixture.DelegatedAppointmentTests._lecturer
    grant = fixture.DelegatedAppointmentTests.grant
    _panel_appointment = fixture.DelegatedAppointmentTests._panel_appointment

    def pending(self):
        return PanelRecommendation.objects.create(profile=self.profile, supervisor=self.supervisor,
            recommended_member=self.panel, academic_semester=self.semester, status='PENDING_COORDINATOR')

    def decide(self, row, actor, action):
        self.client.force_authenticate(actor)
        return self.client.post(f'/api/appointments/panel/recommendations/{row.pk}/coordinator-{action}/',
                                {'reason': 'Requires revision'}, format='json')

    def mismatch(self):
        self.profile.programme = self.other_coordinator.lecturer.coordinator.programme_managed
        self.profile.save(update_fields=['programme'])

    def test_mismatch_denies_both_decisions_without_side_effects(self):
        self.mismatch()
        row = self.pending()
        for actor in (self.coordinator, self.other_coordinator):
            for action in ('approve', 'reject'):
                with self.subTest(actor=actor.pk, action=action), transaction.atomic():
                    response = self.decide(row, actor, action)
                    self.assertEqual(response.status_code, 403, response.data)
                    row.refresh_from_db()
                    self.assertEqual(row.status, 'PENDING_COORDINATOR')
                    self.assertIsNone(row.coordinator_decided_at)
                    self.assertFalse(row.workflow_events.exists())
                    self.assertFalse(PanelAppointment.objects.filter(recommendation=row).exists())

    def test_mismatch_queue_exact_access_and_capability_are_consistent(self):
        self.mismatch()
        row = self.pending()
        for actor in (self.coordinator, self.other_coordinator):
            self.client.force_authenticate(actor)
            self.assertEqual(self.client.get('/api/appointments/panel/coordinator-queue/').data, [])
            workspace = self.client.get('/api/appointments/panel/coordinator-workspace/').data
            self.assertEqual(workspace['queue'], [])
            self.assertEqual(workspace['records'], [])
            self.assertFalse(can_view_panel_recommendation(actor, row))
            self.assertEqual(self.client.get(f'/api/appointments/panel/recommendations/{row.pk}/').status_code, 403)
        self.client.force_authenticate(self.coordinator)
        team = self.client.get(f'/api/appointments/co-supervisor/students/{self.student.pk}/').data
        self.assertFalse(team['panel']['pending']['canView'])

    def test_mismatch_preserves_office_and_assigned_lecturer_audit(self):
        self.mismatch()
        row = self.pending()
        for actor in (self.office, self.supervisor, self.panel):
            self.client.force_authenticate(actor)
            self.assertTrue(can_view_panel_recommendation(actor, row))
            self.assertEqual(self.client.get(f'/api/appointments/panel/recommendations/{row.pk}/').status_code, 200)

    def test_unlinked_legacy_monitoring_does_not_grant_decisions(self):
        self.profile.student = None
        self.profile.save(update_fields=['student'])
        row = self.pending()
        self.client.force_authenticate(self.coordinator)
        workspace = self.client.get('/api/appointments/panel/coordinator-workspace/').data
        self.assertEqual([r['id'] for r in workspace['records']], [row.pk])
        self.assertEqual(workspace['queue'], [])
        self.assertEqual(self.client.get('/api/appointments/panel/coordinator-queue/').data, [])
        for action in ('approve', 'reject'):
            self.assertEqual(self.decide(row, self.coordinator, action).status_code, 403)
        self.client.force_authenticate(self.office)
        self.assertEqual(self.client.get(f'/api/appointments/panel/recommendations/{row.pk}/').status_code, 200)

    def test_valid_regular_and_delegated_decisions_pass(self):
        self.grant()
        for actor in (self.coordinator, self.other_coordinator):
            for action in ('approve', 'reject'):
                with transaction.atomic():
                    row = self.pending()
                    self.client.force_authenticate(actor)
                    self.assertTrue(can_view_panel_recommendation(actor, row))
                    self.assertIn(row.pk, [r['id'] for r in self.client.get('/api/appointments/panel/coordinator-queue/').data])
                    response = self.decide(row, actor, action)
                    self.assertEqual(response.status_code, 200, response.data)
                    row.refresh_from_db()
                    self.assertEqual(row.workflow_events.get().actor_id, actor.pk)
                    transaction.set_rollback(True)

    def test_scope_is_rechecked_after_workflow_locks(self):
        row = self.pending()
        for record in (self.profile, self.student):
            for action in ('approve', 'reject'):
                with self.subTest(record=type(record).__name__, action=action), transaction.atomic():
                    def change_programme():
                        type(record).objects.filter(pk=record.pk).update(programme='Different programme')
                    with patch('appointments.capacity_reassessment.lock_policy_semesters', side_effect=change_programme):
                        response = self.decide(row, self.coordinator, action)
                    self.assertEqual(response.status_code, 403, response.data)
                    row.refresh_from_db()
                    self.assertEqual(row.status, 'PENDING_COORDINATOR')
                    self.assertFalse(row.workflow_events.exists())
                    transaction.set_rollback(True)

    def test_normalized_programme_agreement_keeps_queue_and_exact_access(self):
        self.profile.programme = '  ' + self.student.programme.lower() + '  '
        self.profile.save(update_fields=['programme'])
        row = self.pending()
        self.client.force_authenticate(self.coordinator)
        self.assertTrue(can_view_panel_recommendation(self.coordinator, row))
        self.assertEqual([r['id'] for r in self.client.get('/api/appointments/panel/coordinator-queue/').data], [row.pk])
        self.assertEqual(self.decide(row, self.coordinator, 'reject').status_code, 200)

    def test_user_link_without_student_record_does_not_grant_authority(self):
        self.profile.student = User.objects.create_user(email='unregistered@example.test', role=User.Role.STUDENT)
        self.profile.save(update_fields=['student'])
        row = self.pending()
        self.client.force_authenticate(self.coordinator)
        self.assertFalse(can_view_panel_recommendation(self.coordinator, row))
        self.assertEqual(self.client.get('/api/appointments/panel/coordinator-queue/').data, [])
        for action in ('approve', 'reject'):
            self.assertEqual(self.decide(row, self.coordinator, action).status_code, 403)

    def end(self, appointment, actor):
        self.client.force_authenticate(actor)
        return self.client.post(f'/api/appointments/panel/appointments/{appointment.pk}/end/',
            {'outcome': 'COMPLETED', 'reason': 'Panel work complete'}, format='json')

    def test_panel_end_denies_foreign_mismatched_and_unlinked_scope(self):
        appointment = self._panel_appointment()
        self.assertEqual(self.end(appointment, self.other_coordinator).status_code, 403)
        self.mismatch()
        for actor in (self.coordinator, self.other_coordinator):
            with self.subTest(actor=actor.pk), transaction.atomic():
                self.assertEqual(self.end(appointment, actor).status_code, 403)
                appointment.refresh_from_db()
                self.assertEqual(appointment.status, 'ACTIVE')
        self.profile.student = None
        self.profile.save(update_fields=['student'])
        self.assertEqual(self.end(appointment, self.other_coordinator).status_code, 403)

    def test_panel_end_preserves_regular_delegated_and_office_legacy_authority(self):
        self.grant()
        appointment = self._panel_appointment()
        for actor in (self.coordinator, self.other_coordinator):
            with transaction.atomic():
                response = self.end(appointment, actor)
                self.assertEqual(response.status_code, 200, response.data)
                transaction.set_rollback(True)
        self.profile.student = None
        self.profile.save(update_fields=['student'])
        response = self.end(appointment, self.office)
        self.assertEqual(response.status_code, 200, response.data)

    def test_panel_end_denies_user_link_without_authoritative_student(self):
        appointment = self._panel_appointment()
        self.profile.student = User.objects.create_user(email='missing-student@example.test', role=User.Role.STUDENT)
        self.profile.save(update_fields=['student'])
        self.assertEqual(self.end(appointment, self.coordinator).status_code, 403)
