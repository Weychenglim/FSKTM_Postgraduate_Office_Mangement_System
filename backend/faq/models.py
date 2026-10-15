"""The FAQ knowledge base behind the chatbot (UC28, UC29).

Students only ever see Published entries. Entries imported from the office's
FAQ PDF that came out damaged wait as Needs checking until the office fixes
them.
"""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower


class FaqCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "name"]
        verbose_name = "FAQ category"
        verbose_name_plural = "FAQ categories"

    def __str__(self):
        return self.name


class FaqEntryQuerySet(models.QuerySet):
    def published(self):
        return self.filter(status=FaqEntry.Status.PUBLISHED)


class FaqEntry(models.Model):
    class Status(models.TextChoices):
        PUBLISHED = "PUBLISHED", "Published"
        DRAFT = "DRAFT", "Draft"
        NEEDS_CHECKING = "NEEDS_CHECKING", "Needs checking"
        ARCHIVED = "ARCHIVED", "Archived"

    # A button under the answer that opens part of the portal.
    class PortalLink(models.TextChoices):
        SUPERVISOR_APPOINTMENTS = "SUPERVISOR_APPOINTMENTS", "Open Supervisor Appointments"
        PANEL_APPOINTMENTS = "PANEL_APPOINTMENTS", "Open Panel Appointments"
        LETTERS = "LETTERS", "Open Letter Generation"
        FILES = "FILES", "Open File Submission"
        ANNOUNCEMENTS = "ANNOUNCEMENTS", "Open Announcements"

    question = models.CharField(max_length=500, blank=True)
    answer = models.TextField(blank=True)
    category = models.ForeignKey(FaqCategory, on_delete=models.PROTECT, related_name="entries")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    portal_link = models.CharField(max_length=32, choices=PortalLink.choices, blank=True)
    position = models.PositiveIntegerField(default=0)
    # Where an imported entry came from, so the import never makes it twice,
    # and the PDF's own text for the office to compare while checking it.
    source_ref = models.CharField(max_length=80, unique=True, null=True, blank=True)
    source_text = models.TextField(blank=True)
    source_note = models.CharField(max_length=255, blank=True)
    source_page = models.PositiveIntegerField(null=True, blank=True)
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checked_faq_entries",
    )
    checked_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_faq_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = FaqEntryQuerySet.as_manager()

    class Meta:
        ordering = ["category__position", "position", "pk"]
        verbose_name = "FAQ entry"
        verbose_name_plural = "FAQ entries"

    def __str__(self):
        return self.question or f"FAQ entry {self.pk}"


class FaqAltQuestion(models.Model):
    """Another way students ask the same thing."""

    entry = models.ForeignKey(FaqEntry, on_delete=models.CASCADE, related_name="alt_questions")
    text = models.CharField(max_length=500)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="faq_alt_questions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "pk"]
        constraints = [
            models.UniqueConstraint(Lower("text"), "entry", name="unique_faq_alt_question_per_entry")
        ]

    def __str__(self):
        return self.text


class FaqChange(models.Model):
    """The history of the knowledge base. Rows are never changed or deleted,
    and keep the question as text after an entry is deleted."""

    class Action(models.TextChoices):
        IMPORTED = "IMPORTED", "Imported from the FAQ PDF"
        CREATED = "CREATED", "Created"
        EDITED = "EDITED", "Edited"
        PUBLISHED = "PUBLISHED", "Published"
        CHECKED = "CHECKED", "Marked as checked"
        ARCHIVED = "ARCHIVED", "Archived"
        RESTORED = "RESTORED", "Restored as a draft"
        DELETED = "DELETED", "Deleted"

    entry = models.ForeignKey(FaqEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name="changes")
    question = models.CharField(max_length=500, blank=True)
    action = models.CharField(max_length=16, choices=Action.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="faq_changes",
    )
    actor_name = models.CharField(max_length=255, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-pk"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("FAQ history cannot be changed.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("FAQ history cannot be deleted.")
