"""The placeholders a letter template may use, and where each value comes from.

Mirrored by ``LETTER_PLACEHOLDERS`` in frontend/src/utils/letterDocument.ts; a
frontend test fails if the two lists differ.
"""

import re

PLACEHOLDERS = {
    "STUDENT_NAME": ("Student Name", "The student's full name"),
    "STUDENT_ID": ("Matric Number", "The student's matric number"),
    "PROGRAMME_NAME": ("Programme", "The student's programme"),
    "CURRENT_STATUS": ("Current Status", "The student's academic status"),
    "SUPERVISOR_NAME": ("Supervisor", "The student's current primary supervisor"),
    "REFERENCE_NUMBER": ("Reference No.", "Issued when the letter is generated"),
    "CURRENT_DATE": ("Date", "The date the letter is generated"),
    "PASSPORT_NUMBER": ("Passport No.", "Registry passport number, or IC for local students"),
    "COUNTRY": ("Country", "Registry nationality"),
    "PROGRAMME_MODE": ("Programme Mode", "Registry programme mode"),
    "FIELD_OF_RESEARCH": ("Field of Research", "Registry field of study"),
    "MODE_OF_STUDY": ("Mode of Study", "Registry mode of study"),
    "INITIAL_SEMESTER": ("Initial Semester", "The student's intake semester"),
    "CURRENT_SEMESTER": ("Current Semester", "Registry current semester"),
    "MAX_SEMESTER": ("Maximum Semester", "Registry maximum semester"),
    "EXPECTED_COMPLETION": ("Expected Completion", "Registry expected completion"),
}

TOKEN_RE = re.compile(r"\{\{([^{}]*)\}\}")
NAME_RE = re.compile(r"[A-Z_]+")
STRAY_BRACES_RE = re.compile(r"\{\{[^{}\n]{0,40}|[^{}\n]{0,40}\}\}")


def placeholder_catalogue():
    return [
        {"tag": f"{{{{{name}}}}}", "name": name, "label": label, "source": source}
        for name, (label, source) in PLACEHOLDERS.items()
    ]


def placeholder_problems(content):
    """Return ``(unknown, malformed)`` tags found in ``content``, each de-duplicated."""
    content = content or ""
    unknown, malformed = [], []
    for match in TOKEN_RE.finditer(content):
        token, name = match.group(0), match.group(1)
        if not NAME_RE.fullmatch(name):
            malformed.append(token)
        elif name not in PLACEHOLDERS:
            unknown.append(token)
    malformed += [stray.strip() for stray in STRAY_BRACES_RE.findall(TOKEN_RE.sub("", content))]
    return list(dict.fromkeys(unknown)), list(dict.fromkeys(malformed))
