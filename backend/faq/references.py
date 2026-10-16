"""The office's reference documents for the chatbot (UC29): upload, replace,
rename, archive and restore. Files go through the same safety checks as
File Management uploads, PDF and Word only."""
from types import SimpleNamespace

from django.core.files.base import ContentFile
from django.db import transaction

from documents.validation import UploadRejected, check_upload, megabytes, title_from_name

from .entries import FaqRefused
from .models import FaqChange, FaqDocument, FaqPassage
from .reading import read_passages

Action = FaqChange.Action
REFERENCE_DOCUMENT = SimpleNamespace(allowed_kinds=["PDF", "DOCX"], label="A reference document")


def file_size(size):
    return f"{max(1, round(size / 1024))} KB" if size < 1024 * 1024 else megabytes(size)


def document_dict(document, passage_count=None):
    count = passage_count if passage_count is not None else document.passages.count()
    return {
        "id": str(document.pk),
        "title": document.title,
        "fileName": document.original_name,
        "kind": document.kind,
        "size": file_size(document.size),
        "pages": document.page_count,
        "status": document.status,
        "passages": count,
        "archived": document.archived,
        "uploadedBy": document.uploaded_by_name,
        "uploadedAt": document.uploaded_at.isoformat(),
    }


def record(document, actor, action, details=None):
    return FaqChange.objects.create(
        document=document,
        question=document.title,
        action=action,
        actor=actor,
        actor_name=actor.full_name if actor else "",
        details=details or {},
    )


def _checked(upload):
    try:
        return check_upload(upload, doc_type=REFERENCE_DOCUMENT, staff=True)
    except UploadRejected as problem:
        raise FaqRefused({"file": str(problem)})


def _store(document, checked):
    page_count, found = read_passages(checked.content, checked.kind)
    document.original_name = checked.original_name
    document.kind = checked.kind
    document.content_type = checked.content_type
    document.size = checked.size
    document.page_count = page_count
    document.status = FaqDocument.Status.READY if found else FaqDocument.Status.NO_TEXT
    document.file.save(checked.original_name, ContentFile(checked.content), save=False)
    document.save()
    document.passages.all().delete()
    FaqPassage.objects.bulk_create(
        FaqPassage(document=document, position=position, page=page, text=text)
        for position, (page, text) in enumerate(found, start=1)
    )
    return len(found)


@transaction.atomic
def add_document(*, actor, upload, title=""):
    checked = _checked(upload)
    document = FaqDocument(
        title=(title or "").strip()[:200] or title_from_name(checked.original_name),
        uploaded_by=actor,
        uploaded_by_name=actor.full_name if actor else "",
    )
    count = _store(document, checked)
    record(document, actor, Action.DOCUMENT_ADDED, {"file": checked.original_name, "passages": count})
    return document


def _locked(document_id):
    document = FaqDocument.objects.select_for_update().filter(pk=document_id).first() if str(document_id).isdigit() else None
    if document is None:
        raise FaqRefused({"error": "No such document."}, status=404)
    return document


@transaction.atomic
def replace_document(*, actor, document_id, upload):
    document = _locked(document_id)
    checked = _checked(upload)
    old_file = document.file.name
    count = _store(document, checked)
    storage = document.file.storage
    transaction.on_commit(lambda: storage.delete(old_file) if old_file and storage.exists(old_file) else None)
    record(document, actor, Action.DOCUMENT_REPLACED, {"file": checked.original_name, "passages": count})
    return document


@transaction.atomic
def rename_document(*, actor, document_id, title):
    document = _locked(document_id)
    title = (title or "").strip()[:200]
    if not title:
        raise FaqRefused({"title": "Give the document a title."})
    if title != document.title:
        old = document.title
        document.title = title
        document.save(update_fields=["title", "updated_at"])
        record(document, actor, Action.DOCUMENT_RENAMED, {"from": old})
    return document


@transaction.atomic
def set_archived(*, actor, document_id, archived):
    document = _locked(document_id)
    if document.archived != archived:
        document.archived = archived
        document.save(update_fields=["archived", "updated_at"])
        record(document, actor, Action.DOCUMENT_ARCHIVED if archived else Action.DOCUMENT_RESTORED)
    return document
