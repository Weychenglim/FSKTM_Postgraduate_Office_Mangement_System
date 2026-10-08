from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class SettingsMigrationTests(TransactionTestCase):
    def test_existing_user_and_profile_survive_with_announcements_enabled(self):
        before = [('accounts', '0005_coordinatordelegation')]
        after = [('accounts', '0006_user_announcement_alerts')]
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        try:
            executor.migrate(before)
            apps = executor.loader.project_state(before).apps
            User = apps.get_model('accounts', 'User')
            Student = apps.get_model('accounts', 'Student')
            user = User.objects.create(email='settings-migration@example.test', password='preserve-existing-password-hash', full_name='Migration Student', role='Student', phone='+60123456789', is_active=False, must_change_password=True)
            Student.objects.create(user=user, matric_no='MIG-SET-01', programme='Preserved Programme', status='Deferred')
            executor = MigrationExecutor(connection)
            executor.migrate(after)
            apps = executor.loader.project_state(after).apps
            saved = apps.get_model('accounts', 'User').objects.get(pk=user.pk)
            self.assertEqual(saved.email, 'settings-migration@example.test')
            self.assertEqual(saved.password, 'preserve-existing-password-hash')
            self.assertEqual(saved.phone, '+60123456789')
            self.assertEqual(saved.role, 'Student')
            self.assertFalse(saved.is_active)
            self.assertTrue(saved.must_change_password)
            self.assertTrue(saved.announcement_alerts)
            profile = apps.get_model('accounts', 'Student').objects.get(pk=user.pk)
            self.assertEqual(profile.matric_no, 'MIG-SET-01')
            self.assertEqual(profile.programme, 'Preserved Programme')
            self.assertEqual(profile.status, 'Deferred')
        finally:
            MigrationExecutor(connection).migrate(latest)
