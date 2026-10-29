from django.contrib.admin.apps import AdminConfig


class TechnicalAdminConfig(AdminConfig):
    default_site = 'accounts.admin_site.TechnicalAdminSite'
