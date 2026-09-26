# AI Build Prompt — Remaining Work for Bilal Web App (Admin-Only + Storefront Calculator)

You are a senior full-stack engineer working inside the existing repository at https://github.com/zaydattique/bilal-web-app.

Your job is to complete the remaining product work that is still missing from this app. The app is **ADMIN-ONLY** for all account management, reporting, and business logic. Customers have **NO portal or login**—they only see a public storefront with product browsing and an installment cost calculator.

Goal:
- Finish the app so it is a functional admin dashboard for installment sales business management.
- Complete the public storefront with product catalog and installment calculator (like China Corporation).
- Complete all admin reporting and data management screens.
- Preserve the backend that already exists.

Scope of work:
1. Complete public storefront (products, categories, calculator, no login)
2. Complete admin reporting UI pages and charts
3. Finish missing admin feature polish and forms
4. Improve security hardening and validation quality
5. Add tests where easy and low-risk

Do not do:
- No customer login or customer portal
- No customer account viewing
- No customer payment history viewing
- No deployment to Vercel, DigitalOcean, AWS, or any hosting
- No CI/CD setup
- No Docker/infra changes
- No redesign from scratch
- No major architecture rewrite

Important rules:
- Use the existing repo structure and patterns already present.
- Prefer minimal but production-quality changes.
- Reuse current auth contexts and API wrappers.
- Keep all API calls aligned with existing backend endpoints.
- Use Next.js + TypeScript + Tailwind.
- Maintain existing admin workflow and business flow.
- Do not invent new endpoints unless absolutely required.
- Public routes should NOT require authentication.

---

## Existing repo understanding

This repo already contains a working backend with these exposed areas:

Public/No-Auth Routes:
- GET /api/categories (list categories with custom fields)
- GET /api/categories/:slug (get category details)
- GET /api/products (list all products with filtering)
- GET /api/products/:slug (get product detail)
- GET /api/admin/business/public/:slug (get business branding/config by slug for storefront)

Admin-Only Routes (protected by protectAdmin middleware):
- POST /api/auth/admin/login
- GET /api/auth/me
- POST /api/auth/change-password
- GET/PUT /api/admin/business
- GET/POST/PUT/DELETE /api/admin/users
- GET/POST/PUT/DELETE /api/categories
- GET/POST/PUT/DELETE /api/products
- GET/POST/PUT/DELETE /api/admin/customers
- GET/POST/PUT/DELETE /api/admin/accounts
- GET/POST /api/admin/payments
- GET /api/admin/dashboard/summary
- GET /api/admin/reports/* (collections, customers, products, due-list, defaults)
- GET /api/admin/audit-log

The frontend already has some admin pages and auth contexts. Use those as the base. The storefront is minimal/missing.

---

## Tasks to complete

### TASK 1 — Complete Public Storefront (No Customer Auth)

Create public-facing pages that showcase products and allow customers to browse and calculate installment costs. This is the ONLY public customer interface.

Requirements:
- Public homepage with hero section, featured products
- Public products listing page with filters by category
- Public product detail page showing full product info
- Installment cost calculator (visible on product detail or floating)
- Shopping cart UI (display only—no checkout, no payment)
- Inquiry form for installment plans (collects: name, phone, email, product interested, preferred down payment %)
- All pages should show business branding (name, logo, colors) fetched from /api/admin/business/public/:slug
- No authentication required
- No customer login or account creation

Files to implement:
- frontend/src/app/(public)/page.tsx (homepage)
- frontend/src/app/(public)/products/page.tsx (products listing)
- frontend/src/app/(public)/products/[slug]/page.tsx (product detail)
- frontend/src/app/(public)/categories/[slug]/page.tsx (category page)
- frontend/src/components/public/HeroSlider.tsx
- frontend/src/components/public/ProductCard.tsx
- frontend/src/components/public/InstallmentCalculator.tsx (same logic as China Corporation)
- frontend/src/components/public/InquiryForm.tsx (name, phone, email, preferred down payment %)
- frontend/src/components/public/Cart.tsx (display cart items, no checkout)
- frontend/src/app/(public)/layout.tsx (public header/footer with business branding)
- frontend/src/lib/installmentLogic.ts (calculator math—reuse from China Corporation)

Acceptance criteria:
- Homepage loads and displays hero slider + featured products
- Products page shows all products with search/filter by category
- Product detail page shows images, price, description, installment calculator
- Calculator computes monthly payments based on price, down payment %, number of months
- Inquiry form submits to backend (creates a Lead in DB)
- Business branding (logo, name, colors) loads from public API
- No login required anywhere
- Mobile responsive design
- No broken TypeScript or lint issues

Implementation details:
- Installment calculator inputs: product price, down payment %, number of months (6/12/18/24)
- Calculator outputs: monthly payment amount, total cost with interest
- Interest rate: pull from business settings or default to 0% (admin can configure)
- Inquiry form: POST to /api/leads (may need to create this endpoint if not present)
- Shopping cart: just display selected products, no checkout flow
- Use existing Tailwind theme and brand colors from public API response

---

### TASK 2 — Complete Admin Dashboard & KPI Summary

The backend already has dashboard endpoints. Build clean UI for it.

Create/complete:
- frontend/src/app/admin/page.tsx (main dashboard)
- frontend/src/components/admin/DashboardKPIs.tsx
- frontend/src/components/admin/ChartWidgets.tsx

Requirements:
- GET /api/admin/dashboard/summary
- Display: total customers, total due, total collected (this month), overdue count, new customers this month
- Simple cards with numbers
- Optional: mini charts showing trends

---

### TASK 3 — Complete Admin Reports UI

The backend already exposes report endpoints. Build proper UI pages for them.

Create these pages:
- frontend/src/app/admin/reports/page.tsx (reports hub)
- frontend/src/app/admin/reports/collections/page.tsx
- frontend/src/app/admin/reports/customers/page.tsx
- frontend/src/app/admin/reports/products/page.tsx
- frontend/src/app/admin/reports/due-list/page.tsx
- frontend/src/app/admin/reports/defaults/page.tsx

Requirements:
- Use the API routes already present:
  - GET /api/admin/dashboard/summary
  - GET /api/admin/reports/collections
  - GET /api/admin/reports/customers
  - GET /api/admin/reports/products
  - GET /api/admin/reports/due-list
  - GET /api/admin/reports/defaults
  - GET /api/admin/audit-log
- Build clean summary cards and data tables
- Add charts where appropriate (use Recharts)
- Add filters for date range and status if supported by backend
- Use proper empty states and loading states

Acceptance criteria:
- All report pages load from the API without errors
- Data tables render cleanly with proper formatting
- Due list page shows overdue/upcoming/all filter states
- Charts render without crashing
- Numbers are formatted as PKR amounts
- Date formatting is consistent (DD-MM-YYYY)

---

### TASK 4 — Complete Admin CRUD & Settings Pages

The backend already has endpoints for all admin operations. Finish frontend forms.

Priority items:
- Finish business config UI (name, contact, policies, settings, payment methods)
- Finish branding UI (colors, fonts, logo upload)
- Finish admin user management (CRUD users, assign roles, view login history)
- Finish product management (create, edit, delete products with images)
- Finish category management (create, edit, delete, custom fields)
- Finish customer management (CRUD, search, view account history)
- Finish account management (create, list, view installment schedule, close account)
- Finish payment entry (record payment, allocate to installments, view history)

Files likely involved:
- frontend/src/app/admin/settings/business/page.tsx
- frontend/src/app/admin/settings/branding/page.tsx
- frontend/src/app/admin/settings/users/page.tsx
- frontend/src/app/admin/products/page.tsx
- frontend/src/app/admin/products/[id]/page.tsx
- frontend/src/app/admin/categories/page.tsx
- frontend/src/app/admin/customers/page.tsx
- frontend/src/app/admin/accounts/page.tsx
- frontend/src/app/admin/payments/page.tsx
- frontend/src/components/forms/* (create/edit forms)
- frontend/src/components/admin/* (list tables, modals)

Requirements:
- All forms validate input before submission
- All forms show success/error feedback
- All delete operations show confirmation dialog
- All list pages support search and filtering
- All forms use existing API endpoints (backend already implemented)
- Pagination support for large datasets
- Loading states on all buttons

---

### TASK 5 — Complete Leads Management (From Inquiry Form)

Customers submit installment inquiries via the public storefront. Admins view and manage them.

Create:
- frontend/src/app/admin/leads/page.tsx
- frontend/src/app/admin/leads/[id]/page.tsx
- Backend: GET/POST /api/admin/leads, PUT /api/admin/leads/:id

Requirements:
- Display list of leads (name, phone, email, product interested, status, created date)
- Status: new, contacted, qualified, converted, rejected
- Admin can update lead status
- Admin can convert lead to customer + create account
- Filter by status, date range
- Search by name/phone/email

---

### TASK 6 — Improve Backend Hardening & Validation Quality

This is a lower-risk improvement pass, but do not rewrite the project.

Add or harden:
- Better validation on all endpoints
- Pagination support for list endpoints (limit, skip params)
- Better error messaging on invalid payloads
- Sanitization for route params and strings
- Restrict/normalize business slug input
- Add logout endpoint that clears tokens (optional)
- More consistent response format on all routes

Files to inspect:
- backend/src/routes/*.js (all routes)
- backend/src/middleware/auth.js
- backend/src/middleware/errorHandler.js
- backend/src/models/*.js (validation schemas)

Requirements:
- No breaking changes to existing API clients
- Preserve current routing structure
- Keep response shape backward compatible
- Improve validation without altering route contracts

---

### TASK 7 — Add Light Test Coverage

Create a small test suite for the easiest wins.

Recommended:
- Auth middleware tests
- JWT generation tests
- Installment calculator tests
- Utility tests for date/currency formatting
- Form validation tests

Use Jest if not already present. Keep it lightweight.

Files to potentially create:
- backend/src/utils/*.test.js
- backend/src/middleware/*.test.js
- frontend/src/lib/*.test.ts

Requirements:
- Do not over-engineer
- Keep tests focused on core business logic
- Ensure they run locally

---

## Exact implementation priorities

Do the work in this order:
1. **Complete public storefront** (homepage, products, calculator, inquiry form)
2. **Complete admin dashboard** (KPIs, basic charts)
3. **Complete admin reports** (all report pages and charts)
4. **Complete admin CRUD** (all settings and management forms)
5. **Leads management** (view, convert, status)
6. **Backend hardening** (validation, pagination, error messaging)
7. **Light test coverage** (core logic only)

This order prioritizes the customer-visible pages first, then admin functionality.

---

## Technical expectations

### Frontend
- Use Next.js App Router conventions
- Use TypeScript where already present
- Use Tailwind for styling
- Keep routing consistent with current app structure
- Use existing design tokens/colors from app
- Use localStorage for admin token persistence
- Use react hooks and contexts instead of global state libraries
- Public pages should NOT use auth context
- Admin pages should use protectAdmin layout guard

### Backend
- Keep Express + MongoDB structure
- Use existing models and route patterns
- Keep admin authorization flow intact (protectAdmin)
- Respect multi-tenant business filtering via businessId
- Validate all admin routes with protectAdmin
- Public routes should have no auth requirement
- Create /api/admin/leads endpoints if not present

---

## Acceptance checklist before finishing

The work is only complete when all of the following are true:
- Public storefront is fully functional (products, calculator, inquiry form)
- Admin dashboard displays KPIs correctly
- All admin reports load and display data correctly
- All admin CRUD forms work (create, edit, delete)
- Leads management page works
- No broken API calls or unsupported routes
- No TypeScript errors
- No obvious UI bugs on desktop/tablet screens
- Loading, empty, and error states work
- Security protections remain active on admin routes
- Public routes require NO authentication
- App is stable and feels production-ready

---

## Final instruction to the coding agent

Build only the remaining work described above. Do not do deployment or infra work. Make the app feel complete, stable, and production-clean for a real business product.

**Key rule**: NO customer login, NO customer portal, NO customer account viewing. Customers can ONLY:
- Browse products
- Calculate installment costs
- Submit inquiry forms

Everything else is admin-only.

---

## Recommended commit strategy

Use focused commits to keep review manageable:
1. Public storefront pages (products, calculator, inquiry form)
2. Admin dashboard and KPI pages
3. Admin reports pages and charts
4. Admin CRUD forms and settings
5. Leads management
6. Backend hardening and validation
7. Tests

---

## Summary

This is the remaining work to make this app production-ready for an admin-only installment sales platform:
- Public storefront with product browsing and installment calculator
- Complete admin dashboard with all reports and data management
- All admin CRUD operations
- Leads inquiry management
- Backend quality improvements
- Light test coverage

No customer portals, no customer logins, no customer-facing account management. Admin runs everything.
