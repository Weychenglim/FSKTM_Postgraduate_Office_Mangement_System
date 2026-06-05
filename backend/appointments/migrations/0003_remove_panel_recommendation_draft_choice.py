from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0002_remove_draft_from_active_panel_recommendations"),
    ]

    operations = [
        migrations.AlterField(
            model_name="panelrecommendation",
            name="status",
            field=models.CharField(
                choices=[
                    ("SUBMITTED_TO_PANEL", "Submitted to Panel"),
                    ("REJECTED_BY_PANEL", "Rejected by Panel"),
                    ("ACCEPTED_BY_PANEL", "Accepted by Panel"),
                    ("PENDING_COORDINATOR", "Pending Coordinator"),
                    ("REJECTED_BY_COORDINATOR", "Rejected by Coordinator"),
                    ("APPROVED", "Approved"),
                ],
                db_index=True,
                default="SUBMITTED_TO_PANEL",
                max_length=32,
            ),
        ),
    ]
