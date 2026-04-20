# Sikapa Architecture Review for KofKaN

This document maps Sikapa's structure to the KofKaN rebuild.

## 1) Structural parity

- **Sikapa:** `frontend/` + `backend/` monorepo
- **KofKaN:** same monorepo split with separate startup and env files

- **Sikapa backend:** `app/api/v1/<domain>/{routes,schemas,services}.py`
- **KofKaN backend:** same modular pattern for `products` and `categories`

- **Sikapa frontend:** App Router with reusable component slices
- **KofKaN frontend:** App Router + reusable `SiteHeader`, `SiteFooter`, and product grid blocks

## 2) Domain adaptation

- **Sikapa domain:** beauty/lifestyle catalog
- **KofKaN domain:** electronics inventory with SKU, brand, voltage spec, stock quantity

- Seeded categories are electronics-first:
  - Microcontrollers
  - Sensors
  - Power & Batteries

## 3) Design adaptation

- Kept KofKaN original palette:
  - `#000000`, `#ffffff`, `#333333`, `#a09696`, `#f8f8f8`, `#e0e0e0`
- Applied as global CSS variables and Tailwind color tokens
- Hero + section rhythm follows Sikapa pattern but with electronics messaging

## 4) Platform wiring

- FastAPI API routes: `/api/v1/products`, `/api/v1/categories`
- Next.js typed API client (`frontend/lib/api`)
- Supabase readiness:
  - backend config includes URL/anon/service-role keys
  - backend helper `app/core/supabase.py`
  - frontend Supabase env accessor

## 5) Next planned modules

- Auth/session parity with Sikapa flow
- Cart + checkout + order domain
- Admin inventory and product management views
- Payments integration and order lifecycle states
