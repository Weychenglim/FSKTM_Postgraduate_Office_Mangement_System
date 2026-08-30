import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "dashboard",
            "0004_remove_semestertimeline_one_active_semester_timeline_and_more",
        ),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkflowReconciliationAudit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("issue_type", models.CharField(db_index=True, max_length=64)),
                ("entity_type", models.CharField(max_length=64)),
                ("entity_id", models.CharField(max_length=64)),
                ("action", models.CharField(max_length=64)),
                ("reason", models.TextField()),
                ("fingerprint", models.CharField(max_length=64)),
                ("before_values", models.JSONField(default=dict)),
                ("after_values", models.JSONField(default=dict)),
                ("affected_records", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="workflow_reconciliation_audits", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.AddIndex(
            model_name="workflowreconciliationaudit",
            index=models.Index(fields=["entity_type", "entity_id"], name="reconcile_entity_idx"),
        ),
    ]
