# DS Group — Work Permit System

Full-stack web application: React frontend + Django REST backend.
Users register/login, fill a multi-step work permit form, the PDF is
generated server-side from a template, and routed through a two-stage
approval workflow. Auth is handled via secure HttpOnly cookies.

---

## Architecture

```
workpermit/
├── backend/                       # Django REST API
│   ├── apps/
│   │   ├── accounts/              # Custom User model, JWT cookie auth, password reset
│   │   │   ├── authentication.py  # JWTCookieAuthentication — reads token from cookie
│   │   │   ├── models.py          # User, PasswordResetToken
│   │   │   ├── serializers.py     # RegisterSerializer, UserSerializer, CustomTokenSerializer
│   │   │   └── views.py           # Login, Register, Logout, Me, ForgotPassword, ResetPassword
│   │   └── permits/               # Permit lifecycle + approval workflow
│   │       ├── models.py          # WorkPermit, Approver, ApprovalLog
│   │       ├── serializers.py     # WorkPermit CRUD + serial number generation
│   │       ├── services.py        # PDF template filling (pypdf) + email dispatch
│   │       ├── views.py           # Employee permit CRUD + download
│   │       ├── approver_views.py  # Approver queue, approve/reject actions
│   │       └── admin_views.py     # Admin login, approver mgmt, dashboard stats
│   ├── config/                    # settings, urls, wsgi
│   ├── media/                     # Generated PDFs (gitignored)
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/                      # React + Vite + Tailwind CSS
    └── src/
        ├── api/client.js          # Axios + cookie-based JWT + refresh queue
        ├── store/authStore.js     # Zustand auth state (user profile only)
        ├── utils/
        │   ├── cn.js              # clsx + tailwind-merge utility
        │   └── constants.js       # Shared storage keys + app constants
        ├── components/
        │   ├── Layout.jsx         # AppLayout, ProtectedRoute, AdminProtectedRoute, Breadcrumb
        │   ├── FormElements.jsx   # Field, YesNo, CheckPill, StatusBadge, Spinner, EmptyState
        │   ├── ApproversManager.jsx  # Admin: manage stage 1 & 2 approvers
        │   └── admin/
        │       └── AdminPermitStatsExplorer.jsx  # Admin permit stats + drill-down
        └── pages/
            ├── Login.jsx
            ├── AdminLogin.jsx
            ├── Register.jsx
            ├── Dashboard.jsx       # Employee permit list
            ├── AdminDashboard.jsx  # Admin stats, approver overview, approver mgmt
            ├── PermitForm.jsx      # Multi-step permit form → POST to API
            └── PermitDetail.jsx
```

---

## Authentication

JWT tokens are stored exclusively in **HttpOnly, Secure, SameSite=Lax cookies** — never in `localStorage` or `sessionStorage`. Only the non-sensitive user profile object (name, email, roles) is stored in `localStorage` via Zustand.

```
Login → Server sets HttpOnly cookies: access (8h), refresh (30d)
              ↓
All API requests: cookies sent automatically (withCredentials: true)
              ↓
On 401 → POST /api/auth/refresh/ (reads refresh cookie server-side)
              ↓
New access cookie issued. Concurrent requests are queued + replayed.
              ↓
If refresh expired → 'auth-error' event → Zustand clears state → redirect /login
```

---

## Data Flow — Permit Creation

```
User fills PermitForm (multi-step)
        ↓
POST /api/permits/create/          — JSON form_data
        ↓
Django serializer validates + saves WorkPermit row
        ↓
services.py fills PDF template (pypdf) server-side
        ↓
PDF saved to media/permits/<user_id>/<uuid>.pdf
        ↓
Permit enters Stage 1 approval queue automatically
        ↓
Stage 1 approver → approves → Stage 2
Stage 2 approver → final approves → APPROVED + email sent
        ↓
Employee can download approved PDF
```

---

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
SECRET_KEY=your-secret-key-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost 127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173 http://localhost:3000
SUPER_ADMIN_EMAIL=admin@yourcompany.com
SUPER_ADMIN_PASSWORD=your-secure-admin-password
EOF

# Run migrations
python manage.py migrate

# Start dev server
python manage.py runserver
# → http://localhost:8000
```

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api → localhost:8000)
npm run dev
# → http://localhost:5173
```

---

## Deployment

For backend-specific setup and Render/Postgres config, see `backend/README.md`.

### Backend on Render

1. Create a new Render Web Service from this repo.
2. Set the service root to `backend`.
3. Use:
   - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - Start Command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
4. Set environment variables in Render or use `render.yaml`:
   - `SECRET_KEY`
   - `DEBUG=False`
   - `ALLOWED_HOSTS=<your-backend-host>`
   - `FRONTEND_URL=https://<your-vercel-host>`
   - `CORS_ALLOWED_ORIGINS=https://<your-vercel-host>`
   - `DATABASE_URL=<your-render-postgres-url>`
   - `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
   - `DEFAULT_FROM_EMAIL=noreply@workpermit.local`
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`
   - `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`

### Frontend on Vercel

1. Deploy the `frontend` folder as a Vercel project.
2. Use default Vite settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Set environment variable:
   - `VITE_API_URL=https://<your-backend-host>/api`
4. `frontend/vercel.json` is included to support client-side routing in the deployed app.

### Postgres on Render

- Add a managed Postgres database to the same Render project.
- Copy the provided Postgres connection string into `DATABASE_URL`.
- Example:
  ```text
  postgres://user:password@hostname:5432/dbname
  ```
- The app automatically uses this connection when `DATABASE_URL` is set.

### Local backend setup

- Copy `backend/.env.example` to `backend/.env`
- Update values for `SECRET_KEY`, `FRONTEND_URL`, `EMAIL_*`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD`
- Run migrations locally with:
  ```bash
  cd backend
  ../.venv/bin/python manage.py migrate
  ```

---

## API Endpoints

### Auth
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | /api/auth/register/ | Public | Register + set auth cookies |
| POST | /api/auth/login/ | Public | Login + set auth cookies |
| POST | /api/auth/refresh/ | Cookie | Rotate tokens via cookie |
| POST | /api/auth/logout/ | Cookie | Blacklist refresh + clear cookies |
| GET/PATCH | /api/auth/me/ | Cookie | Get/update current user profile |
| GET | /api/auth/users/ | Admin | List all users |
| POST | /api/auth/forgot-password/ | Public | Request password reset |
| POST | /api/auth/reset-password/ | Public | Reset password with token |

### Permits (Employee)
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/permits/ | List current user's permits |
| POST | /api/permits/create/ | Create permit + generate PDF |
| GET | /api/permits/:id/ | Get permit detail + form_data |
| DELETE | /api/permits/:id/ | Cancel permit |
| GET | /api/permits/:id/download/ | Download approved PDF |

### Approvals (Approvers)
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/permits/approvals/summary/ | Approver dashboard stats |
| GET | /api/permits/approvals/pending/ | Permits awaiting action |
| GET | /api/permits/approvals/:id/ | Permit detail for review |
| POST | /api/permits/approvals/:id/approve/ | Approve permit |
| POST | /api/permits/approvals/:id/reject/ | Reinitiate permit |

### Admin
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/permits/admin/login/ | Admin login + set cookies |
| GET/POST | /api/permits/admin/approvers/ | List / add approvers |
| PATCH/DELETE | /api/permits/admin/approvers/:id/ | Update / remove approver |
| GET | /api/permits/admin/dashboard/ | Stats + approver lists |
| GET | /api/permits/admin/permits/ | All permits (filterable) |
| GET | /api/permits/admin/permits/:id/ | Permit detail |
| GET | /api/permits/admin/permits/:id/download/ | Download any approved PDF |

---

## Database Schema

### accounts_user
```
id, email (unique), username, first_name, last_name,
department, employee_id, phone, created_at, updated_at
```

### permits_workpermit
```
id, user_id (FK), serial_number (indexed), location,
valid_from, valid_to, form_data (JSON), pdf_file,
status, current_stage, rejection_reason,
created_at, updated_at
```

### permits_approver
```
id, user_id (FK), stage (1|2), is_admin,
requires_reason_on_approval, created_at
```

### permits_approvallog
```
id, permit_id (FK), approver_id (FK), stage, action, reason, created_at
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + Vite |
| Styling | Tailwind CSS 3 |
| State Management | Zustand |
| HTTP Client | Axios (cookie-based, withCredentials) |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Backend Framework | Django 4.2 + Django REST Framework |
| Auth | SimpleJWT (HttpOnly cookies) |
| PDF Generation | pypdf (server-side template filling) |
| Database | SQLite (dev) → PostgreSQL (production) |
| CORS | django-cors-headers |

---

## Production Checklist

- [ ] Set `DEBUG=False` in `.env`
- [ ] Set a strong `SECRET_KEY` (50+ chars)
- [ ] Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` (no defaults)
- [ ] Switch `DATABASES` to PostgreSQL
- [ ] Set `CORS_ALLOWED_ORIGINS` to your frontend domain only
- [ ] Add `rest_framework_simplejwt.token_blacklist` and set `BLACKLIST_AFTER_ROTATION=True`
- [ ] Configure media file serving via Nginx or cloud storage (S3/GCS)
- [ ] Add Whitenoise for static files (`pip install whitenoise`)
- [ ] Run `python manage.py collectstatic`
- [ ] Serve Django with `gunicorn config.wsgi`
- [ ] Enable HTTPS + set security headers in settings
- [ ] Configure email backend (SMTP) for password reset + permit approval emails
- [ ] Set `FINAL_PERMIT_EMAIL` for approved permit notifications
