"""Shared field validators for account and registry input."""
import re

from rest_framework import serializers

# Digits plus the separators people type in phone numbers. Anything else (a
# leading "=", quotes, letters) has no place in a phone number and turns into a
# formula or a broken row when the registry is exported to a spreadsheet.
PHONE_PATTERN = re.compile(r"^[0-9+\-\s()]*$")

# Matric numbers appear in URLs (/registry/students/<matric>/) and file names,
# so "/" or spaces would make a record unreachable.
MATRIC_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def phone_problem(value):
    if value and (not PHONE_PATTERN.match(value) or not any(c.isdigit() for c in value)):
        return "Enter a phone number using digits, spaces, +, - or brackets only."
    return None


def validate_phone(value):
    problem = phone_problem(value)
    if problem:
        raise serializers.ValidationError(problem)
    return value


def matric_problem(value):
    if not MATRIC_PATTERN.match(value):
        return "Use letters, digits, '.', '_' or '-' only in the matric number (no spaces or '/')."
    if not any(c.isdigit() for c in value):
        return "A matric number must contain at least one digit."
    return None
