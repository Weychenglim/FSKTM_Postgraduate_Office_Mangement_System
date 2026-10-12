"""Column matches remembered for the office's own spreadsheet layouts (UC04)."""

import json

from django.core import signing
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from .models import RegistryImportProfile, User
from .programmes import APPROVED_PROGRAMMES
from .registry_profiles import layout_signature

DS = APPROVED_PROGRAMMES[0]
INSPECT = "/api/registry/students/import/inspect/"
IMPORT = "/api/registry/students/import/"
HEADER = "Bil,No. Matrik,Nama Pelajar,E-mel,Program,No. Tel"
# The office left the phone column out, although its name is known.
CONFIRMED = {
    "student_id": 1,
    "full_name": 2,
    "programme": 4,
    "email": 3,
    "phone": None,
    "intake": None,
    "current_semester": None,
}


def csv_file(lines, name="smoke-layout.csv"):
    return SimpleUploadedFile(name, "\n".join(lines).encode("utf-8"), content_type="text/csv")


def extract(*students):
    return [HEADER] + [
        f"{number},{matric},{name},{email},{DS},012-3456789" for number, (matric, name, email) in enumerate(students, 1)
    ]


class LayoutProfileTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.office = User.objects.create_user(
            email="profiles-office@example.test",
            password="pw-office-7601",
            full_name="Profiles Office",
            role=User.Role.OFFICE_ADMIN,
        )
        self.client.force_authenticate(self.office)

    def inspect(self, lines, options=None):
        data = {"file": csv_file(lines)}
        if options is not None:
            data["options"] = json.dumps(options)
        return self.client.post(INSPECT, data, format="multipart")

    def import_file(self, lines, options, dry_run=False, name="smoke-layout.csv"):
        data = {"file": csv_file(lines, name), "options": json.dumps(options)}
        if dry_run:
            data["dryRun"] = "true"
        return self.client.post(IMPORT, data, format="multipart")

    def remember(self, token, mapping=CONFIRMED):
        return {"token": token, "mapping": mapping, "sheet": None, "headerRow": 1}

    def save_layout(self):
        lines = extract(("WQD300001", "First Intake", "first.intake@example.test"))
        token = self.inspect(lines).data["layoutToken"]
        response = self.import_file(lines, {"mapping": CONFIRMED, "rememberLayout": self.remember(token)})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return token

    def test_matches_are_saved_on_import_only(self):
        lines = extract(("WQD300101", "Preview Only", "preview.only@example.test"))
        token = self.inspect(lines).data["layoutToken"]
        self.assertTrue(token)
        self.import_file(lines, {"mapping": CONFIRMED, "rememberLayout": self.remember(token)}, dry_run=True)
        self.assertFalse(RegistryImportProfile.objects.exists())

        self.import_file(lines, {"mapping": CONFIRMED, "rememberLayout": self.remember(token)})
        profile = RegistryImportProfile.objects.get()
        self.assertEqual(profile.mapping, CONFIRMED)
        self.assertEqual((profile.header_row, profile.updated_by), (1, self.office))
        self.assertEqual(profile.signature, layout_signature(HEADER.split(",")))

    def test_the_next_file_with_the_same_columns_opens_with_the_saved_matches(self):
        self.save_layout()
        response = self.inspect(
            extract(
                ("WQD300201", "Next Intake", "next.intake@example.test"),
                ("WQD300202", "Another Student", "another.student@example.test"),
            )
        )
        self.assertEqual(response.data["mapping"], CONFIRMED)
        self.assertTrue(response.data["profileAppliedAt"])
        self.assertFalse(response.data["layoutRecognised"])
        self.assertEqual(response.data["ignoredColumns"], ["Bil", "No. Tel"])

    def test_edited_rows_sent_back_in_our_layout_still_save_the_matches(self):
        token = self.inspect(extract(("WQD300301", "Edited Row", "edited.row@example.test"))).data["layoutToken"]
        reviewed = [
            "student_id,full_name,programme,email,phone,intake,current_semester",
            f"WQD300301,Edited Row,{DS},edited.fixed@example.test,,,",
        ]
        response = self.import_file(reviewed, {"rememberLayout": self.remember(token)}, name="smoke-layout-reviewed.csv")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(RegistryImportProfile.objects.get().mapping, CONFIRMED)

    def test_a_different_column_list_falls_back_to_suggestions(self):
        self.save_layout()
        response = self.inspect([f"{HEADER},Catatan", f"1,WQD300401,Extra Column,extra.column@example.test,{DS},,nota"])
        self.assertIsNone(response.data["profileAppliedAt"])
        self.assertEqual(response.data["mapping"]["phone"], 5)

    def test_a_stale_profile_pointing_past_the_last_column_is_ignored(self):
        RegistryImportProfile.objects.create(
            signature=layout_signature(HEADER.split(",")), mapping={**CONFIRMED, "phone": 9}
        )
        response = self.inspect(extract(("WQD300501", "Stale Profile", "stale.profile@example.test")))
        self.assertIsNone(response.data["profileAppliedAt"])
        self.assertEqual(response.data["mapping"]["phone"], 5)

    def test_saved_matches_can_be_set_aside_for_one_file(self):
        self.save_layout()
        response = self.inspect(extract(("WQD300601", "Set Aside", "set.aside@example.test")), {"useProfile": False})
        self.assertIsNone(response.data["profileAppliedAt"])
        self.assertEqual(response.data["mapping"]["phone"], 5)

    def test_a_later_import_updates_the_saved_matches(self):
        token = self.save_layout()
        changed = {**CONFIRMED, "phone": 5}
        self.import_file(
            extract(("WQD300701", "Later Import", "later.import@example.test")),
            {"mapping": changed, "rememberLayout": self.remember(token, changed)},
        )
        self.assertEqual(RegistryImportProfile.objects.get().mapping, changed)

    def test_our_template_is_never_remembered(self):
        response = self.inspect(["student_id,full_name,programme,email,phone", f"WQD300801,Template,{DS},template@example.test,"])
        self.assertIsNone(response.data["layoutToken"])
        self.assertTrue(response.data["layoutRecognised"])

    def test_a_token_that_is_not_ours_saves_nothing_and_never_stops_the_import(self):
        forged = signing.dumps(layout_signature(HEADER.split(",")), salt="something-else")
        for index, token in enumerate(("not-a-token", forged)):
            with self.subTest(token=token):
                response = self.import_file(
                    extract((f"WQD30090{index}", "Forged Token", f"forged{index}@example.test")),
                    {"mapping": CONFIRMED, "rememberLayout": self.remember(token)},
                )
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(RegistryImportProfile.objects.exists())

    def test_matches_to_remember_must_be_readable(self):
        for bad in (
            ["not", "a", "layout"],
            {"token": 5, "mapping": CONFIRMED},
            {"token": "x", "mapping": {"faculty": 1}},
            {"token": "x", "mapping": CONFIRMED, "headerRow": 0},
        ):
            with self.subTest(bad=bad):
                response = self.import_file(
                    extract(("WQD301001", "Bad Layout", "bad.layout@example.test")), {"rememberLayout": bad}, dry_run=True
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(response.data["rememberLayout"], ["The column matches to remember could not be read."])

    def test_the_signature_ignores_letter_case_punctuation_and_trailing_blank_columns(self):
        self.assertEqual(layout_signature(["No. Matrik", "Nama"]), layout_signature(["no matrik", "NAMA", "", ""]))
        self.assertNotEqual(layout_signature(["No. Matrik", "Nama"]), layout_signature(["Nama", "No. Matrik"]))
