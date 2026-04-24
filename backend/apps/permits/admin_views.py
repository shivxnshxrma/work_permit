from django.http import FileResponse
from django.utils.dateparse import parse_date
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from .models import WorkPermit, Approver, ApprovalLog
from .serializers import ApproverSerializer, WorkPermitListSerializer, WorkPermitDetailSerializer
from .services import attach_permit_pdf


def _is_super_admin(request):
    """Check if the request user is a super admin."""
    try:
        approver = Approver.objects.get(user=request.user, is_admin=True)
        return True
    except Approver.DoesNotExist:
        return False


def _has_permit_operations_access(request):
    return _is_super_admin(request) or Approver.objects.filter(user=request.user, is_admin=False).exists()


def _pipeline_permits():
    """Permits that are part of the approval workflow stats."""
    return WorkPermit.objects.exclude(status=WorkPermit.Status.CANCELLED)


def _apply_date_filters(queryset, request):
    start_date_raw = request.query_params.get('start_date')
    end_date_raw = request.query_params.get('end_date')

    if not start_date_raw and not end_date_raw:
        return queryset, None

    start_date = parse_date(start_date_raw) if start_date_raw else None
    end_date = parse_date(end_date_raw) if end_date_raw else None

    if start_date_raw and start_date is None:
        return None, 'Invalid start_date. Use YYYY-MM-DD.'
    if end_date_raw and end_date is None:
        return None, 'Invalid end_date. Use YYYY-MM-DD.'
    if start_date and end_date and end_date < start_date:
        return None, 'End date cannot be before start date.'

    if start_date:
        queryset = queryset.filter(created_at__date__gte=start_date)
    if end_date:
        queryset = queryset.filter(created_at__date__lte=end_date)

    return queryset, None


def _permit_scope(filter_key):
    queryset = _pipeline_permits()

    if filter_key == 'total':
        return queryset
    if filter_key == 'submitted':
        return queryset.filter(status=WorkPermit.Status.SUBMITTED)
    if filter_key == 'stage_1':
        return queryset.filter(status=WorkPermit.Status.STAGE_1)
    if filter_key == 'stage_2':
        return queryset.filter(status=WorkPermit.Status.STAGE_2)
    if filter_key == 'approved':
        return queryset.filter(status=WorkPermit.Status.APPROVED)
    if filter_key == 'rejected':
        return queryset.filter(
            status__in=[WorkPermit.Status.STAGE_1_REJECTED, WorkPermit.Status.STAGE_2_REJECTED]
        )

    return None


def _normalize_requires_reason(stage, value):
    stage_value = int(stage)
    return stage_value == 2 and str(value).lower() in {'true', '1', 'yes', 'on'}


def _validate_stage_2_reason_assignment(stage, requires_reason, exclude_id=None):
    if int(stage) != 2 or not requires_reason:
        return None

    queryset = Approver.objects.filter(stage=2, is_admin=False, requires_reason_on_approval=True)
    if exclude_id:
        queryset = queryset.exclude(id=exclude_id)

    if queryset.exists():
        return 'Only one Stage 2 approver can be assigned as the authority approver at a time.'

    return None


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    """Authenticate as super admin with fixed credentials."""
    email = request.data.get('email')
    password = request.data.get('password')

    if email != settings.SUPER_ADMIN_EMAIL or password != settings.SUPER_ADMIN_PASSWORD:
        return Response(
            {'detail': 'Invalid admin credentials.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Get or create the super admin user
    user, _ = User.objects.get_or_create(
        email=settings.SUPER_ADMIN_EMAIL,
        defaults={
            'username': 'admin',
            'first_name': 'Super',
            'last_name': 'Admin',
        }
    )

    # Ensure admin is in Approver table with is_admin flag
    Approver.objects.update_or_create(
        user=user,
        stage=1,
        defaults={'is_admin': True}
    )

    refresh = RefreshToken.for_user(user)

    return Response({
        'detail': 'Admin authenticated.',
        'user_id': user.id,
        'email': user.email,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def approvers_list_create(request):
    """Get all approvers or add a new approver."""
    if not _is_super_admin(request):
        return Response(
            {'detail': 'Admin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        # Get count by stage
        stage_1 = Approver.objects.filter(stage=1, is_admin=False).count()
        stage_2 = Approver.objects.filter(stage=2, is_admin=False).count()
        approvers = Approver.objects.filter(is_admin=False).select_related('user')
        serializer = ApproverSerializer(approvers, many=True)
        return Response({
            'approvers': serializer.data,
            'counts': {'stage_1': stage_1, 'stage_2': stage_2},
            'max_per_stage': 3,
        })

    if request.method == 'POST':
        # Check limits
        stage = request.data.get('stage')
        if not stage:
            return Response(
                {'detail': 'Stage is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        count = Approver.objects.filter(stage=stage, is_admin=False).count()
        if count >= 3:
            return Response(
                {'detail': f'Maximum 3 approvers per stage. Stage {stage} already has {count}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create the user (user_id or email must be provided)
        user_id = request.data.get('user')
        if not user_id:
            return Response(
                {'detail': 'User ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if already an approver for this stage
        if Approver.objects.filter(user=user, stage=stage).exists():
            return Response(
                {'detail': f'{user.email} is already an approver for stage {stage}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        requires_reason = _normalize_requires_reason(stage, request.data.get('requires_reason_on_approval'))
        reason_error = _validate_stage_2_reason_assignment(stage, requires_reason)
        if reason_error:
            return Response({'detail': reason_error}, status=status.HTTP_400_BAD_REQUEST)

        approver = Approver.objects.create(
            user=user,
            stage=stage,
            is_admin=False,
            requires_reason_on_approval=requires_reason,
        )
        serializer = ApproverSerializer(approver)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def approver_delete(request, approver_id):
    """Update or remove an approver."""
    if not _is_super_admin(request):
        return Response(
            {'detail': 'Admin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        approver = Approver.objects.get(id=approver_id, is_admin=False)
        if request.method == 'PATCH':
            requires_reason = str(request.data.get('requires_reason_on_approval', 'false')).lower() in {'true', '1', 'yes', 'on'}
            reason_error = _validate_stage_2_reason_assignment(
                approver.stage,
                requires_reason,
                exclude_id=approver.id,
            )
            if reason_error:
                return Response({'detail': reason_error}, status=status.HTTP_400_BAD_REQUEST)

            approver.requires_reason_on_approval = approver.stage == 2 and requires_reason
            approver.save(update_fields=['requires_reason_on_approval'])
            return Response(ApproverSerializer(approver).data)

        approver.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Approver.DoesNotExist:
        return Response(
            {'detail': 'Approver not found.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard(request):
    """Admin dashboard statistics."""
    if not _has_permit_operations_access(request):
        return Response(
            {'detail': 'Permit operations access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    pipeline_permits, error = _apply_date_filters(_pipeline_permits(), request)
    if error:
        return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

    total_permits = pipeline_permits.count()
    submitted = pipeline_permits.filter(status=WorkPermit.Status.SUBMITTED).count()
    stage_1 = pipeline_permits.filter(status=WorkPermit.Status.STAGE_1).count()
    stage_2 = pipeline_permits.filter(status=WorkPermit.Status.STAGE_2).count()
    approved = pipeline_permits.filter(status=WorkPermit.Status.APPROVED).count()
    rejected = (
        pipeline_permits.filter(status=WorkPermit.Status.STAGE_1_REJECTED).count() +
        pipeline_permits.filter(status=WorkPermit.Status.STAGE_2_REJECTED).count()
    )

    stage_1_approvers = Approver.objects.filter(stage=1, is_admin=False).count()
    stage_2_approvers = Approver.objects.filter(stage=2, is_admin=False).count()

    return Response({
        'permits': {
            'total': total_permits,
            'submitted': submitted,
            'stage_1': stage_1,
            'stage_2': stage_2,
            'approved': approved,
            'rejected': rejected,
        },
        'approvers': {
            'stage_1': stage_1_approvers,
            'stage_2': stage_2_approvers,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_permit_list(request):
    """List permits for a selected statistics bucket."""
    if not _has_permit_operations_access(request):
        return Response(
            {'detail': 'Permit operations access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    filter_key = request.query_params.get('filter', 'total')
    permits = _permit_scope(filter_key)
    if permits is None:
        return Response(
            {'detail': 'Invalid permit filter.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    permits, error = _apply_date_filters(permits, request)
    if error:
        return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

    serializer = WorkPermitListSerializer(
        permits.select_related('user').order_by('-created_at'),
        many=True,
        context={'request': request},
    )
    return Response({
        'filter': filter_key,
        'permits': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_permit_detail(request, pk):
    """Show full permit detail for admin statistics drilldown."""
    if not _has_permit_operations_access(request):
        return Response(
            {'detail': 'Permit operations access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        permit = _pipeline_permits().select_related('user').get(pk=pk)
    except WorkPermit.DoesNotExist:
        return Response({'detail': 'Permit not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = WorkPermitDetailSerializer(permit, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_permit_download(request, pk):
    """Download an approved permit from the shared permit operations view."""
    if not _has_permit_operations_access(request):
        return Response(
            {'detail': 'Permit operations access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        permit = _pipeline_permits().get(pk=pk)
    except WorkPermit.DoesNotExist:
        return Response({'detail': 'Permit not found.'}, status=status.HTTP_404_NOT_FOUND)

    if permit.status != WorkPermit.Status.APPROVED:
        return Response(
            {'detail': 'Only approved permits can be downloaded.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    attach_permit_pdf(permit)
    permit.save(update_fields=['pdf_file'])

    if not permit.pdf_file:
        return Response(
            {'detail': 'No PDF is available for this permit.'},
            status=status.HTTP_404_NOT_FOUND
        )

    permit.pdf_file.open('rb')
    filename = permit.pdf_file.name.rsplit('/', 1)[-1] or f'permit_{permit.pk}.pdf'
    return FileResponse(permit.pdf_file, as_attachment=True, filename=filename)
