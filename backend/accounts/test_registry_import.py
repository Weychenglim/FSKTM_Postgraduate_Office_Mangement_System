"""Student Registry bulk import (UC04): CSV and XLSX, validation, and history."""

import io
import re
from unittest import mock

from django.conf import settings
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from openpyxl import Workbook
from rest_framework import status
from rest_framework.test import APITestCase

from . import registry_import
from .models import RegistryImportBatch, Student, User
from .programmes import APPROVED_PROGRAMMES

DS, CS, AI = APPROVED_PROGRAMMES
HEADER = "student_id,full_name,programme,email,phone"


def csv_file(lines, name="intake.csv"):
    return SimpleUploadedFile(name, "\n".join(lines).encode("utf-8"), content_type="text/csv")


def xlsx_file(rows, name="intake.xlsx"):
    workbook = Workbook()
    for row in rows:
        workbook.active.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    return SimpleUploadedFile(
        name,
        buffer.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


class RegistryImportTests(APITestCase):
    def setUp(self):
        self.office = User.objects.create_user(
            email="import-office@example.test",
            password="pw-office-7101",
            full_name="Import Office",
            role=User.Role.OFFICE_ADMIN,
        )
        existing_user = User.objects.create_user(
            email="existing@example.test",
            password="pw-student-7102",
            full_name="Existing Student",
            role=User.Role.STUDENT,
        )
        Student.objects.create(user=existing_user, matric_no="WGA250001", programme=DS)

    def _post(self, upload, dry_run=False, user=None):
        self.client.force_authenticate(user or self.office)
        data = {"file": upload}
        if dry_run:
            data["dryRun"] = "true"
        return self.client.post("/api/registry/students/import/", data, format="multipart")

    def _statuses(self, response):
        return [row["status"] for row in response.data["rows"]]

    # ── Preview (dry run) ─────────────────────────────────────────────────────

    def test_preview_checks_every_row_and_writes_nothing(self):
        response = self._post(
            csv_file(
                [
                    HEADER,
                    f"WGA260001,Aisyah Rahman,{DS},aisyah@example.test,012-1",
                    f"WGA260002,Budi,{DS},,012-2",
                    f"WGA260003,Chandra,{DS},not-an-email,012-3",
                    "WGA260004,Devi,PhD (CS),devi@example.test,012-4",
                    f",Nameless,{DS},nameless@example.test,012-5",
                    f"wga260001,Duplicate Id,{DS},dup-id@example.test,012-6",
                    f"WGA260007,Duplicate Email,{DS},AISYAH@example.test,012-7",
                    f"WGA250001,Existing Matric,{DS},new-person@example.test,012-8",
                    f"WGA260009,Existing Email,{DS},existing@example.test,012-9",
                ]
            ),
            dry_run=True,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            self._statuses(response),
            [
                "Ready",
                "Missing Email",
                "Missing Email",
                "Bad Programme",
                "Missing Field",
                "Duplicate In File",
                "Duplicate In File",
                "Already Registered",
                "Already Registered",
            ],
        )
        rows = response.data["rows"]
        self.assertEqual(rows[1]["email"], "")
        self.assertIn("line 2", rows[5]["issue"])
        self.assertIn("line 2", rows[6]["issue"])
        self.assertEqual(Student.objects.count(), 1)
        self.assertFalse(RegistryImportBatch.objects.exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_programme_letter_case_is_normalised_and_quoted_commas_are_kept(self):
        response = self._post(
            csv_file([HEADER, f'WGA260010,"Tan, Mei Ling",{CS.lower()},mei@example.test,']),
            dry_run=True,
        )
        row = response.data["rows"][0]
        self.assertEqual(row["status"], "Ready")
        self.assertEqual(row["programme"], CS)
        self.assertEqual(row["name"], "Tan, Mei Ling")

    def test_xlsx_preview_matches_csv(self):
        response = self._post(
            xlsx_file(
                [
                    ["student_id", "full_name", "programme", "email", "phone"],
                    ["WGA260011", "Farah", AI, "farah@example.test", "012-3456789"],
                    ["WGA260012", "Gopal", "Unknown Programme", "gopal@example.test", None],
                ]
            ),
            dry_run=True,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._statuses(response), ["Ready", "Bad Programme"])
        self.assertEqual(response.data["rows"][0]["phone"], "012-3456789")

    # ── File-level refusals ───────────────────────────────────────────────────

    def test_unsupported_extension_is_refused(self):
        response = self._post(SimpleUploadedFile("intake.txt", b"student_id\nWGA1"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Only XLSX or CSV files allowed.")

    def test_missing_headers_are_refused(self):
        response = self._post(csv_file(["name,email", "x,y@example.test"]))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Missing required column", response.data["error"])

    def test_a_non_workbook_named_xlsx_is_refused(self):
        response = self._post(SimpleUploadedFile("intake.xlsx", b"student_id,full_name\n"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not a valid XLSX", response.data["error"])

    def test_empty_and_header_only_files_are_refused(self):
        self.assertIn("empty", self._post(csv_file([""])).data["error"])
        self.assertIn("no student rows", self._post(csv_file([HEADER])).data["error"])

    @override_settings(REGISTRY_IMPORT_MAX_BYTES=64)
    def test_oversized_files_are_refused(self):
        response = self._post(
            csv_file([HEADER, f"WGA260013,Hana,{DS},hana@example.test,012-1"])
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("import limit", response.data["error"])

    def test_too_many_rows_are_refused(self):
        lines = [HEADER] + [f"WGA27{i:04d},Student {i},{DS},s{i}@example.test," for i in range(4)]
        with mock.patch.object(registry_import, "MAX_IMPORT_ROWS", 3):
            response = self._post(csv_file(lines))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("more than 3", response.data["error"])

    # ── Commit ────────────────────────────────────────────────────────────────

    def test_xlsx_import_creates_accounts_and_records_the_batch(self):
        response = self._post(
            xlsx_file(
                [
                    ["student_id", "full_name", "programme", "email", "phone"],
                    ["WGA260021", "Ikram", DS, "ikram@example.test", "012-1"],
                    ["WGA260022", "Jia Hui", CS, "jiahui@example.test", "012-2"],
                ]
            )
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        batch = response.data["batch"]
        self.assertEqual(
            (batch["created"], batch["skipped"], batch["failed"], batch["invitationsFailed"]),
            (2, 0, 0, 0),
        )
        self.assertEqual(batch["fileName"], "intake.xlsx")
        self.assertEqual(batch["uploadedBy"], "Import Office")
        created = Student.objects.get(matric_no="WGA260021")
        self.assertEqual(created.programme, DS)
        self.assertFalse(created.user.has_usable_password())
        self.assertEqual(len(mail.outbox), 2)
        self.assertTrue(all("Activate" in message.subject for message in mail.outbox))

    def test_duplicates_are_skipped_and_the_rest_still_import(self):
        response = self._post(
            csv_file(
                [
                    HEADER,
                    f"WGA260031,Kamal,{DS},kamal@example.test,",
                    f"WGA260031,Kamal Again,{DS},kamal2@example.test,",
                    f"WGA250001,Existing Matric,{DS},someone@example.test,",
                    "WGA260034,Lina,Not A Programme,lina@example.test,",
                    f"WGA260035,Mei,{AI},mei2@example.test,",
                ]
            )
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            [row["result"] for row in response.data["rows"]],
            ["created", "skipped", "skipped", "failed", "created"],
        )
        batch = RegistryImportBatch.objects.get()
        self.assertEqual((batch.created_count, batch.skipped_count, batch.failed_count), (2, 2, 1))
        self.assertEqual([problem["line"] for problem in batch.problems], [3, 4, 5])
        self.assertTrue(Student.objects.filter(matric_no="WGA260035").exists())
        self.assertFalse(Student.objects.filter(matric_no="WGA260034").exists())

    def test_failed_invitations_are_counted(self):
        with mock.patch("accounts.registry_views.send_activation_email", return_value=False):
            response = self._post(
                csv_file([HEADER, f"WGA260041,Nadia,{DS},nadia@example.test,"])
            )
        batch = response.data["batch"]
        self.assertEqual((batch["created"], batch["invitationsFailed"]), (1, 1))
        self.assertEqual(batch["problems"][0]["issue"], "activation email could not be sent")

    # ── History and access ────────────────────────────────────────────────────

    def test_recent_imports_are_newest_first_and_limited(self):
        for index in range(3):
            self._post(
                csv_file(
                    [HEADER, f"WGA26005{index},Student {index},{DS},s5{index}@example.test,"],
                    name=f"batch-{index}.csv",
                )
            )
        response = self.client.get("/api/registry/imports/?limit=2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([batch["fileName"] for batch in response.data], ["batch-2.csv", "batch-1.csv"])

    def test_import_and_history_are_office_only(self):
        lecturer = User.objects.create_user(
            email="import-lecturer@example.test",
            password="pw-lect-7103",
            full_name="Import Lecturer",
            role=User.Role.LECTURER,
        )
        response = self._post(
            csv_file([HEADER, f"WGA260061,Omar,{DS},omar@example.test,"]), user=lecturer
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get("/api/registry/imports/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Student.objects.filter(matric_no="WGA260061").exists())


class ProgrammeListParityTests(APITestCase):
    def test_backend_programmes_match_the_frontend_constant(self):
        source = settings.BASE_DIR.parent / "frontend" / "src" / "constants" / "programmes.ts"
        if not source.exists():
            self.skipTest("frontend sources are not present")
        block = re.search(r"PROGRAMME_OPTIONS = \[(.*?)\]", source.read_text(encoding="utf-8"), re.S)
        self.assertIsNotNone(block)
        self.assertEqual(re.findall(r"'([^']+)'", block.group(1)), APPROVED_PROGRAMMES)
