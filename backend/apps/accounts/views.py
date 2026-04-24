from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer, CustomTokenSerializer, ForgotPasswordSerializer, ResetPasswordSerializer
from .models import User, PasswordResetToken
from apps.permits.models import Approver


class LoginView(TokenObtainPairView):
    """Return access + refresh tokens plus user profile."""
    serializer_class = CustomTokenSerializer
    permission_classes = [AllowAny]


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response({
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'user':    UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)

    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def users(request):
    """List users for authenticated admin tooling."""
    if not Approver.objects.filter(user=request.user, is_admin=True).exists():
        return Response(
            {'detail': 'Admin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    queryset = User.objects.exclude(email='admin@dsgroup.com').order_by('first_name', 'last_name', 'email')
    return Response(UserSerializer(queryset, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout(request):
    try:
        RefreshToken(request.data['refresh']).blacklist()
    except Exception:
        pass
    return Response({'detail': 'Logged out.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Request a password reset token via email."""
    serializer = ForgotPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=serializer.validated_data['email'])
        reset_token = PasswordResetToken.create_for_user(user)
        
        # TODO: Send email with reset link using Django's email backend
        # For now, we'll return the token (in production, only send via email)
        return Response({
            'detail': 'Password reset email sent.',
            'token': reset_token.token,  # Remove in production after email is implemented
        })
    except User.DoesNotExist:
        # Return generic message for security (don't reveal if email exists)
        return Response(
            {'detail': 'If an account exists with this email, you will receive reset instructions.'},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'detail': f'An error occurred: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password using a valid token."""
    serializer = ResetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        reset_token = PasswordResetToken.objects.get(token=serializer.validated_data['token'])
    except PasswordResetToken.DoesNotExist:
        return Response(
            {'detail': 'Invalid or expired reset token.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not reset_token.is_valid():
        return Response(
            {'detail': 'Reset token has expired. Please request a new one.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = reset_token.user
    user.set_password(serializer.validated_data['password'])
    user.save()
    reset_token.delete()

    return Response({'detail': 'Password reset successfully. Please log in with your new password.'})
