from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, PasswordResetToken
from apps.permits.models import Approver


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = [
            'email', 'username', 'first_name', 'last_name',
            'department', 'employee_id', 'phone',
            'password', 'password2',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    permit_count = serializers.SerializerMethodField()
    approver_stages = serializers.SerializerMethodField()
    requires_stage_2_approval_reason = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'department', 'employee_id', 'phone',
            'permit_count', 'approver_stages', 'requires_stage_2_approval_reason',
            'signature_url', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined', 'signature_url']

    def get_permit_count(self, obj):
        return obj.permits.count()

    def get_approver_stages(self, obj):
        return list(
            Approver.objects.filter(user=obj, is_admin=False)
            .order_by('stage')
            .values_list('stage', flat=True)
        )

    def get_requires_stage_2_approval_reason(self, obj):
        return Approver.objects.filter(
            user=obj,
            stage=2,
            is_admin=False,
            requires_reason_on_approval=True,
        ).exists()

    def get_signature_url(self, obj):
        if not obj.signature_image:
            return None
        request = self.context.get('request')
        url = obj.signature_image.url
        return request.build_absolute_uri(url) if request else url


class CustomTokenSerializer(TokenObtainPairSerializer):
    """Add user data alongside the JWT tokens."""

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise AuthenticationFailed('No active user with this email.')

        if not user.is_active:
            raise AuthenticationFailed('No active user with this email.')

        if not user.check_password(password):
            raise AuthenticationFailed('Incorrect password.')

        self.user = authenticate(
            request=self.context.get('request'),
            email=email,
            password=password,
        )

        if self.user is None:
            raise AuthenticationFailed('Incorrect password.')

        data = {}
        refresh = self.get_token(self.user)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        data['user'] = UserSerializer(self.user).data
        return data


class ForgotPasswordSerializer(serializers.Serializer):
    """Serialize forgot password requests."""
    email = serializers.EmailField()
    

    def validate_email(self, value):
        # Just validate it's a valid email format
        # Don't reveal if email exists or not (for security)
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Serialize password reset requests."""
    token = serializers.CharField(max_length=120)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs
