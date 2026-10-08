from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0005_coordinatordelegation")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="announcement_alerts",
            field=models.BooleanField(default=True),
        ),
    ]
