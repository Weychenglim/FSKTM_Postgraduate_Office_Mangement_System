"""Looking after FAQ entries (C1): office-only editing, statuses, links and history."""
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User

from .models import FaqAltQuestion, FaqCategory, FaqChange, FaqEntry

Status = FaqEntry.Status
ENTRIES = "/api/faq/entries/"


def url(entry, step=""):
    return f"{ENTRIES}{entry.pk}/{step}"


class FaqBase(APITestCase):
    def setUp(self):
        self.office = User.objects.create_user(
            email="faq-office@example.test", password="pw-faq-1", full_name="Faq Office",
            role=User.Role.OFFICE_ADMIN, is_staff=True,
        )
        self.client.force_authenticate(self.office)
        self.registration = FaqCategory.objects.create(name="Course registration", position=1)
        self.semester = FaqCategory.objects.create(name="During the semester", position=2)

    def entry(self, question="How do I register courses?", answer="Register in MAYA.", state=Status.PUBLISHED, **fields):
        return FaqEntry.objects.create(question=question, answer=answer, category=self.registration, status=state, **fields)

    def actions(self, entry):
        return [change.action for change in FaqChange.objects.filter(entry=entry).order_by("created_at", "pk")]


class OfficeOnlyTests(FaqBase):
    def test_only_the_office_manages_the_faq(self):
        entry = self.entry()
        others = [
            User.objects.create_user(email=f"faq-{role.split()[0].lower()}@example.test", password="pw", full_name=role, role=role)
            for role in (User.Role.STUDENT, User.Role.LECTURER, User.Role.COORDINATOR)
        ]
        calls = [
            ("get", ENTRIES), ("post", ENTRIES), ("get", url(entry)), ("patch", url(entry)), ("delete", url(entry)),
            ("post", url(entry, "archive/")), ("get", "/api/faq/categories/"), ("post", "/api/faq/categories/"),
            ("get", "/api/faq/review-list/"),
        ]
        for user in others:
            self.client.force_authenticate(user)
            for method, path in calls:
                with self.subTest(role=user.role, path=path, method=method):
                    response = getattr(self.client, method)(path, {"answer": "Hacked", "name": "X"}, format="json")
                    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        entry.refresh_from_db()
        self.assertEqual((entry.answer, entry.status), ("Register in MAYA.", Status.PUBLISHED))
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(ENTRIES).status_code, status.HTTP_401_UNAUTHORIZED)


class CreateAndEditTests(FaqBase):
    def test_a_new_entry_starts_as_a_draft(self):
        response = self.client.post(
            ENTRIES,
            {"question": "  When is   add and drop? ", "answer": "In week 1.", "category": str(self.registration.pk), "altQuestions": ["add drop date"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["status"], "DRAFT")
        self.assertEqual(response.data["question"], "When is add and drop?")
        self.assertEqual(response.data["altQuestions"], ["add drop date"])
        entry = FaqEntry.objects.get(pk=response.data["id"])
        self.assertEqual(entry.updated_by, self.office)
        self.assertEqual(self.actions(entry), [FaqChange.Action.CREATED])
        self.assertNotIn(entry, FaqEntry.objects.published())

    def test_publishing_needs_a_question_and_an_answer(self):
        response = self.client.post(ENTRIES, {"question": "Fees?", "category": str(self.registration.pk), "publish": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["answer"], ["Write the answer before publishing."])
        response = self.client.post(
            ENTRIES, {"question": "Fees?", "answer": "See the fee page.", "category": str(self.registration.pk), "publish": True}, format="json"
        )
        self.assertEqual(response.data["status"], "PUBLISHED")

    def test_a_category_is_needed(self):
        response = self.client.post(ENTRIES, {"question": "Q", "answer": "A"}, format="json")
        self.assertEqual(response.data["category"], ["Choose a category."])
        response = self.client.post(ENTRIES, {"question": "Q", "answer": "A", "category": "999"}, format="json")
        self.assertEqual(response.data["category"], ["Choose a category."])

    def test_only_safe_links_are_allowed_in_answers(self):
        entry = self.entry()
        for answer in ("[Click](javascript:alert(1))", "[x](//evil.example)", "[x](data:text/html,hi)"):
            with self.subTest(answer=answer):
                response = self.client.patch(url(entry), {"answer": answer}, format="json")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("can't be used", response.data["answer"][0])
        good = "See [the fee page](https://um.edu.my/fees), [email us](mailto:pgoffice@um.edu.my) or [your files](/files)."
        response = self.client.patch(url(entry), {"answer": good}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["answer"], good)

    def test_other_ways_of_asking_are_tidied(self):
        entry = self.entry()
        response = self.client.patch(
            url(entry),
            {"altQuestions": ["course reg", "  Course   REG ", "", "How do I register courses?", "daftar kursus"]},
            format="json",
        )
        self.assertEqual(response.data["altQuestions"], ["course reg", "daftar kursus"])
        response = self.client.patch(url(entry), {"altQuestions": ["daftar kursus"]}, format="json")
        self.assertEqual(response.data["altQuestions"], ["daftar kursus"])
        self.assertEqual(FaqAltQuestion.objects.filter(entry=entry).count(), 1)
        edits = FaqChange.objects.filter(entry=entry, action=FaqChange.Action.EDITED)
        self.assertEqual([change.details for change in edits], [{"fields": ["other ways students ask"]}] * 2)

    def test_edits_are_logged_field_by_field(self):
        entry = self.entry()
        response = self.client.patch(
            url(entry), {"question": "How do I register?", "category": str(self.semester.pk), "portalLink": "FILES"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["category"]["name"], "During the semester")
        self.assertEqual(response.data["portalLink"], "FILES")
        change = FaqChange.objects.get(entry=entry)
        self.assertEqual(change.details, {"fields": ["question", "category", "portal button"]})
        self.assertEqual(change.question, "How do I register?")
        self.client.patch(url(entry), {"question": "How do I register?"}, format="json")
        self.assertEqual(FaqChange.objects.filter(entry=entry).count(), 1)

    def test_a_published_entry_keeps_its_answer(self):
        entry = self.entry()
        response = self.client.patch(url(entry), {"answer": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        entry.refresh_from_db()
        self.assertEqual(entry.answer, "Register in MAYA.")

    def test_status_is_changed_only_by_the_actions(self):
        entry = self.entry(state=Status.DRAFT)
        response = self.client.patch(url(entry), {"status": "PUBLISHED"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Publish", response.data["status"][0])
        self.assertEqual(self.client.patch(url(entry), {"portalLink": "ELSEWHERE"}, format="json").status_code, 400)


class StatusTests(FaqBase):
    def test_checking_an_imported_entry(self):
        entry = self.entry(state=Status.NEEDS_CHECKING, source_ref="row-1", source_text="PDF text")
        response = self.client.post(url(entry, "checked/"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["status"], "DRAFT")
        self.assertEqual(response.data["checkedBy"], "Faq Office")
        self.assertEqual(response.data["source"], {"text": "PDF text", "note": "", "page": None})
        self.assertEqual(self.client.post(url(entry, "publish/")).data["status"], "PUBLISHED")
        self.assertEqual(self.actions(entry), [FaqChange.Action.CHECKED, FaqChange.Action.PUBLISHED])

    def test_publishing_straight_from_needs_checking_counts_as_checked(self):
        entry = self.entry(state=Status.NEEDS_CHECKING)
        response = self.client.post(url(entry, "publish/"))
        self.assertEqual(response.data["status"], "PUBLISHED")
        entry.refresh_from_db()
        self.assertEqual(entry.checked_by, self.office)

    def test_archive_and_restore(self):
        entry = self.entry()
        self.assertEqual(self.client.post(url(entry, "archive/")).data["status"], "ARCHIVED")
        self.assertNotIn(entry, FaqEntry.objects.published())
        self.assertEqual(self.client.post(url(entry, "restore/")).data["status"], "DRAFT")
        self.assertEqual(self.actions(entry), [FaqChange.Action.ARCHIVED, FaqChange.Action.RESTORED])

    def test_steps_that_do_not_fit_are_refused(self):
        entry = self.entry()
        for step in ("checked/", "restore/", "publish/"):
            with self.subTest(step=step):
                response = self.client.post(url(entry, step))
                self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(self.client.post(url(entry, "explode/")).status_code, status.HTTP_404_NOT_FOUND)
        blank = self.entry(question="", answer="", state=Status.NEEDS_CHECKING)
        response = self.client.post(url(blank, "publish/"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("question", response.data)

    def test_delete_keeps_a_history_line(self):
        entry = self.entry()
        response = self.client.delete(url(entry))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(FaqEntry.objects.filter(pk=entry.pk).exists())
        change = FaqChange.objects.get(action=FaqChange.Action.DELETED)
        self.assertIsNone(change.entry)
        self.assertEqual(change.question, "How do I register courses?")
        self.assertEqual(change.actor_name, "Faq Office")
        self.assertEqual(self.client.delete(url(entry)).status_code, status.HTTP_404_NOT_FOUND)

    def test_history_cannot_be_changed(self):
        entry = self.entry()
        self.client.post(url(entry, "archive/"))
        change = FaqChange.objects.get()
        change.details = {"forged": True}
        with self.assertRaises(ValidationError):
            change.save()
        with self.assertRaises(ValidationError):
            change.delete()

    def test_the_entry_page_shows_its_history(self):
        entry = self.entry()
        self.client.post(url(entry, "archive/"))
        data = self.client.get(url(entry)).data
        self.assertEqual([row["action"] for row in data["history"]], ["ARCHIVED"])
        self.assertEqual(data["history"][0]["actor"], "Faq Office")


class ListTests(FaqBase):
    def setUp(self):
        super().setUp()
        self.reg = self.entry()
        self.fees = self.entry(question="How much are the fees?", answer="See the fee schedule.")
        self.draft = self.entry(question="Can I defer?", answer="Ask the office.", state=Status.DRAFT)
        self.check = self.entry(question="Weekend classes?", answer="", state=Status.NEEDS_CHECKING)
        self.check.category = self.semester
        self.check.save()
        FaqAltQuestion.objects.create(entry=self.fees, text="yuran pengajian")

    def questions(self, query=""):
        response = self.client.get(f"{ENTRIES}{query}")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return [row["question"] for row in response.data["results"]]

    def test_filters_and_counts(self):
        response = self.client.get(ENTRIES)
        self.assertEqual(response.data["count"], 4)
        self.assertEqual(response.data["statusCounts"], {"PUBLISHED": 2, "DRAFT": 1, "NEEDS_CHECKING": 1, "ARCHIVED": 0})
        self.assertEqual(self.questions("?status=needs_checking"), ["Weekend classes?"])
        fees = next(row for row in response.data["results"] if row["question"] == "How much are the fees?")
        self.assertEqual(fees["altCount"], 1)
        self.assertEqual(self.questions("?search=yuran"), ["How much are the fees?"])
        self.assertEqual(self.questions(f"?category={self.semester.pk}"), ["Weekend classes?"])
        self.assertEqual(self.client.get(f"{ENTRIES}?status=published&search=fee").data["statusCounts"]["PUBLISHED"], 1)
        self.assertEqual(self.client.get(f"{ENTRIES}?status=gone").status_code, status.HTTP_400_BAD_REQUEST)

    def test_pages(self):
        response = self.client.get(f"{ENTRIES}?pageSize=3&page=2")
        self.assertEqual(response.data["count"], 4)
        self.assertEqual(len(response.data["results"]), 1)


class CategoryTests(FaqBase):
    def test_categories_list_with_counts(self):
        self.entry()
        self.entry(question="Q2", state=Status.NEEDS_CHECKING)
        data = self.client.get("/api/faq/categories/").data
        self.assertEqual([row["name"] for row in data], ["Course registration", "During the semester"])
        self.assertEqual(data[0]["entries"], {"PUBLISHED": 1, "NEEDS_CHECKING": 1})

    def test_adding_and_renaming(self):
        response = self.client.post("/api/faq/categories/", {"name": "Scholarships"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["position"], 3)
        duplicate = self.client.post("/api/faq/categories/", {"name": "course REGISTRATION"}, format="json")
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        renamed = self.client.patch(f"/api/faq/categories/{response.data['id']}/", {"name": "Scholarships and loans"}, format="json")
        self.assertEqual(renamed.data["name"], "Scholarships and loans")
        clash = self.client.patch(f"/api/faq/categories/{response.data['id']}/", {"name": "During the semester"}, format="json")
        self.assertEqual(clash.status_code, status.HTTP_400_BAD_REQUEST)

    def test_the_review_list_downloads(self):
        self.entry(state=Status.NEEDS_CHECKING)
        response = self.client.get("/api/faq/review-list/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("spreadsheetml", response["Content-Type"])
        self.assertIn("faq-review-", response["Content-Disposition"])
