"""PDFium is not thread-safe, so every call into it holds this one lock."""
import threading

import pypdfium2 as pdfium
import pypdfium2.raw as pdfium_raw

LOCK = threading.Lock()
MAX_PAGES = 500


class PdfProblem(Exception):
    pass


def inspect_pdf(content):
    """Open the PDF and return its page count, refusing scripts, attachments,
    passwords and files PDFium cannot read."""
    with LOCK:
        try:
            pdf = pdfium.PdfDocument(content)
        except pdfium.PdfiumError as error:
            if "password" in str(error).lower():
                raise PdfProblem("This PDF is password-protected. Remove the password and upload it again.")
            raise PdfProblem("This PDF could not be opened. Save it again as a PDF and upload that copy.")
        try:
            pages = len(pdf)
            if pdfium_raw.FPDFDoc_GetJavaScriptActionCount(pdf.raw) > 0 or pdf.count_attachments() > 0:
                raise PdfProblem(
                    "This PDF contains scripts or attachments. Use Print, then Save as PDF, and upload that copy."
                )
        finally:
            pdf.close()
    if pages < 1:
        raise PdfProblem("This PDF has no pages.")
    if pages > MAX_PAGES:
        raise PdfProblem(f"This PDF has {pages} pages. The most allowed is {MAX_PAGES}.")
    return pages
