# Scalable B2B Installment Sales Platform

White-label, highly configurable multi-tenant installment sales platform.
Business details, branding, and theme colors are fully editable through an admin panel.

## Tech Stack

**Backend**
- Node.js 20+ (ES modules)
- Express.js 4.21+
- MongoDB 6+ / Mongoose 8+
- JWT auth (Admin)
- bcryptjs, helmet, express-rate-limit, CORS, slugify, uuid

**Frontend** (Phase 1 in progress)
- Next.js 14+ (App Router)
- React 18 + Tailwind CSS 3.4+
- Lucide React, React Context (Auth, Theme, Business)

**DevOps**
- Docker + Docker Compose
- MongoDB Atlas ready

## Quick Start

```bash
git clone https://github.com/zaydattique/bilal-web-app.git
cd bilal-web-app

# Start MongoDB (or use Docker Compose)
docker compose up -d mongodb

# Backend
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT secrets
npm install
npm run seed
npm run dev
```

API runs at `http://localhost:5000`

**Health check:** `GET /api/health`

**Default Admin (after seed)**
- Email: `admin@bilalelectronics.pk`
- Password: `Admin@123`
- Business slug: `bilal-electronics`

## API Overview (Phase 1)

| Area | Base path |
|------|-----------|
| Auth | `/api/auth` |
| Business config | `/api/admin/business` |
| Categories | `/api/categories` |
| Products | `/api/products` |
| Customers | `/api/admin/customers` |
| Accounts / Installments | `/api/admin/accounts` |
| Payments | `/api/admin/payments` |
| Dashboard | `/api/admin/dashboard` |

## License
Private / Proprietary
