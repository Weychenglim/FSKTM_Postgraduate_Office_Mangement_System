from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand

from faq.review_export import review_workbook


class Command(BaseCommand):
    help = "Write the FAQ review list (entries that need checking) as an Excel file for the office."

    def add_arguments(self, parser):
        parser.add_argument("--out", default=f"faq-review-{date.today().isoformat()}.xlsx")
        parser.add_argument("--all", action="store_true", help="List every entry, not only those that need checking.")

    def handle(self, *args, **options):
        content, count = review_workbook(include_all=options["all"])
        path = Path(options["out"])
        path.write_bytes(content)
        self.stdout.write(self.style.SUCCESS(f"Wrote {count} entries to {path.resolve()}"))
