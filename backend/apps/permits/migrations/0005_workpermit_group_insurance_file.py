from django.db import migrations, models
import apps.permits.models


class Migration(migrations.Migration):

    dependencies = [
        ('permits', '0004_approvallog_signature_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='workpermit',
            name='group_insurance_file',
            field=models.FileField(blank=True, null=True, upload_to=apps.permits.models.group_insurance_upload_path),
        ),
    ]
