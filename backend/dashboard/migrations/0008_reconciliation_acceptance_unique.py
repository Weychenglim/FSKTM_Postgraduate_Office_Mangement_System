from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("dashboard", "0007_timelineauditlog_after_values_and_more")]

    operations = [migrations.AddConstraint(
        model_name="workflowreconciliationaudit",
        constraint=models.UniqueConstraint(
            fields=("issue_type", "entity_type", "entity_id", "fingerprint"),
            condition=models.Q(action="ACCEPT_INTENTIONAL"), name="reconcile_accept_evidence_unique",
        ),
    )]
