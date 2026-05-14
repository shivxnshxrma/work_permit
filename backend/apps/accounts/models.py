import secrets
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


def signature_upload_path(instance, filename):
    """Store approver signatures under media/signatures/<user_id>/<uuid>.<ext>."""
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'png'
    return f'signatures/{instance.pk or "new"}/{uuid.uuid4().hex}.{ext}'


class User(AbstractUser):
    """Extended user model with profile fields."""
    email      = models.EmailField(unique=True)
    department = models.CharField(max_length=150, blank=True)
    employee_id = models.CharField(max_length=50, blank=True)
    phone      = models.CharField(max_length=20, blank=True)
    signature_image = models.ImageField(upload_to=signature_upload_path, null=True, blank=True)
    signature_image_data = models.BinaryField(null=True, blank=True)
    signature_image_content_type = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'accounts_user'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_full_name()} <{self.email}>'

    @property
    def full_name(self):
        return self.get_full_name() or self.username


class PasswordResetToken(models.Model):
    """Stores password reset tokens with expiration."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='password_reset_token')
    token = models.CharField(max_length=120, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f'Reset token for {self.user.email}'

    def is_valid(self):
        return timezone.now() < self.expires_at

    @classmethod
    def create_for_user(cls, user):
        """Create a new reset token for a user (expires in 1 hour)."""
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=1)
        obj, _ = cls.objects.update_or_create(
            user=user,
            defaults={'token': token, 'expires_at': expires_at}
        )
        return obj
