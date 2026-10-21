from django.test import override_settings
from rest_framework.test import APITestCase
from . import test_coordinator_delegation as fixture

@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class PanelStaffProjectionTests(APITestCase):
    setUp = fixture.DelegatedAppointmentTests.setUp
    _lecturer = fixture.DelegatedAppointmentTests._lecturer
    _panel_appointment = fixture.DelegatedAppointmentTests._panel_appointment

    def test_same_recommendation_facts_are_available_to_authorised_staff_hosts(self):
        appointment=self._panel_appointment()
        row=appointment.recommendation
        row.justification='Original nomination justification'
        row.save(update_fields=['justification'])
        self.client.force_authenticate(self.office)
        records=self.client.get('/api/appointments/panel/').data
        office=next(item for item in records if item['recordId']==f'appointment-{appointment.pk}')
        self.assertIn('recommendation',office)
        self.client.force_authenticate(self.panel)
        assignment=self.client.get('/api/appointments/panel/assignments/').data[0]
        self.assertIn('recommendation',assignment)
        self.assertEqual(office['recommendation'],assignment['recommendation'])
        shared=office['recommendation']
        self.assertEqual(shared['justification'],'Original nomination justification')
        self.assertEqual(shared['studentEmail'],self.student_user.email)
        self.assertEqual(shared['panelMemberEmail'],self.panel.email)
        self.assertEqual(shared['appointmentLifecycle']['appointmentId'],appointment.pk)
        self.assertEqual(assignment['appointmentLifecycle']['appointmentId'],appointment.pk)

    def test_exact_authorised_read_matches_office_and_rejects_unrelated_staff(self):
        appointment=self._panel_appointment()
        url=f'/api/appointments/panel/appointments/{appointment.pk}/'
        self.client.force_authenticate(self.office)
        response=self.client.get(url)
        self.assertEqual(response.status_code,200)
        self.client.force_authenticate(self.panel)
        self.assertEqual(self.client.get(url).status_code,200)
        self.client.force_authenticate(self.other_coordinator)
        self.assertEqual(self.client.get(url).status_code,403)
        self.client.force_authenticate(self.student_user)
        self.assertEqual(self.client.get(url).status_code,403)

    def test_office_exact_recommendation_link_survives_appointment_creation(self):
        appointment=self._panel_appointment()
        self.client.force_authenticate(self.office)
        for record in (f'appointment-{appointment.pk}', f'recommendation-{appointment.recommendation_id}'):
            response=self.client.get(f'/api/appointments/panel/records/{record}/')
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.data['recommendation']['id'],appointment.recommendation_id)
        self.client.force_authenticate(self.panel)
        self.assertEqual(self.client.get(f'/api/appointments/panel/records/appointment-{appointment.pk}/').status_code,403)

    def test_profile_read_resolves_current_pending_nomination_without_inventing_appointment(self):
        from .models import PanelRecommendation
        row=PanelRecommendation.objects.create(profile=self.profile,supervisor=self.supervisor,recommended_member=self.panel,
            academic_semester=self.semester,status='SUBMITTED_TO_PANEL')
        self.client.force_authenticate(self.office)
        response=self.client.get(f'/api/appointments/panel/records/profile-{self.profile.pk}/')
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data['recommendation']['id'],row.pk)
        self.assertIsNone(response.data['recommendation']['appointmentLifecycle'])
        self.assertEqual(self.client.get('/api/appointments/panel/records/not-an-id/').status_code,404)

    def test_legacy_coordinator_monitoring_never_grants_review_or_ending_capability(self):
        from .models import PanelRecommendation
        self.profile.student=None
        self.profile.save(update_fields=['student'])
        row=PanelRecommendation.objects.create(profile=self.profile,supervisor=self.supervisor,recommended_member=self.panel,
            academic_semester=self.semester,status='PENDING_COORDINATOR')
        self.client.force_authenticate(self.coordinator)
        response=self.client.get('/api/appointments/panel/coordinator-workspace/')
        record=next(item for item in response.data['records'] if item['id']==row.pk)
        self.assertNotIn(row.pk,[item['id'] for item in response.data['queue']])
        self.assertIs(record.get('canReview'),False)
        self.assertIs(record['canEndAppointment'],False)
