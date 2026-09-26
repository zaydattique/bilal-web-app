# AI Build Prompt — Remaining Work for Bilal Web App (No Deployment)

You are a senior full-stack engineer working inside the existing repository at https://github.com/zaydattique/bilal-web-app.

Your job is to complete the remaining product work that is still missing from this app, without changing the business logic or scope of the project. Do not do deployment, hosting, CI/CD setup, or production infrastructure tasks in this prompt.

Goal:
- Finish the app so it is functional as a real installment sales platform for appliance sales.
- Preserve the backend that already exists.
- Complete the missing frontend customer portal and reporting UI.
- Tighten app quality and make the product feel complete and usable.

Scope of work:
1. Complete the customer portal frontend
2. Complete the admin reporting UI pages and charts
3. Finish missing admin feature polish and forms
4. Improve security hardening and validation quality
5. Add tests where easy and low-risk
6. Ensure app works with the existing API contracts already in the repo

Do not do:
- No deployment to Vercel, DigitalOcean, AWS, or any hosting provider
- No CI/CD setup
- No Docker/infra changes beyond what already exists
- No redesign from scratch
- No major architecture rewrite
- No broad feature expansion beyond the remaining work

Important rules:
- Use the existing repo structure and patterns already present.
- Prefer minimal but production-quality changes.
- Reuse current auth contexts and API wrappers.
- Keep all API calls aligned with existing backend endpoints.
- Use Next.js + TypeScript + Tailwind.
- Maintain existing admin workflow and business flow.
- Do not invent new endpoints unless absolutely required.

---

## Existing repo understanding

This repo already contains a working backend with these exposed areas:

Authentication:
- POST /api/auth/admin/login
- GET /api/auth/me
- POST /api/auth/change-password
- POST /api/auth/customer/login
- POST /api/auth/customer/verify-otp
- GET /api/auth/customer/me

Admin modules:
- business config endpoints
- admin users CRUD
- categories CRUD
- products CRUD
- customers CRUD
- accounts CRUD and due logic
- payment recording with FIFO allocation
- dashboard summary
- reports endpoints
- audit log
- customer portal endpoints

The frontend already has some admin pages and auth contexts. Use those as the base.

---

## Tasks to complete

### TASK 1 — Finish Customer Portal UI

Create the customer-facing pages and flows that match the backend APIs already implemented.

Requirements:
- Customer login with phone + CNIC + businessSlug
- OTP verification flow
- Customer dashboard overview
- Customer account cards
- Customer account detail page with installment schedule
- Payment history page
- Due list page
- Route guards for authenticated customer users
- UI should be consistent with existing admin styling and brand feel

Files to implement or complete (adjust to actual repo structure):
- frontend/src/app/customer/login/page.tsx
- frontend/src/app/customer/page.tsx
- frontend/src/app/customer/accounts/page.tsx
- frontend/src/app/customer/accounts/[id]/page.tsx
- frontend/src/app/customer/payments/page.tsx
- frontend/src/app/customer/dues/page.tsx
- frontend/src/context/CustomerAuthContext.tsx (already exists, but make sure it is fully wired correctly)
- frontend/src/app/customer/layout.tsx
- frontend/src/components/customer/* (create if missing)
- frontend/src/lib/api.ts (ensure auth token handling works for customer requests)

Acceptance criteria:
- Customer login works using existing backend OTP flow
- After OTP verification, customer sees dashboard data from /api/customer/accounts and /api/customer/dues
- Customer can view account details and payment history
- Unauthorized access redirects to customer login
- Loading states and error states are handled cleanly
- No broken TypeScript or lint issues

Implementation details:
- Use the existing API helper and auth patterns from admin side
- Store customer JWT in localStorage as 'customer_token'
- Fetch account and payment data using the current API contracts
- Format dates and currency in Pakistan style (PKR) for display
- Show basic status badges: active, paid, overdue, defaulted, closed
- For account schedule, show installment rows with due amount, status, paid amount, due date
- For payment history, show payment method, amount, payment date, reference number

---

### TASK 2 — Finish Admin Reporting UI

The backend already exposes report endpoints. The frontend is still missing proper UI pages.

Create these pages:
- frontend/src/app/admin/reports/page.tsx
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
- Build clean summary cards and tables
- Add charts where appropriate, using Recharts if that package is not installed yet
- Add filters for date range and status if supported by backend
- Use proper empty states and loading states

Acceptance criteria:
- All report pages load from the API without errors
- KPI summary is displayed correctly
- Data tables render cleanly
- Due list page shows overdue/upcoming/all filter states
- Product/customer reports show proper totals and breakdowns
- Charts render without crashing

Implementation details:
- Reuse table/card patterns from admin dashboard
- Use consistent color palette from current app theme
- Format numbers as PKR amounts
- Add simple export buttons to CSV where feasible
- Keep UI accessible and responsive

---

### TASK 3 — Complete Admin UX polish and missing forms

The repo already has some admin UI. Make the remaining screens functional and production-ready.

Priority items:
- Build or finish theme configuration UI for branding colors and fonts
- Ensure admin settings pages work with existing business config endpoints
- Add validation to forms
- Fix loading states and toast/error states
- Ensure all CRUD screens correctly call API endpoints

Files likely involved:
- frontend/src/app/admin/settings/business/page.tsx
- frontend/src/app/admin/settings/branding/page.tsx
- frontend/src/app/admin/settings/users/page.tsx
- frontend/src/app/admin/settings/policies/page.tsx
- frontend/src/components/forms/BusinessConfigForm.tsx
- frontend/src/components/forms/ThemeForm.tsx
- frontend/src/context/AuthContext.tsx
- frontend/src/lib/constants.ts
- frontend/src/lib/api.ts

Requirements:
- Admin can change business name, contact info, and public settings
- Admin can update theme colors and typography values via forms
- Save actions call the existing business API routes
- Validation for required fields and invalid values
- Form states show success/error messages
- Buttons handle loading states properly

---

### TASK 4 — Improve backend hardening and validation quality

This is a lower-risk improvement pass, but do not rewrite the project.

Add or harden:
- Better validation on auth endpoints
- Better pagination support for lists where currently missing
- Optional admin/customer logout handlers
- More consistent response format on all routes
- Better sanitization for route params and strings
- Restrict or normalize business slug input
- Improve error messaging on invalid payloads

Files to inspect:
- backend/src/routes/auth.routes.js
- backend/src/routes/business.routes.js
- backend/src/routes/customer.routes.js
- backend/src/routes/account.routes.js
- backend/src/routes/payment.routes.js
- backend/src/middleware/auth.js
- backend/src/middleware/errorHandler.js

Requirements:
- No breaking changes to existing API clients
- Preserve current routing structure
- Keep response shape backward compatible
- Improve validation without altering all route contracts

---

### TASK 5 — Add tests only where low-risk

Create a small test suite for the easiest wins.

Recommended:
- Auth middleware tests
- JWT generation tests
- Customer login validation tests
- Payment allocation logic tests if available
- Utility tests for date/currency formatting

Use the simplest testing stack that fits the repo. If no test stack exists, add a minimal one and keep configuration lightweight.

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
1. Fix customer auth flow and customer portal pages
2. Build report pages and charts
3. Finish admin settings forms
4. Improve validation and UX polish
5. Add light test coverage

This order is important because it matches real business flow and reduces risk.

---

## Technical expectations

### Frontend
- Use Next.js App Router conventions
- Use TypeScript where already present
- Use Tailwind for styling
- Keep routing consistent with current app structure
- Use existing design tokens/colors from app
- Use localStorage for token persistence
- Use react hooks and contexts instead of global state libraries

### Backend
- Keep Express + MongoDB structure
- Use existing models and route patterns
- Keep admin/customer authorization flow intact
- Respect multi-tenant business filtering via businessId
- Validate all admin routes with protectAdmin
- Validate all customer routes with protectCustomer

---

## Acceptance checklist before finishing

The work is only complete when all of the following are true:
- Customer can register/login with OTP flow
- Customer sees account dashboard and due statuses
- Admin can view KPIs and reports
- Admin settings forms save successfully
- No broken API calls or unsupported routes
- No TypeScript errors
- No obvious UI bugs on desktop/tablet screens
- Loading, empty, and error states work
- Security protections remain active
- App is stable without deployment steps

---

## Final instruction to the coding agent

Build only the remaining work described above. Do not do deployment or infra work. Make the app feel complete, stable, and production-clean for a real business product. Keep the code aligned with the existing repo, use minimal necessary changes, and avoid unnecessary abstractions.

If one part is blocked by missing data or API contract mismatch, adapt to the existing backend and keep the frontend resilient.

---

## Recommended commit strategy

Use a few focused commits, not one giant commit:
1. Customer portal pages and auth fixes
2. Reports UI and chart pages
3. Admin settings polish and validation
4. Quality hardening and tests

This keeps review manageable and reduces regression risk.

---

## Summary

This is the remaining work that needs to be completed before this app is genuinely usable as a real business product. The core backend is already in place. What remains is frontend completion, user flow polish, reporting UI, data display quality, and security/validation hardening. That is the actual task list.
