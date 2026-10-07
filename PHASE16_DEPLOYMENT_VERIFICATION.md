# Phase 16 — Production / Deployment Verification

**Repository:** `zaydattique/bilal-web-app`  
**Date:** 2026-10-07  
**Scope:** Build readiness, env contracts, CI, deployment checklist  
**Go-live:** Still blocked until this checklist is signed off on a real deployment (Phase 17 final acceptance remains after live verification).

## Verified in this environment

| Check | Result |
|-------|--------|
| Backend `npm install` | Pass |
| Backend `npm test` (11 tests) | Pass (fixed idempotency assertion regex) |
| Backend `node --check` entrypoints | Covered by CI job |
| Frontend `npm install` | Pass |
| Frontend `npm test` (4 tests) | Pass |
| Frontend `next build` (production) | **Pass** after build-blocking fixes |
| CI workflow | Expanded: tests + frontend production build + backend syntax check |
| Env examples | Expanded with production notes (Mongo replica set, media HTTPS, CORS, TRUST_PROXY) |
| docker-compose | Documented replica-set requirement; frontend build args for public env |

## Build-blocking defects fixed during Phase 16

1. **Payment test** — assertion expected `already been used`; production message is `already used`.
2. **`ProductDetailClient.tsx`** — broken CSS string quote (`'var(--color-border')`) prevented SWC compile.
3. **`api.ts`** — `post`/`put`/`patch`/`delete` omitted the path argument after session-cookie migration.
4. **Reports pages** — leftover `token` dependency after AuthContext dropped JWT localStorage.
5. **ThemeContext Business settings** — missing `enableOnlinePayment` / `enableGuestCheckout`.
6. **`categories/page.tsx`** — `generateMetadata` called undefined `business()` instead of `getBusiness()`.
7. **JsonLd / product page types** — incompatible optional `settings`/`seo` shapes blocked typecheck.

## Cannot be completed without operator credentials

These Phase 16 items require a real MongoDB (replica set), object storage, and hosted frontend/backend:

- [ ] Connect production/staging MongoDB replica set (standalone is rejected in production)
- [ ] Configure S3-compatible media (`MEDIA_*` + HTTPS `MEDIA_PUBLIC_BASE_URL`)
- [ ] Run Phase 3 / Phase 5 migrations if upgrading an existing database
- [ ] Seed or CMS-populate business, products, categories, media
- [ ] Upload → replace → delete media; confirm persistence across redeploy
- [ ] Public storefront: homepage, products, categories, product detail, inquiry
- [ ] Favicon / OG image / robots.txt / sitemap.xml against real `NEXT_PUBLIC_SITE_URL`
- [ ] Admin login (cookie sessions + optional MFA), logout, logout-all
- [ ] Customer portal OTP path (real SMS provider when production OTP is enabled)
- [ ] Payment create / idempotent retry / reversal on replica set
- [ ] CORS origins match live frontend origin(s); cookies Secure + SameSite in production
- [ ] Rate limits and structured logs under proxy (`TRUST_PROXY=true` only if proxy is trusted)
- [ ] Backup schedule for MongoDB and object storage
- [ ] Redeploy backend and frontend; confirm media URLs and sessions still work

## Production environment checklist

### Backend

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://.../?retryWrites=true&w=majority
APP_ENCRYPTION_KEY=<64-hex-or-min-32-chars>
CORS_ORIGIN=https://www.example.com,https://example.com
TRUST_PROXY=true
MEDIA_BUCKET=...
MEDIA_REGION=...
MEDIA_ACCESS_KEY_ID=...
MEDIA_SECRET_ACCESS_KEY=...
MEDIA_PUBLIC_BASE_URL=https://cdn.example.com
MEDIA_ENDPOINT=
MEDIA_FORCE_PATH_STYLE=false
```

### Frontend (bake into build)

```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_BUSINESS_SLUG=bilal-electronics
NEXT_PUBLIC_SITE_URL=https://www.example.com
```

## Deployment notes

- Financial writes use multi-document transactions → **MongoDB replica set required in production**.
- Media is S3-compatible only; no local `/uploads` fallback in production.
- Auth uses HttpOnly session cookies (`credentials: 'include'`); frontend and API origins must be listed in `CORS_ORIGIN`.
- Production OTP delivery is intentionally not faked; configure a real provider before customer portal OTP in production.

## Phase 16 status

**In-repo verification: complete.**  
**Live deployment verification: pending operator environment.**  
**Not production-ready / not live** until the operator checklist above is completed and Phase 17 acceptance audit is finished.
