"""Student Registry API coverage: role gating, read shape, and updates."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Student, StudentRegistry

User = get_user_model()


class StudentRegistryApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            email="registry-admin@example.test",
            password="pw-admin-7781",
            full_name="Registry Admin",
            role=User.Role.OFFICE_ADMIN,
        )
        cls.lecturer = User.objects.create_user(
            email="registry-lect@example.test",
            password="pw-lect-7782",
            full_name="Some Lecturer",
            role=User.Role.LECTURER,
        )
        cls.student_user = User.objects.create_user(
            email="wga210045@example.test",
            password="pw-stud-7783",
            full_name="Aisyah binti Rahman",
            role=User.Role.STUDENT,
            phone="012-1112222",
        )
        cls.student = Student.objects.create(
            user=cls.student_user,
            matric_no="DEMO-WGA210045",
            programme="MASTER OF DATA SCIENCE (COURSEWORK)",
            status=Student.Status.ACTIVE,
            intake_semester="Semester 1, 2025/2026",
        )

    # ── Role gating ──────────────────────────────────────────────────────────

    def test_anonymous_is_denied(self):
        response = self.client.get("/api/registry/students/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_lecturer_is_forbidden(self):
        self.client.force_authenticate(self.lecturer)
        response = self.client.get("/api/registry/students/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_read_the_registry(self):
        self.client.force_authenticate(self.student_user)
        response = self.client.get("/api/registry/students/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_patch_own_record(self):
        self.client.force_authenticate(self.student_user)
        response = self.client.patch(
            f"/api/registry/students/{self.student.matric_no}/",
            {"academicStatus": Student.Status.ACTIVE},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── Read shape ───────────────────────────────────────────────────────────

    def test_admin_lists_records_in_frontend_shape(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/registry/students/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record = next(r for r in response.data if r["id"] == self.student.matric_no)
        for key in (
            "id", "name", "avatarText", "avatarBg", "programme", "academicStatus",
            "accountStatus", "semester", "email", "phone", "supervisor", "intakeDate",
        ):
            self.assertIn(key, record)
        self.assertEqual(record["name"], "Aisyah binti Rahman")
        self.assertEqual(record["avatarText"], "AB")
        self.assertEqual(record["accountStatus"], "Verified")

    def test_search_filters_by_matric_and_name(self):
        self.client.force_authenticate(self.admin)
        hit = self.client.get("/api/registry/students/?search=WGA210045")
        self.assertEqual(len(hit.data), 1)
        miss = self.client.get("/api/registry/students/?search=zzzznotpresent")
        self.assertEqual(len(miss.data), 0)

    def test_detail_returns_404_for_unknown_matric(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/registry/students/NOT-A-STUDENT/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_supervisor_is_blank_not_guessed(self):
        """The supervisor relationship belongs to the appointments module."""
        self.client.force_authenticate(self.admin)
        response = self.client.get(f"/api/registry/students/{self.student.matric_no}/")
        self.assertEqual(response.data["supervisor"], "")

    # ── Updates ──────────────────────────────────────────────────────────────

    def test_admin_updates_programme_and_status(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/registry/students/{self.student.matric_no}/",
            {
                "programme": "MASTER OF CYBER SECURITY (COURSEWORK)",
                "academicStatus": Student.Status.DEFERRED,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.programme, "MASTER OF CYBER SECURITY (COURSEWORK)")
        self.assertEqual(self.student.status, Student.Status.DEFERRED)

    def test_account_status_toggles_user_active_flag(self):
        self.client.force_authenticate(self.admin)
        self.client.patch(
            f"/api/registry/students/{self.student.matric_no}/",
            {"accountStatus": "Suspended"},
        )
        self.student_user.refresh_from_db()
        self.assertFalse(self.student_user.is_active)

    def test_semester_creates_registry_row_on_demand(self):
        self.assertFalse(StudentRegistry.objects.filter(student=self.student).exists())
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/registry/students/{self.student.matric_no}/",
            {"semester": "Semester 2, 2025/2026"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["semester"], "Semester 2, 2025/2026")
        self.assertTrue(StudentRegistry.objects.filter(student=self.student).exists())

    def test_invalid_academic_status_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/registry/students/{self.student.matric_no}/",
            {"academicStatus": "Graduated Yesterday"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.student.refresh_from_db()
        self.assertEqual(self.student.status, Student.Status.ACTIVE)

    def test_matric_number_is_not_writable(self):
        """Send a valid field too, so the request definitely performs a write."""
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/registry/students/{self.student.matric_no}/",
            {
                "id": "DEMO-CHANGED",
                "matric_no": "DEMO-CHANGED",
                "programme": "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.matric_no, "DEMO-WGA210045")
        self.assertEqual(
            self.student.programme, "MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)"
        )

    def test_case_variant_matric_numbers_are_refused_not_guessed(self):
        """Two matrics differing only by case must not silently edit one of them."""
        twin_user = User.objects.create_user(
            email="twin@example.test",
            password="pw-twin-3391",
            full_name="Case Twin",
            role=User.Role.STUDENT,
        )
        Student.objects.create(
            user=twin_user,
            matric_no=self.student.matric_no.lower(),
            programme="MASTER OF DATA SCIENCE (COURSEWORK)",
            status=Student.Status.ACTIVE,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/registry/students/{self.student.matric_no}/",
            {"accountStatus": "Suspended"},
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.student_user.refresh_from_db()
        twin_user.refresh_from_db()
        self.assertTrue(self.student_user.is_active)
        self.assertTrue(twin_user.is_active)

    def test_admin_cannot_suspend_their_own_account(self):
        admin_student = Student.objects.create(
            user=self.admin,
            matric_no="DEMO-ADMIN-STUDENT",
            programme="MASTER OF DATA SCIENCE (COURSEWORK)",
            status=Student.Status.ACTIVE,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/registry/students/{admin_student.matric_no}/",
            {"accountStatus": "Suspended"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_cannot_suspend_a_superuser(self):
        root = User.objects.create_user(
            email="root@example.test",
            password="pw-root-8812",
            full_name="Root Account",
            role=User.Role.STUDENT,
        )
        root.is_superuser = True
        root.save(update_fields=["is_superuser"])
        Student.objects.create(
            user=root,
            matric_no="DEMO-ROOT",
            programme="MASTER OF DATA SCIENCE (COURSEWORK)",
            status=Student.Status.ACTIVE,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            "/api/registry/students/DEMO-ROOT/", {"accountStatus": "Suspended"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        root.refresh_from_db()
        self.assertTrue(root.is_active)

    # ── Registration ─────────────────────────────────────────────────────────

    NEW_STUDENT = {
        "id": "DEMO-WGA260001",
        "name": "Nurul Huda binti Kamal",
        "email": "wga260001@example.test",
        "programme": "MASTER OF DATA SCIENCE (COURSEWORK)",
        "phone": "011-2223333",
        "semester": "Semester 1, 2026/2027",
    }

    def test_admin_registers_a_student(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/registry/students/", self.NEW_STUDENT)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["id"], "DEMO-WGA260001")
        self.assertEqual(response.data["accountStatus"], "Verified")
        self.assertEqual(response.data["semester"], "Semester 1, 2026/2027")

        created = Student.objects.get(matric_no="DEMO-WGA260001")
        self.assertEqual(created.user.role, User.Role.STUDENT)
        self.assertEqual(created.user.phone, "011-2223333")

    def test_registered_account_has_no_usable_password(self):
        """The office never handles a temporary credential."""
        self.client.force_authenticate(self.admin)
        self.client.post("/api/registry/students/", self.NEW_STUDENT)
        created = Student.objects.get(matric_no="DEMO-WGA260001")
        self.assertFalse(created.user.has_usable_password())

        # No password can authenticate an unusable-password account.
        for attempt in ("", "password", "DEMO-WGA260001", "changeme123"):
            login = self.client.post(
                "/api/auth/login/",
                {"identifier": self.NEW_STUDENT["email"], "password": attempt},
            )
            self.assertIn(
                login.status_code,
                (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED),
                msg=f"password {attempt!r} unexpectedly authenticated",
            )

    def test_duplicate_matric_is_rejected_case_insensitively(self):
        self.client.force_authenticate(self.admin)
        payload = {**self.NEW_STUDENT, "id": self.student.matric_no.lower()}
        response = self.client.post("/api/registry/students/", payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_email_is_rejected(self):
        self.client.force_authenticate(self.admin)
        payload = {**self.NEW_STUDENT, "email": self.student_user.email.upper()}
        response = self.client.post("/api/registry/students/", payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Student.objects.filter(matric_no="DEMO-WGA260001").exists())

    def test_failed_registration_leaves_no_orphan_user(self):
        """User + Student are created in one transaction."""
        before = User.objects.count()
        self.client.force_authenticate(self.admin)
        self.client.post(
            "/api/registry/students/", {**self.NEW_STUDENT, "id": ""}
        )
        self.assertEqual(User.objects.count(), before)

    def test_non_admin_cannot_register(self):
        self.client.force_authenticate(self.lecturer)
        response = self.client.post("/api/registry/students/", self.NEW_STUDENT)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Student.objects.filter(matric_no="DEMO-WGA260001").exists())

    def test_anonymous_cannot_register(self):
        response = self.client.post("/api/registry/students/", self.NEW_STUDENT)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_registration_rejects_invalid_academic_status(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/registry/students/",
            {**self.NEW_STUDENT, "academicStatus": "Enrolled Forever"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registered_student_can_start_a_password_reset(self):
        """Registration relies on the reset flow to set the first password."""
        self.client.force_authenticate(self.admin)
        self.client.post("/api/registry/students/", self.NEW_STUDENT)
        self.client.force_authenticate(None)
        response = self.client.post(
            "/api/auth/password-reset/", {"email": self.NEW_STUDENT["email"]}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_is_staff_flag_alone_does_not_grant_registry_access(self):
        self.lecturer.is_staff = True
        self.lecturer.save(update_fields=["is_staff"])
        self.client.force_authenticate(self.lecturer)
        response = self.client.get("/api/registry/students/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
