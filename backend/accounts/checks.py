"""System checks for account data. Run with ``manage.py check --database default``;
``migrate`` runs them too."""
from django.core.checks import Tags, Warning, register
from django.db import DatabaseError


@register(Tags.database)
def superusers_hold_no_portal_role(app_configs, **kwargs):
    from .models import User

    try:
        offenders = list(
            User.objects.filter(is_superuser=True)
            .exclude(role=User.TECHNICAL_ADMIN)
            .values_list("email", "role")
        )
    except DatabaseError:
        return []
    return [
        Warning(
            f"Superuser {email} also holds the portal role {role}.",
            hint=(
                "Create a separate Technical Administrator with createsuperuser, "
                "then remove superuser status from this portal account."
            ),
            id="accounts.W001",
        )
        for email, role in offenders
    ]
