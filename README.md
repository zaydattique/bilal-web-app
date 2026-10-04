# Bilal Web App

White-label installment-sales platform for a Lahore appliance business.

## Current state

Phases 0–13 are implemented on the current branch. Phase 13 completes the admin KPI, reporting, export, audit and operational reporting surfaces. Runtime verification is still required before production.

The repository is **not production-ready yet**. Later phases cover authentication/session hardening, persistent media, product/category CMS, financial integrity, customer isolation, analytics, SEO/AEO/GEO, structured data, security testing, automated tests, and deployment verification.

### Phase 3 persistent media and asset management completed

- Replaced product/category/business image URL fields with tenant-owned MongoDB `Media` references.
- Added S3-compatible durable object storage so media survives application rebuilds and redeploys.
- Added server-side image validation using file signatures plus Sharp metadata; SVG and executable uploads are not accepted.
- Added 10 MB per-file limit, 30 uploads/hour/admin, tenant ownership checks, audit logging, and safe storage keys.
- Added admin media upload, replace, list/filter, and delete workflows. Referenced media cannot be deleted until unassigned.
- Added admin-managed primary/light/dark/icon logos, favicon, OG image, hero banners, product images, and category images.
- Added an explicit legacy-media migration command instead of retaining old URL compatibility fields.

### Phase 8 analytics completed

- Added one canonical MongoDB `AnalyticsEvent` source for pageviews and CTA events, tenant-scoped by `businessId`.
- Added consent-gated browser tracking with per-tab session IDs; private `/admin` and `/portal` routes are never tracked.
- Added server-side HMAC hashing of session IDs; raw session IDs and raw IP addresses are never persisted.
- Added server-side event validation, UUID event IDs, duplicate-event protection and a dedicated analytics rate limit.
- Added 180-day TTL retention for raw analytics events and indexes for tenant/date/session aggregation.
- Added authenticated traffic summaries for visits/sessions/pageviews, daily traffic, top pages, CTA activity, device class and optional city/region/country aggregation.
- Bot-classified traffic is excluded from admin traffic metrics.
- Geographic headers are ignored unless `ANALYTICS_GEO_HEADERS=true` and a supported trusted provider (`vercel` or `cloudflare`) is explicitly configured.
- Added the admin Reports → Website Traffic dashboard without introducing a second analytics implementation.

### Phase 2 authentication and session security completed

- Replaced browser-stored bearer JWT authentication with durable server-side sessions stored in MongoDB.
- Session cookies are HttpOnly, SameSite=Strict, Secure in production, and use `__Host-` names in production.
- Session records store creation, last activity, expiry, revocation, logout/end time, IP, and user-agent for operational history.
- Enforced server-side idle and absolute session timeouts.
- Added logout, logout-all, individual session revocation, and session-history endpoints for administrators.
- Password changes revoke the administrator's other active sessions.
- Replaced process-local OTP state with hashed, expiring MongoDB OTP challenges and atomic single-use verification.
- Added encrypted TOTP MFA setup/enable/disable for administrators and MFA enforcement at login.
- Removed the obsolete JWT generator, JWT environment configuration, and JWT dependency.
- Frontend authentication no longer stores credentials or tokens in localStorage; API requests use credentials-included cookies.
- Production OTP delivery is deliberately not faked: it returns a configuration error until a real delivery provider is connected.

### Phase 1 backend foundation completed

- Added centralized request validation, ObjectId validation, public business resolution, and field allowlists.
- Hardened authenticated admin/customer session verification with server-side tenant binding and strong application encryption-key startup enforcement.
- Bound authenticated admin/customer requests to an active business and preserved tenant scope in object lookups.
- Closed public category/product cross-tenant lookup paths and validated product category ownership.
- Enforced the server-side 200-customer tenant limit with atomic business counters and collision-safe customer/account numbering.
- Removed public exposure of the legacy local uploads directory; Phase 3 now uses durable object storage.
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

### Analytics deployment

Optional trusted proxy geo aggregation:

```env
ANALYTICS_GEO_HEADERS=false
ANALYTICS_GEO_PROVIDER=vercel
```

Enable geo headers only when the configured provider is the trusted reverse proxy in front of the API. Express proxy configuration must match the real deployment topology; do not blindly trust forwarded headers from an internet-facing client. Analytics raw events are retained for 180 days and then removed automatically by MongoDB TTL.

The business slug is configuration, not a code-level fallback.

### Persistent media storage

Production must configure the S3-compatible storage variables in `backend/.env.example`. `MEDIA_PUBLIC_BASE_URL` must be an HTTPS CDN/public object URL in production. For an existing database that contains legacy URL-based media, back up MongoDB first and run `PHASE3_MEDIA_MIGRATION_CONFIRM=true npm run migrate:phase3-media` before serving the new schema. The migration intentionally clears legacy URL fields rather than retaining a second compatibility system; the replacement assets must then be uploaded through Admin → Media/Settings.

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



### Phase 11 Structured Data completed

- Replaced the previous client-side generic Store JSON-LD with server-rendered, page-scoped structured data.
- Public pages now emit current CMS-driven Organization/LocalBusiness, WebSite, WebPage, BreadcrumbList, Product and Offer entities where applicable.
- Product Offer pricing uses the canonical current product price and business currency.
- Structured data fails closed when the public site URL is missing/invalid or the business identity is unavailable.
- No stale stock/availability claim is emitted.
- No duplicate schema source, database model or parallel CMS layer was introduced.

### Phase 10 AEO/GEO completed

- Product pages expose the existing CMS AEO summary, buying intent and key facts as visible, semantic answer content.
- Product pages expose existing CMS GEO intent and local notes as visible local-information content.
- Category pages expose existing CMS AEO summary/key facts and GEO content.
- The homepage exposes a CMS-sourced business information block containing only current business name, tagline, description, service area, hours, address and phone data.
- No new AEO/GEO database model, duplicate content route, compatibility layer or hardcoded tenant claims was introduced.
- Structured data remains intentionally deferred to Phase 11.

### Phase 9 SEO foundation completed

- Public homepage now fetches business, featured products and categories on the server so core storefront content exists in the initial HTML instead of depending on client-side data fetching.
- Public `/products` now server-renders its initial published catalogue while preserving client-side search/filter interactions.
- Product detail and category detail pages retain server rendering with CMS-driven metadata and canonical URLs.
- Added Next.js file-based `/robots.txt` with public crawling allowed and private `/admin` and `/portal` paths blocked.
- Added dynamic `/sitemap.xml` containing the homepage, catalogue/category indexes, and only published product/category URLs from the active business.
- Sitemap uses record `updatedAt` values when available and paginates through published records rather than using a fixed product list.
- Removed the remaining hardcoded `bilal-electronics` inquiry fallback; business identity now comes only from the CMS or explicit environment configuration.
- Removed the fake `Installment Shop Lahore` and localhost metadata fallbacks from production metadata generation.
- No duplicate SEO route, legacy `/catalog` route, or override metadata layer was introduced.

### Phase 12 Public UX & Conversion completed

- Added responsive public navigation for Home, Products, Categories and installment-plan inquiries on desktop and mobile.
- Added the canonical public `/inquiry` page using the existing InquiryForm and existing Lead API; no duplicate lead implementation was introduced.
- Inquiry forms now capture preferred tenure alongside down-payment preference and use mobile-friendly browser autofill/input hints.
- Category pages now use CMS category media in a responsive header, show the published product count, provide direct product browsing and surface installment-plan CTAs.
- Homepage featured-product navigation now includes a direct installment-plan CTA.
- Existing Media references, Business CMS content, Product/Category CMS content and Lead API remain the source of truth.

### Phase 14 Security / Red-Team completed
- Added same-origin protection for authenticated cookie mutations to prevent cross-site state-changing requests.
- Production session cookies use __Host- names; development uses valid non-prefixed names so local HTTP development cookies are not silently rejected.
- Hardened image parsing against malformed/oversized image inputs and fixed replacement ordering so media references cannot be left pointing at a deleted object after a database failure.
- Reused the existing security/auth/media implementations; no duplicate security or storage layer was introduced.

### Phase 13 Admin Operations & Reporting completed

- Reports hub now surfaces current customer, account, product, receivable, collection and overdue KPIs.
- Added report views for website traffic, collections, customers, products, due installments and defaults/aging.
- Added authenticated tenant-scoped CSV exports for operational reports.
- Added the existing AuditLog view to the admin navigation with search and pagination.
- Reporting continues to use the existing analytics, financial, Product, Customer, Account, InstallmentPlan and AuditLog sources of truth.

### Phase 15 Automated Testing completed
- Added backend automated tests for validation/security helpers, payment idempotency/date rules and persistent media configuration/URL handling.
- Added frontend automated tests for installment calculations and canonical tenure/currency behavior.
- Added GitHub Actions CI to run both suites on pushes and pull requests to main.
- The tests exercise existing production helpers instead of copying business logic into test-only implementations.
