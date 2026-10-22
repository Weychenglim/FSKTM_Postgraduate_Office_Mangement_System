"""Appointment intake periods; Marks retains its independent authoritative models."""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def programme_identity(value):
    """Compare programme cohorts without changing their stored display names."""
    return value.strip().casefold()


class OperationalPeriod(models.Model):
    class Activity(models.TextChoices):
        SUPERVISOR_APPLICATION = 'SUPERVISOR_APPLICATION', 'Supervisor application'
        PANEL_RECOMMENDATION = 'PANEL_RECOMMENDATION', 'Panel recommendation'

    class Lifecycle(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'
        CLOSED = 'CLOSED', 'Closed'
        ARCHIVED = 'ARCHIVED', 'Archived'

    class Scope(models.TextChoices):
        ALL = 'ALL', 'All programmes'
        SELECTED = 'SELECTED', 'Selected programmes'

    academic_semester = models.ForeignKey('academics.AcademicSemester', on_delete=models.PROTECT, related_name='operational_periods')
    activity = models.CharField(max_length=32, choices=Activity.choices)
    name = models.CharField(max_length=255)
    programme_scope = models.CharField(max_length=16, choices=Scope.choices, default=Scope.ALL)
    programmes = models.JSONField(default=list, blank=True)
    opens_at = models.DateTimeField()
    closes_at = models.DateTimeField()
    lifecycle_status = models.CharField(max_length=16, choices=Lifecycle.choices, default=Lifecycle.DRAFT)
    revision = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_operational_periods')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['opens_at', 'pk']
        constraints = [models.CheckConstraint(condition=models.Q(closes_at__gt=models.F('opens_at')), name='operational_period_valid_dates')]

    @property
    def effective_status(self):
        if self.lifecycle_status != self.Lifecycle.PUBLISHED:
            return self.lifecycle_status
        now = timezone.now()
        if now < self.opens_at:
            return 'UPCOMING'
        return 'OPEN' if now <= self.closes_at else 'ENDED'

    def clean(self):
        errors = {}
        if self.opens_at and self.closes_at:
            if self.closes_at <= self.opens_at:
                errors['closes_at'] = 'Closing time must be after opening time.'
            if self.academic_semester_id:
                semester = self.academic_semester
                if timezone.localtime(self.opens_at).date() < semester.starts_on or timezone.localtime(self.closes_at).date() > semester.ends_on:
                    errors['opens_at'] = 'Operational dates must fall within the academic semester.'
        if not isinstance(self.programmes, list) or any(not isinstance(p, str) or not p.strip() for p in self.programmes):
            errors['programmes'] = 'Programmes must be a list of nonempty programme names.'
        elif len({programme_identity(value) for value in self.programmes}) != len(self.programmes):
            errors['programmes'] = 'Duplicate programmes are not allowed.'
        elif self.programme_scope == self.Scope.SELECTED and not self.programmes:
            errors['programmes'] = 'Select at least one programme.'
        elif self.programme_scope == self.Scope.ALL and self.programmes:
            errors['programmes'] = 'All-programme periods cannot specify individual programmes.'
        if errors:
            raise ValidationError(errors)


class OperationalEnforcement(models.Model):
    academic_semester = models.ForeignKey('academics.AcademicSemester', on_delete=models.PROTECT, related_name='operational_enforcements')
    activity = models.CharField(max_length=32, choices=OperationalPeriod.Activity.choices)
    enabled = models.BooleanField(default=False)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='updated_operational_enforcements')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['academic_semester', 'activity'], name='unique_operational_enforcement')]


class OperationalException(models.Model):
    period = models.ForeignKey(OperationalPeriod, on_delete=models.PROTECT, related_name='exceptions')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='operational_student_exceptions')
    participant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='operational_participant_exceptions')
    deadline = models.DateTimeField()
    reason = models.TextField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='granted_operational_exceptions')
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='revoked_operational_exceptions', null=True, blank=True)
    revocation_reason = models.TextField(blank=True)
    revision = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['-created_at', '-pk']


class ImmutableOperationalAuditQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError('Operational period audits are immutable.')

    def delete(self):
        raise ValidationError('Operational period audits are immutable.')

    def bulk_update(self, *args, **kwargs):
        raise ValidationError('Operational period audits are immutable.')


class OperationalPeriodAudit(models.Model):
    objects = ImmutableOperationalAuditQuerySet.as_manager()
    academic_semester = models.ForeignKey('academics.AcademicSemester', on_delete=models.PROTECT, related_name='operational_audits')
    period = models.ForeignKey(OperationalPeriod, on_delete=models.PROTECT, related_name='audits', null=True, blank=True)
    exception = models.ForeignKey(OperationalException, on_delete=models.PROTECT, related_name='audits', null=True, blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='operational_period_audits')
    activity = models.CharField(max_length=32, choices=OperationalPeriod.Activity.choices)
    action = models.CharField(max_length=32)
    reason = models.TextField(blank=True)
    before_values = models.JSONField(default=dict)
    after_values = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-pk']

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError('Operational period audits are immutable.')
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Operational period audits are immutable.')
