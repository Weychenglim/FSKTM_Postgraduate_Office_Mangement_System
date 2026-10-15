from django.conf import settings
from django.core.management.base import BaseCommand

from faq.encoder import get_encoder
from faq.models import FaqVector
from faq.search import clear_index, current_index, fingerprint


class Command(BaseCommand):
    help = "Work out the meaning of every published FAQ question now, and drop vectors no longer used."

    def handle(self, *args, **options):
        clear_index()
        index = current_index()
        encoder = get_encoder()
        if encoder is None:
            self.stdout.write(self.style.WARNING(f"Keyword search only ({settings.FAQ_SEARCH}). {len(index.items)} entries indexed."))
            return
        used = {fingerprint(text) for item in index.items for text in item.asked_as}
        stale = FaqVector.objects.filter(model_name=encoder.name).exclude(fingerprint__in=used)
        dropped = stale.count()
        stale.delete()
        self.stdout.write(
            self.style.SUCCESS(f"{len(index.items)} entries, {len(used)} questions ready with {encoder.name}. Dropped {dropped} old vectors.")
        )
