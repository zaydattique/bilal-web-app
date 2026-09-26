# Scalable B2B Installment Sales Platform

White-label, highly configurable multi-tenant installment sales platform.
Business details, branding, and theme colors are fully editable through an admin panel.

## Tech Stack

**Backend**
- Node.js 20+ (ES modules)
- Express.js 4.21+
- MongoDB 6+ / Mongoose 8+
- JWT auth (Admin + Customer)
- bcryptjs, helmet, express-rate-limit, CORS

**Frontend**
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

# Backend
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

**Default Admin**
- Email: `admin@example.com`
- Password: `Admin@123`

## License
Private / Proprietary
