from django.db import migrations, models


def copy_approval_signature_files_to_db(apps, schema_editor):
    ApprovalLog = apps.get_model('permits', 'ApprovalLog')
    for log in ApprovalLog.objects.exclude(signature_image='').iterator():
        if log.signature_image_data:
            continue
        try:
            log.signature_image.open('rb')
            log.signature_image_data = log.signature_image.read()
            log.signature_image_content_type = ''
            log.save(update_fields=['signature_image_data', 'signature_image_content_type'])
        except Exception:
            continue
        finally:
            try:
                log.signature_image.close()
            except Exception:
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_user_signature_image_data_and_more'),
        ('permits', '0006_rename_permits_app_permit_idx_permits_app_permit__ea0a6d_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='approvallog',
            name='signature_image_content_type',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='approvallog',
            name='signature_image_data',
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.RunPython(copy_approval_signature_files_to_db, migrations.RunPython.noop),
    ]
