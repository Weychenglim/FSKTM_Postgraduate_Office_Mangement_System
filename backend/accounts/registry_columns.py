"""Matching a spreadsheet's own column names to the registry import fields.

The office's extract has its own column names, often in Malay. Names are
compared after normalising (letter case, punctuation and spacing ignored)
against a list of known names for each field. Only exact matches count: a
column the system is unsure about stays unmatched for the office to choose,
because a wrong guess would put data in the wrong field.

The known names come from research (2026-10-12); add the exact names used in
the office's real extract when a sample arrives (plan P1).
"""
import re

# key, label shown to the office, required
FIELDS = [
    ("student_id", "Student ID", True),
    ("full_name", "Full name", True),
    ("programme", "Programme", True),
    ("email", "Email", True),
    ("phone", "Phone", False),
    ("intake", "Intake", False),
    ("current_semester", "Current semester", False),
]
FIELD_KEYS = [key for key, _, _ in FIELDS]
FIELD_LABELS = {key: label for key, label, _ in FIELDS}

# Normalised forms. "id", "no", "ic", "kp" and "passport" are deliberately
# absent: such columns usually hold IC or passport numbers.
KNOWN_NAMES = {
    "student_id": {
        "student id", "studentid", "student no", "student number", "matric", "matric no",
        "matric number", "matriculation number", "no matrik", "nombor matrik", "no pelajar",
        "id pelajar", "nombor pelajar",
    },
    "full_name": {
        "full name", "fullname", "name", "student name", "nama", "nama penuh", "nama pelajar",
        "nama penuh pelajar",
    },
    "programme": {
        "programme", "program", "programme name", "program name", "programme of study",
        "program pengajian", "nama program", "nama program pengajian", "course", "kursus",
    },
    "email": {
        "email", "e mail", "emel", "e mel", "email address", "e mail address", "alamat emel",
        "alamat e mel", "siswamail", "student email", "emel pelajar", "emel siswa", "email siswa",
        "official email",
    },
    "phone": {
        "phone", "phone no", "phone number", "mobile", "mobile no", "mobile number", "telephone",
        "tel", "tel no", "no tel", "no telefon", "telefon", "no hp", "no h p", "handphone",
        "no telefon bimbit", "telefon bimbit", "contact no", "contact number",
    },
    "intake": {
        "intake", "intake session", "intake semester", "intake batch", "sesi kemasukan",
        "kemasukan", "semester kemasukan",
    },
    "current_semester": {"current semester", "semester", "semester semasa", "current sem"},
}

_NOT_WORD = re.compile(r"[^0-9a-z]+")


def normalise_header(value):
    """"No. Matrik" and "no_matrik" both become "no matrik"."""
    return _NOT_WORD.sub(" ", str(value or "").casefold()).strip()


def field_for_header(value):
    """The field a column name is known for, or None."""
    name = normalise_header(value)
    return next((key for key in FIELD_KEYS if name and name in KNOWN_NAMES[key]), None)


def suggest_mapping(headers):
    """``{field: column index or None}`` from exact known-name matches.

    A field that two columns could fill stays unmatched, so the office picks.
    """
    candidates = {key: [] for key in FIELD_KEYS}
    for index, header in enumerate(headers):
        key = field_for_header(header)
        if key:
            candidates[key].append(index)
    return {key: found[0] if len(found) == 1 else None for key, found in candidates.items()}


def header_score(cells):
    """How many different fields a row's cells name, used to find the header row."""
    return len({key for key in map(field_for_header, cells) if key})


def column_letter(index):
    """0 -> "A", 25 -> "Z", 26 -> "AA": how a spreadsheet names a column."""
    letters = ""
    index += 1
    while index:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters
