from django.conf import settings
from django.db import migrations, models


def forwards_status_migration(apps, schema_editor):
    BimDocumentation = apps.get_model('bim_documentation', 'BimDocumentation')

    for doc in BimDocumentation.objects.all().iterator():
        if doc.status == 'pending_review':
            if doc.reviewed_by_studio_head_id:
                doc.status = 'pending_ceo_review'
            else:
                doc.status = 'pending_studio_head_review'
            doc.save(update_fields=['status'])


def backwards_status_migration(apps, schema_editor):
    BimDocumentation = apps.get_model('bim_documentation', 'BimDocumentation')

    for doc in BimDocumentation.objects.all().iterator():
        if doc.status in ('pending_studio_head_review', 'pending_ceo_review', 'pending_bim_review'):
            doc.status = 'pending_review'
            doc.save(update_fields=['status'])


class Migration(migrations.Migration):

    dependencies = [
        ('bim_documentation', '0005_alter_bimdocumentation_doc_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='bimdocumentation',
            name='bim_comments',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='bimdocumentation',
            name='bim_reviewed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='bimdocumentation',
            name='reviewed_by_bim',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='reviewed_bim_docs', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='bimdocumentation',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('pending_bim_review', 'Pending BIM Review'), ('pending_studio_head_review', 'Pending Studio Head Review'), ('pending_ceo_review', 'Pending CEO Review'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='draft', max_length=32),
        ),
        migrations.RunPython(forwards_status_migration, backwards_status_migration),
    ]
