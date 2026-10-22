from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0013_registry_import_profile"),
        ("appointments", "0017_supervisorapplication_section_a"),
    ]

    operations = [
        migrations.AddField(
            model_name="supervisorapplication", name="research_intent",
            field=models.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.CreateModel(
            name="SupervisorApplicationDraft",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("content", models.JSONField()),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("student", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,
                    related_name="supervisor_application_draft", to="accounts.student")),
            ],
        ),
    ]
