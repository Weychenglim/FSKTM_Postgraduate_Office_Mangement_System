"""A revoked request letter is emailed to the student, like an approval or a rejection."""
from django.core import mail

from .test_letter_requests import REQUESTS, LetterRequestTestCase, make_student


class RevokeEmailTests(LetterRequestTestCase):
    def revoke(self, letter_id, reason="Issued with the wrong programme."):
        self.client.force_authenticate(self.office)
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(f"{REQUESTS}{letter_id}/revoke/", {"reason": reason}, format="json")

    def issued(self, student):
        with self.captureOnCommitCallbacks(execute=True):
            letter_id = self.issue(student).data["id"]
        mail.outbox.clear()
        return letter_id

    def test_the_student_is_emailed_the_reason(self):
        student = make_student("LTR090", email_alerts=True)
        letter_id = self.issued(student)
        response = self.revoke(letter_id)
        self.assertEqual(response.data["status"], "Revoked")
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, [student.email])
        self.assertEqual(email.subject, "Letter revoked: Visa Support Letter")
        self.assertIn("It is no longer valid.", email.body)
        self.assertIn("Reason: Issued with the wrong programme.", email.body)

    def test_no_email_when_email_alerts_are_off(self):
        student = make_student("LTR091")
        letter_id = self.issued(student)
        self.assertEqual(self.revoke(letter_id).status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

