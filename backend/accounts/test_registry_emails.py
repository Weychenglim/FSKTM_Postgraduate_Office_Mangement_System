"""Missing student emails filled from the Student ID, and the Student ID rule (UC04)."""

import json

from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import RegistryImportBatch, Student, User
from .programmes import APPROVED_PROGRAMMES

DS = APPROVED_PROGRAMMES[0]
INSPECT = "/api/registry/students/import/inspect/"
IMPORT = "/api/registry/students/import/"
WITH_EMAIL = "No. Matrik,Nama,Program,Emel"
WITHOUT_EMAIL = "No. Matrik,Nama,Program"


def csv_file(lines, name="smoke-emails.csv"):
    return SimpleUploadedFile(name, "\n".join(lines).encode("utf-8"), content_type="text/csv")


class FilledEmailBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.office = User.objects.create_user(
            email="emails-office@example.test",
            password="pw-office-7701",
            full_name="Emails Office",
            role=User.Role.OFFICE_ADMIN,
        )
        self.client.force_authenticate(self.office)

    def post(self, lines, options=None, dry_run=True):
        data = {"file": csv_file(lines)}
        if options is not None:
            data["options"] = json.dumps(options)
        if dry_run:
            data["dryRun"] = "true"
        return self.client.post(IMPORT, data, format="multipart")

    def rows(self, response):
        return response.data["rows"]


class FillEmailTests(FilledEmailBase):
    def test_a_file_without_an_email_column_gets_siswamail_addresses(self):
        response = self.post([WITHOUT_EMAIL, f"WQD310001,No Email One,{DS}", f"23004955,No Email Two,{DS}"], {})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = self.rows(response)
        self.assertEqual(
            [(row["email"], row["status"], row.get("emailFilled")) for row in rows],
            [("wqd310001@siswa.um.edu.my", "Ready", True), ("23004955@siswa.um.edu.my", "Ready", True)],
        )

    def test_blank_cells_are_filled_and_given_emails_are_kept(self):
        rows = self.rows(
            self.post(
                [WITH_EMAIL, f"WQD310101,Blank Email,{DS},", f"WQD310102,Own Email,{DS},own.email@example.test"],
                {},
            )
        )
        self.assertEqual((rows[0]["email"], rows[0].get("emailFilled")), ("wqd310101@siswa.um.edu.my", True))
        self.assertEqual(rows[1]["email"], "own.email@example.test")
        self.assertNotIn("emailFilled", rows[1])

    def test_a_filled_email_still_meets_the_repeat_and_registered_checks(self):
        existing = User.objects.create_user(
            email="wqd310202@siswa.um.edu.my", password="pw-student-7702", full_name="Already Here", role=User.Role.STUDENT
        )
        Student.objects.create(user=existing, matric_no="WQD310299", programme=DS)
        rows = self.rows(
            self.post(
                [
                    WITH_EMAIL,
                    f"WQD310201,First Copy,{DS},wqd310203@siswa.um.edu.my",
                    f"WQD310202,Email Registered,{DS},",
                    f"WQD310203,Same As First,{DS},",
                ],
                {},
            )
        )
        self.assertEqual(
            [(row["status"], row.get("matchedBy"), row.get("duplicateOf")) for row in rows],
            [("Ready", None, None), ("Already Registered", "email", None), ("Duplicate In File", None, 2)],
        )

    def test_filling_can_be_turned_off(self):
        missing = self.post([WITHOUT_EMAIL, f"WQD310301,No Email,{DS}"], {"fillEmail": False})
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(missing.data["mapping"], ["Choose a column for: Email."])
        blank = self.rows(self.post([WITH_EMAIL, f"WQD310302,Blank Email,{DS},"], {"fillEmail": False}))[0]
        self.assertEqual((blank["status"], blank["email"]), ("Missing Email", ""))

    def test_files_sent_without_options_import_as_before(self):
        response = self.post(["student_id,full_name,programme,email,phone", f"WQD310401,Template Row,{DS},,"])
        row = self.rows(response)[0]
        self.assertEqual((row["status"], row["email"]), ("Missing Email", ""))
        self.assertNotIn("emailFilled", row)

    @override_settings(REGISTRY_STUDENT_EMAIL_DOMAIN="@Example.EDU ")
    def test_the_domain_comes_from_the_setting(self):
        row = self.rows(self.post([WITHOUT_EMAIL, f"WQD310501,Other Domain,{DS}"], {}))[0]
        self.assertEqual(row["email"], "wqd310501@example.edu")

    def test_inspect_tells_the_office_the_domain_and_does_not_require_an_email_column(self):
        response = self.client.post(
            INSPECT, {"file": csv_file([WITHOUT_EMAIL, f"WQD310601,No Email,{DS}"])}, format="multipart"
        )
        self.assertEqual(response.data["emailDomain"], "siswa.um.edu.my")
        self.assertIsNone(response.data["mapping"]["email"])

    def test_an_import_keeps_which_emails_were_filled(self):
        response = self.post(
            [WITH_EMAIL, f"WQD310701,Filled On Import,{DS},", f"WQD310702,Given On Import,{DS},given@example.test"],
            {},
            dry_run=False,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Student.objects.get(matric_no="WQD310701").user.email, "wqd310701@siswa.um.edu.my")
        self.assertEqual(sorted(message.to[0] for message in mail.outbox), ["given@example.test", "wqd310701@siswa.um.edu.my"])
        batch = RegistryImportBatch.objects.get()
        self.assertEqual(
            batch.created_students,
            [{"id": "WQD310701", "line": 2, "emailFilled": True}, {"id": "WQD310702", "line": 3}],
        )
        self.assertEqual(response.data["batch"]["emailsFilled"], 1)
        self.assertEqual((batch.settings_used["fillEmail"], batch.settings_used["idRule"]), (True, None))

    def test_bad_choices_are_refused(self):
        for options, field in (({"fillEmail": "yes"}, "fillEmail"), ({"idRule": "matric"}, "idRule")):
            with self.subTest(options=options):
                response = self.post([WITH_EMAIL, f"WQD310801,Bad Choice,{DS},bad@example.test"], options)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(field, response.data)


class StudentIdRuleTests(FilledEmailBase):
    def test_the_rule_applies_only_when_chosen(self):
        lines = [WITHOUT_EMAIL, f"23004955/1,Suffix Student,{DS}"]
        plain = self.rows(self.post(lines, {}))[0]
        self.assertEqual(plain["status"], "Invalid Field")

        ruled = self.rows(self.post(lines, {"idRule": "studentId"}))[0]
        self.assertEqual(
            (ruled["id"], ruled["idInFile"], ruled["email"], ruled["status"]),
            ("23004955", "23004955/1", "23004955@siswa.um.edu.my", "Ready"),
        )

    def test_ids_without_a_programme_number_are_untouched(self):
        row = self.rows(self.post([WITHOUT_EMAIL, f"WQD310901,Plain Id,{DS}"], {"idRule": "studentId"}))[0]
        self.assertEqual(row["id"], "WQD310901")
        self.assertNotIn("idInFile", row)

    def test_two_programme_numbers_of_one_student_are_one_student(self):
        rows = self.rows(
            self.post([WITHOUT_EMAIL, f"23004956/1,Twice Listed,{DS}", f"23004956/2,Twice Listed,{DS}"], {"idRule": "studentId"})
        )
        self.assertEqual([row["status"] for row in rows], ["Ready", "Duplicate In File"])

    def test_inspect_counts_the_ids_with_a_programme_number(self):
        response = self.client.post(
            INSPECT,
            {"file": csv_file([WITHOUT_EMAIL, f"23004957/1,One,{DS}", f"WQD311001,Two,{DS}", f"23004958/2,Three,{DS}"])},
            format="multipart",
        )
        self.assertEqual(response.data["studentIdsWithSuffix"], 2)
