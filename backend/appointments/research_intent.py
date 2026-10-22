"""Strict versioned input contracts for submitted intent and private drafts."""

import json

from rest_framework import serializers

from .section_a import COURSE_FIELD_LIMITS


INTENT_FIELDS = (
    "introduction", "aim", "researchQuestions", "researchObjectives", "significance",
    "methodology", "expectedOutcomes", "skillsNeeded", "timeline",
)
INTENT_TEXT_LIMIT = 10000
DRAFT_FIELDS = {
    "version", "step", "researchTitle", "projectCodeEntries", "researchArea", "researchAbstract",
    "titleOrigin", "courseResults", "noCoursesTaken", "proposedSupervisorId", "researchIntent",
}


def is_plain_text(value):
    # PostgreSQL JSON cannot store NUL or unpaired Unicode surrogates. Match the
    # protection on DRF text fields before persisting our strict JSON input.
    return (isinstance(value, str) and "\x00" not in value
            and not any("\ud800" <= character <= "\udfff" for character in value))


def validate_research_intent(data, *, draft=False):
    if not isinstance(data, dict) or set(data) != {"version", *INTENT_FIELDS}:
        raise serializers.ValidationError("Provide exactly the version 1 Research Intent fields.")
    if type(data["version"]) is not int or data["version"] != 1:
        raise serializers.ValidationError("Research Intent version must be 1.")
    cleaned = {"version": 1}
    for field in INTENT_FIELDS:
        value = data[field]
        if not is_plain_text(value):
            raise serializers.ValidationError({field: "Enter plain text."})
        value = value if draft else value.strip()
        if len(value) > INTENT_TEXT_LIMIT or (not draft and not value):
            raise serializers.ValidationError({field: "Enter text of at most 10,000 characters."})
        cleaned[field] = value
    return cleaned


class ResearchIntentField(serializers.Field):
    def get_value(self, dictionary):
        # An explicitly empty multipart value must fail rather than appear absent.
        return dictionary.get(self.field_name, serializers.empty)

    def to_internal_value(self, data):
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except (ValueError, RecursionError):
                raise serializers.ValidationError("Research Intent must contain valid JSON.")
        return validate_research_intent(data)


def validate_application_draft(data):
    if not isinstance(data, dict) or set(data) != DRAFT_FIELDS:
        raise serializers.ValidationError("Provide exactly the version 1 application draft fields.")
    if type(data["version"]) is not int or data["version"] != 1:
        raise serializers.ValidationError({"version": "Draft version must be 1."})
    if type(data["step"]) is not int or not 1 <= data["step"] <= 4:
        raise serializers.ValidationError({"step": "Choose a step from 1 to 4."})
    for field, limit in [("researchTitle", 500), ("researchArea", 255), ("researchAbstract", 10000)]:
        value = data[field]
        if not is_plain_text(value) or len(value) > limit:
            raise serializers.ValidationError({field: "Enter text within the field limit."})
    entries = data["projectCodeEntries"]
    if (not isinstance(entries, list) or len(entries) > 50
            or any(not is_plain_text(entry) or len(entry) > 255 for entry in entries)):
        raise serializers.ValidationError({"projectCodeEntries": "Provide at most 50 text course codes."})
    # Match the existing submitted project's combined 255-character limit.
    if len(", ".join(entry.strip() for entry in entries if entry.strip())) > 255:
        raise serializers.ValidationError({"projectCodeEntries": "Combined course codes must not exceed 255 characters."})
    if data["titleOrigin"] not in ("", "STUDENT", "SUPERVISOR"):
        raise serializers.ValidationError({"titleOrigin": "Choose a valid title source."})
    if type(data["noCoursesTaken"]) is not bool:
        raise serializers.ValidationError({"noCoursesTaken": "Enter a boolean."})
    supervisor = data["proposedSupervisorId"]
    if supervisor is not None and (not is_plain_text(supervisor) or len(supervisor) > 64):
        raise serializers.ValidationError({"proposedSupervisorId": "Enter a supervisor identifier or null."})
    rows = data["courseResults"]
    if not isinstance(rows, list) or len(rows) > 50:
        raise serializers.ValidationError({"courseResults": "Provide at most 50 course rows."})
    for row in rows:
        if (not isinstance(row, dict) or set(row) != set(COURSE_FIELD_LIMITS)
                or any(not is_plain_text(row[field]) or len(row[field]) > limit
                       for field, limit in COURSE_FIELD_LIMITS.items())):
            raise serializers.ValidationError({"courseResults": "Each row must contain four bounded text fields."})
    return {**data, "researchIntent": validate_research_intent(data["researchIntent"], draft=True)}
