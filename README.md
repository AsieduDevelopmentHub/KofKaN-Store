# KofKaN Store Rebuild

KofKaN Store has been rebuilt to follow the Sikapa architecture pattern while adapting the product domain for electronics.

## Architecture (Sikapa-inspired)

- `frontend/` - Next.js App Router storefront (TypeScript + Tailwind)
- `backend/` - FastAPI app with modular versioned routes (`/api/v1`)
- `backend/app/core` - environment/config settings
- `backend/app/api/v1/*` - domain modules (`products`, `categories`)
- `backend/app/models.py` - SQLModel entities (Supabase/Postgres compatible)

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLModel
- Database: Supabase Postgres (or SQLite for local bootstrap)

## Design System

The new storefront keeps the original KofKaN palette:

- Primary: `#000000`
- Secondary: `#ffffff`
- Accent: `#333333`
- Muted text: `#a09696`
- Soft background: `#f8f8f8`
- Border: `#e0e0e0`

## Run Locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Frontend defaults to `http://127.0.0.1:8000/api/v1`.
