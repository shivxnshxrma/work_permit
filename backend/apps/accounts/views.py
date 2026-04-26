from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings

from .serializers import RegisterSerializer, UserSerializer, CustomTokenSerializer, ForgotPasswordSerializer, ResetPasswordSerializer
from .models import User, PasswordResetToken
from apps.permits.models import Approver


def set_auth_cookies(response, access, refresh):
    cookie_max_age = 3600 * 24 * 30  # 30 days
    response.set_cookie(
        'access', access,
        max_age=cookie_max_age,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
    )
    response.set_cookie(
        'refresh', refresh,
        max_age=cookie_max_age,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
    )

class LoginView(TokenObtainPairView):
    """Return user profile and set HttpOnly cookies for tokens."""
    serializer_class = CustomTokenSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.get('access')
            refresh = response.data.get('refresh')
            # Set cookies
            set_auth_cookies(response, access, refresh)
            # Remove tokens from JSON body
            del response.data['access']
            del response.data['refresh']
        return response

class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get('refresh')
        if not refresh:
            return Response({'detail': 'Refresh token missing.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Inject refresh token into data so TokenRefreshView can validate it
        request.data['refresh'] = refresh
        try:
            response = super().post(request, *args, **kwargs)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        if response.status_code == status.HTTP_200_OK:
            access = response.data.get('access')
            # If rotation is on, refresh might also be returned
            new_refresh = response.data.get('refresh', refresh)
            set_auth_cookies(response, access, new_refresh)
            
            if 'access' in response.data:
                del response.data['access']
            if 'refresh' in response.data:
                del response.data['refresh']
                
        return response


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    
    response = Response({
        'user': UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)
    set_auth_cookies(response, str(refresh.access_token), str(refresh))
    return response


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
        refresh = request.COOKIES.get('refresh')
        if refresh:
            RefreshToken(refresh).blacklist()
    except Exception:
        pass
    response = Response({'detail': 'Logged out.'})
    response.delete_cookie('access')
    response.delete_cookie('refresh')
    return response


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
