# DS Group — Work Permit System

Full-stack web application: React frontend + Django REST backend.
Users register/login with JWT auth, fill a 6-step work permit form,
the PDF is generated client-side with jsPDF, then saved to the
database alongside the user's account.

---

## Architecture

```
workpermit/
├── backend/                   # Django REST API
│   ├── apps/
│   │   ├── accounts/          # Custom User model + JWT auth
│   │   └── permits/           # WorkPermit model + CRUD + file upload
│   ├── config/                # settings, urls, wsgi
│   ├── media/                 # Uploaded PDFs (gitignored)
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/                  # React + Vite + Tailwind
    └── src/
        ├── api/client.js      # Axios + JWT interceptors
        ├── store/authStore.js # Zustand auth state
        ├── utils/pdfRenderer.js  # jsPDF permit drawing engine
        ├── components/
        │   ├── Layout.jsx     # AppLayout, ProtectedRoute, Breadcrumb
        │   └── FormElements.jsx # Field, YesNo, CheckPill, StatusBadge ...
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx  # List of user's saved permits
            ├── PermitForm.jsx # 6-step form → PDF → POST to API
            └── PermitDetail.jsx
```

---

## Data Flow

```
User fills PermitForm (6 steps)
        ↓
buildPermitPDF(formData)        — jsPDF draws entire A4 form in browser
        ↓
doc.output('blob')              — PDF as binary Blob, ~80KB
        ↓
FormData { pdf_file, form_data, serial_number, ... }
        ↓
POST /api/permits/create/       — multipart/form-data
        ↓
Django receives file + JSON     — saves PDF to media/permits/<user_id>/
        ↓
WorkPermit row in SQLite        — user_id FK, pdf_file path, form_data JSON
        ↓
Dashboard / PermitDetail        — GET /api/permits/ — list + download
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
EOF

# Run migrations
python manage.py makemigrations accounts permits
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

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

## API Endpoints

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register/ | Register → returns access + refresh + user |
| POST | /api/auth/login/    | Login → returns access + refresh + user |
| POST | /api/auth/refresh/  | Refresh access token |
| POST | /api/auth/logout/   | Blacklist refresh token |
| GET  | /api/auth/me/       | Get current user profile |
| PATCH| /api/auth/me/       | Update current user profile |

### Permits (all require Bearer token)
| Method | URL | Description |
|--------|-----|-------------|
| GET    | /api/permits/         | List current user's permits |
| POST   | /api/permits/create/  | Create permit + upload PDF |
| GET    | /api/permits/:id/     | Get permit detail + form_data |
| PATCH  | /api/permits/:id/     | Update permit fields |
| DELETE | /api/permits/:id/     | Delete permit + PDF file |
| GET    | /api/permits/:id/download/ | Stream PDF file |

---

## JWT Flow

```
Login → { access (8h), refresh (30d), user: {...} }
                ↓
All API requests: Authorization: Bearer <access>
                ↓
On 401 → POST /api/auth/refresh/ with refresh token
                ↓
If refresh expired → localStorage.clear() → redirect /login
```

---

## Database Schema

### accounts_user
```
id, email (unique), username, first_name, last_name,
department, employee_id, phone, created_at, updated_at
```

### permits_workpermit
```
id                  — auto PK
user_id             — FK → accounts_user
serial_number       — indexed
location
valid_from          — date
valid_to            — date
form_data           — JSONField (complete form payload)
pdf_file            — FileField → media/permits/<user_id>/<uuid>.pdf
status              — draft | submitted | approved | rejected
created_at
updated_at
```

---

## Production Checklist

- [ ] Set `DEBUG=False` in `.env`
- [ ] Set a strong `SECRET_KEY`
- [ ] Switch `DATABASES` to PostgreSQL
- [ ] Set `CORS_ALLOWED_ORIGINS` to your frontend domain
- [ ] Configure Django to serve `MEDIA_ROOT` via nginx / S3
- [ ] Set `SIMPLE_JWT.ACCESS_TOKEN_LIFETIME` as appropriate
- [ ] Run `python manage.py collectstatic`
- [ ] Serve Django with `gunicorn config.wsgi`
- [ ] Enable HTTPS
