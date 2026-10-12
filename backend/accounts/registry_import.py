"""Student Registry bulk import (UC04): read a CSV or XLSX file and check rows.

Rows are never auto-corrected. A missing email or an unrecognised programme is
reported so a person fixes it; inventing a value would attach a real account to
the wrong mailbox.
"""

import csv
import datetime
import io
import os
import re
import zipfile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models.functions import Lower
from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from .models import Student
from .programmes import normalise_programme

IMPORT_HEADERS = ["student_id", "full_name", "programme", "email", "phone"]
ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
DEFAULT_MAX_IMPORT_BYTES = 2 * 1024 * 1024
MAX_IMPORT_ROWS = 1000
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ImportFileError(ValueError):
    pass


def max_import_bytes():
    return getattr(settings, "REGISTRY_IMPORT_MAX_BYTES", DEFAULT_MAX_IMPORT_BYTES)


def _text(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.date().isoformat() if isinstance(value, datetime.datetime) else value.isoformat()
    return str(value).strip()


def _csv_lines(raw):
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ImportFileError("The CSV file could not be read. Save it as UTF-8 and try again.")
    reader = csv.reader(io.StringIO(text))
    for cells in reader:
        yield reader.line_num, [cell.strip() for cell in cells]


def _xlsx_lines(raw):
    if not raw.startswith(b"PK\x03\x04"):
        raise ImportFileError("That file is not a valid XLSX workbook.")
    try:
        workbook = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    except (InvalidFileException, zipfile.BadZipFile, KeyError, OSError) as exc:
        raise ImportFileError("That file is not a valid XLSX workbook.") from exc
    try:
        kept = 0
        for line, values in enumerate(workbook.active.iter_rows(values_only=True), start=1):
            cells = [_text(value) for value in values]
            yield line, cells
            if any(cells):
                kept += 1
                if kept > MAX_IMPORT_ROWS + 1:
                    return
    finally:
        workbook.close()


def read_import_file(uploaded_file):
    """Return ``[(line_number, {header: value})]`` for every student row."""
    extension = os.path.splitext(uploaded_file.name or "")[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ImportFileError("Only XLSX or CSV files allowed.")
    limit = max_import_bytes()
    if uploaded_file.size > limit:
        raise ImportFileError(f"The file is larger than the {limit // 1024} KB import limit.")

    raw = uploaded_file.read()
    lines = _xlsx_lines(raw) if extension == ".xlsx" else _csv_lines(raw)
    lines = [(line, cells) for line, cells in lines if any(cells)]
    if not lines:
        raise ImportFileError("The file is empty.")

    header = [cell.lower() for cell in lines[0][1]]
    missing = [name for name in IMPORT_HEADERS if name not in header]
    if missing:
        raise ImportFileError(
            f"Missing required column(s): {', '.join(missing)}. "
            "Download the template for the expected format."
        )
    rows = lines[1:]
    if not rows:
        raise ImportFileError("The file has a header row but no student rows.")
    if len(rows) > MAX_IMPORT_ROWS:
        raise ImportFileError(
            f"The file has more than {MAX_IMPORT_ROWS} student rows. Split it and import each part."
        )

    index = {name: header.index(name) for name in IMPORT_HEADERS}
    return [
        (line, {name: cells[index[name]] if index[name] < len(cells) else "" for name in IMPORT_HEADERS})
        for line, cells in rows
    ]


def validate_import_rows(rows):
    """Check each row against the same rules as single registration."""
    first_id, first_email = {}, {}
    for line, cells in rows:
        if cells["student_id"]:
            first_id.setdefault(cells["student_id"].lower(), line)
        if cells["email"]:
            first_email.setdefault(cells["email"].lower(), line)

    registered_ids = set(
        Student.objects.annotate(key=Lower("matric_no"))
        .filter(key__in=list(first_id))
        .values_list("key", flat=True)
    )
    registered_emails = set(
        get_user_model()
        .objects.annotate(key=Lower("email"))
        .filter(key__in=list(first_email))
        .values_list("key", flat=True)
    )

    checked = []
    for line, cells in rows:
        matric, name, email = cells["student_id"], cells["full_name"], cells["email"]
        programme = normalise_programme(cells["programme"])
        status, issue = "Ready", ""

        if not matric or not name:
            status = "Missing Field"
            issue = "student_id is required" if not matric else "full_name is required"
        elif first_id[matric.lower()] != line:
            status = "Duplicate In File"
            issue = f"same student_id as line {first_id[matric.lower()]}"
        elif not email:
            status = "Missing Email"
            issue = "email is required — the student needs it to activate the account"
        elif not EMAIL_RE.match(email):
            status = "Missing Email"
            issue = f'"{email}" is not a valid email address'
        elif first_email[email.lower()] != line:
            status = "Duplicate In File"
            issue = f"same email as line {first_email[email.lower()]}"
        elif not programme:
            status = "Bad Programme"
            issue = f'"{cells["programme"]}" is not an approved programme'
        elif matric.lower() in registered_ids:
            status = "Already Registered"
            issue = "this matric number is already registered"
        elif email.lower() in registered_emails:
            status = "Already Registered"
            issue = "this email already has an account"

        checked.append(
            {
                "line": line,
                "id": matric,
                "name": name,
                "programme": programme or cells["programme"],
                "email": email,
                "phone": cells["phone"],
                "status": status,
                "issue": issue,
            }
        )
    return checked
