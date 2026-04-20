# KofKaN Store backend

FastAPI service for the KofKaN electronics storefront: REST API under `/api/v1`, SQLModel persistence, Supabase-ready Postgres.

## Stack

- FastAPI + SQLModel
- PostgreSQL (e.g. Supabase) via `DATABASE_URL`, or SQLite for local use
- Modular routes: `app/api/v1/<domain>/`

## Run locally

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Useful endpoints

- `GET /health`
- `GET /api/v1/products`, `GET /api/v1/products/{id}`
- `GET /api/v1/categories`
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- `GET /api/v1/orders`, `POST /api/v1/orders/checkout`
- `POST /api/v1/payments/initialize`, `GET /api/v1/payments/verify/{reference}`
- `GET|POST /api/v1/wishlist`, `GET|POST /api/v1/reviews`, `GET|POST /api/v1/returns`
- `POST /api/v1/subscriptions/newsletter/subscribe`
- `GET /api/v1/admin/summary` and nested `/api/v1/admin/*` (authenticated admin)

## Notes

- Set `DATABASE_URL` to your Supabase Postgres connection string in production.
- Demo categories and products are seeded on startup when using the default SQLite path.
