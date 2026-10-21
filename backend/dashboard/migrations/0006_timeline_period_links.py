from django.db import migrations, models
import django.db.models.deletion


def ended_status(apps, schema_editor):
    apps.get_model('dashboard', 'SemesterTimelineEntry').objects.filter(status='Completed').update(status='Ended')


class Migration(migrations.Migration):
    dependencies = [
        ('dashboard', '0005_workflowreconciliationaudit'),
        ('academics', '0004_operational_periods'),
        ('marks', '0010_markentry_submitted_due_recorded'),
    ]
    operations = [
        migrations.AddField(model_name='semestertimelineentry', name='operational_period',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name='timeline_entries', to='academics.operationalperiod')),
        migrations.AddField(model_name='semestertimelineentry', name='marks_period',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name='timeline_entries', to='marks.evaluationperiod')),
        migrations.AddConstraint(model_name='semestertimelineentry', constraint=models.CheckConstraint(
            condition=models.Q(operational_period__isnull=True) | models.Q(marks_period__isnull=True),
            name='timeline_entry_one_period_link')),
        migrations.AlterField(model_name='semestertimelineentry', name='status', field=models.CharField(
            choices=[('Ended', 'Ended'), ('Active', 'Active'), ('Deadline', 'Deadline'), ('Upcoming', 'Upcoming')],
            default='Upcoming', max_length=16)),
        migrations.RunPython(ended_status, migrations.RunPython.noop),
    ]
