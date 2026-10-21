from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("appointments", "0016_supervisorapplication_project_course_codes")]

    operations = [
        migrations.AddField(
            model_name="supervisorapplication",
            name="section_a",
            field=models.JSONField(blank=True, editable=False, null=True),
        ),
    ]
