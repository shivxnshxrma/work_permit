from django.db import migrations, models


def copy_user_signature_files_to_db(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    for user in User.objects.exclude(signature_image='').iterator():
        if user.signature_image_data:
            continue
        try:
            user.signature_image.open('rb')
            user.signature_image_data = user.signature_image.read()
            user.signature_image_content_type = ''
            user.save(update_fields=['signature_image_data', 'signature_image_content_type'])
        except Exception:
            continue
        finally:
            try:
                user.signature_image.close()
            except Exception:
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_signature_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='signature_image_content_type',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='signature_image_data',
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.RunPython(copy_user_signature_files_to_db, migrations.RunPython.noop),
    ]
