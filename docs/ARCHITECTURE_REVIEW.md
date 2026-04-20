# KofKaN Store architecture

Overview of how this repository is structured and how the pieces fit together.

## Monorepo

- **`frontend/`** and **`backend/`** are separate deployable apps with their own dependencies and environment files.
- The API is namespaced at **`/api/v1`**.

## Backend modules

- Domain code lives under `backend/app/api/v1/<domain>/` with **`routes`**, **`schemas`**, and **`services`** where applicable (e.g. products, payments, admin).
- Shared models: `backend/app/models.py`
- Configuration: `backend/app/core/config.py`
- Database session and SQLite compatibility helpers: `backend/app/db.py`

## Frontend

- App Router under `frontend/app/`
- Shared UI: `frontend/components/` (layout, product grid, payments, newsletter, etc.)
- Typed API clients: `frontend/lib/api/*` calling the FastAPI base URL

## Domain

- Electronics catalog: SKUs, brands, voltage specs, stock, categories
- Commerce: cart, orders, payment intents, webhooks (Paystack-oriented), returns, reviews, newsletter subscriptions
- Authorization: JWT access tokens; admin routes use permission strings on the user record

## Operations

- Production: configure `DATABASE_URL`, secrets, HTTPS, CORS, and payment webhook secrets per `backend/.env.example`
- Local: SQLite under `backend/db/` is optional; seed data runs on backend startup
