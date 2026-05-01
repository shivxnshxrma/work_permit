import re

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import WorkPermit, Approver, ApprovalLog
from .services import attach_permit_pdf

SERIAL_NUMBER_PATTERN = re.compile(r'^DSHQ-\d{8}-\d+$')


def build_next_daily_serial_number(for_date=None):
    current_date = for_date or timezone.localdate()
    date_part = current_date.strftime('%Y%m%d')
    prefix = f'DSHQ-{date_part}-'
    existing_serials = WorkPermit.objects.filter(
        created_at__date=current_date,
        serial_number__startswith=prefix,
    ).values_list('serial_number', flat=True)

    max_suffix = 0
    for serial in existing_serials:
        try:
            max_suffix = max(max_suffix, int(serial.rsplit('-', 1)[-1]))
        except (TypeError, ValueError):
            continue

    return f'{prefix}{max_suffix + 1}'


class WorkPermitListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dashboard list view."""
    pdf_url     = serializers.ReadOnlyField()
    owner_name  = serializers.CharField(source='user.full_name', read_only=True)
    owner_email = serializers.CharField(source='user.email',     read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = WorkPermit
        fields = [
            'id', 'serial_number', 'location',
            'valid_from', 'valid_to', 'status', 'status_display',
            'current_stage', 'pdf_url', 'owner_name', 'owner_email', 'rejection_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class ApprovalLogSerializer(serializers.ModelSerializer):
    """Show approval history."""
    approver_name = serializers.CharField(source='approver.full_name', read_only=True)
    approver_email = serializers.CharField(source='approver.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = ApprovalLog
        fields = ['id', 'stage', 'action', 'action_display', 'approver_name', 'approver_email', 'reason', 'created_at']
        read_only_fields = fields


class WorkPermitDetailSerializer(serializers.ModelSerializer):
    """Full serializer including form_data payload and approval history."""
    pdf_url     = serializers.ReadOnlyField()
    owner_name  = serializers.CharField(source='user.full_name', read_only=True)
    owner_email = serializers.CharField(source='user.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approval_logs = ApprovalLogSerializer(many=True, read_only=True)

    class Meta:
        model  = WorkPermit
        fields = [
            'id', 'serial_number', 'location',
            'valid_from', 'valid_to', 'status', 'status_display',
            'current_stage', 'form_data', 'pdf_url', 'owner_name', 'owner_email',
            'rejection_reason', 'approval_logs',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner_name', 'owner_email', 'pdf_url', 'status', 'current_stage', 'approval_logs', 'rejection_reason', 'created_at', 'updated_at']


class WorkPermitCreateSerializer(serializers.ModelSerializer):
    """Accepts JSON permit data and generates the PDF on the backend."""
    pdf_file  = serializers.FileField(required=False, allow_null=True)
    form_data = serializers.JSONField(required=True)

    class Meta:
        model  = WorkPermit
        fields = [
            'serial_number', 'location',
            'valid_from', 'valid_to',
            'form_data', 'pdf_file',
        ]

    def validate_serial_number(self, value):
        if not SERIAL_NUMBER_PATTERN.match(value):
            raise serializers.ValidationError('Serial number must follow the DSHQ-YYYYMMDD-<number> format.')
        return value

    def validate(self, attrs):
        valid_from = attrs.get('valid_from')
        valid_to = attrs.get('valid_to')

        if valid_from and valid_to and valid_to < valid_from:
            raise serializers.ValidationError({'valid_to': 'Valid To cannot be earlier than Valid From.'})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop('pdf_file', None)
        validated_data['user'] = self.context['request'].user
        validated_data['serial_number'] = validated_data.get('serial_number') or build_next_daily_serial_number()
        validated_data['status'] = WorkPermit.Status.STAGE_1
        validated_data['current_stage'] = 1
        permit = super().create(validated_data)
        try:
            attach_permit_pdf(permit)
            permit.save(update_fields=['pdf_file'])
        except Exception as exc:
            raise serializers.ValidationError({'pdf_file': f'Failed to generate permit PDF from template: {exc}'})
        return permit

    @transaction.atomic
    def update(self, instance, validated_data):
        """Update a reinitialized permit and reset it to stage_1 for resubmission."""
        validated_data.pop('pdf_file', None)
        
        # Update the basic fields
        instance.serial_number = validated_data.get('serial_number', instance.serial_number)
        instance.location = validated_data.get('location', instance.location)
        instance.valid_from = validated_data.get('valid_from', instance.valid_from)
        instance.valid_to = validated_data.get('valid_to', instance.valid_to)
        instance.form_data = validated_data.get('form_data', instance.form_data)
        
        # Reset status and stage for resubmission
        instance.status = WorkPermit.Status.STAGE_1
        instance.current_stage = 1
        instance.rejection_reason = ''  # Clear the rejection reason
        
        instance.save()
        
        # Clear approval logs from all stages so approvers can take action again on resubmission
        # This allows both stage 1 and stage 2 approvers to review and act on the resubmitted permit
        ApprovalLog.objects.filter(permit=instance).delete()
        
        try:
            attach_permit_pdf(instance)
            instance.save(update_fields=['pdf_file'])
        except Exception as exc:
            raise serializers.ValidationError({'pdf_file': f'Failed to generate permit PDF from template: {exc}'})
        
        return instance


class ApproverSerializer(serializers.ModelSerializer):
    """Manage approvers."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)

    class Meta:
        model = Approver
        fields = ['id', 'user', 'user_email', 'user_name', 'stage', 'stage_display', 'requires_reason_on_approval', 'created_at']
        read_only_fields = ['id', 'user_email', 'user_name', 'stage_display', 'created_at']


class PermitApprovalSerializer(serializers.ModelSerializer):
    """Serializer for approvers to approve/reject permits."""
    action = serializers.ChoiceField(choices=['approved', 'rejected'])
    reason = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = ApprovalLog
        fields = ['action', 'reason']
