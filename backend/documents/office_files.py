"""Checks for Word, Excel and PowerPoint files (Office Open XML ZIP packages).

The rules follow appointments/supervisor_documents.py for Word and add the
places Excel and PowerPoint hide code: macro sheets, ActiveX, OLE objects and
links to other files.
"""
import io
import re
import zipfile
from pathlib import PurePosixPath
from xml.etree import ElementTree

MAX_ENTRIES = 2000
MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024
MAX_RATIO = 200
RATIO_CHECK_FROM_BYTES = 1024 * 1024
OLE_SIGNATURE = b"\xd0\xcf\x11\xe0"

MAIN_PARTS = {
    "DOCX": ("word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"),
    "XLSX": ("xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"),
    "PPTX": ("ppt/presentation.xml", "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"),
}
SAVE_AS = {"DOCX": ".docx", "XLSX": ".xlsx", "PPTX": ".pptx"}
CONTENT_TYPES_NS = "{http://schemas.openxmlformats.org/package/2006/content-types}"
RELATIONSHIPS_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
MACRO_EXTENSIONS = {".bin", ".docm", ".dotm", ".xlsm", ".xlsb", ".xltm", ".xlam", ".pptm", ".potm", ".ppsm", ".ppam"}
DRIVE_LETTER = re.compile(r"^[A-Za-z]:")


class OfficeFileProblem(Exception):
    pass


def _code_problem(kind):
    return OfficeFileProblem(
        f"This file contains macros or embedded programs. Save it as a normal {SAVE_AS[kind]} file and upload it again."
    )


def _unsafe_name(name):
    path = PurePosixPath(name)
    return (
        name.startswith("/")
        or "\\" in name
        or bool(DRIVE_LETTER.match(name))
        or ".." in path.parts
    )


def _parse(archive, name):
    try:
        return ElementTree.fromstring(archive.read(name))
    except (ElementTree.ParseError, KeyError, zipfile.BadZipFile):
        raise OfficeFileProblem("This file is damaged. Save it again and upload the new copy.")


def check_office_file(content, kind):
    if content.startswith(OLE_SIGNATURE):
        raise OfficeFileProblem(
            f"This file is password-protected or in an old format. Remove the password or save it as {SAVE_AS[kind]}, then upload it again."
        )
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except (zipfile.BadZipFile, ValueError):
        raise OfficeFileProblem("This file is damaged. Save it again and upload the new copy.")
    with archive:
        entries = archive.infolist()
        if len(entries) > MAX_ENTRIES:
            raise OfficeFileProblem("This file has too many parts to be checked safely.")
        total = 0
        for entry in entries:
            total += entry.file_size
            if entry.flag_bits & 0x1:
                raise OfficeFileProblem(
                    f"This file is password-protected. Remove the password, save it as {SAVE_AS[kind]} and upload it again."
                )
            if _unsafe_name(entry.filename) or (entry.external_attr >> 16) & 0o170000 == 0o120000:
                raise OfficeFileProblem("This file has unsafe parts and cannot be uploaded.")
            if entry.file_size >= RATIO_CHECK_FROM_BYTES and entry.file_size > MAX_RATIO * max(entry.compress_size, 1):
                raise OfficeFileProblem("This file expands too much to be checked safely.")
        if total > MAX_UNCOMPRESSED_BYTES:
            raise OfficeFileProblem("This file expands too much to be checked safely.")

        names = {entry.filename for entry in entries}
        main_part, main_type = MAIN_PARTS[kind]
        if "[Content_Types].xml" not in names or "_rels/.rels" not in names or main_part not in names:
            raise OfficeFileProblem(f"This is not a normal {SAVE_AS[kind]} file. Save it again and upload the new copy.")
        if archive.testzip() is not None:
            raise OfficeFileProblem("This file is damaged. Save it again and upload the new copy.")

        types = _parse(archive, "[Content_Types].xml")
        declared = {}
        for node in types:
            content_type = node.get("ContentType", "")
            if "macroenabled" in content_type.lower() or "vbaproject" in content_type.lower():
                raise _code_problem(kind)
            if node.tag == f"{CONTENT_TYPES_NS}Override":
                declared[node.get("PartName", "").lstrip("/")] = content_type
        if declared.get(main_part) != main_type:
            raise OfficeFileProblem(
                f"This is not a normal {SAVE_AS[kind]} file. Templates, add-ins and macro files are not accepted."
            )

        for name in names:
            lowered = name.lower()
            leaf = PurePosixPath(lowered)
            if (
                leaf.name == "vbaproject.bin"
                or lowered.startswith(("xl/macrosheets/", "xl/dialogsheets/"))
                or "activex" in lowered
                or ("/embeddings/" in lowered and (leaf.name.startswith("oleobject") or leaf.suffix in MACRO_EXTENSIONS))
            ):
                raise _code_problem(kind)
            if lowered.startswith("xl/externallinks/"):
                raise OfficeFileProblem(
                    "This spreadsheet links to other files. Use Data, Edit Links, Break Link, then upload it again."
                )

        for name in names:
            if not name.endswith(".rels"):
                continue
            for relationship in _parse(archive, name):
                if relationship.tag != f"{RELATIONSHIPS_NS}Relationship":
                    continue
                if relationship.get("TargetMode", "").lower() == "external" and not relationship.get("Type", "").endswith("/hyperlink"):
                    raise OfficeFileProblem(
                        "This file links to content outside it, such as a remote template or linked object. Remove the link and upload it again."
                    )
