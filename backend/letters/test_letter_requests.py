"""Saved letter requests: reference numbers, the register, Word export and notifications (UC23)."""

import io
from datetime import date
from unittest import mock

from django.contrib.auth import get_user_model
from django.utils import timezone
from pypdf import PdfReader
from pypdf.constants import UserAccessPermissions
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Student, StudentRegistry
from announcements.models import Notification

from . import request_views
from .models import GeneratedLetter, LetterReferenceCounter, LetterTemplate

User = get_user_model()
PASSWORD = "Letters-pass-7702!"
REQUESTS = "/api/letters/requests/"


def make_student(matric_no, *, student_status=Student.Status.ACTIVE, registry=True):
    user = User.objects.create_user(
        email=f"{matric_no.lower()}@example.test",
        password=PASSWORD,
        full_name=f"Student {matric_no}",
        role=User.Role.STUDENT,
    )
    student = Student.objects.create(
        user=user,
        matric_no=matric_no,
        programme="Master of Computer Science",
        status=student_status,
        intake_semester="Semester 1 2025/2026",
    )
    if registry:
        StudentRegistry.objects.create(
            student=student,
            passport_number="A1234567",
            nationality="Malaysia",
            current_semester="3",
            max_semester="8",
            expected_completion="2027",
        )
    return user


def make_user(email, role):
    return User.objects.create_user(email=email, password=PASSWORD, full_name=email, role=role)


class LetterRequestTests(APITestCase):
    def setUp(self):
        self.office = make_user("office.letters@example.test", User.Role.OFFICE_ADMIN)
        self.template = LetterTemplate.objects.create(
            name="Confirmation of Study",
            letter_type="Academic Certification",
            status=LetterTemplate.Status.ACTIVE,
            reference_prefix="UMF/PG/ENR",
            content=(
                "Dear Sir/Madam,\n\nThis is to confirm that **{{STUDENT_NAME}}** "
                "({{STUDENT_ID}}) is registered.\n\n- Passport: {{PASSPORT_NUMBER}}\n"
                "- Our ref: {{REFERENCE_NUMBER}} dated {{CURRENT_DATE}}"
            ),
        )
        self.year = timezone.localdate().year

    def generate(self, user, template=None):
        self.client.force_authenticate(user)
        return self.client.post(
            REQUESTS, {"templateId": (template or self.template).pk}, format="json"
        )

    def test_generating_saves_the_filled_letter_with_a_server_reference(self):
        response = self.generate(make_student("LTR001"))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        reference = f"UMF/PG/ENR/{self.year}/0001"
        self.assertEqual(response.data["referenceNumber"], reference)
        self.assertEqual(response.data["status"], "Issued")
        content = response.data["content"]
        for expected in ("**Student LTR001**", "(LTR001)", "Passport: A1234567", reference):
            self.assertIn(expected, content)
        self.assertNotIn("{{", content)
        letter = GeneratedLetter.objects.get()
        self.assertEqual(letter.student_data["matricNumber"], "LTR001")
        self.assertEqual(letter.student_data["referenceNumber"], reference)
        self.assertEqual(letter.template_name, "Confirmation of Study")

    def test_reference_numbers_are_sequential_per_prefix_and_year(self):
        first = self.generate(make_student("LTR010")).data["referenceNumber"]
        second = self.generate(make_student("LTR011")).data["referenceNumber"]
        other = LetterTemplate.objects.create(
            name="Visa Letter",
            status=LetterTemplate.Status.ACTIVE,
            reference_prefix="UMF/PG/VISA",
            content="For {{STUDENT_NAME}}",
        )
        visa = self.generate(make_student("LTR012"), other).data["referenceNumber"]
        LetterTemplate.objects.filter(pk=other.pk).update(reference_prefix="UMF/PG/ENR/")
        slashed = self.generate(make_student("LTR013"), other).data["referenceNumber"]
        with mock.patch.object(request_views.timezone, "localdate", return_value=date(2031, 1, 2)):
            next_year = self.generate(make_student("LTR014")).data["referenceNumber"]

        self.assertEqual(first, f"UMF/PG/ENR/{self.year}/0001")
        self.assertEqual(second, f"UMF/PG/ENR/{self.year}/0002")
        self.assertEqual(visa, f"UMF/PG/VISA/{self.year}/0001")
        self.assertEqual(slashed, f"UMF/PG/ENR/{self.year}/0003")
        self.assertEqual(next_year, "UMF/PG/ENR/2031/0001")

    def test_missing_record_fields_block_the_letter_and_name_them(self):
        response = self.generate(make_student("LTR020", registry=False))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["missingFields"], ["Passport No."])
        self.assertIn("contact the postgraduate office", response.data["detail"])
        self.assertFalse(GeneratedLetter.objects.exists())
        self.assertFalse(LetterReferenceCounter.objects.exists())
        self.assertFalse(Notification.objects.exists())

        supervised = LetterTemplate.objects.create(
            name="Supervision Letter",
            status=LetterTemplate.Status.ACTIVE,
            content="{{STUDENT_NAME}} is supervised by {{SUPERVISOR_NAME}} until {{EXPECTED_COMPLETION}}.",
        )
        response = self.generate(make_student("LTR021", registry=False), supervised)
        self.assertEqual(response.data["missingFields"], ["Supervisor", "Expected Completion"])

    def test_only_active_templates_can_be_generated(self):
        student = make_student("LTR030")
        for template_status in (LetterTemplate.Status.DRAFT, LetterTemplate.Status.ARCHIVED):
            with self.subTest(status=template_status):
                hidden = LetterTemplate.objects.create(
                    name=f"{template_status} letter", status=template_status, content="For {{STUDENT_NAME}}"
                )
                self.assertEqual(self.generate(student, hidden).status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(student)
        self.assertEqual(
            self.client.post(REQUESTS, {"templateId": 999999}, format="json").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.post(REQUESTS, {"templateId": "abc"}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertFalse(GeneratedLetter.objects.exists())

    def test_a_template_with_broken_placeholders_is_refused(self):
        broken = LetterTemplate.objects.create(
            name="Old letter", status=LetterTemplate.Status.ACTIVE, content="Dear {{STUDNET_NAME}}"
        )
        response = self.generate(make_student("LTR035"), broken)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertFalse(GeneratedLetter.objects.exists())

    def test_only_active_students_generate_letters(self):
        response = self.generate(make_student("LTR040", student_status=Student.Status.DEFERRED))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "letters_need_active_status")
        for role in (User.Role.OFFICE_ADMIN, User.Role.COORDINATOR, User.Role.LECTURER):
            with self.subTest(role=role):
                user = make_user(f"{role.split()[0].lower()}.gen@example.test", role)
                self.assertEqual(self.generate(user).status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(GeneratedLetter.objects.exists())

    def test_students_only_see_their_own_letters(self):
        mine, theirs = make_student("LTR050"), make_student("LTR051")
        own_id = self.generate(mine).data["id"]
        other_id = self.generate(theirs).data["id"]

        self.client.force_authenticate(mine)
        listed = self.client.get(REQUESTS).data
        self.assertEqual([row["id"] for row in listed], [own_id])
        self.assertNotIn("content", listed[0])
        self.assertEqual(self.client.get(f"{REQUESTS}{own_id}/").status_code, status.HTTP_200_OK)
        for path in (f"{REQUESTS}{other_id}/", f"{REQUESTS}{other_id}/pdf/"):
            self.assertEqual(self.client.get(path).status_code, status.HTTP_404_NOT_FOUND, path)

    def test_office_sees_the_whole_register_with_filters(self):
        first = self.generate(make_student("LTR060")).data
        second = self.generate(make_student("LTR061")).data
        GeneratedLetter.objects.filter(pk=first["id"]).update(issued_on=date(2025, 3, 1))

        self.client.force_authenticate(self.office)
        self.assertEqual(len(self.client.get(REQUESTS).data), 2)
        by_matric = self.client.get(REQUESTS, {"search": "ltr061"}).data
        self.assertEqual([row["id"] for row in by_matric], [second["id"]])
        by_reference = self.client.get(REQUESTS, {"search": first["referenceNumber"]}).data
        self.assertEqual([row["id"] for row in by_reference], [first["id"]])
        early = self.client.get(REQUESTS, {"from": "2025-01-01", "to": "2025-12-31"}).data
        self.assertEqual([row["id"] for row in early], [first["id"]])
        self.assertEqual(
            self.client.get(REQUESTS, {"from": "01/03/2025"}).status_code, status.HTTP_400_BAD_REQUEST
        )

        for role in (User.Role.COORDINATOR, User.Role.LECTURER):
            with self.subTest(role=role):
                self.client.force_authenticate(make_user(f"{role.split()[0].lower()}.reg@example.test", role))
                self.assertEqual(self.client.get(REQUESTS).status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(
                    self.client.get(f"{REQUESTS}{first['id']}/").status_code, status.HTTP_404_NOT_FOUND
                )

    def test_pdf_download_is_locked_and_carries_the_reference(self):
        student = make_student("LTR070")
        letter = self.generate(student).data

        for user in (student, self.office):
            with self.subTest(user=user.email):
                self.client.force_authenticate(user)
                response = self.client.get(f"{REQUESTS}{letter['id']}/pdf/")
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response["Content-Type"], "application/pdf")
                self.assertIn('filename="UM_Confirmation_of_Study_LTR070.pdf"', response["Content-Disposition"])
                reader = PdfReader(io.BytesIO(response.content))
                self.assertTrue(reader.is_encrypted)
                reader.decrypt("")
                text = "".join(page.extract_text() for page in reader.pages)
                self.assertIn(letter["referenceNumber"], text)
                self.assertIn("Student LTR070", text)
                self.assertNotIn("**", text)
                permissions = reader.user_access_permissions
                self.assertFalse(permissions & UserAccessPermissions.MODIFY, "it cannot be edited")
                self.assertTrue(permissions & UserAccessPermissions.PRINT, "it can be printed")

    def test_generating_creates_one_ready_notification(self):
        student = make_student("LTR080")
        letter_id = self.generate(student).data["id"]

        notification = Notification.objects.get(recipient=student)
        self.assertEqual(notification.event_key, f"letters:letter-ready:{letter_id}")
        self.assertEqual(notification.target_module, "LETTERS")
        self.assertEqual(notification.record_type, "GENERATED_LETTER")
        self.assertEqual(notification.record_id, letter_id)
        self.assertFalse(notification.is_announcement)

        letter = GeneratedLetter.objects.get(pk=letter_id)
        request_views._notify_ready(letter, notification.event_key)
        self.assertEqual(Notification.objects.filter(recipient=student).count(), 1)

    def test_resend_is_office_only_and_adds_one_notification_each_time(self):
        student = make_student("LTR090")
        letter_id = self.generate(student).data["id"]
        path = f"{REQUESTS}{letter_id}/resend-notification/"

        for user in (student, make_user("coord.resend@example.test", User.Role.COORDINATOR)):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.post(path).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.office)
        self.assertEqual(self.client.post(path).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post(path).status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=student).count(), 3)
        self.assertEqual(GeneratedLetter.objects.get(pk=letter_id).resend_count, 2)

    def test_revoking_needs_a_reason_and_withdraws_the_letter(self):
        student = make_student("LTR100")
        letter_id = self.generate(student).data["id"]
        path = f"{REQUESTS}{letter_id}/revoke/"

        self.client.force_authenticate(student)
        self.assertEqual(self.client.post(path, {"reason": "x"}, format="json").status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.office)
        self.assertEqual(self.client.post(path, {"reason": " "}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(path, {"reason": "Issued with the wrong programme."}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "Revoked")
        self.assertEqual(self.client.post(path, {"reason": "Again"}, format="json").status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            self.client.post(f"{REQUESTS}{letter_id}/resend-notification/").status_code, status.HTTP_409_CONFLICT
        )

        self.client.force_authenticate(student)
        detail = self.client.get(f"{REQUESTS}{letter_id}/").data
        self.assertEqual(detail["status"], "Revoked")
        self.assertEqual(detail["revokeReason"], "Issued with the wrong programme.")
        self.assertNotIn("content", detail)
        self.assertEqual(self.client.get(f"{REQUESTS}{letter_id}/pdf/").status_code, status.HTTP_409_CONFLICT)
        revoked = Notification.objects.get(recipient=student, event_key=f"letters:letter-revoked:{letter_id}")
        self.assertIn("wrong programme", revoked.message)

    def test_saved_letters_need_an_active_status_too(self):
        student = make_student("LTR105")
        letter_id = self.generate(student).data["id"]
        Student.objects.filter(user=student).update(status=Student.Status.WITHDRAWN)
        student.refresh_from_db()

        self.client.force_authenticate(student)
        for path in (REQUESTS, f"{REQUESTS}{letter_id}/", f"{REQUESTS}{letter_id}/pdf/"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, path)
            self.assertEqual(response.data["code"], "letters_need_active_status")
        self.client.force_authenticate(self.office)
        self.assertEqual(self.client.get(f"{REQUESTS}{letter_id}/pdf/").status_code, status.HTTP_200_OK)

    def test_the_register_keeps_letters_when_an_account_is_removed(self):
        student = make_student("LTR110")
        letter_id = self.generate(student).data["id"]
        student.delete()

        self.client.force_authenticate(self.office)
        rows = self.client.get(REQUESTS).data
        self.assertEqual([(row["id"], row["matricNumber"]) for row in rows], [(letter_id, "LTR110")])
        self.assertEqual(
            self.client.post(f"{REQUESTS}{letter_id}/resend-notification/").status_code, status.HTTP_409_CONFLICT
        )
