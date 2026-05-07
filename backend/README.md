# Backend Deployment Guide

This backend is a Django REST API built for production deployment on Render or any Python host.

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
- `DEFAULT_FROM_EMAIL=noreply@workpermit.local`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`
- `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`

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
