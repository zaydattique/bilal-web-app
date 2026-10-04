# AI Build Prompt — Remaining Work After Phase 3

You are a senior full-stack engineer working inside the existing repository `zaydattique/bilal-web-app`.

The repository is a white-label installment-sales platform. Work is phase-driven and dependency-ordered.

## Non-negotiable source-of-truth rule

If an implementation is replaced, remove the old implementation in the same phase. Do not add override lines, duplicate fields, duplicate files, compatibility aliases, fake fallbacks or parallel implementations unless a documented data migration genuinely requires a temporary transition.

## Completed through Phase 3

- Phase 0: codebase cleanup and source-of-truth baseline.
- Phase 1: backend foundation, validation and tenant security.
- Phase 2: MongoDB server sessions, secure cookies, OTP hardening and admin MFA.
- Phase 3: durable S3-compatible media storage and admin media management.

Phase 3 now makes Media references canonical for business branding, product images and category images. Do not reintroduce URL-based image fields or local filesystem uploads.

## Phase 4 completed

- Business/branding fields are CMS-controlled and tenant-scoped.
- Public marketing claims are no longer hardcoded in the storefront.
- Nested business payloads are explicitly whitelisted and validated.
- Public business responses use an explicit safe projection.
- Social/policy/CTA URLs reject unsafe schemes.
- Theme colors and typography are validated before being applied.
- Phase 3 Media references remain canonical.

## Remaining roadmap

### Phase 4 — Business and Branding CMS
- Complete business settings and branding fields.
- Make public claims CMS-controlled.
- Complete social/contact/policy/SEO configuration.
- Keep every tenant field server-validated and tenant-scoped.

### Phase 5 — Product and Category CMS
- Complete product/category create/edit/delete workflows.
- Add structured product specifications, installment facts, FAQs and SEO/AEO fields.
- Keep product/category media as Media references only.
- Add publishing lifecycle and validation gates.

### Phase 6 — Installment and Financial Integrity
- Harden installment-plan calculations and persisted financial facts.
- Make payment creation transactional and idempotent.
- Resolve concurrency, overpayment, allocation and account-number race conditions.
- Preserve auditability of every financial mutation.

### Phase 7 — Customer Portal
- Enforce strict customer-to-self authorization on every portal query.
- Test ID substitution, URL manipulation, session substitution and cross-tenant access.
- Customers may only see their own accounts, schedules, payments and purchased products.

### Phase 8 — Analytics
- Implement durable visits, sessions, pageviews and useful geographic aggregation.
- Keep analytics tenant-scoped and privacy-conscious.

### Phase 9 — SEO Foundation
- Dynamic metadata, canonical URLs, robots, sitemap, redirects and server-rendered public product/category pages.
- Media-backed OG images and favicons remain canonical.

### Phase 10 — AEO/GEO — completed
- Product/category answer content is rendered from existing CMS AEO/GEO fields.
- Business answer content is rendered from current CMS business fields.
- Public answer content is tenant-scoped through the existing public business/product/category resolution.
- No duplicate AEO/GEO source or hardcoded tenant facts were introduced.

### Phase 11 — Structured Data — completed
- Server-rendered Product and Offer structured data uses the current published product payload and current price.
- BreadcrumbList and WebPage structured data is emitted from the actual canonical page path.
- Organization/LocalBusiness and WebSite entities are generated from the current CMS business record.
- Product availability is intentionally omitted because the public schema does not establish a verified inventory-to-schema availability contract; no stock claim is invented.
- Structured data fails closed when NEXT_PUBLIC_SITE_URL is missing or invalid.

### Phase 12 — Public UX and Conversion — completed
- Public navigation now exposes Products, Categories and a direct installment-plan conversion path across desktop and mobile.
- Added the canonical `/inquiry` storefront route and reused the existing validated InquiryForm instead of creating a second lead form.
- Inquiry submissions now capture the visitor's selected tenure as well as down-payment preference.
- Category detail pages now provide responsive media-led headers, product counts, direct product browsing and installment-plan CTAs while retaining CMS AEO/GEO content and existing canonical routing.
- Homepage featured-product navigation now includes a direct installment-plan CTA.
- Existing Media, Business CMS, Product/Category CMS and Lead API remain the only sources of truth; no duplicate content or lead system was introduced.

### Phase 13 — Admin Operations and Reporting — completed
- Expanded the existing Reports hub into the operational KPI surface using the existing dashboard summary source.
- Added responsive report views for traffic, collections, customers, products, due lists and defaults/aging.
- Added authenticated tenant-scoped CSV exports for customers, products, collections, due lists and aging.
- Added an admin audit-log UI using the existing AuditLog model/API, with search and pagination; no second audit store was introduced.
- Hardened audit date/search filtering and kept all reporting queries tenant-scoped.
- Reused existing analytics, financial, product, customer, account, installment and audit sources rather than creating duplicate reporting models.

### Phase 14 — Security / Red-Team — completed
- Added centralized same-origin enforcement for state-changing requests carrying an authenticated session cookie, using the existing security middleware and configured CORS origins.
- Kept tenant and ownership checks on authenticated object lookups and verified query construction does not accept raw client Mongo operators.
- Production uses __Host- session cookies; development uses valid non-prefixed cookie names so local HTTP development cookies are not silently rejected.
- Hardened media processing against oversized image dimensions and malformed image parsing.
- Fixed media replacement ordering so a database-save failure cannot delete the only referenced object; successful replacement keeps the database and new object consistent, with failed old-object cleanup surfaced for retry.
- Reviewed authentication, authorization, tenant isolation, uploads, storage keys, rate limits, CSRF, XSS, SSRF, injection, IDOR and abuse-sensitive routes.
- No duplicate security layer, alternate media source, or compatibility implementation was introduced.

### Phase 15 — Automated Testing
- Add backend integration tests, authorization tests, financial tests, media tests and frontend critical-path tests.
- Do not mark production readiness based only on static inspection.

### Phase 16 — Production / Deployment Verification
- Install dependencies and run backend/frontend builds.
- Connect real MongoDB and real object storage.
- Test uploads, replacements, deletes, public rendering, favicon/OG metadata and redeploy persistence.
- Verify cookies, CORS, rate limits, logs, backups and environment configuration.

### Phase 17 — Final Acceptance Audit
- Audit every repository file one by one.
- Search for duplicate/override implementations, stale compatibility code, dead files, stale docs, hardcoded tenant data and security gaps.
- Verify the live deployment against the repository source of truth.

## Rules for every phase

1. Inspect the existing implementation before adding anything.
2. Reuse an existing file when the responsibility already belongs there.
3. Replace obsolete code instead of adding a higher-priority override.
4. Keep every database lookup tenant-scoped.
5. Validate and whitelist request fields.
6. Never trust IDs, URLs, MIME types or client-side authorization.
7. Never fake integrations or production configuration.
8. Add migrations only when a schema replacement requires one, and make them explicit and idempotent.
9. Update documentation when behavior changes so it does not contradict the source tree.
10. Verify the actual Git diff before merging.

## Current Phase 3 media architecture

Admin uploads go through `POST /api/admin/media`, are validated server-side, stored in S3-compatible durable object storage, and recorded in MongoDB. Media can be listed, replaced and deleted. Assigned media cannot be deleted. Product/category/business records store Media ObjectId references and public endpoints populate the safe public media fields.

Production requires the variables in `backend/.env.example`. Do not add a local `/uploads` fallback.

### Phase 15 — Automated Testing — completed
- Added deterministic backend tests for request validation, ObjectId validation, CSRF/origin enforcement, payment idempotency/fingerprinting/date validation and persistent media configuration/URL safety.
- Added frontend tests for installment calculations, interest handling, bounds and canonical tenure/currency formatting.
- Replaced the backend placeholder test command with the Node test runner.
- Updated the frontend test command to execute TypeScript tests through tsx.
- Added GitHub Actions CI for backend and frontend test suites on pushes and pull requests to main.
- Tests exercise existing source-of-truth helpers; no duplicate production logic was created.
- Runtime execution in this environment remains unverified because dependencies are not installed and project runtime/database credentials are unavailable.
