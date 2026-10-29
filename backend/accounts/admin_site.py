"""Technical-only admin entry; governed model registrations stay unchanged."""
from django.contrib.admin import AdminSite
from django.contrib.admin.forms import AdminAuthenticationForm
from django.core.exceptions import ValidationError

from .authorization import technical_admin_actor


class TechnicalAdminAuthenticationForm(AdminAuthenticationForm):
    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        if not technical_admin_actor(user):
            raise ValidationError(
                self.error_messages['invalid_login'],
                code='invalid_login',
                params={'username': self.username_field.verbose_name},
            )


class TechnicalAdminSite(AdminSite):
    login_form = TechnicalAdminAuthenticationForm

    def has_permission(self, request):
        return technical_admin_actor(request.user)
