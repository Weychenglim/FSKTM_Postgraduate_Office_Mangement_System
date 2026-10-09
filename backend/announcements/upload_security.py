"""Validation for announcement attachments.

Announcements accept ordinary office documents rather than one fixed format, so
this checks size, extension, and leading magic bytes instead of unpacking a
container the way the dashboard's timeline importer does.

Returns a list of human-readable errors; an empty list means the file is
acceptable. Callers surface these as ``400 {"errors": [...]}``.
"""

import os

from django.conf import settings

DEFAULT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
    ".png",
    ".jpg",
    ".jpeg",
}

# Extensions that must begin with one of these signatures. Formats with no
# reliable magic number (plain text, CSV) are intentionally absent.
MAGIC_PREFIXES = {
    ".pdf": [b"%PDF-"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    # OOXML files are ZIP containers; the legacy formats use the OLE2 header.
    ".docx": [b"PK\x03\x04", b"PK\x05\x06"],
    ".xlsx": [b"PK\x03\x04", b"PK\x05\x06"],
    ".pptx": [b"PK\x03\x04", b"PK\x05\x06"],
    ".doc": [b"\xd0\xcf\x11\xe0"],
    ".xls": [b"\xd0\xcf\x11\xe0"],
    ".ppt": [b"\xd0\xcf\x11\xe0"],
}

# Blocked even when nested behind an allowed-looking name (report.pdf.exe).
DANGEROUS_EXTENSIONS = {
    ".exe", ".dll", ".bat", ".cmd", ".com", ".scr", ".ps1", ".sh",
    ".js", ".jse", ".vbs", ".vbe", ".jar", ".msi", ".apk", ".php",
    ".py", ".rb", ".pl", ".html", ".htm", ".svg",
}


def max_attachment_bytes() -> int:
    return getattr(
        settings, "ANNOUNCEMENT_MAX_ATTACHMENT_BYTES", DEFAULT_MAX_ATTACHMENT_BYTES
    )


def _safe_name(filename: str) -> str:
    """Strip any directory component a client may have supplied."""
    return os.path.basename(filename.replace("\\", "/")).strip()


def validate_attachment(uploaded_file) -> list[str]:
    if uploaded_file is None:
        return []

    name = _safe_name(uploaded_file.name or "")
    if not name:
        return ["Attachment must have a file name."]
    if "\x00" in name:
        return ["Attachment file name is not valid."]

    limit = max_attachment_bytes()
    size = getattr(uploaded_file, "size", 0) or 0
    if size == 0:
        return ["Attachment is empty."]
    if size > limit:
        return [f"Attachment must be {limit // (1024 * 1024)} MB or smaller."]

    parts = [f".{part.lower()}" for part in name.split(".")[1:]]
    if not parts:
        return ["Attachment must have a file extension."]

    extension = parts[-1]
    if extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        return [f"Attachment type '{extension}' is not allowed. Allowed: {allowed}."]

    # A double extension such as invoice.exe.pdf is rejected outright: the inner
    # extension is what many clients and users actually act on.
    for part in parts[:-1]:
        if part in DANGEROUS_EXTENSIONS:
            return ["Attachment file name contains a disallowed extension."]

    expected = MAGIC_PREFIXES.get(extension)
    if expected:
        try:
            uploaded_file.seek(0)
            header = uploaded_file.read(8)
        except (OSError, ValueError):
            return ["Attachment could not be read."]
        finally:
            try:
                uploaded_file.seek(0)
            except (OSError, ValueError):
                pass
        if not any(header.startswith(prefix) for prefix in expected):
            return [
                f"Attachment does not look like a valid {extension.lstrip('.').upper()} file."
            ]

    return []
