import base64
import json
import logging
from urllib import error, request

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage, send_mail


logger = logging.getLogger(__name__)


def _ensure_delivery_backend():
    if (
        not settings.DEBUG
        and settings.EMAIL_BACKEND in getattr(settings, 'NON_DELIVERY_EMAIL_BACKENDS', set())
    ):
        raise ImproperlyConfigured(
            'Production email is using a non-delivery EMAIL_BACKEND. '
            'Set RESEND_API_KEY for HTTPS email delivery or configure SMTP on a Railway Pro plan.'
        )


def _resend_from_email(from_email=None):
    return (
        from_email
        or getattr(settings, 'RESEND_FROM_EMAIL', '')
        or settings.DEFAULT_FROM_EMAIL
    )


def _send_resend_email(subject, body, to, *, from_email=None, attachments=None):
    api_key = getattr(settings, 'RESEND_API_KEY', '')
    if not api_key:
        return None

    recipients = to if isinstance(to, (list, tuple)) else [to]
    payload = {
        'from': _resend_from_email(from_email),
        'to': list(recipients),
        'subject': subject,
        'text': body,
    }
    if attachments:
        payload['attachments'] = [
            {
                'filename': item['filename'],
                'content': base64.b64encode(item['content']).decode('ascii'),
            }
            for item in attachments
        ]

    req = request.Request(
        getattr(settings, 'RESEND_API_URL', 'https://api.resend.com/emails'),
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'mneo-work-permit/1.0',
        },
        method='POST',
    )

    try:
        with request.urlopen(req, timeout=getattr(settings, 'EMAIL_TIMEOUT', 10)) as response:
            body_text = response.read().decode('utf-8')
            logger.info('Resend email accepted for %s; response=%s.', recipients, body_text)
            return 1
    except error.HTTPError as exc:
        error_body = exc.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Resend email failed with status {exc.code}: {error_body}') from exc


def send_plain_email(subject, body, to, *, from_email=None):
    sent_count = _send_resend_email(subject, body, to, from_email=from_email)
    if sent_count is not None:
        return sent_count > 0

    _ensure_delivery_backend()
    recipients = to if isinstance(to, (list, tuple)) else [to]
    return send_mail(
        subject,
        body,
        from_email or settings.DEFAULT_FROM_EMAIL,
        list(recipients),
        fail_silently=False,
    ) > 0


def send_email_with_attachments(subject, body, to, *, from_email=None, attachments=None):
    attachments = attachments or []
    sent_count = _send_resend_email(
        subject,
        body,
        to,
        from_email=from_email,
        attachments=attachments,
    )
    if sent_count is not None:
        return sent_count > 0

    _ensure_delivery_backend()
    recipients = to if isinstance(to, (list, tuple)) else [to]
    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email or settings.DEFAULT_FROM_EMAIL,
        to=list(recipients),
    )
    for attachment in attachments:
        email.attach(
            attachment['filename'],
            attachment['content'],
            attachment.get('content_type', 'application/octet-stream'),
        )
    return email.send(fail_silently=False) > 0
