from django.db import migrations

NAME = "Student Confirmation Letter"
OLD_NAME = "Confirmation of Enrolment"

CONTENT = (
    "{{RECIPIENT}}\n\n"
    "Dear Sir/Madam,\n\n"
    "**STUDENT CONFIRMATION LETTER**\n\n"
    "This is to confirm that the student below is registered with the Faculty of "
    "Computer Science & Information Technology, Universiti Malaya. The details are as follows:\n\n"
    "| Name | {{STUDENT_NAME}} |\n"
    "| IC/Passport Number | {{PASSPORT_NUMBER}} |\n"
    "| Matric Number | {{STUDENT_ID}} |\n"
    "| Programme | {{PROGRAMME_NAME}} |\n"
    "| Method of Study | {{MODE_OF_STUDY}} |\n"
    "| Faculty | FACULTY OF COMPUTER SCIENCE & INFORMATION TECHNOLOGY |\n"
    "| Current Semester | {{CURRENT_SEMESTER}} |\n"
    "| Date Valid | {{VALID_UNTIL}} |\n"
    "| Balance Semester (Minimum) | {{BALANCE_SEMESTERS_MIN}} |\n"
    "| Balance Semester (Maximum) | {{BALANCE_SEMESTERS_MAX}} |\n\n"
    "Thank you."
)

CONTENT_MS = (
    "{{RECIPIENT}}\n\n"
    "Tuan/Puan,\n\n"
    "**SURAT PENGESAHAN PELAJAR**\n\n"
    "Adalah disahkan bahawa pelajar berikut berdaftar dengan Fakulti Sains Komputer "
    "dan Teknologi Maklumat, Universiti Malaya. Butirannya adalah seperti berikut:\n\n"
    "| Nama | {{STUDENT_NAME}} |\n"
    "| No. K/P / Pasport | {{PASSPORT_NUMBER}} |\n"
    "| No. Matrik | {{STUDENT_ID}} |\n"
    "| Program | {{PROGRAMME_NAME}} |\n"
    "| Kaedah Pengajian | {{MODE_OF_STUDY}} |\n"
    "| Fakulti | FAKULTI SAINS KOMPUTER DAN TEKNOLOGI MAKLUMAT |\n"
    "| Semester Semasa | {{CURRENT_SEMESTER}} |\n"
    "| Tarikh Sah | {{VALID_UNTIL}} |\n"
    "| Baki Semester (Minimum) | {{BALANCE_SEMESTERS_MIN}} |\n"
    "| Baki Semester (Maksimum) | {{BALANCE_SEMESTERS_MAX}} |\n\n"
    "Sekian, terima kasih."
)


def add_confirmation_letter(apps, schema_editor):
    # Replaces the enrolment letter where there is one; a new database gets the
    # letter from seed_letters instead.
    LetterTemplate = apps.get_model("letters", "LetterTemplate")
    if not LetterTemplate.objects.filter(name=OLD_NAME).exists():
        return
    LetterTemplate.objects.get_or_create(
        name=NAME,
        defaults={
            "letter_type": "Academic Certification",
            "purpose": "REQUEST",
            "status": "Active",
            "description": "Confirms the student is registered, for banks, agencies, sponsors and transport companies.",
            "content": CONTENT,
            "content_ms": CONTENT_MS,
            "asks_recipient": True,
            "valid_months": 3,
            "reference_prefix": "UMF/PG/SCL",
            "signatory_name": "Dean / Director",
            "modified_by": "System",
        },
    )
    LetterTemplate.objects.filter(name=OLD_NAME, status="Active").update(status="Archived")


def remove_confirmation_letter(apps, schema_editor):
    LetterTemplate = apps.get_model("letters", "LetterTemplate")
    template = LetterTemplate.objects.filter(name=NAME).first()
    if template and not template.generated_letters.exists():
        template.delete()
    LetterTemplate.objects.filter(name=OLD_NAME, status="Archived").update(status="Active")


class Migration(migrations.Migration):

    dependencies = [
        ("letters", "0006_confirmation_letters"),
    ]

    operations = [
        migrations.RunPython(add_confirmation_letter, remove_confirmation_letter),
    ]
