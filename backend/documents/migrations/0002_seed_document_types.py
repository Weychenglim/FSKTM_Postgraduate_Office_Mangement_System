"""The starting list of document types. The office can rename, change,
switch off or add types afterwards."""
from django.db import migrations

STAFF = ["SUPERVISOR", "PANEL", "COORDINATOR"]
TYPES = [
    {
        "code": "supervisor-appointment-form",
        "label": "Supervisor Appointment Form",
        "description": "The signed Registration of Dissertation/Research Project form that names the supervisor.",
        "group": "SUPERVISION",
        "kind": "STUDENT",
        "uploaders": ["STUDENT"],
        "allowed_kinds": ["PDF", "IMAGE"],
        "share": (True, False, True),
        "needs_check": True,
        "one_per_student": True,
    },
    {
        "code": "research-proposal",
        "label": "Research Proposal",
        "description": "",
        "group": "RESEARCH_PROJECT",
        "kind": "STUDENT",
        "uploaders": ["STUDENT", "SUPERVISOR"],
        "allowed_kinds": ["PDF", "DOCX"],
        "share": (True, True, True),
        "needs_check": False,
        "one_per_student": True,
    },
    {
        "code": "thesis",
        "label": "Thesis",
        "description": "Drafts and the final research project report.",
        "group": "RESEARCH_PROJECT",
        "kind": "STUDENT",
        "uploaders": ["STUDENT"],
        "allowed_kinds": ["PDF", "DOCX"],
        "share": (True, True, True),
        "needs_check": False,
        "one_per_student": True,
    },
    {
        "code": "turnitin-report",
        "label": "Turnitin Report",
        "description": "The similarity report for the thesis.",
        "group": "RESEARCH_PROJECT",
        "kind": "STUDENT",
        "uploaders": ["STUDENT", "SUPERVISOR"],
        "allowed_kinds": ["PDF"],
        "share": (True, True, True),
        "needs_check": False,
        "one_per_student": True,
    },
    {
        "code": "faculty-form",
        "label": "Faculty Form",
        "description": "For example the AI Use Declaration or a conference attendance form. Say which form in the title.",
        "group": "FORMS",
        "kind": "STUDENT",
        "uploaders": ["STUDENT"],
        "allowed_kinds": ["PDF", "DOCX", "IMAGE"],
        "share": (True, False, True),
        "needs_check": True,
        "one_per_student": False,
    },
    {
        "code": "letter",
        "label": "Letter",
        "description": "A letter from outside the portal, for example a sponsor or offer letter.",
        "group": "LETTERS",
        "kind": "STUDENT",
        "uploaders": ["STUDENT"],
        "allowed_kinds": ["PDF", "IMAGE"],
        "share": (False, False, False),
        "needs_check": False,
        "one_per_student": False,
    },
    {
        "code": "evaluation-form",
        "label": "Evaluation Form",
        "description": "An evaluation by the supervisor, panel member or coordinator.",
        "group": "EVALUATION",
        "kind": "STUDENT",
        "uploaders": STAFF,
        "allowed_kinds": ["PDF", "DOCX", "XLSX", "IMAGE"],
        "share": (True, True, True),
        "needs_check": False,
        "one_per_student": False,
    },
    {
        "code": "staff-document",
        "label": "Staff Document",
        "description": "For staff only, for example a rubric, a template or meeting notes.",
        "group": "STAFF",
        "kind": "STAFF",
        "uploaders": ["LECTURER", "COORDINATOR"],
        "allowed_kinds": ["PDF", "DOCX", "XLSX", "PPTX"],
        "share": (False, False, False),
        "needs_check": False,
        "one_per_student": False,
    },
    {
        "code": "other",
        "label": "Other",
        "description": "Anything else. Say what it is in the title.",
        "group": "OTHER",
        "kind": "BOTH",
        "uploaders": ["STUDENT", "SUPERVISOR", "PANEL", "COORDINATOR", "LECTURER"],
        "allowed_kinds": ["PDF", "DOCX", "IMAGE", "XLSX", "PPTX"],
        "share": (False, False, False),
        "needs_check": False,
        "one_per_student": False,
    },
]


def seed(apps, schema_editor):
    DocumentType = apps.get_model("documents", "DocumentType")
    for order, values in enumerate(TYPES, start=1):
        supervisors, panel, coordinator = values["share"]
        DocumentType.objects.get_or_create(
            code=values["code"],
            defaults={
                "label": values["label"],
                "description": values["description"],
                "group": values["group"],
                "kind": values["kind"],
                "uploaders": values["uploaders"],
                "allowed_kinds": values["allowed_kinds"],
                "share_supervisors": supervisors,
                "share_panel": panel,
                "share_coordinator": coordinator,
                "needs_check": values["needs_check"],
                "one_per_student": values["one_per_student"],
                "display_order": order,
            },
        )


class Migration(migrations.Migration):
    dependencies = [("documents", "0001_initial")]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
