"""The approved postgraduate programmes (PROJECT_REQUIREMENTS.md).

Mirrored in frontend/src/constants/programmes.ts; a registry test fails if the
two lists drift apart.
"""

APPROVED_PROGRAMMES = [
    "MASTER OF DATA SCIENCE (COURSEWORK)",
    "MASTER OF CYBER SECURITY (COURSEWORK)",
    "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
]


def normalise_programme(value):
    cleaned = (value or "").strip().upper()
    return next((p for p in APPROVED_PROGRAMMES if p.upper() == cleaned), None)
