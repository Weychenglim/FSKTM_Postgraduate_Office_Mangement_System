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
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models.functions import Lower
from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from .models import Lecturer, OfficeStaff, Student
from .programmes import normalise_programme
from .validators import matric_problem, phone_problem

IMPORT_HEADERS = ["student_id", "full_name", "programme", "email", "phone"]
ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
DEFAULT_MAX_IMPORT_BYTES = 2 * 1024 * 1024
MAX_IMPORT_ROWS = 1000
# Same limits as single registration, so the preview predicts the commit.
MAX_MATRIC_LENGTH = 64
MAX_NAME_LENGTH = 255
MAX_EMAIL_LENGTH = 254
MAX_PHONE_LENGTH = 32
# An XLSX is a ZIP: cap what it may expand to, how wide a row is read, and how
# many blank rows are walked, so a tiny padded or bomb workbook cannot pin a worker.
MAX_XLSX_UNCOMPRESSED_BYTES = 30 * 1024 * 1024
MAX_XLSX_COLUMNS = 50
MAX_BLANK_RUN = 200
UTF8_MULTIBYTE = re.compile(rb"[\xc2-\xf4][\x80-\xbf]+")


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


def _decode_csv(raw):
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        # Excel's "CSV (Comma delimited)" saves Windows-1252, which is fine. A
        # UTF-8 file with one stray byte is not: decoding all of it as
        # Windows-1252 would silently turn "José" into "JosÃ©".
        if UTF8_MULTIBYTE.search(raw):
            line = raw[: exc.start].count(b"\n") + 1
            raise ImportFileError(
                f"Line {line} is not valid UTF-8. Save the file as \"CSV UTF-8\" and try again."
            ) from exc
    try:
        return raw.decode("cp1252")
    except UnicodeDecodeError as exc:
        raise ImportFileError("The CSV file could not be read. Save it as UTF-8 and try again.") from exc


def _csv_lines(raw):
    reader = csv.reader(io.StringIO(_decode_csv(raw), newline=""))
    try:
        for cells in reader:
            yield reader.line_num, [cell.strip() for cell in cells]
    except csv.Error as exc:
        raise ImportFileError(
            f"Line {reader.line_num + 1} of the CSV could not be read ({exc}). "
            "Check its quotes and save it as CSV UTF-8."
        ) from exc


def _xlsx_lines(raw):
    if not raw.startswith(b"PK\x03\x04"):
        raise ImportFileError("That file is not a valid XLSX workbook.")
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            expanded = sum(entry.file_size for entry in archive.infolist())
    except (zipfile.BadZipFile, OSError) as exc:
        raise ImportFileError("That file is not a valid XLSX workbook.") from exc
    if expanded > MAX_XLSX_UNCOMPRESSED_BYTES:
        raise ImportFileError("That workbook is too large to import. Save it as CSV and try again.")
    try:
        workbook = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    except (InvalidFileException, zipfile.BadZipFile, KeyError, OSError) as exc:
        raise ImportFileError("That file is not a valid XLSX workbook.") from exc
    try:
        kept = 0
        blank_run = 0
        rows = workbook.active.iter_rows(values_only=True, max_col=MAX_XLSX_COLUMNS)
        for line, values in enumerate(rows, start=1):
            cells = [_text(value) for value in values]
            if not any(cells):
                blank_run += 1
                if blank_run > MAX_BLANK_RUN:
                    return
                continue
            blank_run = 0
            yield line, cells
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


def _field_problem(matric, name, phone):
    """The first length/format problem in a row's free-text fields, or None."""
    if len(matric) > MAX_MATRIC_LENGTH:
        return f"student_id is longer than {MAX_MATRIC_LENGTH} characters"
    problem = matric_problem(matric)
    if problem:
        return problem
    if len(name) > MAX_NAME_LENGTH:
        return f"full_name is longer than {MAX_NAME_LENGTH} characters"
    if len(phone) > MAX_PHONE_LENGTH:
        return f"phone is longer than {MAX_PHONE_LENGTH} characters"
    return phone_problem(phone)


def _email_problem(email):
    if len(email) > MAX_EMAIL_LENGTH:
        return f"email is longer than {MAX_EMAIL_LENGTH} characters"
    try:
        validate_email(email)
    except ValidationError:
        return f'"{email}" is not a valid email address'
    return None


def _same_text(first, second):
    return " ".join((first or "").split()).casefold() == " ".join((second or "").split()).casefold()


def _existing_record(user):
    """The registry record an already-registered row matched, as the office sees it."""
    student = user._related_or_none("student")
    return {
        "id": student.matric_no if student else "",
        "name": user.full_name,
        "email": user.email,
        "programme": student.programme if student else "",
        "academicStatus": student.status if student else "",
        "role": user.role,
    }


def _differences(cells, existing, matched_by):
    """Identity details in the file that disagree with the record it matched,
    which usually means a wrong Student ID or email in the file."""
    checks = [("name", cells["full_name"], existing["name"])]
    if matched_by == "studentId":
        checks.append(("email", cells["email"], existing["email"]))
    else:
        checks.append(("id", cells["student_id"], existing["id"]))
    return [field for field, in_file, on_record in checks if in_file and not _same_text(in_file, on_record)]


def validate_import_rows(rows):
    """Check each row against the same rules as single registration."""
    first_id, first_email = {}, {}
    for line, cells in rows:
        if cells["student_id"]:
            first_id.setdefault(cells["student_id"].lower(), line)
        if cells["email"]:
            first_email.setdefault(cells["email"].lower(), line)

    # The matched accounts are kept, not just their keys, so already-registered
    # rows can show the office who they are. One query each, whatever the size.
    registered_ids = {
        student.key: student.user
        for student in Student.objects.select_related("user")
        .annotate(key=Lower("matric_no"))
        .filter(key__in=list(first_id))
    }
    registered_emails = {
        user.key: user
        for user in get_user_model()
        .objects.select_related("student")
        .annotate(key=Lower("email"))
        .filter(key__in=list(first_email))
    }
    # Sign-in accepts a matric or a staff number, so one value cannot be both.
    staff_numbers = {
        number.lower()
        for model in (OfficeStaff, Lecturer)
        for number in model.objects.annotate(key=Lower("staff_no"))
        .filter(key__in=list(first_id))
        .values_list("staff_no", flat=True)
    }

    checked = []
    for line, cells in rows:
        matric, name, email = cells["student_id"], cells["full_name"], cells["email"]
        programme = normalise_programme(cells["programme"])
        status, issue = "Ready", ""
        existing_user = matched_by = duplicate_of = None

        field_problem = _field_problem(matric, name, cells["phone"]) if matric and name else None
        email_problem = _email_problem(email) if email else None
        # A student who is already registered is skipped whatever else the row
        # says, so that is reported before problems the office would otherwise
        # be asked to fix for nothing (an extract re-uploaded for late
        # registrations lists everyone again).
        if not matric or not name:
            status = "Missing Field"
            issue = "student_id is required" if not matric else "full_name is required"
        elif field_problem:
            status = "Invalid Field"
            issue = field_problem
        elif first_id[matric.lower()] != line:
            status = "Duplicate In File"
            duplicate_of = first_id[matric.lower()]
            issue = f"same student_id as line {duplicate_of}"
        elif matric.lower() in staff_numbers:
            status = "Invalid Field"
            issue = "this student_id is already used as a staff number"
        elif matric.lower() in registered_ids:
            status = "Already Registered"
            issue = "this matric number is already registered"
            existing_user, matched_by = registered_ids[matric.lower()], "studentId"
        elif not email:
            status = "Missing Email"
            issue = "email is required; the student needs it to activate the account"
        elif email_problem:
            status = "Missing Email"
            issue = email_problem
        elif first_email[email.lower()] != line:
            status = "Duplicate In File"
            duplicate_of = first_email[email.lower()]
            issue = f"same email as line {duplicate_of}"
        elif email.lower() in registered_emails:
            status = "Already Registered"
            issue = "this email already has an account"
            existing_user, matched_by = registered_emails[email.lower()], "email"
        elif not programme:
            status = "Bad Programme"
            issue = f'"{cells["programme"]}" is not an approved programme'

        row = {
            "line": line,
            "id": matric,
            "name": name,
            "programme": programme or cells["programme"],
            "email": email,
            "phone": cells["phone"],
            "status": status,
            "issue": issue,
        }
        if duplicate_of is not None:
            row["duplicateOf"] = duplicate_of
        if existing_user is not None:
            row["existing"] = _existing_record(existing_user)
            row["matchedBy"] = matched_by
            row["differences"] = _differences(cells, row["existing"], matched_by)
        checked.append(row)
    return checked
