from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from .targeting import normalize_targeting


class TargetingValidationTests(SimpleTestCase):
    def test_django_admin_cannot_bypass_audited_targeting_configuration(self):
        from django.contrib import admin
        from django.test import RequestFactory
        from accounts.models import User
        from .admin import EvaluationPeriodAdmin
        from .models import EvaluationPeriod

        request = RequestFactory().get("/admin/marks/evaluationperiod/1/change/")
        request.user = User(is_staff=True, is_superuser=True)
        form = EvaluationPeriodAdmin(EvaluationPeriod, admin.site).get_form(request)
        self.assertFalse({"programme_scope", "programmes", "evaluator_roles"} & set(form.base_fields))

    def test_normalizes_names_and_roles_without_changing_display_case(self):
        self.assertEqual(
            normalize_targeting("SELECTED", [" Computing ", "computing"], ["PANEL", "PANEL"]),
            ("SELECTED", ["Computing"], ["PANEL"]),
        )

    def test_invalid_scope_lists_and_roles_are_rejected(self):
        for values in (
            ("INVALID", [], ["PANEL"]),
            ("SELECTED", [], ["PANEL"]),
            ("SELECTED", [" "], ["PANEL"]),
            ("SELECTED", "Computing", ["PANEL"]),
            ("ALL", [], []),
            ("ALL", [], ["BACKUP"]),
            ("ALL", [], "SUPERVISOR"),
        ):
            with self.subTest(values=values), self.assertRaises(ValidationError):
                normalize_targeting(*values)

    def test_all_scope_clears_inactive_programme_selections(self):
        self.assertEqual(normalize_targeting("ALL", ["Computing"], ["SUPERVISOR", "PANEL"]),
                         ("ALL", [], ["SUPERVISOR", "PANEL"]))
