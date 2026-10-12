"""Letter reference numbers: ``<prefix>/<year>/<NNNN>``, counted per prefix and year."""
from .models import LetterReferenceCounter

DEFAULT_PREFIX = "UMF/PG"


def normalise_prefix(prefix):
    return (prefix or "").strip().rstrip("/").strip() or DEFAULT_PREFIX


def next_reference_number(prefix, year):
    """Take the next number for ``prefix`` in ``year``.

    Call it inside the transaction that saves the letter: the counter row stays
    locked until that commits, so two letters can never share a number and a
    refused letter never uses one up.
    """
    prefix = normalise_prefix(prefix)
    LetterReferenceCounter.objects.get_or_create(prefix=prefix, year=year)
    counter = LetterReferenceCounter.objects.select_for_update().get(prefix=prefix, year=year)
    counter.last_number += 1
    counter.save(update_fields=["last_number"])
    return f"{prefix}/{year}/{counter.last_number:04d}"
