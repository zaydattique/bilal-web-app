# Project Completion Report — Through Phase 7

**Repository:** `zaydattique/bilal-web-app`  
**Current phase:** Phase 7 — Customer Portal & Authorization  
**Main baseline before Phase 4:** `9cece6a00d33ff761da831244911b447733f37ba`

## Completed

### Phase 4 — Business & Branding CMS
- Expanded the Business model with CMS-controlled public content: tagline, description, service area, hours, footer text, requirements, trust points, process steps and hero slides.
- Hardened nested business updates with explicit field whitelists and type/length validation.
- Added safe URL validation for social links, policy links and CMS CTA destinations.
- Restricted typography to an explicit safe font allowlist.
- Validated all branding colors as six-digit hexadecimal values to prevent CSS injection through theme fields.
- Added validated installment/business settings including currency, timezone, date format, installment limits and customer portal visibility.
- Expanded the admin Business CMS to manage identity, branding, typography, media, contact, social links, policies, public content and SEO from one screen.
- Prevented non-super-admin users from submitting business slug mutations.
- Removed hardcoded storefront business claims from the hero, process, requirements/trust, footer and privacy-cookie messaging.
- Public business API now returns an explicit safe projection rather than the complete Business document, preventing internal sequence/counter fields from leaking.
- Public metadata and JSON-LD now use CMS business data instead of hardcoded location/marketing claims.
- Public footer now uses configured business policy/social links and business-managed content.
- Applied CMS typography line-height and heading scale to the storefront.
- Kept Phase 3 Media references as the only media source of truth.

## Source-of-truth rule

Phase 4 does not add an override layer for old content. Business-facing marketing/branding claims are now stored in the Business CMS and rendered from that source.

## Important migration/deployment note

Existing Business documents do not automatically gain meaningful CMS copy. An administrator should populate the new Business CMS fields before publishing the storefront. The development seed remains a separate fixture and was not made the production content source.

## Verification limitation

GitHub source inspection was completed, including targeted searches for the previously hardcoded storefront claims. Runtime npm/Next build, MongoDB integration and browser verification are still deployment/runtime checks for Phase 16 because this environment has no project runtime/database credentials.


### Phase 5 — Product & Category CMS
- Replaced the legacy Product model with one canonical CMS schema using cashPrice, discountPrice, installment facts, lifecycle status, durable Media IDs, typed category-driven custom fields, FAQs, SEO, AEO and GEO content.
- Replaced the legacy Category model with lifecycle status, typed custom-field definitions, FAQs, SEO/AEO/GEO content and durable Media references.
- Added race-safe unique Product SKU and business-scoped slug indexes.
- Added Product slug history redirects so changing a published product slug preserves the old URL path.
- Added explicit publishing gates for product/category descriptions, SEO/AEO content and required installment facts.
- Added scheduled product publishing with future-date validation.
- Replaced product/category admin create forms with canonical reusable editors and added edit routes.
- Public product detail pages are now server-rendered with dynamic metadata, canonical URLs and 404 handling; category pages are server-rendered with category metadata and published products.
- Removed the old product price/images/isActive source-of-truth fields from the active application model. A dedicated migration converts existing legacy documents and leaves converted records as draft until required CMS facts are completed.
- Updated dashboard/report queries and the development seed to the new lifecycle/pricing schema.
- Continued using Phase 3 Media as the only upload/storage source of truth; product/category records store Media IDs rather than arbitrary image URLs.

### Phase 5 migration/deployment note
Run backend/src/migrations/phase5-product-category-migration.js once against the existing database before relying on the new Product/Category schema. Converted legacy products/categories intentionally remain drafts so incomplete SEO/AEO/installment data cannot silently become published storefront content.


### Phase 6 — Installment & Financial System Hardening
- Replaced multi-step payment posting with a MongoDB transaction so installment, account, customer balance and payment-record writes commit or roll back together.
- Added required payment idempotency keys and a business-scoped unique partial index so retrying the same request returns the original payment instead of creating a duplicate; legacy payment documents without the new field remain indexable.
- Added request fingerprinting so an idempotency key cannot be reused for a different payment payload.
- Rejects overpayments instead of silently accepting only the allocatable portion.
- Payment allocation now records the previous installment status and paid date, making reversal deterministic.
- Added protected payment reversal for administrators. Reversal is refused when a later confirmed payment exists or when legacy allocation history is insufficient to reconstruct the prior state.
- Account status changes can no longer mark an account paid/closed while a balance remains, or reopen a fully paid account as active.
- Account creation is transactional and now uses an atomic Business counter with a hard server-side maximum of 200 customer accounts per business.
- Startup counter synchronization now rebuilds the account count from persisted Account records.
- Production startup rejects standalone MongoDB deployments because the financial write paths require multi-document transactions.
- Added endpoint-specific rate limits to account creation, payment creation and payment reversal in addition to the global API limiter.
- Updated the admin payment form to generate a stable idempotency key for retries of the same form submission.
- No compatibility/override layer was added; the existing payment and account write paths were replaced directly.

### Phase 6 verification limitation
Source-level review and GitHub diff inspection were completed. Runtime npm/Next build, MongoDB transaction tests, concurrent-payment tests and browser verification were not run because this environment does not have the project's runtime/database credentials. MongoDB transactions require a replica set or sharded deployment in production.


### Phase 7 — Customer Portal & Authorization
- Replaced customer portal reads with strict server-side ownership and tenant filters on every account, payment and installment-plan query.
- Customer account IDs are validated before lookup and an account is returned only when both `customerId` and `businessId` match the authenticated session.
- Customer responses use explicit projections instead of returning full MongoDB documents.
- Customer authentication `/me` no longer exposes CNIC, address, guarantor, totals or other private Customer-model fields.
- Portal responses are explicitly `private, no-store` to prevent sensitive financial data being cached.
- Customer payment history is limited, tenant-scoped, status-scoped to confirmed payments, and returned as a safe projection.
- Upcoming dues are derived only from the authenticated customer's own active/defaulted accounts.
- Customer login no longer distinguishes an unknown business/customer from invalid credentials.
- Customer portal endpoints have their own rate limiter in addition to the global API limiter.
- Installment accounts now record the purchased Product reference plus a product-name snapshot. New accounts require a currently published product, so the customer portal can identify what was purchased even if that product is later archived.
- Product details/media shown in the customer portal are explicitly projected through the existing Product and Media sources; no second media system was introduced.
- The admin new-account workflow now requires selecting the purchased product.
- No customer-facing write endpoint was added; customers remain read-only for financial records.
- No override/duplicate authorization layer was added; existing customer portal routes were replaced directly.

### Phase 7 verification limitation
Source-level security review and GitHub diff inspection were completed. Runtime Node/Next/Mongo/browser authorization tests, including two-customer IDOR/concurrent-session tests, could not be run because this environment does not have the project's runtime/database credentials.
