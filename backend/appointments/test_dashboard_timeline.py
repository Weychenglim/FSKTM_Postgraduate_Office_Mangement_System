from datetime import date
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from openpyxl import Workbook


User = get_user_model()


REQUIRED_HEADERS = [
    "Level",
    "Step",
    "Detail",
    "Action",
    "Deadline Start",
    "Deadline End",
    "Week Label",
    "Target Roles",
    "Status",
]


def workbook_upload(rows, headers=None, filename="timeline.xlsx"):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Timeline"
    sheet.append(headers or REQUIRED_HEADERS)
    for row in rows:
        sheet.append(row)
    stream = BytesIO()
    workbook.save(stream)
    stream.seek(0)
    return SimpleUploadedFile(
        filename,
        stream.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


class DashboardTimelineApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="office@example.com",
            password="password123",
            full_name="Office Staff",
            role=User.Role.OFFICE_ADMIN,
            staff_id="A10001",
        )
        self.student = User.objects.create_user(
            email="student-timeline@example.com",
            password="password123",
            full_name="Timeline Student",
            role=User.Role.STUDENT,
            student_id="S10001",
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def valid_rows(self):
        return [
            [
                "P1",
                1,
                "Submit appointment of supervisor forms",
                "Student / Supervisor",
                date(2026, 3, 16),
                date(2026, 3, 20),
                "Week 2",
                "STUDENT,LECTURER",
                "Upcoming",
            ],
            [
                "P1",
                3,
                "Office informs students and supervisors of step 2 decision",
                "TDIT Office",
                date(2026, 4, 3),
                date(2026, 4, 3),
                "",
                "OFFICE_STAFF",
                "Deadline",
            ],
            [
                "P2",
                1,
                "Final presentation",
                "Student / Supervisor / Examiner",
                date(2026, 6, 8),
                date(2026, 7, 3),
                "Week 13 - 15",
                "STUDENT,LECTURER",
                "Upcoming",
            ],
        ]

    def test_active_timeline_returns_not_available_payload_when_no_active_timeline_exists(self):
        self.authenticate(self.student)

        response = self.client.get("/api/dashboard/timeline/active/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["available"], False)
        self.assertEqual(response.data["message"], "No timeline available at now")
        self.assertEqual(response.data["levels"], [])

    def test_only_office_admin_can_download_template_and_upload_timeline(self):
        self.authenticate(self.student)

        template_response = self.client.get("/api/dashboard/timeline/template/")
        upload_response = self.client.post(
            "/api/dashboard/timeline/upload/",
            {"file": workbook_upload(self.valid_rows())},
            format="multipart",
        )

        self.assertEqual(template_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(upload_response.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.admin)
        admin_template = self.client.get("/api/dashboard/timeline/template/")

        self.assertEqual(admin_template.status_code, status.HTTP_200_OK)
        self.assertIn("spreadsheetml.sheet", admin_template["Content-Type"])
        self.assertIn("FSKTM_Semester_Timeline_Template.xlsx", admin_template["Content-Disposition"])

    def test_valid_upload_creates_active_grouped_timeline_and_audit_log(self):
        self.authenticate(self.admin)

        response = self.client.post(
            "/api/dashboard/timeline/upload/",
            {
                "semester": "Semester II",
                "session": "2025/2026",
                "file": workbook_upload(self.valid_rows(), filename="sem2-timeline.xlsx"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["importedCount"], 3)
        self.assertEqual(response.data["timeline"]["semester"], "Semester II")
        self.assertEqual(response.data["timeline"]["session"], "2025/2026")
        self.assertEqual(response.data["timeline"]["levels"][0]["level"], "P1")
        self.assertEqual(len(response.data["timeline"]["levels"][0]["entries"]), 2)
        self.assertEqual(response.data["timeline"]["levels"][1]["level"], "P2")

        active = self.client.get("/api/dashboard/timeline/active/")
        self.assertEqual(active.status_code, status.HTTP_200_OK)
        self.assertEqual(active.data["available"], True)
        self.assertEqual(active.data["levels"][0]["entries"][0]["step"], 1)
        self.assertEqual(active.data["levels"][0]["entries"][0]["targetRoles"], ["STUDENT", "LECTURER"])

        from dashboard.models import TimelineAuditLog

        self.assertEqual(TimelineAuditLog.objects.count(), 1)
        self.assertEqual(TimelineAuditLog.objects.first().action, "UPLOAD")

    def test_invalid_upload_reports_template_errors(self):
        self.authenticate(self.admin)

        response = self.client.post(
            "/api/dashboard/timeline/upload/",
            {
                "file": workbook_upload(
                    [["P1", 1, "Missing required fields"]],
                    headers=["Level", "Step", "Detail"],
                    filename="bad-template.xlsx",
                )
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)
        self.assertTrue(any("Missing required columns" in error for error in response.data["errors"]))

    def test_upload_rejects_duplicate_level_step_and_invalid_date_range(self):
        self.authenticate(self.admin)

        response = self.client.post(
            "/api/dashboard/timeline/upload/",
            {
                "file": workbook_upload(
                    [
                        [
                            "P1",
                            1,
                            "First row",
                            "Student",
                            date(2026, 3, 20),
                            date(2026, 3, 16),
                            "Week 2",
                            "STUDENT",
                            "Upcoming",
                        ],
                        [
                            "P1",
                            1,
                            "Duplicate row",
                            "Student",
                            date(2026, 3, 21),
                            date(2026, 3, 21),
                            "Week 2",
                            "STUDENT",
                            "Upcoming",
                        ],
                    ],
                    filename="conflicting-template.xlsx",
                )
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(any("duplicates Level P1 Step 1" in error for error in response.data["errors"]))
        self.assertTrue(any("Deadline End cannot be before Deadline Start" in error for error in response.data["errors"]))

    def test_upload_replaces_previous_active_timeline(self):
        self.authenticate(self.admin)
        first = self.client.post(
            "/api/dashboard/timeline/upload/",
            {"semester": "Semester I", "session": "2025/2026", "file": workbook_upload(self.valid_rows())},
            format="multipart",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            "/api/dashboard/timeline/upload/",
            {
                "semester": "Semester II",
                "session": "2025/2026",
                "file": workbook_upload(
                    [["P2", 3, "Marks entry", "Student / Examiner", date(2026, 6, 8), date(2026, 7, 10), "Week 13 - 16", "STUDENT,LECTURER", "Active"]],
                    filename="replacement.xlsx",
                ),
            },
            format="multipart",
        )

        self.assertEqual(second.status_code, status.HTTP_201_CREATED)

        from dashboard.models import SemesterTimeline

        self.assertEqual(SemesterTimeline.objects.count(), 2)
        self.assertEqual(SemesterTimeline.objects.filter(is_active=True).count(), 1)
        self.assertEqual(SemesterTimeline.objects.get(is_active=True).semester, "Semester II")

    def test_office_admin_can_patch_timeline_entry_and_audit_change(self):
        self.authenticate(self.admin)
        upload = self.client.post(
            "/api/dashboard/timeline/upload/",
            {"file": workbook_upload(self.valid_rows())},
            format="multipart",
        )
        entry_id = upload.data["timeline"]["levels"][0]["entries"][0]["id"]

        response = self.client.patch(
            f"/api/dashboard/timeline/entries/{entry_id}/",
            {"status": "Active", "weekLabel": "Week 2 - Updated"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "Active")
        self.assertEqual(response.data["weekLabel"], "Week 2 - Updated")

        from dashboard.models import TimelineAuditLog

        self.assertTrue(TimelineAuditLog.objects.filter(action="EDIT_ENTRY").exists())

    def test_office_staff_tasks_include_timeline_owner_tasks(self):
        self.authenticate(self.admin)
        upload = self.client.post(
            "/api/dashboard/timeline/upload/",
            {"file": workbook_upload(self.valid_rows())},
            format="multipart",
        )
        self.assertEqual(upload.status_code, status.HTTP_201_CREATED)

        response = self.client.get("/api/dashboard/tasks/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task_names = [task["name"] for task in response.data["tasks"]]
        self.assertIn("Office informs students and supervisors of step 2 decision", task_names)
        self.assertIn("Upload semester timeline", task_names)
