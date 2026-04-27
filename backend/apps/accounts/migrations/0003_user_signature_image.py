from django.db import migrations, models
import apps.accounts.models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_passwordresettoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='signature_image',
            field=models.ImageField(blank=True, null=True, upload_to=apps.accounts.models.signature_upload_path),
        ),
    ]
