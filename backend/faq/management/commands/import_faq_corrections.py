from django.core.management.base import BaseCommand, CommandError

from faq.corrections import CorrectionsProblem, load_corrections


class Command(BaseCommand):
    help = "Load the office's corrections from a filled-in FAQ review list (Excel)."

    def add_arguments(self, parser):
        parser.add_argument("file")
        parser.add_argument("--draft", action="store_true", help="Leave corrected entries as drafts instead of publishing them.")

    def handle(self, *args, **options):
        try:
            counts = load_corrections(options["file"], draft=options["draft"])
        except CorrectionsProblem as exc:
            raise CommandError(str(exc)) from exc
        for problem in counts["problems"]:
            self.stdout.write(self.style.WARNING(problem))
        self.stdout.write(
            self.style.SUCCESS(f"Corrected: {counts['corrected']}. Left blank: {counts['skipped']}. Problems: {len(counts['problems'])}.")
        )
