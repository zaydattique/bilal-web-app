# Phase 0 — Codebase Cleanup & Baseline Report

**Repository:** `zaydattique/bilal-web-app`  
**Branch:** `phase0-codebase-cleanup`  
**Purpose:** establish one source of truth before feature/security phases.

## Findings corrected

### 1. Phantom backend modules
`backend/src/server.js` referenced these files even though they were absent from the repository:

- `middleware/security.js`
- `routes/lead.routes.js`
- `routes/adminLead.routes.js`
- `routes/analytics.routes.js`

Phase 0 removed those imports and mounts instead of creating placeholder/duplicate files. Lead and analytics functionality remains explicitly deferred to their proper phases.

### 2. Fake production fallback
`frontend/src/context/ThemeContext.tsx` contained a hardcoded demo business with fake contact details. That was removed.

If the configured business cannot be loaded, the application now has no fabricated business identity.

### 3. Product pricing drift
`discountPrice` is the backend model's canonical field. The frontend previously accepted both `discountPrice` and `salePrice`.

Phase 0 removed the compatibility path and uses `discountPrice` consistently.

### 4. Product API contract mismatch
The backend already exposes:

`GET /api/products/:idOrSlug`

The product detail page incorrectly called:

`GET /api/products/slug/:slug`

The frontend now calls the actual canonical endpoint.

### 5. Duplicate catalogue implementation
`frontend/src/app/catalog/page.tsx` duplicated the public product catalogue and had no repository references.

It was deleted. `/products` is now the single public catalogue implementation.

### 6. Analytics tenant fallback
Analytics previously silently defaulted to `bilal-electronics`.

Phase 0 removed the hardcoded tenant fallback and uses `NEXT_PUBLIC_BUSINESS_SLUG`. If that value is missing, analytics does not send a tenantless event.

Browser session IDs now use `crypto.randomUUID()` instead of `Math.random()`.

### 7. Stale documentation
The previous completion report claimed production-grade backend/security/testing status that contradicted the source tree.

This report replaces those claims with the actual phase-based status.

## Deliberately NOT implemented in Phase 0

These are not being patched with temporary/duplicate implementations:

- security middleware and centralized request validation
- full tenant/object authorization
- MFA, OTP hardening and server-side sessions
- persistent media storage
- business/branding CMS expansion
- product/category CMS expansion
- financial transaction integrity
- customer portal authorization hardening
- analytics backend
- dynamic SEO/AEO/GEO
- structured data
- red-team testing
- unit/integration/E2E tests
- deployment and backup verification

Those belong to their dependency-ordered phases.

## Baseline risks remaining

The repository still contains known work for later phases, including:

- backend security hardening
- local filesystem uploads
- client-side JWT storage
- incomplete customer/session security
- weak input validation/authorization in several routes
- missing automated backend tests
- client-rendered product detail pages
- incomplete public/category page architecture
- missing sitemap/robots/canonical system
- hardcoded public marketing claims that should eventually be CMS-controlled
- incomplete lead and analytics routes

These are intentionally tracked for the later phases rather than hidden behind compatibility code.

## Source-of-truth rule

From this point forward:

> If an implementation is replaced, the old implementation is removed in the same phase. Do not add a second file, second field, fallback implementation, alias, or compatibility path unless a documented migration requires it.

