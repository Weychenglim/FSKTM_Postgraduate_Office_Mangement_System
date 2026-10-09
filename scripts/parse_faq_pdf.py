"""Extract the FSKTM postgraduate FAQ from PDF into a reviewable JSON dataset.

One-off tooling, not part of the runnable application. The committed output
(docs/faq/faq-entries.json) is the artefact that matters; this script exists so
the extraction can be reproduced when the office issues a new FAQ document.

Every row that looks suspicious is marked `needs_review` with a reason. The
loader (backend/faq/management/commands/load_faq.py) refuses any dataset that
still carries a flag, so the review in docs/superpowers/plans is enforced rather
than merely requested.

Usage:
    python scripts/parse_faq_pdf.py "path/to/FAQ.pdf" docs/faq/faq-entries.json

Requires pdfplumber (see scripts/requirements-dev.txt).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import date
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

HEADER_CELL = re.compile(r"^\s*no\.?\s*$", re.I)
CATEGORY_FIXES = {
    "STUDENT APPLCATION": "STUDENT APPLICATION",
    "RP- DISSERTATION - THESIS": "RP - DISSERTATION - THESIS",
}
# Section tabs are printed in the page header band. Upper-case runs further down
# the page are content (e.g. the hyperlink label "APPLICATION FOR EXEMPTION FROM
# THE BAHASA MALAYSIA LANGUAGE REQUIREMENT" inside a page-5 answer), not headings.
HEADING_MAX_TOP = 80
MIN_ANSWER_CHARS = 15
CLOSED_ANSWER = re.compile(r"^(yes|no)\.?$", re.I)
OPEN_QUESTION = re.compile(r"^\s*(where|when|how|what|which|who|why)\b", re.I)


URL_RE = re.compile(r"https?://\S+")


def clean(value: str | None) -> str:
    if not value:
        return ""
    text = unicodedata.normalize("NFKC", value)
    text = text.replace("­", "").replace("\r", "\n")
    text = re.sub(r"[ \t]*\n[ \t]*", " ", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    # A URL wrapped after a hyphen in the PDF gains a space when the line break
    # is collapsed, which silently breaks the link.
    return re.sub(r"(https?://\S*?-)\s+(?=\S)", r"\1", text)


def looks_garbled(text: str) -> bool:
    """Detect column bleed, where two cells' characters interleave.

    pdfplumber zips overlapping cells together, producing strings like
    "hWahnadtb ioso tkh?e minimum total number of subjects". A single
    lower-to-upper transition inside a word is already abnormal for this
    document, so one is enough — but "PhD" is legitimate and appears often, and
    acronyms and URLs must not count towards the vowel-free test.
    """
    if not text:
        return False
    probe = URL_RE.sub(" ", text)
    if len(re.findall(r"[a-z][A-Z]", probe.replace("PhD", "phd"))) >= 1:
        return True
    words = [
        w
        for w in re.findall(r"[A-Za-z]{4,}", probe)
        if not w.isupper()
    ]
    if not words:
        return False
    return sum(1 for w in words if not re.search(r"[aeiouAEIOU]", w)) >= 3


def heading_positions(page) -> list[tuple[float, str]]:
    """Return (top, text) for each section heading printed in the page header."""
    found = []
    for line in page.extract_text_lines():
        text = line["text"].strip()
        if len(text) < 3 or text.upper().startswith("NO."):
            continue
        if line["top"] > HEADING_MAX_TOP:
            continue
        letters = [c for c in text if c.isalpha()]
        if letters and all(c.isupper() for c in letters):
            found.append((line["top"], text))
    return sorted(found)


def raw_page_text(pdf_path: Path) -> dict[int, str]:
    """Per-page text from pypdf, used to recover rows pdfplumber mangles.

    Where a question overflows its column the two columns physically overlap;
    pdfplumber interleaves their characters while pypdf concatenates them
    readably. That makes pypdf the reference for "what should this row contain".
    """
    reader = PdfReader(str(pdf_path))
    return {
        index: " ".join((page.extract_text() or "").split())
        for index, page in enumerate(reader.pages, start=1)
    }


def slice_raw_rows(page_text: str, numbers: list[int]) -> dict[int, str]:
    """Split a page's raw text into row bodies, keyed by source number.

    Row starts are located in sequence rather than by a global regex, so digits
    inside prose ("8 semesters") cannot be mistaken for a row marker. pypdf
    sometimes glues the previous row's tail to the next number
    ("tina_su@um.edu.my16 If I have..."), hence the lookbehind on a non-digit.
    """
    positions: list[tuple[int, int]] = []
    cursor = 0
    for number in numbers:
        match = re.compile(rf"(?<!\d){number}\s+(?=[A-Za-z(])").search(page_text, cursor)
        if not match:
            continue
        positions.append((number, match.start()))
        cursor = match.end()

    bodies: dict[int, str] = {}
    for index, (number, start) in enumerate(positions):
        end = positions[index + 1][1] if index + 1 < len(positions) else len(page_text)
        bodies[number] = page_text[start:end].strip()
    return bodies


def squash(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def extract_rows(pdf) -> list[dict]:
    rows: list[dict] = []
    current_category: str | None = None
    current_sheet = "CATEGORIZED"

    for index, page in enumerate(pdf.pages, start=1):
        headings = heading_positions(page)
        if headings and current_category is None:
            current_category = headings[0][1]

        for table in page.find_tables():
            cells = table.extract()
            for raw, row in zip(cells, table.rows):
                if not raw or len(raw) < 3:
                    continue
                number_cell = clean(raw[0])
                question = clean(raw[1])
                answer = clean(raw[2])

                if HEADER_CELL.match(number_cell):
                    continue
                if not number_cell and not question and not answer:
                    continue

                row_top = row.bbox[1]
                for top, text in headings:
                    if top <= row_top:
                        current_category = text
                # Derived per row rather than latched, so a future document that
                # places the ALL sheet first is still labelled correctly.
                current_sheet = (
                    "ALL"
                    if current_category and current_category.strip().upper() == "ALL"
                    else "CATEGORIZED"
                )

                if not number_cell.isdigit():
                    # A wrapped tail can land in column 0 with the other cells
                    # empty. Treat it as a continuation instead of discarding it.
                    if rows:
                        tail = " ".join(part for part in (number_cell, question, answer) if part)
                        if tail:
                            rows[-1]["answer"] = f"{rows[-1]['answer']} {tail}".strip()
                            flag(rows[-1], "wrapped tail recovered from column 0 — split manually")
                    continue

                source_category = current_category or "UNCATEGORISED"
                rows.append(
                    {
                        "sheet": current_sheet,
                        "source_category": source_category,
                        "category": CATEGORY_FIXES.get(
                            source_category.upper(), source_category
                        ),
                        "source_page": index,
                        "source_number": int(number_cell),
                        "question": question,
                        "answer": answer,
                        "needs_review": False,
                        "review_note": "",
                    }
                )
    return rows


def flag(entry: dict, note: str) -> None:
    entry["needs_review"] = True
    existing = entry["review_note"]
    entry["review_note"] = f"{existing}; {note}" if existing else note


def apply_flags(entries: list[dict], raw_rows: dict[tuple[int, int], str]) -> None:
    question_counts = Counter(
        (e["sheet"], e["question"].casefold()) for e in entries if e["question"]
    )

    for entry in entries:
        question, answer = entry["question"], entry["answer"]

        if not question:
            flag(entry, "empty question")
        if not answer:
            flag(entry, "empty answer")
        if looks_garbled(question):
            flag(entry, "question text appears garbled (column bleed)")
        if looks_garbled(answer):
            flag(entry, "answer text appears garbled (column bleed)")
        if question_counts.get((entry["sheet"], question.casefold()), 0) > 1:
            flag(entry, "question duplicated within the same sheet")
        if OPEN_QUESTION.match(question) and CLOSED_ANSWER.match(answer):
            flag(entry, "open question answered yes/no")
        if re.search(r"https?://\S+\s\S", question + " " + answer):
            if re.search(r"https?://\S*-\s", question + " " + answer):
                flag(entry, "URL appears split by a line break")

        # Reconcile against pypdf: the extracted cells should account for
        # essentially all of the row's raw characters. A shortfall means
        # pdfplumber clipped text at a column boundary.
        raw = raw_rows.get((entry["source_page"], entry["source_number"]), "")
        if raw:
            entry["source_text"] = raw
            captured = len(squash(question) + squash(answer))
            available = len(squash(raw)) - len(str(entry["source_number"]))
            if available > 0 and captured < available * 0.97:
                lost = available - captured
                flag(entry, f"about {lost} characters missing versus the PDF row")

    # The page-1 defect (rows 10 and 11 carrying row 4's answer) is a fragment,
    # not an exact copy, so equality alone cannot see it. Containment must stay
    # unanchored: row 10's fragment sits in the middle of row 4's answer, so a
    # prefix/suffix test misses it. This costs a couple of false positives on
    # reused boilerplate, which is the right trade — an unflagged bad answer
    # reaches the chatbot, whereas a false positive costs a reviewer seconds.
    for entry in entries:
        answer = entry["answer"].casefold().strip()
        if len(answer) < 12:
            continue
        for other in entries:
            if other is entry or other["sheet"] != entry["sheet"]:
                continue
            longer = other["answer"].casefold().strip()
            if len(longer) >= len(answer) * 1.3 and answer in longer:
                flag(
                    entry,
                    f"answer appears to be a fragment of "
                    f"{other['category']} #{other['source_number']}",
                )
                break

    # Cross-sheet: the same question answered more briefly on one sheet means
    # that copy lost text.
    by_question: dict[str, list[dict]] = {}
    for entry in entries:
        if entry["question"]:
            by_question.setdefault(entry["question"].casefold(), []).append(entry)
    for group in by_question.values():
        if len(group) < 2:
            continue
        longest = max(group, key=lambda e: len(e["answer"]))
        for entry in group:
            if entry is longest:
                continue
            if len(entry["answer"]) < len(longest["answer"]) * 0.95:
                flag(
                    entry,
                    f"answer shorter than the same question on the "
                    f"{longest['sheet']} sheet",
                )


def section_gaps(entries: list[dict]) -> list[str]:
    """Report source numbers absent from each section (verified real gaps)."""
    seen: dict[tuple[str, str], set[int]] = {}
    for entry in entries:
        seen.setdefault((entry["sheet"], entry["category"]), set()).add(
            entry["source_number"]
        )
    notes = []
    for (sheet, category), numbers in sorted(seen.items()):
        missing = sorted(set(range(1, max(numbers) + 1)) - numbers)
        if missing:
            notes.append(f"{category} ({sheet}) is missing source numbers {missing}")
    return notes


def cross_sheet_report(entries: list[dict]) -> dict:
    categorised = {
        e["question"].casefold()
        for e in entries
        if e["sheet"] == "CATEGORIZED" and e["question"]
    }
    all_sheet = {
        e["question"].casefold()
        for e in entries
        if e["sheet"] == "ALL" and e["question"]
    }
    return {
        "categorized_count": sum(1 for e in entries if e["sheet"] == "CATEGORIZED"),
        "all_sheet_count": sum(1 for e in entries if e["sheet"] == "ALL"),
        "shared_questions": len(categorised & all_sheet),
        "only_in_all_sheet": sorted(all_sheet - categorised)[:40],
        "only_in_all_sheet_total": len(all_sheet - categorised),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    if not args.pdf.exists():
        print(f"error: {args.pdf} not found", file=sys.stderr)
        return 1

    with pdfplumber.open(args.pdf) as pdf:
        entries = extract_rows(pdf)

    pages = raw_page_text(args.pdf)
    numbers_by_page: dict[int, list[int]] = {}
    for entry in entries:
        numbers_by_page.setdefault(entry["source_page"], []).append(
            entry["source_number"]
        )
    raw_rows: dict[tuple[int, int], str] = {}
    for page_number, numbers in numbers_by_page.items():
        for number, body in slice_raw_rows(pages.get(page_number, ""), numbers).items():
            raw_rows[(page_number, number)] = body

    apply_flags(entries, raw_rows)

    for position, entry in enumerate(entries, start=1):
        slug = re.sub(r"[^a-z0-9]+", "-", entry["category"].lower()).strip("-")
        entry["id"] = f"{slug}-{entry['sheet'].lower()}-{entry['source_number']}"
        entry["position"] = position

    payload = {
        "source": args.pdf.name,
        "extracted_on": date.today().isoformat(),
        "extractor": "scripts/parse_faq_pdf.py",
        "stats": {
            "total_rows": len(entries),
            "needs_review": sum(1 for e in entries if e["needs_review"]),
            "categories": sorted({e["category"] for e in entries}),
            "section_gaps": section_gaps(entries),
            "cross_sheet": cross_sheet_report(entries),
        },
        "entries": entries,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    stats = payload["stats"]
    print(f"wrote {args.output}")
    print(f"  rows          : {stats['total_rows']}")
    print(f"  needs review  : {stats['needs_review']}")
    print(f"  categories    : {len(stats['categories'])}")
    for name in stats["categories"]:
        count = sum(1 for e in entries if e["category"] == name)
        print(f"      {name} ({count})")
    cross = stats["cross_sheet"]
    print(f"  categorized   : {cross['categorized_count']}")
    print(f"  ALL sheet     : {cross['all_sheet_count']}")
    print(f"  shared        : {cross['shared_questions']}")
    print(f"  only in ALL   : {cross['only_in_all_sheet_total']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
