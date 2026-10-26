"""Reading the text out of a reference document and cutting it into passages.

PDF text comes from PDFium, which is already installed. Word text is read
from the file's own XML, so no new library is needed. Scanned PDFs have no
text layer; no text recognition is done, so they come back empty.
"""
import io
import re
import zipfile
from xml.etree import ElementTree

import pypdfium2 as pdfium

from documents.pdfium import LOCK

WORDS_PER_PASSAGE = 150
SOFT_END = 110
MIN_WORDS = 20
WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
SENTENCE_END = re.compile(r"[.!?]['\")\]]?$")


def pdf_pages(content):
    """The text of each page, numbered from 1."""
    pages = []
    with LOCK:
        pdf = pdfium.PdfDocument(content)
        try:
            for number in range(len(pdf)):
                page = pdf[number]
                textpage = page.get_textpage()
                try:
                    pages.append((number + 1, textpage.get_text_range()))
                finally:
                    textpage.close()
                    page.close()
        finally:
            pdf.close()
    return pages


def docx_text(content):
    """The paragraphs of a Word file. Word files have no fixed pages."""
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    paragraphs = []
    for paragraph in root.iter(f"{WORD_NS}p"):
        parts = []
        for node in paragraph.iter():
            if node.tag == f"{WORD_NS}t" and node.text:
                parts.append(node.text)
            elif node.tag in (f"{WORD_NS}tab", f"{WORD_NS}br"):
                parts.append(" ")
        text = "".join(parts).strip()
        if text:
            paragraphs.append(text)
    return [(None, "\n".join(paragraphs))]


def passages(pages):
    """About 150 words each, ending at a sentence where possible, never
    running across a page."""
    found = []
    for page, text in pages:
        words = text.split()
        start = 0
        while start < len(words):
            end = min(start + WORDS_PER_PASSAGE, len(words))
            if end < len(words):
                for cut in range(end, start + SOFT_END, -1):
                    if SENTENCE_END.search(words[cut - 1]):
                        end = cut
                        break
            chunk = " ".join(words[start:end])
            if chunk:
                found.append((page, chunk))
            start = end
    return found


def read_passages(content, kind):
    """``(page count, passages)``. Too little text counts as none."""
    pages = pdf_pages(content) if kind == "PDF" else docx_text(content)
    found = passages(pages)
    total = sum(len(text.split()) for _, text in found)
    page_count = len(pages) if kind == "PDF" else None
    return page_count, (found if total >= MIN_WORDS else [])
