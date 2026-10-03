# Bilal Web App

White-label installment-sales platform for a Lahore appliance business.

## Current state

Phase 0 is merged into `main`. Phase 1 backend foundation and multi-tenant security is implemented on branch `phase1-backend-foundation-security` and is pending runtime verification.

The repository is **not production-ready yet**. Later phases cover authentication/session hardening, persistent media, product/category CMS, financial integrity, customer isolation, analytics, SEO/AEO/GEO, structured data, security testing, automated tests, and deployment verification.

### Phase 1 backend foundation completed

- Added centralized request validation, ObjectId validation, public business resolution, and field allowlists.
- Hardened admin/customer JWT verification with issuer/audience checks and strong-secret startup enforcement.
- Bound authenticated admin/customer requests to an active business and preserved tenant scope in object lookups.
- Closed public category/product cross-tenant lookup paths and validated product category ownership.
- Enforced the server-side 200-customer tenant limit with atomic business counters and collision-safe customer/account numbering.
- Removed public exposure of the legacy local uploads directory; persistent media is deferred to Phase 3.
- Enabled API security headers/CSP, explicit CORS origins, payload limits, and centralized production-safe error responses.
- Removed direct route-level production error-detail leakage and fixed startup sequencing so the API listens only after database initialization succeeds.
- Hardened admin management input handling and seed cleanup/password policy.

### Phase 0 cleanup completed

- Removed imports and route mounts for backend files that do not exist in the repository, so the server no longer references phantom modules.
- Removed the fake frontend business fallback. Business identity must come from configured API data.
- Removed the `salePrice` compatibility path. `discountPrice` is the single canonical product discount field.
- Corrected the product-detail frontend API contract to use `GET /api/products/:idOrSlug`.
- Removed the unused duplicate `/catalog` page; `/products` is the canonical public catalogue.
- Removed hardcoded tenant fallback from analytics and switched browser session IDs to `crypto.randomUUID()`.
- Replaced stale completion claims with the actual project status.

## Environment

### Backend

Required environment values are deployment-specific. See `backend/.env.example` if present.

### Frontend

`frontend/.env.example` should define:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_BUSINESS_SLUG=bilal-electronics
```

The business slug is configuration, not a code-level fallback.

## Development

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Important

The seed data is for development/testing only. Production business information, products, media, branding, installment rules, and customer data must be managed through the application and database.

## Phase roadmap

1. Phase 0 — codebase cleanup and baseline
2. Phase 1 — backend foundation and multi-tenant security
3. Phase 2 — authentication, sessions and account security
4. Phase 3 — persistent media and asset management
5. Phase 4 — business and branding CMS
6. Phase 5 — product and category CMS
7. Phase 6 — installment and financial integrity
8. Phase 7 — customer portal and authorization
9. Phase 8 — analytics
10. Phase 9 — SEO foundation
11. Phase 10 — AEO/GEO
12. Phase 11 — structured data
13. Phase 12 — public UX and conversion
14. Phase 13 — admin operations and reporting
15. Phase 14 — red-team/security hardening
16. Phase 15 — automated tests
17. Phase 16 — production/deployment verification
18. Phase 17 — final acceptance audit

