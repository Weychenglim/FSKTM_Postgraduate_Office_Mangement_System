"""Technical profile maintenance must never overwrite another account's row."""
from django.db import connection
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import Lecturer, OfficeStaff, ParticipantLifecycleAudit, Student, User
from .participant_lifecycle import transition_lecturer, transition_student


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class AdminProfileOwnershipTests(TestCase):
    def setUp(self):
        self.assertTrue(connection.settings_dict['NAME'].startswith('test_'))
        self.office = User.objects.create_user('owner.office@example.test', role=User.Role.OFFICE_ADMIN)
        self.technical = User.objects.create_superuser('owner.technical@example.test')
        self.client.force_login(self.technical)

    def profile(self, model, key):
        role = {Student: User.Role.STUDENT, Lecturer: User.Role.LECTURER,
                OfficeStaff: User.Role.OFFICE_ADMIN}[model]
        user = User.objects.create_user(f'{key}@owner.example.test', role=role, full_name=key)
        if model is Student:
            return Student.objects.create(user=user, matric_no=key, programme='Computing')
        return model.objects.create(user=user, staff_no=key)

    def payload(self, model, key, **changes):
        if model is Student:
            data = {'matric_no': key, 'programme': 'Computing', 'intake_semester': ''}
            prefixes = ['registry']
        elif model is Lecturer:
            data = {'staff_no': key, 'department': '', 'title': '', 'specialization': ''}
            prefixes = ['coordinator', 'supervisor', 'panel']
        else:
            data = {'staff_no': key, 'department': '', 'position': ''}
            prefixes = []
        for prefix in prefixes:
            data.update({f'{prefix}-TOTAL_FORMS': '0', f'{prefix}-INITIAL_FORMS': '0',
                         f'{prefix}-MIN_NUM_FORMS': '0', f'{prefix}-MAX_NUM_FORMS': '1'})
        return {**data, '_save': 'Save', **changes}

    def url(self, model, pk=None):
        route = f'admin:accounts_{model._meta.model_name}_'
        return reverse(route + ('change' if pk else 'add'), args=[pk] if pk else None)

    def snapshot(self, model):
        return (list(model.objects.order_by('pk').values()),
                list(ParticipantLifecycleAudit.objects.order_by('pk').values()))

    def test_student_reassignment_cannot_reset_another_students_deferred_state(self):
        source = self.profile(Student, 'source-student')
        target = self.profile(Student, 'target-student')
        transition_student(matric_no=target.matric_no, actor=self.office,
                           target_status='DEFERRED', reason='Governed deferral')
        before = self.snapshot(Student)
        response = self.client.post(self.url(Student, source.pk),
                                    self.payload(Student, 'rebound-student', user=target.pk))
        self.assertEqual(self.snapshot(Student), before)
        self.assertEqual(response.status_code, 403)

    def test_lecturer_reassignment_cannot_reset_another_lecturers_retired_state(self):
        source = self.profile(Lecturer, 'source-lecturer')
        target = self.profile(Lecturer, 'target-lecturer')
        transition_lecturer(staff_no=target.staff_no, actor=self.office,
                            target_status='RETIRING', reason='Governed retiring')
        transition_lecturer(staff_no=target.staff_no, actor=self.office,
                            target_status='RETIRED', reason='Governed retirement')
        before = self.snapshot(Lecturer)
        response = self.client.post(self.url(Lecturer, source.pk),
                                    self.payload(Lecturer, 'rebound-lecturer', user=target.pk))
        self.assertEqual(self.snapshot(Lecturer), before)
        self.assertEqual(response.status_code, 403)

    def test_office_staff_reassignment_cannot_overwrite_another_staff_profile(self):
        source = self.profile(OfficeStaff, 'source-office')
        target = self.profile(OfficeStaff, 'target-office')
        before = self.snapshot(OfficeStaff)
        response = self.client.post(self.url(OfficeStaff, source.pk),
                                    self.payload(OfficeStaff, 'rebound-office', user=target.pk))
        self.assertEqual(self.snapshot(OfficeStaff), before)
        self.assertEqual(response.status_code, 403)

    def test_owner_selector_is_available_only_when_creating_a_profile(self):
        for model in [Student, Lecturer, OfficeStaff]:
            with self.subTest(model=model.__name__):
                profile = self.profile(model, f'selector-{model.__name__}')
                existing = self.client.get(self.url(model, profile.pk))
                self.assertEqual(existing.status_code, 200)
                self.assertFalse('name="user"' in existing.content.decode(), 'Existing owner must be read-only.')
                creating = self.client.get(self.url(model))
                self.assertEqual(creating.status_code, 200)
                self.assertTrue('name="user"' in creating.content.decode(), 'New profile must allow owner selection.')

    def test_permitted_maintenance_preserves_owner_lifecycle_and_audits(self):
        student = self.profile(Student, 'maintain-student')
        lecturer = self.profile(Lecturer, 'maintain-lecturer')
        office = self.profile(OfficeStaff, 'maintain-office')
        transition_student(matric_no=student.matric_no, actor=self.office,
                           target_status='DEFERRED', reason='Retain governed student metadata')
        transition_lecturer(staff_no=lecturer.staff_no, actor=self.office,
                            target_status='RETIRING', reason='Retain governed lecturer metadata')
        for row, changed in [(student, {'intake_semester': 'Updated intake'}),
                             (lecturer, {'department': 'Updated department'}),
                             (office, {'position': 'Updated position'})]:
            with self.subTest(model=type(row).__name__):
                row.refresh_from_db()
                model = type(row)
                before = model.objects.values().get(pk=row.pk)
                audits = list(ParticipantLifecycleAudit.objects.order_by('pk').values())
                # A legacy edit tab may still post the unchanged owning User.
                response = self.client.post(self.url(model, row.pk), self.payload(
                    model, getattr(row, 'matric_no', getattr(row, 'staff_no', '')),
                    user=row.pk, **changed,
                ))
                self.assertEqual(response.status_code, 302)
                self.assertEqual(model.objects.values().get(pk=row.pk), {**before, **changed})
                self.assertEqual(list(ParticipantLifecycleAudit.objects.order_by('pk').values()), audits)

    def test_valid_new_profile_creation_remains_available(self):
        for model, role in [(Student, User.Role.STUDENT), (Lecturer, User.Role.LECTURER),
                            (OfficeStaff, User.Role.OFFICE_ADMIN)]:
            with self.subTest(model=model.__name__):
                key = f'new-{model.__name__}'
                user = User.objects.create_user(f'{key}@owner.example.test', role=role)
                response = self.client.post(self.url(model), self.payload(model, key, user=user.pk))
                self.assertEqual(response.status_code, 302)
                row = model.objects.get(pk=user.pk)
                self.assertEqual(row.user_id, user.pk)
                self.assertEqual(getattr(row, 'matric_no', getattr(row, 'staff_no', '')), key)

    def test_add_cannot_replace_an_existing_profile(self):
        for model in [Student, Lecturer, OfficeStaff]:
            with self.subTest(model=model.__name__):
                target = self.profile(model, f'existing-{model.__name__}')
                before = self.snapshot(model)
                response = self.client.post(self.url(model), self.payload(
                    model, f'duplicate-{model.__name__}', user=target.pk,
                ))
                self.assertEqual(response.status_code, 200)
                self.assertEqual(self.snapshot(model), before)

    def test_invalid_or_ambiguous_owner_posts_make_no_changes(self):
        for model in [Student, Lecturer, OfficeStaff]:
            source = self.profile(model, f'invalid-{model.__name__}')
            before = self.snapshot(model)
            for owner in ['', 'not-an-account', ['999999', str(source.pk)]]:
                with self.subTest(model=model.__name__, owner=owner):
                    response = self.client.post(self.url(model, source.pk), self.payload(
                        model, f'forged-{model.__name__}', user=owner,
                    ))
                    self.assertEqual(response.status_code, 403)
                    self.assertEqual(self.snapshot(model), before)

    def test_user_maintenance_inline_cannot_rebind_an_existing_student(self):
        source = self.profile(Student, 'inline-source')
        target = self.profile(Student, 'inline-target')
        transition_student(matric_no=target.matric_no, actor=self.office,
                           target_status='DEFERRED', reason='Retain inline target deferral')
        before = self.snapshot(Student)
        user_before = User.objects.values().get(pk=source.pk)
        data = {
            'email': source.user.email, 'full_name': source.user.full_name,
            'role': User.Role.STUDENT, 'phone': '', 'is_active': True,
            'groups': [], 'user_permissions': [], '_save': 'Save',
            'student-TOTAL_FORMS': '1', 'student-INITIAL_FORMS': '1',
            'student-MIN_NUM_FORMS': '0', 'student-MAX_NUM_FORMS': '1',
            'student-0-user': target.pk, 'student-0-matric_no': 'inline-rebound',
            'student-0-programme': 'Computing', 'student-0-intake_semester': '',
        }
        for prefix in ['office_staff', 'lecturer']:
            data.update({f'{prefix}-TOTAL_FORMS': '0', f'{prefix}-INITIAL_FORMS': '0',
                         f'{prefix}-MIN_NUM_FORMS': '0', f'{prefix}-MAX_NUM_FORMS': '1'})
        response = self.client.post(reverse('admin:accounts_user_change', args=[source.pk]), data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.snapshot(Student), before)
        self.assertEqual(User.objects.values().get(pk=source.pk), user_before)
        formset = next(inline.formset for inline in response.context['inline_admin_formsets']
                       if inline.formset.model is Student)
        self.assertEqual(formset.forms[0].errors.as_data()['user'][0].code, 'invalid_choice')
