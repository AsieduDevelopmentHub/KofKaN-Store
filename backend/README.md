# KofKaN Store Backend

FastAPI backend inspired by the Sikapa architecture, adapted for electronics commerce.

## Stack

- FastAPI + SQLModel
- Supabase-compatible PostgreSQL via `DATABASE_URL`
- Modular versioned API (`/api/v1`)

## Run locally

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## API endpoints

- `GET /health`
- `GET /api/v1/products`
- `GET /api/v1/categories`

## Notes

- For Supabase production, set `DATABASE_URL` to your Supabase Postgres connection string.
- Demo categories/products are seeded automatically on first startup.
