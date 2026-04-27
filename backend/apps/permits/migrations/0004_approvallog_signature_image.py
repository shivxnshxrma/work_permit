from django.db import migrations, models
import apps.permits.models


class Migration(migrations.Migration):

    dependencies = [
        ('permits', '0003_approver_requires_reason_on_approval'),
    ]

    operations = [
        migrations.AddField(
            model_name='approvallog',
            name='signature_image',
            field=models.ImageField(blank=True, null=True, upload_to=apps.permits.models.approval_signature_upload_path),
        ),
    ]
