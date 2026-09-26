# Scalable B2B Installment Sales Platform

White-label, multi-tenant installment sales platform. Business name, branding colors, and settings are editable from the admin panel.

**Status: Phase 1 complete** (code on GitHub — not deployed live yet)

Repo: https://github.com/zaydattique/bilal-web-app

## What's included

### Backend (Express + MongoDB)
- JWT admin auth
- Business config (name, branding, contact, settings)
- Categories & products
- Customers (CNIC, guarantor)
- Installment accounts with **flexible schedules** (any dates/amounts)
- Payments with FIFO allocation to dues
- Dashboard KPIs + audit logging
- Seed script with demo data

### Frontend (Next.js 14 + Tailwind)
- Dynamic theme from business branding (CSS variables)
- Public home + product catalog
- Admin login
- Dashboard (collections, outstanding, overdue, upcoming dues)
- **CRUD forms:** products, categories, customers, accounts, payments
- Settings: business name, colors, contact, installment defaults

## Admin flows

1. Login → Dashboard
2. Settings → set colors / business name
3. Categories → Products
4. Customers → New Account (build installment plan)
5. Record Payment → auto-allocates to oldest dues

## Default seed credentials

After `npm run seed`:

| Field | Value |
|-------|--------|
| Email | `admin@bilalelectronics.pk` |
| Password | `Admin@123` |
| Business slug | `bilal-electronics` |

## Run (when you're ready)

```bash
git clone https://github.com/zaydattique/bilal-web-app.git
cd bilal-web-app

docker compose up -d mongodb   # or use MongoDB Atlas URI in .env

cd backend && cp .env.example .env && npm install && npm run seed && npm run dev
# → http://localhost:5000

cd frontend && cp .env.example .env.local && npm install && npm run dev
# → http://localhost:3000
# Admin: http://localhost:3000/admin/login
```

## API map

| Area | Path |
|------|------|
| Auth | `POST /api/auth/admin/login` |
| Business | `GET/PUT /api/admin/business` |
| Public theme | `GET /api/admin/business/public/:slug` |
| Categories | `/api/categories` |
| Products | `/api/products` |
| Customers | `/api/admin/customers` |
| Accounts | `/api/admin/accounts` |
| Payments | `/api/admin/payments` |
| Dashboard | `GET /api/admin/dashboard/summary` |

## Not in Phase 1

- Live hosting / deployment
- Customer self-service portal
- Image upload to S3
- SMS / WhatsApp / online payment gateways
- Bulk CSV import

## License

Private / Proprietary
