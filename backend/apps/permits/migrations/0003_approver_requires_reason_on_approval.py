from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('permits', '0002_approval_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='approver',
            name='requires_reason_on_approval',
            field=models.BooleanField(default=False),
        ),
    ]
