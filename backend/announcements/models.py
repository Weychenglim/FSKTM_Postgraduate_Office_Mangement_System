"""Announcement + Notification models for the FSKTM PG Office system.

Flow (UC45 publish + UC42/UC49 deliver):

1. A sender (Office Staff/Admin, Programme Coordinator, or Lecturer) creates an
   :class:`Announcement` choosing a target audience, priority, and an optional
   file attachment.
2. When the announcement is published (``status = Active``) the system *fans
   out* one :class:`Notification` per targeted user, so every recipient sees it
   in their personal in-app feed and can download the attachment.

The ``to_public_dict`` methods shape each row exactly the way the React
frontend's ``AnnouncementItem`` / ``NotificationItem`` types expect.
"""
import os

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.timezone import localtime


class Announcement(models.Model):
    """A broadcast authored by office staff / coordinators / lecturers."""

    class Audience(models.TextChoices):
        ALL = "All", "Everyone"
        STUDENTS = "All Students", "All Students"
        LECTURERS = "Lecturers", "Lecturers"
        STAFF = "Staff", "Staff"
        COORDINATORS = "Coordinators", "Coordinators"

    class Priority(models.TextChoices):
        URGENT = "Urgent", "Urgent"
        INFO = "Info", "Info"
        GENERAL = "General", "General"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        DRAFT = "Draft", "Draft"
        SCHEDULED = "Scheduled", "Scheduled"
        EXPIRED = "Expired", "Expired"

    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, default="")
    target = models.CharField(
        max_length=32, choices=Audience.choices, default=Audience.ALL
    )
    priority = models.CharField(
        max_length=16, choices=Priority.choices, default=Priority.INFO
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.ACTIVE
    )
    # Optional file recipients can download (PDF, DOCX, etc.).
    attachment = models.FileField(
        upload_to="announcements/%Y/%m/", blank=True, null=True
    )
    # Author. Kept nullable so deleting a staff account does not erase history.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="announcements",
    )
    created_by_name = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> {self.target} ({self.status})"

    @property
    def summary(self):
        """Short, table-friendly preview of the body."""
        text = " ".join(self.content.split())
        return text if len(text) <= 90 else f"{text[:90]}..."

    @property
    def attachment_name(self):
        return os.path.basename(self.attachment.name) if self.attachment else None

    def to_public_dict(self):
        """Shape this row the way the frontend ``AnnouncementItem`` expects."""
        attachment_url = (
            f"/api/announcements/{self.pk}/attachment/" if self.attachment else None
        )
        return {
            "id": str(self.pk),
            "title": self.title,
            "summary": self.summary,
            "content": self.content,
            "target": self.target,
            "priority": self.priority,
            "status": self.status,
            "dateCreated": localtime(self.created_at).strftime("%d %b %Y"),
            "createdBy": self.created_by_name or "Postgraduate Office",
            "attachmentName": self.attachment_name,
            "attachmentUrl": attachment_url,
        }


class Notification(models.Model):
    """A per-recipient in-app notification (the bell feed, UC49)."""

    class Priority(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        NORMAL = "normal", "Normal"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    # Shown as the "From" / service label in the UI.
    service = models.CharField(max_length=128, default="Postgraduate Office")
    summary = models.CharField(max_length=255, blank=True, default="")
    message = models.TextField(blank=True, default="")
    priority = models.CharField(
        max_length=16, choices=Priority.choices, default=Priority.NORMAL
    )
    is_read = models.BooleanField(default=False)
    is_announcement = models.BooleanField(default=True)
    reference = models.CharField(max_length=64, blank=True, default="")
    module_label = models.CharField(max_length=128, blank=True, default="Announcement")
    target_module = models.CharField(max_length=64, blank=True, default="")
    record_type = models.CharField(max_length=64, blank=True, default="")
    record_id = models.CharField(max_length=64, blank=True, default="")
    event_key = models.CharField(max_length=160, blank=True, default="", db_index=True)
    # Source announcement, so the recipient can open the full content + file.
    announcement = models.ForeignKey(
        Announcement,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read"])]
        constraints = [
            models.UniqueConstraint(
                fields=["recipient", "event_key"],
                condition=~Q(event_key=""),
                name="unique_workflow_notification_per_recipient_event",
            )
        ]

    def __str__(self):
        return f"{self.title} -> {self.recipient_id} ({'read' if self.is_read else 'unread'})"

    def to_public_dict(self):
        """Shape this row the way the frontend ``NotificationItem`` expects."""
        attachment_name = (
            self.announcement.attachment_name if self.announcement else None
        )
        return {
            "id": str(self.pk),
            "title": self.title,
            "service": self.service,
            "description": self.summary or " ".join(self.message.split())[:90],
            "detailedMessage": self.message,
            "timeAgo": localtime(self.created_at).strftime("%d %b %Y — %I:%M %p"),
            "priority": self.priority,
            "isUnread": not self.is_read,
            "isAnnouncement": self.is_announcement,
            "reference": self.reference,
            "recipient": getattr(self.recipient, "full_name", "") or self.recipient.email,
            "moduleLabel": self.module_label,
            "targetModule": self.target_module,
            "recordType": self.record_type,
            "recordId": self.record_id,
            "announcementId": str(self.announcement_id) if self.announcement_id else None,
            "attachmentName": attachment_name,
        }
