# Scalable B2B Installment Sales Platform

White-label multi-tenant installment sales platform.

**Repo:** https://github.com/zaydattique/bilal-web-app  
**Status:** Backend complete (Phase 1 + Phase 2 APIs). Frontend Phase 1 done. Not deployed live.

## Backend status — COMPLETE

| Module | Endpoints | Status |
|--------|-----------|--------|
| Auth (admin) | login, me, change-password | Done |
| Auth (customer) | login (OTP), verify-otp, me | Done |
| Business config | get, update, public by slug | Done |
| Admin users | CRUD + login history | Done |
| Categories | list, get, create, update, soft-delete | Done |
| Products | list, get, create, update, soft-delete | Done |
| Customers | CRUD, accounts, payments, soft-delete | Done |
| Accounts | list, get, create, plan, due-list, status, close | Done |
| Payments | list, get, record (FIFO allocation) | Done |
| Dashboard | KPI summary | Done |
| Reports | collections, customers, products, due-list, defaults | Done |
| Audit log | list + filters | Done |
| Customer portal | my accounts, account detail, payments, dues | Done |
| Seed | demo business + admin + products | Done |

### Models
Business, Admin, Category, Product, Customer, Account, InstallmentPlan, Payment, Lead, AuditLog

### Seed credentials
- Email: `admin@bilalelectronics.pk`
- Password: `Admin@123`
- Slug: `bilal-electronics`

## Frontend status
- Phase 1 admin UI + forms: done
- Customer portal UI: not yet
- Reports UI pages: not yet

## API map (quick)

```
POST   /api/auth/admin/login
GET    /api/auth/me
POST   /api/auth/customer/login          { phoneNumber, cnic, businessSlug }
POST   /api/auth/customer/verify-otp     { customerId, otp }
GET    /api/auth/customer/me

GET/PUT /api/admin/business
GET     /api/admin/business/public/:slug

GET/POST/PUT/DELETE /api/admin/users
GET /api/admin/users/:id/login-history

GET/POST/PUT/DELETE /api/categories
GET/POST/PUT/DELETE /api/products

GET/POST/PUT/DELETE /api/admin/customers
GET /api/admin/customers/:id/accounts
GET /api/admin/customers/:id/payments

GET/POST /api/admin/accounts
GET  /api/admin/accounts/:id
GET  /api/admin/accounts/:id/plan
GET  /api/admin/accounts/:id/plan/due-list
PATCH /api/admin/accounts/:id/status
POST  /api/admin/accounts/:id/close

GET/POST /api/admin/payments
GET /api/admin/payments/:id

GET /api/admin/dashboard/summary
GET /api/admin/reports/collections
GET /api/admin/reports/customers
GET /api/admin/reports/products
GET /api/admin/reports/due-list?filter=overdue|upcoming|all
GET /api/admin/reports/defaults
GET /api/admin/audit-log

GET /api/customer/accounts
GET /api/customer/accounts/:id
GET /api/customer/payments
GET /api/customer/dues
```

## Not built yet
- Live hosting
- Real SMS OTP (demo returns OTP in JSON when NODE_ENV ≠ production)
- Email notifications
- 2FA for admin
- Image upload to S3
- Frontend customer portal & report charts

## License
Private / Proprietary
