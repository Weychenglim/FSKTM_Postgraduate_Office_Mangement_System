"""Remembered column matches for the office's own spreadsheet layouts (UC04).

The same extract arrives every intake. When the office imports a file after
confirming its column matches, the matches are saved against a hash of the
file's column names, so the next file with the same columns opens matched the
same way. The office still sees every match and can change it.
"""

import hashlib
from datetime import timedelta

from django.core import signing
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import RegistryImportProfile
from .registry_columns import FIELD_KEYS, normalise_header

_TOKEN_SALT = "accounts.registry_import_layout"
# Long enough for an office session; the token only names a layout.
_TOKEN_MAX_AGE = timedelta(days=1)
# Our own template is matched by its names, so it is never remembered.
_TEMPLATE_LAYOUTS = (
    [normalise_header(key) for key in FIELD_KEYS],
    [normalise_header(key) for key in FIELD_KEYS[:5]],
)


def _names(header):
    names = [normalise_header(cell) for cell in header]
    while names and not names[-1]:
        names.pop()
    return names


def is_our_template(header):
    return [name for name in _names(header) if name] in _TEMPLATE_LAYOUTS


def layout_signature(header):
    """A hash of the file's column names, normalised and in order."""
    return hashlib.sha256("\x1f".join(_names(header)).encode("utf-8")).hexdigest()


def layout_token(header):
    """Handed to the browser by the inspect step, so an import can save its
    matches against this layout even when edited rows are sent back in our
    own layout. None for our own template."""
    if is_our_template(header):
        return None
    return signing.dumps(layout_signature(header), salt=_TOKEN_SALT)


def saved_mapping(header, width):
    """The saved matches for a file with these column names, and when they
    were saved; ``(None, None)`` when there are none or they no longer fit."""
    if is_our_template(header):
        return None, None
    profile = RegistryImportProfile.objects.filter(signature=layout_signature(header)).first()
    if profile is None:
        return None, None
    mapping = {key: profile.mapping.get(key) for key in FIELD_KEYS}
    used = [index for index in mapping.values() if index is not None]
    fits = all(isinstance(index, int) and not isinstance(index, bool) and 0 <= index < width for index in used)
    if not fits or len(set(used)) != len(used):
        return None, None
    return mapping, profile.updated_at


def remember_layout(remember, user):
    """Save the matches an import was made with. A token that is stale or not
    ours saves nothing, and never stops the import."""
    if not remember:
        return
    try:
        signature = signing.loads(remember["token"], salt=_TOKEN_SALT, max_age=_TOKEN_MAX_AGE)
    except signing.BadSignature:
        return
    values = {
        "mapping": remember["mapping"],
        "sheet_name": remember["sheet"],
        "header_row": remember["headerRow"],
        "updated_by": user,
    }
    try:
        with transaction.atomic():
            RegistryImportProfile.objects.update_or_create(signature=signature, defaults=values)
    except IntegrityError:
        # Another import saved this layout at the same moment.
        RegistryImportProfile.objects.filter(signature=signature).update(**values, updated_at=timezone.now())
