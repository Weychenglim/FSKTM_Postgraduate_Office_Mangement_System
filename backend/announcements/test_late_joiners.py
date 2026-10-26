"""People who join after an announcement went out still see it while it is live."""

import tempfile
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Student
from accounts.programmes import APPROVED_PROGRAMMES

from .models import Announcement, Notification

User = get_user_model()
PASSWORD = "Latecomer-pass-4418!"
DATA_SCIENCE, CYBER_SECURITY = APPROVED_PROGRAMMES[0], APPROVED_PROGRAMMES[1]
SEM1 = "Semester 1 2026/2027"


def later(**delta):
    return (timezone.now() + timedelta(**delta)).isoformat()


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class LateJoinerTests(APITestCase):
    def setUp(self):
        self.office = self.user("office.late@example.test", User.Role.OFFICE_ADMIN)
        self.early = self.student("early", DATA_SCIENCE)

    def user(self, email, role, **extra):
        return User.objects.create_user(email=email, password=PASSWORD, full_name=email, role=role, **extra)

    def student(self, name, programme, **extra):
        user = self.user(f"{name}.late@example.test", User.Role.STUDENT, **extra)
        Student.objects.create(user=user, matric_no=f"LATE-{name}", programme=programme, intake_semester=SEM1)
        return user

    def publish(self, **fields):
        body = {"title": "Registration week", "content": "Register by Friday.", "target": "All Students", "priority": "Info", "status": "Active"}
        body.update(fields)
        self.client.force_authenticate(self.office)
        response = self.client.post("/api/announcements/", body, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return Announcement.objects.get(pk=response.data["id"])

    def feed(self, user):
        self.client.force_authenticate(user)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [row for row in response.data if row.get("announcementId")]

    def test_a_student_registered_later_gets_the_live_announcement_unread(self):
        notice = self.publish()
        late = self.student("late", DATA_SCIENCE)
        rows = self.feed(late)
        self.assertEqual([row["title"] for row in rows], ["Registration week"])
        self.assertTrue(rows[0]["isUnread"])
        self.assertTrue(Notification.objects.filter(recipient=late, announcement=notice).exists())

    def test_it_is_dated_when_it_first_went_out_and_not_emailed(self):
        notice = self.publish()
        first = Notification.objects.get(recipient=self.early, announcement=notice).created_at
        mail.outbox.clear()
        late = self.student("late", DATA_SCIENCE, email_notifications=True)
        self.feed(late)
        self.assertEqual(Notification.objects.get(recipient=late, announcement=notice).created_at, first)
        self.assertEqual(len(mail.outbox), 0)

    def test_opening_the_feed_again_does_not_duplicate_it(self):
        notice = self.publish()
        late = self.student("late", DATA_SCIENCE)
        self.feed(late)
        self.feed(late)
        self.assertEqual(Notification.objects.filter(recipient=late, announcement=notice).count(), 1)

    def test_read_state_is_kept_on_later_visits(self):
        notice = self.publish()
        late = self.student("late", DATA_SCIENCE)
        self.feed(late)
        Notification.objects.filter(recipient=late, announcement=notice).update(is_read=True)
        self.assertFalse(self.feed(late)[0]["isUnread"])

    def test_the_audience_and_targeting_still_apply(self):
        self.publish(title="Data Science only", targetProgrammes=[DATA_SCIENCE])
        self.publish(title="Staff only", target="Staff")
        other = self.student("other", CYBER_SECURITY)
        late_ds = self.student("lateds", DATA_SCIENCE)
        lecturer = self.user("lect.late@example.test", User.Role.LECTURER)
        self.assertEqual([row["title"] for row in self.feed(other)], [])
        self.assertEqual([row["title"] for row in self.feed(late_ds)], ["Data Science only"])
        self.assertNotIn("Data Science only", [row["title"] for row in self.feed(lecturer)])

    def test_drafts_scheduled_and_expired_ones_are_not_handed_out(self):
        self.publish(title="Draft", status="Draft")
        self.publish(title="Later", status="Scheduled", publishAt=later(hours=2))
        expired = self.publish(title="Over")
        Announcement.objects.filter(pk=expired.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        late = self.student("late", DATA_SCIENCE)
        self.assertEqual([row["title"] for row in self.feed(late)], [])

    def test_announcement_alerts_off_still_gets_urgent_ones_only(self):
        self.publish(title="General notice")
        self.publish(title="Urgent notice", priority="Urgent")
        quiet = self.student("quiet", DATA_SCIENCE, announcement_alerts=False)
        self.assertEqual([row["title"] for row in self.feed(quiet)], ["Urgent notice"])

    def test_a_student_moved_into_a_targeted_programme_gets_it(self):
        self.publish(title="Cyber Security briefing", targetProgrammes=[CYBER_SECURITY])
        mover = self.student("mover", DATA_SCIENCE)
        self.assertEqual(self.feed(mover), [])
        Student.objects.filter(user=mover).update(programme=CYBER_SECURITY)
        mover = User.objects.get(pk=mover.pk)
        self.assertEqual([row["title"] for row in self.feed(mover)], ["Cyber Security briefing"])
