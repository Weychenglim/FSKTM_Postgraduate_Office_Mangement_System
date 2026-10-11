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

# The key in ``letters.details.letter_details`` each placeholder is filled from.
VALUE_KEYS = {
    "STUDENT_NAME": "studentName",
    "STUDENT_ID": "matricNumber",
    "PROGRAMME_NAME": "programName",
    "CURRENT_STATUS": "currentStatus",
    "SUPERVISOR_NAME": "supervisorName",
    "REFERENCE_NUMBER": "referenceNumber",
    "CURRENT_DATE": "date",
    "PASSPORT_NUMBER": "passportNumber",
    "COUNTRY": "country",
    "PROGRAMME_MODE": "programmeMode",
    "FIELD_OF_RESEARCH": "fieldOfResearch",
    "MODE_OF_STUDY": "modeOfStudy",
    "INITIAL_SEMESTER": "initialSemester",
    "CURRENT_SEMESTER": "currentSemester",
    "MAX_SEMESTER": "maxSemester",
    "EXPECTED_COMPLETION": "expectedCompletion",
}

# Filled by the server when the letter is issued, so never missing.
ISSUED_WITH_LETTER = {"REFERENCE_NUMBER", "CURRENT_DATE"}

TOKEN_RE = re.compile(r"\{\{([^{}]*)\}\}")
NAME_RE = re.compile(r"[A-Z_]+")
TRIPLE_RE = re.compile(r"\{\{\{[^{}]*\}\}\}")
STRAY_BRACES_RE = re.compile(r"\{\{[^{}\n]{0,40}|[^{}\n]{0,40}\}\}")
# A tag typed with single braces, e.g. {STUDENT_NAME}, would print literally.
# Ordinary braces in prose ("{text}") are left alone.
SINGLE_TAG_RE = re.compile(r"(?<!\{)\{[A-Z_]+\}(?!\})")


def placeholder_catalogue():
    return [
        {"tag": f"{{{{{name}}}}}", "name": name, "label": label, "source": source}
        for name, (label, source) in PLACEHOLDERS.items()
    ]


def placeholder_problems(content):
    """Return ``(unknown, malformed)`` tags found in ``content``, each de-duplicated."""
    content = content or ""
    unknown, malformed = [], []
    malformed += TRIPLE_RE.findall(content)
    rest = TRIPLE_RE.sub(" ", content)
    for match in TOKEN_RE.finditer(rest):
        token, name = match.group(0), match.group(1)
        if not NAME_RE.fullmatch(name):
            malformed.append(token)
        elif name not in PLACEHOLDERS:
            unknown.append(token)
    rest = TOKEN_RE.sub(" ", rest)
    malformed += SINGLE_TAG_RE.findall(rest)
    malformed += [stray.strip() for stray in STRAY_BRACES_RE.findall(SINGLE_TAG_RE.sub(" ", rest))]
    return list(dict.fromkeys(unknown)), list(dict.fromkeys(malformed))


def _value(values, name):
    return str(values.get(VALUE_KEYS[name]) or "").strip()


def missing_labels(content, values):
    """Labels of the placeholders ``content`` uses that ``values`` leaves blank."""
    used = [
        match.group(1)
        for match in TOKEN_RE.finditer(content or "")
        if match.group(1) in PLACEHOLDERS and match.group(1) not in ISSUED_WITH_LETTER
    ]
    return [PLACEHOLDERS[name][0] for name in dict.fromkeys(used) if not _value(values, name)]


def fill_placeholders(content, values):
    """Replace every supported ``{{TAG}}`` in ``content`` with its value."""

    def replace(match):
        name = match.group(1)
        return _value(values, name) if name in PLACEHOLDERS else match.group(0)

    return TOKEN_RE.sub(replace, content or "")
