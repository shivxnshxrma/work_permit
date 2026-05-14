# Backend Deployment Guide

This backend is a Django REST API built for production deployment on Railway, Render, or any Python host.

## Recommended Railway configuration

Service root directory: `backend`

Build command:
```bash
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

Start command:
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

Set production variables in the Railway backend service Variables tab. Use Railway's RAW Editor to paste key/value pairs.

Required variables:
```env
SECRET_KEY=<strong-secret>
DEBUG=False
FRONTEND_URL=https://<your-vercel-host>
CORS_ALLOWED_ORIGINS=https://<your-vercel-host>
CSRF_TRUSTED_ORIGINS=https://<your-vercel-host>
ALLOWED_HOSTS=<your-railway-host>
AUTH_COOKIE_SAMESITE=None
AUTH_COOKIE_SECURE=True
DATABASE_URL=<render-postgres-external-url>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=<sender-gmail-address>
EMAIL_HOST_PASSWORD=<google-app-password>
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=<sender-gmail-address>
GATE_NO_2_EMAIL=<gate-no-2-recipient>
SUPER_ADMIN_EMAIL=<admin-login-email>
SUPER_ADMIN_PASSWORD=<admin-login-password>
```

`ALLOWED_HOSTS` can be omitted if you use the Railway-generated domain; the app reads `RAILWAY_PUBLIC_DOMAIN` automatically. Set it explicitly if you use a custom domain.

## Recommended Render configuration

Service type: `Web Service`

Root directory: `backend`

Build command:
```bash
pip install -r requirements.txt && python manage.py collectstatic --noinput
```

Start command:
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

### Required environment variables

- `SECRET_KEY` — a strong secret value
- `DEBUG=False`
- `ALLOWED_HOSTS=<your-backend-host>`
- `FRONTEND_URL=https://<your-vercel-host>`
- `CORS_ALLOWED_ORIGINS=https://<your-vercel-host>`
- `DATABASE_URL=<postgres-connection-url>`
- `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
- `DEFAULT_FROM_EMAIL=<same as EMAIL_HOST_USER or verified sender>`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`
- `GATE_NO_2_EMAIL=<gate no. 2 recipient for approved permit PDFs>`
- `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`

For a free Gmail SMTP setup, use `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, `EMAIL_USE_TLS=True`, and a Google App Password as `EMAIL_HOST_PASSWORD`.

## Postgres setup

1. Add a managed Postgres database to your Render project.
2. Copy the database URL and set it as `DATABASE_URL`.

Example `DATABASE_URL`:
```text
postgres://user:password@hostname:5432/dbname
```

The backend will automatically use Postgres when `DATABASE_URL` is present. If it is not set, the app falls back to SQLite for local development.

## Static files and Whitenoise

We use `whitenoise` for static file serving in production.
- `STATIC_ROOT` is `backend/staticfiles`
- `collectstatic` is required before the app is served

## Local development

Copy `backend/.env.example` to `backend/.env` and update values, then run:
```bash
cd backend
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py runserver
```
