from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="panelrecommendation",
            name="one_active_panel_recommendation_per_student",
        ),
        migrations.AddConstraint(
            model_name="panelrecommendation",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    (
                        "status__in",
                        [
                            "SUBMITTED_TO_PANEL",
                            "ACCEPTED_BY_PANEL",
                            "PENDING_COORDINATOR",
                            "APPROVED",
                        ],
                    )
                ),
                fields=("profile",),
                name="one_active_panel_recommendation_per_student",
            ),
        ),
    ]
