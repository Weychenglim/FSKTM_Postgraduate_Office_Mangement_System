"""The office corrects a student's name or email from the registry."""
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Student
from .tokens import activation_link, password_link_kind

User = get_user_model()


class StudentNameAndEmailTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.office = User.objects.create_user(
            email="identity-office@example.test", password="pw-office-5521", full_name="Identity Office",
            role=User.Role.OFFICE_ADMIN, is_staff=True,
        )
        cls.active_user = User.objects.create_user(
            email="old.address@example.test", password="pw-student-5522", full_name="Nur Aisyh",
            role=User.Role.STUDENT,
        )
        cls.active = Student.objects.create(user=cls.active_user, matric_no="ID-0001", programme="MASTER OF DATA SCIENCE (COURSEWORK)")
        cls.waiting_user = User(email="typo@exmple.test", full_name="Waiting Student", role=User.Role.STUDENT)
        cls.waiting_user.set_unusable_password()
        cls.waiting_user.save()
        cls.waiting = Student.objects.create(user=cls.waiting_user, matric_no="ID-0002", programme="MASTER OF DATA SCIENCE (COURSEWORK)")

    def setUp(self):
        self.client.force_authenticate(self.office)

    def patch(self, student, **fields):
        return self.client.patch(f"/api/registry/students/{student.matric_no}/", fields, format="json")

    def test_a_misspelt_name_can_be_corrected(self):
        response = self.patch(self.active, name="  Nur Aisyah binti Rahman  ")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Nur Aisyah binti Rahman")
        self.assertEqual(response.data["avatarText"], "NA")
        self.assertNotIn("oldAddressTold", response.data)

    def test_a_blank_name_is_refused(self):
        response = self.patch(self.active, name="   ")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_an_email_already_in_use_is_refused(self):
        response = self.patch(self.waiting, email="IDENTITY-OFFICE@example.test")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["email"], ["An account with this email already exists."])
        self.waiting_user.refresh_from_db()
        self.assertEqual(self.waiting_user.email, "typo@exmple.test")

    def test_an_activated_students_old_address_is_told(self):
        response = self.patch(self.active, email="New.Address@Example.test")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "new.address@example.test")
        self.assertIs(response.data["oldAddressTold"], True)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["old.address@example.test"])
        self.assertIn("new.address@example.test", mail.outbox[0].body)
        self.assertTrue(self.client.post(
            "/api/auth/login/", {"identifier": "new.address@example.test", "password": "pw-student-5522"}, format="json"
        ).status_code == status.HTTP_200_OK)

    def test_fixing_an_unactivated_students_typo_ends_the_old_link(self):
        link = activation_link(self.waiting_user)
        token = link.split("token=")[1]
        self.assertEqual(password_link_kind(self.waiting_user, token), "activation")
        response = self.patch(self.waiting, email="right@example.test")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["oldAddressTold"])
        self.assertEqual(len(mail.outbox), 0)
        self.waiting_user.refresh_from_db()
        self.assertIsNone(password_link_kind(self.waiting_user, token))

    def test_the_same_email_in_other_letters_is_no_change(self):
        response = self.patch(self.active, email="OLD.ADDRESS@example.test")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("oldAddressTold", response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_the_matric_number_still_cannot_be_changed(self):
        response = self.patch(self.active, id="ID-9999")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_lecturer_cannot_change_a_name(self):
        lecturer = User.objects.create_user(email="identity-lect@example.test", password="pw-lect-5523", full_name="L", role=User.Role.LECTURER)
        self.client.force_authenticate(lecturer)
        self.assertEqual(self.patch(self.active, name="Changed").status_code, status.HTTP_403_FORBIDDEN)
