"""Report stored File Management files that are missing, and files nothing refers to.

A missing file means that version can no longer be downloaded. A file nothing
refers to is left over, for example from an upload stopped between storing the
file and saving its record. ``--remove-orphans`` deletes those leftovers once
they are an hour old, so an upload still in progress is never touched.
"""
import time
from pathlib import Path

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from documents.models import DocumentVersion

FOLDER = "documents"
GRACE_SECONDS = 3600


class Command(BaseCommand):
    help = "Report missing and left-over File Management files."

    def add_arguments(self, parser):
        parser.add_argument(
            "--remove-orphans",
            action="store_true",
            help="Delete left-over files that are more than an hour old.",
        )

    def handle(self, *args, **options):
        stored = set(DocumentVersion.objects.values_list("file", flat=True))
        missing = sorted(name for name in stored if not default_storage.exists(name))
        media = Path(settings.MEDIA_ROOT)
        folder = media / FOLDER
        on_disk = {}
        if folder.exists():
            on_disk = {path.relative_to(media).as_posix(): path for path in folder.rglob("*") if path.is_file()}
        orphans = sorted(name for name in on_disk if name not in stored)

        for name in missing:
            self.stdout.write(f"Missing: {name}")
        for name in orphans:
            self.stdout.write(f"Left over: {name}")

        removed = 0
        if options["remove_orphans"]:
            cutoff = time.time() - GRACE_SECONDS
            for name in orphans:
                path = on_disk[name]
                if path.stat().st_mtime < cutoff:
                    path.unlink()
                    removed += 1

        summary = f"Checked {len(stored)} stored file(s): {len(missing)} missing, {len(orphans)} left over"
        if options["remove_orphans"]:
            summary += f", {removed} removed"
        self.stdout.write(summary + ".")
