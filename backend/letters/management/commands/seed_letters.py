"""Seed a starter set of official letter templates.

Idempotent: re-running updates the existing rows (matched by name) instead of
creating duplicates. The body text uses the same ``{{PLACEHOLDER}}`` tags the
frontend substitutes when a student generates a letter:

    {{STUDENT_NAME}} {{STUDENT_ID}} {{PROGRAMME_NAME}} {{CURRENT_STATUS}}
    {{SUPERVISOR_NAME}} {{REFERENCE_NUMBER}} {{CURRENT_DATE}}
"""
from django.core.management.base import BaseCommand

from letters.models import LetterTemplate

TEMPLATES = [
    {
        "name": "Confirmation of Enrolment",
        "letter_type": "Academic Certification",
        "status": LetterTemplate.Status.ACTIVE,
        "reference_prefix": "UMF/PG/ENR",
        "description": "Official status verification for currently registered students.",
        "content": (
            "To Whom It May Concern,\n\n"
            "This is to certify that {{STUDENT_NAME}} (Matric No: {{STUDENT_ID}}) is a "
            "bona fide postgraduate student at the Faculty of Computer Science & "
            "Information Technology, Universiti Malaya.\n\n"
            "The student is currently pursuing the {{PROGRAMME_NAME}} and their present "
            "registration status is {{CURRENT_STATUS}}. This letter is issued upon the "
            "student's request for official purposes.\n\n"
            "Should you require any further verification, please contact the "
            "Postgraduate Office at +603-7967 6300."
        ),
    },
    {
        "name": "Visa Support Letter",
        "letter_type": "Visa & Immigration",
        "status": LetterTemplate.Status.ACTIVE,
        "reference_prefix": "UMF/PG/VS",
        "description": "Embassy-ready documentation supporting a student visa application.",
        "content": (
            "To Whom It May Concern,\n\n"
            "This letter is issued to support the student visa application of "
            "{{STUDENT_NAME}} (Matric No: {{STUDENT_ID}}) with the Immigration "
            "Department of Malaysia.\n\n"
            "{{STUDENT_NAME}} is a full-time candidate of the {{PROGRAMME_NAME}} and is "
            "currently {{CURRENT_STATUS}}. The Faculty fully supports the continuation "
            "of their studies and requests that the necessary visa facilities be "
            "extended to the candidate."
        ),
    },
    {
        "name": "Supervisor Confirmation Letter",
        "letter_type": "Academic Certification",
        "status": LetterTemplate.Status.ACTIVE,
        "reference_prefix": "UMF/PG/SUP",
        "description": "Confirms the student's appointed research supervisor.",
        "content": (
            "To Whom It May Concern,\n\n"
            "This is to confirm that {{STUDENT_NAME}} (Matric No: {{STUDENT_ID}}), a "
            "candidate of the {{PROGRAMME_NAME}}, is currently under the supervision of "
            "{{SUPERVISOR_NAME}} at the Faculty of Computer Science & Information "
            "Technology, Universiti Malaya.\n\n"
            "The candidate's registration status is {{CURRENT_STATUS}}."
        ),
    },
    {
        "name": "Completion Letter",
        "letter_type": "Academic Certification",
        "status": LetterTemplate.Status.DRAFT,
        "reference_prefix": "UMF/PG/CMP",
        "description": "Proof of degree fulfilment, issued after the viva.",
        "content": (
            "To Whom It May Concern,\n\n"
            "We are pleased to verify that {{STUDENT_NAME}} (Matric No: {{STUDENT_ID}}) "
            "has satisfactorily fulfilled all academic requirements for the "
            "{{PROGRAMME_NAME}}.\n\n"
            "The final Senate approval is pending formal conferral at the upcoming "
            "university graduation ceremony."
        ),
    },
]


class Command(BaseCommand):
    help = "Seed / update the default letter templates."

    def handle(self, *args, **options):
        for data in TEMPLATES:
            obj, created = LetterTemplate.objects.update_or_create(
                name=data["name"],
                defaults={**data, "modified_by": "System Seed"},
            )
            verb = "Created" if created else "Updated"
            self.stdout.write(f"  {verb} {obj.status:7} {obj.name}")
        self.stdout.write(self.style.SUCCESS("\nLetter templates ready."))
