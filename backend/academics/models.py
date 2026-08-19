import re
from contextvars import ContextVar

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import connections, models, router, transaction
from django.db.models import Q
from django.utils import timezone


SESSION_PATTERN = re.compile(r"^(?P<start>\d{4})/(?P<end>\d{4})$")


class AcademicSemester(models.Model):
    class Term(models.TextChoices):
        SEMESTER_I = "SEMESTER_I", "Semester I"
        SEMESTER_II = "SEMESTER_II", "Semester II"
        SPECIAL = "SPECIAL", "Special Semester"

    class Lifecycle(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Closed"
        ARCHIVED = "ARCHIVED", "Archived"

    TERM_CODES = {
        Term.SEMESTER_I: "S1",
        Term.SEMESTER_II: "S2",
        Term.SPECIAL: "SP",
    }

    code = models.CharField(max_length=32, unique=True, editable=False)
    academic_session = models.CharField(max_length=9)
    term = models.CharField(max_length=16, choices=Term.choices)
    starts_on = models.DateField()
    ends_on = models.DateField()
    lifecycle_status = models.CharField(
        max_length=16,
        choices=Lifecycle.choices,
        default=Lifecycle.DRAFT,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_academic_semesters",
    )
    activated_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-starts_on", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["academic_session", "term"],
                name="unique_academic_session_term",
            ),
            models.UniqueConstraint(
                fields=["lifecycle_status"],
                condition=Q(lifecycle_status="ACTIVE"),
                name="one_active_academic_semester",
            ),
            models.CheckConstraint(
                condition=Q(ends_on__gte=models.F("starts_on")),
                name="academic_semester_valid_date_range",
            ),
        ]

    @property
    def label(self):
        return f"{self.get_term_display()} {self.academic_session}"

    @property
    def effective_status(self):
        if self.lifecycle_status == self.Lifecycle.ACTIVE:
            today = timezone.localdate()
            if today < self.starts_on or today > self.ends_on:
                return "EXPIRED"
        return self.lifecycle_status

    @property
    def is_active(self):
        return self.effective_status == self.Lifecycle.ACTIVE

    def clean(self):
        errors = {}
        match = SESSION_PATTERN.fullmatch(self.academic_session or "")
        if not match or int(match.group("end")) != int(match.group("start")) + 1:
            errors["academic_session"] = (
                "Academic session must use consecutive years such as 2026/2027."
            )
        if self.starts_on and self.ends_on and self.ends_on < self.starts_on:
            errors["ends_on"] = "End date must be on or after the start date."
        if self.academic_session and self.term in self.TERM_CODES and match:
            self.code = (
                f"{match.group('start')}-{match.group('end')}-"
                f"{self.TERM_CODES[self.term]}"
            )
        if self.starts_on and self.ends_on:
            overlap = AcademicSemester.objects.exclude(pk=self.pk).exclude(
                lifecycle_status=self.Lifecycle.ARCHIVED
            ).filter(
                starts_on__lte=self.ends_on,
                ends_on__gte=self.starts_on,
            )
            if overlap.exists():
                errors["starts_on"] = "Semester dates overlap another semester."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return self.label


class AcademicSemesterAudit(models.Model):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        ACTIVATE = "ACTIVATE", "Activate"
        HANDOVER_CLOSE = "HANDOVER_CLOSE", "Handover close"
        CLOSE = "CLOSE", "Close"
        EXTEND = "EXTEND", "Extend"
        ARCHIVE = "ARCHIVE", "Archive"

    semester = models.ForeignKey(
        AcademicSemester,
        on_delete=models.PROTECT,
        related_name="audits",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="academic_semester_audits",
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    reason = models.TextField(blank=True)
    before_values = models.JSONField(default=dict)
    after_values = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Academic semester audits are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Academic semester audits are immutable.")


class SemesterCapacityPlan(models.Model):
    class Lifecycle(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        SUPERSEDED = "SUPERSEDED", "Superseded"

    class Origin(models.TextChoices):
        CREATED = "CREATED", "Created"
        COPIED_FORWARD = "COPIED_FORWARD", "Copied forward"
        MIGRATED_BASELINE = "MIGRATED_BASELINE", "Migrated baseline"

    academic_semester = models.ForeignKey(
        AcademicSemester,
        on_delete=models.PROTECT,
        related_name="capacity_plans",
    )
    version = models.PositiveIntegerField()
    lifecycle_status = models.CharField(max_length=16, choices=Lifecycle.choices)
    origin = models.CharField(max_length=24, choices=Origin.choices)
    supersedes = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="successor_plans",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_capacity_plans",
    )
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="published_capacity_plans",
    )
    publication_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["academic_semester", "-version"]
        constraints = [
            models.UniqueConstraint(
                fields=["academic_semester", "version"],
                name="unique_capacity_plan_semester_version",
            ),
            models.UniqueConstraint(
                fields=["academic_semester"],
                condition=Q(lifecycle_status="PUBLISHED"),
                name="one_published_capacity_plan_per_semester",
            ),
        ]
        indexes = [
            models.Index(
                fields=["academic_semester", "lifecycle_status"],
                name="cap_plan_sem_status_idx",
            )
        ]

    def __str__(self):
        return f"{self.academic_semester.code} capacity plan v{self.version}"


CAPACITY_ENTRY_DRAFT_PLAN_ERROR = (
    "Capacity entries can only be changed on Draft plans."
)
_capacity_bulk_update_validated = ContextVar(
    "capacity_bulk_update_validated",
    default=False,
)


def _select_for_update_self(queryset):
    if connections[queryset.db].features.has_select_for_update_of:
        return queryset.select_for_update(of=("self",))
    return queryset.select_for_update()


def capacity_plans_for_update(*, using):
    queryset = SemesterCapacityPlan.objects.using(using).order_by("pk")
    return _select_for_update_self(queryset)


def _field_is_updated(field, update_fields):
    return update_fields is None or (
        field.name in update_fields or field.attname in update_fields
    )


def _projected_validation_instance(
    instance,
    *,
    persisted_values,
    update_fields,
    using,
):
    if update_fields is None or persisted_values is None:
        return instance

    projected = instance.__class__()
    for field in instance._meta.concrete_fields:
        value = (
            getattr(instance, field.attname)
            if _field_is_updated(field, update_fields)
            else persisted_values[field.attname]
        )
        setattr(projected, field.attname, value)
    projected._state.adding = False
    projected._state.db = using
    return projected


class LecturerCapacityEntryQuerySet(models.QuerySet):
    def _validate_plan_ids_are_draft(self, plan_ids):
        plan_ids = set(plan_ids)
        if not plan_ids:
            return
        if None in plan_ids:
            raise ValidationError({"plan": CAPACITY_ENTRY_DRAFT_PLAN_ERROR})

        draft_plan_ids = set(
            capacity_plans_for_update(using=self.db)
            .filter(
                pk__in=plan_ids,
                lifecycle_status=SemesterCapacityPlan.Lifecycle.DRAFT,
            )
            .values_list("pk", flat=True)
        )
        if draft_plan_ids != plan_ids:
            raise ValidationError({"plan": CAPACITY_ENTRY_DRAFT_PLAN_ERROR})

    def _target_plan_ids(self, update_values):
        target_plan_ids = set()
        for field_name in ("plan", "plan_id"):
            if field_name not in update_values:
                continue
            value = update_values[field_name]
            if isinstance(value, SemesterCapacityPlan):
                target_plan_ids.add(value.pk)
            elif isinstance(value, models.F) and value.name in {"plan", "plan_id"}:
                continue
            elif hasattr(value, "resolve_expression"):
                raise ValidationError({"plan": CAPACITY_ENTRY_DRAFT_PLAN_ERROR})
            else:
                target_plan_ids.add(value)
        return target_plan_ids

    def bulk_create(self, objs, *args, **kwargs):
        objs = list(objs)
        with transaction.atomic(using=self.db):
            self._validate_plan_ids_are_draft(obj.plan_id for obj in objs)
            return super().bulk_create(objs, *args, **kwargs)

    def bulk_update(self, objs, fields, batch_size=None):
        objs = tuple(objs)
        object_pks = [obj.pk for obj in objs if obj.pk is not None]
        field_names = {getattr(field, "name", field) for field in fields}

        with transaction.atomic(using=self.db):
            plan_ids = set(
                self.order_by()
                .filter(pk__in=object_pks)
                .values_list("plan_id", flat=True)
                .distinct()
            )
            if {"plan", "plan_id"} & field_names:
                plan_ids.update(obj.plan_id for obj in objs)
            self._validate_plan_ids_are_draft(plan_ids)

            token = _capacity_bulk_update_validated.set(True)
            try:
                return super().bulk_update(objs, fields, batch_size=batch_size)
            finally:
                _capacity_bulk_update_validated.reset(token)

    def update(self, **kwargs):
        if _capacity_bulk_update_validated.get():
            return super().update(**kwargs)

        with transaction.atomic(using=self.db):
            plan_ids = set(
                self.order_by().values_list("plan_id", flat=True).distinct()
            )
            plan_ids.update(self._target_plan_ids(kwargs))
            self._validate_plan_ids_are_draft(plan_ids)
            return super().update(**kwargs)

    def _lock_and_validate_delete(self):
        initial_rows = tuple(self.order_by("pk").values_list("pk", "plan_id"))
        if not initial_rows:
            return

        initial_plan_ids = {plan_id for _, plan_id in initial_rows}
        self._validate_plan_ids_are_draft(initial_plan_ids)
        locked_rows = tuple(
            _select_for_update_self(self.order_by("pk")).values_list(
                "pk",
                "plan_id",
            )
        )
        if locked_rows != initial_rows:
            raise ValidationError(
                "Capacity entries changed concurrently; reload and retry."
            )
        self._validate_plan_ids_are_draft(
            plan_id for _, plan_id in locked_rows
        )

    def delete(self):
        with transaction.atomic(using=self.db):
            self._lock_and_validate_delete()
            return super().delete()

    def _raw_delete(self, using):
        queryset = self.using(using)
        with transaction.atomic(using=using):
            queryset._lock_and_validate_delete()
            return super(
                LecturerCapacityEntryQuerySet,
                queryset,
            )._raw_delete(using)


class LecturerCapacityEntry(models.Model):
    DRAFT_PLAN_REQUIRED_ERROR = CAPACITY_ENTRY_DRAFT_PLAN_ERROR

    objects = LecturerCapacityEntryQuerySet.as_manager()

    plan = models.ForeignKey(
        SemesterCapacityPlan,
        on_delete=models.PROTECT,
        related_name="entries",
    )
    lecturer = models.ForeignKey(
        "accounts.Lecturer",
        on_delete=models.PROTECT,
        related_name="capacity_entries",
    )
    supervisor_limit = models.PositiveIntegerField(null=True, blank=True)
    panel_limit = models.PositiveIntegerField(null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="updated_capacity_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["lecturer__staff_no"]
        constraints = [
            models.UniqueConstraint(
                fields=["plan", "lecturer"],
                name="unique_capacity_entry_plan_lecturer",
            )
        ]

    def _validate_draft_plan(self):
        if self.plan_id and not SemesterCapacityPlan.objects.filter(
            pk=self.plan_id,
            lifecycle_status=SemesterCapacityPlan.Lifecycle.DRAFT,
        ).exists():
            raise ValidationError({"plan": self.DRAFT_PLAN_REQUIRED_ERROR})

    def clean(self):
        self._validate_draft_plan()
        if not self.lecturer_id:
            return

        from accounts.models import Panel, Supervisor

        errors = {}
        has_supervisor_role = Supervisor.objects.filter(
            lecturer_id=self.lecturer_id
        ).exists()
        has_panel_role = Panel.objects.filter(lecturer_id=self.lecturer_id).exists()

        if has_supervisor_role and self.supervisor_limit is None:
            errors["supervisor_limit"] = (
                "A Supervisor capacity limit is required for this lecturer."
            )
        elif not has_supervisor_role and self.supervisor_limit is not None:
            errors["supervisor_limit"] = (
                "A lecturer without the Supervisor role cannot have a Supervisor limit."
            )

        if has_panel_role and self.panel_limit is None:
            errors["panel_limit"] = (
                "A Panel capacity limit is required for this lecturer."
            )
        elif not has_panel_role and self.panel_limit is not None:
            errors["panel_limit"] = (
                "A lecturer without the Panel role cannot have a Panel limit."
            )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        using = kwargs.get("using") or router.db_for_write(
            self.__class__,
            instance=self,
        )
        kwargs["using"] = using
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            update_fields = frozenset(update_fields)
            kwargs["update_fields"] = update_fields

        with transaction.atomic(using=using):
            persisted_plan_id = None
            if self.pk:
                persisted_plan_id = (
                    LecturerCapacityEntry.objects.using(using)
                    .order_by()
                    .filter(pk=self.pk)
                    .values_list("plan_id", flat=True)
                    .first()
                )

            destination_plan_id = self.plan_id
            plan_field = self._meta.get_field("plan")
            if not _field_is_updated(plan_field, update_fields):
                destination_plan_id = persisted_plan_id
            plan_ids = {
                plan_id
                for plan_id in (persisted_plan_id, destination_plan_id)
                if plan_id is not None
            }
            locked_plans = dict(
                capacity_plans_for_update(using=using)
                .filter(pk__in=plan_ids)
                .values_list("pk", "lifecycle_status")
            )

            persisted_values = None
            if self.pk:
                persisted_entry = _select_for_update_self(
                    LecturerCapacityEntry.objects.using(using)
                    .order_by()
                    .filter(pk=self.pk)
                )
                persisted_fields = [
                    field.attname for field in self._meta.concrete_fields
                ]
                persisted_values = persisted_entry.values(*persisted_fields).first()
                locked_source_plan_id = (
                    persisted_values["plan_id"] if persisted_values else None
                )
                if locked_source_plan_id != persisted_plan_id:
                    raise ValidationError(
                        {"plan": "Capacity entry changed concurrently; reload and retry."}
                    )

            if set(locked_plans) != plan_ids or any(
                status != SemesterCapacityPlan.Lifecycle.DRAFT
                for status in locked_plans.values()
            ):
                raise ValidationError({"plan": self.DRAFT_PLAN_REQUIRED_ERROR})

            validation_instance = _projected_validation_instance(
                self,
                persisted_values=persisted_values,
                update_fields=update_fields,
                using=using,
            )
            validation_instance.full_clean()
            return super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        using = using or router.db_for_write(self.__class__, instance=self)
        pk = self.pk
        if pk is None:
            raise ValueError(
                f"{self.__class__.__name__} object can't be deleted because its "
                f"{self._meta.pk.attname} attribute is set to None."
            )
        result = self.__class__.objects.using(using).filter(pk=pk).delete()
        setattr(self, self._meta.pk.attname, None)
        return result

    def __str__(self):
        return f"{self.lecturer} in {self.plan}"


AVAILABILITY_BULK_WRITE_ERROR = (
    "Availability windows must be changed through validated individual saves."
)
AVAILABILITY_DELETE_ERROR = (
    "Availability windows cannot be deleted; cancel them instead."
)


class LecturerAvailabilityWindowQuerySet(models.QuerySet):
    def bulk_create(self, objs, *args, **kwargs):
        raise ValidationError(AVAILABILITY_BULK_WRITE_ERROR)

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValidationError(AVAILABILITY_BULK_WRITE_ERROR)

    def update(self, **kwargs):
        raise ValidationError(AVAILABILITY_BULK_WRITE_ERROR)

    def delete(self):
        raise ValidationError(AVAILABILITY_DELETE_ERROR)

    def _raw_delete(self, using):
        raise ValidationError(AVAILABILITY_DELETE_ERROR)


def _academic_semesters_for_update(*, using):
    queryset = AcademicSemester.objects.using(using).order_by("pk")
    return _select_for_update_self(queryset)


class LecturerAvailabilityWindow(models.Model):
    class Role(models.TextChoices):
        SUPERVISOR = "SUPERVISOR", "Supervisor"
        PANEL = "PANEL", "Panel"

    objects = LecturerAvailabilityWindowQuerySet.as_manager()

    academic_semester = models.ForeignKey(
        AcademicSemester,
        on_delete=models.PROTECT,
        related_name="lecturer_availability_windows",
    )
    lecturer = models.ForeignKey(
        "accounts.Lecturer",
        on_delete=models.PROTECT,
        related_name="availability_windows",
    )
    role = models.CharField(max_length=16, choices=Role.choices)
    starts_on = models.DateField()
    ends_on = models.DateField()
    reason = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_lecturer_availability_windows",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="cancelled_lecturer_availability_windows",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["starts_on", "ends_on", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(role__in=["SUPERVISOR", "PANEL"]),
                name="capacity_window_valid_role",
            ),
            models.CheckConstraint(
                condition=Q(ends_on__gte=models.F("starts_on")),
                name="cap_window_valid_date_range",
            ),
        ]
        indexes = [
            models.Index(
                fields=["lecturer", "role", "starts_on", "ends_on"],
                name="cap_window_lect_role_dates_idx",
            )
        ]

    def clean(self):
        errors = {}
        semester = None
        if self.academic_semester_id:
            semester = self.academic_semester

        if self.starts_on and self.ends_on:
            if self.ends_on < self.starts_on:
                errors["ends_on"] = "End date must be on or after the start date."
            if semester and self.starts_on < semester.starts_on:
                errors["starts_on"] = (
                    "Availability must start within the academic semester."
                )
            if semester and self.ends_on > semester.ends_on:
                errors["ends_on"] = (
                    "Availability must end within the academic semester."
                )

        if self.lecturer_id and self.role in self.Role.values:
            from accounts.models import Panel, Supervisor

            role_exists = (
                Supervisor.objects.filter(lecturer_id=self.lecturer_id).exists()
                if self.role == self.Role.SUPERVISOR
                else Panel.objects.filter(lecturer_id=self.lecturer_id).exists()
            )
            if not role_exists:
                errors["role"] = "The lecturer does not hold the selected role."

        cancellation_reason = (self.cancellation_reason or "").strip()
        if self.cancelled_at:
            if not self.cancelled_by_id:
                errors["cancelled_by"] = "A cancellation actor is required."
            if not cancellation_reason:
                errors["cancellation_reason"] = "A cancellation reason is required."
        elif self.cancelled_by_id or cancellation_reason:
            errors["cancelled_at"] = "A cancellation timestamp is required."

        if (
            self.cancelled_at is None
            and self.academic_semester_id
            and self.lecturer_id
            and self.role in self.Role.values
            and self.starts_on
            and self.ends_on
        ):
            overlapping = LecturerAvailabilityWindow.objects.exclude(pk=self.pk).filter(
                academic_semester_id=self.academic_semester_id,
                lecturer_id=self.lecturer_id,
                role=self.role,
                cancelled_at__isnull=True,
                starts_on__lte=self.ends_on,
                ends_on__gte=self.starts_on,
            )
            if overlapping.exists():
                errors["starts_on"] = (
                    "Availability overlaps an active window for this lecturer and role."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        using = kwargs.get("using") or router.db_for_write(
            self.__class__,
            instance=self,
        )
        kwargs["using"] = using
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            update_fields = frozenset(update_fields)
            kwargs["update_fields"] = update_fields

        with transaction.atomic(using=using):
            persisted_semester_id = None
            if self.pk:
                persisted_semester_id = (
                    LecturerAvailabilityWindow.objects.using(using)
                    .order_by()
                    .filter(pk=self.pk)
                    .values_list("academic_semester_id", flat=True)
                    .first()
                )

            destination_semester_id = self.academic_semester_id
            semester_field = self._meta.get_field("academic_semester")
            if not _field_is_updated(semester_field, update_fields):
                destination_semester_id = persisted_semester_id
            semester_ids = {
                semester_id
                for semester_id in (
                    persisted_semester_id,
                    destination_semester_id,
                )
                if semester_id is not None
            }
            locked_semester_ids = set(
                _academic_semesters_for_update(using=using)
                .filter(pk__in=semester_ids)
                .values_list("pk", flat=True)
            )

            persisted_values = None
            if self.pk:
                persisted_window = _select_for_update_self(
                    LecturerAvailabilityWindow.objects.using(using)
                    .order_by()
                    .filter(pk=self.pk)
                )
                persisted_fields = [
                    field.attname for field in self._meta.concrete_fields
                ]
                persisted_values = persisted_window.values(*persisted_fields).first()
                locked_source_semester_id = (
                    persisted_values["academic_semester_id"]
                    if persisted_values
                    else None
                )
                if locked_source_semester_id != persisted_semester_id:
                    raise ValidationError(
                        {
                            "academic_semester": (
                                "Availability window changed concurrently; "
                                "reload and retry."
                            )
                        }
                    )

            if locked_semester_ids != semester_ids:
                raise ValidationError(
                    {"academic_semester": "A valid academic semester is required."}
                )

            validation_instance = _projected_validation_instance(
                self,
                persisted_values=persisted_values,
                update_fields=update_fields,
                using=using,
            )
            validation_instance.full_clean()
            return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(AVAILABILITY_DELETE_ERROR)

    def __str__(self):
        return (
            f"{self.lecturer} {self.get_role_display()} availability "
            f"{self.starts_on} to {self.ends_on}"
        )


CAPACITY_AUDIT_IMMUTABLE_ERROR = "Lecturer capacity audits are immutable."


class LecturerCapacityAuditQuerySet(models.QuerySet):
    def bulk_create(
        self,
        objs,
        batch_size=None,
        ignore_conflicts=False,
        update_conflicts=False,
        update_fields=None,
        unique_fields=None,
    ):
        if update_conflicts or update_fields is not None:
            raise ValidationError(CAPACITY_AUDIT_IMMUTABLE_ERROR)
        return super().bulk_create(
            objs,
            batch_size=batch_size,
            ignore_conflicts=ignore_conflicts,
            update_conflicts=update_conflicts,
            update_fields=update_fields,
            unique_fields=unique_fields,
        )

    def update(self, **kwargs):
        raise ValidationError(CAPACITY_AUDIT_IMMUTABLE_ERROR)

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValidationError(CAPACITY_AUDIT_IMMUTABLE_ERROR)

    def delete(self):
        raise ValidationError(CAPACITY_AUDIT_IMMUTABLE_ERROR)

    def _raw_delete(self, using):
        raise ValidationError(CAPACITY_AUDIT_IMMUTABLE_ERROR)


class LecturerCapacityAudit(models.Model):
    class Action(models.TextChoices):
        PLAN_CREATE = "PLAN_CREATE", "Plan create"
        PLAN_COPY = "PLAN_COPY", "Plan copy"
        ENTRY_UPDATE = "ENTRY_UPDATE", "Entry update"
        PUBLISH = "PUBLISH", "Publish"
        SUPERSEDE = "SUPERSEDE", "Supersede"
        AVAILABILITY_CREATE = "AVAILABILITY_CREATE", "Availability create"
        AVAILABILITY_CANCEL = "AVAILABILITY_CANCEL", "Availability cancel"

    objects = LecturerCapacityAuditQuerySet.as_manager()

    academic_semester = models.ForeignKey(
        AcademicSemester,
        on_delete=models.PROTECT,
        related_name="capacity_audits",
    )
    plan = models.ForeignKey(
        SemesterCapacityPlan,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="audits",
    )
    lecturer = models.ForeignKey(
        "accounts.Lecturer",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="capacity_audits",
    )
    availability_window = models.ForeignKey(
        LecturerAvailabilityWindow,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="audits",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lecturer_capacity_audits",
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    reason = models.TextField(blank=True)
    before_values = models.JSONField(default=dict)
    after_values = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError(CAPACITY_AUDIT_IMMUTABLE_ERROR)
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(CAPACITY_AUDIT_IMMUTABLE_ERROR)

