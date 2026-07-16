import re
from pathlib import PurePosixPath
from zipfile import BadZipFile, LargeZipFile, ZipFile


MAX_TIMELINE_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_TIMELINE_ARCHIVE_ENTRIES = 1_000
MAX_TIMELINE_UNCOMPRESSED_BYTES = 50 * 1024 * 1024

REQUIRED_XLSX_ENTRIES = {
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
}


def _unsafe_archive_path(filename):
    normalized = filename.replace("\\", "/")
    path = PurePosixPath(normalized)
    return (
        not normalized
        or "\x00" in normalized
        or normalized.startswith("/")
        or re.match(r"^[A-Za-z]:", normalized) is not None
        or ".." in path.parts
    )


def validate_timeline_upload(uploaded_file):
    if not uploaded_file.name.lower().endswith(".xlsx"):
        return ["Only .xlsx timeline templates are accepted."]
    if uploaded_file.size > MAX_TIMELINE_UPLOAD_BYTES:
        return ["Timeline file must be 10 MB or smaller."]

    try:
        uploaded_file.seek(0)
        with ZipFile(uploaded_file) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_TIMELINE_ARCHIVE_ENTRIES:
                return ["XLSX archive contains more than 1,000 entries."]

            if sum(entry.file_size for entry in entries) > MAX_TIMELINE_UNCOMPRESSED_BYTES:
                return ["XLSX archive expands beyond the 50 MB limit."]

            if any(entry.flag_bits & 0x1 for entry in entries):
                return ["Encrypted XLSX archive entries are not allowed."]

            if any(_unsafe_archive_path(entry.filename) for entry in entries):
                return ["XLSX archive contains an unsafe file path."]

            normalized_names = {entry.filename.replace("\\", "/") for entry in entries}
            lower_names = {name.lower() for name in normalized_names}
            if any(name.endswith("vbaproject.bin") for name in lower_names):
                return ["Macro-enabled XLSX content is not allowed."]

            has_worksheet = any(
                name.startswith("xl/worksheets/") and name.endswith(".xml")
                for name in normalized_names
            )
            if not REQUIRED_XLSX_ENTRIES.issubset(normalized_names) or not has_worksheet:
                return ["Timeline file is missing required XLSX workbook structure."]

            if archive.testzip() is not None:
                return ["Timeline XLSX archive failed its integrity check."]

            content_types = archive.read("[Content_Types].xml").lower()
            if b"vbaproject" in content_types or b"macroenabled" in content_types:
                return ["Macro-enabled XLSX content is not allowed."]
    except (BadZipFile, LargeZipFile, OSError, RuntimeError, ValueError):
        return ["Timeline file is not a valid XLSX workbook."]
    finally:
        uploaded_file.seek(0)

    return []
