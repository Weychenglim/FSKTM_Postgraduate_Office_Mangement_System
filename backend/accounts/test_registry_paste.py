"""Rows pasted from a spreadsheet, with or without column names (UC04)."""

import json

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Student, User
from .programmes import APPROVED_PROGRAMMES
from .registry_import import suggest_from_values

DS, CS, _ = APPROVED_PROGRAMMES
INSPECT = "/api/registry/students/import/inspect/"
IMPORT = "/api/registry/students/import/"
NAMES = ["No. Matrik", "Nama Pelajar", "Program", "E-mel", "No. Tel"]
ROWS = [
    ["WQD320001", "Tan, Mei Ling", DS, "mei.ling@example.test", "012-3456789"],
    ["WQD320002", "Aisyah Binti Rahman", "Master of Cyber Security", "aisyah.rahman@example.test", "013-2345678"],
]
MAPPING = {
    "student_id": 0,
    "full_name": 1,
    "programme": 2,
    "email": 3,
    "phone": 4,
    "intake": None,
    "current_semester": None,
}
CHOICES = {"Master of Cyber Security": CS}


def pasted(lines):
    """What the browser sends for cells copied from a spreadsheet."""
    text = "\n".join("\t".join(cells) for cells in lines)
    return SimpleUploadedFile("pasted-rows.csv", text.encode("utf-8"), content_type="text/csv")


class PastedRowsTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.office = User.objects.create_user(
            email="paste-office@example.test",
            password="pw-office-7801",
            full_name="Paste Office",
            role=User.Role.OFFICE_ADMIN,
        )
        self.client.force_authenticate(self.office)

    def inspect(self, lines, options=None):
        data = {"file": pasted(lines)}
        if options is not None:
            data["options"] = json.dumps(options)
        return self.client.post(INSPECT, data, format="multipart")

    def send(self, lines, options, dry_run=True):
        data = {"file": pasted(lines), "options": json.dumps(options)}
        if dry_run:
            data["dryRun"] = "true"
        return self.client.post(IMPORT, data, format="multipart")

    def test_pasted_rows_with_column_names_read_like_a_file(self):
        response = self.inspect([NAMES, *ROWS])
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual((response.data["hasHeader"], response.data["headerRow"]), (True, 1))
        self.assertEqual(response.data["mapping"], MAPPING)
        rows = self.send([NAMES, *ROWS], {"programmeMap": CHOICES}).data["rows"]
        self.assertEqual([row["status"] for row in rows], ["Ready", "Ready"])
        self.assertEqual(rows[0]["name"], "Tan, Mei Ling")

    def test_without_column_names_the_columns_are_matched_from_their_values(self):
        data = self.inspect(ROWS, {"hasHeader": False}).data
        self.assertEqual((data["hasHeader"], data["headerRow"], data["rowCount"]), (False, None, 2))
        self.assertEqual(data["mapping"], MAPPING)
        self.assertEqual([column["header"] for column in data["columns"]], [""] * 5)
        self.assertEqual(data["columns"][3]["suggestedField"], "email")
        self.assertIsNone(data["layoutToken"])
        self.assertFalse(data["layoutRecognised"])

    def test_without_column_names_every_row_is_a_student(self):
        options = {"hasHeader": False, "mapping": MAPPING, "programmeMap": CHOICES}
        rows = self.send(ROWS, options).data["rows"]
        self.assertEqual([(row["line"], row["id"], row["status"]) for row in rows], [(1, "WQD320001", "Ready"), (2, "WQD320002", "Ready")])
        created = self.send(ROWS, options, dry_run=False)
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertEqual(Student.objects.filter(matric_no__in=["WQD320001", "WQD320002"]).count(), 2)

    def test_running_numbers_and_mykad_numbers_are_not_student_ids(self):
        mapping = suggest_from_values(
            [
                (1, ["1", "WQD320101", "990101-14-5678", "Ali Bin Abu", DS]),
                (2, ["2", "WQD320102", "000202-10-1234", "Siti Binti Hassan", DS]),
            ]
        )
        self.assertEqual((mapping["student_id"], mapping["full_name"], mapping["programme"]), (1, 3, 4))

    def test_a_field_that_fits_two_columns_stays_unmatched(self):
        mapping = suggest_from_values(
            [
                (1, ["WQD320201", "A12345678", "Ali Bin Abu"]),
                (2, ["WQD320202", "A87654321", "Siti Binti Hassan"]),
            ]
        )
        self.assertIsNone(mapping["student_id"])
        self.assertEqual(mapping["full_name"], 2)

    def test_the_choice_must_be_true_or_false(self):
        response = self.inspect(ROWS, {"hasHeader": "no"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("hasHeader", response.data)
