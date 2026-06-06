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
