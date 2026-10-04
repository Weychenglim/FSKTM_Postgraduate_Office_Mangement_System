import json
import os
import subprocess
import sys

from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.test import TransactionTestCase, override_settings


SHARED_CACHE = {"default": {
    "BACKEND": "django.core.cache.backends.db.DatabaseCache",
    "LOCATION": "fsktm_api_cache",
}}
WORKER_SCRIPT = """
import json, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
import django
django.setup()
from rest_framework.test import APIClient
client = APIClient()
path, payload, count, ip = json.loads(os.environ['THROTTLE_PROBE'])
responses = [client.post(path, payload, format='json', REMOTE_ADDR=ip) for _ in range(count)]
print('__THROTTLE_PROBE__' + json.dumps([
    {'status': response.status_code, 'retryAfter': response.headers.get('Retry-After')}
    for response in responses
]))
"""


class SharedAuthenticationCacheTests(TransactionTestCase):
    """Independent Django processes must consume the same authentication budget."""

    def setUp(self):
        # The table and all HTTP probes are confined to Django's isolated test DB.
        self.assertTrue(connection.settings_dict["NAME"].startswith("test_"))
        with override_settings(CACHES=SHARED_CACHE):
            call_command("createcachetable", verbosity=0)
        with connection.cursor() as cursor:
            cursor.execute('DELETE FROM "fsktm_api_cache"')

    def worker_requests(self, path, payload, count, ip):
        environment = os.environ.copy()
        database = connection.settings_dict
        environment.update({
            "DJANGO_DEBUG": "True",
            "DJANGO_ALLOWED_HOSTS": "testserver",
            "DJANGO_CACHE_BACKEND": "database",
            "AUTH_LOGIN_THROTTLE_RATE": "10/minute",
            "AUTH_PASSWORD_RESET_THROTTLE_RATE": "5/hour",
            "AUTH_PASSWORD_RESET_CONFIRM_THROTTLE_RATE": "10/hour",
            "PGDATABASE": database["NAME"],
            "PGHOST": str(database["HOST"]),
            "PGPORT": str(database["PORT"]),
            "PGUSER": database["USER"],
            "PGPASSWORD": database["PASSWORD"],
            "THROTTLE_PROBE": json.dumps([path, payload, count, ip]),
        })
        completed = subprocess.run([sys.executable, "-c", WORKER_SCRIPT],
                                   cwd=settings.BASE_DIR, env=environment,
                                   capture_output=True, text=True, timeout=30)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        return json.loads(next(line.removeprefix("__THROTTLE_PROBE__")
                               for line in completed.stdout.splitlines()
                               if line.startswith("__THROTTLE_PROBE__")))

    def assert_shared_budget(self, path, payload, first_count, second_count, ip):
        first = self.worker_requests(path, payload, first_count, ip)
        second = self.worker_requests(path, payload, second_count, ip)
        self.assertTrue(all(row["status"] != 429 for row in first + second))
        blocked = self.worker_requests(path, payload, 1, ip)[0]
        self.assertEqual(blocked["status"], 429)
        self.assertGreater(int(blocked["retryAfter"]), 0)

    def test_login_budget_is_shared_between_independent_workers(self):
        self.assert_shared_budget("/api/auth/login/",
                                 {"identifier": "missing@example.test", "password": "incorrect"},
                                 4, 6, "192.0.2.101")

    def test_reset_and_confirmation_budgets_are_shared_with_independent_scopes(self):
        ip = "192.0.2.102"
        self.assert_shared_budget("/api/auth/password-reset/", {"email": "missing@example.test"},
                                 2, 3, ip)
        self.assert_shared_budget("/api/auth/password-reset/confirm/",
                                 {"uid": "invalid", "token": "invalid-token", "new_password": "invalid"},
                                 4, 6, ip)
