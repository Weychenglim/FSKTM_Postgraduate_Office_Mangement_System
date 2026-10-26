"""The sample confirmation letters the system sets up for appointments: a
coordinator's approval issues them at once, in English and Malay, to everyone
the appointment concerns."""
from django.utils import timezone

from .appointment_letters import PANEL, SUPERVISOR, active_template, template_problem
from .confirmation import malay_date, malay_values
from .models import GeneratedLetter
from .test_appointment_letters import PANEL_LETTER, SUPERVISOR_LETTER, AppointmentLetterFixtures


class SampleTemplateTests(AppointmentLetterFixtures):
    keep_samples = True

    def test_the_samples_are_active_and_need_nothing_from_the_office(self):
        for purpose, kind in ((SUPERVISOR_LETTER, SUPERVISOR), (PANEL_LETTER, PANEL)):
            with self.subTest(kind=kind):
                template = active_template(purpose)
                self.assertIsNotNone(template)
                self.assertIsNone(template_problem(template, kind))
                self.assertTrue(template.content_ms.strip())
                self.assertIn("Sample wording", template.description)
                self.assertEqual(template.custom_fields, [])

    def test_an_approved_supervisor_gets_the_letter_at_once_in_both_languages(self):
        appointment = self.appoint_supervisor(self.ali, self.supervisor, course_codes="")
        letter = GeneratedLetter.objects.get(supervisor_appointment=appointment)
        self.assertEqual(letter.status, GeneratedLetter.Status.ISSUED)
        self.assertTrue(letter.reference_number.startswith(f"UMF/PG/SV/{self.year}/"))
        self.assertIn("CONFIRMATION OF SUPERVISOR APPOINTMENT", letter.content)
        self.assertIn("| Supervisor | Dr Supervisor |", letter.content)
        self.assertIn("| Research Title | Research for LTR-S1 |", letter.content)
        self.assertIn("PENGESAHAN PELANTIKAN PENYELIA", letter.content_ms)
        self.assertIn(f"| Berkuat Kuasa Mulai | {malay_date(timezone.localdate())} |", letter.content_ms)
        self.assertNotIn("{{", letter.content + letter.content_ms)
        self.assertEqual(set(letter.recipients.all()), {self.ali.user, self.supervisor})
        self.assertEqual(set(self.notices(letter).values_list("recipient", flat=True)), {self.ali.user.pk, self.supervisor.pk})

    def test_an_approved_panel_member_gets_the_letter_with_the_supervisor_in_copy(self):
        self.appoint_supervisor(self.bella, self.supervisor)
        appointment = self.appoint_panel(self.bella, self.panel)
        letter = GeneratedLetter.objects.get(panel_appointment=appointment)
        self.assertEqual(letter.status, GeneratedLetter.Status.ISSUED)
        self.assertIn("| Panel Member | Dr Panel |", letter.content)
        self.assertIn("| Ahli Panel | Dr Panel |", letter.content_ms)
        self.assertEqual(set(letter.recipients.all()), {self.bella.user, self.panel, self.supervisor})


class MalayDateTests(AppointmentLetterFixtures):
    def test_appointment_dates_print_in_malay(self):
        values = malay_values({"appointmentDate": "08 October 2026", "approvedDate": "01 March 2026", "semester": "Semester I 2026/2027", "panelAcceptedDate": ""})
        self.assertEqual((values["appointmentDate"], values["approvedDate"]), ("08 Oktober 2026", "01 Mac 2026"))
        self.assertEqual(values["panelAcceptedDate"], "")
        self.assertEqual(values["semester"], "Semester I 2026/2027")
