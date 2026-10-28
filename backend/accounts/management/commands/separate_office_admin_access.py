"""Convert legacy Office admin eligibility without changing business authority."""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from accounts.authorization import technical_admin_actor
from accounts.models import User


class Command(BaseCommand):
    help = 'Preview Office staff-flag removal; use --apply after reviewing the counts.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Clear Office staff flags; preserve passwords and permissions.')

    def handle(self, *args, **options):
        if not options['apply']:
            count = User.objects.filter(role=User.Role.OFFICE_ADMIN, is_staff=True).count()
            self.stdout.write(f'Preview: {count} Office account(s) have legacy staff flags. No changes made. Use --apply to convert.')
            return
        with transaction.atomic():
            users = list(User.objects.select_for_update().filter(
                Q(role=User.Role.OFFICE_ADMIN) | Q(is_superuser=True)
            ).order_by('pk'))
            if any(user.is_superuser and user.role != User.TECHNICAL_ADMIN for user in users):
                raise CommandError('Resolve mixed-role superusers before conversion; create separate technical accounts first.')
            if not any(technical_admin_actor(user) and user.has_usable_password() for user in users):
                raise CommandError('An active dedicated Technical Administrator with a usable password is required before conversion.')
            converted = 0
            for user in users:
                if user.role == User.Role.OFFICE_ADMIN and user.is_staff:
                    user.is_staff = False
                    user.save(update_fields=['is_staff'])
                    converted += 1
        self.stdout.write(self.style.SUCCESS(f'Converted {converted} Office account(s). Credentials and permissions preserved.'))
