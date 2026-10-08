from django.db import migrations


def record_baselines(apps, schema_editor):
    Profile = apps.get_model('appointments', 'StudentResearchProfile')
    Revision = apps.get_model('appointments', 'ResearchProfileRevision')
    alias = schema_editor.connection.alias
    for profile in Profile.objects.using(alias).filter(revision=0).iterator():
        Revision.objects.using(alias).get_or_create(profile_id=profile.pk, revision=0, defaults={
            'kind': 'BASELINE', 'before_values': {},
            'after_values': {'title': profile.proposed_topic, 'abstract': profile.abstract, 'programme': profile.programme},
            'reason': 'Existing approved research state at introduction of amendment history.',
        })


class Migration(migrations.Migration):
    dependencies = [('appointments', '0013_research_amendments')]
    operations = [migrations.RunPython(record_baselines, migrations.RunPython.noop)]
