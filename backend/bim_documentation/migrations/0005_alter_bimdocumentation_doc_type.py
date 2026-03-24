from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bim_documentation', '0004_supabase_storage'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bimdocumentation',
            name='doc_type',
            field=models.CharField(max_length=100),
        ),
    ]
