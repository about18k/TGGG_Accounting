# Generated migration for BIM Documentation file storage changes
# Changes uploaded_file FileField to Supabase Storage

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bim_documentation', '0003_bimdocumentationcomment'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='bimdocumentationfile',
            name='uploaded_file',
        ),
        migrations.AddField(
            model_name='bimdocumentationfile',
            name='file_url',
            field=models.URLField(
                help_text='Public URL to access the file from Supabase Storage',
                max_length=1000,
                blank=True,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='bimdocumentationfile',
            name='file_path',
            field=models.CharField(
                help_text='Path to file in Supabase Storage bucket',
                max_length=500,
            ),
        ),
    ]
