"""Creating and deleting documents, tags, and the notices they send."""
import re

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from announcements.models import Notification

from .access import people_reached, supervisors_of
from .models import (
    Document,
    DocumentEvent,
    DocumentStudent,
    DocumentTag,
    DocumentVersion,
    Tag,
    version_path,
)

FILES_MODULE = "FILES"
DOCUMENT_RECORD = "STUDENT_DOCUMENT"
MAX_TAGS = 10
TAG_PATTERN = re.compile(r"^[^,#]{2,30}$")


class TagProblem(ValueError):
    pass


def clean_tags(values):
    """Trim, drop a leading #, collapse spaces and remove repeats (ignoring capitals)."""
    tags = {}
    for value in values or []:
        text = re.sub(r"\s+", " ", str(value or "").strip().lstrip("#")).strip()
        if not text:
            continue
        if not TAG_PATTERN.match(text):
            raise TagProblem("Each tag is 2 to 30 characters, without commas or #.")
        tags.setdefault(text.casefold(), text)
    if len(tags) > MAX_TAGS:
        raise TagProblem(f"A file can have at most {MAX_TAGS} tags.")
    return list(tags.values())


def tags_for(names, actor):
    found = []
    for name in names:
        tag, _ = Tag.objects.get_or_create(key=name.casefold(), defaults={"name": name, "created_by": actor})
        found.append(tag)
    return found


def record_event(document, action, actor, *, version_number=None, reason="", details=None):
    return DocumentEvent.objects.create(
        document=document,
        reference=document.reference or "",
        title=document.title,
        version_number=version_number,
        action=action,
        actor=actor,
        actor_name=getattr(actor, "full_name", "") or "",
        reason=reason,
        details=details or {},
    )


def _notify(recipients, document, *, event_key, title, summary, message):
    rows = [
        Notification(
            recipient=user,
            event_key=event_key,
            title=title[:255],
            service="Postgraduate Office",
            summary=summary[:255],
            message=message,
            is_announcement=False,
            reference=(document.reference or "")[:64],
            module_label="File Management",
            target_module=FILES_MODULE,
            record_type=DOCUMENT_RECORD,
            record_id=str(document.pk),
        )
        for user in recipients
    ]
    if rows:
        Notification.objects.bulk_create(rows, ignore_conflicts=True)


def _student_names(students):
    names = [student.user.full_name for student in students]
    if len(names) <= 2:
        return " and ".join(names)
    return f"{names[0]} and {len(names) - 1} others"


def send_upload_notices(document, students):
    uploader = document.uploaded_by
    if document.uploader_role == User.Role.STUDENT:
        if not document.share_supervisors:
            return
        ids = {lecturer for _, lecturer in supervisors_of({s.user_id for s in students})}
        recipients = User.objects.filter(pk__in=ids, is_active=True)
        _notify(
            recipients,
            document,
            event_key=f"documents:uploaded:{document.pk}",
            title=f"New file from {uploader.full_name}",
            summary=f"{document.doc_type.label}: {document.title}",
            message=f"{uploader.full_name} uploaded {document.title} ({document.doc_type.label}).",
        )
        return
    recipients = [user for user, _ in people_reached(document, students)]
    about = f" about {_student_names(students)}" if students else ""
    _notify(
        recipients,
        document,
        event_key=f"documents:shared:{document.pk}",
        title=f"{uploader.full_name} shared a file with you",
        summary=f"{document.doc_type.label}: {document.title}",
        message=f"{uploader.full_name} shared {document.title}{about}.",
    )


def create_document(*, actor, uploader_role, doc_type, checked, title, description, semester,
                    students, tags, is_staff_file, share, follows_type, audience, programmes, check_status):
    """Store the file first, then write every row in one transaction. If the
    database step fails, the stored file is removed again."""
    stored_name = default_storage.save(version_path(None, checked.original_name), ContentFile(checked.content))
    try:
        with transaction.atomic():
            document = Document.objects.create(
                doc_type=doc_type,
                title=title,
                description=description,
                semester=semester,
                uploaded_by=actor,
                uploader_role=uploader_role,
                is_staff_file=is_staff_file,
                share_supervisors=share["supervisors"],
                share_panel=share["panel"],
                share_coordinator=share["coordinator"],
                follows_type=follows_type,
                staff_audience=audience,
                staff_programmes=programmes,
                check_status=check_status,
            )
            document.reference = f"DOC-{timezone.localdate().year}-{document.pk:06d}"
            version = DocumentVersion(
                document=document,
                number=1,
                original_name=checked.original_name,
                content_type=checked.content_type,
                kind=checked.kind,
                size=checked.size,
                sha256=checked.sha256,
                page_count=checked.page_count,
                uploaded_by=actor,
            )
            version.file.name = stored_name
            version.save()
            document.current_version = version
            document.save(update_fields=["reference", "current_version"])
            DocumentStudent.objects.bulk_create(
                [DocumentStudent(document=document, student=student) for student in students]
            )
            DocumentTag.objects.bulk_create(
                [DocumentTag(document=document, tag=tag) for tag in tags_for(tags, actor)]
            )
            record_event(
                document,
                DocumentEvent.Action.UPLOADED,
                actor,
                version_number=1,
                details={"type": doc_type.code, "students": [s.matric_no for s in students]},
            )
            transaction.on_commit(lambda: send_upload_notices(document, students))
    except Exception:
        default_storage.delete(stored_name)
        raise
    return document


def delete_document(document, actor):
    with transaction.atomic():
        document = Document.objects.select_for_update().get(pk=document.pk)
        stored = list(document.versions.values_list("file", flat=True))
        students = list(document.students.select_related("user"))
        record_event(
            document,
            DocumentEvent.Action.DELETED,
            actor,
            details={
                "type": document.doc_type.label,
                "students": [{"name": s.user.full_name, "matric": s.matric_no} for s in students],
                "uploadedBy": document.uploaded_by.full_name,
                "uploadedAt": document.created_at.isoformat(),
            },
        )
        document.delete()
        transaction.on_commit(lambda: _remove_files(stored))


def _remove_files(names):
    for name in names:
        try:
            default_storage.delete(name)
        except OSError:
            pass
