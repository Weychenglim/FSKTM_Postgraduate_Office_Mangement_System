"""Business authority must not depend on technical administration flags."""
from io import StringIO

from django.contrib import admin
from django.contrib.auth.models import AnonymousUser, Group, Permission
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import Client, RequestFactory, TestCase, override_settings

from .models import User


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class OfficeAuthorizationTests(TestCase):
    def setUp(self):
        self.office = User.objects.create_user('office.auth@example.test', role=User.Role.OFFICE_ADMIN)

    def test_shared_guards_accept_non_admin_office_and_reject_other_actors(self):
        from accounts.participant_lifecycle import assert_office_actor
        from accounts.delegations import is_office
        from appointments.research_amendments import office as research_office
        from appointments.capacity_reassessment import office as capacity_office
        from marks.completion_windows import office_actor
        from marks.services import _assert_office_admin
        actors = [(self.office, True), (AnonymousUser(), False)]
        for role in [User.Role.STUDENT, User.Role.LECTURER, User.Role.COORDINATOR, User.TECHNICAL_ADMIN]:
            actor = User.objects.create_user(f'{len(actors)}@auth.example.test', role=role, is_staff=True)
            actors.append((actor, False))
        inactive = User.objects.create_user('inactive@auth.example.test', role=User.Role.OFFICE_ADMIN, is_active=False, is_staff=True)
        actors.append((inactive, False))
        for actor, allowed in actors:
            with self.subTest(role=getattr(actor, 'role', 'anonymous'), allowed=allowed):
                for predicate in [is_office, research_office, capacity_office]:
                    self.assertEqual(bool(predicate(actor)), allowed)
                for guard in [assert_office_actor, office_actor, _assert_office_admin]:
                    if allowed:
                        guard(actor)
                    else:
                        with self.assertRaises((PermissionError, ValidationError)):
                            guard(actor)

    def test_admin_rejects_office_flags_and_existing_sessions_but_accepts_technical(self):
        factory = RequestFactory()
        self.office.is_staff = True
        self.office.is_superuser = True  # Legacy flags cannot grant technical access.
        self.office.save()
        request = factory.get('/admin/')
        request.user = self.office
        self.assertFalse(admin.site.has_permission(request))
        client = Client()
        client.force_login(self.office)
        self.assertEqual(client.get('/admin/').status_code, 302)
        self.assertEqual(client.post('/admin/accounts/user/add/', {}).status_code, 302)
        tech = User.objects.create_superuser('technical.auth@example.test', password='Synthetic-test-pass-42!')
        request.user = tech
        self.assertTrue(admin.site.has_permission(request))
        client.force_login(tech)
        self.assertEqual(client.get('/admin/').status_code, 200)
        client.logout()
        response = client.post('/admin/login/?next=/admin/', {
            'username': tech.email, 'password': 'Synthetic-test-pass-42!', 'next': '/admin/',
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(int(client.session['_auth_user_id']), tech.pk)
        for field in ['is_staff', 'is_superuser']:
            setattr(tech, field, False)
            self.assertFalse(admin.site.has_permission(request))
            setattr(tech, field, True)
        tech.is_active = False
        tech.save()
        self.assertFalse(admin.site.has_permission(request))

    def test_office_credentials_are_rejected_by_admin_login_even_with_legacy_staff(self):
        self.office.is_staff = True
        self.office.set_password('Synthetic-test-pass-42!')
        self.office.save()
        client = Client()
        response = client.post('/admin/login/?next=/admin/', {'username': self.office.email, 'password': 'Synthetic-test-pass-42!', 'next': '/admin/'})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('_auth_user_id', client.session)

    def test_office_change_form_rejects_admin_flag(self):
        from .forms import UserChangeForm
        form = UserChangeForm(data={
            'email': self.office.email, 'full_name': 'Office', 'role': self.office.role,
            'is_active': True, 'is_staff': True, 'is_superuser': False,
            'groups': [], 'user_permissions': [],
        }, instance=self.office)
        self.assertFalse(form.is_valid())

    def test_superuser_flag_cannot_substitute_for_business_marks_permission(self):
        from .authorization import can_correct_marks
        self.office.is_superuser = True
        self.office.save(update_fields=['is_superuser'])
        self.assertFalse(can_correct_marks(self.office))
        permission = Permission.objects.get(content_type__app_label='marks', codename='change_markentry')
        group = Group.objects.create(name='Authorized correction operators')
        group.permissions.add(permission)
        self.office.groups.add(group)
        self.assertTrue(can_correct_marks(self.office))
        self.office.groups.clear()
        self.assertFalse(can_correct_marks(self.office))

    def test_account_conversion_is_previewed_and_preserves_credentials_and_permissions(self):
        from django.core.management.base import CommandError
        self.office.is_staff = True
        self.office.set_password('Synthetic-test-pass-42!')
        self.office.save()
        permission = Permission.objects.get(content_type__app_label='marks', codename='change_markentry')
        self.office.user_permissions.add(permission)
        group = Group.objects.create(name='Existing Office business group')
        group.permissions.add(permission)
        self.office.groups.add(group)
        before_password = self.office.password
        output = StringIO()
        call_command('separate_office_admin_access', stdout=output)
        self.office.refresh_from_db()
        self.assertTrue(self.office.is_staff)
        with self.assertRaises(CommandError):
            call_command('separate_office_admin_access', apply=True, stdout=StringIO())
        tech = User.objects.create_superuser('recovery.auth@example.test', password='Synthetic-test-pass-42!')
        for _ in range(2):
            call_command('separate_office_admin_access', apply=True, stdout=StringIO())
            self.office.refresh_from_db()
            self.assertFalse(self.office.is_staff)
            self.assertFalse(self.office.is_superuser)
            self.assertEqual(self.office.password, before_password)
            self.assertEqual(list(self.office.user_permissions.values_list('pk', flat=True)), [permission.pk])
            self.assertEqual(list(self.office.groups.values_list('pk', flat=True)), [group.pk])
        tech.refresh_from_db()
        self.assertTrue(tech.is_staff and tech.is_superuser)

    def test_conversion_refuses_mixed_role_superusers_without_partial_changes(self):
        from django.core.management.base import CommandError
        User.objects.create_superuser('recovery.mixed@example.test', password='Synthetic-test-pass-42!')
        self.office.is_staff = True
        self.office.save()
        User.objects.create_user('mixed.auth@example.test', role=User.Role.LECTURER, is_superuser=True)
        with self.assertRaises(CommandError):
            call_command('separate_office_admin_access', apply=True, stdout=StringIO())
        self.office.refresh_from_db()
        self.assertTrue(self.office.is_staff)
