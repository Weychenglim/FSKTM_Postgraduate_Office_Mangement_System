"""Letter templates (UC21): archive and restore, and placeholder validation."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import LetterTemplate
from .placeholders import PLACEHOLDERS

User = get_user_model()


class LetterTemplateLifecycleTests(APITestCase):
    def setUp(self):
        self.office = User.objects.create_user(
            email="letters-office@example.test",
            password="pw-office-5501",
            full_name="Letters Office",
            role=User.Role.OFFICE_ADMIN,
        )
        self.student = User.objects.create_user(
            email="letters-student@example.test",
            password="pw-student-5502",
            full_name="Letters Student",
            role=User.Role.STUDENT,
        )
        self.template = LetterTemplate.objects.create(
            name="Confirmation of Study",
            status=LetterTemplate.Status.ACTIVE,
            content="Dear {{STUDENT_NAME}} ({{STUDENT_ID}})",
        )

    def _patch(self, data, user=None):
        self.client.force_authenticate(user or self.office)
        return self.client.patch(f"/api/letter-templates/{self.template.pk}/", data, format="json")

    def _student_sees(self):
        self.client.force_authenticate(self.student)
        listed = [t["id"] for t in self.client.get("/api/letter-templates/").data]
        detail = self.client.get(f"/api/letter-templates/{self.template.pk}/").status_code
        return str(self.template.pk) in listed, detail

    def test_archive_hides_the_template_from_students_and_keeps_its_wording(self):
        response = self._patch({"status": LetterTemplate.Status.ARCHIVED})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.template.refresh_from_db()
        self.assertEqual(self.template.status, LetterTemplate.Status.ARCHIVED)
        self.assertEqual(self.template.content, "Dear {{STUDENT_NAME}} ({{STUDENT_ID}})")
        self.assertEqual(self._student_sees(), (False, status.HTTP_403_FORBIDDEN))

        self.client.force_authenticate(self.office)
        staff_view = [t["status"] for t in self.client.get("/api/letter-templates/").data]
        self.assertIn(LetterTemplate.Status.ARCHIVED, staff_view)

    def test_restore_returns_an_archived_template_to_draft_or_active(self):
        self._patch({"status": LetterTemplate.Status.ARCHIVED})
        self.assertEqual(self._patch({"status": LetterTemplate.Status.DRAFT}).status_code, 200)
        self.assertEqual(self._student_sees(), (False, status.HTTP_403_FORBIDDEN))
        self.assertEqual(self._patch({"status": LetterTemplate.Status.ACTIVE}).status_code, 200)
        self.assertEqual(self._student_sees(), (True, status.HTTP_200_OK))

    def test_students_cannot_archive(self):
        response = self._patch({"status": LetterTemplate.Status.ARCHIVED}, user=self.student)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PlaceholderValidationTests(APITestCase):
    def setUp(self):
        self.office = User.objects.create_user(
            email="placeholders-office@example.test",
            password="pw-office-5503",
            full_name="Placeholder Office",
            role=User.Role.OFFICE_ADMIN,
        )
        self.client.force_authenticate(self.office)

    def _create(self, content, template_status=LetterTemplate.Status.DRAFT):
        return self.client.post(
            "/api/letter-templates/",
            {"name": "Visa Support", "status": template_status, "content": content},
            format="json",
        )

    def test_every_supported_placeholder_is_accepted(self):
        content = " ".join(f"{{{{{name}}}}}" for name in PLACEHOLDERS)
        response = self._create(content, LetterTemplate.Status.ACTIVE)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unknown_placeholders_are_rejected_on_create(self):
        response = self._create("Dear {{STUDNET_NAME}}, ref {{REFERENCE_NUMBER}} {{STUDNET_NAME}}")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["unknownPlaceholders"], ["{{STUDNET_NAME}}"])
        self.assertIn("{{STUDNET_NAME}}", response.data["content"])
        self.assertFalse(LetterTemplate.objects.exists())

    def test_malformed_placeholders_are_rejected(self):
        for content in ("Dear {{STUDENT_NAME}", "Dear {STUDENT_NAME}}", "Dear {{ student_name }}"):
            with self.subTest(content=content):
                response = self._create(content)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertTrue(response.data["malformedPlaceholders"])

    def test_unknown_placeholders_are_rejected_on_update(self):
        template = LetterTemplate.objects.create(
            name="Existing", status=LetterTemplate.Status.DRAFT, content="Dear {{STUDENT_NAME}}"
        )
        response = self.client.patch(
            f"/api/letter-templates/{template.pk}/",
            {"content": "Dear {{STUDENT_NAMES}}"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["unknownPlaceholders"], ["{{STUDENT_NAMES}}"])
        template.refresh_from_db()
        self.assertEqual(template.content, "Dear {{STUDENT_NAME}}")

    def test_a_legacy_template_with_a_bad_tag_can_be_archived_but_not_published(self):
        template = LetterTemplate.objects.create(
            name="Legacy", status=LetterTemplate.Status.DRAFT, content="Dear {{OLD_TAG}}"
        )
        url = f"/api/letter-templates/{template.pk}/"
        archived = self.client.patch(url, {"status": LetterTemplate.Status.ARCHIVED}, format="json")
        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        published = self.client.patch(url, {"status": LetterTemplate.Status.ACTIVE}, format="json")
        self.assertEqual(published.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(published.data["unknownPlaceholders"], ["{{OLD_TAG}}"])

    def test_placeholder_catalogue_lists_every_tag_and_needs_authentication(self):
        response = self.client.get("/api/letter-templates/placeholders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["name"] for item in response.data], list(PLACEHOLDERS))
        self.assertEqual(response.data[0]["tag"], "{{STUDENT_NAME}}")
        self.assertTrue(all(item["label"] and item["source"] for item in response.data))

        self.client.force_authenticate(None)
        anonymous = self.client.get("/api/letter-templates/placeholders/")
        self.assertEqual(anonymous.status_code, status.HTTP_401_UNAUTHORIZED)
