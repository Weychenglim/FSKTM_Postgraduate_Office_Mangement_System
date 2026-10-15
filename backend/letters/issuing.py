"""Issuing a letter: its reference number, date, wording and signatory.

Used when the office approves a request and when an appointment letter is
issued by itself, so both kinds of letter are filled the same way.
"""
from django.utils import timezone

from .models import GeneratedLetter
from .placeholders import fill_placeholders
from .references import next_reference_number


def issue_letter(letter, template, values, typed, actor):
    """Fill ``letter`` from ``template`` and save it as Issued.

    Call it inside the transaction that saves the letter, so the reference
    number is only used up if the letter is saved.
    """
    issued_on = timezone.localdate()
    reference = next_reference_number(template.reference_prefix, issued_on.year)
    values = {**values, "referenceNumber": reference, "date": issued_on.strftime("%d %B %Y")}
    letter.content = fill_placeholders(template.content, values, typed)
    letter.student_data = values
    letter.office_values = typed
    letter.template = template
    letter.template_name = template.name
    letter.letter_type = template.letter_type
    letter.signatory_name = template.signatory_name
    letter.signatory_title = template.signatory_title
    letter.reference_number = reference
    letter.issued_on = issued_on
    letter.status = GeneratedLetter.Status.ISSUED
    letter.decided_by = actor
    letter.decided_at = timezone.now()
    letter.save()
    return letter
