import uuid
from django.db import models
from django.utils import timezone
from apps.accounts.models import User


def permit_upload_path(instance, filename):
    """Store PDFs under media/permits/<user_id>/<uuid>.pdf"""
    return f'permits/{instance.user_id}/{uuid.uuid4().hex}.pdf'


class WorkPermit(models.Model):

    class Status(models.TextChoices):
        DRAFT      = 'draft',       'Draft'
        SUBMITTED  = 'submitted',   'Submitted'
        STAGE_1    = 'stage_1',     'Pending Stage 1 Review'
        STAGE_1_REJECTED = 'stage_1_rejected', 'Reinitiated at Stage 1'
        STAGE_2    = 'stage_2',     'Pending Stage 2 Review'
        STAGE_2_REJECTED = 'stage_2_rejected', 'Reinitiated at Stage 2'
        APPROVED   = 'approved',    'Approved'
        CANCELLED  = 'cancelled',   'Cancelled by Employee'

    # Ownership
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='permits',
    )

    # Core permit fields (indexed for search)
    serial_number = models.CharField(max_length=100, blank=True)
    location      = models.CharField(max_length=500, blank=True)
    valid_from    = models.DateField(null=True, blank=True)
    valid_to      = models.DateField(null=True, blank=True)

    # Full form payload — keeps every field for audit / re-rendering
    form_data = models.JSONField(default=dict)

    # The generated PDF file
    pdf_file = models.FileField(upload_to=permit_upload_path, null=True, blank=True)

    # Approval workflow
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    current_stage = models.IntegerField(default=0)  # 0=submitted, 1=stage_1, 2=stage_2, 3=approved
    rejection_reason = models.TextField(blank=True)  # If rejected, store the reason
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'permits_workpermit'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['serial_number']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['current_stage']),
        ]

    def __str__(self):
        return f'Permit {self.serial_number or self.pk} — {self.user.email} ({self.get_status_display()})'

    @property
    def pdf_url(self):
        return self.pdf_file.url if self.pdf_file else None


class Approver(models.Model):
    """Manage approvers for each approval stage."""
    STAGE_CHOICES = [(1, 'Stage 1'), (2, 'Stage 2')]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='approver_roles')
    stage = models.IntegerField(choices=STAGE_CHOICES)
    is_admin = models.BooleanField(default=False)  # Super admin flag
    requires_reason_on_approval = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'permits_approver'
        unique_together = [('user', 'stage')]  # A user can only have one role per stage
        indexes = [
            models.Index(fields=['stage']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f'{self.user.email} — Stage {self.stage}'


class ApprovalLog(models.Model):
    """Audit trail for permit approvals."""
    ACTION_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Reinitiated'),
    ]
    
    permit = models.ForeignKey(WorkPermit, on_delete=models.CASCADE, related_name='approval_logs')
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approvals_given')
    stage = models.IntegerField(choices=[(1, 'Stage 1'), (2, 'Stage 2')])
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    reason = models.TextField(blank=True)  # For rejections or notes
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'permits_approvallog'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['permit', '-created_at']),
            models.Index(fields=['stage']),
        ]

    def __str__(self):
        return f'{self.approver.email} {self.action}d {self.permit} at Stage {self.stage}'
