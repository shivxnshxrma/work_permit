import os
from django.http import FileResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import WorkPermit
from .serializers import (
    WorkPermitListSerializer,
    WorkPermitDetailSerializer,
    WorkPermitCreateSerializer,
    build_next_daily_serial_number,
)
from apps.permits.models import Approver
from apps.permits.services import attach_permit_pdf


DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50


def _pagination_params(request):
    try:
        page = max(int(request.query_params.get('page', 1)), 1)
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.query_params.get('page_size', DEFAULT_PAGE_SIZE))
    except (TypeError, ValueError):
        page_size = DEFAULT_PAGE_SIZE

    page_size = min(max(page_size, 1), MAX_PAGE_SIZE)
    offset = (page - 1) * page_size
    return page, page_size, offset


def _paginated_response(queryset, serializer_class, request, result_key='permits', extra=None):
    page, page_size, offset = _pagination_params(request)
    total = queryset.count()
    items = list(queryset[offset:offset + page_size])
    serializer = serializer_class(items, many=True, context={'request': request})
    payload = {
        result_key: serializer.data,
        'count': total,
        'page': page,
        'page_size': page_size,
        'has_next': offset + page_size < total,
    }
    if extra:
        payload.update(extra)
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def next_serial_number(request):
    if Approver.objects.filter(user=request.user, is_admin=False).exists():
        return Response(
            {'detail': 'Approvers cannot create new permits.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response({'serial_number': build_next_daily_serial_number()})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def permit_list(request):
    """Return the authenticated user's permits, newest first."""
    permits = WorkPermit.objects.filter(user=request.user).select_related('user').order_by('-created_at')
    return _paginated_response(permits, WorkPermitListSerializer, request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def permit_create(request):
    """
    Receive JSON permit data and generate the stored PDF from the backend template.
    """
    if Approver.objects.filter(user=request.user, is_admin=False).exists():
        return Response(
            {'detail': 'Approvers cannot create new permits.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = WorkPermitCreateSerializer(
        data=request.data,
        context={'request': request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    permit = serializer.save()
    return Response(
        WorkPermitDetailSerializer(permit, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def permit_download(request, pk):
#     """Download the PDF for an approved or reinitialized permit owned by the authenticated user."""
#     try:
#         permit = WorkPermit.objects.get(pk=pk, user=request.user)
#     except WorkPermit.DoesNotExist:
#         return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

#     # Allow download for approved permits and reinitialized permits
#     allowed_statuses = [
#         WorkPermit.Status.APPROVED,
#         WorkPermit.Status.STAGE_1_REJECTED,
#         WorkPermit.Status.STAGE_2_REJECTED,
#     ]
    
#     if permit.status not in allowed_statuses:
#         return Response(
#             {'detail': 'This permit cannot be downloaded. Only approved or reinitialized permits can be downloaded.'},
#             status=status.HTTP_400_BAD_REQUEST,
#         )

#     attach_permit_pdf(permit)
#     permit.save(update_fields=['pdf_file'])

#     if not permit.pdf_file:
#         return Response(
#             {'detail': 'No PDF is available for this permit.'},
#             status=status.HTTP_404_NOT_FOUND,
#         )

#     permit.pdf_file.open('rb')
#     filename = permit.pdf_file.name.rsplit('/', 1)[-1] or f'permit_{permit.pk}.pdf'
#     return FileResponse(permit.pdf_file, as_attachment=True, filename=filename)
# backend/apps/permits/views.py

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def permit_download(request, pk):
    """Download the PDF for an approved or reinitialized permit owned by the authenticated user."""
    try:
        permit = WorkPermit.objects.get(pk=pk, user=request.user)
    except WorkPermit.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Allow download for approved permits and reinitialized permits
    allowed_statuses = [
        WorkPermit.Status.APPROVED,
        WorkPermit.Status.STAGE_1_REJECTED,
        WorkPermit.Status.STAGE_2_REJECTED,
    ]
    
    if permit.status not in allowed_statuses:
        return Response(
            {'detail': 'This permit cannot be downloaded. Only approved or reinitialized permits can be downloaded.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # FIX: Don't re-generate the PDF on every download!
    # Only generate it if it's missing (it should have been generated during approval).
    if not permit.pdf_file:
        attach_permit_pdf(permit)
        permit.save(update_fields=['pdf_file'])

    if not permit.pdf_file:
        return Response(
            {'detail': 'No PDF is available for this permit.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    permit.pdf_file.open('rb')
    filename = permit.pdf_file.name.rsplit('/', 1)[-1] or f'permit_{permit.pk}.pdf'
    return FileResponse(permit.pdf_file, as_attachment=True, filename=filename)

@api_view(['GET', 'DELETE', 'PATCH'])
@permission_classes([IsAuthenticated])
def permit_detail(request, pk):
    """Get, update, or cancel a permit."""
    try:
        permit = WorkPermit.objects.get(pk=pk, user=request.user)
    except WorkPermit.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(WorkPermitDetailSerializer(permit, context={'request': request}).data)

    # PATCH: Update a reinitialized permit and resubmit it
    if request.method == 'PATCH':
        # Only allow editing of reinitialized permits
        if permit.status not in [WorkPermit.Status.STAGE_1_REJECTED, WorkPermit.Status.STAGE_2_REJECTED]:
            return Response(
                {'detail': f'Only reinitialized permits can be edited. Current status: {permit.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use create serializer for validation and data handling
        serializer = WorkPermitCreateSerializer(
            permit,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Save the updated permit and reset status to stage_1
        permit = serializer.save(is_resubmission=True)
        return Response(
            WorkPermitDetailSerializer(permit, context={'request': request}).data,
            status=status.HTTP_200_OK
        )

    # DELETE: Cancel the permit
    if permit.status in [WorkPermit.Status.STAGE_1_REJECTED, WorkPermit.Status.STAGE_2_REJECTED, WorkPermit.Status.APPROVED]:
        return Response(
            {'detail': f'Cannot cancel a permit with status: {permit.get_status_display()}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    permit.status = WorkPermit.Status.CANCELLED
    permit.current_stage = 0
    permit.save()
    return Response({'detail': 'Permit cancelled successfully.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def permit_submit_for_approval(request, pk):
    """Compatibility endpoint for older clients; current create flow already enters Stage 1."""
    try:
        permit = WorkPermit.objects.get(pk=pk, user=request.user)
    except WorkPermit.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if permit.status == WorkPermit.Status.STAGE_1:
        serializer = WorkPermitDetailSerializer(permit, context={'request': request})
        return Response({
            'detail': 'Permit is already in Stage 1 review.',
            'permit': serializer.data,
        })

    if permit.status != WorkPermit.Status.SUBMITTED:
        return Response(
            {'detail': f'Permit must be in Submitted status. Current: {permit.get_status_display()}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Move to stage 1
    permit.status = WorkPermit.Status.STAGE_1
    permit.current_stage = 1
    permit.save()

    serializer = WorkPermitDetailSerializer(permit, context={'request': request})
    return Response({
        'detail': 'Permit submitted for approval. It is now in Stage 1 review.',
        'permit': serializer.data,
    })
