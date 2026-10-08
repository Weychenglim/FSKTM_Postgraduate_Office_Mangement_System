from django.conf import settings
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class AccountSettingsTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='settings@example.test', password='Original-Secret-8391', full_name='Settings User', must_change_password=True)
        self.other = User.objects.create_user(email='other@example.test', password='Other-Secret-8391', full_name='Other User')
        self.client = APIClient()
        self.refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.refresh.access_token}')

    def test_settings_require_authentication(self):
        self.client.credentials()
        for method, path, data in [('get', '/api/auth/settings/', None), ('patch', '/api/auth/settings/', {'phone': '123'}), ('post', '/api/auth/settings/password/', {'currentPassword': 'x', 'newPassword': 'y'})]:
            with self.subTest(method=method):
                self.assertEqual(getattr(self.client, method)(path, data, format='json').status_code, 401)

    def test_phone_and_preferences_persist_independently_for_caller(self):
        response = self.client.get('/api/auth/settings/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['preferences']['announcementAlerts'])
        self.assertEqual(response.data['capabilities'], {'emailNotifications': False, 'deadlineReminders': False, 'weeklySummary': False})
        self.assertEqual(self.client.patch('/api/auth/settings/', {'phone': '  +60123456789  '}, format='json').status_code, 200)
        self.assertEqual(self.client.patch('/api/auth/settings/', {'preferences': {'announcementAlerts': False}}, format='json').status_code, 200)
        result = self.client.get('/api/auth/settings/').data
        self.assertEqual(result['user']['phone'], '+60123456789')
        self.assertFalse(result['preferences']['announcementAlerts'])
        self.other.refresh_from_db()
        self.assertEqual(self.other.phone, '')
        self.assertTrue(self.other.announcement_alerts)

    def test_unknown_or_malformed_settings_are_rejected_atomically(self):
        payloads = [{'phone': '123', field: 'changed'} for field in ['email', 'role', 'programme', 'id', 'fullName']]
        payloads += [{'preferences': {'announcementAlerts': value}} for value in ['false', 0, 1, None, [], {}]]
        payloads += [{'phone': 'x' * 33}, {'phone': None}, {'phone': 123}, {'preferences': {'unknown': True}}, {'preferences': {}}, [], {'preferences': None}]
        for payload in payloads:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.patch('/api/auth/settings/', payload, format='json').status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, '')
        self.assertEqual(self.user.email, 'settings@example.test')

    def test_mutations_require_json(self):
        self.assertEqual(self.client.patch('/api/auth/settings/', {'phone': '123'}, format='multipart').status_code, 415)
        self.assertEqual(self.client.post('/api/auth/settings/password/', {'currentPassword': 'x', 'newPassword': 'y'}, format='multipart').status_code, 415)

    def test_bad_current_and_weak_or_similar_password_do_not_change_password(self):
        for current, new in [('wrong', 'Replacement-Secret-8391'), ('Original-Secret-8391', 'short'), ('Original-Secret-8391', 'settings@example.test')]:
            with self.subTest(new=new):
                response = self.client.post('/api/auth/settings/password/', {'currentPassword': current, 'newPassword': new}, format='json')
                self.assertEqual(response.status_code, 400)
                self.user.refresh_from_db()
                self.assertTrue(self.user.check_password('Original-Secret-8391'))

    def test_change_revokes_all_sessions_and_allows_new_login(self):
        another = RefreshToken.for_user(self.user)
        response = self.client.post('/api/auth/settings/password/', {'currentPassword': 'Original-Secret-8391', 'newPassword': '  Replacement-Secret-8391  '}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.cookies[settings.JWT_REFRESH_COOKIE_NAME]['max-age'], 0)
        self.user.refresh_from_db()
        self.assertFalse(self.user.must_change_password)
        self.assertTrue(self.user.check_password('  Replacement-Secret-8391  '))
        for refresh in [self.refresh, another]:
            old = APIClient()
            old.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
            self.assertEqual(old.get('/api/auth/me/').status_code, 401)
            old.credentials()
            old.cookies[settings.JWT_REFRESH_COOKIE_NAME] = str(refresh)
            self.assertEqual(old.post('/api/auth/refresh/', {}, format='json').status_code, 401)
        fresh = APIClient()
        self.assertEqual(fresh.post('/api/auth/login/', {'identifier': self.user.email, 'password': 'Original-Secret-8391'}, format='json').status_code, 401)
        self.assertEqual(fresh.post('/api/auth/login/', {'identifier': self.user.email, 'password': '  Replacement-Secret-8391  '}, format='json').status_code, 200)

    def test_current_password_whitespace_is_preserved(self):
        self.user.set_password('  Original-Secret-8391  ')
        self.user.save(update_fields=['password'])
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(self.user).access_token}')
        response = self.client.post('/api/auth/settings/password/', {'currentPassword': '  Original-Secret-8391  ', 'newPassword': 'Replacement-Secret-8391'}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_password_unknown_fields_rejected(self):
        response = self.client.post('/api/auth/settings/password/', {'currentPassword': 'Original-Secret-8391', 'newPassword': 'Replacement-Secret-8391', 'id': self.other.pk}, format='json')
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Original-Secret-8391'))

    def test_password_rate_limit_is_per_user_and_does_not_limit_settings(self):
        for _ in range(5):
            self.assertEqual(self.client.post('/api/auth/settings/password/', {'currentPassword': 'wrong', 'newPassword': 'Replacement-Secret-8391'}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/auth/settings/password/', {'currentPassword': 'wrong', 'newPassword': 'Replacement-Secret-8391'}, format='json').status_code, 429)
        self.assertEqual(self.client.get('/api/auth/settings/').status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(self.other).access_token}')
        self.assertEqual(self.client.post('/api/auth/settings/password/', {'currentPassword': 'wrong', 'newPassword': 'Replacement-Secret-8391'}, format='json').status_code, 400)

    def test_all_roles_can_read_and_update_only_their_own_settings(self):
        for role in User.Role.values:
            with self.subTest(role=role):
                self.user.role = role
                self.user.save(update_fields=['role'])
                self.assertEqual(self.client.get('/api/auth/settings/').status_code, 200)
                response = self.client.patch('/api/auth/settings/', {'phone': '1234'}, format='json')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data['user']['id'], str(self.user.pk))
                self.assertEqual(response.data['user']['role'], role)
                self.other.refresh_from_db()
                self.assertEqual(self.other.phone, '')

    def test_disabled_account_cannot_read_or_mutate_settings(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        self.assertEqual(self.client.get('/api/auth/settings/').status_code, 401)
        self.assertEqual(self.client.patch('/api/auth/settings/', {'phone': '123'}, format='json').status_code, 401)
        self.assertEqual(self.client.post('/api/auth/settings/password/', {'currentPassword': 'Original-Secret-8391', 'newPassword': 'Replacement-Secret-8391'}, format='json').status_code, 401)

    def test_password_change_rechecks_active_account_after_authentication(self):
        self.client.force_authenticate(self.user)
        User.objects.filter(pk=self.user.pk).update(is_active=False)
        response = self.client.post('/api/auth/settings/password/', {'currentPassword': 'Original-Secret-8391', 'newPassword': 'Replacement-Secret-8391'}, format='json')
        self.assertEqual(response.status_code, 403)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Original-Secret-8391'))

    def test_password_change_rechecks_current_password_after_authentication(self):
        self.client.force_authenticate(self.user)
        fresh = User.objects.get(pk=self.user.pk)
        fresh.set_password('Already-Changed-4821')
        fresh.save(update_fields=['password'])
        response = self.client.post('/api/auth/settings/password/', {'currentPassword': 'Original-Secret-8391', 'newPassword': 'Replacement-Secret-8391'}, format='json')
        self.assertEqual(response.status_code, 400)
        fresh.refresh_from_db()
        self.assertTrue(fresh.check_password('Already-Changed-4821'))
