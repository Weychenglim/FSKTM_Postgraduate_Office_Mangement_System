"""Smoke tests for the announcement fan-out + notification feed."""
from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Announcement, Notification
from .views import _fan_out

User = get_user_model()


class FanOutTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            email="stud@fsktm.edu.my", password="x", full_name="Stud", role=User.Role.STUDENT
        )
        self.lecturer = User.objects.create_user(
            email="lect@fsktm.edu.my", password="x", full_name="Lect", role=User.Role.LECTURER
        )

    def test_student_audience_only_reaches_students(self):
        announcement = Announcement.objects.create(
            title="Exam schedule", content="See portal", target=Announcement.Audience.STUDENTS
        )
        delivered = _fan_out(announcement)
        self.assertEqual(delivered, 1)
        self.assertTrue(
            Notification.objects.filter(recipient=self.student, announcement=announcement).exists()
        )
        self.assertFalse(
            Notification.objects.filter(recipient=self.lecturer, announcement=announcement).exists()
        )

    def test_all_audience_reaches_everyone(self):
        announcement = Announcement.objects.create(
            title="Maintenance", content="Downtime", target=Announcement.Audience.ALL
        )
        self.assertEqual(_fan_out(announcement), 2)


class AnnouncementPreferencesTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.student = User.objects.create_user(email='prefs@example.test', password='x', full_name='Preferences Student')
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def test_opt_out_only_suppresses_future_nonurgent_notifications(self):
        earlier = Announcement.objects.create(title='Earlier', content='Earlier update')
        self.assertEqual(_fan_out(earlier), 1)
        Notification.objects.create(recipient=self.student, title='Workflow', service='Workflow', message='Action required')
        response = self.client.patch('/api/auth/settings/', {'preferences': {'announcementAlerts': False}}, format='json')
        self.assertEqual(response.status_code, 200)
        routine = Announcement.objects.create(title='Routine', content='Routine update')
        self.assertEqual(_fan_out(routine), 0)
        urgent = Announcement.objects.create(title='Urgent', content='Urgent update', priority=Announcement.Priority.URGENT)
        self.assertEqual(_fan_out(urgent), 1)
        self.assertEqual(Notification.objects.filter(recipient=self.student).count(), 3)
        self.assertEqual(len(self.client.get('/api/notifications/').data), 3)
        self.assertEqual(len(self.client.get('/api/announcements/').data), 3)
        self.assertEqual(self.client.get(f'/api/announcements/{routine.pk}/').status_code, 200)
        self.client.patch('/api/auth/settings/', {'preferences': {'announcementAlerts': True}}, format='json')
        later = Announcement.objects.create(title='Later', content='Later update')
        self.assertEqual(_fan_out(later), 1)
        self.assertFalse(Notification.objects.filter(recipient=self.student, announcement=routine).exists())

    def test_opt_out_retains_authorized_attachment_access(self):
        import tempfile
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test import override_settings
        self.student.announcement_alerts = False
        self.student.save(update_fields=['announcement_alerts'])
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            announcement = Announcement.objects.create(title='Attachment', content='Document', attachment=SimpleUploadedFile('notice.txt', b'Notice contents'))
            response = self.client.get(f'/api/announcements/{announcement.pk}/attachment/')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(b''.join(response.streaming_content), b'Notice contents')
            response.close()
