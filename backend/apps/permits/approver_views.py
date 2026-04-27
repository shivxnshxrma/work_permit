from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image

from .models import WorkPermit, Approver, ApprovalLog
from .serializers import WorkPermitListSerializer, WorkPermitDetailSerializer
from .services import attach_permit_pdf, send_final_permit_email


def _get_approver_stages(user):
    """Get the stages where this user is an approver."""
    approvers = Approver.objects.filter(user=user, is_admin=False).values_list('stage', flat=True)
    return list(approvers)


def _get_approver_role(user, stage):
    try:
        return Approver.objects.get(user=user, stage=stage, is_admin=False)
    except Approver.DoesNotExist:
        return None


def _exclude_user_completed_stage_actions(queryset, user):
    """Hide permits where the current approver has already completed the active stage."""
    return queryset.exclude(
        approval_logs__approver=user,
        approval_logs__stage=2,
    ).distinct()


def _get_stage_2_available_actions(user, permit):
    approver_role = _get_approver_role(user, 2)
    if not approver_role:
        return []

    has_acted = ApprovalLog.objects.filter(
        permit=permit,
        approver=user,
        stage=2,
    ).exists()
    if has_acted:
        return []

    if approver_role.requires_reason_on_approval:
        return ['approve', 'final_approve', 'reinitiate']

    return ['final_approve', 'reinitiate']


def _signature_payload(user, request):
    signature_url = None
    if user.signature_image:
        signature_url = request.build_absolute_uri(user.signature_image.url)

    return {
        'has_signature': bool(user.signature_image),
        'signature_url': signature_url,
    }


def _snapshot_approval_signature(user, approval_log):
    signature = user.signature_image
    if not signature:
        return

    filename = signature.name.rsplit('/', 1)[-1] or 'signature.png'
    signature.open('rb')
    try:
        approval_log.signature_image.save(
            filename,
            ContentFile(signature.read()),
            save=True,
        )
    finally:
        signature.close()


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def approver_signature(request):
    """Upload or remove the authenticated approver's signature image."""
    stages = _get_approver_stages(request.user)
    if not stages:
        return Response(
            {'detail': 'You are not configured as an approver.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        return Response(_signature_payload(request.user, request))

    if request.method == 'DELETE':
        if request.user.signature_image:
            request.user.signature_image.delete(save=False)
            request.user.save(update_fields=['signature_image', 'updated_at'])
        return Response(_signature_payload(request.user, request))

    uploaded = request.FILES.get('signature_image')
    if not uploaded:
        return Response(
            {'detail': 'Signature image is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if uploaded.size > 2 * 1024 * 1024:
        return Response(
            {'detail': 'Signature image must be 2 MB or smaller.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    allowed_content_types = {'image/png', 'image/jpeg', 'image/webp'}
    if uploaded.content_type not in allowed_content_types:
        return Response(
            {'detail': 'Upload a PNG, JPG, or WEBP signature image.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        Image.open(uploaded).verify()
        uploaded.seek(0)
    except Exception:
        return Response(
            {'detail': 'Upload a valid signature image.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.user.signature_image:
        request.user.signature_image.delete(save=False)

    request.user.signature_image = uploaded
    request.user.save(update_fields=['signature_image', 'updated_at'])
    return Response(_signature_payload(request.user, request), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def approver_summary(request):
    """Return dashboard stats for the authenticated approver."""
    stages = _get_approver_stages(request.user)
    if not stages:
        return Response(
            {'detail': 'You are not configured as an approver.'},
            status=status.HTTP_403_FORBIDDEN
        )

    received = _exclude_user_completed_stage_actions(WorkPermit.objects.filter(
        current_stage__in=stages
    ).exclude(
        status__in=[
            WorkPermit.Status.STAGE_1_REJECTED,
            WorkPermit.Status.STAGE_2_REJECTED,
            WorkPermit.Status.CANCELLED,
            WorkPermit.Status.APPROVED,
        ]
    ), request.user).count()

    approved = ApprovalLog.objects.filter(approver=request.user, action='approved').count()
    rejected = ApprovalLog.objects.filter(approver=request.user, action='rejected').count()

    return Response({
        'approver_stages': stages,
        'stats': {
            'received': received,
            'approved': approved,
            'rejected': rejected,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def approver_permits(request):
    """Get permits pending approval for this approver."""
    stages = _get_approver_stages(request.user)
    if not stages:
        return Response(
            {'detail': 'You are not configured as an approver.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get permits in stage 1 if approver is in stage 1, or stage 2 if in stage 2
    permits = _exclude_user_completed_stage_actions(WorkPermit.objects.filter(
        current_stage__in=stages
    ).exclude(
        status__in=[
            WorkPermit.Status.STAGE_1_REJECTED,
            WorkPermit.Status.STAGE_2_REJECTED,
            WorkPermit.Status.CANCELLED,
            WorkPermit.Status.APPROVED,
        ]
    ), request.user).select_related('user').order_by('-created_at')

    serializer = WorkPermitListSerializer(permits, many=True)
    permit_data = serializer.data
    for item, permit in zip(permit_data, permits):
        item['available_actions'] = (
            _get_stage_2_available_actions(request.user, permit)
            if permit.current_stage == 2
            else ['approve', 'reinitiate']
        )
    return Response({
        'approver_stages': stages,
        'permits': permit_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def approver_permit_detail(request, pk):
    """Get a specific permit for approval."""
    stages = _get_approver_stages(request.user)
    if not stages:
        return Response(
            {'detail': 'You are not configured as an approver.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        permit = WorkPermit.objects.get(pk=pk, current_stage__in=stages)
    except WorkPermit.DoesNotExist:
        return Response(
            {'detail': 'Permit not found or not in your approval stage.'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = WorkPermitDetailSerializer(permit)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def approve_permit(request, pk):
    """Approve a permit."""
    stages = _get_approver_stages(request.user)
    if not stages:
        return Response(
            {'detail': 'You are not configured as an approver.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        permit = WorkPermit.objects.select_for_update().get(pk=pk, current_stage__in=stages)
    except WorkPermit.DoesNotExist:
        return Response(
            {'detail': 'Permit not found or not in your approval stage.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get the current stage from the approver's assigned stage
    current_stage = permit.current_stage
    if current_stage not in stages:
        return Response(
            {'detail': 'This permit is not in your assigned stage.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    approver_role = _get_approver_role(request.user, current_stage)
    reason = (request.data.get('reason') or '').strip()
    approval_type = (request.data.get('approval_type') or 'approve').strip()

    if ApprovalLog.objects.filter(
        permit=permit,
        approver=request.user,
        stage=current_stage,
    ).exists():
        return Response(
            {'detail': 'You have already completed an action for this permit at this stage.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if current_stage == 2 and approval_type not in {'approve', 'final_approve'}:
        return Response(
            {'detail': 'Invalid Stage 2 approval action.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if current_stage == 1 and approval_type != 'approve':
        return Response(
            {'detail': 'Invalid Stage 1 approval action.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if current_stage == 2 and approval_type == 'approve' and (not approver_role or not approver_role.requires_reason_on_approval):
        return Response(
            {'detail': 'Only the Stage 2 authority approver can record a non-final approval.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not request.user.signature_image:
        return Response(
            {'detail': 'Upload your signature image before approving permits.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    approval_log = ApprovalLog.objects.create(
        permit=permit,
        approver=request.user,
        stage=current_stage,
        action='approved',
        reason=reason
    )
    _snapshot_approval_signature(request.user, approval_log)

    # Move to next stage or approve
    if current_stage == 1:
        permit.status = WorkPermit.Status.STAGE_2
        permit.current_stage = 2
    elif current_stage == 2:
        if approval_type == 'approve':
            permit.status = WorkPermit.Status.STAGE_2
            permit.current_stage = 2
        else:
            permit.status = WorkPermit.Status.APPROVED
            permit.current_stage = 3

    permit.save(update_fields=['status', 'current_stage', 'updated_at'])
    attach_permit_pdf(permit)
    permit.save(update_fields=['pdf_file'])

    email_sent = False
    email_error = None
    if current_stage == 2 and permit.status == WorkPermit.Status.APPROVED:
        try:
            email_sent = send_final_permit_email(permit)
        except Exception as exc:
            email_error = str(exc)

    serializer = WorkPermitDetailSerializer(permit)
    if current_stage == 1:
        detail = 'Permit approved and moved to Stage 2.'
    elif permit.status == WorkPermit.Status.APPROVED:
        detail = 'Permit fully approved!'
    else:
        detail = 'Stage 2 approval recorded. Final approval is still required.'

    response = {
        'detail': detail,
        'permit': serializer.data,
    }
    if current_stage == 2 and permit.status == WorkPermit.Status.APPROVED:
        response['final_email_sent'] = email_sent
        if email_error:
            response['final_email_error'] = email_error
    return Response(response)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def reject_permit(request, pk):
    """Reject a permit."""
    stages = _get_approver_stages(request.user)
    if not stages:
        return Response(
            {'detail': 'You are not configured as an approver.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        permit = WorkPermit.objects.select_for_update().get(pk=pk, current_stage__in=stages)
    except WorkPermit.DoesNotExist:
        return Response(
            {'detail': 'Permit not found or not in your approval stage.'},
            status=status.HTTP_404_NOT_FOUND
        )

    current_stage = permit.current_stage
    reason = (request.data.get('reason') or '').strip()

    if ApprovalLog.objects.filter(
        permit=permit,
        approver=request.user,
        stage=current_stage,
    ).exists():
        return Response(
            {'detail': 'You have already completed an action for this permit at this stage.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not reason:
        return Response(
            {'detail': 'A reinitiation reason is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create approval log
    ApprovalLog.objects.create(
        permit=permit,
        approver=request.user,
        stage=current_stage,
        action='rejected',
        reason=reason
    )

    # Set to rejected status (employee must resubmit)
    if current_stage == 1:
        permit.status = WorkPermit.Status.STAGE_1_REJECTED
    elif current_stage == 2:
        permit.status = WorkPermit.Status.STAGE_2_REJECTED

    permit.current_stage = 0
    permit.rejection_reason = reason
    permit.save()

    serializer = WorkPermitDetailSerializer(permit)
    return Response({
        'detail': 'Permit sent back for reinitiation. Employee must create a new permit to resubmit.',
        'permit': serializer.data,
    })
