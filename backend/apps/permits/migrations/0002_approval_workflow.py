
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('permits', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='workpermit',
            name='current_stage',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='workpermit',
            name='rejection_reason',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='workpermit',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('submitted', 'Submitted'),
                    ('stage_1', 'Pending Stage 1 Review'),
                    ('stage_1_rejected', 'Rejected at Stage 1'),
                    ('stage_2', 'Pending Stage 2 Review'),
                    ('stage_2_rejected', 'Rejected at Stage 2'),
                    ('approved', 'Approved'),
                    ('cancelled', 'Cancelled by Employee'),
                ],
                default='draft',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='Approver',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stage', models.IntegerField(choices=[(1, 'Stage 1'), (2, 'Stage 2')])),
                ('is_admin', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approver_roles', to='accounts.user')),
            ],
            options={
                'db_table': 'permits_approver',
                'unique_together': {('user', 'stage')},
            },
        ),
        migrations.CreateModel(
            name='ApprovalLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stage', models.IntegerField(choices=[(1, 'Stage 1'), (2, 'Stage 2')])),
                ('action', models.CharField(choices=[('approved', 'Approved'), ('rejected', 'Rejected')], max_length=20)),
                ('reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('approver', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approvals_given', to='accounts.user')),
                ('permit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approval_logs', to='permits.workpermit')),
            ],
            options={
                'db_table': 'permits_approvallog',
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='workpermit',
            index=models.Index(fields=['status', '-created_at'], name='permits_wor_status_idx'),
        ),
        migrations.AddIndex(
            model_name='workpermit',
            index=models.Index(fields=['current_stage'], name='permits_wor_current_idx'),
        ),
        migrations.AddIndex(
            model_name='approver',
            index=models.Index(fields=['stage'], name='permits_app_stage_idx'),
        ),
        migrations.AddIndex(
            model_name='approver',
            index=models.Index(fields=['user'], name='permits_app_user_idx'),
        ),
        migrations.AddIndex(
            model_name='approvallog',
            index=models.Index(fields=['permit', '-created_at'], name='permits_app_permit_idx'),
        ),
        migrations.AddIndex(
            model_name='approvallog',
            index=models.Index(fields=['stage'], name='permits_app_stage_idx_2'),
        ),
    ]
