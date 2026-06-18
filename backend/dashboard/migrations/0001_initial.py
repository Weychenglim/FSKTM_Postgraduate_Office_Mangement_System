import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SemesterTimeline",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("semester", models.CharField(max_length=128)),
                ("session", models.CharField(max_length=64)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("source_filename", models.CharField(blank=True, max_length=255)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("replaced_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="uploaded_semester_timelines",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-uploaded_at", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="SemesterTimelineEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("level", models.CharField(choices=[("P1", "Research Project (P1)"), ("P2", "Research Project (P2)")], db_index=True, max_length=2)),
                ("step", models.PositiveIntegerField()),
                ("detail", models.TextField()),
                ("action_owner", models.CharField(max_length=255)),
                ("deadline_start", models.DateField()),
                ("deadline_end", models.DateField()),
                ("week_label", models.CharField(blank=True, max_length=64)),
                ("target_roles", models.JSONField(default=list)),
                ("status", models.CharField(choices=[("Completed", "Completed"), ("Active", "Active"), ("Deadline", "Deadline"), ("Upcoming", "Upcoming")], default="Upcoming", max_length=16)),
                ("display_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "timeline",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="entries",
                        to="dashboard.semestertimeline",
                    ),
                ),
            ],
            options={
                "ordering": ["display_order", "level", "step", "deadline_start", "id"],
            },
        ),
        migrations.CreateModel(
            name="TimelineAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(choices=[("UPLOAD", "Upload"), ("REPLACE", "Replace"), ("EDIT_ENTRY", "Edit Entry")], max_length=32)),
                ("summary", models.CharField(max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="dashboard_timeline_audit_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "entry",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_logs",
                        to="dashboard.semestertimelineentry",
                    ),
                ),
                (
                    "timeline",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="audit_logs",
                        to="dashboard.semestertimeline",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at", "-id"],
            },
        ),
        migrations.AddConstraint(
            model_name="semestertimeline",
            constraint=models.UniqueConstraint(condition=Q(("is_active", True)), fields=("is_active",), name="one_active_semester_timeline"),
        ),
        migrations.AddConstraint(
            model_name="semestertimelineentry",
            constraint=models.UniqueConstraint(fields=("timeline", "level", "step"), name="unique_step_per_timeline_level"),
        ),
    ]
