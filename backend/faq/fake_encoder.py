"""A tiny stand-in for the meaning model, so tests never download it.

Words are mapped to a few shared ideas, in English and Malay, so that
"Bagaimana nak daftar kursus?" lands near "How do I register courses?".
Words it does not know add nothing, which lets tests show the keyword
search rescuing exact terms the model misses.
"""
import numpy

from .text import words

IDEAS = {
    "register": "register", "registration": "register", "daftar": "register", "enrol": "register",
    "enroll": "register", "enrolment": "register", "pendaftaran": "register",
    "course": "course", "kursus": "course", "subject": "course", "subjek": "course", "class": "course",
    "fee": "fee", "yuran": "fee", "cost": "fee", "pay": "fee", "bayar": "fee", "tuition": "fee",
    "defer": "defer", "postpone": "defer", "tangguh": "defer", "delay": "defer",
    "offer": "offer", "tawaran": "offer", "letter": "offer", "surat": "offer",
    "thesis": "thesis", "tesis": "thesis", "dissertation": "thesis", "disertasi": "thesis",
    "graduate": "graduate", "graduation": "graduate", "convocation": "graduate", "konvokesyen": "graduate",
    "apply": "apply", "application": "apply", "mohon": "apply", "permohonan": "apply",
}
ORDER = sorted(set(IDEAS.values()))


class FakeEncoder:
    name = "fake-test-encoder"
    calls = 0

    def encode(self, texts):
        FakeEncoder.calls += len(texts)
        rows = numpy.zeros((len(texts), len(ORDER)), dtype="float32")
        for row, text in enumerate(texts):
            for word in words(text):
                if word in IDEAS:
                    rows[row, ORDER.index(IDEAS[word])] += 1
        norms = numpy.linalg.norm(rows, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return rows / norms


class BrokenEncoder:
    def __init__(self):
        raise RuntimeError("model files missing")
