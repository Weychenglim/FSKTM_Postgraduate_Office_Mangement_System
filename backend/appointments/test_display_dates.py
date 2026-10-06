from datetime import date, datetime, timezone as datetime_timezone

from django.test import SimpleTestCase

from .serializers import format_display_date


class AppointmentDisplayDateTests(SimpleTestCase):
    def test_utc_evening_is_next_malaysia_calendar_day(self):
        submitted = datetime(2026, 10, 4, 16, 40, tzinfo=datetime_timezone.utc)
        self.assertEqual(format_display_date(submitted), "05 Oct 2026")

    def test_date_only_appointment_is_preserved(self):
        self.assertEqual(format_display_date(date(2026, 10, 5)), "05 Oct 2026")
        self.assertEqual(format_display_date(None), "")
