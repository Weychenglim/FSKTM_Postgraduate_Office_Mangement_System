from django.test import override_settings
from rest_framework.test import APITestCase
from accounts.models import User
from . import test_coordinator_workspace as cw
from . import test_research_paging as rp
from .models import SupervisorApplication, PanelRecommendation, StudentResearchProfile

@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class OfficeWorkspaceTests(APITestCase):
    _lecturer = cw.CoordinatorWorkspaceTests._lecturer
    application_for = cw.CoordinatorWorkspaceTests.application_for
    nomination = cw.CoordinatorWorkspaceTests.nomination
    def setUp(self):
        cw.CoordinatorWorkspaceTests.setUp(self)
        self.office.is_staff = True
        self.office.save(update_fields=['is_staff'])
        self.client.force_authenticate(self.office)
    def get(self, path, **query):
        return self.client.get('/api/appointments/office-workspace/'+path+'/',query)
    def test_office_tracks_all_ongoing_stages_without_decision_actions(self):
        pending = self.application_for(1)
        upstream = self.application_for(2,status='SUBMITTED_TO_SUPERVISOR',programme='Outside')
        supporting = self.nomination(status='SUBMITTED_TO_CO_SUPERVISOR')
        data = self.get('requests',focus='decision').data
        self.assertEqual(data['total'],3)
        self.assertEqual(data['reviewCount'],0)
        self.assertTrue(all(not row['canDecide'] for row in data['results']))
        self.assertEqual({row['key'] for row in data['results']},{f'primary-{pending.pk}',f'primary-{upstream.pk}',f'supporting-{supporting.pk}'})
    def test_office_history_preserves_staff_cancellation_but_hides_student_withdrawal(self):
        self.application_for(1,status='CANCELLED_BY_STUDENT')
        staff = self.application_for(2,status='CANCELLED_BY_OFFICE')
        data = self.get('requests',view='history').data
        self.assertIn(f'primary-{staff.pk}',{row['key'] for row in data['results']})
        self.assertEqual(data['total'],2) # fixture approved primary plus staff cancellation
    def test_office_pages_before_serialization_and_can_search_students_in_groups(self):
        for number in range(1,14): self.application_for(number)
        data = self.get('requests',page=2,size=10).data
        self.assertEqual(data['total'],13)
        self.assertEqual(len(data['results']),3)
        groups = self.get('teams',q=self.student.matric_no).data
        self.assertEqual(groups['results'][0]['id'],self.supervisor.pk)
        students = self.get('teams',supervisor=self.supervisor.pk,q=self.student.matric_no).data
        self.assertEqual(students['results'][0]['matricNo'],self.student.matric_no)
    def test_exact_office_detail_keeps_audit_read_but_never_coordinator_decision(self):
        row=self.application_for(1,status='CANCELLED_BY_STUDENT',programme='Outside')
        response=self.get(f'requests/primary/{row.pk}')
        self.assertEqual(response.status_code,200)
        self.assertFalse(response.data['canDecide'])
        self.assertEqual(response.data['email'],row.student.user.email)
        self.assertIn('Supervisees',response.data['workloadLimit'])
    def test_office_endpoint_rejects_other_roles_and_nonstaff_office(self):
        for actor in [self.coordinator,self.supervisor,self.student.user]:
            self.client.force_authenticate(actor)
            self.assertEqual(self.get('requests').status_code,403)
        self.office.is_staff=False
        self.office.save(update_fields=['is_staff'])
        self.client.force_authenticate(self.office)
        self.assertEqual(self.get('requests').status_code,403)
    def test_legacy_unlinked_panel_is_omitted_from_capacity_browse_and_detail(self):
        self.semester.lifecycle_status='CLOSED'
        self.semester.save(update_fields=['lifecycle_status'])
        profile=StudentResearchProfile.objects.create(supervisor=self.supervisor,student_name='Legacy',matric_no='LEGACY',programme=self.student.programme,semester=self.semester.label)
        panel=PanelRecommendation.objects.create(profile=profile,supervisor=self.supervisor,recommended_member=self.new_supervisor,status='SUBMITTED_TO_PANEL',academic_semester=self.semester)
        response=self.get('carryover')
        self.assertEqual(response.status_code,200)
        self.assertFalse(any(row['kind']=='PANEL' and row['id']==panel.pk for row in response.data['results']))
        self.assertEqual(self.get(f'carryover/PANEL/{panel.pk}').status_code,404)

    def test_coordinator_endpoint_still_rejects_office(self):
        self.assertEqual(self.client.get('/api/appointments/coordinator-workspace/requests/').status_code,403)

@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class OfficeResearchPagingTests(APITestCase):
    _lecturer=rp.ResearchPagingTests._lecturer
    setUp=rp.ResearchPagingTests.setUp
    row=rp.ResearchPagingTests.row
    def test_office_research_pages_monitoring_and_minimal_options_keep_profile_tool(self):
        for number in range(12): self.row(status='PENDING_SUPERVISOR')
        self.client.force_authenticate(self.office)
        response=self.client.get('/api/appointments/research-amendments/',{'page':2,'size':10,'focus':'decision'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data['pagination']['total'],12)
        self.assertEqual(len(response.data['requests']),2)
        self.assertTrue(all(not row['canDecide'] for row in response.data['requests']))
        minimal=self.client.get('/api/appointments/research-amendments/options/',{'minimal':'true'})
        self.assertEqual(minimal.data['students'],[])
        profiles=self.client.get('/api/appointments/research-amendments/options/')
        self.assertTrue(profiles.data['students'])
