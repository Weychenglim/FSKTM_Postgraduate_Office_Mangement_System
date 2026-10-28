from django.conf import settings
from django.core.management.base import BaseCommand

from faq.chat import purge_old_questions


class Command(BaseCommand):
    help = "Delete chatbot questions older than the retention period (12 months by default)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=settings.FAQ_QUESTION_RETENTION_DAYS)

    def handle(self, *args, **options):
        deleted = purge_old_questions(options["days"])
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} questions older than {options['days']} days."))
