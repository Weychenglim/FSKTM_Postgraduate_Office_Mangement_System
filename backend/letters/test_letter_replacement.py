"""Asking for the same letter again (a student pass letter is only valid for a few
months) replaces the earlier copy once the office approves the new one."""
from django.core import mail

from .models import GeneratedLetter, LetterTemplate
from .test_letter_requests import REQUESTS, LetterRequestTestCase, make_student


class LetterReplacementTests(LetterRequestTestCase):
    def issued(self, student):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.issue(student)
        self.assertEqual(response.status_code, 200, response.data)
        return GeneratedLetter.objects.get(pk=response.data["id"])

    def test_approving_the_same_letter_again_replaces_the_earlier_copy(self):
        student = make_student("LTR201")
        first = self.issued(student)
        second = self.issued(student)
        first.refresh_from_db()
        self.assertEqual(second.status, GeneratedLetter.Status.ISSUED)
        self.assertEqual(first.status, GeneratedLetter.Status.REVOKED)
        self.assertEqual(first.replaced_by, second)
        self.assertEqual(first.revoke_reason, f"Replaced by {second.reference_number}.")
        self.assertEqual(first.revoked_by, self.office)

    def test_only_the_newest_copy_can_still_be_downloaded(self):
        student = make_student("LTR202")
        first = self.issued(student)
        second = self.issued(student)
        self.client.force_authenticate(student)
        self.assertNotEqual(self.client.get(f"{REQUESTS}{first.pk}/pdf/").status_code, 200)
        self.assertEqual(self.client.get(f"{REQUESTS}{second.pk}/pdf/").status_code, 200)
        listed = {row["id"]: row for row in self.client.get(REQUESTS).data}
        self.assertEqual(listed[str(first.pk)]["replacedById"], str(second.pk))

    def test_the_office_sees_what_an_approval_will_replace(self):
        student = make_student("LTR203")
        first = self.issued(student)
        request_id = self.ask(student).data["id"]
        self.client.force_authenticate(self.office)
        review = self.client.get(f"{REQUESTS}{request_id}/").data
        self.assertEqual([row["referenceNumber"] for row in review["replaces"]], [first.reference_number])

    def test_the_student_is_told_which_letter_was_replaced(self):
        student = make_student("LTR204", email_alerts=True)
        first = self.issued(student)
        mail.outbox.clear()
        second = self.issued(student)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(f"It replaces your earlier Visa Support Letter ({first.reference_number})", mail.outbox[0].body)
        self.assertIn("no longer valid", mail.outbox[0].body)
        self.assertIn(second.reference_number, mail.outbox[0].body)

    def test_other_letters_and_other_students_are_left_alone(self):
        student = make_student("LTR205")
        other_student = make_student("LTR206")
        enrolment = LetterTemplate.objects.create(
            name="Confirmation of Enrolment",
            status=LetterTemplate.Status.ACTIVE,
            reference_prefix="UMF/PG/ENR",
            content="{{STUDENT_NAME}} ({{STUDENT_ID}}) is registered.",
        )
        visa = self.issued(student)
        theirs = self.issued(other_student)
        with self.captureOnCommitCallbacks(execute=True):
            enrolment_letter = self.approve(self.ask(student, enrolment).data["id"])
        self.assertEqual(enrolment_letter.status_code, 200, enrolment_letter.data)
        self.issued(other_student)
        visa.refresh_from_db()
        theirs.refresh_from_db()
        self.assertEqual(visa.status, GeneratedLetter.Status.ISSUED)
        self.assertEqual(theirs.status, GeneratedLetter.Status.REVOKED)

    def test_a_rejected_new_request_keeps_the_earlier_copy_valid(self):
        student = make_student("LTR207")
        first = self.issued(student)
        request_id = self.ask(student).data["id"]
        self.reject(request_id, "Your current letter is still valid until January.")
        first.refresh_from_db()
        self.assertEqual(first.status, GeneratedLetter.Status.ISSUED)
