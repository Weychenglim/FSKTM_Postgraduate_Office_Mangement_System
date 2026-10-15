"""The meaning model behind the chatbot's search.

It is loaded once per process, the first time it is needed, never at import.
If it cannot be loaded (not installed, no download yet, no memory), the
chatbot answers with keyword search alone and the office screen says so.
"""
import logging
import threading
import time

from django.conf import settings
from django.utils.module_loading import import_string

logger = logging.getLogger(__name__)

KEYWORDS = "keywords"
HYBRID = "hybrid"
RETRY_AFTER = 300

_lock = threading.Lock()
_encoder = None
_failed_at = None


class FastEmbedEncoder:
    """``paraphrase-multilingual-MiniLM-L12-v2`` through fastembed, on the CPU."""

    def __init__(self):
        from fastembed import TextEmbedding

        self.name = settings.FAQ_MODEL
        self._model = TextEmbedding(model_name=self.name, cache_dir=settings.FAQ_MODEL_CACHE)

    def encode(self, texts):
        """Unit-length vectors, one row per text."""
        import numpy

        rows = numpy.array(list(self._model.embed(list(texts))), dtype="float32")
        norms = numpy.linalg.norm(rows, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return rows / norms


def get_encoder():
    """The loaded encoder, or None when only keyword search is available."""
    global _encoder, _failed_at
    if settings.FAQ_SEARCH == KEYWORDS:
        return None
    if _encoder is not None and getattr(_encoder, "source", None) == settings.FAQ_ENCODER:
        return _encoder
    if _failed_at is not None and time.monotonic() - _failed_at < RETRY_AFTER:
        return None
    with _lock:
        if _encoder is not None and getattr(_encoder, "source", None) == settings.FAQ_ENCODER:
            return _encoder
        try:
            encoder = import_string(settings.FAQ_ENCODER)()
            encoder.source = settings.FAQ_ENCODER
        except Exception:
            logger.exception("The FAQ meaning model could not be loaded; using keyword search only.")
            _failed_at = time.monotonic()
            return None
        _encoder, _failed_at = encoder, None
        return _encoder


def search_mode():
    return HYBRID if get_encoder() is not None else KEYWORDS


def reset_encoder():
    global _encoder, _failed_at
    with _lock:
        _encoder, _failed_at = None, None
