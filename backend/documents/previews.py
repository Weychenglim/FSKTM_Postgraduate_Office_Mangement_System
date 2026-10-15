"""Previews drawn on the server.

The portal's security policy blocks the browser's own PDF viewer, frames and
workers, so PDF pages and images are sent as PNG pictures and Word files as
plain text.
"""
import io
import zipfile
from xml.etree import ElementTree

import pypdfium2 as pdfium
from PIL import Image

from .pdfium import LOCK

PAGE_WIDTH = 1100
MAX_SCALE = 3
MAX_HEIGHT = 4000
MAX_IMAGE_SIDE = 1600
MAX_TEXT = 20_000
WORD = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


class PreviewMissing(Exception):
    pass


def _png(image):
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()


def pdf_page_png(content, number):
    with LOCK:
        pdf = pdfium.PdfDocument(content)
        try:
            if number < 1 or number > len(pdf):
                raise PreviewMissing()
            pdf.init_forms()
            page = pdf[number - 1]
            width, height = page.get_size()
            scale = min(MAX_SCALE, PAGE_WIDTH / max(width, 1))
            scale = min(scale, MAX_HEIGHT / max(height, 1))
            image = page.render(scale=scale, may_draw_forms=True).to_pil()
            page.close()
        finally:
            pdf.close()
    return _png(image.convert("RGB"))


def image_png(content):
    with Image.open(io.BytesIO(content)) as image:
        image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
        return _png(image.convert("RGBA") if image.mode in ("P", "LA") else image)


def docx_text(content):
    """Paragraph and table text of a Word file, cut at MAX_TEXT characters."""
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    lines = []
    for paragraph in root.iter(f"{WORD}p"):
        text = "".join(node.text or "" for node in paragraph.iter(f"{WORD}t"))
        lines.append(text)
    text = "\n".join(lines).strip()
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return text[:MAX_TEXT], len(text) > MAX_TEXT
