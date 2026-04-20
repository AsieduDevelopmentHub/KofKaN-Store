# KofKaN Store

Monorepo for the KofKaN electronics storefront: a Next.js customer app and a FastAPI API.

## Repository layout

- `frontend/` — Next.js App Router (TypeScript, Tailwind)
- `backend/` — FastAPI, SQLModel, versioned routes under `/api/v1`
- `docs/` — architecture and integration notes

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** FastAPI, SQLModel
- **Database:** Supabase Postgres in production, or SQLite for local development

## Design

Palette (original KofKaN):

- Primary `#000000`, secondary `#ffffff`, accent `#333333`
- Muted text `#a09696`, soft background `#f8f8f8`, border `#e0e0e0`

## Run locally

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

Set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` if the API is not at `http://127.0.0.1:8000/api/v1`.

## Features (high level)

- Storefront: shop, product detail, reviews, wishlist, cart, checkout, orders, payments (initialize / verify)
- Auth: email/password and Google via Supabase
- Admin: dashboard, users, orders, inventory, payments, newsletter list, security settings snapshot
