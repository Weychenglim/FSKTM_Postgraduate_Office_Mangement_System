from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class DelegationMigrationTests(TransactionTestCase):
    def test_migration_preserves_permanent_coordinators_without_grants(self):
        before = [('accounts', '0004_lecturer_lifecycle_changed_at_and_more')]
        after = [('accounts', '0005_coordinatordelegation')]
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        try:
            executor.migrate(before)
            apps = executor.loader.project_state(before).apps
            User = apps.get_model('accounts', 'User')
            Lecturer = apps.get_model('accounts', 'Lecturer')
            Coordinator = apps.get_model('accounts', 'Coordinator')
            user = User.objects.create(email='migration-coord@test.example', full_name='Permanent coordinator', role='Programme Coordinator')
            lecturer = Lecturer.objects.create(user=user, staff_no='MIG-C1')
            Coordinator.objects.create(lecturer=lecturer, programme_managed='Programme unchanged')
            executor = MigrationExecutor(connection)
            executor.migrate(after)
            apps = executor.loader.project_state(after).apps
            self.assertEqual(apps.get_model('accounts', 'Coordinator').objects.get(pk=user.pk).programme_managed, 'Programme unchanged')
            self.assertEqual(apps.get_model('accounts', 'User').objects.get(pk=user.pk).role, 'Programme Coordinator')
            self.assertEqual(apps.get_model('accounts', 'CoordinatorDelegation').objects.count(), 0)
        finally:
            MigrationExecutor(connection).migrate(latest)
