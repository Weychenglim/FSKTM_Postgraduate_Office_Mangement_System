from django.core.exceptions import ValidationError
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import Student
from . import test_appointment_lifecycle as fixture


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class ResearchAmendmentTests(APITestCase):
    def setUp(self):
        fixture.AppointmentLifecycleTests.setUp(self)
        self.office.is_staff = True
        self.office.save(update_fields=['is_staff'])
    _lecturer = fixture.AppointmentLifecycleTests._lecturer
    base = '/api/appointments/research-amendments/'

    def post(self, actor, suffix='', **data):
        self.client.force_authenticate(user=actor)
        if suffix.endswith('/decision/') and 'expectedStatus' not in data:
            detail = self.client.get(self.base + suffix.replace('/decision/', '/'))
            if detail.status_code == 200:
                data['expectedStatus'] = detail.data['status']
        return self.client.post(self.base + suffix, data, format='json')

    def research(self):
        result = self.post(self.student_user, kind='RESEARCH', title='Revised research', reason='Changed scope')
        self.assertEqual(result.status_code, 201, result.data)
        return result.data['id']

    def test_research_requires_both_reviews_and_preserves_proposal(self):
        pk = self.research()
        result = self.post(self.coordinator, f'{pk}/decision/', decision='APPROVE')
        self.assertEqual(result.status_code, 403)
        self.assertEqual(self.post(self.supervisor, f'{pk}/decision/', decision='APPROVE').status_code, 200)
        self.profile.refresh_from_db()
        self.assertNotEqual(self.profile.proposed_topic, 'Revised research')
        result = self.post(self.coordinator, f'{pk}/decision/', decision='APPROVE')
        self.assertEqual(result.status_code, 200, result.data)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.proposed_topic, 'Revised research')
        self.assertEqual(self.profile.revision, 1)
        self.assertEqual(self.application.research_title, 'Lifecycle-safe postgraduate workflows')
        from .models import ResearchAmendment, ResearchProfileRevision
        row = ResearchAmendment.objects.get(pk=pk)
        row.reason = 'rewritten'
        with self.assertRaises(ValidationError):
            row.save()
        self.assertEqual(ResearchProfileRevision.objects.filter(profile=self.profile).count(), 2)

    def test_correction_is_audited_and_conflicts_with_pending(self):
        self.assertEqual(self.post(self.office, 'corrections/', studentId=self.student.pk, title='Typo corrected', reason='Typo', meaningUnchanged=True, expectedRevision=0).status_code, 200)
        self.assertEqual(self.post(self.office, 'corrections/', studentId=self.student.pk, title='Another typo', reason='Typo', meaningUnchanged=True, expectedRevision=0).status_code, 409)
        self.research()
        self.assertEqual(self.post(self.office, 'corrections/', studentId=self.student.pk, title='Another typo', reason='Typo', meaningUnchanged=True, expectedRevision=1).status_code, 409)

    def test_transfer_requires_explicit_team_retention_and_no_marks(self):
        from marks.models import EvaluationTask
        before = list(EvaluationTask.objects.values())
        result = self.post(self.office, kind='TRANSFER', studentId=self.student.pk, destinationProgramme='  master of software engineering ', reason='Programme change')
        self.assertEqual(result.status_code, 201, result.data)
        pk = result.data['id']
        self.assertEqual(self.post(self.coordinator, f'{pk}/decision/', decision='APPROVE').status_code, 400)
        self.assertEqual(self.post(self.coordinator, f'{pk}/decision/', decision='APPROVE', retainTeam=True).status_code, 200)
        self.assertEqual(self.post(self.other_coordinator, f'{pk}/decision/', decision='APPROVE', retainTeam=True).status_code, 200)
        self.student.refresh_from_db()
        self.profile.refresh_from_db()
        self.assertEqual(self.student.programme, 'MASTER OF SOFTWARE ENGINEERING')
        self.assertEqual(self.profile.programme, self.student.programme)
        self.assertEqual(list(EvaluationTask.objects.values()), before)

    def test_deferred_can_cancel_but_cannot_decide(self):
        pk = self.research()
        Student.objects.filter(pk=self.student.pk).update(status=Student.Status.DEFERRED)
        self.assertEqual(self.post(self.supervisor, f'{pk}/decision/', decision='APPROVE').status_code, 409)
        self.assertEqual(self.post(self.student_user, f'{pk}/cancel/', reason='Withdraw request').status_code, 200)

    def test_unrelated_lecturer_cannot_read_private_amendments(self):
        pk = self.research()
        self.client.force_authenticate(user=self.new_supervisor)
        self.assertEqual(self.client.get(self.base + f'{pk}/').status_code, 404)
        self.assertEqual(self.client.get(self.base).data['requests'], [])

    def test_only_one_pending_and_immutable_audit_queryset(self):
        pk = self.research()
        self.assertEqual(self.post(self.student_user, kind='RESEARCH', title='Another', reason='Change').status_code, 409)
        from .models import ResearchAmendmentEvent, ResearchAmendment
        with self.assertRaises(ValidationError):
            ResearchAmendment.objects.filter(pk=pk).update(reason='rewritten')
        with self.assertRaises(ValidationError):
            ResearchAmendmentEvent.objects.all().delete()

    def test_final_approval_detects_stale_profile(self):
        pk = self.research()
        self.assertEqual(self.post(self.supervisor, f'{pk}/decision/', decision='APPROVE').status_code, 200)
        from .models import StudentResearchProfile
        StudentResearchProfile.objects.filter(pk=self.profile.pk).update(abstract='External changed value')
        result = self.post(self.coordinator, f'{pk}/decision/', decision='APPROVE')
        self.assertEqual(result.status_code, 409)

    def test_old_coordinator_keeps_only_decision_history_after_transfer(self):
        result = self.post(self.office, kind='TRANSFER', studentId=self.student.pk, destinationProgramme='MASTER OF SOFTWARE ENGINEERING', reason='Transfer')
        pk = result.data['id']
        self.post(self.coordinator, f'{pk}/decision/', decision='APPROVE', retainTeam=True)
        self.post(self.other_coordinator, f'{pk}/decision/', decision='APPROVE', retainTeam=True)
        self.client.force_authenticate(user=self.coordinator)
        self.assertEqual(self.client.get(self.base + f'{pk}/').status_code, 200)
        self.assertEqual(self.client.get(self.base + f'options/?studentId={self.student.pk}').status_code, 404)

    def test_same_coordinator_needs_two_explicit_stages_and_stale_replay_conflicts(self):
        from accounts.models import CoordinatorDelegation
        from django.utils import timezone
        CoordinatorDelegation.objects.create(coordinator=self.coordinator,
            programme='MASTER OF SOFTWARE ENGINEERING', starts_on=timezone.localdate(),
            ends_on=timezone.localdate() + timezone.timedelta(days=3),
            granted_by=self.office, justification='Acting destination coordinator.')
        row = self.post(self.office, kind='TRANSFER', studentId=self.student.pk,
                        destinationProgramme='MASTER OF SOFTWARE ENGINEERING', reason='Transfer').data
        data = dict(decision='APPROVE', retainTeam=True, expectedStatus=row['status'])
        self.assertEqual(self.post(self.coordinator, f"{row['id']}/decision/", **data).status_code, 200)
        self.assertEqual(self.post(self.coordinator, f"{row['id']}/decision/", **data).status_code, 409)
        self.student.refresh_from_db()
        self.assertNotEqual(self.student.programme, 'MASTER OF SOFTWARE ENGINEERING')
        data['expectedStatus'] = 'PENDING_DESTINATION_COORDINATOR'
        self.assertEqual(self.post(self.coordinator, f"{row['id']}/decision/", **data).status_code, 200)

    def test_rejections_and_cancellations_preserve_profile(self):
        original = self.profile.proposed_topic
        for reviewer in (self.supervisor, self.coordinator):
            pk = self.research()
            if reviewer == self.coordinator:
                self.assertEqual(self.post(self.supervisor, f'{pk}/decision/', decision='APPROVE').status_code, 200)
            self.assertEqual(self.post(reviewer, f'{pk}/decision/', decision='REJECT', reason='Revise proposal').status_code, 200)
            self.profile.refresh_from_db()
            self.assertEqual(self.profile.proposed_topic, original)
        for reviewer in (self.coordinator, self.other_coordinator):
            row = self.post(self.office, kind='TRANSFER', studentId=self.student.pk,
                            destinationProgramme='MASTER OF SOFTWARE ENGINEERING', reason='Transfer').data
            if reviewer == self.other_coordinator:
                self.assertEqual(self.post(self.coordinator, f"{row['id']}/decision/", decision='APPROVE', retainTeam=True).status_code, 200)
            self.assertEqual(self.post(reviewer, f"{row['id']}/decision/", decision='REJECT', reason='Transfer not approved').status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.revision, 0)

    def test_transfer_team_change_and_pending_nomination_block(self):
        from .models import SupervisorApplication, PanelRecommendation
        pending = SupervisorApplication.objects.create(student=self.student,
            proposed_supervisor=self.new_supervisor, academic_semester=self.semester,
            research_title='Replacement', research_area='SE', research_abstract='Abstract')
        args = dict(kind='TRANSFER', studentId=self.student.pk,
                    destinationProgramme='MASTER OF SOFTWARE ENGINEERING', reason='Transfer')
        self.assertEqual(self.post(self.office, **args).status_code, 409)
        pending.status = 'CANCELLED_BY_STUDENT'
        pending.save()
        row = self.post(self.office, **args).data
        self.assertEqual(self.post(self.coordinator, f"{row['id']}/decision/", decision='APPROVE', retainTeam=True).status_code, 200)
        fixture.AppointmentLifecycleTests._panel_appointment(self)
        self.assertEqual(self.post(self.other_coordinator, f"{row['id']}/decision/", decision='APPROVE', retainTeam=True).status_code, 409)

    def test_unavailable_destination_and_legacy_records_are_rejected(self):
        from .models import StudentResearchProfile
        self.other_coordinator.is_active = False
        self.other_coordinator.save()
        self.assertEqual(self.post(self.office, kind='TRANSFER', studentId=self.student.pk,
            destinationProgramme='MASTER OF SOFTWARE ENGINEERING', reason='Transfer').status_code, 409)
        StudentResearchProfile.objects.filter(pk=self.profile.pk).update(student=None)
        self.assertEqual(self.post(self.student_user, kind='RESEARCH', title='New', reason='Change').status_code, 404)

    def test_corrections_require_office_and_attestation_and_protect_admin(self):
        from django.contrib import admin
        from .models import StudentResearchProfile
        data = dict(studentId=self.student.pk, title='Typo corrected', reason='Typo', expectedRevision=0)
        self.assertEqual(self.post(self.office, 'corrections/', **data).status_code, 400)
        self.assertEqual(self.post(self.supervisor, 'corrections/', **data, meaningUnchanged=True).status_code, 403)
        fields = admin.site._registry[StudentResearchProfile].get_readonly_fields(None, self.profile)
        self.assertTrue({'proposed_topic', 'abstract', 'programme', 'revision'}.issubset(fields))
