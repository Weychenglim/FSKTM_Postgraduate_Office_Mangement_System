"""Authorization and attachment-validation coverage for the announcements API.

Each test corresponds to a gap recorded as deferred in PROJECT_STATUS.md:
cross-sender modification, draft visibility, and attachment validation.
"""

import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Announcement, Notification

User = get_user_model()

PDF = b"%PDF-1.4\n%fake pdf body for tests\n"


def pdf_file(name="notice.pdf", body=PDF):
    return SimpleUploadedFile(name, body, content_type="application/pdf")


# Attachment tests write real files; keep them out of backend/media/.
@override_settings(MEDIA_ROOT=tempfile.mkdtemp(prefix="fsktm-test-media-"))
class AnnouncementSecurityTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            email="admin@example.test",
            password="pw-admin-1234",
            full_name="Office Admin",
            role=User.Role.OFFICE_ADMIN,
        )
        cls.lecturer = User.objects.create_user(
            email="lecturer@example.test",
            password="pw-lect-1234",
            full_name="Lecturer One",
            role=User.Role.LECTURER,
        )
        cls.other_lecturer = User.objects.create_user(
            email="lecturer2@example.test",
            password="pw-lect2-1234",
            full_name="Lecturer Two",
            role=User.Role.LECTURER,
        )
        cls.student = User.objects.create_user(
            email="student@example.test",
            password="pw-stud-1234",
            full_name="Student One",
            role=User.Role.STUDENT,
        )

    def draft_by(self, author, **kwargs):
        return Announcement.objects.create(
            title=kwargs.pop("title", "Unpublished draft"),
            content="Draft body",
            status=Announcement.Status.DRAFT,
            target=Announcement.Audience.ALL,
            created_by=author,
            created_by_name=author.full_name,
            **kwargs,
        )

    def published_by(self, author, **kwargs):
        return Announcement.objects.create(
            title=kwargs.pop("title", "Published notice"),
            content="Published body",
            status=Announcement.Status.ACTIVE,
            target=Announcement.Audience.ALL,
            created_by=author,
            created_by_name=author.full_name,
            **kwargs,
        )

    # ── Cross-sender modification ────────────────────────────────────────────

    def test_sender_cannot_edit_another_senders_announcement(self):
        announcement = self.published_by(self.lecturer)
        self.client.force_authenticate(self.other_lecturer)
        response = self.client.patch(
            f"/api/announcements/{announcement.pk}/", {"title": "Hijacked"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        announcement.refresh_from_db()
        self.assertEqual(announcement.title, "Published notice")

    def test_sender_cannot_delete_another_senders_announcement(self):
        announcement = self.published_by(self.lecturer)
        self.client.force_authenticate(self.other_lecturer)
        response = self.client.delete(f"/api/announcements/{announcement.pk}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Announcement.objects.filter(pk=announcement.pk).exists())

    def test_author_can_edit_own_announcement(self):
        announcement = self.published_by(self.lecturer)
        self.client.force_authenticate(self.lecturer)
        response = self.client.patch(
            f"/api/announcements/{announcement.pk}/", {"title": "Corrected"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        announcement.refresh_from_db()
        self.assertEqual(announcement.title, "Corrected")

    def test_office_admin_may_moderate_any_announcement(self):
        announcement = self.published_by(self.lecturer)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/announcements/{announcement.pk}/", {"title": "Moderated"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ── Draft visibility ─────────────────────────────────────────────────────

    def test_sender_does_not_see_another_senders_draft_in_list(self):
        self.draft_by(self.lecturer, title="Secret draft")
        self.client.force_authenticate(self.other_lecturer)
        response = self.client.get("/api/announcements/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("Secret draft", [a["title"] for a in response.data])

    def test_sender_sees_own_draft_in_list(self):
        self.draft_by(self.lecturer, title="My draft")
        self.client.force_authenticate(self.lecturer)
        response = self.client.get("/api/announcements/")
        self.assertIn("My draft", [a["title"] for a in response.data])

    def test_sender_cannot_retrieve_another_senders_draft(self):
        draft = self.draft_by(self.lecturer)
        self.client.force_authenticate(self.other_lecturer)
        response = self.client.get(f"/api/announcements/{draft.pk}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_retrieve_targeted_draft(self):
        """A draft addressed to everyone must stay invisible until published."""
        draft = self.draft_by(self.lecturer)
        self.client.force_authenticate(self.student)
        response = self.client.get(f"/api/announcements/{draft.pk}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_download_draft_attachment(self):
        draft = self.draft_by(self.lecturer, attachment=pdf_file())
        self.client.force_authenticate(self.student)
        response = self.client.get(f"/api/announcements/{draft.pk}/attachment/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_can_download_published_attachment(self):
        announcement = self.published_by(self.lecturer, attachment=pdf_file())
        self.client.force_authenticate(self.student)
        response = self.client.get(f"/api/announcements/{announcement.pk}/attachment/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ── Attachment validation ────────────────────────────────────────────────

    def post_attachment(self, upload):
        return self.client.post(
            "/api/announcements/",
            {
                "title": "With attachment",
                "content": "Body",
                "target": Announcement.Audience.ALL,
                "attachment": upload,
            },
            format="multipart",
        )

    def test_executable_attachment_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.post_attachment(
            SimpleUploadedFile("payload.exe", b"MZ\x90\x00binary", content_type="application/octet-stream")
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Announcement.objects.count(), 0)

    def test_double_extension_attachment_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.post_attachment(
            SimpleUploadedFile("invoice.exe.pdf", PDF, content_type="application/pdf")
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_content_not_matching_extension_is_rejected(self):
        """A renamed executable must not pass merely because it ends in .pdf."""
        self.client.force_authenticate(self.admin)
        response = self.post_attachment(
            SimpleUploadedFile("notice.pdf", b"MZ\x90\x00this is really a binary", content_type="application/pdf")
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_attachment_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.post_attachment(
            SimpleUploadedFile("empty.pdf", b"", content_type="application/pdf")
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(ANNOUNCEMENT_MAX_ATTACHMENT_BYTES=1024)
    def test_oversized_attachment_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.post_attachment(
            SimpleUploadedFile("big.pdf", PDF + b"x" * 4096, content_type="application/pdf")
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_valid_pdf_attachment_is_accepted(self):
        self.client.force_authenticate(self.admin)
        response = self.post_attachment(pdf_file())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Announcement.objects.count(), 1)

    def test_attachment_validated_on_update_too(self):
        announcement = self.published_by(self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/announcements/{announcement.pk}/",
            {"attachment": SimpleUploadedFile("bad.exe", b"MZ\x90\x00", content_type="application/octet-stream")},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        announcement.refresh_from_db()
        self.assertFalse(announcement.attachment)

    # ── Recipient-side isolation ─────────────────────────────────────────────

    def test_student_cannot_publish(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/announcements/", {"title": "Nope", "content": "x"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_access_is_denied(self):
        response = self.client.get("/api/announcements/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Fan-out integrity ────────────────────────────────────────────────────

    def test_republishing_does_not_duplicate_notifications(self):
        """Toggling Draft/Active must not deliver the same announcement twice."""
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/announcements/",
            {"title": "Once", "content": "Body", "target": Announcement.Audience.ALL},
        )
        pk = created.data["id"]
        first = Notification.objects.filter(announcement_id=pk).count()
        self.assertGreater(first, 0)

        for _ in range(3):
            self.client.patch(
                f"/api/announcements/{pk}/", {"status": Announcement.Status.DRAFT}
            )
            self.client.patch(
                f"/api/announcements/{pk}/", {"status": Announcement.Status.ACTIVE}
            )

        self.assertEqual(Notification.objects.filter(announcement_id=pk).count(), first)

    def test_retracting_removes_delivered_notifications(self):
        """Unpublishing must not leave the body readable in recipients' feeds."""
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/announcements/",
            {
                "title": "Sent in error",
                "content": "Confidential body",
                "target": Announcement.Audience.ALL,
            },
        )
        pk = created.data["id"]
        self.assertTrue(Notification.objects.filter(announcement_id=pk).exists())

        self.client.patch(
            f"/api/announcements/{pk}/", {"status": Announcement.Status.DRAFT}
        )

        self.client.force_authenticate(self.student)
        feed = self.client.get("/api/notifications/")
        bodies = [n["detailedMessage"] for n in feed.data]
        self.assertNotIn("Confidential body", bodies)

    def test_retargeting_moves_delivery_to_the_new_audience(self):
        """The old audience must lose the row; the new audience must gain it."""
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/announcements/",
            {
                "title": "Internal memo",
                "content": "Original wording",
                "target": Announcement.Audience.STUDENTS,
            },
        )
        pk = created.data["id"]
        self.assertTrue(
            Notification.objects.filter(announcement_id=pk, recipient=self.student).exists()
        )

        self.client.patch(
            f"/api/announcements/{pk}/",
            {"target": Announcement.Audience.LECTURERS, "content": "STAFF ONLY v2"},
        )

        self.assertFalse(
            Notification.objects.filter(announcement_id=pk, recipient=self.student).exists(),
            msg="the previous audience still holds a copy of the retargeted content",
        )
        self.assertTrue(
            Notification.objects.filter(announcement_id=pk, recipient=self.lecturer).exists(),
            msg="the new audience was never delivered to",
        )

    def test_expiring_keeps_delivered_notifications(self):
        """Expiry ends an announcement's life; it is not a retraction."""
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/announcements/",
            {"title": "Old news", "content": "Body", "target": Announcement.Audience.ALL},
        )
        pk = created.data["id"]
        before = Notification.objects.filter(announcement_id=pk).count()
        self.assertGreater(before, 0)

        self.client.patch(
            f"/api/announcements/{pk}/", {"status": Announcement.Status.EXPIRED}
        )
        self.assertEqual(Notification.objects.filter(announcement_id=pk).count(), before)

    def test_editing_text_without_retargeting_resyncs_in_place(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/announcements/",
            {"title": "Typo", "content": "Wrong date", "target": Announcement.Audience.ALL},
        )
        pk = created.data["id"]
        self.client.patch(
            f"/api/announcements/{pk}/", {"content": "CORRECTED: moved to Friday"}
        )
        messages = Notification.objects.filter(announcement_id=pk).values_list(
            "message", flat=True
        )
        self.assertTrue(all(m == "CORRECTED: moved to Friday" for m in messages))

    def test_cannot_publish_empty_content_via_patch(self):
        """The publish guard must apply to updates, not only to creation."""
        self.client.force_authenticate(self.admin)
        draft = Announcement.objects.create(
            title="Empty draft",
            content="",
            status=Announcement.Status.DRAFT,
            target=Announcement.Audience.ALL,
            created_by=self.admin,
            created_by_name=self.admin.full_name,
        )
        response = self.client.patch(
            f"/api/announcements/{draft.pk}/", {"status": Announcement.Status.ACTIVE}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Notification.objects.filter(announcement=draft).count(), 0)

    def test_is_staff_alone_does_not_grant_sender_rights(self):
        """Sender rights follow the role, not the Django admin-access flag."""
        flagged = User.objects.create_user(
            email="flagged@example.test",
            password="pw-flag-9912",
            full_name="Flagged Student",
            role=User.Role.STUDENT,
        )
        flagged.is_staff = True
        flagged.save(update_fields=["is_staff"])

        self.client.force_authenticate(flagged)
        response = self.client.post(
            "/api/announcements/", {"title": "Nope", "content": "x"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── Notification endpoint isolation ──────────────────────────────────────

    def publish_via_api(self, author, title="Broadcast"):
        """Publish through the API so the notification fan-out actually runs."""
        self.client.force_authenticate(author)
        return self.client.post(
            "/api/announcements/",
            {"title": title, "content": "Body", "target": Announcement.Audience.ALL},
        )

    def test_cannot_mark_another_users_notification_read(self):
        self.publish_via_api(self.admin)
        target = Notification.objects.filter(recipient=self.student).first()
        self.client.force_authenticate(self.lecturer)
        response = self.client.post(f"/api/notifications/{target.pk}/read/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        target.refresh_from_db()
        self.assertFalse(target.is_read)

    def test_feed_contains_only_own_notifications(self):
        self.publish_via_api(self.admin)
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/notifications/")
        self.assertTrue(all(n["recipient"] == self.student.full_name for n in response.data))
