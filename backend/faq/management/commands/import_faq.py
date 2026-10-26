from django.core.management.base import BaseCommand, CommandError

from faq.importer import ImportProblem, default_path, import_faq


class Command(BaseCommand):
    help = "Import the office's FAQ (docs/faq/faq-entries.json). Safe to run again."

    def add_arguments(self, parser):
        parser.add_argument("--file", default=None, help=f"The FAQ file (default {default_path()}).")

    def handle(self, *args, **options):
        try:
            counts = import_faq(options["file"])
        except ImportProblem as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(
            self.style.SUCCESS(
                f"Published: {counts.get('published', 0)}. "
                f"Needs checking: {counts.get('needsChecking', 0)}. "
                f"Repeats on the ALL sheet skipped: {counts.get('repeatsSkipped', 0)}. "
                f"Already there: {counts.get('alreadyThere', 0)}."
            )
        )
